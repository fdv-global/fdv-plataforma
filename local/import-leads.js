#!/usr/bin/env node
// local/import-leads.js
// Uso: node local/import-leads.js
// Requer Node.js 18+ (fetch nativo)
//
// Importa leads das abas ISCAS e Respondi.app para o Supabase.
// Filtra apenas linhas com data >= SINCE_DATE que ainda não foram
// marcadas como ✅ pelo Apps Script (importação pendente ou com erro).
// Evita duplicatas verificando o celular já existente no Supabase.

if (typeof fetch === 'undefined') {
  console.error('Node.js 18 ou superior é necessário (fetch nativo).');
  process.exit(1);
}

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const SHEET_ID   = '157tpNvXLgQUuilBU7ARCDYDUtvyJxuyF3Zc9D-GuWWs';
const SB_URL     = 'https://yadxcbhginjvoemacdly.supabase.co';
const SB_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZHhjYmhnaW5qdm9lbWFjZGx5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk2Nzk4MSwiZXhwIjoyMDkyNTQzOTgxfQ.Vp_JSA4ReP40a25L8GS7stNdROAy5YIIw-7HM98z_RY';
const SINCE_DATE = '2026-05-16'; // YYYY-MM-DD — importar a partir desta data

// ATENÇÃO: verifique as colunas UTM antes de importar.
// Abra a planilha e confirme em quais colunas estão:
//   Campanha (utm_campaign), Conjunto (utm_medium),
//   Anúncio  (utm_content),  Site de origem (utm_source)
// Os valores abaixo são a estimativa baseada na estrutura atual.
const SHEETS = [
  {
    name:     'ISCAS',
    encoded:  encodeURIComponent('ISCAS'),
    cols:     { origem:1, data:2, nome:4, telefone:5, email:6, instagram:7, desafio:8, profissao:9, renda:10,
                // UTMs — colunas K-N (11-14); ajuste se necessário
                utm_campaign:11, utm_medium:12, utm_content:13, utm_source:14 },
    flagCol:  17, // coluna Q (1-indexed)
    startRow: 2038,
  },
  {
    name:     'Respondi.app',
    encoded:  encodeURIComponent('Respondi.app'),
    cols:     { origem:1, data:2, nome:4, telefone:5, email:6, instagram:7, idade:8, desafio:9, profissao:10,
                jaParticipou:11, jaEAluna:12, tempoConhece:13, renda:14, motivacao:15, deOnde:16,
                // UTMs — colunas Q-T (17-20); ajuste se necessário
                utm_campaign:17, utm_medium:18, utm_content:19, utm_source:20 },
    flagCol:  22, // coluna V (1-indexed)
    startRow: 1153,
  },
];

// ─── CORES ────────────────────────────────────────────────────────────────────
const c = {
  ok:   s => `\x1b[32m${s}\x1b[0m`,
  err:  s => `\x1b[31m${s}\x1b[0m`,
  info: s => `\x1b[34m${s}\x1b[0m`,
  warn: s => `\x1b[33m${s}\x1b[0m`,
  dim:  s => `\x1b[90m${s}\x1b[0m`,
};
function log(msg, type) { console.log(type && c[type] ? c[type](msg) : msg); }
function sep() { log('─'.repeat(60), 'dim'); }

// ─── CSV PARSER ───────────────────────────────────────────────────────────────
function parseCSV(text) {
  const rows = [];
  let cur = '', inQ = false, row = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQ && text[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      row.push(cur); cur = '';
    } else if ((ch === '\n' || ch === '\r') && !inQ) {
      row.push(cur); cur = '';
      if (row.some(c => c !== '')) rows.push(row);
      row = [];
      if (ch === '\r' && text[i + 1] === '\n') i++;
    } else {
      cur += ch;
    }
  }
  if (cur || row.length) { row.push(cur); if (row.some(c => c !== '')) rows.push(row); }
  return rows;
}

// ─── DATA ─────────────────────────────────────────────────────────────────────
function parseDate(str) {
  if (!str) return null;
  // DD/MM/YYYY [HH:MM:SS]
  const m = str.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  // YYYY-MM-DD
  const m2 = str.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  if (m2) return m2[1];
  return null;
}

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
async function sbReq(method, path, body) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey':        SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        method === 'POST' ? 'return=minimal' : '',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase ${method} ${path}: ${res.status} — ${txt}`);
  }
  return method === 'GET' ? res.json() : null;
}

// ─── BUSCAR ABA ───────────────────────────────────────────────────────────────
async function fetchSheet(encoded) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encoded}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ao buscar aba ${encoded}`);
  return res.text();
}

// ─── NORMALIZAR TELEFONE ──────────────────────────────────────────────────────
function normPhone(p) {
  return String(p || '').replace(/\D/g, '');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  sep();
  log('  FDV — Importação Leads Google Sheets → Supabase', 'info');
  log(`  Filtrando leads a partir de ${SINCE_DATE}`, 'dim');
  sep();

  // 1. Buscar celulares já cadastrados no Supabase para evitar duplicatas
  log('\nCarregando celulares existentes no Supabase…', 'dim');
  const existingLeads = await sbReq('GET', 'leads?select=celular&celular=not.is.null');
  const existingPhones = new Set(existingLeads.map(l => normPhone(l.celular)).filter(Boolean));
  log(`  ${existingPhones.size} celulares já cadastrados`, 'dim');

  let totalInseridos = 0;
  let totalPulados   = 0;
  let totalSemNome   = 0;

  for (const sheet of SHEETS) {
    log(`\n[${sheet.name}]`, 'info');

    let csv;
    try {
      csv = await fetchSheet(sheet.encoded);
    } catch (e) {
      log(`  ✗ Erro ao buscar planilha: ${e.message}`, 'err');
      continue;
    }

    const allRows = parseCSV(csv);
    // Linha 1 = cabeçalho; dados começam na linha 2 (index 1)
    // A gviz não respeita startRow — filtramos por data
    const dataRows = allRows.slice(1); // pular cabeçalho
    log(`  ${dataRows.length} linhas carregadas`, 'dim');

    const get = (row, colNum) => String(row[colNum - 1] || '').trim();

    let inseridos = 0, pulados = 0, semNome = 0;

    for (const row of dataRows) {
      const dateStr   = get(row, sheet.cols.data);
      const dateParsed = parseDate(dateStr);

      // Filtrar por data >= SINCE_DATE
      if (!dateParsed || dateParsed < SINCE_DATE) continue;

      // Pular linhas já marcadas como ✅ (importadas pelo Apps Script)
      const flag = get(row, sheet.flagCol);
      if (flag === '✅' || flag === 'TRUE' || flag.toLowerCase() === 'ok') continue;

      const nome = get(row, sheet.cols.nome);
      if (!nome) { semNome++; continue; }

      const celular = get(row, sheet.cols.telefone);

      // Evitar duplicata por celular
      if (celular && existingPhones.has(normPhone(celular))) {
        pulados++;
        continue;
      }

      // Montar extras para observacoes
      const extras = {};
      const extraFields = ['desafio','idade','jaParticipou','jaEAluna','tempoConhece','motivacao','deOnde'];
      for (const f of extraFields) {
        if (sheet.cols[f]) {
          const val = get(row, sheet.cols[f]);
          if (val) extras[f] = val;
        }
      }

      const lead = {
        nome,
        celular:      celular || null,
        email:        get(row, sheet.cols.email)     || null,
        instagram:    get(row, sheet.cols.instagram) || null,
        profissao:    sheet.cols.profissao ? get(row, sheet.cols.profissao) || null : null,
        renda:        sheet.cols.renda     ? get(row, sheet.cols.renda)     || null : null,
        origem:       get(row, sheet.cols.origem) || sheet.name,
        status:       'aguardando',
        datachegada:  dateParsed,
        observacoes:  Object.keys(extras).length ? JSON.stringify(extras) : null,
        etiquetas:    [],
        // UTMs — campos vazios são normais para leads orgânicos
        utm_campaign: sheet.cols.utm_campaign ? get(row, sheet.cols.utm_campaign) || null : null,
        utm_medium:   sheet.cols.utm_medium   ? get(row, sheet.cols.utm_medium)   || null : null,
        utm_content:  sheet.cols.utm_content  ? get(row, sheet.cols.utm_content)  || null : null,
        utm_source:   sheet.cols.utm_source   ? get(row, sheet.cols.utm_source)   || null : null,
      };

      try {
        await sbReq('POST', 'leads', lead);
        if (celular) existingPhones.add(normPhone(celular));
        inseridos++;
        log(`  ✓ ${nome} (${dateParsed})`, 'ok');
      } catch (e) {
        log(`  ✗ ${nome}: ${e.message}`, 'err');
      }
    }

    log(`\n  Inseridos: ${inseridos}  |  Pulados (duplicata): ${pulados}  |  Sem nome: ${semNome}`, 'dim');
    totalInseridos += inseridos;
    totalPulados   += pulados;
    totalSemNome   += semNome;
  }

  sep();
  log(`\nConcluído — ${totalInseridos} leads importados, ${totalPulados} duplicatas ignoradas, ${totalSemNome} linhas sem nome`, totalInseridos > 0 ? 'ok' : 'warn');
  sep();
}

main().catch(e => { console.error(c.err('\nErro fatal: ' + e.message)); process.exit(1); });
