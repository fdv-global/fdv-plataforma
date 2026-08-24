#!/usr/bin/env node
// Investigação — divergência Agendamentos, Agosto/2026 (rodada 2, planilha com 26 linhas)
// Reproduz EXATAMENTE a lógica de renderAgendadosOverview() (app/app.js) e cruza
// com a planilha da Muy (26 leads, por telefone normalizado). Somente leitura.

const SB_URL = 'https://yadxcbhginjvoemacdly.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZHhjYmhnaW5qdm9lbWFjZGx5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk2Nzk4MSwiZXhwIjoyMDkyNTQzOTgxfQ.Vp_JSA4ReP40a25L8GS7stNdROAy5YIIw-7HM98z_RY';
const MES = '2026-08';
const TODAY = '2026-08-24'; // data do relato de River

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
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
  return d;
}

const PLANILHA = [
  ['Janaína Camargo Penteado Durante', '11983317223', 'Call realizada (venda)'],
  ['Danielle Correia Moreira', '11958883324', 'Call realizada (venda)'],
  ['Renata de Souza Nunes Silva', '19983476370', 'No show'],
  ['Nélia Hora', '11976468448', 'Call realizada'],
  ['Aline Cristina Ramos Moreira de Oliveira', '12988129987', 'Call realizada'],
  ['Thalita Tavares', '22992255539', 'Call realizada'],
  ['Jussiara Rodrigues Mamédio', '11968741473', 'Call realizada'],
  ['Cris Maria', '43996287217', 'Call realizada'],
  ['Thays Zanon Casagrande', '27992727864', 'Call realizada (venda)'],
  ['Priscila de Souza', '33998620781', 'Call realizada (venda)'],
  ['Cristina Moraes', '67991904544', 'Call realizada'],
  ['Bibiana Schwarz', '49988443808', 'Call realizada'],
  ['Paula Nunes', '66984499561', 'Call realizada'],
  ['Ana Kátia de Souza', '51996919200', 'Call realizada'],
  ['Samanta Edwirges', '11985824856', 'No show'],
  ['Liana Veras', '11940033619', 'No show'],
  ['Solange da Silva Sondag', '64999475502', 'Call realizada'],
  ['Roberta Dantas', '84994596797', 'No show'],
  ['Georgeane Freire', '82981813 13', 'Call realizada'],
  ['Kathleen Waikamp', '51981856061', 'No show'],
  ['Rayanne Serigussi', '17996006334', 'No show'],
  ['Sueli Jacondino de Oliveira', '11985801111', 'Call realizada'],
  ['Luana Foschiera Camboin Busata', '45999794300', 'Call realizada'],
  ['Karen Ribeiro Rodrigues', '88996175831', 'Call realizada'],
  ['Meyre Martins Rodrigues', '33984257398', '(pendente, call hoje 24/08)'],
  ['Claudeth Castro', '98988481547', '(pendente, call amanhã 25/08)'],
].map(([nome, tel, statusPlanilha]) => ({ nome, tel: normPhone(tel), statusPlanilha }));

async function main() {
  const FIELDS = 'id,nome,celular,status,status_closer,kanban_column,dataagendamento,horaagendamento,realizadaem,closer,venda_ganha_dados,criadoem,atualizadoem';
  const allLeads = await fetchAll('leads?', FIELDS);
  console.log(`Total de leads no banco: ${allLeads.length}\n`);

  // ── Replica EXATAMENTE renderAgendadosOverview() para mesFiltUI = '2026-08' ──
  const leadsDoMes = allLeads.filter(l => (l.dataagendamento || '').startsWith(MES));
  const leadCallRealizada = l => !!l.realizadaem || l.status_closer === 'call_realizada'
    || ['realizada', 'venda_ganha'].includes(l.status) || l.kanban_column === 'venda_ganha';

  const nAgendados  = leadsDoMes.length;
  const nRealizadas = leadsDoMes.filter(leadCallRealizada).length;
  const nNoShow     = leadsDoMes.filter(l => l.status === 'noshow').length;
  const nProximas   = leadsDoMes.filter(l => l.status === 'agendado' && (l.dataagendamento || '') >= TODAY).length;
  const nVendas     = allLeads.filter(l => l.kanban_column === 'venda_ganha'
    && l.venda_ganha_dados?.status !== 'cancelada'
    && (l.venda_ganha_dados?.data_venda || '').startsWith(MES)).length;

  console.log('=== DASHBOARD (replicado) ===');
  console.log({ nAgendados, nRealizadas, nNoShow, nProximas, nVendas });
  console.log();

  // ── PROBLEMA 1: leads "limbo" — nem realizada, nem noshow, nem próxima ──
  const limbo = leadsDoMes.filter(l => !leadCallRealizada(l) && l.status !== 'noshow'
    && !(l.status === 'agendado' && (l.dataagendamento || '') >= TODAY));

  console.log(`=== leads "limbo" no mês (${limbo.length}) — nem realizada/venda, nem noshow, nem próxima ===`);
  limbo.forEach(l => {
    console.log(`  ${l.nome} | tel:${l.celular} | status:${l.status} | status_closer:${l.status_closer} | kanban_column:${l.kanban_column} | dataagendamento:${l.dataagendamento} | realizadaem:${l.realizadaem || '—'} | closer:${l.closer || '—'}`);
  });
  console.log();

  // ── Cruzamento por telefone com a planilha ──
  const byPhone = new Map();
  for (const l of allLeads) {
    const ph = normPhone(l.celular);
    if (!ph) continue;
    if (!byPhone.has(ph)) byPhone.set(ph, []);
    byPhone.get(ph).push(l);
  }

  console.log('=== Cruzamento por telefone (planilha x sistema) — 26 linhas ===');
  for (const p of PLANILHA) {
    const matches = byPhone.get(p.tel) || [];
    if (!matches.length) {
      console.log(`  [SEM LEAD] ${p.nome} | ${p.tel} | planilha: ${p.statusPlanilha}`);
      continue;
    }
    matches.forEach(l => {
      const inAgosto = (l.dataagendamento || '').startsWith(MES);
      const realizadaSistema = leadCallRealizada(l);
      console.log(`  [OK] ${p.nome} | ${p.tel} | planilha: ${p.statusPlanilha} || sistema: nome="${l.nome}" status=${l.status} status_closer=${l.status_closer||'—'} kanban_column=${l.kanban_column} dataagendamento=${l.dataagendamento} (agosto:${inAgosto}) realizadaem=${l.realizadaem || '—'} isRealizadaCalc=${realizadaSistema} venda_ganha_dados=${JSON.stringify(l.venda_ganha_dados||null)}`);
    });
  }
  console.log();

  // ── Leads extras no sistema (agosto) fora da planilha ──
  const planilhaSet = new Set(PLANILHA.map(p => p.tel));
  const extras = leadsDoMes.filter(l => !planilhaSet.has(normPhone(l.celular)));
  console.log(`=== Leads no sistema com dataagendamento em agosto, FORA da planilha (${extras.length}) ===`);
  extras.forEach(l => {
    console.log(`  ${l.nome} | tel:${l.celular} | status:${l.status} | status_closer:${l.status_closer||'—'} | kanban_column:${l.kanban_column} | dataagendamento:${l.dataagendamento} | realizadaem:${l.realizadaem || '—'}`);
  });
  console.log();

  // ── Detalhe nVendas — quais leads compõem o número exibido ──
  console.log('=== Detalhe nVendas (kanban_column=venda_ganha, data_venda em agosto, não cancelada) ===');
  const vendasAgo = allLeads.filter(l => l.kanban_column === 'venda_ganha'
    && l.venda_ganha_dados?.status !== 'cancelada'
    && (l.venda_ganha_dados?.data_venda || '').startsWith(MES));
  vendasAgo.forEach(l => console.log(`  ${l.nome} | tel:${l.celular} | data_venda:${l.venda_ganha_dados?.data_venda} | dataagendamento:${l.dataagendamento} | vg_status:${l.venda_ganha_dados?.status}`));
  console.log();

  // ── Todas as vendas com kanban_column=venda_ganha, independente do mês da venda, cujo tel está na planilha ──
  console.log('=== Vendas (kanban_column=venda_ganha) para telefones da planilha, qualquer data_venda ===');
  for (const p of PLANILHA) {
    const matches = byPhone.get(p.tel) || [];
    matches.filter(l => l.kanban_column === 'venda_ganha').forEach(l => {
      console.log(`  ${p.nome} | ${p.tel} | data_venda:${l.venda_ganha_dados?.data_venda} | vg_status:${l.venda_ganha_dados?.status} | dataagendamento:${l.dataagendamento}`);
    });
  }
  console.log();

  // ── Próximas: detalhe dos agendados futuros no mês ──
  console.log('=== Detalhe nProximas (status=agendado, dataagendamento >= hoje) ===');
  const proximas = leadsDoMes.filter(l => l.status === 'agendado' && (l.dataagendamento || '') >= TODAY);
  proximas.forEach(l => console.log(`  ${l.nome} | tel:${l.celular} | dataagendamento:${l.dataagendamento} | status:${l.status}`));
  console.log();

  // ── Cruzar limbo x planilha ──
  console.log('=== Cruzamento: limbo x planilha ===');
  limbo.forEach(l => {
    const ph = normPhone(l.celular);
    const naPlanilha = PLANILHA.find(p => p.tel === ph);
    console.log(`  ${l.nome} | tel:${l.celular} | ${naPlanilha ? `NA PLANILHA (${naPlanilha.statusPlanilha})` : 'NÃO está na planilha (extra)'}`);
  });
}

main().catch(e => { console.error('Erro fatal: ' + e.message); process.exit(1); });
