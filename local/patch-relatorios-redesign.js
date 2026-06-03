#!/usr/bin/env node
// Rewrite renderRelatorios() with the new multi-block design
const fs = require('fs'), path = require('path');
const appPath = path.join(__dirname, '../app/app.js');
let code = fs.readFileSync(appPath, 'utf8');
const lines = code.split('\n');

// 1. Add import for REL_CONFIG after last import line
const lastImport = lines.reduce((last, l, i) => l.startsWith('import ') ? i : last, -1);
lines.splice(lastImport + 1, 0, `import { REL_CONFIG } from './rel-config.js';`);
console.log('1. Import added at line', lastImport + 2);

// 2. Add state variable near other state vars
const stateIdx = lines.findIndex(l => l.includes("let _relChartDia"));
lines.splice(stateIdx, 0, `let relShowUTM        = false;  // toggle aba Análise de Tráfego`);
console.log('2. State var added');

code = lines.join('\n');

// 3. Find and replace the renderRelatorios section
const sectionStart = code.indexOf('// ─── RELATÓRIOS ──────────────────────────────────────────────────────\nfunction renderRelatorios()');
const nextSection  = code.indexOf('\n// ─── TABLE', sectionStart);
if (sectionStart === -1 || nextSection === -1) {
  console.error('Could not find renderRelatorios section:', sectionStart, nextSection);
  process.exit(1);
}
console.log('3. Section found, replacing...');

const newRelSection = `// ─── RELATÓRIOS ──────────────────────────────────────────────────────
// helpers
function _semaforo(val, cfg, lowerBetter) {
  if (lowerBetter) return val <= cfg.verde ? 'var(--green)' : val <= cfg.amarelo ? 'var(--gold)' : '#b05068';
  return val >= cfg.verde ? 'var(--green)' : val >= cfg.amarelo ? 'var(--gold)' : '#b05068';
}
function _healthBar(color, pct) {
  return \`<div class="rel-health-bar"><div class="rel-health-fill" style="width:\${Math.min(pct,100)}%;background:\${color}"></div></div>\`;
}
function _svgFunil(stages) {
  const W=320, SH=46, GAP=16, MAX=stages[0]?.val||1, MIN=56;
  const w = v => MIN + (W-MIN)*(Math.min(v,MAX)/MAX);
  const totalH = stages.length*(SH+GAP)-GAP;
  let svg = \`<svg viewBox="0 0 \${W} \${totalH}" width="100%" style="display:block;max-height:280px">\`;
  const COLORS = ['#1e4a5a','#173d4c','#10303e','#0a2330','#CE9221'];
  stages.forEach((s,i) => {
    const y=i*(SH+GAP), wTop=w(s.val), wBot=i<stages.length-1?w(stages[i+1].val):wTop*0.75;
    const lT=(W-wTop)/2, rT=lT+wTop, lB=(W-wBot)/2, rB=lB+wBot;
    const col=COLORS[Math.min(i,COLORS.length-1)];
    const advance = i<stages.length-1&&stages[i+1].val&&s.val ? Math.round(stages[i+1].val/s.val*100) : null;
    svg += \`<polygon points="\${lT},\${y} \${rT},\${y} \${rB},\${y+SH} \${lB},\${y+SH}" fill="\${col}" rx="4"/>\`;
    svg += \`<text x="\${W/2}" y="\${y+SH/2+2}" text-anchor="middle" fill="rgba(232,228,220,0.95)" font-size="15" font-weight="800" font-family="Red Hat Display,sans-serif">\${s.val}</text>\`;
    svg += \`<text x="\${W/2}" y="\${y+SH/2+14}" text-anchor="middle" fill="rgba(200,196,188,0.65)" font-size="9" font-weight="600">\${s.label.toUpperCase()}</text>\`;
    if(advance!==null) svg += \`<text x="\${W/2}" y="\${y+SH+10}" text-anchor="middle" fill="rgba(200,196,188,0.45)" font-size="9">\${advance}% avançaram</text>\`;
  });
  svg += '</svg>';
  return svg;
}
function _dualBar(volume, maxVol, conv, maxConv) {
  const vPct = maxVol ? Math.round(volume/maxVol*100) : 0;
  const cPct = maxConv ? Math.round(conv/maxConv*100) : 0;
  return \`<div class="rel-dual-bar-wrap">
    <div class="rel-dual-bar-row" title="\${volume} leads">
      <span class="rel-dual-bar-ico" style="color:var(--petro-l)">●</span>
      <div class="rel-dual-bar"><div style="width:\${vPct}%;background:var(--petro-l);height:6px;border-radius:3px"></div></div>
      <span class="rel-dual-num">\${volume}</span>
    </div>
    <div class="rel-dual-bar-row" title="\${conv}% conversão">
      <span class="rel-dual-bar-ico" style="color:var(--gold)">●</span>
      <div class="rel-dual-bar"><div style="width:\${cPct}%;background:var(--gold);height:6px;border-radius:3px"></div></div>
      <span class="rel-dual-num">\${conv}%</span>
    </div>
  </div>\`;
}
function _parseRenda(v) {
  if (!v) return 0;
  const n = String(v).match(/\\d[\\d.]*,?\\d*/);
  if (!n) return 0;
  return parseFloat(n[0].replace(/\\./g,'').replace(',','.')) || 0;
}

function renderRelatorios() {
  const mesFilt    = $('rel-filter-mes').value;
  const origemFilt = $('rel-filter-origem').value;

  let base = [...allLeads];
  if (mesFilt)    base = base.filter(l => (l.datachegada||'').startsWith(mesFilt));
  if (origemFilt) base = base.filter(l => l.origem === origemFilt);
  _relBase = base;

  const agendados  = base.filter(l => l.dataagendamento);
  const realizadas = base.filter(l => l.status === 'realizada');
  const noShows    = base.filter(l => l.status === 'noshow');
  const vendas     = base.filter(l => l.kanban_column === 'venda_ganha');

  const taxaComp    = agendados.length  ? pct(realizadas.length, agendados.length)  : 0;
  const taxaConv    = realizadas.length ? pct(vendas.length,     realizadas.length) : 0;
  const faturamento = vendas.reduce((s,l)=>s+parseValor(l.venda_ganha_dados?.valor),0);
  const ticketMedio = vendas.length ? Math.round(faturamento/vendas.length) : 0;

  // Velocidade: avg days datachegada → dataagendamento for realizadas
  const velocDias = (() => {
    const vals = realizadas.map(l => {
      const t1 = l.datachegada    ? new Date(l.datachegada)    : null;
      const t2 = l.dataagendamento? new Date(l.dataagendamento): null;
      return (t1&&t2&&t2>=t1) ? Math.round((t2-t1)/86400000) : null;
    }).filter(v=>v!==null);
    return vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : 0;
  })();

  // Bloco 2: funnel
  const fQualif = base.filter(l=>!['aguardando','descartado','cancelado'].includes(l.status)).length;
  const fAgend  = base.filter(l=>l.dataagendamento).length;
  const fCalls  = realizadas.length;
  const fVendas = vendas.length;
  const funnelStages = [
    { label:'Leads', val:base.length },
    { label:'Qualificados', val:fQualif },
    { label:'Agendados', val:fAgend },
    { label:'C. Realizadas', val:fCalls },
    { label:'Vendas', val:fVendas },
  ];

  // Bloco 3: canais
  const origemMap = {};
  base.forEach(l => {
    const o=l.origem||'Outros';
    if(!origemMap[o]) origemMap[o]={total:0,vendas:0,qualif:0};
    origemMap[o].total++;
    if(l.kanban_column==='venda_ganha') origemMap[o].vendas++;
    const renda = _parseRenda(l.renda);
    if(renda>=REL_CONFIG.rendaThreshold) origemMap[o].qualif++;
  });
  const canalRanking = Object.entries(origemMap)
    .map(([o,d])=>({o,...d,conv:d.total?pct(d.vendas,d.total):0,qualifPct:d.total?pct(d.qualif,d.total):0}))
    .sort((a,b)=>b.conv-a.conv||b.total-a.total);
  const maxVol  = Math.max(...canalRanking.map(r=>r.total),1);
  const maxConv = Math.max(...canalRanking.map(r=>r.conv),1);
  const topCanal= canalRanking[0];

  // Bloco 4: profissão e renda
  const profMap  = {}, rendaMap = {};
  const buildMap = (m,key,l)=>{ const v=(l[key]||'Não inf.').slice(0,25); m[v]=(m[v]||0)+1; };
  base.forEach(l=>{ buildMap(profMap,'profissao',l); buildMap(rendaMap,'renda',l); });
  const topN = (m,n=8) => Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,n);
  const profEntries = topN(profMap,7);
  const rendaEntries= topN(rendaMap,7);

  // Bloco 5: por closer
  const closerMap={}, respMap={};
  realizadas.forEach(l=>{
    const k=l.closer||'_sem';
    if(!closerMap[k]) closerMap[k]={ag:0,re:0,ns:0,ve:0,val:0};
    closerMap[k].re++;
    if(l.kanban_column==='venda_ganha'){closerMap[k].ve++;closerMap[k].val+=parseValor(l.venda_ganha_dados?.valor);}
  });
  agendados.forEach(l=>{ const k=l.closer||'_sem'; if(!closerMap[k]) closerMap[k]={ag:0,re:0,ns:0,ve:0,val:0}; closerMap[k].ag++; });
  noShows.forEach(l=>{ const k=l.closer||'_sem'; if(!closerMap[k]) closerMap[k]={ag:0,re:0,ns:0,ve:0,val:0}; closerMap[k].ns++; });
  agendados.forEach(l=>{ const r=l.agendadopor||'—'; if(!respMap[r]) respMap[r]={ag:0,re:0,ve:0}; respMap[r].ag++; if(l.status==='realizada') respMap[r].re++; if(l.kanban_column==='venda_ganha') respMap[r].ve++; });

  // Bloco 6: histórico mensal
  const mesMap = {};
  base.forEach(l=>{ if(!l.datachegada) return; const m=l.datachegada.slice(0,7); if(!mesMap[m]) mesMap[m]={total:0,re:0,ve:0,ns:0,val:0}; mesMap[m].total++; if(l.status==='realizada') mesMap[m].re++; if(l.kanban_column==='venda_ganha'){mesMap[m].ve++;mesMap[m].val+=parseValor(l.venda_ganha_dados?.valor);} if(l.status==='noshow') mesMap[m].ns++; });
  const mesEntries = Object.entries(mesMap).sort((a,b)=>b[0].localeCompare(a[0]));

  // UTM
  const hasUTM = base.some(l=>l.utm_campaign||l.utm_source||l.utm_content);
  const cleanUTMVal = v => (!v||/^\\{\\{.*\\}\\}$/.test(v.trim()))?null:v;
  const utmAgg = field => { const m={}; base.forEach(l=>{ const k=cleanUTMVal(l[field])||'Não identificado'; m[k]=(m[k]||{total:0,ve:0}); m[k].total++; if(l.kanban_column==='venda_ganha') m[k].ve++; }); return Object.entries(m).sort((a,b)=>b[1].total-a[1].total); };

  // Destroy charts
  [_relChart,_relChartDia,_relChartStatus,_relChartOrigem,_relChartProf,_relChartRenda]
    .forEach(c=>{try{c?.destroy();}catch(e){}});
  _relChart=_relChartDia=_relChartStatus=_relChartOrigem=_relChartProf=_relChartRenda=null;

  // ── UTM tab
  if (relShowUTM) {
    $('relatorios-content').innerHTML = \`
      <div class="rel-utm-tab">
        <button class="btn-ghost btn-sm" id="rel-utm-back" style="margin-bottom:20px">← Voltar ao Relatório</button>
        <div class="rel-section-head">Performance por Campanha</div>
        <div class="utm-tab-bar sub-nav" style="margin-bottom:14px">
          <button class="sub-link\${_utmTab==='utm_source'?' active':''}" data-utm-tab="utm_source">Por Origem</button>
          <button class="sub-link\${_utmTab==='utm_campaign'?' active':''}" data-utm-tab="utm_campaign">Por Campanha</button>
          <button class="sub-link\${_utmTab==='utm_content'?' active':''}" data-utm-tab="utm_content">Por Anúncio</button>
        </div>
        \${['utm_source','utm_campaign','utm_content'].map(field=>{
          const lbl={utm_source:'Origem',utm_campaign:'Campanha',utm_content:'Anúncio'}[field];
          const entries=utmAgg(field);
          return \`<div data-utm-panel="\${field}" \${_utmTab!==field?'style="display:none"':''}>
            <div class="utm-perf-panel"><table class="rel-table">
              <thead><tr><th>\${lbl}</th><th>Leads</th><th>Vendas</th><th>Conv.</th></tr></thead>
              <tbody>\${entries.map(([k,d])=>\`<tr class="rel-drill-row" data-drill="\${field}" data-drill-value="\${esc(k)}" data-drill-title="\${esc(lbl+': '+k)}"><td class="utm-name-cell" title="\${esc(k)}">\${esc(k)}</td><td>\${d.total}</td><td>\${d.ve}</td><td>\${d.total?pct(d.ve,d.total):0}%</td></tr>\`).join('')}</tbody>
            </table></div></div>\`;
        }).join('')}
      </div>\`;
    lucide.createIcons();
    $('rel-utm-back').addEventListener('click',()=>{ relShowUTM=false; renderRelatorios(); });
    document.querySelectorAll('[data-utm-tab]').forEach(b=>b.addEventListener('click',()=>{ _utmTab=b.dataset.utmTab; document.querySelectorAll('[data-utm-tab]').forEach(t=>t.classList.toggle('active',t.dataset.utmTab===_utmTab)); document.querySelectorAll('[data-utm-panel]').forEach(p=>{ p.style.display=p.dataset.utmPanel===_utmTab?'':'none'; }); }));
    return;
  }

  // ── MAIN VIEW
  const fmtC = n => n?n.toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:0,maximumFractionDigits:0}):'—';
  const cComp = _semaforo(taxaComp, REL_CONFIG.comparecimento, false);
  const cConv = _semaforo(taxaConv,  REL_CONFIG.conversao, false);
  const cVel  = _semaforo(velocDias, REL_CONFIG.velocidade, true);

  $('relatorios-content').innerHTML = \`

  <!-- Bloco 0: Saúde do funil -->
  <div class="rel-section-head">Saúde do Funil</div>
  <div class="rel-health-row">
    <div class="rel-health-card">
      \${_S('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>',24,';color:'+cComp)}
      <div class="rhc-body">
        <div class="rhc-val" style="color:\${cComp}">\${taxaComp}%</div>
        <div class="rhc-lbl">de comparecimento</div>
        <div class="rhc-ctx">\${realizadas.length} de \${agendados.length} agendados compareceram</div>
      </div>
      \${_healthBar(cComp, taxaComp)}
    </div>
    <div class="rel-health-card">
      \${_S('<circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/><path d="m9 12 2 2 4-4"/>',24,';color:'+cConv)}
      <div class="rhc-body">
        <div class="rhc-val" style="color:\${cConv}">\${taxaConv}%</div>
        <div class="rhc-lbl">de conversão</div>
        <div class="rhc-ctx">\${vendas.length} de \${realizadas.length} calls viraram venda</div>
      </div>
      \${_healthBar(cConv, taxaConv)}
    </div>
    <div class="rel-health-card">
      \${_S('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',24,';color:'+cVel)}
      <div class="rhc-body">
        <div class="rhc-val" style="color:\${cVel}">\${velocDias}d</div>
        <div class="rhc-lbl">velocidade do funil</div>
        <div class="rhc-ctx">dias em média do lead à call</div>
      </div>
      \${_healthBar(cVel, velocDias<=REL_CONFIG.velocidade.amarelo?Math.round(velocDias/REL_CONFIG.velocidade.amarelo*100):100)}
    </div>
  </div>

  <!-- Bloco 1: Métricas -->
  <div class="rel-section-head">Métricas do Período</div>
  <div class="stats-grid rel-summary">
    \${relStatCard('Total de Leads', base.length, _S('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'), '', 'data-drill="all" data-drill-title="Total de Leads"')}
    \${relStatCard('Comparecimento', taxaComp+'%', _S('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'), 'accent-petro', 'data-drill="status" data-drill-value="realizada" data-drill-title="Calls Realizadas"')}
    \${relStatCard('Conversão', taxaConv+'%', ICO_TROPHY, 'accent-green', 'data-drill="venda" data-drill-title="Vendas Ganhas"')}
    \${relStatCard('Faturamento', 'R$\\xa0'+fmtValor(faturamento), _S('<line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'), 'accent-sand', 'data-drill="venda" data-drill-title="Vendas Ganhas"')}
    \${relStatCard('Ticket Médio', ticketMedio?'R$\\xa0'+fmtValor(ticketMedio):'—', _S('<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>'), 'accent-gold')}
    \${relStatCard('Vendas', vendas.length, ICO_CHECK_CIRCLE, 'accent-gold', 'data-drill="venda" data-drill-title="Vendas Ganhas"')}
  </div>

  <!-- Bloco 2: Funil SVG -->
  <div class="rel-section-head">Funil de Conversão</div>
  <div class="rel-block" style="padding:28px;display:flex;gap:32px;align-items:center">
    <div style="flex:0 0 320px">\${_svgFunil(funnelStages)}</div>
    <div style="flex:1;display:flex;flex-direction:column;gap:12px">
      \${funnelStages.map((s,i)=>{
        const next=funnelStages[i+1];
        const adv=next&&s.val?pct(next.val,s.val):null;
        return \`<div class="rel-funil-row">
          <span class="rel-funil-lbl">\${s.label}</span>
          <span class="rel-funil-n">\${s.val}</span>
          \${adv!==null?'<span class="rel-funil-arrow">→ '+adv+'% avançaram</span>':''}
        </div>\`;
      }).join('')}
      \${velocDias>0?'<div class="rel-funil-tempo">Tempo médio lead → call: <strong>'+velocDias+' dias</strong></div>':''}
    </div>
  </div>

  <!-- Bloco 3: Canais -->
  <div class="rel-section-head">Canais — Ranqueados por Conversão</div>
  \${topCanal?'<div class="rel-top-canal">⭐ Top canal: <strong>'+esc(topCanal.o)+'</strong> — '+topCanal.total+' leads, '+topCanal.conv+'% de conversão</div>':''}
  <div class="rel-block">
    <table class="rel-table">
      <thead><tr>
        <th>Canal</th><th>Volume + Conversão</th><th>Perfil qualificado %
          <span class="rel-th-tooltip" title="Leads com renda ≥ R$ \${(REL_CONFIG.rendaThreshold).toLocaleString('pt-BR')}">?</span>
        </th><th>Leads</th><th>Conv.</th>
      </tr></thead>
      <tbody>\${canalRanking.map((r,i)=>
        \`<tr class="rel-drill-row" data-drill="origem" data-drill-value="\${esc(r.o)}" data-drill-title="Canal: \${esc(r.o)}">
          <td>\${i===0?'⭐ ':''}<strong>\${esc(r.o)}</strong></td>
          <td>\${_dualBar(r.total,maxVol,r.conv,100)}</td>
          <td><span class="rel-qual-pct" style="color:\${r.qualifPct>=50?'var(--green)':r.qualifPct>=25?'var(--gold)':'var(--t3)'}">\${r.qualifPct}%</span></td>
          <td>\${r.total}</td>
          <td>\${r.conv}%</td>
        </tr>\`).join('')}
      </tbody>
    </table>
  </div>

  <!-- Bloco 4: Perfil do Público -->
  <div class="rel-section-head" style="display:flex;align-items:center;gap:12px">
    Perfil do Público
    <div class="rel-perfil-filter">
      <button class="rel-pf-btn active" data-pf="todos">Todos os leads</button>
      <button class="rel-pf-btn" data-pf="compradores">Apenas compradores</button>
    </div>
  </div>
  <div class="rel-donuts-wrap">
    <div class="rel-donut-block">
      <div class="rel-donut-title">Por Profissão</div>
      <div class="rel-donut-container" data-chart="prof">
        <canvas id="rel-donut-prof" height="220"></canvas>
        <div class="rel-donut-center" id="rel-donut-prof-center">\${base.length}<br><span>leads</span></div>
      </div>
      <div class="rel-donut-legend" id="rel-donut-prof-leg"></div>
    </div>
    <div class="rel-donut-block">
      <div class="rel-donut-title">Por Faixa de Renda</div>
      <div class="rel-donut-container" data-chart="renda">
        <canvas id="rel-donut-renda" height="220"></canvas>
        <div class="rel-donut-center" id="rel-donut-renda-center">\${base.length}<br><span>leads</span></div>
      </div>
      <div class="rel-donut-legend" id="rel-donut-renda-leg"></div>
    </div>
  </div>

  <!-- Bloco 5: Equipe (duas tabelas lado a lado) -->
  <div class="rel-section-head">Performance da Equipe</div>
  <div class="rel-equipe-grid">
    \${relTable('Por Closer',['Closer','Agend.','C.Real.','No Shows','Vendas','Fat.','Conv.'],
      Object.entries(closerMap).map(([c,d])=>[CLOSERS[c]?.name||c,d.ag,d.re,d.ns,d.ve,d.val?'R$\\xa0'+fmtValor(d.val):'—',d.re?pct(d.ve,d.re)+'%':'—']),
      i=>{const e=Object.entries(closerMap);return {type:'closer',value:e[i][0],title:'Closer: '+(CLOSERS[e[i][0]]?.name||e[i][0])};}
    )}
    \${relTable('Por Responsável',['Responsável','Agend.','Realizadas','Vendas'],
      Object.entries(respMap).map(([r,d])=>[r,d.ag,d.re,d.ve]),
      i=>{const e=Object.entries(respMap);return {type:'resp',value:e[i][0],title:'Resp.: '+e[i][0]};}
    )}
  </div>

  <!-- Bloco 6: Histórico mensal -->
  <div class="rel-section-head">Histórico Mensal</div>
  \${relTable('',['Mês','Leads','C. Realizadas','No Shows','Vendas','Faturamento'],
    mesEntries.map(([m,d])=>[fmtMes(m),d.total,d.re,d.ns,d.ve,d.val?'R$\\xa0'+fmtValor(d.val):'—']),
    i=>{const e=mesEntries;return {type:'mes',value:e[i][0],title:'Mês: '+fmtMes(e[i][0])};}
  )}

  <!-- UTM card de destaque -->
  \${hasUTM&&topCanal?'<div class="rel-utm-cta rel-drill-row" id="rel-btn-utm">📡 Análise de Tráfego — '+esc(topCanal.o)+' trouxe '+topCanal.total+' leads · <u>ver análise completa</u></div>':''}

  \${!base.length?'<div class="agenda-empty"><h3>Sem dados</h3><p>Adicione leads ou ajuste os filtros.</p></div>':''}
  \`;

  lucide.createIcons();

  // Init donuts with IntersectionObserver
  const DONUT_COLORS = ['#CE9221','#4db5c8','#4caf8e','#d06070','#8fa0a2','#a07048','#6b8fa0'];
  let _donutsInited = false;
  function _buildDonuts(pfFilter) {
    const pool = pfFilter==='compradores' ? vendas : base;
    const mkMap=(f,n=7)=>{const m={};pool.forEach(l=>{const v=(l[f]||'Não inf.').slice(0,20);m[v]=(m[v]||0)+1;});return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,n);};
    const pE=mkMap('profissao'), rE=mkMap('renda');

    const initDonut=(canvasId,entries,centerEl,legEl)=>{
      const ctx=document.getElementById(canvasId)?.getContext('2d');
      if(!ctx) return null;
      const total=entries.reduce((s,[,v])=>s+v,0);
      if(centerEl) centerEl.innerHTML=total+'<br><span>leads</span>';
      if(legEl) legEl.innerHTML=entries.map(([l,v],i)=>\`<div class="rdl-item"><span class="rdl-dot" style="background:\${DONUT_COLORS[i%DONUT_COLORS.length]}"></span><span class="rdl-lbl" title="\${esc(l)}">\${esc(l)}</span><span class="rdl-val">\${v}</span></div>\`).join('');
      return new Chart(ctx,{type:'doughnut',data:{labels:entries.map(([l])=>l),datasets:[{data:entries.map(([,v])=>v),backgroundColor:DONUT_COLORS.slice(0,entries.length),borderWidth:2,borderColor:'#141a1c',hoverOffset:8}]},options:{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{display:false},tooltip:{backgroundColor:'rgba(15,12,8,0.92)',titleColor:'#e8e4dc',bodyColor:'#c8c4bc'}}}});
    };

    [_relChartProf,_relChartRenda].forEach(c=>{try{c?.destroy();}catch(e){}});
    _relChartProf = initDonut('rel-donut-prof', pE, document.getElementById('rel-donut-prof-center'), document.getElementById('rel-donut-prof-leg'));
    _relChartRenda= initDonut('rel-donut-renda',rE, document.getElementById('rel-donut-renda-center'),document.getElementById('rel-donut-renda-leg'));
  }

  const donutWrap = document.querySelector('.rel-donuts-wrap');
  if (donutWrap && typeof IntersectionObserver !== 'undefined') {
    const io = new IntersectionObserver(entries=>{
      if(entries[0].isIntersecting && !_donutsInited){ _donutsInited=true; _buildDonuts('todos'); io.unobserve(donutWrap); }
    },{threshold:0.1});
    io.observe(donutWrap);
  }

  // Profile filter pills
  document.querySelectorAll('.rel-pf-btn').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('.rel-pf-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    _buildDonuts(b.dataset.pf);
  }));

  // UTM CTA
  document.getElementById('rel-btn-utm')?.addEventListener('click',()=>{ relShowUTM=true; renderRelatorios(); });

  // Drill-down delegation (existing)
}
`;

code = code.slice(0, sectionStart) + newRelSection + '\n' + code.slice(nextSection);
fs.writeFileSync(appPath, code, 'utf8');
console.log('3. renderRelatorios replaced');

// 4. Add UTM button to rel-filters in index.html
const htmlPath = path.join(__dirname, '../app/index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
html = html.replace(
  '<button class="btn-ghost btn-sm" id="rel-export-csv">Exportar Planilha</button>',
  '<button class="btn-ghost btn-sm" id="rel-utm-toggle" style="border-color:rgba(77,181,200,0.4);color:var(--petro-l)">📡 Análise de Tráfego</button>\n      <button class="btn-ghost btn-sm" id="rel-export-csv">Exportar Planilha</button>'
);
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('4. UTM button added to HTML');

// 5. Add UTM toggle listener reference (add to bindEvents-like pattern in app.js)
let code2 = fs.readFileSync(appPath, 'utf8');
code2 = code2.replace(
  "  $('rel-export-csv')?.addEventListener('click', exportRelatoriosCSV);",
  "  $('rel-utm-toggle')?.addEventListener('click', () => { relShowUTM = !relShowUTM; renderRelatorios(); });\n  $('rel-export-csv')?.addEventListener('click', exportRelatoriosCSV);"
);
fs.writeFileSync(appPath, code2, 'utf8');
console.log('5. UTM toggle listener added');
console.log('Done!');
