#!/usr/bin/env node
// local/import-alunas.js
// Uso: node local/import-alunas.js
// Requer Node.js 18+ (fetch nativo)

if (typeof fetch === 'undefined') {
  console.error('Node.js 18 ou superior é necessário (fetch nativo).');
  process.exit(1);
}

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const SHEET_ID = '1Vt_s4RrX29J99O4Av0ItJXnLx8T7bXmZUuk0s2zVH6U';
const SB_URL   = 'https://yadxcbhginjvoemacdly.supabase.co';
const SB_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZHhjYmhnaW5qdm9lbWFjZGx5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk2Nzk4MSwiZXhwIjoyMDkyNTQzOTgxfQ.Vp_JSA4ReP40a25L8GS7stNdROAy5YIIw-7HM98z_RY';

// ─── CORES ────────────────────────────────────────────────────────────────────
const ok   = s => `\x1b[32m${s}\x1b[0m`;
const err  = s => `\x1b[31m${s}\x1b[0m`;
const info = s => `\x1b[34m${s}\x1b[0m`;
const warn = s => `\x1b[33m${s}\x1b[0m`;
const dim  = s => `\x1b[90m${s}\x1b[0m`;

function log(msg, type) {
  const fmt = { ok, err, info, warn, dim };
  console.log(type && fmt[type] ? fmt[type](msg) : msg);
}
function sep() { log('─'.repeat(60), 'dim'); }

// ─── CSV PARSER ───────────────────────────────────────────────────────────────
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else {
      if (c === '"') { inQ = true; }
      else if (c === ',') { row.push(field.trim()); field = ''; }
      else if (c === '\r' || c === '\n') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field.trim()); field = '';
        if (row.some(f => f !== '')) rows.push(row);
        row = [];
      } else field += c;
    }
  }
  if (field || row.length) { row.push(field.trim()); if (row.some(f => f !== '')) rows.push(row); }
  return rows;
}

// ─── FUNÇÕES DE DATA ──────────────────────────────────────────────────────────
function parseDateBR(str) {
  const m = (str || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function addMonths(dateStr, months) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

function computeTermino(tempo, dataInscricao) {
  if (!tempo) return null;
  const asDate = parseDateBR(tempo);
  if (asDate) return asDate;
  const mM = tempo.match(/(\d+)\s*m[eê]s/i);
  if (mM) return addMonths(dataInscricao, parseInt(mM[1]));
  const aM = tempo.match(/(\d+)\s*ano/i);
  if (aM) return addMonths(dataInscricao, parseInt(aM[1]) * 12);
  return null;
}

// ─── PARSERS DE VALOR ─────────────────────────────────────────────────────────
function parseQnt(val) {
  if (!val) return 0;
  const multiM = val.match(/(\d+)\s+com\s+\w+\s+e\s+(\d+)/i);
  if (multiM) return parseInt(multiM[1]) + parseInt(multiM[2]);
  const m = val.match(/(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

function parseStatusAluna(val) {
  const MAP = {
    'Finalizado':      'Finalizado',
    'Dentro do Prazo': 'Ativa',
    'Atrasado':        'Atrasada',
    'Atrasada':        'Atrasada',
    'Cliente Off':     'Inativa',
    'Reembolso':       'Reembolso',
    'Cancelado':       'Cancelada',
    'Cancelada':       'Cancelada',
    'Migrou':          'Migrou',
    'Nova compra':     'Nova compra',
    'Parceria':        'Parceria',
  };
  const v = (val || '').trim();
  return MAP[v] || v || 'Nova compra';
}

function parseSessionStatus(val) {
  const v = (val || '').toLowerCase().trim();
  if (!v)               return null;
  if (v.includes('realiz'))  return 'Realizada';
  if (v.includes('cancel'))  return 'Cancelada';
  if (v.includes('marc'))    return 'Marcada';
  if (v.includes('contato')) return 'Em contato';
  if (v.includes('aguard'))  return 'Aguardando';
  return val.trim() || null;
}

function parseBool(val) {
  const v = (val || '').toUpperCase().trim();
  return v === 'TRUE' || v === '1' || v === 'VERDADEIRO' || v === 'SIM';
}

function parseSessaoCell(val) {
  const v = (val || '').trim();
  if (!v) return null;
  const data = parseDateBR(v);
  if (data) return { data, status: 'Realizada' };
  const status = parseSessionStatus(v);
  return status ? { data: null, status } : null;
}

// ─── PARSERS POR TIPO DE ABA ──────────────────────────────────────────────────

// Individual, Comunidade +3, Comunidade +1
// [0] nome  [1] inscricao  [2] termino  [3] qnt  [4] status  [5..16] sessões
function parseBasicRow(row, produto) {
  const nome = (row[0] || '').trim();
  if (!nome) return null;
  const dataInscricao = parseDateBR(row[1]);
  const dataTermino   = parseDateBR(row[2]);
  const qnt           = parseQnt(row[3]);
  const status        = parseStatusAluna(row[4]);

  const sessoes = [];
  for (let i = 5; i < row.length && (i - 5) < 12; i++) {
    const s = parseSessaoCell(row[i]);
    if (!s) continue;
    sessoes.push({ numero_sessao: i - 4, data: s.data, status: s.status });
  }
  const sessoes_realizadas = sessoes.filter(s => s.status === 'Realizada').length;

  return {
    aluna: { nome, produto, status, data_inscricao: dataInscricao, data_termino: dataTermino,
             sessoes_total: qnt || sessoes.length, sessoes_realizadas, esta_no_grupo: false },
    sessoes,
    contrato: dataInscricao ? { produto, assinado: true, data_inicio: dataInscricao,
                                data_vencimento: dataTermino, esta_no_grupo: false } : null,
  };
}

// Reprogramação Mensal
// [0] nome  [1] status  [2] assinado  [3] no_grupo  [4] inscricao
// [5] tempo  [6] qnt  [7,8] s1_data,s1_status  [9,10] s2 …
function parseReproRow(row, produto) {
  const nome = (row[0] || '').trim();
  if (!nome) return null;
  const status        = parseStatusAluna(row[1]);
  const assinado      = parseBool(row[2]);
  const noGrupo       = parseBool(row[3]);
  const dataInscricao = parseDateBR(row[4]);
  const dataTermino   = computeTermino(row[5], dataInscricao);
  const qnt           = parseQnt(row[6]);

  const sessoes = [];
  for (let i = 7; i + 1 < row.length; i += 2) {
    const dataVal = (row[i] || '').trim(), statusVal = (row[i + 1] || '').trim();
    if (!dataVal && !statusVal) continue;
    const num = Math.floor((i - 7) / 2) + 1;
    const data = parseDateBR(dataVal);
    const st   = parseSessionStatus(statusVal) || (data ? 'Realizada' : 'Aguardando');
    sessoes.push({ numero_sessao: num, data, status: st });
  }
  const sessoes_realizadas = sessoes.filter(s => s.status === 'Realizada').length;

  return {
    aluna: { nome, produto, status, data_inscricao: dataInscricao, data_termino: dataTermino,
             sessoes_total: qnt || sessoes.length, sessoes_realizadas, esta_no_grupo: noGrupo },
    sessoes,
    contrato: { produto, assinado, data_inicio: dataInscricao, data_vencimento: dataTermino,
                esta_no_grupo: noGrupo },
  };
}

// Águia Club
// [0] nome  [1] assinado  [2] inscricao  [3..10] sessões 1-8
function parseAguiaRow(row, produto) {
  const nome = (row[0] || '').trim();
  if (!nome) return null;
  const assinado      = parseBool(row[1]);
  const dataInscricao = parseDateBR(row[2]);

  const sessoes = [];
  for (let i = 3; i < row.length && (i - 3) < 8; i++) {
    const s = parseSessaoCell(row[i]);
    if (!s) continue;
    sessoes.push({ numero_sessao: i - 2, data: s.data, status: s.status });
  }
  const sessoes_realizadas = sessoes.filter(s => s.status === 'Realizada').length;

  return {
    aluna: { nome, produto, status: 'Nova compra', data_inscricao: dataInscricao,
             data_termino: null, sessoes_total: 8, sessoes_realizadas, esta_no_grupo: false },
    sessoes,
    contrato: { produto, assinado, data_inicio: dataInscricao, data_vencimento: null,
                esta_no_grupo: false },
  };
}

// PRM
// [0] nome  [1] inscricao  [2] tempo  [3] termino  [4] qnt  [5] status
// [6,7] s1_data,s1_status  [8,9] s2 …
function parsePRMRow(row, produto) {
  const nome = (row[0] || '').trim();
  if (!nome) return null;
  const dataInscricao = parseDateBR(row[1]);
  const dataTermino   = parseDateBR(row[3]) || computeTermino(row[2], dataInscricao);
  const qnt           = parseQnt(row[4]);
  const status        = parseStatusAluna(row[5]);

  const sessoes = [];
  for (let i = 6; i + 1 < row.length; i += 2) {
    const dataVal = (row[i] || '').trim(), statusVal = (row[i + 1] || '').trim();
    if (!dataVal && !statusVal) continue;
    const num = Math.floor((i - 6) / 2) + 1;
    const data = parseDateBR(dataVal);
    const st   = parseSessionStatus(statusVal) || (data ? 'Realizada' : 'Aguardando');
    sessoes.push({ numero_sessao: num, data, status: st });
  }
  const sessoes_realizadas = sessoes.filter(s => s.status === 'Realizada').length;

  return {
    aluna: { nome, produto, status, data_inscricao: dataInscricao, data_termino: dataTermino,
             sessoes_total: qnt || sessoes.length, sessoes_realizadas, esta_no_grupo: false },
    sessoes,
    contrato: { produto, assinado: true, data_inicio: dataInscricao,
                data_vencimento: dataTermino, esta_no_grupo: false },
  };
}

// ─── DEFINIÇÃO DAS ABAS ───────────────────────────────────────────────────────
const TABS = [
  { produto: 'Individual',           encoded: 'Individual',                        type: 'basic' },
  { produto: 'Comunidade +3',        encoded: 'Comunidade%20%2B3',                 type: 'basic' },
  { produto: 'Comunidade +1',        encoded: 'Comunidade%20%2B1',                 type: 'basic' },
  { produto: 'Reprogramação Mensal', encoded: 'Reprograma%C3%A7%C3%A3o%20Mensal', type: 'repro' },
  { produto: 'Águia Club',           encoded: '%C3%81guia%20Club',                 type: 'aguia' },
  { produto: 'PRM',                  encoded: 'PRM',                               type: 'prm'   },
];

// ─── API SUPABASE ─────────────────────────────────────────────────────────────
async function sbReq(method, path, body, prefer = '') {
  const headers = {
    'apikey':        SB_KEY,
    'Authorization': `Bearer ${SB_KEY}`,
    'Content-Type':  'application/json',
  };
  if (prefer) headers['Prefer'] = prefer;
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} /${path}: HTTP ${res.status} — ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function sbUpsert(table, rows, conflictCols) {
  if (!rows.length) return [];
  const result = await sbReq(
    'POST',
    `${table}?on_conflict=${conflictCols}`,
    rows,
    'return=representation,resolution=merge-duplicates',
  );
  return Array.isArray(result) ? result : [];
}

async function sbDelete(table, filter) {
  try { await sbReq('DELETE', `${table}?${filter}`); } catch (_) {}
}

async function sbInsert(table, rows) {
  if (!rows.length) return;
  await sbReq('POST', table, rows, 'return=minimal');
}

// ─── BUSCAR ABA ───────────────────────────────────────────────────────────────
async function fetchSheet(encoded) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encoded}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  sep();
  log('  FDV — Importação Planilha Alunas → Supabase', 'info');
  sep();

  const totais = { alunas: 0, sessoes: 0 };

  for (let t = 0; t < TABS.length; t++) {
    const tab = TABS[t];
    log(`\n[${t + 1}/${TABS.length}] ${tab.produto}`, 'info');

    // 1. Buscar CSV
    let csv;
    try {
      csv = await fetchSheet(tab.encoded);
    } catch (e) {
      log(`  ✗ Erro ao buscar aba: ${e.message}`, 'err');
      continue;
    }

    const allRows = parseCSV(csv);
    if (allRows.length < 2) { log('  ⚠ Aba vazia', 'warn'); continue; }
    log(`  Planilha: ${allRows.length - 1} linha(s)`, 'dim');

    // 2. Parsear linhas (pular cabeçalho)
    const parsed = [];
    for (let i = 1; i < allRows.length; i++) {
      const row = allRows[i];
      if (!row[0]) continue;
      let result = null;
      if      (tab.type === 'basic') result = parseBasicRow(row, tab.produto);
      else if (tab.type === 'repro') result = parseReproRow(row, tab.produto);
      else if (tab.type === 'aguia') result = parseAguiaRow(row, tab.produto);
      else if (tab.type === 'prm')   result = parsePRMRow(row, tab.produto);
      if (result) parsed.push(result);
    }

    if (!parsed.length) { log('  ⚠ Nenhuma linha válida', 'warn'); continue; }
    log(`  Parseadas: ${parsed.length} aluna(s)`, 'dim');

    // 3. Upsert alunas — merge-duplicates preserva foto_url, lead_id, observacoes
    let upserted;
    try {
      upserted = await sbUpsert('alunas', parsed.map(p => p.aluna), 'nome,produto');
    } catch (e) {
      log(`  ✗ Erro ao upsert alunas: ${e.message}`, 'err');
      continue;
    }

    // Mapa nome → id
    const nomeIdMap = {};
    upserted.forEach(a => { if (a.nome) nomeIdMap[a.nome] = a.id; });

    // Fallback: busca IDs via SELECT se o upsert não retornou
    const semId = parsed.filter(p => !nomeIdMap[p.aluna.nome]);
    if (semId.length) {
      try {
        const rows = await sbReq('GET', `alunas?produto=eq.${encodeURIComponent(tab.produto)}&select=id,nome`);
        (rows || []).forEach(a => { if (a.nome) nomeIdMap[a.nome] = a.id; });
      } catch (_) {}
    }

    log(`  ✓ ${upserted.length} aluna(s) upsertada(s)`, 'ok');
    totais.alunas += upserted.length;

    // 4. Sessões e contratos (DELETE + INSERT por aluna)
    let tabSessoes = 0;
    for (const p of parsed) {
      const alunaId = nomeIdMap[p.aluna.nome];
      if (!alunaId) { log(`  ⚠ ID não encontrado: ${p.aluna.nome}`, 'warn'); continue; }

      await sbDelete('sessoes', `aluna_id=eq.${alunaId}`);
      if (p.sessoes.length) {
        try {
          await sbInsert('sessoes', p.sessoes.map(s => ({
            aluna_id: alunaId, numero_sessao: s.numero_sessao,
            data: s.data || null, status: s.status,
          })));
          tabSessoes += p.sessoes.length;
        } catch (e) {
          log(`  ⚠ Sessões de "${p.aluna.nome}": ${e.message.slice(0, 120)}`, 'warn');
        }
      }

      await sbDelete('contratos', `aluna_id=eq.${alunaId}`);
      if (p.contrato) {
        try {
          await sbInsert('contratos', [{ aluna_id: alunaId, ...p.contrato }]);
        } catch (e) {
          log(`  ⚠ Contrato de "${p.aluna.nome}": ${e.message.slice(0, 120)}`, 'warn');
        }
      }
    }

    totais.sessoes += tabSessoes;
    log(`  ✓ ${tabSessoes} sessão(ões) importada(s)`, 'ok');
  }

  sep();
  log('', '');
  log('✅ IMPORTAÇÃO CONCLUÍDA', 'ok');
  log(`   Alunas : ${totais.alunas}`, 'ok');
  log(`   Sessões: ${totais.sessoes}`, 'ok');
  sep();
}

main().catch(e => {
  log('\n❌ ERRO FATAL: ' + e.message, 'err');
  process.exit(1);
});
