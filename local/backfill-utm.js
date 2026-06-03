#!/usr/bin/env node
// local/backfill-utm.js
// Lê as duas abas da planilha e atualiza os campos UTM nos leads
// já existentes no Supabase, casando por número de telefone.
// Uso: node local/backfill-utm.js

if (typeof fetch === 'undefined') {
  console.error('Node.js 18 ou superior é necessário (fetch nativo).');
  process.exit(1);
}

const SHEET_ID = '157tpNvXLgQUuilBU7ARCDYDUtvyJxuyF3Zc9D-GuWWs';
const SB_URL   = 'https://yadxcbhginjvoemacdly.supabase.co';
const SB_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZHhjYmhnaW5qdm9lbWFjZGx5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk2Nzk4MSwiZXhwIjoyMDkyNTQzOTgxfQ.Vp_JSA4ReP40a25L8GS7stNdROAy5YIIw-7HM98z_RY';

const SHEETS = [
  {
    name:    'ISCAS',
    encoded: encodeURIComponent('ISCAS'),
    cols:    { telefone:5, utm_campaign:11, utm_medium:12, utm_content:13, utm_source:14 },
  },
  {
    name:    'Respondi.app',
    encoded: encodeURIComponent('Respondi.app'),
    cols:    { telefone:5, utm_campaign:17, utm_medium:18, utm_content:19, utm_source:20 },
  },
];

const c = {
  ok:   s => `\x1b[32m${s}\x1b[0m`,
  err:  s => `\x1b[31m${s}\x1b[0m`,
  info: s => `\x1b[34m${s}\x1b[0m`,
  warn: s => `\x1b[33m${s}\x1b[0m`,
  dim:  s => `\x1b[90m${s}\x1b[0m`,
};
function log(msg, type) { console.log(type && c[type] ? c[type](msg) : msg); }
function sep() { log('─'.repeat(60), 'dim'); }

function normPhone(p) { return String(p || '').replace(/\D/g, ''); }

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

async function fetchSheet(encoded) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encoded}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ao buscar aba ${encoded}`);
  return res.text();
}

async function sbGet(path) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`GET ${path}: ${res.status} — ${await res.text()}`);
  return res.json();
}

async function sbPatch(id, data) {
  const res = await fetch(`${SB_URL}/rest/v1/leads?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=minimal',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`PATCH lead ${id}: ${res.status} — ${await res.text()}`);
}

async function main() {
  sep();
  log('  FDV — Backfill UTM: planilha → Supabase', 'info');
  sep();

  // 1. Carregar todos os leads do banco (id + celular + utms atuais)
  log('\nCarregando leads do Supabase…', 'dim');
  const dbLeads = await sbGet('leads?select=id,celular,utm_campaign,utm_medium,utm_content,utm_source&celular=not.is.null');
  const phoneMap = new Map(); // normPhone → lead
  for (const l of dbLeads) {
    const p = normPhone(l.celular);
    if (p) phoneMap.set(p, l);
  }
  log(`  ${phoneMap.size} leads com telefone no banco`, 'dim');

  // 2. Construir mapa planilha: normPhone → { utm_campaign, utm_medium, utm_content, utm_source }
  log('\nLendo planilhas…', 'dim');
  const sheetUtm = new Map(); // normPhone → utms (first match wins)

  for (const sheet of SHEETS) {
    log(`\n  [${sheet.name}]`, 'info');
    let csv;
    try { csv = await fetchSheet(sheet.encoded); }
    catch (e) { log(`  ✗ ${e.message}`, 'err'); continue; }

    const rows = parseCSV(csv).slice(1); // pula cabeçalho
    log(`  ${rows.length} linhas`, 'dim');

    const get = (row, col) => String(row[col - 1] || '').trim();
    let mapeados = 0;

    for (const row of rows) {
      const phone = normPhone(get(row, sheet.cols.telefone));
      if (!phone || phone.length < 8) continue;
      if (sheetUtm.has(phone)) continue; // primeira ocorrência vence

      const campaign = get(row, sheet.cols.utm_campaign) || null;
      const medium   = get(row, sheet.cols.utm_medium)   || null;
      const content  = get(row, sheet.cols.utm_content)  || null;
      const source   = get(row, sheet.cols.utm_source)   || null;

      // Só mapeia se ao menos um campo UTM estiver preenchido
      if (campaign || medium || content || source) {
        sheetUtm.set(phone, { utm_campaign: campaign, utm_medium: medium, utm_content: content, utm_source: source });
        mapeados++;
      }
    }
    log(`  ${mapeados} linhas com UTM preenchida`, 'dim');
  }

  log(`\n  Total de telefones com UTM na planilha: ${sheetUtm.size}`, 'dim');

  // 3. Cruzar e atualizar
  log('\nAtualizando leads no Supabase…', 'dim');
  let atualizados = 0, semMatch = 0, jaPreenchido = 0, erros = 0;

  for (const [phone, utms] of sheetUtm) {
    const lead = phoneMap.get(phone);
    if (!lead) { semMatch++; continue; }

    // Pular se todos os campos já estão preenchidos
    if (lead.utm_campaign && lead.utm_medium && lead.utm_content && lead.utm_source) {
      jaPreenchido++; continue;
    }

    // Só atualiza campos que estão nulos no banco (não sobrescreve dados existentes)
    const patch = {};
    if (!lead.utm_campaign && utms.utm_campaign) patch.utm_campaign = utms.utm_campaign;
    if (!lead.utm_medium   && utms.utm_medium)   patch.utm_medium   = utms.utm_medium;
    if (!lead.utm_content  && utms.utm_content)  patch.utm_content  = utms.utm_content;
    if (!lead.utm_source   && utms.utm_source)   patch.utm_source   = utms.utm_source;

    if (!Object.keys(patch).length) { jaPreenchido++; continue; }

    try {
      await sbPatch(lead.id, patch);
      log(`  ✓ ${lead.celular}  campaign=${patch.utm_campaign||'—'}  source=${patch.utm_source||'—'}`, 'ok');
      atualizados++;
    } catch (e) {
      log(`  ✗ ${lead.celular}: ${e.message}`, 'err');
      erros++;
    }
  }

  sep();
  log(`\nConcluído`, atualizados > 0 ? 'ok' : 'warn');
  log(`  Atualizados:        ${atualizados}`, 'ok');
  log(`  Já preenchidos:     ${jaPreenchido}`, 'dim');
  log(`  Sem match no banco: ${semMatch}`, 'dim');
  if (erros) log(`  Erros:              ${erros}`, 'err');
  sep();
}

main().catch(e => { console.error(c.err('\nErro fatal: ' + e.message)); process.exit(1); });
