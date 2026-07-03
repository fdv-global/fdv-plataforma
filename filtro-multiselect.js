// filtro-multiselect.js — Dropdown genérico de filtro (agrupamento + múltipla escolha opcional).
// Isolado: não depende de nenhuma tela ou de app.js. Cada tela instancia via createFiltroDropdown()
// e decide o que fazer com os valores selecionados (normalmente: filtrar `allLeads`).
// É a referência a reaproveitar por qualquer filtro futuro que precise de multi-seleção.

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let stylesInjected = false;
function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
.fms-wrap { position: relative; }
.fms-trigger {
  background: var(--s2); border: 1px solid var(--b0);
  border-radius: var(--r-sm); font-size: 13.5px; font-weight: 500;
  padding: 9px 30px 9px 12px; width: 100%; color: var(--t1);
  text-align: left; cursor: pointer; position: relative;
  transition: border-color var(--fast) var(--ease), box-shadow var(--fast) var(--ease);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;
}
.fms-trigger::after {
  content: ''; position: absolute; right: 11px; top: 50%; width: 10px; height: 6px;
  transform: translateY(-50%);
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath fill='%235e7578' d='M5 6 0 0h10z'/%3E%3C/svg%3E") no-repeat center;
}
.fms-trigger:focus, .fms-trigger.fms-open {
  outline: none; border-color: var(--gold-28);
  box-shadow: 0 0 0 3px var(--gold-10); background: var(--s3);
}
.fms-panel {
  position: absolute; top: calc(100% + 4px); left: 0; min-width: 100%; width: max-content; max-width: 320px;
  background: var(--s2); border: 1px solid var(--b0); border-radius: var(--r-sm);
  box-shadow: 0 8px 24px rgba(0,0,0,.35); z-index: 50; padding: 4px;
  max-height: 280px; overflow-y: auto; display: none;
}
.fms-panel.fms-visible { display: block; }
.fms-opt {
  display: flex; align-items: center; gap: 8px; padding: 7px 9px; border-radius: 6px;
  font-size: 13px; color: var(--t1); cursor: pointer; user-select: none;
}
.fms-opt:hover { background: var(--gold-10); }
.fms-opt input { accent-color: var(--gold); flex-shrink: 0; }
.fms-opt--all { border-bottom: 1px solid var(--b0); margin-bottom: 3px; padding-bottom: 9px; font-weight: 600; }
`;
  document.head.appendChild(style);
}

const openInstances = new Set();
let globalListenersBound = false;
function bindGlobalListeners() {
  if (globalListenersBound) return;
  globalListenersBound = true;
  document.addEventListener('click', (e) => {
    openInstances.forEach(inst => { if (!inst.el.contains(e.target)) inst.close(); });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') openInstances.forEach(inst => inst.close());
  });
}

/**
 * Cria um dropdown de filtro com agrupamento e (opcionalmente) múltipla escolha.
 *
 * @param {Object} config
 * @param {string} config.labelText     Texto do <label> (ex: "Renda")
 * @param {string} config.allLabel      Texto da opção "todas" (ex: "Todas")
 * @param {boolean} [config.multiplo]   Se true, permite selecionar mais de um grupo (checkboxes ficam abertas)
 * @param {(valores: string[]) => void} config.onChange  Chamado com os grupos selecionados a cada mudança
 * @returns {{
 *   el: HTMLElement,
 *   setOptions: (opcoes: string[]) => void,
 *   getValue: () => string[],
 *   setValue: (vals: string[]) => void,
 *   destroy: () => void,
 * }}
 */
export function createFiltroDropdown({ labelText, allLabel, multiplo = false, onChange }) {
  injectStyles();
  bindGlobalListeners();

  const uid = 'fms-' + Math.random().toString(36).slice(2, 9);

  const group = document.createElement('div');
  group.className = 'filter-group';
  group.innerHTML = `
    <label class="filter-label" for="${uid}">${escHtml(labelText)}</label>
    <div class="fms-wrap">
      <button type="button" class="fms-trigger" id="${uid}"></button>
      <div class="fms-panel"></div>
    </div>`;

  const trigger = group.querySelector('.fms-trigger');
  const panel   = group.querySelector('.fms-panel');

  let opcoes = [];
  let selecionados = [];

  function render() {
    panel.innerHTML = `
      <label class="fms-opt fms-opt--all">
        <input type="${multiplo ? 'checkbox' : 'radio'}" name="${uid}-opt" data-all="1" ${selecionados.length === 0 ? 'checked' : ''}>
        ${escHtml(allLabel)}
      </label>` +
      opcoes.map(v => `
      <label class="fms-opt">
        <input type="${multiplo ? 'checkbox' : 'radio'}" name="${uid}-opt" value="${escHtml(v)}" ${selecionados.includes(v) ? 'checked' : ''}>
        ${escHtml(v)}
      </label>`).join('');

    trigger.textContent = selecionados.length === 0
      ? allLabel
      : selecionados.length === 1
        ? selecionados[0]
        : `${selecionados.length} selecionadas`;

    panel.querySelector('[data-all]').addEventListener('change', () => {
      selecionados = [];
      render();
      onChange([...selecionados]);
      if (!multiplo) close();
    });

    panel.querySelectorAll('input:not([data-all])').forEach(input => {
      input.addEventListener('change', () => {
        if (multiplo) {
          selecionados = input.checked
            ? [...selecionados, input.value]
            : selecionados.filter(v => v !== input.value);
        } else {
          selecionados = input.checked ? [input.value] : [];
        }
        render();
        onChange([...selecionados]);
        if (!multiplo) close();
      });
    });
  }

  function open() {
    openInstances.forEach(inst => { if (inst !== api) inst.close(); });
    panel.classList.add('fms-visible');
    trigger.classList.add('fms-open');
  }
  function close() {
    panel.classList.remove('fms-visible');
    trigger.classList.remove('fms-open');
  }

  trigger.addEventListener('click', () => {
    panel.classList.contains('fms-visible') ? close() : open();
  });

  const api = {
    el: group,
    close,
    setOptions(novasOpcoes) {
      opcoes = [...novasOpcoes];
      selecionados = selecionados.filter(v => opcoes.includes(v));
      render();
    },
    getValue() { return [...selecionados]; },
    setValue(vals) {
      selecionados = multiplo
        ? [...vals].filter(v => opcoes.includes(v))
        : (vals[0] && opcoes.includes(vals[0]) ? [vals[0]] : []);
      render();
    },
    destroy() {
      openInstances.delete(api);
      group.remove();
    },
  };

  openInstances.add(api);
  render();
  return api;
}
