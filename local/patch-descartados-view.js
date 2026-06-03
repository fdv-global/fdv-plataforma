#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const appPath = path.join(__dirname, '../app/app.js');
let code = fs.readFileSync(appPath, 'utf8');
const lines = code.split('\n');

// Find start/end of renderDescartadosView
const startLine = lines.findIndex(l => l.includes('function renderDescartadosView'));
let depth = 0, endLine = -1;
for (let i = startLine; i < lines.length; i++) {
  const l = lines[i];
  depth += (l.match(/\{/g)||[]).length;
  depth -= (l.match(/\}/g)||[]).length;
  if (depth === 0 && i > startLine) { endLine = i; break; }
}
console.log(`Replacing lines ${startLine+1}–${endLine+1}`);

const newFn = `function renderDescartadosView() {
  const el = $('closer-subview');
  if (!el) return;

  // Filtros persistentes entre re-renders
  if (!renderDescartadosView._f) renderDescartadosView._f = { closer:'', mes:'', motivo:'' };
  const flt = renderDescartadosView._f;

  const MOTIVO_LABEL = Object.fromEntries(MOTIVOS_DESCARTE.map(m => [m.id, m.label]));

  // Todos os descartados (para preencher os dropdowns)
  const allDesc = allLeads.filter(l => getLeadKanbanCol(l) === 'descartado');

  // Meses disponíveis
  const meses = [...new Set(
    allDesc.map(l => (l.kanban_column_since||l.atualizadoem||'').slice(0,7))
           .filter(m => /^\\d{4}-\\d{2}$/.test(m))
  )].sort().reverse();

  // Motivos disponíveis
  const motivosDisp = [...new Set(allDesc.map(l => l.motivo_descarte).filter(Boolean))];

  // Aplicar filtros
  let leads = allDesc;
  if (flt.closer)  leads = leads.filter(l => (l.closer||'') === flt.closer);
  if (flt.mes)     leads = leads.filter(l => (l.kanban_column_since||l.atualizadoem||'').startsWith(flt.mes));
  if (flt.motivo)  leads = leads.filter(l => l.motivo_descarte === flt.motivo);

  el.innerHTML = \`
    <div class="subview-header">
      <h2 class="subview-title"><i data-lucide="archive-x"></i> Descartados</h2>
      <span class="subview-count">\${leads.length} lead\${leads.length!==1?'s':''}</span>
    </div>
    <div class="desc-view-filters" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;padding:0 2px">
      <select class="filter-select" id="dv-closer" style="width:auto;min-width:140px">
        <option value="">Todos os closers</option>
        \${Object.entries(CLOSERS).map(([k,c])=>\`<option value="\${k}" \${flt.closer===k?'selected':''}>\${esc(c.name)}</option>\`).join('')}
      </select>
      <select class="filter-select" id="dv-mes" style="width:auto;min-width:140px">
        <option value="">Todos os meses</option>
        \${meses.map(m=>\`<option value="\${m}" \${flt.mes===m?'selected':''}>\${fmtMes(m)}</option>\`).join('')}
      </select>
      <select class="filter-select" id="dv-motivo" style="width:auto;min-width:160px">
        <option value="">Todos os motivos</option>
        \${motivosDisp.map(m=>\`<option value="\${m}" \${flt.motivo===m?'selected':''}>\${esc(MOTIVO_LABEL[m]||m)}</option>\`).join('')}
      </select>
      <button class="btn-ghost btn-sm" id="dv-limpar">Limpar</button>
    </div>
    \${leads.length === 0 ? '<p class="hist-empty" style="margin-top:32px">Nenhum lead descartado com esses filtros.</p>' : \`
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>Lead</th><th>Motivo</th><th>Closer</th><th>Descartado em</th><th>Ações</th>
        </tr></thead>
        <tbody>
          \${leads.map(l => \`<tr>
            <td><button class="link-btn" data-perfil="\${l.id}">\${esc(l.nome||'—')}</button></td>
            <td>\${esc(l.motivo_descarte_label || MOTIVO_LABEL[l.motivo_descarte] || l.motivo_descarte || '—')}</td>
            <td>\${esc(l.closer?(CLOSERS[l.closer]?.name||l.closer):'—')}</td>
            <td>\${fmtDate((l.kanban_column_since||l.atualizadoem||'').slice(0,10))}</td>
            <td class="cell-acoes">
              <button class="btn-ghost btn-sm btn-mover-kanban" data-id="\${l.id}" title="Mover de volta para o Kanban">\${ICO_UNDO} Kanban</button>
              <button class="btn-ghost btn-sm btn-wa-lead" data-id="\${l.id}" title="WhatsApp">\${ICO_MSG_CIRCLE}</button>
              <button class="btn-ghost btn-sm btn-ver-perfil" data-id="\${l.id}" title="Ver perfil">\${ICO_EYE||_S('<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',13)}</button>
            </td>
          </tr>\`).join('')}
        </tbody>
      </table>
    </div>\`}
  \`;
  lucide.createIcons({ nodes: [el] });

  // Filtros
  el.querySelector('#dv-closer')?.addEventListener('change',  e => { flt.closer = e.target.value;  renderDescartadosView(); });
  el.querySelector('#dv-mes')?.addEventListener('change',     e => { flt.mes    = e.target.value;  renderDescartadosView(); });
  el.querySelector('#dv-motivo')?.addEventListener('change',  e => { flt.motivo = e.target.value;  renderDescartadosView(); });
  el.querySelector('#dv-limpar')?.addEventListener('click',   () => { flt.closer=flt.mes=flt.motivo=''; renderDescartadosView(); });

  // Ações
  el.querySelectorAll('[data-perfil]').forEach(b =>
    b.addEventListener('click', () => { const l=allLeads.find(x=>x.id===b.dataset.perfil); if(l) openPerfil(l); })
  );
  el.querySelectorAll('.btn-wa-lead').forEach(b =>
    b.addEventListener('click', () => openWaChatFromLead(b.dataset.id))
  );
  el.querySelectorAll('.btn-ver-perfil').forEach(b =>
    b.addEventListener('click', () => { const l=allLeads.find(x=>x.id===b.dataset.id); if(l) openPerfil(l); })
  );
  el.querySelectorAll('.btn-mover-kanban').forEach(b =>
    b.addEventListener('click', async () => {
      const lid = b.dataset.id;
      const lead = allLeads.find(x=>x.id===lid);
      if (!lead) return;
      try {
        await saveLead(lid, {
          kanban_column:       'agendado',
          kanban_column_since: new Date().toISOString(),
          atualizadoem:        new Date().toISOString(),
        });
        toast(\`\${lead.nome} movido de volta para o Kanban.\`, 'ok');
      } catch(e) { console.error(e); toast('Erro ao mover lead.','err'); }
    })
  );
}`;

const newLines = [...lines.slice(0, startLine), ...newFn.split('\n'), ...lines.slice(endLine + 1)];
fs.writeFileSync(appPath, newLines.join('\n'), 'utf8');
console.log('renderDescartadosView replaced OK');
