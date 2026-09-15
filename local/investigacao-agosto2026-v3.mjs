#!/usr/bin/env node
// Investigação — divergência Agendamentos, Agosto/2026 (rodada 3, planilha com 37 linhas)
// Reproduz EXATAMENTE a lógica de renderAgendadosOverview() (app/app.js) e cruza
// com a planilha atualizada da Muy (37 leads, por telefone normalizado). Somente leitura.

const SB_URL = 'https://yadxcbhginjvoemacdly.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZHhjYmhnaW5qdm9lbWFjZGx5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk2Nzk4MSwiZXhwIjoyMDkyNTQzOTgxfQ.Vp_JSA4ReP40a25L8GS7stNdROAy5YIIw-7HM98z_RY';
const MES = '2026-08';
const TODAY = '2026-09-15'; // data do relato de River

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
  ['Janaína Camargo Penteado Durante', '11983317223', 'Call realizada', true],
  ['Danielle Correia Moreira', '11958883324', 'Call realizada', true],
  ['Renata de Souza Nunes Silva', '19983476370', 'No show', false],
  ['Nélia Hora', '11976468448', 'Call realizada', true],
  ['Aline Cristina Ramos Moreira de Oliveira', '12988129987', 'Call realizada', false],
  ['Thalita Tavares', '22992255539', 'Call realizada', false],
  ['Jussiara Rodrigues Mamédio', '11968741473', 'Call realizada', false],
  ['Cris Maria', '43996287217', 'Call realizada', false],
  ['Thays Zanon Casagrande', '27992727864', 'Call realizada', true],
  ['Priscila de Souza (Priscila Faria dos Reis)', '33998620781', 'Call realizada', true],
  ['Cristina Moraes', '67991904544', 'Call realizada', false],
  ['Bibiana Schwarz', '49988443808', 'Call realizada', false],
  ['Paula Nunes', '66984499561', 'Call realizada', false],
  ['Ana Kátia de Souza', '51996919200', 'Call realizada', false],
  ['Samanta Edwirges', '11985824856', 'No show', false],
  ['Liana Veras', '11940033619', 'No show', false],
  ['Solange da Silva Sondag', '64999475502', 'Call realizada', false],
  ['Roberta Dantas', '84994596797', 'No show', false],
  ['Georgeane Freire', '82981811313', 'Call realizada', false],
  ['Kathleen Waikamp', '51981856061', 'No show', false],
  ['Rayanne Serigussi', '17996006334', 'Call realizada', false],
  ['Sueli Jacondino de Oliveira', '11985801111', 'Call realizada', false],
  ['Luana Foschiera Camboin Busata', '45999794300', 'Call realizada', false],
  ['Karen Ribeiro Rodrigues', '88996175831', 'Call realizada', false],
  ['Meyre Martins Rodrigues', '33984257398', 'Call realizada', false],
  ['Myrley Soldera', '11981666155', 'Call realizada', true],
  ['Luana Moura', '15991243221', 'No show', false],
  ['Érica Rambalde Purcino', '21970458411', 'Call realizada', false],
  ['Claudeth Castro', '98988481547', 'No show', false],
  ['Daniele Meira do Nascimento', '24988169061', 'No show', false],
  ['Cristiane Bernuci', '19989771070', 'No show', false],
  ['Arluma Gleice Coelho Peixoto', '62991782580', 'Call realizada', true],
  ['Rosicleide Fernandes de Barros', '87999697777', 'Call realizada', false],
  ['Carlos Alberto Pereira', '19997666778', 'No show', false],
  ['Gláucia Vieira', '11930447085', 'Call realizada', false],
  ['Rogério Ferreira Quintão', '11973122996', 'Call realizada', true],
  ['Maria Angela Bonifácio', '84999526352', 'Call realizada', false],
].map(([nome, tel, statusPlanilha, venda]) => ({ nome, tel: normPhone(tel), statusPlanilha, venda }));

async function main() {
  const FIELDS = 'id,nome,celular,status,status_closer,kanban_column,dataagendamento,horaagendamento,realizadaem,closer,venda_ganha_dados,criadoem,atualizadoem';
  const allLeads = await fetchAll('leads?', FIELDS);
  console.log(`Total de leads no banco: ${allLeads.length}`);
  console.log(`Planilha: ${PLANILHA.length} linhas | marcadas "Venda": ${PLANILHA.filter(p => p.venda).length}\n`);

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

  // ── Índice por telefone ──
  const byPhone = new Map();
  for (const l of allLeads) {
    const ph = normPhone(l.celular);
    if (!ph) continue;
    if (!byPhone.has(ph)) byPhone.set(ph, []);
    byPhone.get(ph).push(l);
  }

  console.log('=== 1) AUSENTES — planilha sem lead correspondente no banco (por telefone) ===');
  const ausentes = [];
  for (const p of PLANILHA) {
    const matches = byPhone.get(p.tel) || [];
    if (!matches.length) { ausentes.push(p); console.log(`  [SEM LEAD] ${p.nome} | ${p.tel} | planilha: ${p.statusPlanilha}${p.venda ? ' (Venda)' : ''}`); }
  }
  if (!ausentes.length) console.log('  (nenhum)');
  console.log();

  console.log('=== 2) DIVERGÊNCIAS — status planilha x status calculado no sistema ===');
  let divergencias = 0;
  for (const p of PLANILHA) {
    const matches = byPhone.get(p.tel) || [];
    if (!matches.length) continue; // já reportado em (1)
    matches.forEach(l => {
      const inAgosto = (l.dataagendamento || '').startsWith(MES);
      const realizadaSistema = leadCallRealizada(l);
      const noShowSistema = l.status === 'noshow';
      const vendaSistema = l.kanban_column === 'venda_ganha' && l.venda_ganha_dados?.status !== 'cancelada';

      const esperaRealizada = p.statusPlanilha === 'Call realizada';
      const esperaNoShow = p.statusPlanilha === 'No show';

      const problemas = [];
      if (!inAgosto) problemas.push(`dataagendamento fora de agosto (${l.dataagendamento || '—'})`);
      if (esperaRealizada && !realizadaSistema) problemas.push('planilha=Call realizada mas sistema NÃO marca realizada');
      if (esperaNoShow && !noShowSistema) problemas.push('planilha=No show mas sistema NÃO está com status noshow');
      if (esperaNoShow && realizadaSistema) problemas.push('planilha=No show mas sistema marca realizada');
      if (p.venda && !vendaSistema) problemas.push('planilha=Venda mas sistema NÃO está em kanban_column=venda_ganha (não-cancelada)');
      if (!p.venda && vendaSistema) problemas.push('sistema está em venda_ganha mas planilha NÃO marca Venda');

      if (problemas.length) {
        divergencias++;
        console.log(`  [DIVERGE] ${p.nome} | ${p.tel}`);
        console.log(`      planilha: ${p.statusPlanilha}${p.venda ? ' (Venda)' : ''}`);
        console.log(`      sistema : nome="${l.nome}" status=${l.status} status_closer=${l.status_closer||'—'} kanban_column=${l.kanban_column||'—'} dataagendamento=${l.dataagendamento||'—'} realizadaem=${l.realizadaem||'—'} venda_ganha_dados=${JSON.stringify(l.venda_ganha_dados||null)}`);
        console.log(`      problema(s): ${problemas.join(' | ')}`);
      }
    });
  }
  console.log(`\n  Total de divergências: ${divergencias}`);
  console.log();

  console.log('=== 3) EXTRAS — leads no sistema com dataagendamento em agosto, FORA da planilha ===');
  const planilhaSet = new Set(PLANILHA.map(p => p.tel));
  const extras = leadsDoMes.filter(l => !planilhaSet.has(normPhone(l.celular)));
  console.log(`  Total: ${extras.length}`);
  extras.forEach(l => {
    console.log(`  ${l.nome} | tel:${l.celular} | status:${l.status} | status_closer:${l.status_closer||'—'} | kanban_column:${l.kanban_column||'—'} | dataagendamento:${l.dataagendamento} | realizadaem:${l.realizadaem || '—'}`);
  });
  console.log();

  console.log('=== 4) VENDAS — planilha (marcadas "Venda") x sistema (venda_ganha em agosto) ===');
  console.log(`  Planilha marca "Venda": ${PLANILHA.filter(p => p.venda).length}`);
  PLANILHA.filter(p => p.venda).forEach(p => {
    const matches = byPhone.get(p.tel) || [];
    matches.forEach(l => {
      const vg = l.kanban_column === 'venda_ganha' && l.venda_ganha_dados?.status !== 'cancelada';
      console.log(`    ${p.nome} | ${p.tel} | kanban_column=${l.kanban_column||'—'} | venda_ganha_dados=${JSON.stringify(l.venda_ganha_dados||null)} | contaComoVenda=${vg}`);
    });
    if (!matches.length) console.log(`    ${p.nome} | ${p.tel} | SEM LEAD NO BANCO`);
  });
  console.log(`\n  Sistema — nVendas (kanban_column=venda_ganha, não cancelada, data_venda em agosto): ${nVendas}`);
  console.log('  Detalhe:');
  const vendasAgo = allLeads.filter(l => l.kanban_column === 'venda_ganha'
    && l.venda_ganha_dados?.status !== 'cancelada'
    && (l.venda_ganha_dados?.data_venda || '').startsWith(MES));
  vendasAgo.forEach(l => {
    const ph = normPhone(l.celular);
    const naPlanilha = PLANILHA.find(p => p.tel === ph);
    console.log(`    ${l.nome} | tel:${l.celular} | data_venda:${l.venda_ganha_dados?.data_venda} | dataagendamento:${l.dataagendamento} | ${naPlanilha ? `NA PLANILHA (venda=${naPlanilha.venda})` : 'FORA DA PLANILHA'}`);
  });
}

main().catch(e => { console.error('Erro fatal: ' + e.message); process.exit(1); });
