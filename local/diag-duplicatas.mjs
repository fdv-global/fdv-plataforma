#!/usr/bin/env node
// Diagnóstico de duplicatas — somente leitura, não altera nada.
const SB_URL = 'https://yadxcbhginjvoemacdly.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZHhjYmhnaW5qdm9lbWFjZGx5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk2Nzk4MSwiZXhwIjoyMDkyNTQzOTgxfQ.Vp_JSA4ReP40a25L8GS7stNdROAy5YIIw-7HM98z_RY';

async function sbGet(path) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Prefer': 'count=exact',
    },
  });
  const count = res.headers.get('content-range')?.split('/')[1];
  const data = await res.json();
  return { data, count: count ? parseInt(count) : data.length };
}

// 1. Total de leads
const { count: total } = await sbGet('leads?select=id&limit=1');
console.log(`\n1. TOTAL DE LEADS: ${total}`);

// 2. Busca todos celulares e emails (paginado em blocos de 1000)
let allLeads = [];
let offset = 0;
const PAGE = 1000;
while (true) {
  const res = await fetch(
    `${SB_URL}/rest/v1/leads?select=id,celular,email&limit=${PAGE}&offset=${offset}`,
    { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
  );
  const page = await res.json();
  if (!page.length) break;
  allLeads.push(...page);
  offset += PAGE;
  if (page.length < PAGE) break;
}

// 3. Duplicatas por celular
function normPhone(p) {
  return String(p || '').replace(/\D/g, '').trim();
}
function normEmail(e) {
  return String(e || '').toLowerCase().trim();
}

const byPhone = {};
const byEmail = {};
for (const l of allLeads) {
  const ph = normPhone(l.celular);
  if (ph) { byPhone[ph] = (byPhone[ph] || 0) + 1; }
  const em = normEmail(l.email);
  if (em) { byEmail[em] = (byEmail[em] || 0) + 1; }
}

const dupPhoneGroups  = Object.entries(byPhone).filter(([, c]) => c > 1);
const dupEmailGroups  = Object.entries(byEmail).filter(([, c]) => c > 1);
const dupPhoneLeads   = dupPhoneGroups.reduce((s, [, c]) => s + c, 0);
const dupEmailLeads   = dupEmailGroups.reduce((s, [, c]) => s + c, 0);

console.log(`\n2. DUPLICATAS POR TELEFONE`);
console.log(`   Grupos (telefones que aparecem 2x+): ${dupPhoneGroups.length}`);
console.log(`   Leads afetados (todos os membros dos grupos): ${dupPhoneLeads}`);
if (dupPhoneGroups.length > 0) {
  console.log(`   Exemplos (telefone → qtd):`);
  dupPhoneGroups.slice(0, 10).forEach(([ph, c]) => console.log(`     ${ph} → ${c}x`));
  if (dupPhoneGroups.length > 10) console.log(`     ... e mais ${dupPhoneGroups.length - 10} grupos`);
}

console.log(`\n3. DUPLICATAS POR EMAIL`);
console.log(`   Grupos (emails que aparecem 2x+): ${dupEmailGroups.length}`);
console.log(`   Leads afetados: ${dupEmailLeads}`);
if (dupEmailGroups.length > 0) {
  console.log(`   Exemplos (email → qtd):`);
  dupEmailGroups.slice(0, 10).forEach(([em, c]) => console.log(`     ${em} → ${c}x`));
  if (dupEmailGroups.length > 10) console.log(`     ... e mais ${dupEmailGroups.length - 10} grupos`);
}

console.log(`\n4. SCRIPT import-leads.js`);
console.log(`   Verifica duplicata por: CELULAR (normalizado — somente dígitos)`);
console.log(`   Mecanismo: set em memória carregado no início da execução`);
console.log(`   Verificação por EMAIL: NÃO`);
console.log(`   UNIQUE constraint no banco (celular): NÃO`);
console.log(`   UNIQUE constraint no banco (email): NÃO`);
console.log(`   UNIQUE constraint no banco (firebase_id): SIM\n`);
