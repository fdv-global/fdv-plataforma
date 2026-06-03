#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const appPath = path.join(__dirname, '../app/app.js');
let code = fs.readFileSync(appPath, 'utf8');

// ── 1. Fix Descartados filter: include all discarded leads
//    (getLeadKanbanCol returns 'call_realizada' as fallback for status='descartado' without kanban_column)
code = code.replace(
  "const allDesc = allLeads.filter(l => getLeadKanbanCol(l) === 'descartado');",
  "const allDesc = allLeads.filter(l => l.kanban_column === 'descartado' || l.kanban_column === 'venda_perdida' || l.status === 'descartado');"
);
console.log('1. Descartados filter:', code.includes("l.status === 'descartado'") ? 'OK' : 'FAIL');

// ── 3 & 4. Fix funil: use dataagendamento for scheduling stages + No Show inline
// Find the funil calculation block and replace it
const oldFunilCalc = `  const fLeads  = mesLeads.length;
  const fQualif = mesLeads.filter(l => !['aguardando','descartado','cancelado'].includes(l.status)).length;
  const fAgend  = mesLeads.filter(l => l.dataagendamento && !(['realizada','noshow'].includes(l.status) || (l.kanban_column && l.kanban_column !== 'agendado'))).length;
  const fCalls  = mesLeads.filter(l => ['realizada','noshow'].includes(l.status) || (l.kanban_column && l.kanban_column !== 'agendado')).length;
  const fNoShow = mesLeads.filter(l => l.status === 'noshow').length;
  const fVendas = mesLeads.filter(l => l.kanban_column === 'venda_ganha').length;
  const fRealiz = Math.max(fCalls - fNoShow, 0); // calls que aconteceram de verdade
  const pctQ  = fLeads  ? Math.round(fQualif/fLeads *100) : 0;
  const pctA  = fQualif ? Math.round(fAgend /fQualif*100) : 0;
  const pctC  = fAgend  ? Math.round(fCalls /fAgend *100) : 0;
  const pctNS = fCalls  ? Math.round(fNoShow/fCalls *100) : 0;
  const pctV  = fRealiz ? Math.round(fVendas/fRealiz*100) : 0;`;

const newFunilCalc = `  // Funil usa períodos corretos por etapa:
  // Leads/Qualificados → datachegada this month (quem entrou)
  // Agendados/Calls/NoShow → dataagendamento this month (quando a call estava marcada)
  // Vendas → kanban_column_since this month (quando fechou)
  const fLeads  = mesLeads.length;
  const fQualif = mesLeads.filter(l => !['aguardando','descartado','cancelado'].includes(l.status)).length;
  const agendMes = allLeads.filter(l => (l.dataagendamento||'').startsWith(thisMonth));
  const fAgend  = agendMes.length;
  const fCalls  = agendMes.filter(l => ['realizada','noshow'].includes(l.status) || (l.kanban_column && l.kanban_column !== 'agendado')).length;
  const fNoShow = agendMes.filter(l => l.status === 'noshow').length;
  const fVendas = allLeads.filter(isVendaMes).length;
  const fRealiz = Math.max(fCalls - fNoShow, 0);
  const pctQ  = fLeads  ? Math.round(fQualif/fLeads *100) : 0;
  const pctC  = fAgend  ? Math.round(fCalls /fAgend *100) : 0;
  const pctV  = fRealiz ? Math.round(fVendas/fRealiz*100) : 0;`;

if (!code.includes(oldFunilCalc)) {
  console.error('3. Could not find funil calc block. Printing actual:');
  const idx = code.indexOf('const fLeads  = mesLeads.length');
  console.log(code.slice(idx, idx+600));
  process.exit(1);
}
code = code.replace(oldFunilCalc, newFunilCalc);
console.log('3. Funil calc fix OK');

// ── 4. Replace funil HTML: remove branch, add No Show inline under Calls
const oldFunilHtml = `      <div class="funil-calls-wrap">
        <div class="funil-stage"><div class="funil-label">Calls</div><div class="funil-num">\${fCalls}</div></div>
        <div class="funil-noshow-branch">
          <div class="funil-branch-down">
            <svg width="12" height="20" viewBox="0 0 12 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <line x1="6" y1="0" x2="6" y2="14"/>
              <polyline points="2,10 6,16 10,10"/>
            </svg>
            <span class="funil-branch-rate">\${pctNS}% NS</span>
          </div>
          <div class="funil-stage funil-stage--ns"><div class="funil-label">No Show</div><div class="funil-num">\${fNoShow}</div></div>
        </div>
      </div>
      \${arrowSvg(pctV)}
      <div class="funil-stage"><div class="funil-label">Vendas</div><div class="funil-num" style="color:var(--gold)">\${fVendas}</div></div>`;

const newFunilHtml = `      <div class="funil-stage">
        <div class="funil-label">Calls</div>
        <div class="funil-num">\${fCalls}</div>
        \${fNoShow > 0 ? \`<div class="funil-ns-inline">↓ \${fNoShow} no-show</div>\` : ''}
      </div>
      \${arrowSvg(pctV)}
      <div class="funil-stage"><div class="funil-label">Vendas</div><div class="funil-num" style="color:var(--gold)">\${fVendas}</div></div>`;

if (!code.includes(oldFunilHtml)) {
  console.error('4. Could not find funil HTML block');
  process.exit(1);
}
code = code.replace(oldFunilHtml, newFunilHtml);
console.log('4. Funil HTML (No Show inline) OK');

// Also update arrowSvg to accept null (no rate shown)
const oldArrow = `  const arrowSvg = rate => \`
    <div class="funil-connector">
      <div class="funil-rate">\${rate}%</div>`;
const newArrow = `  const arrowSvg = (rate) => \`
    <div class="funil-connector">
      <div class="funil-rate">\${rate != null ? rate+'%' : ''}</div>`;
code = code.replace(oldArrow, newArrow);
console.log('arrowSvg null-safe OK');

// Replace pctA arrow (Qualificados→Agendados) with null (no meaningful pct between different cohorts)
code = code.replace(
  '      ${arrowSvg(pctA)}\n      <div class="funil-stage"><div class="funil-label">Agendados</div>',
  '      ${arrowSvg(null)}\n      <div class="funil-stage"><div class="funil-label">Agendados</div>'
);
console.log('pctA removed OK');

fs.writeFileSync(appPath, code, 'utf8');
console.log('All patches applied');
