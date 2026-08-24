#!/usr/bin/env node
// Correções confirmadas por Muy — Agendamentos, Agosto/2026
// 1) Roberta Dantas      -> No Show, dataagendamento=2026-08-18
// 2) Rayanne Serigussi   -> agendado -> realizada (Call Realizada)
// 3) Meyre Martins Rodrigues -> dataagendamento 2026-08-14 -> 2026-08-24
// Rigor: PATCH por id exato, captura ANTES/DEPOIS, confirma nome+celular antes de tocar.
// Somente estes 3 registros são escritos. Tudo o mais é leitura.

const SB_URL = 'https://yadxcbhginjvoemacdly.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZHhjYmhnaW5qdm9lbWFjZGx5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk2Nzk4MSwiZXhwIjoyMDkyNTQzOTgxfQ.Vp_JSA4ReP40a25L8GS7stNdROAy5YIIw-7HM98z_RY';
const MES = '2026-08';
const TODAY = '2026-08-24';
const MOVIDO_POR = 'Dex (correção manual — investigação divergência Agendamentos ago/2026, confirmada por Muy)';

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

async function fetchAll(path, fields) {
  let all = [], offset = 0;
  while (true) {
    const page = await sb('GET', `${path}&select=${fields}&limit=1000&offset=${offset}`);
    if (!page.length) break;
    all.push(...page);
    offset += 1000;
    if (page.length < 1000) break;
  }
  return all;
}

const FIELDS = 'id,nome,celular,status,status_closer,kanban_column,dataagendamento,horaagendamento,realizadaem,closer,venda_ganha_dados,criadoem,atualizadoem';

const CORRECOES = [
  {
    id: '9ad2f52a-48d7-4e5d-bbf2-b661849b399e',
    nomeEsperado: 'Roberta', celularEsperado: '5584994596797',
    payload: { status: 'noshow', dataagendamento: '2026-08-18' },
    historico: { col: 'noshow', col_label: 'No Show (correção manual)' },
  },
  {
    id: '54e0a01b-8042-4382-aeac-d0cc54738880',
    nomeEsperado: 'Rayanne Serigussi', celularEsperado: '17996006334',
    payload: { status: 'realizada', status_closer: 'call_realizada', kanban_column: 'call_realizada', realizadaem: new Date().toISOString() },
    historico: { col: 'call_realizada', col_label: 'Call Realizada (correção manual)' },
  },
  {
    id: 'd9109d42-b2bb-4877-a0ac-bf6a91872458',
    nomeEsperado: 'Meyre Martins Rodrigues', celularEsperado: '55 33984257398',
    payload: { dataagendamento: '2026-08-24' },
    historico: null, // só ajuste de data, não é movimento de etapa
  },
];

async function main() {
  console.log('=== PASSO 1 — Capturar estado ANTES e validar identidade ===\n');
  const antes = {};
  for (const c of CORRECOES) {
    const [row] = await sb('GET', `leads?id=eq.${c.id}&select=${FIELDS}`);
    if (!row) throw new Error(`Lead ${c.id} não encontrado — abortando sem tocar em nada.`);
    if (row.nome !== c.nomeEsperado || row.celular !== c.celularEsperado) {
      throw new Error(`Lead ${c.id} não confere: esperado nome="${c.nomeEsperado}" celular="${c.celularEsperado}", encontrado nome="${row.nome}" celular="${row.celular}". Abortando.`);
    }
    antes[c.id] = row;
    console.log(`[OK] ${row.nome} (${row.id})`);
    console.log(`     ANTES: status=${row.status} status_closer=${row.status_closer||'—'} kanban_column=${row.kanban_column||'—'} dataagendamento=${row.dataagendamento||'—'} realizadaem=${row.realizadaem||'—'}`);
  }

  console.log('\n=== PASSO 2 — Aplicar UPDATEs (1 por vez, PATCH por id exato) ===\n');
  const depois = {};
  for (const c of CORRECOES) {
    const payload = { ...c.payload, atualizadoem: new Date().toISOString() };
    const [row] = await sb('PATCH', `leads?id=eq.${c.id}`, payload);
    depois[c.id] = row;
    console.log(`[UPDATE] ${row.nome} (${row.id})`);
    console.log(`     payload enviado: ${JSON.stringify(c.payload)}`);
    console.log(`     DEPOIS: status=${row.status} status_closer=${row.status_closer||'—'} kanban_column=${row.kanban_column||'—'} dataagendamento=${row.dataagendamento||'—'} realizadaem=${row.realizadaem||'—'}`);

    if (c.historico) {
      const hist = await sb('POST', 'lead_historico', {
        lead_id: c.id, col: c.historico.col, col_label: c.historico.col_label,
        movido_por: MOVIDO_POR, movido_em: new Date().toISOString(),
      });
      console.log(`     lead_historico registrado: ${JSON.stringify(hist)}`);
    }
    console.log();
  }

  console.log('=== PASSO 3 — Diff ANTES x DEPOIS (confirmação) ===\n');
  for (const c of CORRECOES) {
    const a = antes[c.id], d = depois[c.id];
    const campos = new Set([...Object.keys(c.payload)]);
    console.log(`${d.nome}:`);
    campos.forEach(k => console.log(`   ${k}: ${JSON.stringify(a[k])} -> ${JSON.stringify(d[k])}`));
  }

  console.log('\n=== PASSO 4 — Recalcular dashboard de Agosto/2026 (fresh fetch, formula de renderAgendadosOverview) ===\n');
  const allLeads = await fetchAll('leads?', FIELDS);
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

  console.log('DASHBOARD RECALCULADO:', { nAgendados, nRealizadas, nNoShow, nProximas, nVendas });

  console.log('\n--- Detalhe nNoShow ---');
  leadsDoMes.filter(l => l.status === 'noshow').forEach(l => console.log(`  ${l.nome} | ${l.celular} | dataagendamento:${l.dataagendamento}`));

  console.log('\n--- Detalhe nProximas ---');
  leadsDoMes.filter(l => l.status === 'agendado' && (l.dataagendamento || '') >= TODAY).forEach(l => console.log(`  ${l.nome} | ${l.celular} | dataagendamento:${l.dataagendamento}`));

  console.log('\n--- Leads ainda em "limbo" (nem realizada/venda, nem noshow, nem próxima) ---');
  const limbo = leadsDoMes.filter(l => !leadCallRealizada(l) && l.status !== 'noshow'
    && !(l.status === 'agendado' && (l.dataagendamento || '') >= TODAY));
  console.log(limbo.length ? limbo.map(l => `  ${l.nome} | status:${l.status} | dataagendamento:${l.dataagendamento}`).join('\n') : '  (nenhum)');

  console.log('\n--- Detalhe nVendas (reconfirmação pós-fix) ---');
  const vendasAgo = allLeads.filter(l => l.kanban_column === 'venda_ganha'
    && l.venda_ganha_dados?.status !== 'cancelada'
    && (l.venda_ganha_dados?.data_venda || '').startsWith(MES));
  vendasAgo.forEach(l => console.log(`  ${l.nome} | tel:${l.celular} | data_venda:${l.venda_ganha_dados?.data_venda} | dataagendamento:${l.dataagendamento} | atualizadoem:${l.atualizadoem}`));
}

main().catch(e => { console.error('Erro fatal — nenhum UPDATE adicional será tentado: ' + e.message); process.exit(1); });
