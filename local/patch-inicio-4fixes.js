#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const appPath = path.join(__dirname, '../app/app.js');
let code = fs.readFileSync(appPath, 'utf8');

// ── 1. imc helper: add heroClass parameter
code = code.replace(
  'const imc = (nav, delay, label, value, sub, subCls, iconSvg, valueColor) => `\n    <div class="imc inicio-nav-card fdv-fade-up"',
  'const imc = (nav, delay, label, value, sub, subCls, iconSvg, valueColor, heroClass) => `\n    <div class="imc ${heroClass||\'\'} inicio-nav-card fdv-fade-up"'
);
if (!code.includes('heroClass')) { console.error('FAILED: heroClass not found'); process.exit(1); }
console.log('1. imc heroClass OK');

// ── 2. Faturamento card: add 'imc--hero' class
code = code.replace(
  "imc('vendas',0.16,'Faturamento do Mês',fmtFat(fatAtual),fatDiffLabel,\n        diffFat>0?'imc-pos':diffFat<0?'imc-neg':'',\n        ICO20('<polyline points=\"22 7 13 7 13 17\"/><polyline points=\"2 17 13 7 17 11 22 6\"/>'),\n        'var(--gold)')}",
  "imc('vendas',0.16,'Faturamento do Mês',fmtFat(fatAtual),fatDiffLabel,\n        diffFat>0?'imc-pos':diffFat<0?'imc-neg':'',\n        ICO20('<polyline points=\"22 7 13 7 13 17\"/><polyline points=\"2 17 13 7 17 11 22 6\"/>'),\n        'var(--gold)', 'imc--hero')}"
);
console.log('2. imc--hero class OK, found:', code.includes("'imc--hero'"));

// ── 3. Fix fCalls: exclude kanban_column='agendado' (apenas agendado ≠ call realizada)
code = code.replace(
  "const fCalls  = mesLeads.filter(l => ['realizada','noshow'].includes(l.status) || l.kanban_column).length;",
  "const fCalls  = mesLeads.filter(l => ['realizada','noshow'].includes(l.status) || (l.kanban_column && l.kanban_column !== 'agendado')).length;"
);
console.log('3. fCalls fix OK');

// ── 4. Fix fAgend: exclude leads that are already in fCalls (so stages are exclusive)
code = code.replace(
  "const fAgend  = mesLeads.filter(l => l.dataagendamento).length;",
  "const fAgend  = mesLeads.filter(l => l.dataagendamento && !(['realizada','noshow'].includes(l.status) || (l.kanban_column && l.kanban_column !== 'agendado'))).length;"
);
console.log('4. fAgend exclusion OK');

// ── 5. Funil: replace No Show sequential stage with bifurcation
const oldFunil = `      <div class="funil-stage"><div class="funil-label">Calls</div><div class="funil-num">\${fCalls}</div></div>
      \${arrowSvg(pctNS)}
      <div class="funil-stage"><div class="funil-label">No Show</div><div class="funil-num" style="color:#d06070">\${fNoShow}</div></div>
      \${arrowSvg(pctV)}
      <div class="funil-stage"><div class="funil-label">Vendas</div><div class="funil-num" style="color:var(--gold)">\${fVendas}</div></div>`;

const newFunil = `      <div class="funil-calls-wrap">
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

code = code.replace(oldFunil, newFunil);
console.log('5. funil bifurcation OK, found funil-calls-wrap:', code.includes('funil-calls-wrap'));

fs.writeFileSync(appPath, code, 'utf8');
console.log('All patches applied successfully');
