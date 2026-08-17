#!/usr/bin/env node
// Investigação — divergência Agendamentos, Agosto/2026
// Reproduz exatamente a lógica de renderAgendadosOverview() (app/app.js) e cruza
// com a planilha da Muy (16 leads, por telefone). Somente leitura.

const SB_URL = 'https://yadxcbhginjvoemacdly.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZHhjYmhnaW5qdm9lbWFjZGx5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk2Nzk4MSwiZXhwIjoyMDkyNTQzOTgxfQ.Vp_JSA4ReP40a25L8GS7stNdROAy5YIIw-7HM98z_RY';
const MES = '2026-08';
const TODAY = '2026-08-17'; // conforme contexto da conversa

async function sbGet(path) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (!res.ok) throw new Error(`GET ${path}: ${res.status} — ${await res.text()}`);
  return res.json();
}

async function fetchAll(path, fields) {
  let all = [], offset = 0;
  while (true) {
    const page = await sbGet(`${path}&select=${fields}&limit=1000&offset=${offset}`);
    if (!page.length) break;
    all.push(...page);
    offset += 1000;
    if (page.length < 1000) break;
  }
  return all;
}

function normPhone(p) {
  let d = String(p || '').replace(/\D/g, '').trim();
  // remove código do país 55 quando presente (DDI+DDD+numero = 12 ou 13 dígitos)
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
  return d;
}

const PLANILHA = [
  ['Janaína Camargo Penteado Durante', '11983317223', 'Call realizada'],
  ['Renata de Souza Nunes Silva', '19983476370', 'No show'],
  ['Nélia Hora', '11976468448', 'Call realizada'],
  ['Aline Cristina Ramos Moreira de Oliveira', '12988129987', 'Call realizada'],
  ['Thalita Tavares', '22992255539', 'Call realizada'],
  ['Jussiara Rodrigues Mamédio', '11968741473', 'Call realizada'],
  ['Cris Maria', '43996287217', 'Call realizada'],
  ['Thays Zanon Casagrande', '27992727864', 'Call realizada'],
  ['Priscila de Souza', '33998620781', 'Call realizada'],
  ['Cristina Moraes', '67991904544', 'Call realizada'],
  ['Bibiana Schwarz', '49988443808', 'Call realizada'],
  ['Paula Nunes', '66984499561', 'Call realizada'],
  ['Ana Kátia de Souza', '51996919200', 'Call realizada'],
  ['Samanta Edwirges', '11985824856', 'No show'],
  ['Liana Veras', '11940033619', '(pendente, call hoje 17/08)'],
  ['Solange da Silva Sondag', '64999475502', '(pendente, call hoje 17/08)'],
].map(([nome, tel, statusPlanilha]) => ({ nome, tel: normPhone(tel), statusPlanilha }));

async function main() {
  const FIELDS = 'id,nome,celular,status,kanban_column,dataagendamento,horaagendamento,realizadaem,closer,venda_ganha_dados,criadoem,atualizadoem';
  const allLeads = await fetchAll('leads?', FIELDS);
  console.log(`Total de leads no banco: ${allLeads.length}\n`);

  // ── Replica EXATAMENTE renderAgendadosOverview() para mesFiltUI = '2026-08' ──
  const leadsDoMes = allLeads.filter(l => (l.dataagendamento || '').startsWith(MES));
  const nAgendados  = leadsDoMes.length;
  const isRealizada = l => ['realizada', 'venda_ganha'].includes(l.status) || l.kanban_column === 'venda_ganha';
  const nRealizadas = leadsDoMes.filter(isRealizada).length;
  const nNoShow     = leadsDoMes.filter(l => l.status === 'noshow').length;
  const nProximas   = leadsDoMes.filter(l => l.status === 'agendado' && (l.dataagendamento || '') >= TODAY).length;
  const nVendas     = allLeads.filter(l => l.kanban_column === 'venda_ganha'
    && l.venda_ganha_dados?.status !== 'cancelada'
    && (l.venda_ganha_dados?.data_venda || '').startsWith(MES)).length;

  console.log('=== DASHBOARD (replicado) ===');
  console.log({ nAgendados, nRealizadas, nNoShow, nProximas, nVendas });
  console.log();

  // ── PROBLEMA 1: leads "limbo" — nem realizada, nem noshow, nem próxima ──
  const limbo = leadsDoMes.filter(l => !isRealizada(l) && l.status !== 'noshow'
    && !(l.status === 'agendado' && (l.dataagendamento || '') >= TODAY));

  console.log(`=== PROBLEMA 1 — leads "limbo" (${limbo.length}) ===`);
  limbo.forEach(l => {
    console.log(`  ${l.nome} | tel:${l.celular} | status:${l.status} | kanban_column:${l.kanban_column} | dataagendamento:${l.dataagendamento} | realizadaem:${l.realizadaem || '—'} | closer:${l.closer || '—'}`);
  });
  console.log();

  // ── PROBLEMA 2: cruzamento por telefone com a planilha ──
  const byPhone = new Map();
  for (const l of allLeads) {
    const ph = normPhone(l.celular);
    if (!ph) continue;
    if (!byPhone.has(ph)) byPhone.set(ph, []);
    byPhone.get(ph).push(l);
  }

  console.log('=== PROBLEMA 2 — cruzamento por telefone (planilha x sistema) ===');
  for (const p of PLANILHA) {
    const matches = byPhone.get(p.tel) || [];
    if (!matches.length) {
      console.log(`  [SEM LEAD] ${p.nome} | ${p.tel} | planilha: ${p.statusPlanilha}`);
      continue;
    }
    matches.forEach(l => {
      const inAgosto = (l.dataagendamento || '').startsWith(MES);
      console.log(`  [OK] ${p.nome} | ${p.tel} | planilha: ${p.statusPlanilha} || sistema: nome="${l.nome}" status=${l.status} kanban_column=${l.kanban_column} dataagendamento=${l.dataagendamento} (agosto:${inAgosto}) realizadaem=${l.realizadaem || '—'}`);
    });
  }
  console.log();

  // ── PROBLEMA 2.3: leads extras no sistema (agosto) fora da planilha ──
  const planilhaSet = new Set(PLANILHA.map(p => p.tel));
  const extras = leadsDoMes.filter(l => !planilhaSet.has(normPhone(l.celular)));
  console.log(`=== Leads no sistema com dataagendamento em agosto, FORA da planilha (${extras.length}) ===`);
  extras.forEach(l => {
    console.log(`  ${l.nome} | tel:${l.celular} | status:${l.status} | kanban_column:${l.kanban_column} | dataagendamento:${l.dataagendamento} | realizadaem:${l.realizadaem || '—'}`);
  });
  console.log();

  // ── PROBLEMA 2.4: cruzar limbo x extras x planilha ──
  console.log('=== Cruzamento: limbo x planilha ===');
  limbo.forEach(l => {
    const ph = normPhone(l.celular);
    const naPlanilha = PLANILHA.find(p => p.tel === ph);
    console.log(`  ${l.nome} | tel:${l.celular} | ${naPlanilha ? `NA PLANILHA (${naPlanilha.statusPlanilha})` : 'NÃO está na planilha (extra)'}`);
  });
}

main().catch(e => { console.error('Erro fatal: ' + e.message); process.exit(1); });

// ── Extra: histórico de status dos 5 leads "limbo" + checagem de nomes divergentes ──
async function extra() {
  const FIELDS = 'id,nome,celular,status,kanban_column,dataagendamento,realizadaem,closer,venda_ganha_dados';
  const allLeads = await fetchAll('leads?', FIELDS);
  const leadsDoMes = allLeads.filter(l => (l.dataagendamento || '').startsWith(MES));
  const isRealizada = l => ['realizada', 'venda_ganha'].includes(l.status) || l.kanban_column === 'venda_ganha';
  const limbo = leadsDoMes.filter(l => !isRealizada(l) && l.status !== 'noshow'
    && !(l.status === 'agendado' && (l.dataagendamento || '') >= TODAY));

  console.log('\n=== Histórico (lead_historico) dos 5 leads limbo ===');
  for (const l of limbo) {
    const hist = await fetchAll(`lead_historico?lead_id=eq.${l.id}`, 'col,col_label,movido_por,movido_em');
    console.log(`\n  ${l.nome} (id ${l.id}):`);
    if (!hist.length) { console.log('    (sem histórico registrado)'); continue; }
    hist.sort((a,b) => (a.movido_em||'').localeCompare(b.movido_em||''))
        .forEach(h => console.log(`    ${h.movido_em}  [${h.movido_por||'?'}]  → col: ${h.col} (${h.col_label||''})`));
  }

  // Vendas do mês (nVendas) — detalhar quais leads compõem os 6 vs 5 reportado
  console.log('\n=== Detalhe nVendas (kanban_column=venda_ganha, data_venda em agosto, não cancelada) ===');
  const vendasAgo = allLeads.filter(l => l.kanban_column === 'venda_ganha'
    && l.venda_ganha_dados?.status !== 'cancelada'
    && (l.venda_ganha_dados?.data_venda || '').startsWith(MES));
  vendasAgo.forEach(l => console.log(`  ${l.nome} | tel:${l.celular} | data_venda:${l.venda_ganha_dados?.data_venda} | dataagendamento:${l.dataagendamento} | vg_status:${l.venda_ganha_dados?.status}`));
}
extra().catch(e => console.error('extra() erro: ' + e.message));
