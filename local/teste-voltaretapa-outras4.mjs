#!/usr/bin/env node
// Testa as outras 4 transições de VOLTAR_ETAPA, cada uma com um lead de teste
// descartável (criado, verificado, apagado). Mesmo método do teste da Etapa 2.

const SB_URL = 'https://yadxcbhginjvoemacdly.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZHhjYmhnaW5qdm9lbWFjZGx5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk2Nzk4MSwiZXhwIjoyMDkyNTQzOTgxfQ.Vp_JSA4ReP40a25L8GS7stNdROAy5YIIw-7HM98z_RY';

async function sb(method, path, body) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} — ${await res.text()}`);
  const txt = await res.text();
  return txt ? JSON.parse(txt) : null;
}

// Espelha getLeadKanbanCol() de app/app.js
function getLeadKanbanCol(lead) {
  const col = lead.kanban_column;
  if (col === 'fechamento')    return 'negociacao';
  if (col === 'followup')      return 'decisao';
  if (col === 'venda_perdida') return 'descartado';
  if (col) return col;
  if (lead.status === 'agendado') return 'agendado';
  if (lead.status === 'noshow' || lead.status === 'cancelado') return 'descartado';
  if (lead.status === 'realizada') {
    const sc = lead.status_closer;
    if (sc === 'followup')      return 'decisao';
    if (sc === 'fechamento')    return 'negociacao';
    if (sc === 'venda_ganha')   return 'venda_ganha';
    if (sc === 'venda_perdida') return 'descartado';
    return 'call_realizada';
  }
  return 'agendado';
}

const leadCallRealizada = l => !!l.realizadaem || l.status_closer === 'call_realizada'
  || ['realizada', 'venda_ganha'].includes(l.status) || l.kanban_column === 'venda_ganha';

const CASOS = [
  {
    nome: 'decisao_negociacao',
    antes: { status: 'realizada', status_closer: 'followup', kanban_column: 'decisao', realizadaem: new Date('2026-08-15T12:00:00Z').toISOString() },
    payload: { status_closer: 'fechamento', kanban_column: 'fechamento' },
    destino: 'negociacao', label: 'Negociação',
    checar: (depois) => ({
      'coluna visual vira Negociação (getLeadKanbanCol)': getLeadKanbanCol(depois) === 'negociacao',
      'continua contando como Realizada (não deveria mudar)': leadCallRealizada(depois) === true,
    }),
  },
  {
    nome: 'negociacao_realizada',
    antes: { status: 'realizada', status_closer: 'fechamento', kanban_column: 'fechamento', realizadaem: new Date('2026-08-15T12:00:00Z').toISOString() },
    payload: { status_closer: 'call_realizada', kanban_column: 'call_realizada' },
    destino: 'call_realizada', label: 'Call Realizada',
    checar: (depois) => ({
      'coluna visual vira Call Realizada (getLeadKanbanCol)': getLeadKanbanCol(depois) === 'call_realizada',
      'continua contando como Realizada (não deveria mudar)': leadCallRealizada(depois) === true,
    }),
  },
  {
    nome: 'agendado_qualificado',
    antes: { status: 'agendado', dataagendamento: '2026-08-20', horaagendamento: '10:00:00', closer: 'fernanda', agendadopor: 'Fernanda' },
    payload: { status: 'qualificado', dataagendamento: null, horaagendamento: null, closer: null, agendadopor: null },
    destino: 'qualificado', label: 'Qualificado',
    checar: (depois) => ({
      'sai do funil de Agendamentos (dataagendamento null)': depois.dataagendamento === null,
      'sai do Kanban (sem kanban_column, status fora da lista)': !depois.kanban_column && !['agendado','cancelado','realizada'].includes(depois.status),
      'status vira qualificado': depois.status === 'qualificado',
    }),
  },
  {
    nome: 'qualificado_aguardando',
    antes: { status: 'qualificado' },
    payload: { status: 'aguardando' },
    destino: 'aguardando', label: 'Aguardando',
    checar: (depois) => ({
      'status vira aguardando': depois.status === 'aguardando',
    }),
  },
];

async function testarCaso(c) {
  console.log(`\n────────────────────────────────────────`);
  console.log(`CASO: ${c.nome}`);
  const [lead] = await sb('POST', 'leads', { nome: `TESTE-voltaretapa-${c.nome} (apagar)`, celular: '00000000000', ...c.antes });
  console.log('  id:', lead.id);
  const [depois] = await sb('PATCH', `leads?id=eq.${lead.id}`, { ...c.payload, atualizadoem: new Date().toISOString() });

  const checks = c.checar(depois);
  let ok = true;
  for (const [desc, passou] of Object.entries(checks)) {
    console.log(`  ${passou ? '✓' : '✗'} ${desc}`);
    if (!passou) ok = false;
  }

  // Histórico
  let histOk = true;
  try {
    await sb('POST', 'lead_historico', {
      lead_id: lead.id, col: c.destino, col_label: `↩ Voltou para ${c.label}`,
      movido_por: 'teste-automatizado@script', movido_em: new Date().toISOString(),
    });
    console.log('  ✓ lead_historico aceitou o registro');
  } catch (e) {
    histOk = false;
    console.log('  ✗ lead_historico REJEITOU:', e.message);
  }

  await sb('DELETE', `lead_historico?lead_id=eq.${lead.id}`);
  await sb('DELETE', `leads?id=eq.${lead.id}`);
  console.log('  (lead + histórico de teste removidos)');

  return ok && histOk;
}

async function main() {
  const resultados = [];
  for (const c of CASOS) resultados.push([c.nome, await testarCaso(c)]);
  console.log(`\n════════════════════════════════════════`);
  console.log('RESUMO:');
  resultados.forEach(([nome, ok]) => console.log(`  ${ok ? 'PASSOU' : 'FALHOU'} — ${nome}`));
  const todasOk = resultados.every(([,ok]) => ok);
  console.log(`\n${todasOk ? 'TODAS PASSARAM' : 'HÁ FALHAS — revisar acima'}`);
}

main().catch(e => { console.error('Erro fatal:', e.message); process.exit(1); });
