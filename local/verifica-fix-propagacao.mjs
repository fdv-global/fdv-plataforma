#!/usr/bin/env node
// Verifica os 5 pontos adicionais onde leadCallRealizada() foi propagado:
// Início (funil), Relatórios (funil + closer/resp + mês a mês), Closer/PDF, drill-down Relatórios.
// Compara ANTES x DEPOIS e confirma que vendas/taxaConv não mudam. Somente leitura.

const SB_URL = 'https://yadxcbhginjvoemacdly.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZHhjYmhnaW5qdm9lbWFjZGx5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk2Nzk4MSwiZXhwIjoyMDkyNTQzOTgxfQ.Vp_JSA4ReP40a25L8GS7stNdROAy5YIIw-7HM98z_RY';

function pct(a, b) { return b ? Math.round(a / b * 100) : 0; }
function parseValor(v) { return parseFloat(String(v||'').replace(/[^\d,.-]/g,'').replace(',','.')) || 0; }

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

const FIELDS = 'id,nome,celular,status,status_closer,kanban_column,kanban_column_since,dataagendamento,datachegada,realizadaem,closer,agendadopor,venda_ganha_dados';
const allLeads = await fetchAll('leads?', FIELDS);

const oldReal = l => ['realizada', 'venda_ganha'].includes(l.status) || l.kanban_column === 'venda_ganha';
const leadCallRealizada = l => !!l.realizadaem || l.status_closer === 'call_realizada' || oldReal(l);

const AGO = '2026-08', JUN = '2026-06';
const CASOS = [
  'Cristina Moraes','Bibiana Schwarz','Thalita Tavares','Cris Maria','Aline Cristina Ramos Moreira de Oliveira',
];

console.log('════════════════════════════════════════════════════');
console.log('1) INÍCIO — funil (fCalls = agendMes.filter(...).length)');
console.log('════════════════════════════════════════════════════');
for (const MES of [AGO, JUN]) {
  const agendMes = allLeads.filter(l => (l.dataagendamento||'').startsWith(MES));
  const fCallsOld = agendMes.filter(oldReal).length;
  const fCallsNew = agendMes.filter(leadCallRealizada).length;
  const fVendasOld = allLeads.filter(l => l.kanban_column==='venda_ganha').length; // isVendaMes é outro filtro, não mexido
  console.log(`  ${MES}: fCalls antes=${fCallsOld}  depois=${fCallsNew}  (delta +${fCallsNew-fCallsOld})`);
}

console.log('\n════════════════════════════════════════════════════');
console.log('2) RELATÓRIOS — funil, taxaComp/taxaConv, closer/resp, mês a mês');
console.log('════════════════════════════════════════════════════');
for (const MES of [AGO, JUN]) {
  const callsBase = allLeads.filter(l => l.dataagendamento && l.dataagendamento.startsWith(MES));
  const agendados = callsBase;
  const realizadasOld = callsBase.filter(oldReal);
  const realizadasNew = callsBase.filter(leadCallRealizada);
  const vendasBase = allLeads.filter(l => (l.realizadaem||l.kanban_column_since||l.datachegada||'').startsWith(MES));
  const vendas = vendasBase.filter(l => l.kanban_column === 'venda_ganha' && l.venda_ganha_dados?.status !== 'cancelada');
  const taxaCompOld = pct(realizadasOld.length, agendados.length);
  const taxaCompNew = pct(realizadasNew.length, agendados.length);
  const taxaConvOld = pct(vendas.length, realizadasOld.length);
  const taxaConvNew = pct(vendas.length, realizadasNew.length);
  console.log(`  ${MES}: realizadas antes=${realizadasOld.length} depois=${realizadasNew.length} | vendas=${vendas.length} (não muda)`);
  console.log(`         taxaComp antes=${taxaCompOld}% depois=${taxaCompNew}%`);
  console.log(`         taxaConv antes=${taxaConvOld}% depois=${taxaConvNew}%  ${taxaConvOld!==taxaConvNew ? '<-- MUDOU (esperado, denominador maior, mesma vendas)' : ''}`);
}
console.log('  Nota: taxaConv muda de valor porque o denominador (realizadas) aumenta — vendas.length em si NÃO muda (verificado acima). Isso é esperado: mais gente "compareceu" no denominador dilui a taxa, mas nenhuma venda nova é contada nem perdida.');

console.log('\n════════════════════════════════════════════════════');
console.log('3) CLOSER / PDF — realizadas, taxaComp/taxaConv, closerRows');
console.log('════════════════════════════════════════════════════');
{
  const base = allLeads; // sem filtro de mês nesta checagem (visão geral)
  const vendas = base.filter(l => l.kanban_column === 'venda_ganha');
  const agendados = base.filter(l => l.dataagendamento);
  const realizadasOld = base.filter(oldReal);
  const realizadasNew = base.filter(leadCallRealizada);
  console.log(`  Geral: realizadas antes=${realizadasOld.length} depois=${realizadasNew.length} | vendas=${vendas.length} (não muda)`);

  const closerRowsFor = (realizadasArr) => {
    const m = {};
    realizadasArr.forEach(l => {
      const k = l.closer||'_sem'; if(!m[k]) m[k]={ag:0,re:0,ve:0,val:0};
      m[k].re++; if(l.kanban_column==='venda_ganha'){m[k].ve++;m[k].val+=parseValor(l.venda_ganha_dados?.valor);}
    });
    agendados.forEach(l => { const k=l.closer||'_sem'; if(!m[k]) m[k]={ag:0,re:0,ve:0,val:0}; m[k].ag++; });
    return m;
  };
  const before = closerRowsFor(realizadasOld);
  const after  = closerRowsFor(realizadasNew);
  console.log('  closerRows (re= realizadas, ve= vendas) — antes vs depois:');
  for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const b = before[k]||{re:0,ve:0}, a = after[k]||{re:0,ve:0};
    if (b.re !== a.re || b.ve !== a.ve) console.log(`    ${k}: re ${b.re}→${a.re} | ve ${b.ve}→${a.ve} (ve não deve mudar)`);
  }
}

console.log('\n════════════════════════════════════════════════════');
console.log('4) DRILL-DOWN "realizadas" (Relatórios) — lista completa aparece?');
console.log('════════════════════════════════════════════════════');
{
  const base = allLeads; // sem filtro de mês
  const listaNova = base.filter(leadCallRealizada);
  const encontrados = CASOS.filter(nome => listaNova.some(l => l.nome === nome));
  console.log(`  Os 5 casos de agosto aparecem no drill-down "realizadas"? ${encontrados.length}/5`);
  encontrados.forEach(n => console.log(`    ✓ ${n}`));

  const junhoCasos = base.filter(l => (l.dataagendamento||'').startsWith(JUN) && !oldReal(l) && leadCallRealizada(l));
  console.log(`\n  Os 4 casos de junho (mesmo padrão) agora aparecem no drill-down "realizadas"?`);
  junhoCasos.forEach(l => console.log(`    ✓ ${l.nome} | status:${l.status} | status_closer:${l.status_closer} | realizadaem:${l.realizadaem}`));
  console.log(`  Total junho: ${junhoCasos.length}`);
}
