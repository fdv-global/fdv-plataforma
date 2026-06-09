#!/usr/bin/env node
// local/cleanup-duplicatas.mjs
// Uso:
//   node local/cleanup-duplicatas.mjs           → dry-run (mostra o que será deletado)
//   node local/cleanup-duplicatas.mjs --execute → executa a limpeza de verdade

const DRY_RUN = !process.argv.includes('--execute');

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
const sep  = () => console.log(c.dim('─'.repeat(64)));
const log  = (msg, t) => console.log(t && c[t] ? c[t](msg) : msg);

// ─── Supabase helpers ─────────────────────────────────────────────────────────
async function sbGet(path) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (!res.ok) throw new Error(`GET ${path}: ${res.status} — ${await res.text()}`);
  return res.json();
}

async function sbDelete(ids) {
  // ids: string[] de UUIDs
  const filter = `id=in.(${ids.join(',')})`;
  const res = await fetch(`${SB_URL}/rest/v1/leads?${filter}`, {
    method: 'DELETE',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Prefer': 'return=minimal' },
  });
  if (!res.ok) throw new Error(`DELETE leads: ${res.status} — ${await res.text()}`);
}

// ─── Normalização ─────────────────────────────────────────────────────────────
const normPhone = p => String(p || '').replace(/\D/g, '').trim();
const normEmail = e => String(e || '').toLowerCase().trim();

// ─── Score de completude ──────────────────────────────────────────────────────
const SCORE_FIELDS = ['nome', 'email', 'renda', 'profissao', 'instagram', 'origem', 'datachegada'];
function score(lead) {
  return SCORE_FIELDS.filter(f => lead[f] && String(lead[f]).trim() !== '').length;
}

// ─── Escolhe vencedor de um grupo ─────────────────────────────────────────────
function pickWinner(group) {
  return group.slice().sort((a, b) => {
    const sd = score(b) - score(a);
    if (sd !== 0) return sd;
    // Tie-break: mais recente pelo criadoem
    return new Date(b.criadoem) - new Date(a.criadoem);
  })[0];
}

// ─── Fetch paginado ───────────────────────────────────────────────────────────
async function fetchAllLeads() {
  const fields = 'id,nome,celular,email,instagram,profissao,origem,renda,datachegada,criadoem,status,kanban_column';
  let all = [], offset = 0;
  while (true) {
    const page = await sbGet(`leads?select=${fields}&limit=1000&offset=${offset}`);
    if (!page.length) break;
    all.push(...page);
    offset += 1000;
    if (page.length < 1000) break;
  }
  return all;
}

// ─── Principal ────────────────────────────────────────────────────────────────
async function main() {
  sep();
  log(`  FDV — Limpeza de duplicatas na tabela leads`, 'info');
  log(`  Modo: ${DRY_RUN ? c.warn('DRY-RUN (nenhuma alteração)') : c.err('EXECUÇÃO REAL')}`, 'dim');
  sep();

  log('\nCarregando todos os leads…', 'dim');
  const leads = await fetchAllLeads();
  log(`  ${leads.length} leads carregados`, 'dim');

  const toDelete = new Set();      // UUIDs a deletar
  const deleteReasons = {};        // id → motivo string (para log)

  // ── Fase 1: duplicatas por celular ──────────────────────────────────────────
  log('\n[Fase 1] Agrupando por celular…', 'info');
  const byPhone = {};
  for (const l of leads) {
    const ph = normPhone(l.celular);
    if (!ph) continue;
    (byPhone[ph] = byPhone[ph] || []).push(l);
  }

  let phoneGroups = 0, phoneLosers = 0;
  for (const [ph, group] of Object.entries(byPhone)) {
    if (group.length < 2) continue;
    phoneGroups++;
    const winner = pickWinner(group);
    for (const l of group) {
      if (l.id === winner.id) continue;
      toDelete.add(l.id);
      deleteReasons[l.id] = `dup celular ${ph} — mantido: ${winner.nome} (score ${score(winner)})`;
      phoneLosers++;
    }
  }
  log(`  ${phoneGroups} grupos | ${phoneLosers} registros marcados para deleção`, 'dim');

  // ── Fase 2: duplicatas por email (apenas entre leads ainda não marcados) ────
  log('\n[Fase 2] Agrupando por email (leads não marcados na fase 1)…', 'info');
  const byEmail = {};
  for (const l of leads) {
    if (toDelete.has(l.id)) continue;      // já será deletado
    const em = normEmail(l.email);
    if (!em) continue;
    (byEmail[em] = byEmail[em] || []).push(l);
  }

  let emailGroups = 0, emailLosers = 0;
  for (const [em, group] of Object.entries(byEmail)) {
    if (group.length < 2) continue;
    emailGroups++;
    const winner = pickWinner(group);
    for (const l of group) {
      if (l.id === winner.id) continue;
      toDelete.add(l.id);
      deleteReasons[l.id] = `dup email ${em} — mantido: ${winner.nome} (score ${score(winner)})`;
      emailLosers++;
    }
  }
  log(`  ${emailGroups} grupos | ${emailLosers} registros marcados para deleção`, 'dim');

  // ── Resumo ──────────────────────────────────────────────────────────────────
  sep();
  const total     = leads.length;
  const deletando = toDelete.size;
  const restam    = total - deletando;
  log(`\nRESUMO`, 'bold');
  log(`  Total atual:        ${total}`);
  log(`  Serão DELETADOS:    ${c.err(deletando)} (${phoneLosers} por telefone + ${emailLosers} por email)`);
  log(`  Restarão no banco:  ${c.ok(restam)}`);

  if (DRY_RUN) {
    sep();
    log('\nDetalhes dos grupos que seriam limpos (até 40):', 'dim');
    let shown = 0;
    for (const [id, reason] of Object.entries(deleteReasons)) {
      if (shown++ >= 40) { log('  … e mais…', 'dim'); break; }
      log(`  ${c.dim(id.slice(0,8)+'…')}  ${reason}`, 'dim');
    }
    sep();
    log(c.warn('\nDRY-RUN concluído. Para executar:'));
    log(c.warn('  node local/cleanup-duplicatas.mjs --execute\n'));
    return;
  }

  // ── Execução ────────────────────────────────────────────────────────────────
  sep();
  log(`\nDeletando ${deletando} registros em lotes de 50…`, 'info');

  const ids    = [...toDelete];
  const BATCH  = 50;
  let deleted  = 0;

  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    try {
      await sbDelete(batch);
      deleted += batch.length;
      log(`  ✓ ${deleted}/${deletando} deletados`, 'ok');
    } catch (e) {
      log(`  ✗ Erro no lote ${i}-${i + batch.length}: ${e.message}`, 'err');
      process.exit(1);
    }
  }

  sep();
  log(`\nLimpeza concluída — ${deleted} registros removidos, ${restam} leads ativos.\n`, 'ok');
  log(c.info('Próximo passo: aplique a migration 022 para adicionar UNIQUE em celular.'));
  log(c.dim('  supabase db push  (ou cole 022_leads_unique_celular.sql no SQL Editor)\n'));
}

main().catch(e => { console.error(c.err('\nErro fatal: ' + e.message)); process.exit(1); });
