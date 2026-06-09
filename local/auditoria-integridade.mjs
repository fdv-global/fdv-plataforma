#!/usr/bin/env node
// local/auditoria-integridade.mjs
// Auditoria de integridade dos dados pós-limpeza de duplicatas.
// Uso: node local/auditoria-integridade.mjs

const SB_URL = 'https://yadxcbhginjvoemacdly.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZHhjYmhnaW5qdm9lbWFjZGx5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk2Nzk4MSwiZXhwIjoyMDkyNTQzOTgxfQ.Vp_JSA4ReP40a25L8GS7stNdROAy5YIIw-7HM98z_RY';

const c = {
  ok:   s => `\x1b[32m${s}\x1b[0m`,
  err:  s => `\x1b[31m${s}\x1b[0m`,
  info: s => `\x1b[34m${s}\x1b[0m`,
  warn: s => `\x1b[33m${s}\x1b[0m`,
  dim:  s => `\x1b[90m${s}\x1b[0m`,
  bold: s => `\x1b[1m${s}\x1b[0m`,
};
const sep  = () => console.log(c.dim('─'.repeat(72)));
const log  = (msg, t) => console.log(t && c[t] ? c[t](msg) : msg);

async function sbGet(path) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Prefer': 'count=exact',
    },
  });
  if (!res.ok) throw new Error(`GET ${path}: ${res.status} — ${await res.text()}`);
  return res.json();
}

// Paginado — para tabelas grandes
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

async function main() {
  sep();
  log('  FDV — Auditoria de Integridade dos Dados', 'info');
  log(`  ${new Date().toLocaleString('pt-BR')}`, 'dim');
  sep();

  // ── 1. Agendamentos perdidos ──────────────────────────────────────────────────
  log('\n[1] Agendamentos perdidos — status agendado/realizada/noshow sem dataagendamento', 'info');
  const semData = await fetchAll(
    'leads?status=in.(agendado,realizada,noshow)&dataagendamento=is.null',
    'id,nome,status,celular,closer'
  );
  if (semData.length === 0) {
    log('  ✓ Nenhum registro afetado', 'ok');
  } else {
    log(`  ✗ ${semData.length} lead(s) afetados:`, 'err');
    semData.forEach(l =>
      log(`    ${c.dim(l.id.slice(0,8)+'…')}  ${(l.nome||'—').padEnd(30)}  status: ${l.status}  closer: ${l.closer||'—'}`, 'warn')
    );
  }

  // ── 2. Vendas sem lead ────────────────────────────────────────────────────────
  log('\n[2] Vendas sem lead — vendas.lead_id IS NULL', 'info');
  const vendasSemLead = await fetchAll('vendas?lead_id=is.null', '*');
  if (vendasSemLead.length === 0) {
    log('  ✓ Nenhuma venda órfã', 'ok');
  } else {
    log(`  ✗ ${vendasSemLead.length} venda(s) sem lead:`, 'err');
    vendasSemLead.forEach(v =>
      log(`    id: ${c.dim(v.id?.slice(0,8)+'…')}  programa: ${v.programa||'—'}  valor: ${v.valor||'—'}  criadoem: ${(v.criadoem||'').slice(0,10)}`, 'warn')
    );
  }

  // ── 3. Alunas sem lead ────────────────────────────────────────────────────────
  log('\n[3] Alunas sem lead — alunas.lead_id IS NULL', 'info');
  let alunasSemLead = [];
  try {
    alunasSemLead = await fetchAll('alunas?lead_id=is.null', 'id,nome,status,lead_id');
    if (alunasSemLead.length === 0) {
      log('  ✓ Nenhuma aluna órfã', 'ok');
    } else {
      log(`  ✗ ${alunasSemLead.length} aluna(s) sem vínculo com lead:`, 'err');
      alunasSemLead.forEach(a =>
        log(`    ${c.dim(a.id?.slice(0,8)+'…')}  ${(a.nome||'—').padEnd(30)}  status: ${a.status||'—'}`, 'warn')
      );
    }
  } catch(e) {
    log(`  ? Erro ao consultar alunas: ${e.message}`, 'warn');
  }

  // ── 4. Leads fantasma ─────────────────────────────────────────────────────────
  log('\n[4] Leads fantasma — referências em tabelas filhas para leads inexistentes', 'info');

  // Busca todos os lead_ids das tabelas filhas (apenas IDs únicos)
  const [allLeads, histRows, msgRows, vendasRows] = await Promise.all([
    fetchAll('leads?', 'id'),
    fetchAll('lead_historico?lead_id=not.is.null', 'lead_id'),
    fetchAll('lead_messages?lead_id=not.is.null', 'lead_id'),
    fetchAll('vendas?lead_id=not.is.null', 'lead_id,id'),
  ]);

  const leadIds = new Set(allLeads.map(l => l.id));

  const fantasmaHist  = [...new Set(histRows.map(r => r.lead_id))].filter(id => !leadIds.has(id));
  const fantasmaMsg   = [...new Set(msgRows.map(r => r.lead_id))].filter(id => !leadIds.has(id));
  const fantasmaVenda = [...new Set(vendasRows.map(r => r.lead_id))].filter(id => !leadIds.has(id));

  const totalFantasma = fantasmaHist.length + fantasmaMsg.length + fantasmaVenda.length;
  if (totalFantasma === 0) {
    log('  ✓ Nenhuma referência órfã encontrada', 'ok');
  } else {
    if (fantasmaHist.length)  log(`  ✗ lead_historico: ${fantasmaHist.length} lead_id(s) inexistente(s): ${fantasmaHist.map(id=>id.slice(0,8)+'…').join(', ')}`, 'err');
    if (fantasmaMsg.length)   log(`  ✗ lead_messages:  ${fantasmaMsg.length} lead_id(s) inexistente(s): ${fantasmaMsg.map(id=>id.slice(0,8)+'…').join(', ')}`, 'err');
    if (fantasmaVenda.length) log(`  ✗ vendas:         ${fantasmaVenda.length} lead_id(s) inexistente(s): ${fantasmaVenda.map(id=>id.slice(0,8)+'…').join(', ')}`, 'err');
  }

  // ── 5. Agendamentos inconsistentes ───────────────────────────────────────────
  log('\n[5] Agendamentos inconsistentes — dataagendamento preenchido mas status incompatível', 'info');
  // Leads que têm dataagendamento mas status não é agendado/realizada/noshow/cancelado
  // Podem ter recebido o campo via merge antigo sem o status correto
  const STATUS_SCHED = ['agendado','realizada','noshow','cancelado'];
  const comData = await fetchAll(
    'leads?dataagendamento=not.is.null',
    'id,nome,status,dataagendamento,horaagendamento,closer'
  );
  const inconsistentes = comData.filter(l => !STATUS_SCHED.includes(l.status));
  if (inconsistentes.length === 0) {
    log('  ✓ Todos os leads com dataagendamento têm status compatível', 'ok');
  } else {
    log(`  ✗ ${inconsistentes.length} lead(s) com dataagendamento mas status incompatível:`, 'err');
    inconsistentes.forEach(l =>
      log(`    ${c.dim(l.id.slice(0,8)+'…')}  ${(l.nome||'—').padEnd(30)}  status: ${l.status}  data: ${l.dataagendamento}`, 'warn')
    );
  }

  // ── Resumo ───────────────────────────────────────────────────────────────────
  sep();
  log('\nRESUMO', 'bold');
  const issues = [
    ['Agendamentos perdidos (sem dataagendamento)',      semData.length],
    ['Vendas sem lead',                                  vendasSemLead.length],
    ['Alunas sem lead',                                  alunasSemLead.length],
    ['Leads fantasma (refs. órfãs)',                     totalFantasma],
    ['Agendamentos inconsistentes (data+status errado)', inconsistentes.length],
  ];
  let totalProblems = 0;
  issues.forEach(([label, count]) => {
    const ok = count === 0;
    totalProblems += count;
    log(`  ${ok ? c.ok('✓') : c.err('✗')}  ${label.padEnd(50)} ${ok ? c.ok(count) : c.err(count)}`, '');
  });
  sep();
  if (totalProblems === 0) {
    log('\n  Banco íntegro — nenhum problema encontrado.\n', 'ok');
  } else {
    log(`\n  ${totalProblems} problema(s) encontrado(s) no total.\n`, 'err');
  }
}

main().catch(e => { console.error(c.err('\nErro fatal: ' + e.message)); process.exit(1); });
