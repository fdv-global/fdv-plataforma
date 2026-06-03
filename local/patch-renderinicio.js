#!/usr/bin/env node
// Patch: replace renderInicio() in app.js
const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '../app/app.js');
let code = fs.readFileSync(appPath, 'utf8');

const startMarker = 'function renderInicio() {';
const endMarker = '\n// ─── LEADS LIST ──────────────────────────────────────────────────────';

const startIdx = code.indexOf(startMarker);
const endIdx   = code.indexOf(endMarker, startIdx);

if (startIdx === -1 || endIdx === -1) {
  console.error('Markers not found'); process.exit(1);
}

const newFn = `function renderInicio() {
  const el = document.getElementById('inicio-content');
  if (!el) return;

  const now    = new Date();
  const hour   = now.getHours();
  const greet  = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const name   = esc(currentUser?.displayName || (currentUser?.email?.split('@')[0]) || 'visitante');
  const datePt = now.toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const dateStr = datePt.charAt(0).toUpperCase() + datePt.slice(1);

  if (_verseTimer) clearInterval(_verseTimer);
  _verseTimer = setInterval(_updateVerseWithFade, 30 * 60 * 1000);
  const { text: verseText, ref: verseRef } = _parseVerse(VERSES[_pickVerseIdx()]);

  const todayStr  = now.toISOString().slice(0, 10);
  const thisMonth = todayStr.slice(0, 7);
  const prevMonth = (() => {
    const d = new Date(now.getFullYear(), now.getMonth()-1, 1);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  })();
  const nowTime = String(hour).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');

  const isVendaMes  = l => l.kanban_column === 'venda_ganha' && ((l.atualizadoem||l.datachegada||'').startsWith(thisMonth));
  const isVendaPrev = l => l.kanban_column === 'venda_ganha' && ((l.atualizadoem||l.datachegada||'').startsWith(prevMonth));
  const fatAtual = allLeads.filter(isVendaMes).reduce((s,l) => s + parseValor(l.venda_ganha_dados?.valor), 0);
  const fatPrev  = allLeads.filter(isVendaPrev).reduce((s,l) => s + parseValor(l.venda_ganha_dados?.valor), 0);
  const diffFat  = fatAtual - fatPrev;
  const fmtFat   = n => n ? n.toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:0,maximumFractionDigits:0}) : 'R$ 0';

  const leadsHoje = allLeads.filter(l => (l.datachegada||'').startsWith(todayStr)).length;

  const callsHojeList = allLeads
    .filter(l => (l.dataagendamento||'').startsWith(todayStr))
    .sort((a,b) => (a.horaagendamento||'').localeCompare(b.horaagendamento||''));
  const callsHoje   = callsHojeList.length;
  const proximaCall = callsHojeList.find(l => (l.horaagendamento||'') >= nowTime);
  const proximaHora = proximaCall?.horaagendamento?.slice(0,5) || null;

  const leadesMes      = allLeads.filter(l => (l.datachegada||'').startsWith(thisMonth)).length;
  const vendasMesCount = allLeads.filter(isVendaMes).length;
  const convMes = leadesMes ? Math.round(vendasMesCount / leadesMes * 100) : 0;

  const fLeads  = allLeads.length;
  const fQualif = allLeads.filter(l => !['aguardando','descartado','cancelado'].includes(l.status)).length;
  const fAgend  = allLeads.filter(l => l.dataagendamento).length;
  const fCalls  = allLeads.filter(l => ['realizada','noshow'].includes(l.status) || l.kanban_column).length;
  const fVendas = allLeads.filter(l => l.kanban_column === 'venda_ganha').length;
  const pctQ = fLeads  ? Math.round(fQualif/fLeads *100) : 0;
  const pctA = fQualif ? Math.round(fAgend /fQualif*100) : 0;
  const pctC = fAgend  ? Math.round(fCalls /fAgend *100) : 0;
  const pctV = fCalls  ? Math.round(fVendas/fCalls *100) : 0;

  const arrowSvg = rate => \`
    <div class="funil-connector">
      <div class="funil-rate">\${rate}%</div>
      <svg class="funil-arrow-line" viewBox="0 0 36 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
        <line x1="0" y1="7" x2="28" y2="7"/>
        <polyline points="22,2 30,7 22,12"/>
      </svg>
    </div>\`;

  const imc = (nav, delay, label, value, sub, subCls, iconSvg) => \`
    <div class="imc inicio-nav-card fdv-fade-up" data-inicio-nav="\${nav}" style="animation-delay:\${delay}s">
      <div class="imc-icon">\${iconSvg}</div>
      <div class="imc-label">\${label}</div>
      <div class="imc-value">\${value}</div>
      <div class="imc-sub \${subCls||''}">\${sub}</div>
    </div>\`;

  const ICO20 = (d) => _S(d, 20);
  const fatDiffLabel = diffFat !== 0
    ? (diffFat >= 0 ? '+' : '') + fmtFat(Math.abs(diffFat)) + ' vs mês ant.'
    : 'mesmo que mês anterior';

  el.innerHTML = \`<div class="inicio-wrap">
    <div class="inicio-header fdv-fade-up" style="animation-delay:0s">
      <h1 class="inicio-greeting">\${greet}, \${name}!</h1>
      <p class="inicio-date">\${dateStr}</p>
    </div>
    <div class="inicio-verse-card fdv-fade-up" id="inicio-verse-card" style="animation-delay:0.08s">
      <div class="inicio-verse-text">\${verseText}</div>
      <div class="inicio-verse-ref">\${verseRef}</div>
    </div>
    <div class="inicio-metrics">
      \${imc('vendas',0.16,'Faturamento do Mês',fmtFat(fatAtual),fatDiffLabel,
        diffFat>0?'imc-pos':diffFat<0?'imc-neg':'',
        ICO20('<polyline points="22 7 13 7 13 17"/><polyline points="2 17 13 7 17 11 22 6"/>'))}
      \${imc('novos',0.22,'Leads Hoje',leadsHoje,'novos hoje','',
        ICO20('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>'))}
      \${imc('agendados',0.28,'Calls Hoje',callsHoje,
        proximaHora?'próxima às '+proximaHora:'nenhuma próxima','',
        ICO20('<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>'))}
      \${imc('relatorios',0.34,'Conversão do Mês',convMes+'%',
        vendasMesCount+' lead'+(vendasMesCount!==1?'s':'')+' convertido'+(vendasMesCount!==1?'s':''),'',
        ICO20('<circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/><path d="m9 12 2 2 4-4"/>'))}
    </div>
    <div class="inicio-funil fdv-fade-up" style="animation-delay:0.38s">
      <div class="funil-stage"><div class="funil-label">Leads</div><div class="funil-num">\${fLeads}</div><div class="funil-pct">total</div></div>
      \${arrowSvg(pctQ)}
      <div class="funil-stage"><div class="funil-label">Qualificados</div><div class="funil-num">\${fQualif}</div><div class="funil-pct">\${pctQ}%</div></div>
      \${arrowSvg(pctA)}
      <div class="funil-stage"><div class="funil-label">Agendados</div><div class="funil-num">\${fAgend}</div><div class="funil-pct">\${pctA}%</div></div>
      \${arrowSvg(pctC)}
      <div class="funil-stage"><div class="funil-label">Calls</div><div class="funil-num">\${fCalls}</div><div class="funil-pct">\${pctC}%</div></div>
      \${arrowSvg(pctV)}
      <div class="funil-stage"><div class="funil-label">Vendas</div><div class="funil-num" style="color:var(--gold)">\${fVendas}</div><div class="funil-pct">\${pctV}%</div></div>
    </div>
    <div class="inicio-agenda fdv-fade-up" style="animation-delay:0.44s">
      <div class="ia-header">
        \${_S('<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',15)}
        <span class="ia-title">Agenda de Hoje</span>
        <span class="ia-count">\${callsHoje} call\${callsHoje!==1?'s':''}</span>
      </div>
      \${callsHojeList.length ? callsHojeList.map(l => \`
        <div class="ia-row">
          <span class="ia-hora">\${l.horaagendamento?.slice(0,5)||'—'}</span>
          <button class="ia-nome nome-link" data-perfil="\${l.id}">\${esc(l.nome||'—')}</button>
          <span class="ia-closer">\${esc(CLOSERS[l.closer]?.name||l.closer||'—')}</span>
          \${badgeStatus(l.status)}
        </div>\`).join('') :
        '<div class="ia-empty">Nenhuma call agendada para hoje</div>'}
    </div>
  </div>\`;

  el.querySelectorAll('.ia-row [data-perfil]').forEach(btn => {
    btn.addEventListener('click', () => {
      const l = allLeads.find(x => x.id === btn.dataset.perfil);
      if (l) openPerfil(l);
    });
  });
}
`;

const newCode = code.slice(0, startIdx) + newFn + code.slice(endIdx);
fs.writeFileSync(appPath, newCode, 'utf8');
console.log('OK — renderInicio replaced, new fn length:', newFn.length);
