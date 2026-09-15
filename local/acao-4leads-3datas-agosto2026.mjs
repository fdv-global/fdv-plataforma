#!/usr/bin/env node
// Ações confirmadas por Muy — Agendamentos, Agosto/2026
// 1) Criar 4 leads ausentes (Rosicleide, Carlos Alberto, Gláucia, Maria Angela)
// 2) Corrigir data_venda de 3 vendas lançadas hoje com data errada (Myrley, Arluma, Rogério)
// Rigor: valida ausência antes de criar; valida identidade (id+nome+celular) antes de corrigir;
// captura ANTES/DEPOIS; registra lead_historico onde há mudança de etapa; recalcula dashboard no final.

const SB_URL = 'https://yadxcbhginjvoemacdly.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZHhjYmhnaW5qdm9lbWFjZGx5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk2Nzk4MSwiZXhwIjoyMDkyNTQzOTgxfQ.Vp_JSA4ReP40a25L8GS7stNdROAy5YIIw-7HM98z_RY';
const MES = '2026-08';
const TODAY = '2026-09-15';

async function sb(method, path, body) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=representation',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
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

function normPhone(p) {
  let d = String(p || '').replace(/\D/g, '').trim();
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
  return d;
}

const NOVOS_LEADS = [
  {
    nome: 'Rosicleide Fernandes de Barros', celular: '87999697777',
    profissao: 'Funcionária Pública', renda: 'De R$ 2.000,00 a R$ 4.000,00',
    dataagendamento: '2026-08-27', tipo: 'realizada',
  },
  {
    nome: 'Carlos Alberto Pereira', celular: '19997666778',
    profissao: 'CLT', renda: 'De R$ 8.000,00 a R$ 10.000,00',
    dataagendamento: '2026-08-27', tipo: 'noshow',
  },
  {
    nome: 'Gláucia Vieira', celular: '11930447085',
    profissao: 'Autonoma', renda: 'De R$ 2.000,00 a R$ 4.000,00',
    dataagendamento: '2026-08-31', tipo: 'realizada',
  },
  {
    nome: 'Maria Angela Bonifácio', celular: '84999526352',
    profissao: 'CLT', renda: 'De R$ 2.000,00 a R$ 4.000,00',
    dataagendamento: '2026-08-28', tipo: 'realizada',
  },
];

const CORRECOES_DATA_VENDA = [
  { id: 'eeba5d07-2a1c-4dad-990f-20dba5e9a4d5', nomeEsperado: 'Myrley Soldera', celularEsperado: '55 11981666155', dataVendaCorreta: '2026-08-25' },
  { id: '876111ba-0f7b-43bd-b90d-6bc20e4c6d20', nomeEsperado: 'Arluma Gleice Coelho Peixoto', celularEsperado: '62 99178-2580', dataVendaCorreta: '2026-08-27' },
  { id: '441a6cd3-93da-4a21-b3ed-951c71c33b73', nomeEsperado: 'Rogério Ferreira Quintão', celularEsperado: '11 97312-2996', dataVendaCorreta: '2026-08-28' },
];

const FIELDS = 'id,nome,celular,status,status_closer,kanban_column,dataagendamento,horaagendamento,realizadaem,closer,venda_ganha_dados,criadoem,atualizadoem';

async function main() {
  console.log('=== PASSO 1 — Confirmar que os 4 telefones ainda NÃO existem no banco ===\n');
  const allAntes = await fetchAll('leads?', 'id,nome,celular');
  const phoneSetAntes = new Set(allAntes.map(l => normPhone(l.celular)));
  for (const n of NOVOS_LEADS) {
    if (phoneSetAntes.has(normPhone(n.celular))) {
      throw new Error(`Telefone ${n.celular} (${n.nome}) já existe no banco — abortando para não duplicar.`);
    }
    console.log(`[OK] ${n.nome} | ${n.celular} — ausente, seguro para criar`);
  }

  console.log('\n=== PASSO 2 — Criar os 4 leads ===\n');
  const criados = [];
  for (const n of NOVOS_LEADS) {
    const now = new Date().toISOString();
    const isRealizada = n.tipo === 'realizada';
    const payload = {
      nome: n.nome,
      celular: n.celular,
      email: null,
      instagram: null,
      profissao: n.profissao,
      origem: 'Webnário',
      renda: n.renda,
      datachegada: n.dataagendamento,
      status: isRealizada ? 'realizada' : 'noshow',
      kanban_column: isRealizada ? 'call_realizada' : null,
      kanban_column_since: isRealizada ? now : null,
      closer: 'jaqueline',
      agendadopor: 'Muyane Petters',
      dataagendamento: n.dataagendamento,
      horaagendamento: null,
      observacoes: '',
      status_closer: isRealizada ? 'call_realizada' : null,
      etiquetas: [],
      venda_ganha_dados: null,
      criadoem: now,
      atualizadoem: now,
      realizadaem: isRealizada ? now : null,
      status_followup: 'sem_contato',
      contato_count: 0,
      unread_count: 0,
      chat_pinned: false,
    };
    const [row] = await sb('POST', 'leads', payload);
    criados.push(row);
    console.log(`[CRIADO] ${row.nome} (${row.id})`);
    console.log(`     celular=${row.celular} | status=${row.status} | kanban_column=${row.kanban_column||'—'} | dataagendamento=${row.dataagendamento} | realizadaem=${row.realizadaem||'—'}`);

    const col = isRealizada ? 'call_realizada' : 'noshow';
    const colLabel = isRealizada ? 'Call Realizada (criação retroativa — investigação divergência Agendamentos ago/2026, confirmada por Muy)' : 'No Show (criação retroativa — investigação divergência Agendamentos ago/2026, confirmada por Muy)';
    const hist = await sb('POST', 'lead_historico', {
      lead_id: row.id, col, col_label: colLabel,
      movido_por: 'Dex (correção manual)', movido_em: now,
    });
    console.log(`     lead_historico registrado: ${JSON.stringify(hist)}\n`);
  }

  console.log('=== PASSO 3 — Corrigir data_venda de Myrley, Arluma e Rogério ===\n');
  const antesVenda = {};
  for (const c of CORRECOES_DATA_VENDA) {
    const [row] = await sb('GET', `leads?id=eq.${c.id}&select=${FIELDS}`);
    if (!row) throw new Error(`Lead ${c.id} não encontrado — abortando sem tocar em nada.`);
    if (row.nome !== c.nomeEsperado || row.celular !== c.celularEsperado) {
      throw new Error(`Lead ${c.id} não confere: esperado nome="${c.nomeEsperado}" celular="${c.celularEsperado}", encontrado nome="${row.nome}" celular="${row.celular}". Abortando.`);
    }
    antesVenda[c.id] = row;
    console.log(`[OK] ${row.nome} (${row.id})`);
    console.log(`     ANTES venda_ganha_dados: ${JSON.stringify(row.venda_ganha_dados)}`);
  }

  console.log('\n--- Aplicando PATCH (somente campo data_venda dentro do jsonb, preservando o resto) ---\n');
  const depoisVenda = {};
  for (const c of CORRECOES_DATA_VENDA) {
    const atual = antesVenda[c.id].venda_ganha_dados || {};
    const novoJson = { ...atual, data_venda: c.dataVendaCorreta };
    const [row] = await sb('PATCH', `leads?id=eq.${c.id}`, { venda_ganha_dados: novoJson, atualizadoem: new Date().toISOString() });
    depoisVenda[c.id] = row;
    console.log(`[UPDATE] ${row.nome} (${row.id})`);
    console.log(`     DEPOIS venda_ganha_dados: ${JSON.stringify(row.venda_ganha_dados)}\n`);
  }

  console.log('=== PASSO 4 — Diff ANTES x DEPOIS (data_venda) ===\n');
  for (const c of CORRECOES_DATA_VENDA) {
    const a = antesVenda[c.id], d = depoisVenda[c.id];
    console.log(`${d.nome}: data_venda ${a.venda_ganha_dados?.data_venda} -> ${d.venda_ganha_dados?.data_venda}`);
  }

  console.log('\n=== PASSO 5 — Recalcular dashboard de Agosto/2026 (fresh fetch) ===\n');
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

  console.log('\n--- Detalhe nVendas (pós-correção) ---');
  const vendasAgo = allLeads.filter(l => l.kanban_column === 'venda_ganha'
    && l.venda_ganha_dados?.status !== 'cancelada'
    && (l.venda_ganha_dados?.data_venda || '').startsWith(MES));
  vendasAgo.forEach(l => console.log(`  ${l.nome} | tel:${l.celular} | data_venda:${l.venda_ganha_dados?.data_venda}`));

  console.log('\n--- Confirmação: os 4 novos leads aparecem em leadsDoMes? ---');
  for (const n of NOVOS_LEADS) {
    const l = leadsDoMes.find(x => normPhone(x.celular) === normPhone(n.celular));
    console.log(`  ${n.nome}: ${l ? `SIM (status=${l.status}, realizada=${leadCallRealizada(l)})` : 'NÃO ENCONTRADO — checar'}`);
  }
}

main().catch(e => { console.error('Erro fatal — nenhuma ação adicional será tentada: ' + e.message); process.exit(1); });
