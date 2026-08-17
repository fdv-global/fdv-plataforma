#!/usr/bin/env node
// Testa isoladamente a transição mais arriscada: Call Realizada -> Agendamentos.
// Cria um lead de TESTE descartável, aplica o payload exato de VOLTAR_ETAPA.realizada_agendado,
// confirma leadCallRealizada()===false e o encaixe correto nas telas, depois apaga o lead de teste.

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

const leadCallRealizada = l => !!l.realizadaem || l.status_closer === 'call_realizada'
  || ['realizada', 'venda_ganha'].includes(l.status) || l.kanban_column === 'venda_ganha';

async function main() {
  console.log('1) Criando lead de teste em estado "Call Realizada"...');
  const [lead] = await sb('POST', 'leads', {
    nome: 'TESTE-voltaretapa (apagar)', celular: '00000000000',
    status: 'realizada', status_closer: 'call_realizada', kanban_column: 'call_realizada',
    dataagendamento: '2026-08-20', horaagendamento: '10:00:00', closer: 'fernanda',
    realizadaem: new Date('2026-08-20T13:00:00Z').toISOString(),
  });
  console.log('   id:', lead.id);
  console.log('   ANTES:', { status: lead.status, kanban_column: lead.kanban_column, status_closer: lead.status_closer, realizadaem: lead.realizadaem });
  console.log('   leadCallRealizada(antes) =', leadCallRealizada(lead), '(esperado: true)');

  console.log('\n2) Aplicando payload de VOLTAR_ETAPA.realizada_agendado...');
  const payload = { status: 'agendado', kanban_column: null, status_closer: null, realizadaem: null, atualizadoem: new Date().toISOString() };
  const [depois] = await sb('PATCH', `leads?id=eq.${lead.id}`, payload);
  console.log('   DEPOIS:', { status: depois.status, kanban_column: depois.kanban_column, status_closer: depois.status_closer, realizadaem: depois.realizadaem });
  console.log('   dataagendamento preservada?', depois.dataagendamento === '2026-08-20', '| horaagendamento preservada?', depois.horaagendamento === '10:00:00', '| closer preservado?', depois.closer === 'fernanda');

  const ok1 = leadCallRealizada(depois) === false;
  console.log('   leadCallRealizada(depois) =', leadCallRealizada(depois), ok1 ? '✓ (esperado: false)' : '✗ FALHOU — ainda conta como Realizada!');

  const ehAgendadoTab   = depois.status === 'agendado';
  const ehProximaAgend  = depois.status === 'agendado' && (depois.dataagendamento||'') >= '2026-08-17';
  console.log('   Aparece na aba "Agendados" de Agendamentos (status===agendado)?', ehAgendadoTab, ehAgendadoTab ? '✓' : '✗');
  console.log('   Não aparece mais em "Realizadas"?', !leadCallRealizada(depois), !leadCallRealizada(depois) ? '✓' : '✗');

  console.log('\n3) Testando insert em lead_historico com valor fora do enum de kanban_column ("agendado" como destino de voltar)...');
  const histRow = await sb('POST', 'lead_historico', {
    lead_id: lead.id, col: 'agendado', col_label: '↩ Voltou para Agendado',
    movido_por: 'teste-automatizado@script', movido_em: new Date().toISOString(),
  });
  console.log('   Insert aceito sem erro de schema?', Array.isArray(histRow) ? '✓' : '✗', JSON.stringify(histRow));

  console.log('\n4) Limpando lead de teste...');
  await sb('DELETE', `leads?id=eq.${lead.id}`);
  await sb('DELETE', `lead_historico?lead_id=eq.${lead.id}`);
  console.log('   Lead e histórico de teste removidos.');

  console.log('\n=== RESULTADO ===', ok1 && ehAgendadoTab ? 'PASSOU' : 'FALHOU');
}

main().catch(e => { console.error('Erro fatal:', e.message); process.exit(1); });
