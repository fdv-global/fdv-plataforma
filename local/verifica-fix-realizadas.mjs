#!/usr/bin/env node
// Verifica o efeito do fix de leadCallRealizada() no card Agendamentos, Agosto/2026.
const SB_URL = 'https://yadxcbhginjvoemacdly.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZHhjYmhnaW5qdm9lbWFjZGx5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk2Nzk4MSwiZXhwIjoyMDkyNTQzOTgxfQ.Vp_JSA4ReP40a25L8GS7stNdROAy5YIIw-7HM98z_RY';
const MES = '2026-08';
const TODAY = '2026-08-17';

async function fetchAll(path, fields) {
  let all = [], offset = 0;
  while (true) {
    const res = await fetch(`${SB_URL}/rest/v1/${path}&select=${fields}&limit=1000&offset=${offset}`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
    const page = await res.json();
    if (!page.length) break;
    all.push(...page);
    offset += 1000;
    if (page.length < 1000) break;
  }
  return all;
}

const FIELDS = 'id,nome,celular,status,status_closer,kanban_column,dataagendamento,realizadaem';
const allLeads = await fetchAll('leads?', FIELDS);
const leadsDoMes = allLeads.filter(l => (l.dataagendamento || '').startsWith(MES));

// Nova lógica (leadCallRealizada), espelhando app/app.js
const leadCallRealizada = l => !!l.realizadaem || l.status_closer === 'call_realizada'
  || ['realizada', 'venda_ganha'].includes(l.status) || l.kanban_column === 'venda_ganha';

const nAgendados  = leadsDoMes.length;
const nRealizadas = leadsDoMes.filter(leadCallRealizada).length;
const nNoShow     = leadsDoMes.filter(l => l.status === 'noshow').length;
const nProximas   = leadsDoMes.filter(l => l.status === 'agendado' && (l.dataagendamento || '') >= TODAY).length;
const outros      = leadsDoMes.filter(l => !leadCallRealizada(l) && l.status !== 'noshow' && !(l.status === 'agendado' && (l.dataagendamento||'') >= TODAY));

console.log('=== DEPOIS DO FIX — Agendamentos, agosto/2026 ===');
console.log({ nAgendados, nRealizadas, nNoShow, nProximas, restantes_sem_categoria: outros.length });
console.log(`Checagem de soma: ${nRealizadas}+${nNoShow}+${nProximas}+${outros.length} = ${nRealizadas+nNoShow+nProximas+outros.length} (esperado ${nAgendados})`);

console.log('\n=== Os 5 casos, confirmando que agora entram em Realizadas ===');
const nomes5 = ['Cristina Moraes','Bibiana Schwarz','Thalita Tavares','Cris Maria','Aline Cristina Ramos Moreira de Oliveira'];
leadsDoMes.filter(l => nomes5.includes(l.nome)).forEach(l => {
  console.log(`  ${l.nome} | status:${l.status} | status_closer:${l.status_closer} | realizadaem:${l.realizadaem||'—'} | conta como Realizada agora? ${leadCallRealizada(l)}`);
});

if (outros.length) {
  console.log('\n=== Ainda restam fora de qualquer categoria (investigar) ===');
  outros.forEach(l => console.log(`  ${l.nome} | tel:${l.celular} | status:${l.status} | dataagendamento:${l.dataagendamento}`));
}
