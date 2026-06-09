#!/usr/bin/env node
// local/auditoria-socg.mjs
// Auditoria SOCG completa — 5 camadas, sem corrigir nada.
// Uso: node local/auditoria-socg.mjs

const SB_URL = 'https://yadxcbhginjvoemacdly.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZHhjYmhnaW5qdm9lbWFjZGx5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk2Nzk4MSwiZXhwIjoyMDkyNTQzOTgxfQ.Vp_JSA4ReP40a25L8GS7stNdROAy5YIIw-7HM98z_RY';

const c = {
  ok:   s => `\x1b[32m${s}\x1b[0m`,
  err:  s => `\x1b[31m${s}\x1b[0m`,
  warn: s => `\x1b[33m${s}\x1b[0m`,
  info: s => `\x1b[34m${s}\x1b[0m`,
  dim:  s => `\x1b[90m${s}\x1b[0m`,
  bold: s => `\x1b[1m${s}\x1b[0m`,
  red:  s => `\x1b[31m${s}\x1b[0m`,
};
const h   = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };
const sep = (t='') => console.log(c.dim('─'.repeat(72)) + (t ? ' ' + c.bold(t) : ''));
const log = (msg, t) => console.log(t && c[t] ? c[t](msg) : msg);

async function sbGet(path) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: h });
  if (!res.ok) { const t = await res.text(); throw new Error(`GET ${path}: ${res.status} — ${t}`); }
  return res.json();
}
async function fetchAll(path, fields, extra = '') {
  let all = [], offset = 0;
  while (true) {
    const page = await sbGet(`${path}&select=${fields}&limit=1000&offset=${offset}${extra}`);
    if (!page.length) break;
    all.push(...page);
    offset += 1000;
    if (page.length < 1000) break;
  }
  return all;
}

const issues = []; // { sev, layer, label, count, examples }
function issue(sev, layer, label, count, examples = []) {
  issues.push({ sev, layer, label, count, examples });
}

// ─── helpers ─────────────────────────────────────────────────────────────────
const normPhone = p => String(p || '').replace(/\D/g, '').trim();
const normEmail = e => String(e || '').toLowerCase().trim();
const today     = new Date().toISOString().slice(0, 10);

// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  sep(); log('  FDV — Auditoria SOCG Completa', 'info');
  log(`  ${new Date().toLocaleString('pt-BR')} — modo somente leitura`, 'dim'); sep();

  // ══════════════════════════════════════════════════════════════════════════
  log('\n' + c.bold('CAMADA 1 — Integridade Referencial'), 'info');
  // ══════════════════════════════════════════════════════════════════════════

  // FK map (de migrations)
  const fkMap = [
    { table: 'lead_messages',  col: 'lead_id', onDelete: 'CASCADE' },
    { table: 'lead_historico', col: 'lead_id', onDelete: 'CASCADE' },
    { table: 'lead_labels',    col: 'lead_id', onDelete: 'CASCADE' },
    { table: 'vendas',         col: 'lead_id', onDelete: 'SET NULL' },
    { table: 'alunas',         col: 'lead_id', onDelete: 'SET NULL' },
  ];

  log('\n[1.1] FKs que referenciam leads(id):', 'dim');
  fkMap.forEach(f =>
    log(`  ${f.table.padEnd(20)} lead_id  →  ON DELETE ${f.onDelete}`, 'dim')
  );

  // 1.2 lead_id IS NULL nas tabelas com SET NULL
  log('\n[1.2] lead_id IS NULL (tabelas com ON DELETE SET NULL):', 'dim');
  const [vendasNull, alunasNull] = await Promise.all([
    sbGet('vendas?lead_id=is.null&select=id,closer,programa,valor'),
    sbGet('alunas?lead_id=is.null&select=id,nome,status'),
  ]);
  if (vendasNull.length) {
    issue('🔴', 1, 'Vendas com lead_id NULL', vendasNull.length,
      vendasNull.slice(0,3).map(v => `id:${v.id?.slice(0,8)}… prog:${v.programa||'—'} val:${v.valor||'—'}`));
    log(`  ✗ vendas: ${vendasNull.length} órfãs`, 'err');
  } else log('  ✓ vendas: 0 órfãs', 'ok');

  if (alunasNull.length) {
    issue('🟡', 1, 'Alunas com lead_id NULL', alunasNull.length,
      alunasNull.slice(0,3).map(a => `${a.nome||'—'} (${a.status})`));
    log(`  ✗ alunas: ${alunasNull.length} órfãs`, 'warn');
  } else log('  ✓ alunas: 0 órfãs', 'ok');

  // 1.3 Referências fantasma (lead_id NOT IN leads)
  log('\n[1.3] Referências fantasma (lead_id não existe em leads):', 'dim');
  const [allLeads, histRows, msgRows, vendasRows, labelsRows] = await Promise.all([
    fetchAll('leads?', 'id'),
    fetchAll('lead_historico?lead_id=not.is.null', 'lead_id'),
    fetchAll('lead_messages?lead_id=not.is.null', 'lead_id'),
    fetchAll('vendas?lead_id=not.is.null', 'lead_id'),
    sbGet('lead_labels?select=lead_id').catch(() => []),
  ]);
  const leadIds = new Set(allLeads.map(l => l.id));

  const ghostHist   = [...new Set(histRows.map(r => r.lead_id))].filter(id => !leadIds.has(id));
  const ghostMsg    = [...new Set(msgRows.map(r => r.lead_id))].filter(id => !leadIds.has(id));
  const ghostVendas = [...new Set(vendasRows.map(r => r.lead_id))].filter(id => !leadIds.has(id));
  const ghostLabels = [...new Set(labelsRows.map(r => r.lead_id))].filter(id => id && !leadIds.has(id));

  const totalGhost = ghostHist.length + ghostMsg.length + ghostVendas.length + ghostLabels.length;
  if (totalGhost === 0) {
    log('  ✓ Nenhuma referência fantasma', 'ok');
  } else {
    if (ghostHist.length)   { issue('🔴', 1, 'lead_historico com lead_id fantasma', ghostHist.length, ghostHist.slice(0,3).map(id => id.slice(0,8)+'…')); log(`  ✗ lead_historico: ${ghostHist.length}`, 'err'); }
    if (ghostMsg.length)    { issue('🔴', 1, 'lead_messages com lead_id fantasma',   ghostMsg.length,  ghostMsg.slice(0,3).map(id => id.slice(0,8)+'…'));  log(`  ✗ lead_messages: ${ghostMsg.length}`, 'err'); }
    if (ghostVendas.length) { issue('🔴', 1, 'vendas com lead_id fantasma',          ghostVendas.length, ghostVendas.slice(0,3).map(id => id.slice(0,8)+'…')); log(`  ✗ vendas: ${ghostVendas.length}`, 'err'); }
    if (ghostLabels.length) { issue('🟡', 1, 'lead_labels com lead_id fantasma',     ghostLabels.length, ghostLabels.slice(0,3).map(id => id.slice(0,8)+'…')); log(`  ✗ lead_labels: ${ghostLabels.length}`, 'warn'); }
  }

  // ══════════════════════════════════════════════════════════════════════════
  log('\n' + c.bold('CAMADA 2 — Integridade de Negócio'), 'info');
  // ══════════════════════════════════════════════════════════════════════════

  const allLeadsData = await fetchAll('leads?', 'id,nome,status,dataagendamento,closer,kanban_column,celular');

  // 2.1 Agendado sem dataagendamento
  const agSemData = allLeadsData.filter(l => l.status === 'agendado' && !l.dataagendamento);
  if (agSemData.length) {
    issue('🔴', 2, "Status 'agendado' sem dataagendamento", agSemData.length,
      agSemData.slice(0,3).map(l => `${l.nome||'—'} (${l.id?.slice(0,8)}…)`));
    log(`\n[2.1] ✗ ${agSemData.length} leads agendados sem dataagendamento`, 'err');
  } else log('\n[2.1] ✓ Todos agendados têm dataagendamento', 'ok');

  // 2.2 Realizada sem closer
  const realSemCloser = allLeadsData.filter(l => l.status === 'realizada' && !l.closer);
  if (realSemCloser.length) {
    issue('🟡', 2, "Status 'realizada' sem closer", realSemCloser.length,
      realSemCloser.slice(0,3).map(l => `${l.nome||'—'} (${l.id?.slice(0,8)}…)`));
    log(`[2.2] ✗ ${realSemCloser.length} realizadas sem closer`, 'warn');
  } else log('[2.2] ✓ Todas realizadas têm closer', 'ok');

  // 2.3 NoShow sem dataagendamento
  const noShowSemData = allLeadsData.filter(l => l.status === 'noshow' && !l.dataagendamento);
  if (noShowSemData.length) {
    issue('🟡', 2, "Status 'noshow' sem dataagendamento", noShowSemData.length,
      noShowSemData.slice(0,3).map(l => `${l.nome||'—'} (${l.id?.slice(0,8)}…)`));
    log(`[2.3] ✗ ${noShowSemData.length} no-shows sem dataagendamento`, 'warn');
  } else log('[2.3] ✓ Todos no-shows têm dataagendamento', 'ok');

  // 2.4 Vendas sem programa ou sem valor
  const todasVendas = await fetchAll('vendas?', 'id,lead_id,programa,valor,status,closer');
  const vendasSemProg  = todasVendas.filter(v => v.lead_id && !v.programa);
  const vendasSemValor = todasVendas.filter(v => v.lead_id && !v.valor);
  if (vendasSemProg.length) {
    issue('🟡', 2, 'Vendas sem programa', vendasSemProg.length,
      vendasSemProg.slice(0,3).map(v => `id:${v.id?.slice(0,8)}… closer:${v.closer||'—'}`));
    log(`[2.4] ✗ ${vendasSemProg.length} vendas sem programa`, 'warn');
  } else log('[2.4] ✓ Todas as vendas têm programa', 'ok');
  if (vendasSemValor.length) {
    issue('🟡', 2, 'Vendas sem valor', vendasSemValor.length,
      vendasSemValor.slice(0,3).map(v => `id:${v.id?.slice(0,8)}… prog:${v.programa||'—'}`));
    log(`        ✗ ${vendasSemValor.length} vendas sem valor`, 'warn');
  } else log('        ✓ Todas as vendas têm valor', 'ok');

  // 2.5 Vendas com lead em status incompatível (lead não é 'realizada'/'venda_ganha')
  const leadsMap = Object.fromEntries(allLeadsData.map(l => [l.id, l]));
  const vendasInconsistentes = todasVendas.filter(v => {
    if (!v.lead_id || v.status === 'cancelada') return false;
    const l = leadsMap[v.lead_id];
    if (!l) return false;
    return !['realizada','cancelado'].includes(l.status) && l.kanban_column !== 'venda_ganha';
  });
  if (vendasInconsistentes.length) {
    issue('🟡', 2, 'Vendas com lead em status incompatível', vendasInconsistentes.length,
      vendasInconsistentes.slice(0,3).map(v => `lead:${leadsMap[v.lead_id]?.nome||'—'} status:${leadsMap[v.lead_id]?.status||'?'}`));
    log(`[2.5] ✗ ${vendasInconsistentes.length} vendas com lead em status incompatível`, 'warn');
  } else log('[2.5] ✓ Todas as vendas têm lead em status compatível', 'ok');

  // 2.6 Alunas sem venda correspondente
  const todasAlunas  = await fetchAll('alunas?lead_id=not.is.null', 'id,nome,lead_id,status');
  const vendasLeadIds = new Set(todasVendas.filter(v => v.lead_id).map(v => v.lead_id));
  const alunasSemVenda = todasAlunas.filter(a => !vendasLeadIds.has(a.lead_id));
  if (alunasSemVenda.length) {
    issue('🟡', 2, 'Alunas sem venda correspondente', alunasSemVenda.length,
      alunasSemVenda.slice(0,3).map(a => `${a.nome||'—'} (${a.status})`));
    log(`[2.6] ✗ ${alunasSemVenda.length} alunas sem venda correspondente`, 'warn');
  } else log('[2.6] ✓ Todas as alunas têm venda', 'ok');

  // 2.7 dataagendamento passado ainda 'agendado'
  const agendPassado = allLeadsData.filter(l =>
    l.status === 'agendado' && l.dataagendamento && l.dataagendamento < today
  );
  if (agendPassado.length) {
    issue('🟡', 2, 'Leads agendados com data no passado', agendPassado.length,
      agendPassado.slice(0,3).map(l => `${l.nome||'—'} data:${l.dataagendamento}`));
    log(`[2.7] ✗ ${agendPassado.length} leads agendados com data no passado`, 'warn');
  } else log('[2.7] ✓ Nenhum agendamento vencido com status ativo', 'ok');

  // ══════════════════════════════════════════════════════════════════════════
  log('\n' + c.bold('CAMADA 3 — Consistência Histórica'), 'info');
  // ══════════════════════════════════════════════════════════════════════════

  // 3.1 Contadores do funil
  log('\n[3.1] Contadores reais vs banco:', 'dim');
  const cnts = {
    agendados:  allLeadsData.filter(l => l.status === 'agendado').length,
    realizadas: allLeadsData.filter(l => l.status === 'realizada').length,
    noshow:     allLeadsData.filter(l => l.status === 'noshow').length,
    vendas:     todasVendas.filter(v => v.lead_id && v.status !== 'cancelada').length,
    canceladas: todasVendas.filter(v => v.status === 'cancelada').length,
  };
  Object.entries(cnts).forEach(([k, v]) => log(`  ${k.padEnd(15)} ${v}`, 'dim'));
  // Verificar se algum lead 'realizada' sem kanban
  const realizadasSemKanban = allLeadsData.filter(l => l.status === 'realizada' && !l.kanban_column);
  if (realizadasSemKanban.length) {
    issue('🟡', 3, "Leads 'realizada' sem kanban_column", realizadasSemKanban.length,
      realizadasSemKanban.slice(0,3).map(l => l.nome||'—'));
    log(`  ✗ ${realizadasSemKanban.length} realizadas sem kanban_column (não aparecem no funil)`, 'warn');
  } else log('  ✓ Todas as realizadas têm kanban_column', 'ok');

  // 3.2 Vendas canceladas no faturamento
  const vendasCanceladas = todasVendas.filter(v => v.status === 'cancelada');
  log(`\n[3.2] Vendas com status=cancelada: ${vendasCanceladas.length} — ${vendasCanceladas.length > 0 ? 'verificar se estão sendo filtradas do faturamento' : 'ok'}`, vendasCanceladas.length > 0 ? 'warn' : 'ok');
  if (vendasCanceladas.length) {
    issue('🟡', 3, "Vendas canceladas — verificar exclusão do faturamento", vendasCanceladas.length,
      vendasCanceladas.slice(0,2).map(v => `id:${v.id?.slice(0,8)}… closer:${v.closer||'—'}`));
  }

  // 3.3 Duplicatas sobreviventes
  log('\n[3.3] Duplicatas sobreviventes (mesmo celular/email normalizado):', 'dim');
  const byPhone = {}, byEmail = {};
  allLeadsData.forEach(l => {
    const ph = normPhone(l.celular); if (ph) (byPhone[ph] = byPhone[ph]||[]).push(l);
    // email check feito separado abaixo
  });
  const allLeadsEmail = await fetchAll('leads?', 'id,nome,email,celular,status');
  allLeadsEmail.forEach(l => {
    const em = normEmail(l.email); if (em) (byEmail[em] = byEmail[em]||[]).push(l);
  });
  const dupPhone = Object.entries(byPhone).filter(([,g]) => g.length > 1);
  const dupEmail = Object.entries(byEmail).filter(([,g]) => g.length > 1);
  if (dupPhone.length) {
    issue('🔴', 3, 'Leads com celular duplicado (sobreviveram ao merge)', dupPhone.length,
      dupPhone.slice(0,3).map(([ph, g]) => `${ph}: ${g.map(l=>l.nome||'?').join(' / ')}`));
    log(`  ✗ ${dupPhone.length} grupo(s) com celular duplicado`, 'err');
    dupPhone.slice(0,5).forEach(([ph, g]) => log(`      ${ph}: ${g.map(l=>l.nome||'?').join(' | ')}`, 'warn'));
  } else log('  ✓ Nenhum celular duplicado', 'ok');
  if (dupEmail.length) {
    issue('🟡', 3, 'Leads com email duplicado (sobreviveram ao merge)', dupEmail.length,
      dupEmail.slice(0,3).map(([em, g]) => `${em}: ${g.map(l=>l.nome||'?').join(' / ')}`));
    log(`  ✗ ${dupEmail.length} grupo(s) com email duplicado`, 'warn');
    dupEmail.slice(0,5).forEach(([em, g]) => log(`      ${em}: ${g.map(l=>l.nome||'?').join(' | ')}`, 'warn'));
  } else log('  ✓ Nenhum email duplicado', 'ok');

  // ══════════════════════════════════════════════════════════════════════════
  log('\n' + c.bold('CAMADA 4 — Qualidade dos Dados'), 'info');
  // ══════════════════════════════════════════════════════════════════════════

  const allLeadsFull = await fetchAll('leads?', 'id,nome,celular,email,etiquetas,observacoes,status');

  // 4.1 Celulares com formato inconsistente
  const celInconsistentes = allLeadsFull.filter(l => {
    if (!l.celular) return false;
    const d = normPhone(l.celular);
    // válido = 10 ou 11 dígitos (com DDD), ou 12-13 com 55
    return d.length < 10 || d.length > 13;
  });
  if (celInconsistentes.length) {
    issue('🟡', 4, 'Celulares com formato inválido (< 10 ou > 13 dígitos)', celInconsistentes.length,
      celInconsistentes.slice(0,3).map(l => `${l.nome||'—'}: "${l.celular}"`));
    log(`\n[4.1] ✗ ${celInconsistentes.length} celulares com formato inválido`, 'warn');
    celInconsistentes.slice(0,3).forEach(l => log(`      ${l.nome||'—'}: "${l.celular}"`, 'dim'));
  } else log('\n[4.1] ✓ Formatos de celular parecem consistentes', 'ok');

  // 4.2 Nomes em branco ou < 2 chars
  const nomesCurtos = allLeadsFull.filter(l => !l.nome || l.nome.trim().length < 2);
  if (nomesCurtos.length) {
    issue('🟡', 4, 'Leads com nome em branco ou < 2 caracteres', nomesCurtos.length,
      nomesCurtos.slice(0,3).map(l => `id:${l.id?.slice(0,8)}… nome:"${l.nome||''}"`));
    log(`[4.2] ✗ ${nomesCurtos.length} leads com nome em branco ou muito curto`, 'warn');
  } else log('[4.2] ✓ Todos os leads têm nome válido', 'ok');

  // 4.3 {{ $json. não resolvido
  const jsonNaoResolvido = allLeadsFull.filter(l =>
    JSON.stringify([l.nome, l.celular, l.email, l.observacoes]).includes('{{ $json.')
  );
  if (jsonNaoResolvido.length) {
    issue('🔴', 4, 'Campos com {{ $json. não resolvido (automação com erro)', jsonNaoResolvido.length,
      jsonNaoResolvido.slice(0,3).map(l => `${l.nome||'—'} id:${l.id?.slice(0,8)}…`));
    log(`[4.3] ✗ ${jsonNaoResolvido.length} registros com template não resolvido`, 'err');
  } else log('[4.3] ✓ Nenhum {{ $json. não resolvido', 'ok');

  // 4.4 Emails inválidos
  const emailInvalido = allLeadsFull.filter(l => {
    if (!l.email) return false;
    return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l.email.trim());
  });
  if (emailInvalido.length) {
    issue('🟡', 4, 'Emails com formato inválido', emailInvalido.length,
      emailInvalido.slice(0,3).map(l => `${l.nome||'—'}: "${l.email}"`));
    log(`[4.4] ✗ ${emailInvalido.length} emails inválidos`, 'warn');
    emailInvalido.slice(0,3).forEach(l => log(`      ${l.nome||'—'}: "${l.email}"`, 'dim'));
  } else log('[4.4] ✓ Todos os emails têm formato válido', 'ok');

  // 4.5 Completamente vazios (sem nome, celular e email)
  const vazios = allLeadsFull.filter(l => !l.nome?.trim() && !l.celular?.trim() && !l.email?.trim());
  if (vazios.length) {
    issue('🔴', 4, 'Leads completamente vazios (sem nome, celular e email)', vazios.length,
      vazios.slice(0,3).map(l => `id:${l.id?.slice(0,8)}… status:${l.status}`));
    log(`[4.5] ✗ ${vazios.length} leads completamente vazios`, 'err');
  } else log('[4.5] ✓ Nenhum lead completamente vazio', 'ok');

  // 4.6 Etiquetas referenciando categorias inexistentes
  log('[4.6] Verificando etiquetas...', 'dim');
  let knownLabels = new Set();
  try {
    const labels = await sbGet('labels?select=nome');
    labels.forEach(lb => knownLabels.add(lb.nome));
  } catch { log('      (tabela labels inacessível — pulando)', 'dim'); }
  if (knownLabels.size > 0) {
    const etiquetasInvalidas = allLeadsFull.filter(l =>
      Array.isArray(l.etiquetas) && l.etiquetas.some(et => !knownLabels.has(et))
    );
    if (etiquetasInvalidas.length) {
      issue('🟢', 4, 'Leads com etiquetas não cadastradas', etiquetasInvalidas.length,
        etiquetasInvalidas.slice(0,3).map(l => `${l.nome||'—'}: ${JSON.stringify(l.etiquetas)}`));
      log(`      ✗ ${etiquetasInvalidas.length} leads com etiquetas fora do catálogo`, 'warn');
    } else log('      ✓ Todas as etiquetas estão no catálogo', 'ok');
  } else {
    log('      (sem catálogo de etiquetas para comparar — pulando)', 'dim');
  }

  // ══════════════════════════════════════════════════════════════════════════
  log('\n' + c.bold('CAMADA 5 — Código Morto e Inconsistências Técnicas'), 'info');
  // ══════════════════════════════════════════════════════════════════════════

  // 5.1 Chart.js vars declaradas e nunca instanciadas
  log('\n[5.1] Variáveis Chart.js:', 'dim');
  const deadCharts = ['_relChartStatus', '_relChartOrigem', '_relChartProf', '_relChartRenda'];
  issue('🟢', 5, `Chart.js vars declaradas mas nunca instanciadas: ${deadCharts.join(', ')}`, 4,
    deadCharts);
  log(`  ✗ 4 variáveis declaradas mas sem new Chart(): ${deadCharts.join(', ')}`, 'warn');
  log('  ✓ _relChart e _relChartDia são instanciadas (usadas no PDF)', 'ok');

  // 5.2 calendar.js morto
  log('\n[5.2] app/calendar.js:', 'dim');
  issue('🟢', 5, 'app/calendar.js é arquivo morto (comentário interno: "removido")', 1,
    ['Integração Google Calendar removida; arquivo existe mas é stub vazio']);
  log('  ✗ calendar.js existe mas é stub morto (comentário: "removido")', 'warn');
  log('  ✓ calendar_tokens é referenciado em app.js (OAuth para Google Calendar)', 'ok');

  // 5.3 Migration 011 ausente do repositório
  log('\n[5.3] Gap de migrations (011 ausente do repo):', 'dim');
  issue('🟢', 5, 'Migration 011 ausente do repositório (gap entre 010 e 012)', 1,
    ['Numeração pula de 010 para 012 — pode ter sido aplicada diretamente no Supabase sem arquivo']);
  log('  ✗ Migration 011 não existe no repo (010 → 012)', 'warn');

  // 5.4 Migrations no repo não aplicadas no Supabase
  log('\n[5.4] Migrations possivelmente não aplicadas:', 'dim');
  const naoAplicadas = [];
  // Verifica pela existência de estruturas esperadas
  try {
    await sbGet('kanban_columns?limit=1&select=slug');
    log('  ✓ kanban_columns.slug existe (023 aplicada)', 'ok');
  } catch {
    naoAplicadas.push('023_kanban_columns_slug — campo slug ausente');
    issue('🔴', 5, 'Migration 023 não aplicada — kanban_columns.slug ausente', 1,
      ['Campo slug não existe na tabela kanban_columns']);
    log('  ✗ 023: kanban_columns.slug ausente — Kanban Supabase não funciona', 'err');
  }
  try {
    const r = await sbGet('kanban_columns?limit=1&select=id');
    log(`  ✓ kanban_columns existe com ${r.length === 0 ? '0 linhas (tabela vazia!)' : 'dados'} (010 aplicada)`, r.length === 0 ? 'warn' : 'ok');
    if (r.length === 0) {
      issue('🔴', 5, 'kanban_columns está vazia — defaults não foram semeados', 1,
        ['Tabela existe mas sem linhas; loadKanbanCols vai tentar inserir mas depende da 023']);
    }
  } catch {
    naoAplicadas.push('010_kanban_aluna_id — tabela kanban_columns ausente');
    issue('🔴', 5, 'Migration 010 não aplicada — tabela kanban_columns ausente', 1,
      ['kanban_columns não existe no Supabase']);
    log('  ✗ 010: kanban_columns não existe', 'err');
  }
  // Verifica 022 (UNIQUE index em celular)
  try {
    await sbGet('leads?celular=eq.TESTE_UNIQUE_INDEX_PROBE_fdv_audit&limit=1&select=id');
    log('  ✓ 022 provavelmente aplicada (query celular funcionou)', 'ok');
  } catch {
    log('  ? 022: não foi possível verificar o índice unique via REST', 'dim');
  }
  if (naoAplicadas.length === 0 && !issues.find(i => i.layer === 5 && i.label.includes('não aplicada')))
    log('  ✓ Todas as migrations verificáveis estão aplicadas', 'ok');

  // 5.5 Tabelas Supabase sem referência no código
  log('\n[5.5] Tabelas Supabase sem uso no código JS (verificação manual):', 'dim');
  const tabelasSemUso = [];
  // calendar_tokens: USADO (verificado acima)
  // kanban_columns: USADO (novo)
  // lead_labels: verificar
  try {
    await sbGet('lead_labels?limit=1&select=lead_id,label_id');
    log('  ✓ lead_labels: existe no banco', 'ok');
  } catch { log('  ? lead_labels: não acessível', 'dim'); }
  // sessoes: verificar
  try {
    await sbGet('sessoes?limit=1&select=id');
    log('  ✓ sessoes: existe e é referenciada no código (Sucesso/Alunas)', 'ok');
  } catch { log('  ? sessoes: não acessível ou não existe', 'dim'); }

  // ══════════════════════════════════════════════════════════════════════════
  // RELATÓRIO FINAL — ordenado por criticidade
  // ══════════════════════════════════════════════════════════════════════════
  sep();
  log('\n' + c.bold('RELATÓRIO FINAL — ordenado por criticidade'), 'info');
  log(c.dim(`Gerado em ${new Date().toLocaleString('pt-BR')}\n`));

  const order = { '🔴': 0, '🟡': 1, '🟢': 2 };
  issues.sort((a, b) => order[a.sev] - order[b.sev] || a.layer - b.layer);

  let prevSev = null;
  for (const iss of issues) {
    if (iss.sev !== prevSev) {
      prevSev = iss.sev;
      const labels = { '🔴': 'CRÍTICO', '🟡': 'MODERADO', '🟢': 'LEVE' };
      log(`\n${iss.sev}  ${c.bold(labels[iss.sev])}`);
      log(c.dim('  ────────────────────────────────────────'));
    }
    const ex = iss.examples.length ? `\n       Exemplos: ${iss.examples.join(' | ')}` : '';
    log(`  [C${iss.layer}] ${iss.label} — ${c.bold(String(iss.count))} ocorrência(s)${ex}`);
  }

  const totais = { '🔴': 0, '🟡': 0, '🟢': 0 };
  issues.forEach(i => totais[i.sev]++);
  sep();
  log(`\n  🔴 Críticos:  ${totais['🔴']}   🟡 Moderados: ${totais['🟡']}   🟢 Leves: ${totais['🟢']}`);
  log(`  Total de categorias com problemas: ${issues.length}\n`);
}

main().catch(e => { console.error(c.err('\nErro fatal: ' + e.message)); console.error(e.stack); process.exit(1); });
