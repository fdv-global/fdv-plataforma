import { initializeApp, deleteApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { REL_CONFIG } from './rel-config.js';

// ─── GOOGLE CALENDAR OAUTH POPUP CALLBACK ───────────────────────────
// Roda no popup após redirect do Google — envia o code ao parent e fecha.
{
  const _p = new URLSearchParams(window.location.search);
  const _code = _p.get('code'), _state = _p.get('state') || '';
  if (_code && _state.startsWith('gcal_') && window.opener) {
    window.opener.postMessage({ type: 'gcal_oauth_code', code: _code, state: _state }, '*');
    window.close();
  }
}

const SB_URL     = 'https://yadxcbhginjvoemacdly.supabase.co';
const SB_ANON    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZHhjYmhnaW5qdm9lbWFjZGx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Njc5ODEsImV4cCI6MjA5MjU0Mzk4MX0.n0_WC_KDBX4kdag8N6dYe2Xs0E284U2JESmNKyWT4Wo';
// TODO: após aplicar supabase/migrations/003_anon_rls_policies.sql, remover SB_SERVICE_KEY
// e mudar createClient(SB_URL, SB_SERVICE_KEY) de volta para createClient(SB_URL, SB_ANON)
const SB_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZHhjYmhnaW5qdm9lbWFjZGx5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk2Nzk4MSwiZXhwIjoyMDkyNTQzOTgxfQ.Vp_JSA4ReP40a25L8GS7stNdROAy5YIIw-7HM98z_RY';

const _S = (d,w=13,extra='') => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;flex-shrink:0${extra}">${d}</svg>`;
const ICO_TRASH        = _S(`<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 7l16 0"/><path d="M10 11l0 6"/><path d="M14 11l0 6"/><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"/><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"/>`, 14);
const ICO_CALENDAR     = _S(`<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M4 11h16"/><path d="M11 15h1"/><path d="M12 15v3"/>`);
const ICO_SMARTPHONE   = _S(`<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>`);
const ICO_BAN          = _S(`<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>`);
const ICO_CHECK_SM     = _S(`<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l5 5l10 -10"/>`, 13, ';stroke-width:2.5');
const ICO_X_SM         = _S(`<path d="M18 6 6 18"/><path d="m6 6 12 12"/>`, 13, ';stroke-width:2.5');
const ICO_REFRESH      = _S(`<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12.5 21h-6.5a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v5"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M4 11h16"/><path d="M16 19h6"/><path d="M19 16v6"/>`);
const ICO_CLIPBOARD    = _S(`<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2"/><path d="M9 3m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v0a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z"/>`);
const ICO_CHECK_CIRCLE = _S(`<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>`, 14);
const ICO_X_CIRCLE     = _S(`<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>`, 14);
const ICO_UNDO         = _S(`<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4"/><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"/>`);
const ICO_MSG_CIRCLE   = _S(`<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9"/><path d="M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1"/>`);
const ICO_TROPHY       = _S(`<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>`, 14);
const ICO_ARROW_RIGHT  = _S(`<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>`);
const ICO_USER_PLUS    = _S(`<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>`, 14);
const ICO_STAR_SM      = _S(`<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`, 11, ';fill:currentColor');
const ICO_PIN_SM       = _S(`<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>`, 11);
const ICO_PENCIL       = _S(`<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1"/><path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415z"/><path d="M16 5l3 3"/>`);
const ICO_COPY         = _S(`<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>`, 13);
const ICO_TAG          = _S(`<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>`, 14);
const ICO_ALERT        = _S(`<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>`, 14);
const ICO_PHONE_CHECK  = _S(`<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5 -2.5l5 2v4a2 2 0 0 1 -2 2a16 16 0 0 1 -15 -15a2 2 0 0 1 2 -2"/><path d="M15 9l2 2l4 -4"/>`, 14);
const ICO_DISCARD      = _S(`<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M18 6l-12 12"/><path d="M6 6l12 12"/>`);

const MERGE_FIELDS = [
  { k:'nome',        lbl:'Nome' },
  { k:'celular',     lbl:'Celular' },
  { k:'email',       lbl:'Email' },
  { k:'instagram',   lbl:'Instagram' },
  { k:'profissao',   lbl:'Profissão' },
  { k:'renda',       lbl:'Renda' },
  { k:'origem',      lbl:'Origem' },
  { k:'observacoes', lbl:'Observações' },
];
const STATUS_RANK = { aguardando:0, qualificado:1, agendado:2, noshow:2, realizada:3, cancelado:0, descartado:0 };

// ─── CLOSERS ─────────────────────────────────────────────────────────
const CLOSERS = {
  fernanda: { name: 'Fernanda', waName: 'Fernanda Ayub',      icon: '⭐', color: '#CE9221', bg: 'rgba(206,146,33,.12)', calLink: 'https://calendar.app.google/hWWi6tVKAhoXg5cUA' },
  thomaz:   { name: 'Thomaz',   waName: 'Thomaz Empresarial', icon: '🧑', color: '#4db5c8', bg: 'rgba(77,181,200,.12)',  calLink: 'https://calendar.app.google/1heVe3395Tsk9GeM8' }
};

// ─── GOOGLE CALENDAR OAUTH ───────────────────────────────────────────
// OAuth client: fdv-calendario (projeto annular-cogency-492721-j8)
// Redirect URI autorizado: https://fdv-global.github.io/fdv-plataforma
// Credenciais buscadas em runtime da tabela app_settings no Supabase
// (não ficam no repositório)
const GCAL_REDIRECT_URI = 'https://fdv-global.github.io/fdv-plataforma';
const GCAL_SCOPE        = 'https://www.googleapis.com/auth/calendar.readonly';
let   _gcalCreds        = null; // { id, secret } — carregado uma vez

async function getGcalCreds() {
  if (_gcalCreds) return _gcalCreds;
  const { data, error } = await supabase
    .from('app_settings')
    .select('key,value')
    .in('key', ['gcal_client_id', 'gcal_client_secret']);
  if (error || !data?.length) throw new Error('Credenciais GCAL não encontradas. Insira gcal_client_id e gcal_client_secret em app_settings.');
  const m = Object.fromEntries(data.map(r => [r.key, r.value]));
  _gcalCreds = { id: m.gcal_client_id, secret: m.gcal_client_secret };
  return _gcalCreds;
}

// ─── ADMIN EMAILS — auto-provisionados como admin no primeiro login ──
const ADMIN_EMAILS = [
  'muyane.petters@faculdadedavida.com.br',
  'thomaz@faculdadedavida.com.br',
];

// ─── ROLE PERMISSIONS TEMPLATES ──────────────────────────────────────
const ROLE_PERMISSIONS = {
  admin:         { inicio:true,  comercial:true,  alunas:true,  financeiro:true,  whatsapp_tati:true,  whatsapp_fernanda:true,  whatsapp_thomaz:true,  usuarios:true  },
  ceo:           { inicio:true,  comercial:true,  alunas:true,  financeiro:true,  whatsapp_tati:false, whatsapp_fernanda:true,  whatsapp_thomaz:true,  usuarios:true  },
  cs_financeiro: { inicio:true,  comercial:false, alunas:true,  financeiro:true,  whatsapp_tati:true,  whatsapp_fernanda:false, whatsapp_thomaz:false, usuarios:false },
  comercial:     { inicio:true,  comercial:true,  alunas:false, financeiro:false, whatsapp_tati:false, whatsapp_fernanda:false, whatsapp_thomaz:false, usuarios:false },
};
const DEFAULT_PERMISSIONS = { inicio:true, comercial:false, alunas:false, financeiro:false, whatsapp_tati:false, whatsapp_fernanda:false, whatsapp_thomaz:false, usuarios:false };

// ─── DATE HELPERS ────────────────────────────────────────────────────
const DAYS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
function getDayOfWeek(dateStr) {
  if (!dateStr) return '';
  const [y,m,d] = dateStr.split('-').map(Number);
  return DAYS[new Date(y, m-1, d).getDay()];
}

// ─── FIREBASE CONFIG ─────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            'AIzaSyBdcF3cXNmfspkHJfd6MduhVl9s9lU9mDk',
  authDomain:        'faculdade-da-vida.firebaseapp.com',
  projectId:         'faculdade-da-vida',
  storageBucket:     'faculdade-da-vida.firebasestorage.app',
  messagingSenderId: '774662000211',
  appId:             '1:774662000211:web:61adc52edfdd339c0d00a6'
};

// ─── EVOLUTION API ───────────────────────────────────────────────────
const EVOLUTION_API_URL = 'https://ayub-evolution.8z6sbs.easypanel.host';
const EVOLUTION_API_KEY = '943BFEBDE2188DF38D176E5FC8AFD';

// ─── DEMO DATA ───────────────────────────────────────────────────────
const DEMO = [
  { id:'d1',  nome:'Ana Carolina Silva',    celular:'(11) 99876-5432', origem:'Instagram', profissao:'Professora',       renda:'R$ 4.500',  datachegada:'2026-04-01', status:'aguardando', etiquetas:['Bom'] },
  { id:'d2',  nome:'Roberto Mendes',        celular:'(21) 98765-4321', origem:'Indicação', profissao:'Analista de TI',   renda:'R$ 8.200',  datachegada:'2026-04-02', status:'agendado',  dataagendamento:'2026-04-10', horaagendamento:'14:30', closer:'fernanda', agendadopor:'Admin', etiquetas:['Super Lead'] },
  { id:'d3',  nome:'Mariana Fonseca',       celular:'(31) 97654-3210', origem:'Facebook',  profissao:'Enfermeira',       renda:'R$ 5.800',  datachegada:'2026-03-28', status:'realizada', resultado:'interessado', status_closer:'followup', etiquetas:['Neutro'] },
  { id:'d4',  nome:'Carlos Eduardo Lopes',  celular:'(41) 96543-2109', origem:'Google',    profissao:'Empresário',       renda:'R$ 15.000', datachegada:'2026-04-03', status:'aguardando', etiquetas:['Super Lead'] },
  { id:'d5',  nome:'Patrícia Oliveira',     celular:'(51) 95432-1098', origem:'WhatsApp',  profissao:'Nutricionista',    renda:'R$ 6.300',  datachegada:'2026-04-05', status:'aguardando' },
  { id:'d6',  nome:'Marcos Henrique Costa', celular:'(61) 94321-0987', origem:'Instagram', profissao:'Engenheiro Civil', renda:'R$ 12.000', datachegada:'2026-03-20', status:'realizada', kanban_column:'venda_ganha', venda_ganha_dados:{valor:'R$ 3.000', forma:'pix', programa:'Comunidade', obs:''}, closer:'thomaz', agendadopor:'Fernanda', etiquetas:['Bom'] },
  { id:'d7',  nome:'Juliana Alves',         celular:'(71) 93210-9876', origem:'Indicação', profissao:'Médica',           renda:'R$ 22.000', datachegada:'2026-04-06', status:'agendado',  dataagendamento:'2026-04-11', horaagendamento:'10:00', closer:'thomaz', agendadopor:'Admin', etiquetas:['Super Lead'] },
  { id:'d8',  nome:'Fernando Ribeiro',      celular:'(81) 92109-8765', origem:'Outros',    profissao:'Advogado',         renda:'R$ 9.500',  datachegada:'2026-03-15', status:'aguardando' },
  { id:'d9',  nome:'Camila Torres',         celular:'(11) 91098-7654', origem:'Instagram', profissao:'Designer',         renda:'R$ 7.200',  datachegada:'2026-04-07', status:'noshow', dataagendamento:'2026-04-08', closer:'fernanda' },
  { id:'d10', nome:'Rodrigo Neves',         celular:'(21) 90987-6543', origem:'Google',    profissao:'Contador',         renda:'R$ 10.800', datachegada:'2026-03-10', status:'realizada', kanban_column:'venda_perdida', status_closer:'venda_perdida', etiquetas:['Frio'] },
];

// ─── KANBAN CONFIG ───────────────────────────────────────────────────
const KANBAN_LS_KEY = 'fdv_kanban_columns'; // mantido para migração de dados legados
const DEFAULT_KANBAN_COLS = [
  { id: 'agendado',       label: 'Agendado' },
  { id: 'call_realizada', label: 'Call Realizada' },
  { id: 'negociacao',     label: 'Negociação' },
  { id: 'decisao',        label: 'Decisão' },
];
let _kanbanCols = null; // null = ainda não carregado; getKanbanCols() retorna DEFAULT até load

async function loadKanbanCols() {
  if (isLive) {
    try {
      const { data, error } = await supabase
        .from('kanban_columns')
        .select('slug,nome,ordem')
        .order('ordem', { ascending: true });
      if (!error && data && data.length > 0) {
        _kanbanCols = data.map(r => ({ id: r.slug, label: r.nome }));
        return;
      }
      // Tabela vazia — migrar localStorage ou semear defaults
      const lsCols = (() => {
        try { const s = localStorage.getItem(KANBAN_LS_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
      })();
      const toSeed = (lsCols && lsCols.length) ? lsCols : DEFAULT_KANBAN_COLS;
      await supabase.from('kanban_columns').insert(
        toSeed.map((c, i) => ({ slug: c.id, nome: c.label, ordem: i }))
      );
      localStorage.removeItem(KANBAN_LS_KEY);
      _kanbanCols = toSeed.map(c => ({ id: c.id, label: c.label }));
    } catch(e) {
      console.error('[FDV] loadKanbanCols:', e);
      _kanbanCols = structuredClone(DEFAULT_KANBAN_COLS);
    }
  } else {
    // Demo: localStorage com migração de IDs legados
    try {
      const s = localStorage.getItem(KANBAN_LS_KEY);
      if (s) {
        let cols = JSON.parse(s);
        cols = cols
          .filter(c => c.id !== 'venda_ganha' && c.id !== 'venda_perdida')
          .map(c => {
            if (c.id === 'fechamento') return { id: 'negociacao', label: c.label === 'Fechamento' ? 'Negociação' : c.label };
            if (c.id === 'followup')   return { id: 'decisao',    label: c.label === 'Follow Up'  ? 'Decisão'    : c.label };
            return c;
          });
        if (cols.length) { _kanbanCols = cols; return; }
      }
    } catch {}
    _kanbanCols = structuredClone(DEFAULT_KANBAN_COLS);
  }
}
function getKanbanCols() { return _kanbanCols || DEFAULT_KANBAN_COLS; }
function saveKanbanCols(cols) {
  _kanbanCols = cols;
  if (isLive) {
    supabase.from('kanban_columns')
      .upsert(cols.map((c, i) => ({ slug: c.id, nome: c.label, ordem: i })), { onConflict: 'slug' })
      .then(({ error }) => { if (error) console.error('[FDV] saveKanbanCols:', error); });
  } else {
    localStorage.setItem(KANBAN_LS_KEY, JSON.stringify(cols));
  }
}

// ─── STATE ───────────────────────────────────────────────────────────
let allLeads       = [];
let filteredLeads  = [];
let dupMap           = new Map(); // leadId → [dup leadId, ...]
let _mergeSelections = {};        // fieldKey → 'a' | 'b'
let _drillLeads      = [];        // leads do drill-down atual
let _drillTitle      = '';
let _drillStatusFilt = '';
let _relBase         = [];        // leads filtrados do último renderRelatorios()
let _utmTab          = 'utm_source'; // aba ativa em Performance por Campanha
let currentId      = null;
let modalMode      = 'agendar';
let supabase       = null;
let isLive         = false;
let currentUserDbId = null; // UUID do usuario na tabela Supabase
let selectedIds    = new Set();
let nsSelectedIds  = new Set();
let qualSelectedIds  = new Set();
let qualActiveTab    = 'sc';   // 'sc' | 'ec' | 'sr'
let qualActiveSubTab = 'c1';   // 'c1' | 'c2' | 'c3p' (only when qualActiveTab === 'ec')
let qualPage         = 1;
let qualPageSize     = 10;
let perfilLeadId  = null;
let novoLeadId    = null;
let auth          = null;
let storage       = null;
let currentUser        = null;
let currentRole        = null;
let currentPermissions = {};
let leadsLoaded   = false;
let usuariosUnsub = null;
let allUsuarios   = [];
let activeTab     = 'inicio';
let activeSub     = 'novos';
let dragLeadId    = null;
let dragColId     = null;
let closerView    = 'kanban'; // 'kanban' | 'vendas' | 'descartados'
let activeAgendadosSub   = 'hoje'; // 'hoje' | 'todos' | 'briefing'
let activeSucessoSub    = null;   // null = landing page
let activeFinanceiroSub = null;   // null = landing page
let allAlunas           = [];
let allSessoes          = [];
let allContratos        = [];
let alunasLoaded        = false;
let alunaEdit           = null;   // null = nova, obj = editar
let relFiltProduto      = '';
let relFiltMes          = '';
let relFiltResp         = '';
let sessaoEdit          = null;
let contratoEdit        = null;
let sessaoAlunaId       = null;
let contratoAlunaId     = null;

// Descarte state
let descarteLeadId   = null;
let descarteSelected = null;
let descarteContext  = 'agendamentos'; // 'agendamentos' | 'kanban'
let bulkDescarteIds  = null; // array quando descarte em massa, null em modo individual
let cal = { step: 1, closer: null, leadSnap: null };
let agendaCalYear  = 0;
let agendaCalMonth = 0;

// WhatsApp state
let waInstances        = [];
let waInstancesLoaded  = false;
let activeWaSub        = 'chats';
let qrInstanceId       = null;
let qrTimerInterval    = null;
let qrPollingInterval  = null;
let qrSecondsLeft      = 60;

// Chat state
let chatLeadId         = null;
let chatContactId      = null;
let chatUnsubscribe    = null;
let chatMessages       = [];
let chatActiveSide     = null;
let chatSearchQuery    = '';
let chatMsgSearch      = '';   // busca dentro da conversa aberta
let chatReplyTo        = null; // { id, text, sender }
let chatTypingTimer    = null;
let chatTypingUnsub    = null;
let chatQuickFilter    = 'all'; // 'all' | 'unread' | 'starred' | 'archived'
let mediaRecorder      = null;
let audioChunks        = [];
let isRecording        = false;

// WhatsApp contacts (unknown numbers, not yet leads)
let allContacts        = [];
let contactsLoaded     = false;
let leadLabelsCache    = {};   // { leadId: [{id,nome,cor}] }
let labelsData         = [];
let quickReplies       = [];
let waContactPhotos    = {};   // { phone: url|null } — null = fetched, no photo

// Motivo de perda state
let mpLeadId  = null;
let mpSelected = null;

// Kanban search
let kanbanSearchText = '';
let _expandedCardId  = null; // ID do card do kanban atualmente expandido
let _relChart        = null; // Instância Chart.js do comparativo mensal
let relShowUTM        = false;  // toggle aba Análise de Tráfego
let _relChartDia     = null; // Leads por dia

// Notification state
let notifUnsub = null;
let allNotifs  = [];

// ─── MOTIVOS DE PERDA ────────────────────────────────────────────────
const MOTIVOS_PERDA = [
  {
    catLabel: 'Financeiro', catIcon: 'dollar-sign',
    items: [
      { id: 'sem_condicoes', icon: 'wallet',       label: 'Sem condições financeiras no momento' },
      { id: 'valor_alto',    icon: 'trending-down', label: 'Valor acima do orçamento' },
    ]
  },
  {
    catLabel: 'Perfil', catIcon: 'user',
    items: [
      { id: 'sem_perfil',  icon: 'user-x',       label: 'Não tem o perfil ideal para o programa' },
      { id: 'momento_vida',icon: 'clock',         label: 'Momento de vida não adequado' },
      { id: 'expectativas',icon: 'alert-circle',  label: 'Expectativas não alinhadas com o programa' },
    ]
  },
  {
    catLabel: 'Contato', catIcon: 'phone-off',
    items: [
      { id: 'sem_resposta',  icon: 'message-x', label: 'Não respondeu após follow up' },
      { id: 'desapareceu',   icon: 'ghost',     label: 'Desapareceu após a call' },
      { id: 'numero_errado', icon: 'phone-off', label: 'Número errado/inativo' },
    ]
  },
  {
    catLabel: 'Outro', catIcon: 'file-text',
    items: [
      { id: 'outro', icon: 'pencil', label: 'Outro (campo livre)' },
    ]
  },
];

const MOTIVOS_DESCARTE = [
  { id: 'sem_perfil_financeiro', label: 'Sem perfil financeiro' },
  { id: 'sem_interesse',         label: 'Sem interesse' },
  { id: 'nao_respondeu',         label: 'Não respondeu' },
  { id: 'ja_aluna',              label: 'Já é aluna' },
  { id: 'fora_publico',          label: 'Fora do público' },
  { id: 'outro',                 label: 'Outro (campo livre)' },
];

const ETIQUETAS_DEFAULT = ['Super Lead', 'Bom', 'Neutro', 'Frio'];

// ─── ETIQUETA COLORS ─────────────────────────────────────────────────
const ETIQUETA_COLORS_KEY = 'fdv_etiqueta_colors';
const ETIQUETA_COLORS_DEF = {
  'Super Lead': '#CE9221',
  'Bom':        '#4caf8e',
  'Neutro':     '#4db5c8',
  'Frio':       '#6B2737',
};
function getEtiquetaColors() {
  try { const s = localStorage.getItem(ETIQUETA_COLORS_KEY); if (s) return { ...ETIQUETA_COLORS_DEF, ...JSON.parse(s) }; } catch(e) {}
  return { ...ETIQUETA_COLORS_DEF };
}
function saveEtiquetaColor(tag, color) {
  const s = localStorage.getItem(ETIQUETA_COLORS_KEY);
  const obj = s ? JSON.parse(s) : {};
  obj[tag] = color; localStorage.setItem(ETIQUETA_COLORS_KEY, JSON.stringify(obj));
}
function etiquetaChip(tag, sm = false) {
  const hex = getEtiquetaColors()[tag];
  let style = '';
  if (hex) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    style = ` style="background:linear-gradient(135deg,rgba(${r},${g},${b},.22) 0%,rgba(${r},${g},${b},.10) 100%);border-color:rgba(${r},${g},${b},.44);color:${hex}"`;
  }
  return `<span class="etiqueta-chip${sm?' etiqueta-chip--sm':''}"${style}>${esc(tag)}</span>`;
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────
function initSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  if (!sidebar) return;

  // Chevrons de todos os grupos expansíveis — accordion: só um aberto por vez
  document.querySelectorAll('.sidebar-chevron-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const group = btn.closest('.sidebar-group');
      const isOpen = group?.classList.contains('open');
      document.querySelectorAll('.sidebar-group.open').forEach(g => g.classList.remove('open'));
      if (!isOpen) group?.classList.add('open');
    });
  });

  // Delegação de navegação — todos os itens com data-tab
  document.querySelectorAll('#app-sidebar .sidebar-item[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  updateSidebarActive(activeTab);
}

function updateSidebarActive(tab) {
  const GROUP_TABS = {
    'sidebar-group-comercial':  ['comercial','agendamentos','closer','relatorios'],
    'sidebar-group-alunas':     ['sucesso','alunas-sessoes','alunas-contratos','alunas-relatorios'],
    'sidebar-group-financeiro': ['financeiro','financeiro-inadimplencia','financeiro-pagamentos','financeiro-relatorios'],
  };
  document.querySelectorAll('#app-sidebar .sidebar-item[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  const sidebar = document.getElementById('app-sidebar');
  Object.entries(GROUP_TABS).forEach(([id, tabs]) => {
    const group = document.getElementById(id);
    if (group && tabs.includes(tab)) group.classList.add('open');
  });
}

const _BC_MAP = {
  comercial:    [['Comercial', null]],
  agendamentos: [['Comercial', 'comercial'], ['Agendamentos', null]],
  closer:       [['Comercial', 'comercial'], ['Closer', null]],
  relatorios:   [['Comercial', 'comercial'], ['Relatórios', null]],
  sucesso:               [['Alunas', null]],
  'alunas-sessoes':      [['Alunas', 'sucesso'], ['Sessões', null]],
  'alunas-contratos':    [['Alunas', 'sucesso'], ['Contratos', null]],
  'alunas-relatorios':   [['Alunas', 'sucesso'], ['Relatórios', null]],
  financeiro:                  [['Financeiro', null]],
  'financeiro-inadimplencia':  [['Financeiro', 'financeiro'], ['Inadimplência', null]],
  'financeiro-pagamentos':     [['Financeiro', 'financeiro'], ['Pagamentos', null]],
  'financeiro-relatorios':     [['Financeiro', 'financeiro'], ['Relatórios', null]],
  whatsapp:     [['WhatsApp', null]],
  usuarios:     [['Usuários', null]],
};

function updateBreadcrumb() {
  const el = document.getElementById('app-breadcrumb');
  if (!el) return;
  const crumbs = _BC_MAP[activeTab] || null;
  if (!crumbs) { el.innerHTML = ''; return; }
  el.innerHTML = crumbs.map((c, i) => {
    const [label, goTab] = c;
    const isLast = i === crumbs.length - 1;
    const sep    = i > 0 ? '<span class="bc-sep">›</span>' : '';
    if (isLast) return sep + `<span class="bc-current">${label}</span>`;
    return sep + `<button class="bc-link" onclick="switchTab('${goTab}')">${label}</button>`;
  }).join('');
}

// ─── AUTH ────────────────────────────────────────────────────────────
function initAuth() {
  // Bypass de autenticação para validação visual local — ativado via ?preview na URL
  if (new URLSearchParams(location.search).has('preview')) {
    supabase = createClient(SB_URL, SB_SERVICE_KEY);
    currentRole = 'admin';
    currentPermissions = { ...ROLE_PERMISSIONS.admin };
    document.getElementById('login-screen')?.style.setProperty('display', 'none', 'important');
    document.getElementById('app')?.style.setProperty('display', 'block', 'important');
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
    applyPermissionsToUI();
    if (!leadsLoaded) { leadsLoaded = true; loadLeads(); }
    switchTab('inicio');
    initSidebar();
    return;
  }

  isLive = initFirebase();
  if (!isLive) {
    document.getElementById('login-screen').style.setProperty('display', 'none', 'important');
    document.getElementById('app').style.setProperty('display', 'block', 'important');
    loadLeads();
    return;
  }
  auth = getAuth();
  console.log('[FDV] Auth inicializado, aguardando estado...');
  onAuthStateChanged(auth, async user => {
    console.log('[FDV] onAuthStateChanged:', user ? `uid=${user.uid} email=${user.email}` : 'null (não logado)');
    if (user) {
      const role = await resolveRole(user);
      console.log('[FDV] role resolvida:', role);
      if (!role) { console.warn('[FDV] role nula — tela não muda'); return; }
      currentUser = user;
      currentRole = role;
      const loginEl = document.getElementById('login-screen');
      const appEl   = document.getElementById('app');
      console.log('[FDV] elementos encontrados: login-screen=', !!loginEl, 'app=', !!appEl);
      if (loginEl) loginEl.style.setProperty('display', 'none', 'important');
      if (appEl)   appEl.style.setProperty('display', 'block', 'important');
      console.log('[FDV] display após update: login-screen=', loginEl?.style.display, 'app=', appEl?.style.display);
      $('user-name').textContent = user.displayName || user.email;
      document.querySelectorAll('.admin-only').forEach(el =>
        el.style.display = role === 'admin' ? '' : 'none'
      );
      applyPermissionsToUI();
      loadCurrentUserProfile(user.uid);
      if (!leadsLoaded) { leadsLoaded = true; loadLeads(); }
      if (hasPerm('usuarios')) loadUsuarios();
      loadNotifications(user.uid);
      switchTab('inicio');
      initSidebar();
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } else {
      currentUser = null;
      currentRole = null;
      document.getElementById('login-screen').style.setProperty('display', 'flex', 'important');
      document.getElementById('app').style.setProperty('display', 'none', 'important');
      leadsLoaded = false;
      if (usuariosUnsub) { usuariosUnsub(); usuariosUnsub = null; }
      if (notifUnsub)    { notifUnsub();    notifUnsub    = null; }
      allNotifs = [];
      renderNotifPanel();
    }
  });
}

async function loadCurrentUserProfile(uid) {
  try {
    const { data: d } = await supabase.from('usuarios').select('*').eq('firebase_uid', uid).maybeSingle();
    if (!d) return;
    if (d.nome) $('user-name').textContent = d.nome;
    const av = $('user-avatar');
    if (d.photo_url) { av.src = d.photo_url; av.style.display = ''; }
    else av.style.display = 'none';
  } catch(_) {}
}

function applyPermissionsToUI() {
  const TAB_PERM = {
    inicio: 'inicio', comercial: 'comercial', agendamentos: 'comercial',
    closer: 'comercial', relatorios: 'comercial',
    sucesso: 'alunas', 'alunas-sessoes': 'alunas', 'alunas-contratos': 'alunas', 'alunas-relatorios': 'alunas',
    financeiro: 'financeiro', 'financeiro-inadimplencia': 'financeiro', 'financeiro-pagamentos': 'financeiro', 'financeiro-relatorios': 'financeiro',
    usuarios: 'usuarios',
  };
  document.querySelectorAll('.nav-link[data-tab], #app-sidebar .sidebar-item[data-tab]').forEach(el => {
    const tab = el.dataset.tab;
    if (tab === 'whatsapp') {
      el.style.display = (hasPerm('whatsapp_tati') || hasPerm('whatsapp_fernanda') || hasPerm('whatsapp_thomaz')) ? '' : 'none';
    } else {
      const key = TAB_PERM[tab];
      el.style.display = (!key || hasPerm(key)) ? '' : 'none';
    }
  });
}

async function resolveRole(user) {
  console.log('[FDV] resolveRole: buscando usuario no Supabase para', user.email);
  try {
    const { data: userRow, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('firebase_uid', user.uid)
      .maybeSingle();

    if (error) throw error;

    if (userRow) {
      console.log('[FDV] resolveRole: encontrado', userRow);
      if (!userRow.ativo) {
        await signOut(auth);
        showLoginErro('Conta desativada. Contate o administrador.');
        return null;
      }
      currentUserDbId    = userRow.id;
      currentPermissions = userRow.permissions || ROLE_PERMISSIONS[userRow.role] || { ...DEFAULT_PERMISSIONS };
      if (userRow.senha_temp) {
        supabase.from('usuarios').update({ senha_temp: null }).eq('id', userRow.id).then(() => {});
      }
      return userRow.role || (ADMIN_EMAILS.includes(user.email) ? 'admin' : null);
    }

    // Não existe — provisionar admin se email autorizado
    console.log('[FDV] resolveRole: sem registro, checando ADMIN_EMAILS para', user.email);
    if (ADMIN_EMAILS.includes(user.email)) {
      console.log('[FDV] resolveRole: provisionando admin no Supabase...');
      try {
        const { data: newUser, error: insErr } = await supabase
          .from('usuarios')
          .insert({ firebase_uid: user.uid, email: user.email, nome: user.email.split('@')[0], role: 'admin', ativo: true, permissions: ROLE_PERMISSIONS.admin })
          .select()
          .single();
        if (!insErr && newUser) currentUserDbId = newUser.id;
        console.log('[FDV] resolveRole: admin provisionado');
      } catch(writeErr) {
        console.warn('[FDV] resolveRole: falha ao provisionar admin:', writeErr.message);
      }
      currentPermissions = { ...ROLE_PERMISSIONS.admin };
      return 'admin';
    }

    await signOut(auth);
    showLoginErro('Usuário não cadastrado no sistema.');
    return null;
  } catch(e) {
    console.error('[FDV] resolveRole ERRO:', e.message);
    if (ADMIN_EMAILS.includes(user.email)) {
      console.warn('[FDV] resolveRole: erro Supabase, fallback admin para email conhecido');
      return 'admin';
    }
    showLoginErro('Erro ao verificar permissões. Tente novamente.');
    return null;
  }
}

async function loginWithEmail() {
  const email = $('login-email').value.trim();
  const senha = $('login-senha').value;
  const btn = $('btn-login-email'), err = $('login-error');
  if (!email || !senha) { showLoginErro('Preencha email e senha.'); return; }
  console.log('[FDV] loginWithEmail: tentando login para', email);
  console.log('[FDV] loginWithEmail: auth =', auth);
  btn.disabled = true; err.style.display = 'none';
  try {
    const cred = await signInWithEmailAndPassword(auth, email, senha);
    console.log('[FDV] loginWithEmail: sucesso! uid=', cred.user.uid);
  }
  catch(e) {
    console.error('[FDV] loginWithEmail ERRO:', e.code, e.message);
    const msgs = {
      'auth/user-not-found':    'Usuário não encontrado.',
      'auth/wrong-password':    'Senha incorreta.',
      'auth/invalid-credential':'Email ou senha incorretos.',
      'auth/too-many-requests': 'Muitas tentativas. Tente mais tarde.',
      'auth/invalid-email':     'Email inválido.',
    };
    showLoginErro(msgs[e.code] || `Erro: ${e.code}`);
  }
  finally { btn.disabled = false; }
}

async function esqueceuSenha() {
  const email = $('login-email').value.trim();
  if (!email) { showLoginErro('Digite seu email para recuperar a senha.'); return; }
  try {
    await sendPasswordResetEmail(auth, email);
    showLoginErro('Email de recuperação enviado! Verifique sua caixa de entrada.');
  } catch(e) { showLoginErro('Erro ao enviar email. Verifique o endereço.'); }
}

function showLoginErro(msg) {
  const err = $('login-error');
  err.textContent = msg; err.style.display = 'block';
}

async function logoutUser() {
  try { leadsLoaded = false; await signOut(auth); } catch(e) { console.error(e); }
}

// ─── USUÁRIOS ─────────────────────────────────────────────────────────
function loadUsuarios() {
  if (usuariosUnsub) return;
  const fetch = () => supabase.from('usuarios').select('*').order('criadoem')
    .then(({ data }) => { if (data) { allUsuarios = data.map(mapUsuario); renderUsuarios(allUsuarios); } });
  fetch();
  const ch = supabase.channel('usuarios_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, fetch)
    .subscribe();
  usuariosUnsub = () => { supabase.removeChannel(ch); usuariosUnsub = null; };
}

function renderUsuarios(lista) {
  const tbody = $('usuarios-tbody');
  if (!tbody) return;
  const ROLE_LABELS = { admin:'Admin', ceo:'CEO', cs_financeiro:'CS / Financeiro', comercial:'Comercial', closer:'Closer', operacoes:'Operações' };
  const ROLE_CLS    = { admin:'accent-gold', ceo:'accent-petro', cs_financeiro:'accent-green', comercial:'accent-sand', closer:'accent-petro', operacoes:'accent-sand' };
  const roleBadge = role => `<span class="lead-status-badge ${ROLE_CLS[role]||''}">${ROLE_LABELS[role]||role}</span>`;
  const roleOpts  = Object.entries(ROLE_LABELS).map(([v,l]) => `<option value="${v}">${l}</option>`).join('');
  tbody.innerHTML = lista.map(u => {
    const initials = esc((u.nome||u.email||'?')[0].toUpperCase());
    const avatar   = u.photoURL
      ? `<img class="usuario-avatar" src="${esc(u.photoURL)}" alt="">`
      : `<span class="usuario-avatar usuario-avatar--initials">${initials}</span>`;
    const sel = `<select class="filter-select usuario-role-sel" data-uid="${u.id}">${roleOpts.replace(`value="${u.role||''}"`,`value="${u.role||''}" selected`)}</select>`;
    return `
    <tr>
      <td><div class="usuario-nome-cell">${avatar}<span>${esc(u.nome||'—')}</span></div></td>
      <td>${esc(u.email)}</td>
      <td>${sel}</td>
      <td>${roleBadge(u.role)}</td>
      <td><span class="lead-status-badge ${u.ativo?'accent-green':'accent-marsala'}">${u.ativo?'Ativo':'Inativo'}</span></td>
      <td class="usuario-acoes">
        <button class="btn-ghost btn-sm usuario-edit-btn" data-uid="${u.id}">Editar</button>
        <button class="btn-ghost btn-sm" data-reenviar="${u.id}" title="Gera nova senha e envia por email">Reenviar</button>
        <button class="btn-icon" data-copiar-wa="${u.id}" title="Copiar credenciais para WhatsApp"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8fa0a2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;flex-shrink:0"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg></button>
        <button class="btn-icon btn-destructive usuario-delete-btn" data-uid="${u.id}" data-nome="${esc(u.nome||u.email)}" title="Excluir usuário">${ICO_TRASH}</button>
      </td>
    </tr>`;
  }).join('');
}

const PERM_LABELS = {
  inicio:'Início', comercial:'Comercial', alunas:'Alunas (Sucesso)',
  financeiro:'Financeiro', whatsapp_tati:'WhatsApp Tati',
  whatsapp_fernanda:'WhatsApp Fernanda', whatsapp_thomaz:'WhatsApp Thomaz',
  usuarios:'Usuários',
};

function renderPermCheckboxes(gridId, perms) {
  const grid = $(gridId); if (!grid) return;
  grid.innerHTML = Object.entries(PERM_LABELS).map(([key, lbl]) =>
    `<label class="perm-check-label">
      <input type="checkbox" class="perm-check" data-key="${key}"${perms[key] ? ' checked' : ''}>
      <span>${lbl}</span>
    </label>`
  ).join('');
}

function readPermCheckboxes(gridId) {
  const out = {};
  document.querySelectorAll(`#${gridId} .perm-check`).forEach(cb => { out[cb.dataset.key] = cb.checked; });
  return out;
}

async function toggleAtivoUsuario(uid, ativo) {
  if (ativo && !confirm('Desativar este usuário? Ele perderá o acesso ao sistema.')) return;
  try {
    const { error } = await supabase.from('usuarios').update({ ativo: !ativo }).eq('id', uid);
    if (error) throw error;
    toast(ativo ? 'Usuário desativado.' : 'Usuário ativado.', 'ok');
  } catch(e) { console.error('[FDV] toggleAtivo:', e); toast('Erro ao atualizar usuário.', 'err'); }
}

async function deleteUsuario(uid, nome) {
  if (!confirm(`Excluir "${nome}"?\nEsta ação não pode ser desfeita.`)) return;
  try {
    const { error } = await supabase.from('usuarios').delete().eq('id', uid);
    if (error) throw error;
    toast('Usuário excluído.', 'ok');
  } catch(e) { console.error('[FDV] deleteUsuario:', e); toast('Erro ao excluir usuário.', 'err'); }
}

function openEditarUsuario(uid) {
  const u = allUsuarios.find(x => x.id === uid);
  if (!u) return;
  $('eu-uid').value = uid;
  $('eu-nome').value = u.nome || '';
  $('eu-email').value = u.email || '';
  $('eu-role').value = u.role || 'closer';
  const perms = u.permissions || ROLE_PERMISSIONS[u.role] || { ...DEFAULT_PERMISSIONS };
  renderPermCheckboxes('eu-perm-grid', perms);
  const preview = $('eu-foto-preview');
  if (u.photoURL) { preview.src = u.photoURL; preview.style.display = ''; }
  else { preview.src = ''; preview.style.display = 'none'; }
  $('eu-foto').value = '';
  $('eu-foto-label-text').textContent = 'Trocar foto…';
  $('eu-error').style.display = 'none';
  $('editar-usuario-backdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeEditarUsuario() {
  $('editar-usuario-backdrop').classList.remove('open');
  document.body.style.overflow = '';
}

async function salvarEditarUsuario() {
  const uid   = $('eu-uid').value;
  const nome  = $('eu-nome').value.trim();
  const email = $('eu-email').value.trim();
  const role  = $('eu-role').value;
  const errEl = $('eu-error');
  if (!nome || !email) { errEl.textContent = 'Preencha nome e email.'; errEl.style.display = 'block'; return; }
  const btn = $('btn-salvar-editar-usuario');
  btn.disabled = true; btn.textContent = 'Salvando…'; errEl.style.display = 'none';
  try {
    let photoURL;
    const fotoFile = $('eu-foto')?.files?.[0];
    if (fotoFile && storage) {
      const sRef = storageRef(storage, `usuarios/${uid}/foto`);
      await uploadBytes(sRef, fotoFile);
      photoURL = await getDownloadURL(sRef);
    }
    const permissions = readPermCheckboxes('eu-perm-grid');
    const { error: updErr } = await supabase.from('usuarios')
      .update({ nome, email, role, permissions, ...(photoURL && { photo_url: photoURL }) }).eq('id', uid);
    if (updErr) throw updErr;
    closeEditarUsuario();
    toast('Usuário atualizado.', 'ok');
  } catch(e) {
    errEl.textContent = 'Erro ao salvar: ' + (e.message || e.code);
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false; btn.textContent = 'Salvar';
  }
}

async function updateRoleUsuario(uid, role) {
  try { await supabase.from('usuarios').update({ role }).eq('id', uid); }
  catch(e) { console.error('[FDV] updateRole:', e); }
}

function openNovoUsuario() {
  ['nu-nome','nu-email','nu-senha'].forEach(id => $(id).value = '');
  $('nu-role').value = 'closer';
  renderPermCheckboxes('nu-perm-grid', { ...ROLE_PERMISSIONS.comercial });
  $('nu-error').style.display = 'none';
  const fotoInput = $('nu-foto');
  if (fotoInput) { fotoInput.value = ''; }
  const preview = $('nu-foto-preview');
  if (preview) { preview.src = ''; preview.style.display = 'none'; }
  $('novo-usuario-backdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeNovoUsuario() {
  $('novo-usuario-backdrop').classList.remove('open');
  document.body.style.overflow = '';
}

async function salvarNovoUsuario() {
  const nome  = $('nu-nome').value.trim();
  const email = $('nu-email').value.trim();
  const role  = $('nu-role').value;
  const senha = $('nu-senha').value;
  const errEl = $('nu-error');
  if (!nome || !email || !senha) { errEl.textContent = 'Preencha todos os campos.'; errEl.style.display = 'block'; return; }
  if (senha.length < 6)          { errEl.textContent = 'Senha mínima: 6 caracteres.'; errEl.style.display = 'block'; return; }
  const btn = $('btn-salvar-usuario');
  btn.disabled = true; btn.textContent = 'Criando…'; errEl.style.display = 'none';
  let tempApp;
  try {
    tempApp = initializeApp(firebaseConfig, `fdv-tmp-${Date.now()}`);
    const tempAuth = getAuth(tempApp);
    const cred = await createUserWithEmailAndPassword(tempAuth, email, senha);
    const uid  = cred.user.uid;

    let photoURL = null;
    const fotoFile = $('nu-foto')?.files?.[0];
    if (fotoFile && storage) {
      const sRef = storageRef(storage, `usuarios/${uid}/foto`);
      await uploadBytes(sRef, fotoFile);
      photoURL = await getDownloadURL(sRef);
    }

    const permissions = readPermCheckboxes('nu-perm-grid');
    const { error: insErr2 } = await supabase.from('usuarios').insert({
      firebase_uid: uid, email, nome, role, ativo: true, permissions, senha_temp: senha,
      ...(photoURL && { photo_url: photoURL }),
    });
    if (insErr2) throw insErr2;
    await signOut(tempAuth);
    closeNovoUsuario();
    toast('Usuário criado com sucesso!', 'ok');
    // enviar credenciais por email (não bloqueia se falhar)
    supabase.functions.invoke('send-credentials', { body: { email, nome, senha } })
      .then(({ error: fnErr }) => {
        if (fnErr) { console.warn('[FDV] send-credentials:', fnErr); toast('Usuário criado, mas falha ao enviar email.', 'warn'); }
        else toast('Email de credenciais enviado.', 'ok');
      });
  } catch(e) {
    const msgs = {
      'auth/email-already-in-use': 'Email já cadastrado.',
      'auth/invalid-email':        'Email inválido.',
      'auth/weak-password':        'Senha muito fraca.',
    };
    errEl.textContent = msgs[e.code] || 'Erro ao criar usuário: ' + (e.message || e.code);
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false; btn.textContent = 'Criar Usuário';
    if (tempApp) try { await deleteApp(tempApp); } catch(_) {}
  }
}

function gerarSenhaTemp() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
  return Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map(b => chars[b % chars.length]).join('');
}

async function reenviarCredenciais(uid) {
  const u = allUsuarios.find(x => x.id === uid);
  if (!u) return;
  const novaSenha = gerarSenhaTemp();
  const btn = document.querySelector(`[data-reenviar="${uid}"]`);
  if (btn) { btn.disabled = true; btn.textContent = 'Enviando…'; }
  try {
    const { error: dbErr } = await supabase.from('usuarios').update({ senha_temp: novaSenha }).eq('id', uid);
    if (dbErr) throw dbErr;
    const local = allUsuarios.find(x => x.id === uid);
    if (local) local.senha_temp = novaSenha;
    const { error: fnErr } = await supabase.functions.invoke('send-credentials', {
      body: { email: u.email, nome: u.nome, senha: novaSenha },
    });
    if (fnErr) { console.warn('[FDV] send-credentials:', fnErr); toast('Senha gerada, mas falha ao enviar email.', 'warn'); }
    else toast(`Credenciais enviadas para ${u.email}.`, 'ok');
    renderUsuarios(allUsuarios);
  } catch(e) {
    toast('Erro ao gerar credenciais: ' + (e.message || e), 'err');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Reenviar'; }
  }
}

async function copiarCredenciaisWhatsApp(uid) {
  const u = allUsuarios.find(x => x.id === uid);
  if (!u) return;
  let senha = u.senha_temp;
  if (!senha) {
    senha = gerarSenhaTemp();
    const { error } = await supabase.from('usuarios').update({ senha_temp: senha }).eq('id', uid);
    if (!error) {
      const local = allUsuarios.find(x => x.id === uid);
      if (local) local.senha_temp = senha;
      renderUsuarios(allUsuarios);
    }
  }
  const msg = `Olá! Aqui estão suas credenciais de acesso ao sistema FDV:\n🔗 Link: fdv-global.github.io/fdv-plataforma\n📧 Email: ${u.email}\n🔑 Senha: ${senha}`;
  try {
    await navigator.clipboard.writeText(msg);
    toast('Mensagem copiada para o WhatsApp.', 'ok');
  } catch(_) {
    toast('Erro ao copiar — verifique permissão do navegador.', 'err');
  }
}

// ─── FIREBASE + SUPABASE ─────────────────────────────────────────────
function initFirebase() {
  if (firebaseConfig.apiKey === 'YOUR_API_KEY') return false;
  try {
    const app = initializeApp(firebaseConfig);
    storage = getStorage(app);
    supabase = createClient(SB_URL, SB_SERVICE_KEY);
    return true;
  }
  catch(e) { console.error(e); return false; }
}

// ─── HELPERS DE MAPEAMENTO ───────────────────────────────────────────
function mapLead(row, histMap = {}) {
  const lead = {
    ...row,
    unreadCount:        row.unread_count,
    lastMessageAt:      row.last_message_at,
    lastMessageText:    row.last_message_text,
    lastMessageInstance:row.last_message_instance,
    etiquetas:          row.etiquetas || [],
    historico_kanban:   histMap[row.id] || [],
  };
  if (!lead.celular && lead.telefone) lead.celular = lead.telefone;
  return lead;
}

function mapUsuario(row) {
  return { ...row, photoURL: row.photo_url };
}

function hasPerm(key) { return currentPermissions[key] === true; }

function getPermittedInstances() {
  if (hasPerm('usuarios')) return waInstances;
  return waInstances.filter(i => !i.responsavel || hasPerm('whatsapp_' + i.responsavel));
}

function mapWaInstance(row) {
  return { ...row, instanceName: row.instance_name, displayName: row.display_name, phoneNumber: row.phone_number, lastActivity: row.last_activity };
}

// ─── LOAD ────────────────────────────────────────────────────────────
function loadLeads() {
  if (!isLive) {
    setTimeout(async () => {
      await loadKanbanCols();
      allLeads = structuredClone(DEMO);
      $('loading-layer').style.display = 'none';
      $('demo-banner').style.display = 'block';
      renderAll();
    }, 600);
    return;
  }

  const fetchLeads = async () => {
    try {
      if (!_kanbanCols) await loadKanbanCols();
      const [{ data: leads, error }, { data: histRows }, { data: vendasRows }] = await Promise.all([
        supabase.from('leads').select('*'),
        supabase.from('lead_historico').select('*').order('movido_em', { ascending: true }),
        supabase.from('vendas').select('lead_id,valor,valor_entrada,forma_pagamento,programa,observacoes,status'),
      ]);
      if (error) { $('loading-layer').style.display = 'none'; showDbError(error.message); return; }
      if (!leads || leads.length === 0) {
        console.warn('[FDV] loadLeads: Supabase retornou 0 leads — verifique RLS (migration 003_anon_rls_policies.sql)');
      }
      const histMap = {};
      (histRows || []).forEach(h => {
        if (!histMap[h.lead_id]) histMap[h.lead_id] = [];
        histMap[h.lead_id].push({ col: h.col, colLabel: h.col_label, movidoPor: h.movido_por, movidoEm: h.movido_em });
      });
      // Vendas table is authoritative for valor — merge into lead when venda_ganha_dados.valor is missing
      const vendasMap = {};
      (vendasRows || []).forEach(v => { vendasMap[v.lead_id] = v; });
      allLeads = (leads || []).map(d => {
        const lead = mapLead(d, histMap);
        const v = vendasMap[d.id];
        if (v) {
          lead.venda_ganha_dados = {
            valor:    v.valor           || lead.venda_ganha_dados?.valor   || '',
            entrada:  v.valor_entrada   || lead.venda_ganha_dados?.entrada || '',
            forma:    v.forma_pagamento || lead.venda_ganha_dados?.forma   || '',
            programa: v.programa        || lead.venda_ganha_dados?.programa|| '',
            obs:      v.observacoes     || lead.venda_ganha_dados?.obs     || '',
            status:   v.status          || null,
          };
        }
        return lead;
      });
      // Keep unread at 0 for the currently open chat
      if (chatActiveSide) {
        const ol = allLeads.find(l => l.id === chatActiveSide);
        if (ol && (ol.unread_count || 0) > 0) {
          ol.unread_count = 0; ol.unreadCount = 0;
          supabase.from('leads').update({ unread_count: 0 }).eq('id', chatActiveSide).then(null, console.error);
        }
      }
      $('loading-layer').style.display = 'none';
      renderAll();
    } catch(err) { $('loading-layer').style.display = 'none'; showDbError(err.message); }
  };

  fetchLeads();

  if (!window._leadsRealtimeSubscribed) {
    window._leadsRealtimeSubscribed = true;
    supabase.channel('leads_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchLeads)
      .subscribe();
  }
}

function showDbError(msg) {
  $('table-wrap').innerHTML = `<div style="padding:48px 32px;text-align:center">
    <div style="margin-bottom:16px">${_S(`<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>`,28,';color:#d06070')}</div>
    <h3 style="font-size:16px;font-weight:700;margin-bottom:10px">Não foi possível carregar os leads</h3>
    <p style="font-size:13px;color:var(--text-muted)">${esc(msg||'Erro desconhecido')}</p>
  </div>`;
}

// ─── ALUNAS — carregamento ────────────────────────────────────────────
async function loadAlunas() {
  if (!isLive) { alunasLoaded = true; if (activeSucessoSub) renderSucesso(); return; }
  try {
    const [{ data: a }, { data: s }, { data: c }] = await Promise.all([
      supabase.from('alunas').select('*').order('criadoem', { ascending: false }),
      supabase.from('sessoes').select('*').order('data', { ascending: true }),
      supabase.from('contratos').select('*').order('data_inicio', { ascending: false }),
    ]);
    allAlunas    = a || [];
    allSessoes   = s || [];
    allContratos = c || [];
    alunasLoaded = true;
    supabase.channel('alunas_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alunas' },    () => loadAlunas())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessoes' },   () => loadAlunas())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contratos' }, () => loadAlunas())
      .subscribe();
  } catch(e) { console.error('[FDV] loadAlunas:', e); alunasLoaded = true; }
  if (activeSucessoSub) renderSucesso();
}

// ─── TAB / SUB SWITCHING ─────────────────────────────────────────────

function switchTab(tab) {
  // Telas em construção
  const COMING_SOON = new Set(['alunas-sessoes','alunas-contratos','alunas-relatorios',
    'financeiro-inadimplencia','financeiro-pagamentos','financeiro-relatorios']);
  if (COMING_SOON.has(tab)) { toast('Em breve', 'info'); return; }

  // permission guard
  const TAB_PERM = {
    comercial:'comercial', agendamentos:'comercial', closer:'comercial', relatorios:'comercial',
    sucesso:'alunas', financeiro:'financeiro', usuarios:'usuarios',
    'alunas-sessoes':'alunas', 'alunas-contratos':'alunas', 'alunas-relatorios':'alunas',
    'financeiro-inadimplencia':'financeiro', 'financeiro-pagamentos':'financeiro', 'financeiro-relatorios':'financeiro',
  };
  if (tab === 'whatsapp') {
    if (!hasPerm('whatsapp_tati') && !hasPerm('whatsapp_fernanda') && !hasPerm('whatsapp_thomaz')) { switchTab('inicio'); return; }
  } else if (TAB_PERM[tab] && !hasPerm(TAB_PERM[tab])) {
    switchTab('inicio'); return;
  }

  activeTab = tab;
  document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
  const panel = $('tab-' + tab);
  if (panel) panel.style.display = '';

  document.querySelectorAll('.nav-link[data-tab]').forEach(l =>
    l.classList.toggle('active', l.dataset.tab === tab)
  );

  populateAllMonths();
  if      (tab === 'inicio')       renderInicio();
  else if (tab === 'comercial')    renderComercial();
  else if (tab === 'agendamentos') renderActiveSub();
  else if (tab === 'closer')       renderKanban();
  else if (tab === 'relatorios')   renderRelatorios();
  else if (tab === 'whatsapp')     { if (!waInstancesLoaded) loadWaInstances(); switchWaSub('chats'); }
  else if (tab === 'sucesso')      { activeSucessoSub = null; renderSucesso(); }
  else if (tab === 'financeiro')   { activeFinanceiroSub = null; renderFinanceiro(); }
  updateSidebarActive(tab);
  updateBreadcrumb();
}

function switchSub(sub) {
  selectedIds.clear(); updateBulkBar();
  activeSub = sub;
  document.querySelectorAll('.sub-panel').forEach(p => p.style.display = 'none');
  const panel = $('sub-' + sub);
  if (panel) panel.style.display = '';
  document.querySelectorAll('.sub-link[data-sub]').forEach(l =>
    l.classList.toggle('active', l.dataset.sub === sub)
  );
  renderActiveSub();
}

function renderActiveSub() {
  updateSubBadges();
  if      (activeSub === 'novos')        { populateMonths(); applyFilters(); }
  else if (activeSub === 'qualificados') renderQualificados();
  else if (activeSub === 'agendados')    renderAgendadosSub();
  else if (activeSub === 'noshow')       renderNoShow();
  else if (activeSub === 'descartados')  renderDescartados();
}

// ─── COMERCIAL (landing) ─────────────────────────────────────────────
function renderComercial() {
  const el = $('comercial-content');
  if (!el) return;
  el.innerHTML = `
    <div class="module-landing">
      <div class="module-landing-header">
        <div class="module-landing-header-icon"
             style="background:var(--gold-10);border:1px solid var(--gold-22)">
          <i data-lucide="trees" style="color:var(--gold)"></i>
        </div>
        <div>
          <h1>Comercial</h1>
          <p>Funil de captação, agendamento e fechamento de vendas</p>
        </div>
      </div>
      <div class="module-landing-cards">
        <button class="module-landing-card" data-go="agendamentos">
          <span class="mlc-icon" style="color:var(--gold)"><i data-lucide="calendar"></i></span>
          <span class="mlc-title">Agendamentos</span>
          <span class="mlc-desc">Pipeline pré-call — qualificação e agendamento de leads</span>
        </button>
        <button class="module-landing-card" data-go="closer">
          <span class="mlc-icon" style="color:var(--petro-l)"><i data-lucide="user"></i></span>
          <span class="mlc-title">Closer</span>
          <span class="mlc-desc">Funil de vendas Kanban — acompanhe cada negociação</span>
        </button>
        <button class="module-landing-card" data-go="relatorios">
          <span class="mlc-icon" style="color:#9b59b6"><i data-lucide="bar-chart-2"></i></span>
          <span class="mlc-title">Relatórios</span>
          <span class="mlc-desc">Métricas de performance e conversão comercial</span>
        </button>
      </div>
    </div>`;
  el.querySelectorAll('[data-go]').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.go))
  );
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ─── ALUNAS — constantes ─────────────────────────────────────────────
const ALUNAS_PRODUTOS  = ['Individual','Comunidade +3','Comunidade +1','Reprogramação Mensal','Águia Club','PRM'];
const ALUNAS_STATUS    = ['Nova compra','Dentro do Prazo','Migrou','Finalizado','Cancelado','Cliente Off','Reembolso','Inadimplente'];
const SESSAO_STATUS    = ['Realizada','Marcada','Aguardando','Cancelada','Em contato','Falta','Inadimplente'];
const ALUNA_STATUS_CLS = {
  'Nova compra':     'bp-gold',
  'Dentro do Prazo': 'bp-green',
  'Migrou':          'bp-petro',
  'Finalizado':      'bp-gray',
  'Cancelado':       'bp-red',
  'Cliente Off':     'bp-dark',
  'Reembolso':       'bp-orange',
  'Inadimplente':    'bp-red-dk',
};
const SESSAO_STATUS_CLS = {
  'Realizada':    'bp-green',
  'Marcada':      'bp-petro',
  'Aguardando':   'bp-gold',
  'Cancelada':    'bp-red',
  'Em contato':   'bp-purple',
  'Falta':        'bp-orange',
  'Inadimplente': 'bp-red-dk',
};

const PRODUTO_CLS = {
  'Individual':           'bp-petro',
  'Comunidade +3':        'bp-purple',
  'Comunidade +1':        'bp-purple',
  'Reprogramação Mensal': 'bp-orange',
  'Águia Club':           'bp-gold',
  'PRM':                  'bp-green',
};

function badgeAluna(status) {
  const cls = ALUNA_STATUS_CLS[status] || 'bp-gray';
  return `<span class="bp ${cls}">${esc(status||'—')}</span>`;
}
function badgeSessao(status) {
  const cls = SESSAO_STATUS_CLS[status] || 'bp-gray';
  return `<span class="bp ${cls}">${esc(status||'—')}</span>`;
}
function badgeProduto(produto) {
  const cls = PRODUTO_CLS[produto] || 'bp-gray';
  return `<span class="bp ${cls}">${esc(produto||'—')}</span>`;
}
function avatarInitial(nome) {
  const PALETTE = ['#4db5c8','#9b59b6','#e67e22','#2ecc71','#e74c3c','#3498db','#1abc9c','#e91e8c'];
  let h = 0;
  for (let i = 0; i < (nome||'').length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0;
  const bg  = PALETTE[h % PALETTE.length];
  const ini = (nome||'?').trim()[0].toUpperCase();
  return `<span class="aluna-avatar aluna-avatar--initial" style="background:${bg}">${ini}</span>`;
}

// ─── ALUNOS ──────────────────────────────────────────────────────────
const SUCESSO_SUBS = {
  alunas:     { label: 'Alunas',      icon: 'users',          color: '#4db5c8',  desc: 'Gestão de alunas ativas e histórico de engajamento' },
  sessoes:    { label: 'Sessões',     icon: 'calendar-check', color: 'var(--gold)',  desc: 'Sessões de mentoria e acompanhamento individualizado' },
  contratos:  { label: 'Contratos',   icon: 'file-text',      color: '#9b59b6',  desc: 'Contratos, renovações e documentação das alunas' },
  relatorios: { label: 'Relatórios',  icon: 'bar-chart-2',    color: '#2ecc71',  desc: 'Métricas de sucesso, retenção e engajamento' },
};

function switchSucessoSub(sub) {
  activeSucessoSub = sub;
  document.querySelectorAll('[data-sucesso-sub]').forEach(b =>
    b.classList.toggle('active', b.dataset.sucessoSub === sub)
  );
  if (['alunas','sessoes','contratos','relatorios'].includes(sub) && !alunasLoaded) {
    loadAlunas(); // renderSucesso() será chamado dentro de loadAlunas()
    return;
  }
  renderSucesso();
}

function renderSucesso() {
  const el = $('sucesso-content');
  if (!el) return;

  document.querySelectorAll('[data-sucesso-sub]').forEach(b =>
    b.classList.toggle('active', b.dataset.sucessoSub === activeSucessoSub)
  );

  if (!activeSucessoSub) {
    el.innerHTML = `
      <div class="module-landing">
        <div class="module-landing-header">
          <div class="module-landing-header-icon"
               style="background:var(--petro-10);border:1px solid var(--petro-18)">
            <i data-lucide="graduation-cap" style="color:var(--petro-l)"></i>
          </div>
          <div>
            <h1>Gestão de Alunas</h1>
            <p>Gestão de alunas, sessões e contratos</p>
          </div>
        </div>
        <div class="module-landing-cards">
          ${Object.entries(SUCESSO_SUBS).map(([key, s]) => `
            <button class="module-landing-card" data-go-sucesso="${key}">
              <span class="mlc-icon" style="color:${s.color}"><i data-lucide="${s.icon}"></i></span>
              <span class="mlc-title">${s.label}</span>
              <span class="mlc-desc">${s.desc}</span>
            </button>`).join('')}
        </div>
      </div>`;
    el.querySelectorAll('[data-go-sucesso]').forEach(btn =>
      btn.addEventListener('click', () => switchSucessoSub(btn.dataset.goSucesso))
    );
    if (typeof lucide !== 'undefined') lucide.createIcons();
  } else if (activeSucessoSub === 'alunas') {
    renderAlunasTab(el);
  } else if (activeSucessoSub === 'sessoes') {
    renderSessoesTab(el);
  } else if (activeSucessoSub === 'contratos') {
    renderContratosTab(el);
  } else if (activeSucessoSub === 'relatorios') {
    renderRelatoriosTab(el);
  } else {
    const s = SUCESSO_SUBS[activeSucessoSub];
    el.innerHTML = `
      <div class="page-top"><div class="page-title-block">
        <h1>Alunas <span style="color:var(--t3);font-weight:400;font-size:18px">/ ${s ? s.label : activeSucessoSub}</span></h1>
      </div></div>
      <div class="placeholder-module">
        <div class="placeholder-icon">${_S(`<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>`,48,';color:var(--t3)')}</div>
        <h3>${s ? s.label : activeSucessoSub}</h3>
        <p>Em desenvolvimento.</p>
      </div>`;
  }
}

// ─── FINANCEIRO ───────────────────────────────────────────────────────
const FINANCEIRO_SUBS = {
  inadimplencia: { label: 'Inadimplência', icon: 'alert-triangle', color: '#c07080',  desc: 'Alunas com pagamentos pendentes ou em atraso' },
  pagamentos:    { label: 'Pagamentos',    icon: 'credit-card',    color: '#2ecc71',  desc: 'Histórico de recebimentos e confirmações' },
  relatorios:    { label: 'Relatórios',    icon: 'bar-chart-2',    color: '#9b59b6',  desc: 'Métricas financeiras e fluxo de caixa' },
};

function switchFinanceiroSub(sub) {
  activeFinanceiroSub = sub;
  document.querySelectorAll('[data-financeiro-sub]').forEach(b =>
    b.classList.toggle('active', b.dataset.financeiroSub === sub)
  );
  renderFinanceiro();
}

// ─── MÓDULO ALUNAS — renders ─────────────────────────────────────────
function subPageTop(title, sub, btnId, btnLabel) {
  const s = SUCESSO_SUBS[activeSucessoSub];
  return `<div class="page-top" style="margin-bottom:20px">
    <div class="page-title-block">
      <button class="link-btn" style="font-size:14px;color:var(--t3)" onclick="switchSucessoSub(null)">← Alunas</button>
      <h1 style="margin-top:4px">${esc(title)}</h1>
    </div>
    ${btnId ? `<div class="page-actions"><button class="btn-primary btn-sm" id="${btnId}">${esc(btnLabel)}</button></div>` : ''}
  </div>`;
}

function renderAlunasTab(el) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diffMon = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
  const weekStart = new Date(today); weekStart.setDate(today.getDate() + diffMon); weekStart.setHours(0,0,0,0);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6); weekEnd.setHours(23,59,59,999);

  const metricas = [
    {
      id: 'ativas', color: 'var(--petro-l)',
      n: allAlunas.filter(a => ['Nova compra','Dentro do Prazo','Migrou'].includes(a.status)).length,
      lbl: 'Alunas ativas',
      items: () => allAlunas.filter(a => ['Nova compra','Dentro do Prazo','Migrou'].includes(a.status)),
      renderItem: a => `<div class="al-mini-row">${avatarInitial(a.nome)}<span class="al-mini-nome">${esc(a.nome||'—')}</span>${badgeAluna(a.status)}</div>`
    },
    {
      id: 'sess-pend', color: 'var(--gold)',
      n: allSessoes.filter(s => ['Aguardando','Em contato'].includes(s.status)).length,
      lbl: 'Sessões pendentes',
      items: () => allSessoes.filter(s => ['Aguardando','Em contato'].includes(s.status)),
      renderItem: s => {
        const a = allAlunas.find(x => x.id === s.aluna_id);
        return `<div class="al-mini-row"><span class="al-mini-nome">${esc(a?.nome||'—')}</span>${badgeSessao(s.status)}<span class="al-mini-date">${fmtDate(s.data||'')}</span></div>`;
      }
    },
    {
      id: 'cont-pend', color: '#9b59b6',
      n: allContratos.filter(c => !c.assinado).length,
      lbl: 'Contratos pendentes',
      items: () => allContratos.filter(c => !c.assinado),
      renderItem: c => {
        const a = allAlunas.find(x => x.id === c.aluna_id);
        return `<div class="al-mini-row"><span class="al-mini-nome">${esc(a?.nome||'—')}</span><span class="al-mini-date">${esc(c.produto||'—')}</span></div>`;
      }
    },
    {
      id: 'inadimp', color: '#e06450',
      n: allAlunas.filter(a => a.status === 'Inadimplente').length,
      lbl: 'Inadimplentes',
      items: () => allAlunas.filter(a => a.status === 'Inadimplente'),
      renderItem: a => `<div class="al-mini-row">${avatarInitial(a.nome)}<span class="al-mini-nome">${esc(a.nome||'—')}</span>${badgeAluna(a.status)}</div>`
    },
    {
      id: 'sess-semana', color: 'var(--green)',
      n: allSessoes.filter(s => { if (!s.data) return false; const d = new Date(s.data + 'T00:00:00'); return d >= weekStart && d <= weekEnd; }).length,
      lbl: 'Sessões esta semana',
      items: () => allSessoes.filter(s => { if (!s.data) return false; const d = new Date(s.data + 'T00:00:00'); return d >= weekStart && d <= weekEnd; }),
      renderItem: s => {
        const a = allAlunas.find(x => x.id === s.aluna_id);
        return `<div class="al-mini-row"><span class="al-mini-nome">${esc(a?.nome||'—')}</span>${badgeSessao(s.status)}<span class="al-mini-date">${fmtDate(s.data||'')} ${s.hora ? s.hora.slice(0,5) : ''}</span></div>`;
      }
    }
  ];

  el.innerHTML = `
    ${subPageTop('Gestão de Alunas', 'alunas', 'btn-nova-aluna', '+ Nova Aluna')}
    <div class="al-metrics">
      ${metricas.map(m => `<button class="al-metric-card" data-metric="${m.id}"><span class="al-metric-n" style="color:${m.color}">${m.n}</span><span class="al-metric-lbl">${m.lbl}</span></button>`).join('')}
    </div>
    <div class="al-metric-panel" id="al-metric-panel" style="display:none"></div>
    <div class="alunas-filters">
      <input type="text" class="filter-select" id="al-search" placeholder="Buscar aluna…" style="min-width:200px">
      <select class="filter-select" id="al-filter-status">
        <option value="">Todos os status</option>
        ${ALUNAS_STATUS.map(s => `<option value="${s}">${s}</option>`).join('')}
      </select>
      <select class="filter-select" id="al-filter-produto">
        <option value="">Todos os produtos</option>
        ${ALUNAS_PRODUTOS.map(p => `<option value="${p}">${p}</option>`).join('')}
      </select>
    </div>
    <div id="al-accordion-wrap"></div>`;

  let activeMetric = null;

  const renderAccordion = (rows) => {
    const wrap = $('al-accordion-wrap');
    if (!wrap) return;
    if (!rows.length) { wrap.innerHTML = '<p class="hist-empty" style="margin-top:32px">Nenhuma aluna encontrada.</p>'; return; }
    wrap.innerHTML = `<div class="al-accordion">${rows.map(a => renderAlunaRow(a)).join('')}</div>`;
    bindAccordionEvents(wrap);
  };

  const applyFilter = () => {
    const q = ($('al-search')?.value || '').toLowerCase();
    const st = $('al-filter-status')?.value || '';
    const pr = $('al-filter-produto')?.value || '';
    const filtered = allAlunas.filter(a =>
      (!q  || (a.nome||'').toLowerCase().includes(q)) &&
      (!st || a.status === st) &&
      (!pr || a.produto === pr)
    );
    renderAccordion(filtered);
  };

  renderAccordion(allAlunas);
  lucide.createIcons({ nodes: [el] });

  $('btn-nova-aluna')?.addEventListener('click', () => openAlunaModal(null));

  ['al-search','al-filter-status','al-filter-produto'].forEach(id => {
    const el2 = $(id);
    if (el2) el2.addEventListener(id === 'al-search' ? 'input' : 'change', applyFilter);
  });

  el.querySelectorAll('.al-metric-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const mid = btn.dataset.metric;
      const panel = $('al-metric-panel');
      if (!panel) return;
      if (activeMetric === mid) {
        activeMetric = null;
        panel.style.display = 'none';
        panel.innerHTML = '';
        el.querySelectorAll('.al-metric-card').forEach(b => b.classList.remove('active'));
        return;
      }
      activeMetric = mid;
      el.querySelectorAll('.al-metric-card').forEach(b => b.classList.toggle('active', b.dataset.metric === mid));
      const m = metricas.find(x => x.id === mid);
      const items = m.items();
      panel.style.display = '';
      panel.innerHTML = `<div class="al-metric-panel-inner"><div class="al-metric-panel-hdr">${m.lbl}</div>${items.length ? items.map(m.renderItem).join('') : '<p class="hist-empty" style="margin:0">Nenhum item.</p>'}</div>`;
    });
  });
}

function renderAlunaRow(a) {
  const sessoesAluna = allSessoes.filter(s => s.aluna_id === a.id);
  const contratosAluna = allContratos.filter(c => c.aluna_id === a.id);
  const contratoAssinado = contratosAluna.some(c => c.assinado);
  const estaNoGrupo = contratosAluna.some(c => c.esta_no_grupo);
  const total = a.sessoes_total || 0;
  const realizadas = a.sessoes_realizadas || 0;
  const pct = total > 0 ? Math.min(100, Math.round((realizadas / total) * 100)) : 0;

  const today = new Date(); today.setHours(0,0,0,0);
  const sessAtrasadas = sessoesAluna.filter(s => {
    if (!['Aguardando','Em contato'].includes(s.status)) return false;
    if (!s.data) return false;
    const d = new Date(s.data + 'T00:00:00');
    return d < today;
  });
  const proximaSessao = sessoesAluna
    .filter(s => s.status === 'Aguardando' || s.status === 'Marcada')
    .sort((x, y) => (x.data||'') < (y.data||'') ? -1 : 1)[0] || null;

  let dotColor, dotClass;
  if (a.status === 'Inadimplente') { dotColor = '●'; dotClass = 'al-ind al-ind--red'; }
  else if (!contratoAssinado && contratosAluna.length > 0) { dotColor = '●'; dotClass = 'al-ind al-ind--yellow'; }
  else if (sessAtrasadas.length > 0) { dotColor = '●'; dotClass = 'al-ind al-ind--orange'; }
  else { dotColor = '●'; dotClass = 'al-ind al-ind--green'; }

  const avatarHtml = a.foto_url
    ? `<img src="${esc(a.foto_url)}" class="aluna-avatar" style="width:30px;height:30px;border-radius:50%;object-fit:cover">`
    : avatarInitial(a.nome);

  const waPhone = normalizePhoneForEvolution(a.celular);
  const waHref  = waPhone ? `https://wa.me/${waPhone}` : null;
  const nextAguardando = sessoesAluna.find(s => s.status === 'Aguardando');

  const bodyGrid = [
    { lbl: 'Contrato', val: contratosAluna.length ? (contratoAssinado ? '<span style="color:#4caf8e">Assinado</span>' : '<span style="color:#CE9221">Pendente</span>') : '—' },
    { lbl: 'No grupo', val: estaNoGrupo ? '<span style="color:#4caf8e">Sim</span>' : '<span style="color:var(--t3)">Não</span>' },
    { lbl: 'Próxima sessão', val: proximaSessao ? `${fmtDate(proximaSessao.data||'')}${proximaSessao.hora ? ' · ' + proximaSessao.hora.slice(0,5) : ''}` : '—' },
    ...(sessAtrasadas.length > 0 ? [{ lbl: 'Sessões em atraso', val: `<span style="color:#e06450;font-weight:700">${sessAtrasadas.length}</span>` }] : []),
    ...(a.celular ? [{ lbl: 'Celular', val: esc(a.celular) }] : [])
  ];

  return `<div class="al-row" data-aluna-id="${a.id}">
    <div class="al-row-head">
      <div class="al-row-left">
        <span class="${dotClass}" title="Indicador de status">${dotColor}</span>
        ${avatarHtml}
        <div class="al-row-info">
          <span class="al-row-nome">${esc(a.nome||'—')}</span>
          <div class="al-row-meta">${badgeProduto(a.produto)}${badgeAluna(a.status)}</div>
        </div>
      </div>
      <div class="al-row-right">
        <div class="al-progress-wrap"><div class="al-progress-bar" style="width:${pct}%"></div></div>
        <span class="al-row-sess-count">${realizadas}/${total}</span>
        <span class="al-row-chevron">›</span>
      </div>
    </div>
    <div class="al-row-body" style="display:none">
      <div class="al-body-inner">
        <div class="al-body-grid">
          ${bodyGrid.map(it => `<div class="al-body-item"><span class="al-body-lbl">${it.lbl}</span><span class="al-body-val">${it.val}</span></div>`).join('')}
        </div>
        <div class="al-body-actions">
          ${waHref ? `<a class="btn-ghost btn-sm" href="${waHref}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
          <button class="btn-ghost btn-sm" data-acc-agendar="${a.id}">Agendar</button>
          <button class="btn-ghost btn-sm" data-acc-edit="${a.id}">Editar</button>
          <button class="btn-ghost btn-sm" data-acc-status="${a.id}">Status</button>
        </div>
      </div>
    </div>
  </div>`;
}

function bindAccordionEvents(wrap) {
  wrap.querySelectorAll('.al-row-head').forEach(head => {
    head.addEventListener('click', e => {
      if (e.target.closest('a,button')) return;
      const row = head.closest('.al-row');
      const body = row.querySelector('.al-row-body');
      const isOpen = row.classList.contains('open');
      wrap.querySelectorAll('.al-row.open').forEach(r => {
        r.classList.remove('open');
        r.querySelector('.al-row-body').style.display = 'none';
      });
      if (!isOpen) {
        row.classList.add('open');
        body.style.display = '';
      }
    });
  });
  wrap.querySelectorAll('[data-acc-edit]').forEach(b =>
    b.addEventListener('click', e => {
      e.stopPropagation();
      const a = allAlunas.find(x => x.id === b.dataset.accEdit);
      if (a) openAlunaModal(a);
    })
  );
  wrap.querySelectorAll('[data-acc-agendar]').forEach(b =>
    b.addEventListener('click', e => {
      e.stopPropagation();
      const a = allAlunas.find(x => x.id === b.dataset.accAgendar);
      if (!a) return;
      const nextSess = allSessoes.find(s => s.aluna_id === a.id && s.status === 'Aguardando');
      openAgendarSessao(nextSess || null, a);
    })
  );
  wrap.querySelectorAll('[data-acc-status]').forEach(b =>
    b.addEventListener('click', e => {
      e.stopPropagation();
      const a = allAlunas.find(x => x.id === b.dataset.accStatus);
      if (!a) return;
      openStatusQuickChange(b, a);
    })
  );
}

function openStatusQuickChange(anchor, aluna) {
  document.querySelectorAll('.status-quick-dropdown').forEach(d => d.remove());
  const dd = document.createElement('div');
  dd.className = 'status-quick-dropdown';
  dd.innerHTML = ALUNAS_STATUS.map(s =>
    `<button class="sqd-item${s === aluna.status ? ' active' : ''}" data-val="${s}">${badgeAluna(s)}</button>`
  ).join('');
  document.body.appendChild(dd);
  const rect = anchor.getBoundingClientRect();
  dd.style.top  = (rect.bottom + window.scrollY + 4) + 'px';
  dd.style.left = (rect.left  + window.scrollX)      + 'px';
  dd.querySelectorAll('.sqd-item').forEach(btn =>
    btn.addEventListener('click', async () => {
      dd.remove();
      if (!isLive) return;
      const { error } = await supabase.from('alunas').update({ status: btn.dataset.val, atualizadoem: new Date().toISOString() }).eq('id', aluna.id);
      if (!error) { aluna.status = btn.dataset.val; renderSucesso(); }
    })
  );
  setTimeout(() => document.addEventListener('click', () => dd.remove(), { once: true }), 0);
}

function renderSessoesTab(el) {
  el.innerHTML = `
    ${subPageTop('Sessões', 'sessoes', 'btn-nova-sessao', '+ Nova Sessão')}
    <div class="alunas-filters" style="margin-bottom:18px">
      <select class="filter-select" id="sess-filter-aluna" style="min-width:200px">
        <option value="">Todas as alunas</option>
        ${allAlunas.map(a => `<option value="${a.id}">${esc(a.nome||'—')}</option>`).join('')}
      </select>
      <select class="filter-select" id="sess-filter-status">
        <option value="">Todos os status</option>
        ${SESSAO_STATUS.map(s => `<option value="${s}">${s}</option>`).join('')}
      </select>
    </div>
    <div id="sessoes-list"></div>`;

  const dotClass = s => {
    if (s.status === 'Realizada') return 'sess-dot--green';
    if (s.status === 'Marcada')   return 'sess-dot--yellow';
    if (s.status === 'Cancelada' || s.status === 'Falta') return 'sess-dot--red';
    return 'sess-dot--gray';
  };

  const renderList = () => {
    const aId = $('sess-filter-aluna')?.value || '';
    const st  = $('sess-filter-status')?.value || '';
    const filteredSess = allSessoes.filter(s =>
      (!aId || s.aluna_id === aId) && (!st || s.status === st)
    );
    const list = $('sessoes-list');
    if (!list) return;
    if (!filteredSess.length) { list.innerHTML = '<p class="hist-empty" style="margin-top:32px">Nenhuma sessão encontrada.</p>'; return; }

    const alunaIds = [...new Set(filteredSess.map(s => s.aluna_id))];
    const alunas = alunaIds.map(id => allAlunas.find(a => a.id === id)).filter(Boolean);

    const proximaRec = a => allSessoes
      .filter(s => s.aluna_id === a.id && s.data && (s.status === 'Aguardando' || s.status === 'Marcada'))
      .sort((x,y) => (x.data||'') < (y.data||'') ? -1 : 1)[0];

    alunas.sort((a, b) => {
      const pa = proximaRec(a), pb = proximaRec(b);
      if (pa && pb) return (pa.data||'') < (pb.data||'') ? -1 : 1;
      if (pa) return -1;
      if (pb) return 1;
      return (a.nome||'').localeCompare(b.nome||'');
    });

    const sortSess = arr => arr.slice().sort((x,y) => {
      const na = x.numero_sessao || 0, nb = y.numero_sessao || 0;
      if (na !== nb) return na - nb;
      return (x.data||'') < (y.data||'') ? -1 : 1;
    });

    list.innerHTML = alunas.map(a => {
      const sessAluna    = sortSess(filteredSess.filter(s => s.aluna_id === a.id));
      const allSessAluna = sortSess(allSessoes.filter(s => s.aluna_id === a.id));
      const proxima      = proximaRec(a);
      const realizadas   = allSessAluna.filter(s => s.status === 'Realizada').length;
      const total        = a.sessoes_total || allSessAluna.length;
      const proxTxt      = proxima
        ? `${fmtDate(proxima.data)}${proxima.hora ? ' · ' + proxima.hora.slice(0,5) : ''}`
        : 'sem agendamento';

      const avatarHtml = a.foto_url
        ? `<img src="${esc(a.foto_url)}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0">`
        : avatarInitial(a.nome);

      const timelineDots = allSessAluna.map((s, i) => {
        const n = s.numero_sessao || (i + 1);
        const tip = `${s.status}${s.data ? ' · ' + fmtDate(s.data) : ''}${s.hora ? ' ' + s.hora.slice(0,5) : ''}`;
        return `<div class="sess-dot-wrap"><div class="sess-dot ${dotClass(s)}" title="${esc(tip)}">${n}</div>${s.data ? `<span class="sess-dot-date">${fmtDate(s.data)}</span>` : ''}</div>`;
      }).join('');

      const sessItems = sessAluna.map(s => {
        const n = s.numero_sessao || (allSessAluna.indexOf(s) + 1);
        return `<div class="sess-item">
          <div class="sess-item-left">
            <span class="sess-item-n">Sessão ${n}</span>
            <span class="sess-item-date">${fmtDate(s.data||'')}${s.hora ? ' · ' + s.hora.slice(0,5) : ''}</span>
          </div>
          <div class="sess-item-right">
            ${badgeSessao(s.status)}
            <button class="btn-ghost btn-sm" data-sess-agendar="${s.id}" title="Agendar">${ICO_CALENDAR}</button>
            <button class="btn-ghost btn-sm" data-sess-edit="${s.id}">Editar</button>
          </div>
        </div>`;
      }).join('');

      return `<div class="al-row" data-aluna-id="${a.id}">
        <div class="al-row-head">
          <div class="al-row-left">
            ${avatarHtml}
            <div class="al-row-info">
              <span class="al-row-nome">${esc(a.nome||'—')}</span>
              <div class="al-row-meta">
                ${badgeProduto(a.produto)}
                <span class="sa-meta-txt">${realizadas}/${total} sessões</span>
                <span class="sa-meta-sep">·</span>
                <span class="sa-meta-txt">${proxTxt}</span>
              </div>
            </div>
          </div>
          <div class="al-row-right">
            ${badgeAluna(a.status)}
            <button class="btn-ghost btn-sm" data-nova-sessao-aluna="${a.id}">+ Sessão</button>
            <span class="al-row-chevron">›</span>
          </div>
        </div>
        <div class="al-row-body" style="display:none">
          <div class="al-body-inner">
            ${allSessAluna.length ? `<div class="sess-timeline" style="margin-bottom:14px">${timelineDots}</div>` : ''}
            ${sessItems || '<p style="font-size:13px;color:var(--t3);padding:4px 0">Nenhuma sessão para os filtros selecionados.</p>'}
          </div>
        </div>
      </div>`;
    }).join('');

    // accordion toggle — one open at a time
    list.querySelectorAll('.al-row-head').forEach(head => {
      head.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        const row    = head.closest('.al-row');
        const body   = row.querySelector('.al-row-body');
        const isOpen = row.classList.contains('open');
        list.querySelectorAll('.al-row.open').forEach(r => {
          r.classList.remove('open');
          r.querySelector('.al-row-body').style.display = 'none';
        });
        if (!isOpen) { row.classList.add('open'); body.style.display = ''; }
      });
    });

    list.querySelectorAll('[data-sess-agendar]').forEach(b =>
      b.addEventListener('click', () => {
        const sess  = allSessoes.find(x => x.id === b.dataset.sessAgendar);
        const aluna = allAlunas.find(a => a.id === sess?.aluna_id);
        if (sess) openAgendarSessao(sess, aluna);
      })
    );
    list.querySelectorAll('[data-sess-edit]').forEach(b =>
      b.addEventListener('click', () => {
        const sess = allSessoes.find(x => x.id === b.dataset.sessEdit);
        if (sess) openSessaoModal(sess, sess.aluna_id);
      })
    );
    list.querySelectorAll('[data-nova-sessao-aluna]').forEach(b =>
      b.addEventListener('click', () => {
        const aluna = allAlunas.find(a => a.id === b.dataset.novaSessaoAluna);
        openAgendarSessao(null, aluna || null);
      })
    );
  };

  renderList();
  lucide.createIcons({ nodes: [el] });
  $('btn-nova-sessao')?.addEventListener('click', () => {
    const alunaId = $('sess-filter-aluna')?.value || null;
    const aluna   = alunaId ? allAlunas.find(a => a.id === alunaId) || null : null;
    openAgendarSessao(null, aluna);
  });
  ['sess-filter-aluna','sess-filter-status'].forEach(id => $(id)?.addEventListener('change', renderList));
}

function renderContratosTab(el) {
  el.innerHTML = `
    ${subPageTop('Contratos', 'contratos', 'btn-novo-contrato', '+ Novo Contrato')}
    <div class="table-wrap">
      ${allContratos.length === 0 ? '<p class="hist-empty" style="margin-top:32px">Nenhum contrato cadastrado.</p>' : `
      <table class="data-table">
        <thead><tr>
          <th>Aluna</th><th>Produto</th><th>Início</th><th>Vencimento</th>
          <th style="text-align:center">Assinado</th><th style="text-align:center">No Grupo</th><th></th>
        </tr></thead>
        <tbody>${allContratos.map(c => {
          const aluna = allAlunas.find(a => a.id === c.aluna_id);
          const venc  = c.data_vencimento;
          const vencCls = venc && new Date(venc) < new Date() ? 'style="color:#e06450;font-weight:700"' : '';
          return `<tr>
            <td>${esc(aluna?.nome || '—')}</td>
            <td><span class="bp bp-gray">${esc(c.produto||'—')}</span></td>
            <td>${fmtDate(c.data_inicio||'')}</td>
            <td ${vencCls}>${fmtDate(c.data_vencimento||'')}</td>
            <td style="text-align:center">${c.assinado    ? '<span style="color:#2ecc71">✓</span>' : '<span style="color:var(--t3)">—</span>'}</td>
            <td style="text-align:center">${c.esta_no_grupo ? '<span style="color:#2ecc71">✓</span>' : '<span style="color:var(--t3)">—</span>'}</td>
            <td><button class="btn-ghost btn-sm" data-cont-edit="${c.id}">Editar</button></td>
          </tr>`;
        }).join('')}</tbody>
      </table>`}
    </div>`;
  el.querySelectorAll('[data-cont-edit]').forEach(b =>
    b.addEventListener('click', () => {
      const c = allContratos.find(x => x.id === b.dataset.contEdit);
      if (c) openContratoModal(c, c.aluna_id);
    })
  );
  $('btn-novo-contrato')?.addEventListener('click', () => openContratoModal(null, null));
}

// ─── RELATÓRIOS (ALUNAS) ─────────────────────────────────────────────
function renderRelatoriosTab(el) {
  const today    = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const trinta   = new Date(today); trinta.setDate(today.getDate() - 30);

  const render = () => {
    // Apply product + responsável filters to alunas
    let alunas = allAlunas;
    if (relFiltProduto) alunas = alunas.filter(a => a.produto === relFiltProduto);
    if (relFiltResp) {
      alunas = alunas.filter(a => {
        const lead = allLeads.find(l => l.id === a.lead_id);
        return lead?.closer === relFiltResp;
      });
    }
    const alunaSet = new Set(alunas.map(a => a.id));
    let sessoes   = allSessoes.filter(s => alunaSet.has(s.aluna_id));
    let contratos = allContratos.filter(c => alunaSet.has(c.aluna_id));

    // Sessions filtered by month (for month-specific metrics and chart)
    const mesKey = relFiltMes || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const sessMesAll = relFiltMes
      ? sessoes.filter(s => s.data && s.data.startsWith(relFiltMes))
      : sessoes.filter(s => s.data && s.data.startsWith(mesKey));

    // ── Metric computations ──────────────────────────────────────────
    const sessMes      = sessMesAll.filter(s => s.status === 'Realizada').length;
    const sessAtrasadas = sessoes.filter(s => s.status === 'Aguardando' && s.data && s.data < todayStr).length;
    const contPend     = contratos.filter(c => !c.assinado).length;
    const inadimp      = alunas.filter(a => a.status === 'Inadimplente').length;

    const semSessaoList = alunas.filter(a =>
      !sessoes.some(s => s.aluna_id === a.id && (s.status === 'Aguardando' || s.status === 'Marcada'))
    );

    const concluidas   = alunas.filter(a => ['Migrou','Finalizado','Cancelado','Cliente Off'].includes(a.status)).length;
    const migraram     = alunas.filter(a => a.status === 'Migrou').length;
    const taxaRenov    = concluidas > 0 ? Math.round(migraram / concluidas * 100) : 0;

    const cancelList   = alunas.filter(a => ['Cancelado','Cliente Off','Reembolso'].includes(a.status));
    const taxaCancel   = alunas.length > 0 ? Math.round(cancelList.length / alunas.length * 100) : 0;

    const closerSess = (closer) => sessoes.filter(s => {
      if (s.status !== 'Realizada') return false;
      const a    = alunas.find(x => x.id === s.aluna_id);
      const lead = allLeads.find(l => l.id === a?.lead_id);
      return lead?.closer === closer;
    });

    const riscoList = alunas.filter(a => {
      if (a.status === 'Inadimplente') return true;
      if (!['Nova compra','Dentro do Prazo'].includes(a.status)) return false;
      const last = sessoes
        .filter(s => s.aluna_id === a.id && s.status === 'Realizada' && s.data)
        .sort((x, y) => y.data.localeCompare(x.data))[0];
      return !last || new Date(last.data + 'T00:00:00') < trinta;
    });

    const sem30List = alunas.filter(a => {
      if (!['Nova compra','Dentro do Prazo'].includes(a.status)) return false;
      const last = sessoes
        .filter(s => s.aluna_id === a.id && s.status === 'Realizada' && s.data)
        .sort((x, y) => y.data.localeCompare(x.data))[0];
      return !last || new Date(last.data + 'T00:00:00') < trinta;
    });

    const sessFernandaList = closerSess('fernanda');
    const sessThomazList   = closerSess('thomaz');

    // ── Metrics array ────────────────────────────────────────────────
    const metrics = [
      {
        id: 'total', color: 'var(--petro-l)', n: alunas.length, lbl: 'Total de alunas',
        items: () => alunas,
        ri: a => `<div class="al-mini-row">${avatarInitial(a.nome)}<span class="al-mini-nome">${esc(a.nome||'—')}</span>${badgeProduto(a.produto)}</div>`,
      },
      {
        id: 'sess-mes', color: 'var(--green)', n: sessMes, lbl: 'Sessões no mês',
        items: () => sessMesAll.filter(s => s.status === 'Realizada'),
        ri: s => { const a = alunas.find(x => x.id === s.aluna_id); return `<div class="al-mini-row"><span class="al-mini-nome">${esc(a?.nome||'—')}</span><span class="al-mini-date">${fmtDate(s.data||'')}</span></div>`; },
      },
      {
        id: 'sess-atras', color: 'var(--gold)', n: sessAtrasadas, lbl: 'Sessões atrasadas',
        items: () => sessoes.filter(s => s.status === 'Aguardando' && s.data && s.data < todayStr),
        ri: s => { const a = alunas.find(x => x.id === s.aluna_id); return `<div class="al-mini-row"><span class="al-mini-nome">${esc(a?.nome||'—')}</span><span class="al-mini-date">${fmtDate(s.data||'')}</span></div>`; },
      },
      {
        id: 'cont-pend', color: '#9b59b6', n: contPend, lbl: 'Contratos pendentes',
        items: () => contratos.filter(c => !c.assinado),
        ri: c => { const a = alunas.find(x => x.id === c.aluna_id); return `<div class="al-mini-row"><span class="al-mini-nome">${esc(a?.nome||'—')}</span><span class="al-mini-date">${esc(c.produto||'—')}</span></div>`; },
      },
      {
        id: 'inadimp', color: '#e06450', n: inadimp, lbl: 'Inadimplentes',
        items: () => alunas.filter(a => a.status === 'Inadimplente'),
        ri: a => `<div class="al-mini-row">${avatarInitial(a.nome)}<span class="al-mini-nome">${esc(a.nome||'—')}</span>${badgeAluna(a.status)}</div>`,
      },
      {
        id: 'sem-sessao', color: '#e67e22', n: semSessaoList.length, lbl: 'Sem sessão agendada',
        items: () => semSessaoList,
        ri: a => `<div class="al-mini-row">${avatarInitial(a.nome)}<span class="al-mini-nome">${esc(a.nome||'—')}</span>${badgeAluna(a.status)}</div>`,
      },
      {
        id: 'renovacao', color: '#2ecc71', n: `${taxaRenov}%`, lbl: 'Taxa de renovação',
        items: () => alunas.filter(a => a.status === 'Migrou'),
        ri: a => `<div class="al-mini-row">${avatarInitial(a.nome)}<span class="al-mini-nome">${esc(a.nome||'—')}</span>${badgeAluna(a.status)}</div>`,
      },
      {
        id: 'cancelamento', color: '#e74c3c', n: `${taxaCancel}%`, lbl: 'Taxa de cancelamento',
        items: () => cancelList,
        ri: a => `<div class="al-mini-row">${avatarInitial(a.nome)}<span class="al-mini-nome">${esc(a.nome||'—')}</span>${badgeAluna(a.status)}</div>`,
      },
      {
        id: 'sess-fernanda', color: '#4db5c8', n: sessFernandaList.length, lbl: 'Sessões — Fernanda',
        items: () => sessFernandaList,
        ri: s => { const a = alunas.find(x => x.id === s.aluna_id); return `<div class="al-mini-row"><span class="al-mini-nome">${esc(a?.nome||'—')}</span><span class="al-mini-date">${fmtDate(s.data||'')}</span></div>`; },
      },
      {
        id: 'sess-thomaz', color: '#d4982a', n: sessThomazList.length, lbl: 'Sessões — Thomaz',
        items: () => sessThomazList,
        ri: s => { const a = alunas.find(x => x.id === s.aluna_id); return `<div class="al-mini-row"><span class="al-mini-nome">${esc(a?.nome||'—')}</span><span class="al-mini-date">${fmtDate(s.data||'')}</span></div>`; },
      },
      {
        id: 'risco', color: '#c0392b', n: riscoList.length, lbl: 'Risco de cancelamento',
        items: () => riscoList,
        ri: a => `<div class="al-mini-row">${avatarInitial(a.nome)}<span class="al-mini-nome">${esc(a.nome||'—')}</span>${badgeAluna(a.status)}</div>`,
      },
      {
        id: 'sem30', color: '#c07080', n: sem30List.length, lbl: 'Sem sessão há 30+ dias',
        items: () => sem30List,
        ri: a => `<div class="al-mini-row">${avatarInitial(a.nome)}<span class="al-mini-nome">${esc(a.nome||'—')}</span>${badgeAluna(a.status)}</div>`,
      },
    ];

    // ── Chart data ───────────────────────────────────────────────────
    const MN = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const monthly = [];
    for (let i = 5; i >= 0; i--) {
      const d  = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthly.push({
        label: MN[d.getMonth()],
        count: sessoes.filter(s => s.status === 'Realizada' && s.data && s.data.startsWith(ym)).length,
      });
    }
    const maxM = Math.max(...monthly.map(m => m.count), 1);

    const prodData = ALUNAS_PRODUTOS.map(p => ({
      label: p,
      count: alunas.filter(a => a.produto === p).length,
    })).filter(p => p.count > 0);
    const maxP = Math.max(...prodData.map(p => p.count), 1);

    const cancelByProd = ALUNAS_PRODUTOS.map(p => {
      const tot = alunas.filter(a => a.produto === p).length;
      const can = alunas.filter(a => a.produto === p && ['Cancelado','Cliente Off','Reembolso'].includes(a.status)).length;
      return { label: p, pct: tot > 0 ? Math.round(can / tot * 100) : 0, tot };
    }).filter(p => p.tot > 0);

    // ── Month filter options (last 12 months) ────────────────────────
    const MNAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const mesOpts = Array.from({ length: 12 }, (_, i) => {
      const d  = new Date(today.getFullYear(), today.getMonth() - (11 - i), 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return `<option value="${ym}"${relFiltMes === ym ? ' selected' : ''}>${MNAMES[d.getMonth()]} ${d.getFullYear()}</option>`;
    }).join('');

    const scrollTop = el.scrollTop;

    el.innerHTML = `
      ${subPageTop('Relatórios', 'relatorios')}
      <div class="alunas-filters" style="margin-bottom:20px">
        <select class="filter-select" id="rel-fp">
          <option value="">Todos os produtos</option>
          ${ALUNAS_PRODUTOS.map(p => `<option value="${p}"${relFiltProduto === p ? ' selected' : ''}>${p}</option>`).join('')}
        </select>
        <select class="filter-select" id="rel-fm">
          <option value="">Todos os meses</option>
          ${mesOpts}
        </select>
        <select class="filter-select" id="rel-fr">
          <option value="">Todas as responsáveis</option>
          <option value="fernanda"${relFiltResp === 'fernanda' ? ' selected' : ''}>Fernanda</option>
          <option value="thomaz"${relFiltResp === 'thomaz' ? ' selected' : ''}>Thomaz</option>
        </select>
      </div>

      <div class="rel-metric-grid">
        ${metrics.map(m => `
          <button class="al-metric-card" data-rm="${m.id}">
            <span class="al-metric-n" style="color:${m.color}">${m.n}</span>
            <span class="al-metric-lbl">${m.lbl}</span>
          </button>`).join('')}
      </div>
      <div class="al-metric-panel" id="rel-panel" style="display:none"></div>

      <div class="rel-charts-row">
        <div class="rel-chart-card">
          <div class="rel-chart-title">Sessões realizadas por mês</div>
          <div class="rel-chart" style="margin-top:10px">
            ${monthly.map(m => `
              <div class="rel-chart-row">
                <span class="rel-chart-lbl">${m.label}</span>
                <div class="rel-chart-bars">
                  <div class="rel-bar" style="width:${m.count ? Math.round(m.count / maxM * 100) : 0}%;background:var(--petro-l)"></div>
                </div>
                <span class="rel-chart-val">${m.count}</span>
              </div>`).join('')}
          </div>
        </div>
        <div class="rel-chart-card">
          <div class="rel-chart-title">Alunas por produto</div>
          <div class="rel-chart" style="margin-top:10px">
            ${prodData.length
              ? prodData.map(p => `
                <div class="rel-chart-row">
                  <span class="rel-chart-lbl" style="font-size:10px">${p.label}</span>
                  <div class="rel-chart-bars">
                    <div class="rel-bar" style="width:${Math.round(p.count / maxP * 100)}%;background:#2ecc71"></div>
                  </div>
                  <span class="rel-chart-val">${p.count}</span>
                </div>`).join('')
              : '<p style="color:var(--t4);font-size:13px;margin:6px 0">Nenhum dado.</p>'}
          </div>
        </div>
        <div class="rel-chart-card">
          <div class="rel-chart-title">Cancelamento por produto</div>
          <div class="rel-chart" style="margin-top:10px">
            ${cancelByProd.length
              ? cancelByProd.map(p => `
                <div class="rel-chart-row">
                  <span class="rel-chart-lbl" style="font-size:10px">${p.label}</span>
                  <div class="rel-chart-bars">
                    <div class="rel-bar" style="width:${p.pct}%;background:#e06450"></div>
                  </div>
                  <span class="rel-chart-val">${p.pct}%</span>
                </div>`).join('')
              : '<p style="color:var(--t4);font-size:13px;margin:6px 0">Nenhum dado.</p>'}
          </div>
        </div>
      </div>`;

    el.scrollTop = scrollTop;

    // Filter listeners
    $('rel-fp')?.addEventListener('change', e => { relFiltProduto = e.target.value; render(); });
    $('rel-fm')?.addEventListener('change', e => { relFiltMes     = e.target.value; render(); });
    $('rel-fr')?.addEventListener('change', e => { relFiltResp    = e.target.value; render(); });

    // Metric card panel
    let activeCard = null;
    el.querySelectorAll('[data-rm]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mid   = btn.dataset.rm;
        const panel = $('rel-panel');
        if (activeCard === mid) {
          activeCard = null;
          btn.classList.remove('active');
          panel.style.display = 'none';
          return;
        }
        el.querySelectorAll('[data-rm]').forEach(b => b.classList.remove('active'));
        activeCard = mid;
        btn.classList.add('active');
        const m     = metrics.find(x => x.id === mid);
        const items = m?.items() || [];
        panel.style.display = 'block';
        panel.innerHTML = items.length
          ? `<div class="al-metric-panel-inner">${items.map(m.ri).join('')}</div>`
          : '<div class="al-metric-panel-inner"><p style="color:var(--t3);font-size:13px">Nenhum registro nesta categoria.</p></div>';
      });
    });
  };

  render();
}

// ─── MODAL ALUNA ─────────────────────────────────────────────────────
function openAlunaModal(aluna) {
  alunaEdit = aluna;
  $('am-title').textContent = aluna ? 'Editar Aluna' : 'Nova Aluna';
  $('am-nome').value          = aluna?.nome          || '';
  $('am-celular').value       = aluna?.celular        || '';
  $('am-email').value         = aluna?.email          || '';
  $('am-produto').value       = aluna?.produto        || '';
  $('am-status').value        = aluna?.status         || 'Nova compra';
  $('am-data-inscricao').value = aluna?.data_inscricao || '';
  $('am-data-termino').value  = aluna?.data_termino   || '';
  $('am-sessoes-total').value  = aluna?.sessoes_total  || 0;
  $('am-sessoes-realizadas').value = aluna?.sessoes_realizadas || 0;
  $('am-nome-grupo').value    = aluna?.nome_grupo     || '';
  $('am-obs').value           = aluna?.observacoes    || '';
  $('am-foto-file').value     = '';
  const prev = $('am-foto-preview');
  if (aluna?.foto_url) {
    prev.innerHTML = `<img src="${aluna.foto_url}" alt="">`;
  } else {
    prev.innerHTML = '<i data-lucide="user"></i>';
    lucide.createIcons({ nodes: [prev] });
  }
  $('am-backdrop').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('am-nome').focus(), 50);
}
function closeAlunaModal() {
  $('am-backdrop').style.display = 'none';
  document.body.style.overflow = '';
  alunaEdit = null;
}
async function salvarAluna() {
  const nome = $('am-nome').value.trim();
  if (!nome) { toast('Nome obrigatório.', 'err'); return; }
  const btn = $('am-salvar'); btn.disabled = true;

  let fotoUrl = alunaEdit?.foto_url || null;
  const fotoFile = $('am-foto-file')?.files?.[0];
  if (fotoFile && isLive) {
    try {
      const ext = fotoFile.name.split('.').pop().toLowerCase();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data: upData, error: upErr } = await supabase.storage
        .from('alunas-fotos').upload(path, fotoFile, { upsert: true });
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('alunas-fotos').getPublicUrl(upData.path);
        fotoUrl = publicUrl;
      } else { console.warn('[FDV] foto upload:', upErr); }
    } catch(e) { console.warn('[FDV] foto upload:', e); }
  }

  const dados = {
    nome,
    celular:           $('am-celular').value.trim(),
    email:             $('am-email').value.trim(),
    produto:           $('am-produto').value,
    status:            $('am-status').value,
    data_inscricao:    $('am-data-inscricao').value || null,
    data_termino:      $('am-data-termino').value   || null,
    sessoes_total:     parseInt($('am-sessoes-total').value) || 0,
    sessoes_realizadas: parseInt($('am-sessoes-realizadas').value) || 0,
    nome_grupo:        $('am-nome-grupo').value.trim(),
    foto_url:          fotoUrl,
    observacoes:       $('am-obs').value.trim(),
    atualizadoem:      new Date().toISOString(),
  };
  try {
    if (isLive) {
      if (alunaEdit) {
        const { error } = await supabase.from('alunas').update(dados).eq('id', alunaEdit.id);
        if (error) throw error;
        const idx = allAlunas.findIndex(a => a.id === alunaEdit.id);
        if (idx >= 0) allAlunas[idx] = { ...allAlunas[idx], ...dados };
      } else {
        const { data, error } = await supabase.from('alunas').insert({ ...dados, criadoem: new Date().toISOString() }).select().single();
        if (error) throw error;
        allAlunas.unshift(data);
      }
    } else {
      if (alunaEdit) {
        const idx = allAlunas.findIndex(a => a.id === alunaEdit.id);
        if (idx >= 0) allAlunas[idx] = { ...allAlunas[idx], ...dados };
      } else {
        allAlunas.unshift({ id: 'local-' + Date.now(), ...dados, criadoem: new Date().toISOString() });
      }
    }
    toast(alunaEdit ? 'Aluna atualizada.' : 'Aluna cadastrada.', 'ok');
    closeAlunaModal();
    renderSucesso();
  } catch(e) { console.error(e); toast('Erro ao salvar aluna.', 'err'); btn.disabled = false; }
}

// ─── MODAL SESSÃO ────────────────────────────────────────────────────
function openSessaoModal(sessao, alunaId) {
  sessaoEdit    = sessao;
  sessaoAlunaId = alunaId || sessao?.aluna_id || null;
  $('sm-title').textContent = sessao ? 'Editar Sessão' : 'Nova Sessão';
  const sel = $('sm-aluna');
  sel.innerHTML = `<option value="">Selecione a aluna…</option>` +
    allAlunas.map(a => `<option value="${a.id}"${a.id === sessaoAlunaId ? ' selected' : ''}>${esc(a.nome||'—')}</option>`).join('');
  $('sm-data').value   = sessao?.data   || '';
  $('sm-hora').value   = sessao?.hora?.slice(0,5) || '';
  $('sm-status').value = sessao?.status || 'Aguardando';
  $('sm-obs').value    = sessao?.observacoes || '';
  $('sm-backdrop').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeSessaoModal() {
  $('sm-backdrop').style.display = 'none';
  document.body.style.overflow = '';
  sessaoEdit = null; sessaoAlunaId = null;
}
async function salvarSessao() {
  const aId = $('sm-aluna').value;
  if (!aId) { toast('Selecione a aluna.', 'err'); return; }
  const btn = $('sm-salvar'); btn.disabled = true;
  const dados = {
    aluna_id:   aId,
    data:       $('sm-data').value || null,
    hora:       $('sm-hora').value || null,
    status:     $('sm-status').value,
    observacoes: $('sm-obs').value.trim(),
  };
  try {
    if (isLive) {
      if (sessaoEdit) {
        const { error } = await supabase.from('sessoes').update(dados).eq('id', sessaoEdit.id);
        if (error) throw error;
        const idx = allSessoes.findIndex(s => s.id === sessaoEdit.id);
        if (idx >= 0) allSessoes[idx] = { ...allSessoes[idx], ...dados };
      } else {
        const { data, error } = await supabase.from('sessoes').insert({ ...dados, criadoem: new Date().toISOString() }).select().single();
        if (error) throw error;
        allSessoes.push(data);
        // Increment sessoes_realizadas se Realizada
        if (dados.status === 'Realizada') {
          await supabase.from('alunas').update({ sessoes_realizadas: supabase.rpc ? undefined : undefined }).eq('id', aId);
          const a = allAlunas.find(x => x.id === aId);
          if (a && dados.status === 'Realizada') {
            a.sessoes_realizadas = (a.sessoes_realizadas||0) + 1;
            await supabase.from('alunas').update({ sessoes_realizadas: a.sessoes_realizadas, atualizadoem: new Date().toISOString() }).eq('id', aId);
          }
        }
      }
    } else {
      allSessoes.push({ id: 'local-' + Date.now(), ...dados, criadoem: new Date().toISOString() });
    }
    toast(sessaoEdit ? 'Sessão atualizada.' : 'Sessão registrada.', 'ok');
    closeSessaoModal();
    renderSucesso();
  } catch(e) { console.error(e); toast('Erro ao salvar sessão.', 'err'); btn.disabled = false; }
}

// ─── MODAL CONTRATO ──────────────────────────────────────────────────
function openContratoModal(contrato, alunaId) {
  contratoEdit    = contrato;
  contratoAlunaId = alunaId || contrato?.aluna_id || null;
  $('cm-title').textContent = contrato ? 'Editar Contrato' : 'Novo Contrato';
  const sel = $('cm-aluna');
  sel.innerHTML = `<option value="">Selecione a aluna…</option>` +
    allAlunas.map(a => `<option value="${a.id}"${a.id === contratoAlunaId ? ' selected' : ''}>${esc(a.nome||'—')}</option>`).join('');
  $('cm-produto').value           = contrato?.produto         || '';
  $('cm-data-inicio').value       = contrato?.data_inicio     || '';
  $('cm-data-vencimento').value   = contrato?.data_vencimento || '';
  $('cm-assinado').checked        = contrato?.assinado        || false;
  $('cm-no-grupo').checked        = contrato?.esta_no_grupo   || false;
  $('cm-obs').value               = contrato?.observacoes     || '';
  $('cm-backdrop').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeContratoModal() {
  $('cm-backdrop').style.display = 'none';
  document.body.style.overflow = '';
  contratoEdit = null; contratoAlunaId = null;
}
async function salvarContrato() {
  const aId = $('cm-aluna').value;
  if (!aId) { toast('Selecione a aluna.', 'err'); return; }
  const btn = $('cm-salvar'); btn.disabled = true;
  const dados = {
    aluna_id:       aId,
    produto:        $('cm-produto').value,
    data_inicio:    $('cm-data-inicio').value     || null,
    data_vencimento: $('cm-data-vencimento').value || null,
    assinado:       $('cm-assinado').checked,
    esta_no_grupo:  $('cm-no-grupo').checked,
    observacoes:    $('cm-obs').value.trim(),
  };
  try {
    if (isLive) {
      if (contratoEdit) {
        const { error } = await supabase.from('contratos').update(dados).eq('id', contratoEdit.id);
        if (error) throw error;
        const idx = allContratos.findIndex(c => c.id === contratoEdit.id);
        if (idx >= 0) allContratos[idx] = { ...allContratos[idx], ...dados };
      } else {
        const { data, error } = await supabase.from('contratos').insert({ ...dados, criadoem: new Date().toISOString() }).select().single();
        if (error) throw error;
        allContratos.unshift(data);
      }
    } else {
      allContratos.unshift({ id: 'local-' + Date.now(), ...dados, criadoem: new Date().toISOString() });
    }
    toast(contratoEdit ? 'Contrato atualizado.' : 'Contrato cadastrado.', 'ok');
    closeContratoModal();
    renderSucesso();
  } catch(e) { console.error(e); toast('Erro ao salvar contrato.', 'err'); btn.disabled = false; }
}

function renderFinanceiro() {
  const el = $('financeiro-content');
  if (!el) return;

  document.querySelectorAll('[data-financeiro-sub]').forEach(b =>
    b.classList.toggle('active', b.dataset.financeiroSub === activeFinanceiroSub)
  );

  if (!activeFinanceiroSub) {
    el.innerHTML = `
      <div class="module-landing">
        <div class="module-landing-header">
          <div class="module-landing-header-icon"
               style="background:rgba(46,204,113,.10);border:1px solid rgba(46,204,113,.25)">
            <i data-lucide="coins" style="color:#2ecc71"></i>
          </div>
          <div>
            <h1>Financeiro</h1>
            <p>Inadimplência, pagamentos e relatórios financeiros</p>
          </div>
        </div>
        <div class="module-landing-cards">
          ${Object.entries(FINANCEIRO_SUBS).map(([key, s]) => `
            <button class="module-landing-card" data-go-financeiro="${key}">
              <span class="mlc-icon" style="color:${s.color}"><i data-lucide="${s.icon}"></i></span>
              <span class="mlc-title">${s.label}</span>
              <span class="mlc-desc">${s.desc}</span>
            </button>`).join('')}
        </div>
      </div>`;
    el.querySelectorAll('[data-go-financeiro]').forEach(btn =>
      btn.addEventListener('click', () => switchFinanceiroSub(btn.dataset.goFinanceiro))
    );
    if (typeof lucide !== 'undefined') lucide.createIcons();
  } else {
    const s = FINANCEIRO_SUBS[activeFinanceiroSub];
    el.innerHTML = `
      <div class="page-top">
        <div class="page-title-block">
          <h1>Financeiro <span style="color:var(--t3);font-weight:400;font-size:18px">/ ${s ? s.label : activeFinanceiroSub}</span></h1>
        </div>
      </div>
      <div class="placeholder-module">
        <div class="placeholder-icon">${_S(`<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>`,48,';color:var(--t3)')}</div>
        <h3>${s ? s.label : activeFinanceiroSub}</h3>
        <p>Este módulo está em desenvolvimento e estará disponível em breve.</p>
      </div>`;
  }
}

// ─── RENDER ALL ──────────────────────────────────────────────────────
function renderAll() {
  allLeads.sort((a, b) => (b.datachegada || '').localeCompare(a.datachegada || ''));
  buildDupMap();
  populateAllMonths();
  populateFilterDropdowns();
  updateStats();
  if      (activeTab === 'inicio')       renderInicio();
  else if (activeTab === 'comercial')    renderComercial();
  else if (activeTab === 'agendamentos') renderActiveSub();
  else if (activeTab === 'closer')       renderKanban();
  else if (activeTab === 'relatorios')   renderRelatorios();
  else if (activeTab === 'whatsapp')     renderCentralChats();
  else if (activeTab === 'sucesso')      renderSucesso();
  else if (activeTab === 'financeiro')   renderFinanceiro();
}

// ─── INÍCIO ──────────────────────────────────────────────────────────
const VERSES = [
  "Não vos conformeis com este século, mas transformai-vos pela renovação da vossa mente. — Romanos 12:2",
  "Renovai-vos no espírito da vossa mente. — Efésios 4:23",
  "Revesti-vos do novo homem, que se renova para o conhecimento. — Colossenses 3:10",
  "Se alguém está em Cristo, é nova criatura; as coisas velhas já passaram. — 2 Coríntios 5:17",
  "Porque eu sei os planos que tenho para vós, diz o Senhor, planos de paz e não de mal. — Jeremias 29:11",
  "Sou maravilhosamente constituído. — Salmos 139:14",
  "Então farás prosperar o teu caminho e serás bem-sucedido. — Josué 1:8",
  "Amado, desejo que sejas próspero em tudo e que tenhas saúde. — 3 João 1:2",
  "O Senhor te porá por cabeça e não por cauda. — Deuteronômio 28:13",
  "Os que esperam no Senhor renovarão as suas forças, subirão com asas como águias. — Isaías 40:31",
  "Ele faz os meus pés como os da corça e me coloca nos lugares altos. — Salmos 18:33",
  "O Senhor Deus é a minha força; ele faz os meus pés como os da corça. — Habacuque 3:19",
  "E conhecereis a verdade, e a verdade vos libertará. — João 8:32",
  "Levando cativo todo pensamento à obediência de Cristo. — 2 Coríntios 10:5",
  "Posso todas as coisas naquele que me fortalece. — Filipenses 4:13",
];

// ─── VERSO — estado de rotação ───────────────────────────────────────
let _verseIdx   = -1;
let _verseTimer = null;

function _pickVerseIdx() {
  let idx;
  do { idx = Math.floor(Math.random() * VERSES.length); } while (idx === _verseIdx && VERSES.length > 1);
  _verseIdx = idx;
  return idx;
}

function _parseVerse(raw) {
  const sep = raw.lastIndexOf(' — ');
  return {
    text: sep >= 0 ? raw.slice(0, sep) : raw,
    ref:  sep >= 0 ? raw.slice(sep + 3) : '',
  };
}

function _updateVerseWithFade() {
  const card = document.getElementById('inicio-verse-card');
  if (!card) return;
  card.style.opacity = '0';
  setTimeout(() => {
    const { text, ref } = _parseVerse(VERSES[_pickVerseIdx()]);
    card.querySelector('.inicio-verse-text').textContent = text;
    card.querySelector('.inicio-verse-ref').textContent  = ref;
    card.style.opacity = '1';
  }, 800);
}

function renderInicio() {
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

  // realizadaem é a data primária de fechamento; kanban_column_since como fallback.
  // Canceladas (status da tabela vendas) são excluídas de faturamento e contagem.
  const isVendaMes  = l => l.kanban_column === 'venda_ganha' &&
    l.venda_ganha_dados?.status !== 'cancelada' &&
    ((l.realizadaem||l.kanban_column_since||l.datachegada||'').startsWith(thisMonth));
  const isVendaPrev = l => l.kanban_column === 'venda_ganha' &&
    l.venda_ganha_dados?.status !== 'cancelada' &&
    ((l.realizadaem||l.kanban_column_since||l.datachegada||'').startsWith(prevMonth));
  // --- DEBUG faturamento ---
  const _vendasGanha = allLeads.filter(l => l.kanban_column === 'venda_ganha');
  console.group('[Início] Diagnóstico faturamento — thisMonth:', thisMonth);
  console.log('Total venda_ganha:', _vendasGanha.length);
  _vendasGanha.forEach(l => {
    const dateUsada = l.realizadaem || l.kanban_column_since || l.datachegada || '';
    const passa = dateUsada.startsWith(thisMonth);
    console.log(
      passa ? '✅ PASSA' : '❌ FORA',
      l.nome || l.id,
      '| kanban_column_since:', l.kanban_column_since || '(vazio)',
      '| realizadaem:', l.realizadaem || '(vazio)',
      '| datachegada:', l.datachegada || '(vazio)',
      '| dateUsada:', dateUsada,
      '| valor:', l.venda_ganha_dados?.valor
    );
  });
  const _passam = _vendasGanha.filter(isVendaMes);
  const _totalFat = _passam.reduce((s,l) => s + parseValor(l.venda_ganha_dados?.valor), 0);
  console.log('Vendas que passam no filtro:', _passam.length, '→ Total:', _totalFat);
  console.groupEnd();
  // --- fim DEBUG ---
  const fatAtual = allLeads.filter(isVendaMes).reduce((s,l) => s + parseValor(l.venda_ganha_dados?.valor), 0);
  const fatPrev  = allLeads.filter(isVendaPrev).reduce((s,l) => s + parseValor(l.venda_ganha_dados?.valor), 0);
  const diffFat  = fatAtual - fatPrev;
  const fmtFat   = n => n ? n.toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:0,maximumFractionDigits:0}) : 'R$ 0';

  // Leads Hoje e Calls Hoje já filtram por data exata ✓
  const leadsHoje = allLeads.filter(l => (l.datachegada||'').startsWith(todayStr)).length;

  const callsHojeList = allLeads
    .filter(l => (l.dataagendamento||'').startsWith(todayStr))
    .sort((a,b) => (a.horaagendamento||'').localeCompare(b.horaagendamento||''));
  const callsHoje   = callsHojeList.length;
  const proximaCall = callsHojeList.find(l => (l.horaagendamento||'') >= nowTime);
  const proximaHora = proximaCall?.horaagendamento?.slice(0,5) || null;

  // Conversão: leads entrados este mês que viraram venda este mês
  const leadesMes      = allLeads.filter(l => (l.datachegada||'').startsWith(thisMonth)).length;
  const vendasMesCount = allLeads.filter(isVendaMes).length;
  const convMes = leadesMes ? Math.round(vendasMesCount / leadesMes * 100) : 0;

  // Funil: apenas leads com datachegada neste mês (cohort mensal)
  const mesLeads = allLeads.filter(l => (l.datachegada||'').startsWith(thisMonth));
  // Funil usa períodos corretos por etapa:
  // Leads/Qualificados → datachegada this month (quem entrou)
  // Agendados/Calls/NoShow → dataagendamento this month (quando a call estava marcada)
  // Vendas → kanban_column_since this month (quando fechou)
  const fLeads  = mesLeads.length;
  const fQualif = mesLeads.filter(l => !['aguardando','descartado','cancelado'].includes(l.status)).length;
  const agendMes = allLeads.filter(l => (l.dataagendamento||'').startsWith(thisMonth));
  const fAgend  = agendMes.length;
  const fCalls  = agendMes.filter(l => l.status === 'realizada').length;
  const fNoShow = agendMes.filter(l => l.status === 'noshow').length;
  const fVendas = allLeads.filter(isVendaMes).length;
  const fRealiz = Math.max(fCalls - fNoShow, 0);
  const pctQ  = fLeads  ? Math.round(fQualif/fLeads *100) : 0;
  const pctC  = fAgend  ? Math.round(fCalls /fAgend *100) : 0;
  const pctNS = fCalls  ? Math.round(fNoShow/fCalls *100) : 0;
  const pctV  = fRealiz ? Math.round(fVendas/fRealiz*100) : 0;

  const arrowSvg = (rate) => `
    <div class="funil-connector">
      <div class="funil-rate">${rate != null ? rate+'%' : ''}</div>
      <svg class="funil-arrow-line" viewBox="0 0 36 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
        <line x1="0" y1="7" x2="28" y2="7"/>
        <polyline points="22,2 30,7 22,12"/>
      </svg>
    </div>`;

  const imc = (nav, delay, label, value, sub, subCls, iconSvg, valueColor, heroClass) => `
    <div class="imc ${heroClass||''} inicio-nav-card fdv-fade-up" data-inicio-nav="${nav}" style="animation-delay:${delay}s">
      <div class="imc-icon">${iconSvg}</div>
      <div class="imc-label">${label}</div>
      <div class="imc-value"${valueColor?` style="color:${valueColor}"`:''} >${value}</div>
      <div class="imc-sub ${subCls||''}">${sub}</div>
    </div>`;

  const ICO20 = (d) => _S(d, 20);
  const fatDiffLabel = diffFat !== 0
    ? (diffFat >= 0 ? '+' : '') + fmtFat(Math.abs(diffFat)) + ' vs mês ant.'
    : 'mesmo que mês anterior';

  el.innerHTML = `<div class="inicio-wrap">
    <div class="inicio-header fdv-fade-up" style="animation-delay:0s">
      <h1 class="inicio-greeting">${greet}, ${name}!</h1>
      <p class="inicio-date">${dateStr}</p>
    </div>
    <div class="inicio-verse-card fdv-fade-up" id="inicio-verse-card" style="animation-delay:0.08s">
      <div class="inicio-verse-text">${verseText}</div>
      <div class="inicio-verse-ref">${verseRef}</div>
    </div>
    <div class="inicio-metrics">
      ${imc('vendas',0.16,'Faturamento do Mês',fmtFat(fatAtual),fatDiffLabel,
        diffFat>0?'imc-pos':diffFat<0?'imc-neg':'',
        ICO20('<polyline points="22 7 13 7 13 17"/><polyline points="2 17 13 7 17 11 22 6"/>'),
        'var(--gold)', 'imc--hero')}
      ${imc('novos',0.22,'Leads Hoje',leadsHoje,'novos hoje','',
        ICO20('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>'))}
      ${imc('agendados',0.28,'Calls Hoje',callsHoje,
        proximaHora?'próxima às '+proximaHora:'nenhuma próxima','',
        ICO20('<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>'))}
      ${imc('relatorios',0.34,'Conversão do Mês',convMes+'%',
        vendasMesCount+' lead'+(vendasMesCount!==1?'s':'')+' convertido'+(vendasMesCount!==1?'s':''),'',
        ICO20('<circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/><path d="m9 12 2 2 4-4"/>'))}
    </div>
    <div class="inicio-funil fdv-fade-up" style="animation-delay:0.38s">
      <div class="funil-stage"><div class="funil-label">Leads</div><div class="funil-num">${fLeads}</div><div class="funil-ns-slot"></div></div>
      ${arrowSvg(pctQ)}
      <div class="funil-stage"><div class="funil-label">Qualificados</div><div class="funil-num">${fQualif}</div><div class="funil-ns-slot"></div></div>
      ${arrowSvg(null)}
      <div class="funil-stage"><div class="funil-label">Agendados</div><div class="funil-num">${fAgend}</div><div class="funil-ns-slot"></div></div>
      ${arrowSvg(pctC)}
      <div class="funil-stage">
        <div class="funil-label">C. Realizadas</div>
        <div class="funil-num">${fCalls}</div>
        <div class="funil-ns-slot">${fNoShow > 0 ? `<div class="funil-ns-inline">↓ ${fNoShow} no-show (${pctNS}%)</div>` : ''}</div>
      </div>
      ${arrowSvg(pctV)}
      <div class="funil-stage"><div class="funil-label">Vendas</div><div class="funil-num" style="color:var(--gold)">${fVendas}</div><div class="funil-ns-slot"></div></div>
    </div>
    <div class="inicio-agenda fdv-fade-up" style="animation-delay:0.44s">
      <div class="ia-header">
        ${_S('<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',15)}
        <span class="ia-title">Agenda de Hoje</span>
        <span class="ia-count">${callsHoje} call${callsHoje!==1?'s':''}</span>
      </div>
      ${callsHojeList.length ? callsHojeList.map(l => `
        <div class="ia-row">
          <span class="ia-hora">${l.horaagendamento?.slice(0,5)||'—'}</span>
          <button class="ia-nome nome-link" data-perfil="${l.id}">${esc(l.nome||'—')}</button>
          <span class="ia-closer">${esc(CLOSERS[l.closer]?.name||l.closer||'—')}</span>
          ${badgeStatus(l.status)}
        </div>`).join('') :
        '<div class="ia-empty">Nenhuma call agendada para hoje</div>'}
    </div>
  </div>`;

  el.querySelectorAll('.ia-row [data-perfil]').forEach(btn => {
    btn.addEventListener('click', () => {
      const l = allLeads.find(x => x.id === btn.dataset.perfil);
      if (l) openPerfil(l);
    });
  });
}

// ─── LEADS LIST ──────────────────────────────────────────────────────
function populateFilterDropdowns() {
  const uniq = arr => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const repopulate = (id, values, allLabel) => {
    const el = $(id);
    if (!el) return;
    const cur = el.value;
    el.innerHTML = `<option value="">${allLabel}</option>` +
      values.map(v => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(v)}</option>`).join('');
  };

  repopulate('filter-renda',            uniq(allLeads.map(l => l.renda)),       'Todas');
  repopulate('filter-profissao',        uniq(allLeads.map(l => l.profissao)),   'Todas');
  repopulate('filter-agendadopor',      uniq(allLeads.map(l => l.agendadopor)), 'Todos');
  repopulate('filter-etiqueta',         uniq(allLeads.flatMap(l => l.etiquetas || [])), 'Todas');
  // Filtros da aba Agendados
  repopulate('agend-filter-renda',      uniq(allLeads.map(l => l.renda)),       'Todas');
  repopulate('agend-filter-agendadopor',uniq(allLeads.map(l => l.agendadopor)), 'Todos');

  const KANBAN_LABELS = {
    agendado:'Agendado', call_realizada:'Call Realizada', negociacao:'Negociação',
    decisao:'Decisão', venda_ganha:'Venda Ganha', venda_perdida:'Venda Perdida',
    qualificado:'Qualificado', descartado:'Descartado',
  };
  const elK = $('filter-kanban');
  if (elK) {
    const cur = elK.value;
    const vals = uniq(allLeads.map(l => l.kanban_column).filter(Boolean));
    elK.innerHTML = `<option value="">Todos</option>` +
      vals.map(v => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(KANBAN_LABELS[v] || v)}</option>`).join('');
  }
}

function applyFilters() {
  // Novos sub sempre mostra apenas leads 'aguardando'
  const status      = activeSub === 'novos' ? 'aguardando' : ($('filter-status')?.value || '');
  const origem      = $('filter-origem').value;
  const mes         = $('filter-mes').value;
  const busca       = $('filter-busca').value.toLowerCase().trim();
  const closer      = $('filter-closer')?.value || '';
  const renda       = $('filter-renda')?.value || '';
  const profissao   = $('filter-profissao')?.value || '';
  const etiqueta    = $('filter-etiqueta')?.value || '';
  const kanban      = $('filter-kanban')?.value || '';
  const chegadaDe   = $('filter-chegada-de')?.value || '';
  const chegadaAte  = $('filter-chegada-ate')?.value || '';
  const agendadopor = $('filter-agendadopor')?.value || '';

  filteredLeads = allLeads.filter(l => {
    if (status      && l.status !== status) return false;
    if (origem      && l.origem !== origem) return false;
    if (mes         && !(l.datachegada || '').startsWith(mes)) return false;
    if (busca) {
      const n = (l.nome    || '').toLowerCase();
      const c = (l.celular || '').toLowerCase();
      if (!n.includes(busca) && !c.includes(busca)) return false;
    }
    if (closer      && l.closer !== closer) return false;
    if (renda       && l.renda !== renda) return false;
    if (profissao   && l.profissao !== profissao) return false;
    if (etiqueta    && !(l.etiquetas  || []).includes(etiqueta)) return false;
    if (kanban      && l.kanban_column !== kanban) return false;
    if (chegadaDe   && (l.datachegada || '') < chegadaDe) return false;
    if (chegadaAte  && (l.datachegada || '') > chegadaAte) return false;
    if (agendadopor && l.agendadopor !== agendadopor) return false;
    return true;
  });

  const { col: _nsc, dir: _nsd } = TABLE_SORT['novos'] || {};
  filteredLeads = _nsc && _nsd
    ? sortTable(filteredLeads, _nsc, _nsd)
    : [...filteredLeads].sort((a, b) => (b.datachegada||'').localeCompare(a.datachegada||''));

  renderTable();
  renderCards();
  updateCount();
  updateStats();
  updateSortIcons(document.querySelector('.leads-table thead tr'), 'novos');
}

// ─── AGENDA SUB ──────────────────────────────────────────────────────
function renderAgendaSub() {
  const dataFilt       = $('agenda-filter-data')?.value;
  const mesFilt        = $('agenda-filter-mes')?.value || '';
  const closerFilt     = $('agend-filter-closer')?.value || '';
  const origemFilt     = $('agend-filter-origem')?.value || '';
  const agendadoporFilt= $('agend-filter-agendadopor')?.value || '';
  const rendaFilt      = $('agend-filter-renda')?.value || '';
  const chegadaDe      = $('agend-filter-chegada-de')?.value || '';
  const chegadaAte     = $('agend-filter-chegada-ate')?.value || '';
  const busca          = ($('agend-filter-busca')?.value || '').toLowerCase().trim();
  const content        = $('agenda-content');
  // remove qualquer dropdown portado para body de um render anterior
  document.querySelectorAll('[data-fdv-res-portal]').forEach(d => d.remove());

  // Calendário lateral
  if (agendaCalYear === 0) { const n = new Date(); agendaCalYear = n.getFullYear(); agendaCalMonth = n.getMonth(); }
  renderMiniCal(agendaCalYear, agendaCalMonth);

  // histórico completo — todos os leads com dataagendamento
  let leads = allLeads.filter(l => l.dataagendamento);
  if (dataFilt)          leads = leads.filter(l => l.dataagendamento === dataFilt);
  else if (mesFilt)      leads = leads.filter(l => (l.dataagendamento || '').startsWith(mesFilt));
  if (closerFilt)        leads = leads.filter(l => (l.closer || '') === closerFilt);
  if (origemFilt)        leads = leads.filter(l => l.origem === origemFilt);
  if (agendadoporFilt)   leads = leads.filter(l => l.agendadopor === agendadoporFilt);
  if (rendaFilt)         leads = leads.filter(l => l.renda === rendaFilt);
  if (chegadaDe)         leads = leads.filter(l => (l.datachegada||'') >= chegadaDe);
  if (chegadaAte)        leads = leads.filter(l => (l.datachegada||'') <= chegadaAte);
  if (busca)             leads = leads.filter(l => (l.nome||'').toLowerCase().includes(busca) || (l.celular||'').includes(busca));

  const { col: _agc, dir: _agd } = TABLE_SORT['agendamentos'] || {};
  if (_agc && _agd) {
    leads = sortTable(leads, _agc, _agd);
  } else {
    leads.sort((a, b) =>
      ((b.dataagendamento||'') + (b.horaagendamento||'')).localeCompare(
       (a.dataagendamento||'') + (a.horaagendamento||''))
    );
  }

  if (!leads.length) {
    content.innerHTML = `<div class="agenda-empty">
      <i data-lucide="calendar-x" class="empty-lucide"></i>
      <h3>Nenhuma call encontrada</h3><p>Sem calls para os filtros selecionados.</p></div>`;
    lucide.createIcons();
    return;
  }

  content.innerHTML = `<div class="agenda-list fdv-list-container">
    <div class="al-head">
      <label class="al-check-wrap"><input type="checkbox" id="al-check-all"></label>
      <span data-sort-col="dataagendamento">Data</span>
      <span data-sort-col="nome">Nome</span>
      <span data-sort-col="closer">Closer</span>
      <span data-sort-col="status">Status</span>
      <span>Ações</span>
    </div>
    ${leads.map(l => {
      const c = CLOSERS[l.closer];
      const closerName  = c ? c.name  : (l.closer || '—');
      const closerColor = c ? c.color : 'var(--t3)';
      return `<div class="al-row fdv-list-row">
        <label class="al-check-wrap"><input type="checkbox" class="al-check-row" data-id="${l.id}"></label>
        <span class="al-data">${fmtDate(l.dataagendamento)}</span>
        <button class="al-nome" data-perfil="${l.id}">${esc(l.nome||'—')}</button>
        <span class="al-meta">${fmtHora(l.horaagendamento)} · <span style="color:${closerColor}">${esc(closerName)}</span></span>
        ${badgeAgendStatus(l.status, l.status_closer)}
        <div class="al-actions">
          <div class="contato-dropdown-wrap">
            <button class="btn-primary btn-sm btn-res-toggle" data-id="${l.id}">${ICO_PHONE_CHECK} Resultado ▾</button>
            <div class="contato-dropdown" style="display:none">
              <button class="contato-opt btn-res-opt" data-id="${l.id}" data-action="realizada">✓ Call Realizada</button>
              <button class="contato-opt contato-opt--danger btn-res-opt" data-id="${l.id}" data-action="noshow">✕ No Show</button>
            </div>
          </div>
          <button class="btn-ghost btn-sm btn-briefing-open${l.briefing?' has-briefing':''}" data-id="${l.id}" title="${l.briefing?'Ver/Editar Briefing':'Adicionar Briefing'}">${ICO_CLIPBOARD} Briefing</button>
          <button class="btn-ghost btn-sm btn-editar-agend" data-id="${l.id}" title="Editar agendamento">${ICO_PENCIL}</button>
          <button class="btn-icon btn-excluir-agend btn-destructive" data-id="${l.id}" title="Excluir agendamento">${ICO_TRASH}</button>
        </div>
      </div>`;
    }).join('')}
  </div>`;

  bindSortHeaders(content.querySelector('.al-head'), 'agendamentos', renderAgendaSub);

  content.querySelectorAll('[data-perfil]').forEach(b =>
    b.addEventListener('click', () => { const l = allLeads.find(x=>x.id===b.dataset.perfil); if(l) openPerfil(l); })
  );
  content.querySelectorAll('.btn-briefing-open').forEach(b =>
    b.addEventListener('click', () => { const l = allLeads.find(x=>x.id===b.dataset.id); if(l) openBriefing(l); })
  );
  content.querySelectorAll('.btn-editar-agend').forEach(b =>
    b.addEventListener('click', () => { const l = allLeads.find(x=>x.id===b.dataset.id); if(l) openEditarAgendamento(l); })
  );
  content.querySelectorAll('.btn-excluir-agend').forEach(b =>
    b.addEventListener('click', () => excluirAgendamento(b.dataset.id))
  );

  const checkAll = content.querySelector('#al-check-all');
  if (checkAll) {
    checkAll.addEventListener('change', () => {
      content.querySelectorAll('.al-check-row').forEach(c => c.checked = checkAll.checked);
    });
  }

  if (content._resClickHandler)  content.removeEventListener('click', content._resClickHandler);
  if (content._resOutsideHandler) document.removeEventListener('click', content._resOutsideHandler);

  // ── helpers do portal ────────────────────────────────────────────────
  const closeAllRes = () => {
    const p = document.querySelector('[data-fdv-res-portal]');
    if (p) {
      if (p._resWrap && document.contains(p._resWrap)) p._resWrap.appendChild(p);
      else p.remove();
      p.removeAttribute('data-fdv-res-portal');
      p.style.display = 'none';
      ['position','top','left','bottom','zIndex'].forEach(k => p.style[k] = '');
    }
    content.querySelectorAll('.contato-dropdown').forEach(d => d.style.display = 'none');
  };

  const handleResAction = async (id, action) => {
    closeAllRes();
    const lead = allLeads.find(l => l.id === id);
    if (!lead) return;
    if (action === 'realizada') {
      const upd = { status:'realizada', status_closer:'call_realizada', kanban_column:'call_realizada',
                    realizadaem:new Date().toISOString(), atualizadoem:new Date().toISOString() };
      try { await saveLead(id, upd); toast(`Call Realizada — ${lead.nome}`, 'ok'); renderAll(); }
      catch(err) { console.error('[FDV] res-opt realizada:', err); toast('Erro ao salvar.', 'err'); }
    } else if (action === 'noshow') {
      const upd = { status:'noshow', kanban_column:null, atualizadoem:new Date().toISOString() };
      try { await saveLead(id, upd); toast(`No Show — ${lead.nome}`, 'ok'); renderAll(); }
      catch(err) { console.error('[FDV] res-opt noshow:', err); toast('Erro ao salvar.', 'err'); }
    }
  };

  // ── handler principal ────────────────────────────────────────────────
  content._resClickHandler = e => {
    const toggle = e.target.closest('.btn-res-toggle');
    if (toggle) {
      e.stopPropagation();
      const wrap     = toggle.closest('.contato-dropdown-wrap');
      const portaled = document.querySelector('[data-fdv-res-portal]');
      // dropdown pode estar no wrap (normal) ou já portado para o body
      const drop = wrap?.querySelector('.contato-dropdown')
                ?? (portaled?._resWrap === wrap ? portaled : null);
      if (!drop) return;
      const isOpen = drop === portaled;
      closeAllRes();
      if (!isOpen) {
        const rect = toggle.getBoundingClientRect();
        drop._resWrap = wrap;
        drop.setAttribute('data-fdv-res-portal', '');
        document.body.appendChild(drop);
        drop.style.display  = 'block';
        drop.style.position = 'absolute';
        drop.style.zIndex   = '9999';
        const dropH  = drop.offsetHeight;
        const openUp = rect.bottom + dropH > window.innerHeight;
        drop.style.left   = (rect.left + window.scrollX) + 'px';
        drop.style.top    = openUp
          ? (rect.top    + window.scrollY - dropH - 3) + 'px'
          : (rect.bottom + window.scrollY + 3) + 'px';
        drop.style.bottom = 'auto';
        // listener adicionado uma única vez por elemento (sobrevive a re-portals do mesmo el)
        if (!drop._resListenerAdded) {
          drop._resListenerAdded = true;
          drop.addEventListener('click', ev => {
            const btn = ev.target.closest('.btn-res-opt');
            if (btn) { ev.stopPropagation(); handleResAction(btn.dataset.id, btn.dataset.action); }
          });
        }
      }
      return;
    }
    // fallback: clique em opção não-portada (caso edge)
    const opt = e.target.closest('.btn-res-opt');
    if (!opt) return;
    handleResAction(opt.dataset.id, opt.dataset.action);
  };
  content.addEventListener('click', content._resClickHandler);

  content._resOutsideHandler = e => {
    const portaled = document.querySelector('[data-fdv-res-portal]');
    if (portaled) {
      if (!portaled.contains(e.target) && !e.target.closest('.btn-res-toggle')) closeAllRes();
    } else if (!content.contains(e.target)) {
      content.querySelectorAll('.contato-dropdown').forEach(d => d.style.display = 'none');
    }
  };
  document.addEventListener('click', content._resOutsideHandler);
}

// ─── BRIEFING SUB ────────────────────────────────────────────────────
function renderBriefingSub() {
  const dataFilt   = $('briefing-filter-data')?.value;
  const mesFilt    = $('briefing-filter-mes').value;
  const closerFilt = $('briefing-filter-closer').value;
  const busca      = ($('briefing-filter-busca')?.value || '').toLowerCase().trim();
  const content    = $('briefing-content');

  // Apenas leads com briefing preenchido
  let leads = allLeads.filter(l => l.dataagendamento && l.briefing);
  if (dataFilt)     leads = leads.filter(l => l.dataagendamento === dataFilt);
  else if (mesFilt) leads = leads.filter(l => (l.dataagendamento||'').startsWith(mesFilt));
  if (closerFilt)   leads = leads.filter(l => (l.closer||'') === closerFilt);
  if (busca)        leads = leads.filter(l => (l.nome||'').toLowerCase().includes(busca));
  leads.sort((a,b) => ((a.dataagendamento||'')+(a.horaagendamento||'')).localeCompare((b.dataagendamento||'')+(b.horaagendamento||'')));

  if (!leads.length) {
    content.innerHTML = `<div class="agenda-empty">
      <i data-lucide="clipboard-list" class="empty-lucide"></i>
      <h3>Nenhum briefing preenchido</h3>
      <p>Briefings adicionados via aba Agendados aparecerão aqui.</p></div>`;
    lucide.createIcons();
    return;
  }

  content.innerHTML = `<div class="briefing-list">${leads.map(l => {
    const closerName = l.closer ? (CLOSERS[l.closer]?.name||l.closer) : '—';
    return `<div class="briefing-card">
      <div class="briefing-card-head">
        <div>
          <button class="briefing-nome" data-perfil="${l.id}">${esc(l.nome||'—')}</button>
          <span class="briefing-meta">${fmtDateHora(l.dataagendamento,l.horaagendamento)} · ${esc(closerName)}</span>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn-ghost btn-sm btn-ver-briefing" data-id="${l.id}">Ver Briefing</button>
          <button class="btn-ghost btn-sm btn-briefing-open has-briefing" data-id="${l.id}">${ICO_PENCIL} Editar</button>
        </div>
      </div>
    </div>`;
  }).join('')}</div>`;

  content.querySelectorAll('[data-perfil]').forEach(b =>
    b.addEventListener('click', () => { const l = allLeads.find(x=>x.id===b.dataset.perfil); if(l) openPerfil(l); })
  );
  content.querySelectorAll('.btn-ver-briefing').forEach(b =>
    b.addEventListener('click', () => { const l = allLeads.find(x=>x.id===b.dataset.id); if(l) openBriefing(l, true); })
  );
  content.querySelectorAll('.btn-briefing-open').forEach(b =>
    b.addEventListener('click', () => { const l = allLeads.find(x=>x.id===b.dataset.id); if(l) openBriefing(l, false); })
  );
}

// ─── SUB-BADGE COUNTS ────────────────────────────────────────────────
function updateSubBadges() {}

// ─── QUALIFICADOS SUB ────────────────────────────────────────────────
function renderQualificados() {
  qualSelectedIds.clear();

  const hoje = new Date();

  function daysSince(dateStr) {
    if (!dateStr) return '?';
    return Math.max(0, Math.round((hoje - new Date(dateStr + 'T00:00:00')) / 86400000));
  }

  function daysSinceTs(ts) {
    if (!ts) return '?';
    return Math.max(0, Math.round((hoje - new Date(ts)) / 86400000));
  }

  function dropdownContato(id) {
    return `<div class="contato-dropdown-wrap">
      <button class="btn-primary btn-sm btn-contato-toggle" data-id="${id}">+ Contato</button>
      <div class="contato-dropdown" id="cdrop-${id}" style="display:none">
        <button class="contato-opt" data-lead="${id}" data-cc="1" data-sf="em_contato">1º contato</button>
        <button class="contato-opt" data-lead="${id}" data-cc="2" data-sf="em_contato">2º contato</button>
        <button class="contato-opt" data-lead="${id}" data-cc="3" data-sf="em_contato">3º contato ou mais</button>
        <button class="contato-opt contato-opt--danger" data-lead="${id}" data-sf="sem_resposta">Sem resposta</button>
      </div>
    </div>`;
  }

  function rowSemContato(l) {
    const dias = daysSince(l.datachegada);
    return `<div class="followup-row fdv-list-row" data-id="${l.id}">
      <div class="cell-chk"><input type="checkbox" class="qual-row-chk" data-id="${l.id}" ${qualSelectedIds.has(l.id)?'checked':''}></div>
      <div>${fmtDate(l.datachegada)}<br><small style="color:var(--t3)">há ${dias}d</small></div>
      <div><button class="nome-link followup-row-name" data-perfil="${l.id}">${esc(l.nome||'—')}</button></div>
      <div class="cell-fone">${esc(l.celular||'—')}</div>
      <div>${badgeOrigem(l.origem)}</div>
      <div>${esc(abrevRenda(l.renda)||'—')}</div>
      <div>${(l.etiquetas||[]).slice(0,2).map(t=>etiquetaChip(t,true)).join('')||'—'}</div>
      <div class="cell-acoes">
        ${dropdownContato(l.id)}
        <button class="btn-ghost btn-sm btn-wa-lead" data-id="${l.id}" title="WhatsApp">${ICO_MSG_CIRCLE}</button>
        <button class="btn-ghost btn-sm btn-icon" data-perfil="${l.id}" title="Editar">${ICO_PENCIL}</button>
        <button class="btn-icon btn-destructive" data-descartar="${l.id}" title="Descartar">${ICO_TRASH}</button>
      </div>
    </div>`;
  }

  function rowEmContato(l) {
    const diasUlt   = daysSinceTs(l.ultimo_contato_em);
    const count     = l.contato_count || 1;
    const showAgen  = count >= 2;
    return `<div class="followup-row fdv-list-row" data-id="${l.id}">
      <div class="cell-chk"><input type="checkbox" class="qual-row-chk" data-id="${l.id}" ${qualSelectedIds.has(l.id)?'checked':''}></div>
      <div>${fmtDate(l.datachegada)}<br><small style="color:var(--t3)">${diasUlt}d desde ult.</small></div>
      <div><button class="nome-link followup-row-name" data-perfil="${l.id}">${esc(l.nome||'—')}</button></div>
      <div class="cell-fone">${esc(l.celular||'—')}</div>
      <div>${badgeOrigem(l.origem)}</div>
      <div>${esc(abrevRenda(l.renda)||'—')}</div>
      <div>${(l.etiquetas||[]).slice(0,2).map(t=>etiquetaChip(t,true)).join('')||'—'}</div>
      <div class="cell-acoes">
        ${dropdownContato(l.id)}
        ${showAgen?`<button class="btn-ghost btn-sm btn-icon" data-agendar="${l.id}" title="Agendar Call">${ICO_CALENDAR}</button>`:''}
        <button class="btn-ghost btn-sm btn-wa-lead" data-id="${l.id}" title="WhatsApp">${ICO_MSG_CIRCLE}</button>
        <button class="btn-ghost btn-sm btn-icon" data-perfil="${l.id}" title="Editar">${ICO_PENCIL}</button>
        <button class="btn-icon btn-destructive" data-descartar="${l.id}" title="Descartar">${ICO_TRASH}</button>
      </div>
    </div>`;
  }

  function rowSemResposta(l) {
    return `<div class="followup-row fdv-list-row" data-id="${l.id}">
      <div class="cell-chk"><input type="checkbox" class="qual-row-chk" data-id="${l.id}" ${qualSelectedIds.has(l.id)?'checked':''}></div>
      <div>${fmtDate(l.datachegada)}</div>
      <div><button class="nome-link followup-row-name" data-perfil="${l.id}">${esc(l.nome||'—')}</button></div>
      <div class="cell-fone">${esc(l.celular||'—')}</div>
      <div>${badgeOrigem(l.origem)}</div>
      <div>${esc(abrevRenda(l.renda)||'—')}</div>
      <div>${(l.etiquetas||[]).slice(0,2).map(t=>etiquetaChip(t,true)).join('')||'—'}</div>
      <div class="cell-acoes">
        <button class="btn-primary btn-sm" data-fp-resgatar="${l.id}">${ICO_UNDO} Resgatar</button>
        <button class="btn-ghost btn-sm btn-wa-lead" data-id="${l.id}" title="WhatsApp">${ICO_MSG_CIRCLE}</button>
        <button class="btn-ghost btn-sm btn-icon" data-perfil="${l.id}" title="Editar">${ICO_PENCIL}</button>
        <button class="btn-icon btn-destructive" data-descartar="${l.id}" title="Descartar">${ICO_TRASH}</button>
      </div>
    </div>`;
  }

  let allQual = [];

  function getActiveRows() {
    if (qualActiveTab === 'sc') return allQual.filter(l => !l.status_followup || l.status_followup === 'sem_contato');
    if (qualActiveTab === 'ec') {
      const ec = allQual.filter(l => l.status_followup === 'em_contato');
      if (qualActiveSubTab === 'c1')  return ec.filter(l => !l.contato_count || l.contato_count === 1);
      if (qualActiveSubTab === 'c2')  return ec.filter(l => (l.contato_count||0) === 2);
      if (qualActiveSubTab === 'c3p') return ec.filter(l => (l.contato_count||0) >= 3);
      return ec;
    }
    if (qualActiveTab === 'sr') return allQual.filter(l => l.status_followup === 'sem_resposta');
    return [];
  }

  function getRowRenderer() {
    if (qualActiveTab === 'sc') return rowSemContato;
    if (qualActiveTab === 'ec') return rowEmContato;
    return rowSemResposta;
  }

  function getEmptyMsg() {
    if (qualActiveTab === 'sc') return 'Nenhum lead aguardando contato.';
    if (qualActiveTab === 'ec') return 'Nenhum lead nesta etapa de contato.';
    return 'Nenhum lead sem resposta.';
  }

  function applyQualSort(arr) {
    const { col, dir } = TABLE_SORT['qual-' + qualActiveTab] || {};
    if (col && dir) return sortTable(arr, col, dir);
    return [...arr].sort((a,b) => (a.datachegada||'').localeCompare(b.datachegada||''));
  }

  function buildPaginationHtml(current, total, pageSize) {
    if (total === 0) return '<div id="qual-pagination"></div>';
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const from = Math.min((current - 1) * pageSize + 1, total);
    const to   = Math.min(current * pageSize, total);

    // Page number buttons with ellipsis
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push('…');
      for (let i = Math.max(2, current - 1); i <= Math.min(totalPages - 1, current + 1); i++) pages.push(i);
      if (current < totalPages - 2) pages.push('…');
      pages.push(totalPages);
    }
    const pageBtns = pages.map(p =>
      p === '…'
        ? `<span class="qual-page-ellipsis">…</span>`
        : `<button class="qual-page-btn${p === current ? ' qual-page-btn--active' : ''}" data-qual-page="${p}" ${p === current ? 'disabled' : ''}>${p}</button>`
    ).join('');

    return `<div id="qual-pagination" class="qual-pagination">
      <span class="qual-pagination-info">Mostrando ${from} a ${to} de ${total} lead${total !== 1 ? 's' : ''}</span>
      <div class="qual-pagination-controls">
        <button class="qual-page-btn" data-qual-page="first" ${current === 1 ? 'disabled' : ''}>«</button>
        <button class="qual-page-btn" data-qual-page="prev"  ${current === 1 ? 'disabled' : ''}>‹</button>
        ${pageBtns}
        <button class="qual-page-btn" data-qual-page="next"  ${current === totalPages ? 'disabled' : ''}>›</button>
        <button class="qual-page-btn" data-qual-page="last"  ${current === totalPages ? 'disabled' : ''}>»</button>
      </div>
      <select class="filter-select qual-page-size-select" id="qual-page-size">
        <option value="10"  ${qualPageSize === 10  ? 'selected' : ''}>10 por página</option>
        <option value="25"  ${qualPageSize === 25  ? 'selected' : ''}>25 por página</option>
        <option value="50"  ${qualPageSize === 50  ? 'selected' : ''}>50 por página</option>
        <option value="100" ${qualPageSize === 100 ? 'selected' : ''}>100 por página</option>
      </select>
    </div>`;
  }

  function renderQualTab() {
    const el = $('qualificados-content');
    if (!el) return;

    // Update tab active states
    el.querySelectorAll('.qual-tab-btn').forEach(b => {
      b.classList.toggle('qual-tab-btn--active', b.dataset.tab === qualActiveTab);
    });

    // Sub-tab nav visibility + active states
    const subNav = $('qual-subtab-nav');
    if (subNav) {
      subNav.style.display = qualActiveTab === 'ec' ? 'flex' : 'none';
      subNav.querySelectorAll('.qual-subtab-btn').forEach(b => {
        b.classList.toggle('qual-subtab-btn--active', b.dataset.subtab === qualActiveSubTab);
      });
    }

    // Apply filters
    const q          = ($('qual-search-top')?.value        || '').toLowerCase().trim();
    const origem     = $('qual-filter-origem')?.value      || '';
    const renda      = $('qual-filter-renda')?.value       || '';
    const mes        = $('qual-filter-mes')?.value         || '';
    const profissao  = $('qual-filter-profissao')?.value   || '';
    const etiqueta   = $('qual-filter-etiqueta')?.value    || '';
    const chegadaDe  = $('qual-filter-chegada-de')?.value  || '';
    const chegadaAte = $('qual-filter-chegada-ate')?.value || '';
    const match = l => {
      if (origem     && l.origem    !== origem)    return false;
      if (renda      && l.renda     !== renda)     return false;
      if (mes        && !(l.datachegada||'').startsWith(mes))  return false;
      if (profissao  && l.profissao !== profissao) return false;
      if (etiqueta   && l.etiqueta  !== etiqueta)  return false;
      if (chegadaDe  && (l.datachegada||'') < chegadaDe)  return false;
      if (chegadaAte && (l.datachegada||'') > chegadaAte) return false;
      if (q) { const qd = q.replace(/\D/g,''); if (!(l.nome||'').toLowerCase().includes(q) && !(qd && (l.celular||'').replace(/\D/g,'').includes(qd))) return false; }
      return true;
    };

    const allRows    = applyQualSort(getActiveRows().filter(match));
    const total      = allRows.length;
    const totalPages = Math.max(1, Math.ceil(total / qualPageSize));
    qualPage         = Math.max(1, Math.min(qualPage, totalPages));
    const pageRows   = allRows.slice((qualPage - 1) * qualPageSize, qualPage * qualPageSize);

    const renderer = getRowRenderer();
    const body     = $('qual-tab-body');
    if (body) {
      body.innerHTML = total
        ? pageRows.map(renderer).join('')
        : `<div class="followup-block-empty">${getEmptyMsg()}</div>`;
      lucide.createIcons({ nodes: [body] });
    }

    // Pagination controls
    const pag = $('qual-pagination');
    if (pag) pag.outerHTML = buildPaginationHtml(qualPage, total, qualPageSize);

    // Update sort icons and select-all
    updateSortIcons($('qual-grid-head'), 'qual-' + qualActiveTab);
    const chkAll = $('qual-chk-all');
    if (chkAll && body) {
      const cs = [...body.querySelectorAll('.qual-row-chk')];
      chkAll.checked       = cs.length > 0 && cs.every(c => qualSelectedIds.has(c.dataset.id));
      chkAll.indeterminate = !chkAll.checked && cs.some(c => qualSelectedIds.has(c.dataset.id));
    }

    updateQualBulkBar();
  }

  try {
    allQual = allLeads.filter(l => l.status === 'qualificado');
    const el = $('qualificados-content');
    if (!el) return;

    if (!allQual.length) {
      el.innerHTML = `<div class="agenda-empty">
        <i data-lucide="user-check" class="empty-lucide"></i>
        <h3>Nenhum lead qualificado</h3>
        <p>Use a aba "Novos" para qualificar leads e eles aparecerão aqui.</p>
      </div>`;
      lucide.createIcons({ nodes: [el] });
      return;
    }

    const nSemContato  = allQual.filter(l => !l.status_followup || l.status_followup === 'sem_contato').length;
    const nEmContato   = allQual.filter(l => l.status_followup === 'em_contato').length;
    const nContato1    = allQual.filter(l => l.status_followup === 'em_contato' && (!l.contato_count || l.contato_count === 1)).length;
    const nContato2    = allQual.filter(l => l.status_followup === 'em_contato' && (l.contato_count||0) === 2).length;
    const nContato3p   = allQual.filter(l => l.status_followup === 'em_contato' && (l.contato_count||0) >= 3).length;
    const nSemResposta = allQual.filter(l => l.status_followup === 'sem_resposta').length;

    const uniq = arr => [...new Set(arr.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    const origemOpts    = uniq(allQual.map(l=>l.origem));
    const rendaOpts     = uniq(allQual.map(l=>l.renda));
    const profissaoOpts = uniq(allQual.map(l=>l.profissao));
    const etiquetaOpts  = ['Super Lead','Bom','Neutro','Frio'];
    const mesOpts       = [...new Set(allQual.filter(l=>l.datachegada).map(l=>l.datachegada.slice(0,7)))].sort().reverse();

    el.innerHTML = `
    <div class="filters-bar">
      <div class="stats-grid" style="grid-template-columns:repeat(5,1fr);margin-bottom:16px">
        <div class="stat-card accent-gold">
          <div class="stat-top"><span class="stat-label">Sem contato</span></div>
          <span class="stat-num">${nSemContato}</span>
          <div class="stat-sub">aguardando 1º contato</div>
        </div>
        <div class="stat-card accent-petro">
          <div class="stat-top"><span class="stat-label">Contato 1</span></div>
          <span class="stat-num">${nContato1}</span>
          <div class="stat-sub">1ª tentativa</div>
        </div>
        <div class="stat-card accent-petro">
          <div class="stat-top"><span class="stat-label">Contato 2</span></div>
          <span class="stat-num">${nContato2}</span>
          <div class="stat-sub">2ª tentativa</div>
        </div>
        <div class="stat-card accent-green">
          <div class="stat-top"><span class="stat-label">Contato 3+</span></div>
          <span class="stat-num">${nContato3p}</span>
          <div class="stat-sub">3+ tentativas</div>
        </div>
        <div class="stat-card accent-marsala">
          <div class="stat-top"><span class="stat-label">Sem resposta</span></div>
          <span class="stat-num">${nSemResposta}</span>
          <div class="stat-sub">resgatar ou descartar</div>
        </div>
      </div>
      <div class="filters-row">
        <div class="filter-group">
          <label class="filter-label">Origem</label>
          <select class="filter-select" id="qual-filter-origem">
            <option value="">Todas</option>
            ${origemOpts.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">Mês</label>
          <select class="filter-select" id="qual-filter-mes">
            <option value="">Todos os meses</option>
            ${mesOpts.map(m=>{const[y,mo]=m.split('-');return`<option value="${m}">${MONTHS[+mo]} ${y}</option>`;}).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">Renda</label>
          <select class="filter-select" id="qual-filter-renda">
            <option value="">Todas</option>
            ${rendaOpts.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">Profissão</label>
          <select class="filter-select" id="qual-filter-profissao">
            <option value="">Todas</option>
            ${profissaoOpts.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">Etiqueta</label>
          <select class="filter-select" id="qual-filter-etiqueta">
            <option value="">Todas</option>
            ${etiquetaOpts.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">Chegada de</label>
          <input type="date" class="filter-input filter-input--date" id="qual-filter-chegada-de">
        </div>
        <div class="filter-group">
          <label class="filter-label">até</label>
          <input type="date" class="filter-input filter-input--date" id="qual-filter-chegada-ate">
        </div>
        <div class="filter-group filter-group--search">
          <label class="filter-label">Buscar</label>
          <div class="search-wrap">
            <input type="text" class="filter-input" id="qual-search-top" placeholder="Nome ou celular…" autocomplete="off">
            <span class="search-ico">⌕</span>
          </div>
        </div>
        <button class="btn-clear" id="qual-limpar">Limpar</button>
      </div>
    </div>

    <div class="qual-tab-nav">
      <button class="qual-tab-btn${qualActiveTab==='sc'?' qual-tab-btn--active':''}" data-tab="sc">
        Sem Contato <span class="qual-tab-badge">${nSemContato}</span>
      </button>
      <button class="qual-tab-btn${qualActiveTab==='ec'?' qual-tab-btn--active':''}" data-tab="ec">
        Em Contato <span class="qual-tab-badge">${nEmContato}</span>
      </button>
      <button class="qual-tab-btn${qualActiveTab==='sr'?' qual-tab-btn--active':''}" data-tab="sr">
        Sem Resposta <span class="qual-tab-badge">${nSemResposta}</span>
      </button>
    </div>

    <div class="qual-subtab-nav" id="qual-subtab-nav" style="${qualActiveTab==='ec'?'display:flex':'display:none'}">
      <button class="qual-subtab-btn${qualActiveSubTab==='c1'?' qual-subtab-btn--active':''}" data-subtab="c1">
        Contato 1 <span class="qual-tab-badge">${nContato1}</span>
      </button>
      <button class="qual-subtab-btn${qualActiveSubTab==='c2'?' qual-subtab-btn--active':''}" data-subtab="c2">
        Contato 2 <span class="qual-tab-badge">${nContato2}</span>
      </button>
      <button class="qual-subtab-btn${qualActiveSubTab==='c3p'?' qual-subtab-btn--active':''}" data-subtab="c3p">
        Contato 3+ <span class="qual-tab-badge">${nContato3p}</span>
      </button>
    </div>

    <div class="bulk-bar" id="qual-bulk-bar" style="display:none">
      <span class="bulk-count" id="qual-bulk-count">0 selecionados</span>
      <div class="bulk-actions">
        <button class="btn-acao-inline" id="btn-qual-bulk-contato">+ Contato</button>
        <button class="btn-acao-inline btn-destructive" id="btn-qual-bulk-descartar">${ICO_TRASH} Descartar</button>
      </div>
      <button class="btn-ghost btn-sm" id="btn-qual-bulk-clear">${ICO_X_SM} Limpar</button>
    </div>

    <div class="qual-grid-wrap">
      <div class="qual-grid">
        <div class="qual-grid-head" id="qual-grid-head">
          <div class="cell-chk"><input type="checkbox" id="qual-chk-all" title="Selecionar todos"></div>
          <div data-sort-col="datachegada">Chegou em</div>
          <div data-sort-col="nome">Nome</div>
          <div>Celular</div>
          <div data-sort-col="origem">Origem</div>
          <div data-sort-col="renda">Renda</div>
          <div>Etiqueta</div>
          <div>Ações</div>
        </div>
        <div id="qual-tab-body"></div>
      </div>
      <div id="qual-pagination"></div>
    </div>`;

    lucide.createIcons({ nodes: [el] });

    if (el._qualClickHandler)   el.removeEventListener('click',  el._qualClickHandler);
    if (el._qualChangeHandler)  el.removeEventListener('change', el._qualChangeHandler);
    if (el._qualInputHandler)   el.removeEventListener('input',  el._qualInputHandler);
    if (el._qualOutsideHandler) document.removeEventListener('click', el._qualOutsideHandler);

    el._qualClickHandler = e => {
      // Tab navigation
      const tabBtn = e.target.closest('.qual-tab-btn');
      if (tabBtn) { qualActiveTab = tabBtn.dataset.tab; qualPage = 1; renderQualTab(); return; }

      const subTabBtn = e.target.closest('.qual-subtab-btn');
      if (subTabBtn) { qualActiveSubTab = subTabBtn.dataset.subtab; qualPage = 1; renderQualTab(); return; }

      // Pagination
      const pageBtn = e.target.closest('[data-qual-page]');
      if (pageBtn && !pageBtn.disabled) {
        const v = pageBtn.dataset.qualPage;
        if      (v === 'first') qualPage = 1;
        else if (v === 'prev')  qualPage = Math.max(1, qualPage - 1);
        else if (v === 'next')  qualPage++;
        else if (v === 'last')  qualPage = 99999;
        else                    qualPage = parseInt(v, 10);
        renderQualTab(); return;
      }

      // Sort headers
      const sortDiv = e.target.closest('[data-sort-col]');
      if (sortDiv && sortDiv.closest('#qual-grid-head')) {
        cycleSortState('qual-' + qualActiveTab, sortDiv.dataset.sortCol);
        renderQualTab();
        return;
      }

      // Limpar filtros
      if (e.target.closest('#qual-limpar')) {
        ['qual-filter-origem','qual-filter-renda','qual-filter-mes','qual-filter-profissao',
         'qual-filter-etiqueta','qual-filter-chegada-de','qual-filter-chegada-ate','qual-search-top']
          .forEach(id => { const inp=$(id); if(inp) inp.value=''; });
        qualPage = 1; renderQualTab();
        return;
      }

      // Bulk actions
      if (e.target.closest('#btn-qual-bulk-clear')) {
        qualSelectedIds.clear(); updateQualBulkBar(); renderQualTab(); return;
      }
      if (e.target.closest('#btn-qual-bulk-contato')) {
        const ids = [...qualSelectedIds]; if (!ids.length) return;
        if (!confirm(`Registrar + Contato para ${ids.length} lead(s)? (contato_count incrementado)`)) return;
        (async () => {
          try {
            for (const id of ids) {
              const l = allLeads.find(x => x.id === id);
              if (!l) continue;
              const cc = Math.max(1, (l.contato_count||0) + 1);
              await saveLead(id, { status_followup: 'em_contato', contato_count: cc, ultimo_contato_em: new Date().toISOString() });
            }
            qualSelectedIds.clear(); renderAll();
            toast(`Contato registrado para ${ids.length} lead(s).`, 'ok');
          } catch(err) { console.error(err); toast('Erro ao registrar contato.', 'err'); }
        })();
        return;
      }
      if (e.target.closest('#btn-qual-bulk-descartar')) {
        const ids = [...qualSelectedIds]; if (!ids.length) return;
        if (!confirm(`Descartar ${ids.length} lead(s)?`)) return;
        (async () => {
          try {
            if (isLive) {
              const {error} = await supabase.from('leads').update({status:'descartado'}).in('id', ids);
              if (error) throw error;
            }
            ids.forEach(id => { const l=allLeads.find(x=>x.id===id); if(l) l.status='descartado'; });
            qualSelectedIds.clear(); renderAll();
            toast(`${ids.length} lead(s) descartado(s).`, 'ok');
          } catch(err) { console.error(err); toast('Erro ao descartar.', 'err'); }
        })();
        return;
      }

      // Contato dropdown toggle
      const toggleBtn = e.target.closest('.btn-contato-toggle');
      if (toggleBtn && toggleBtn.closest('.followup-row')) {
        e.stopPropagation();
        const id   = toggleBtn.dataset.id;
        const drop = document.getElementById('cdrop-' + id);
        if (!drop) return;
        const isOpen = drop.style.display !== 'none';
        el.querySelectorAll('.contato-dropdown').forEach(d => { d.style.display = 'none'; });
        if (!isOpen) drop.style.display = 'block';
        return;
      }

      // Contato option
      const opt = e.target.closest('.contato-opt');
      if (opt && opt.closest('.followup-row')) {
        e.stopPropagation();
        el.querySelectorAll('.contato-dropdown').forEach(d => { d.style.display = 'none'; });
        const leadId  = opt.dataset.lead;
        const cc      = opt.dataset.cc;
        const sf      = opt.dataset.sf;
        const updates = { status_followup: sf, ultimo_contato_em: new Date().toISOString() };
        if (cc) updates.contato_count = parseInt(cc, 10);
        (async () => {
          try { await saveLead(leadId, updates); renderAll(); }
          catch(err) { console.error('[FDV] contato opt:', err); toast('Erro ao registrar contato.', 'err'); }
        })();
        return;
      }

      // Row action buttons
      const t = e.target.closest('[data-fp-resgatar],[data-agendar],[data-perfil],[data-descartar],.btn-wa-lead');
      if (!t || !t.closest('.followup-row')) return;
      if (t.dataset.fpResgatar) {
        (async () => {
          try { await saveLead(t.dataset.fpResgatar, { status_followup: 'em_contato', ultimo_contato_em: new Date().toISOString() }); renderAll(); }
          catch(err) { console.error('[FDV] resgatar:', err); toast('Erro ao resgatar.', 'err'); }
        })();
        return;
      }
      if (t.dataset.agendar)   { const l=allLeads.find(x=>x.id===t.dataset.agendar); if(l) openAgendar(l); return; }
      if (t.dataset.perfil)    { const l=allLeads.find(x=>x.id===t.dataset.perfil); if(l) openPerfil(l); return; }
      if (t.dataset.descartar) { openDescarteModal(t.dataset.descartar); return; }
      if (t.classList.contains('btn-wa-lead')) { openWaChatFromLead(t.dataset.id); return; }
    };
    el.addEventListener('click', el._qualClickHandler);

    el._qualOutsideHandler = e => {
      if (!e.target.closest('.contato-dropdown-wrap')) {
        el.querySelectorAll('.contato-dropdown').forEach(d => { d.style.display = 'none'; });
      }
    };
    document.addEventListener('click', el._qualOutsideHandler);

    el._qualChangeHandler = e => {
      // Page size
      if (e.target.id === 'qual-page-size') {
        qualPageSize = parseInt(e.target.value, 10); qualPage = 1; renderQualTab(); return;
      }
      // Filter selects
      if (e.target.matches('#qual-filter-origem,#qual-filter-renda,#qual-filter-mes,#qual-filter-profissao,#qual-filter-etiqueta,#qual-filter-chegada-de,#qual-filter-chegada-ate')) {
        qualPage = 1; renderQualTab(); return;
      }
      // Select-all checkbox
      if (e.target.id === 'qual-chk-all') {
        const body = $('qual-tab-body');
        body?.querySelectorAll('.qual-row-chk').forEach(c => {
          c.checked = e.target.checked;
          if (e.target.checked) qualSelectedIds.add(c.dataset.id);
          else                  qualSelectedIds.delete(c.dataset.id);
        });
        updateQualBulkBar(); return;
      }
      // Row checkbox
      const chk = e.target.closest('.qual-row-chk');
      if (chk) {
        if (chk.checked) qualSelectedIds.add(chk.dataset.id);
        else             qualSelectedIds.delete(chk.dataset.id);
        updateQualBulkBar();
        const body   = $('qual-tab-body');
        const chkAll = $('qual-chk-all');
        if (chkAll && body) {
          const cs = [...body.querySelectorAll('.qual-row-chk')];
          chkAll.checked       = cs.length > 0 && cs.every(c => qualSelectedIds.has(c.dataset.id));
          chkAll.indeterminate = !chkAll.checked && cs.some(c => qualSelectedIds.has(c.dataset.id));
        }
      }
    };
    el.addEventListener('change', el._qualChangeHandler);

    el._qualInputHandler = e => {
      if (e.target.id === 'qual-search-top') { qualPage = 1; renderQualTab(); }
    };
    el.addEventListener('input', el._qualInputHandler);

    renderQualTab();
  } catch (err) {
    console.error('[FDV] renderQualificados ERRO:', err);
    const el2 = $('qualificados-content');
    if (el2) el2.innerHTML = `<div style="padding:24px;color:#e06450;font-family:monospace;font-size:13px;background:rgba(192,57,43,.08);border-radius:10px;border:1px solid rgba(192,57,43,.2)">
      <strong>Erro em Qualificados</strong><br><br>${err.message}<br><br>
      <small style="color:var(--t3)">${(err.stack||'').split('\n').slice(0,4).join('<br>')}</small>
    </div>`;
  }
}

// ─── AGENDADOS OVERVIEW ──────────────────────────────────────────────
function badgeAgendStatus(status, statusCloser) {
  if (statusCloser === 'venda_ganha') return `<span class="badge-agend-status badge-agend-status--venda">🏆 Venda</span>`;
  if (status === 'realizada') return `<span class="badge-agend-status badge-agend-status--realizada">Realizada</span>`;
  if (status === 'noshow')    return `<span class="badge-agend-status badge-agend-status--noshow">No Show</span>`;
  return `<span class="badge-agend-status badge-agend-status--agendado">Agendada</span>`;
}

function renderAgendadosOverview() {
  const statsEl    = $('agend-overview-stats');
  const proximasEl = $('agend-proximas-list');
  if (!statsEl) return;

  if (agendaCalYear === 0) { const n = new Date(); agendaCalYear = n.getFullYear(); agendaCalMonth = n.getMonth(); }
  const today = new Date().toISOString().slice(0, 10);
  const ym = `${agendaCalYear}-${String(agendaCalMonth + 1).padStart(2, '0')}`;

  const leadsDoMes   = allLeads.filter(l => (l.dataagendamento || '').startsWith(ym));
  const nAgendados   = leadsDoMes.length;
  const nRealizadas  = leadsDoMes.filter(l => l.status === 'realizada').length;
  const nNoShow      = leadsDoMes.filter(l => l.status === 'noshow').length;
  const nVendas      = leadsDoMes.filter(l => l.status_closer === 'venda_ganha').length;
  const nProximas    = allLeads.filter(l => l.status === 'agendado' && (l.dataagendamento || '') >= today).length;
  const mesLbl       = MCAL_MONTHS[agendaCalMonth] + ' ' + agendaCalYear;

  statsEl.innerHTML = `
    <div class="stat-card">
      <div class="stat-top"><span class="stat-label">Agendados</span><span class="stat-icon">📅</span></div>
      <strong class="stat-num">${nAgendados}</strong>
      <span class="stat-sub">${mesLbl}</span>
    </div>
    <div class="stat-card accent-green">
      <div class="stat-top"><span class="stat-label">Realizadas</span><span class="stat-icon">✓</span></div>
      <strong class="stat-num">${nRealizadas}</strong>
      <span class="stat-sub">calls concluídas</span>
    </div>
    <div class="stat-card accent-marsala">
      <div class="stat-top"><span class="stat-label">No Show</span><span class="stat-icon">✗</span></div>
      <strong class="stat-num">${nNoShow}</strong>
      <span class="stat-sub">sem comparecimento</span>
    </div>
    <div class="stat-card accent-gold">
      <div class="stat-top"><span class="stat-label">Vendas</span><span class="stat-icon">🏆</span></div>
      <strong class="stat-num">${nVendas}</strong>
      <span class="stat-sub">fechamentos</span>
    </div>
    <div class="stat-card accent-petro">
      <div class="stat-top"><span class="stat-label">Próximas</span><span class="stat-icon">→</span></div>
      <strong class="stat-num">${nProximas}</strong>
      <span class="stat-sub">calls a realizar</span>
    </div>`;

  const proximas = allLeads
    .filter(l => ['agendado','realizada'].includes(l.status) && (l.dataagendamento || '') >= today)
    .sort((a, b) => ((a.dataagendamento||'')+(a.horaagendamento||'')).localeCompare((b.dataagendamento||'')+(b.horaagendamento||'')));

  if (!proximas.length) {
    proximasEl.innerHTML = `<div class="proximas-empty">Nenhuma call próxima agendada.</div>`;
  } else {
    proximasEl.innerHTML = proximas.slice(0, 5).map(l => {
      const c = CLOSERS[l.closer];
      const closerName  = c ? c.name  : (l.closer || '—');
      const closerColor = c ? c.color : 'var(--t3)';
      return `<div class="proxima-row">
        <div class="proxima-data">${fmtDate(l.dataagendamento)}</div>
        <div class="proxima-info">
          <button class="proxima-nome" data-perfil="${l.id}">${esc(l.nome||'—')}</button>
          <span class="proxima-meta">${esc(fmtHora(l.horaagendamento))} · <span style="color:${closerColor}">${esc(closerName)}</span></span>
        </div>
        ${badgeAgendStatus(l.status, l.status_closer)}
      </div>`;
    }).join('');
    proximasEl.querySelectorAll('[data-perfil]').forEach(b =>
      b.addEventListener('click', () => { const l = allLeads.find(x => x.id === b.dataset.perfil); if (l) openPerfil(l); })
    );
  }

  const btnVerTodas = $('btn-ver-todas-proximas');
  if (btnVerTodas) btnVerTodas.onclick = () => switchAgendadosSub('todos');
}

function renderOverviewCal(year, month) {
  const cal = $('agend-overview-cal');
  if (!cal) return;

  const today        = new Date().toISOString().slice(0, 10);
  const ym           = `${year}-${String(month + 1).padStart(2, '0')}`;
  const selectedDate = $('agenda-filter-data')?.value || '';

  const dayStatus = {};
  const rank = { venda: 4, realizada: 3, agendado: 2, noshow: 1 };
  allLeads.forEach(l => {
    const d = l.dataagendamento;
    if (!d || !d.startsWith(ym)) return;
    const s = l.status_closer === 'venda_ganha' ? 'venda'
            : l.status === 'realizada'           ? 'realizada'
            : l.status === 'agendado'            ? 'agendado'
            : l.status === 'noshow'              ? 'noshow' : null;
    if (s && (!dayStatus[d] || rank[s] > rank[dayStatus[d]])) dayStatus[d] = s;
  });

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let grid = '';
  for (let i = 0; i < firstDay; i++) grid += `<div class="mcal-day mcal-day--empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${ym}-${String(d).padStart(2, '0')}`;
    const s   = dayStatus[iso];
    const cls = ['mcal-day',
      s === 'venda'     ? 'mcal-day--venda'       : '',
      s === 'realizada' ? 'mcal-day--realizada'    : '',
      s === 'agendado'  ? 'mcal-day--agendado-fut' : '',
      s === 'noshow'    ? 'mcal-day--noshow'       : '',
      selectedDate === iso                          ? 'mcal-day--sel'   : '',
      iso === today && selectedDate !== iso         ? 'mcal-day--today' : '',
    ].filter(Boolean).join(' ');
    grid += `<button class="${cls}" data-date="${iso}">${d}</button>`;
  }

  cal.innerHTML = `
    <div class="mcal-nav-row">
      <button class="mcal-arrow" id="ov-cal-prev">‹</button>
      <span class="mcal-month-lbl">${MCAL_MONTHS[month]} ${year}</span>
      <button class="mcal-arrow" id="ov-cal-next">›</button>
    </div>
    <div class="mcal-weekdays"><span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span></div>
    <div class="mcal-grid">${grid}</div>`;

  cal.querySelector('#ov-cal-prev').addEventListener('click', () => {
    agendaCalMonth--; if (agendaCalMonth < 0)  { agendaCalMonth = 11; agendaCalYear--; }
    renderAgendadosOverview();
    if (activeAgendadosSub === 'todos') renderAgendaSub();
  });
  cal.querySelector('#ov-cal-next').addEventListener('click', () => {
    agendaCalMonth++; if (agendaCalMonth > 11) { agendaCalMonth = 0;  agendaCalYear++; }
    renderAgendadosOverview();
    if (activeAgendadosSub === 'todos') renderAgendaSub();
  });
  cal.querySelectorAll('.mcal-day[data-date]').forEach(btn => {
    btn.addEventListener('click', () => {
      const date = btn.dataset.date;
      const dp = $('agenda-filter-data');
      const newDate = dp?.value === date ? '' : date;
      if (dp) dp.value = newDate;
      // limpa filtro de mês para que o dia selecionado não seja mascarado
      const mp = $('agenda-filter-mes');
      if (mp) mp.value = '';
      switchAgendadosSub('todos');
    });
  });
}

// ─── AGENDADOS SUB (wrapper nested) ──────────────────────────────────
function switchAgendadosSub(sub) {
  activeAgendadosSub = sub;
  document.querySelectorAll('#sub-agendados .sub-panel--inner').forEach(p => p.style.display = 'none');
  const panel = $('sub-agendados-' + sub);
  if (panel) panel.style.display = '';
  document.querySelectorAll('#sub-agendados [data-agendados-sub]').forEach(l =>
    l.classList.toggle('active', l.dataset.agendadosSub === sub)
  );
  // Barra de filtros compartilhada: visível em Hoje e Todos, oculta no Briefing
  const agendBar = $('agend-filters-bar');
  if (agendBar) agendBar.style.display = sub === 'briefing' ? 'none' : '';
  // Botão "Copiar para WhatsApp" só aparece na subtab Hoje
  const copiarBtn = $('btn-gerar-agenda-hoje');
  if (copiarBtn) copiarBtn.style.display = sub === 'hoje' ? '' : 'none';
  renderAgendadosSub();
}

function renderAgendadosSub() {
  renderAgendaSub();
  renderAgendadosOverview();
  if (activeAgendadosSub === 'briefing') renderBriefingSub();
}

// ─── AGENDA DE HOJE ──────────────────────────────────────────────────
function renderAgendaHoje() {
  const todayStr       = new Date().toISOString().slice(0, 10);
  const content        = $('agenda-hoje-content');
  if (!content) return;

  const closerFilt     = $('agend-filter-closer')?.value || '';
  const origemFilt     = $('agend-filter-origem')?.value || '';
  const agendadoporFilt= $('agend-filter-agendadopor')?.value || '';
  const rendaFilt      = $('agend-filter-renda')?.value || '';
  const chegadaDe      = $('agend-filter-chegada-de')?.value || '';
  const chegadaAte     = $('agend-filter-chegada-ate')?.value || '';
  const busca          = ($('agend-filter-busca')?.value || '').toLowerCase().trim();

  let leads = allLeads.filter(l => l.status === 'agendado' && l.dataagendamento === todayStr);
  if (closerFilt)      leads = leads.filter(l => (l.closer||'') === closerFilt);
  if (origemFilt)      leads = leads.filter(l => l.origem === origemFilt);
  if (agendadoporFilt) leads = leads.filter(l => l.agendadopor === agendadoporFilt);
  if (rendaFilt)       leads = leads.filter(l => l.renda === rendaFilt);
  if (chegadaDe)       leads = leads.filter(l => (l.datachegada||'') >= chegadaDe);
  if (chegadaAte)      leads = leads.filter(l => (l.datachegada||'') <= chegadaAte);
  if (busca)           leads = leads.filter(l => (l.nome||'').toLowerCase().includes(busca) || (l.celular||'').includes(busca));
  leads.sort((a,b) => (a.horaagendamento||'').localeCompare(b.horaagendamento||''));

  if (!leads.length) {
    content.innerHTML = `<div class="agenda-empty">
      <i data-lucide="calendar-check" class="empty-lucide"></i>
      <h3>Nenhuma call hoje</h3>
      <p>Sem calls agendadas para hoje (${fmtDate(todayStr)}).</p>
    </div>`;
    lucide.createIcons({ nodes: [content] });
    return;
  }

  const groups = {};
  leads.forEach(l => { const k = l.closer||'_sem'; if(!groups[k]) groups[k]=[]; groups[k].push(l); });
  const order = ['fernanda','thomaz',...Object.keys(groups).filter(k=>k!=='fernanda'&&k!=='thomaz')];

  content.innerHTML = order.filter(k => groups[k]?.length).map(key => {
    const c = CLOSERS[key];
    const name  = c ? c.name : (key==='_sem'?'Sem closer':key);
    const color = c ? c.color : 'var(--text-muted)';
    const bg    = c ? c.bg   : 'var(--bg-elevated)';
    return `<div class="agenda-group">
      <div class="agenda-group-header">
        <div class="agenda-avatar" style="color:${color};background:${bg};border:1.5px solid ${color}">${name[0].toUpperCase()}</div>
        <h3 class="agenda-group-name">${esc(name)}</h3>
        <span class="agenda-group-count">${groups[key].length} call${groups[key].length!==1?'s':''}</span>
      </div>
      <div class="agenda-cards">
        ${groups[key].map(l => `
          <div class="agenda-card">
            <div class="agenda-card-time">${esc(fmtHora(l.horaagendamento))}</div>
            <div class="agenda-card-info">
              <button class="agenda-card-nome" data-perfil="${l.id}">${esc(l.nome||'—')}</button>
              <span class="agenda-card-sub">${[l.renda, l.origem, l.celular].filter(Boolean).map(esc).join(' · ')}</span>
              ${(l.etiquetas||[]).length ? `<div class="card-etiquetas">${(l.etiquetas||[]).map(t=>etiquetaChip(t,true)).join('')}</div>` : ''}
            </div>
            <div class="agenda-card-btns">
              ${badgeAgendStatus(l.status, l.status_closer)}
              <button class="btn-ghost btn-sm btn-briefing-open${l.briefing?' has-briefing':''}" data-id="${l.id}" title="${l.briefing?'Ver/Editar Briefing':'Adicionar Briefing'}">${l.briefing?`${ICO_CLIPBOARD} Briefing`:'+ Briefing'}</button>
              <button class="btn-ghost btn-sm btn-editar-agend" data-id="${l.id}" title="Editar agendamento">${ICO_PENCIL}</button>
              <button class="btn-icon btn-excluir-agend btn-destructive" data-id="${l.id}" title="Excluir agendamento">${ICO_TRASH}</button>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
  }).join('');

  content.querySelectorAll('[data-perfil]').forEach(b =>
    b.addEventListener('click', () => { const l=allLeads.find(x=>x.id===b.dataset.perfil); if(l) openPerfil(l); })
  );
  content.querySelectorAll('.btn-briefing-open').forEach(b =>
    b.addEventListener('click', () => { const l=allLeads.find(x=>x.id===b.dataset.id); if(l) openBriefing(l); })
  );
  content.querySelectorAll('.btn-editar-agend').forEach(b =>
    b.addEventListener('click', () => { const l=allLeads.find(x=>x.id===b.dataset.id); if(l) openEditarAgendamento(l); })
  );
  content.querySelectorAll('.btn-excluir-agend').forEach(b =>
    b.addEventListener('click', () => excluirAgendamento(b.dataset.id))
  );
}

function gerarAgendaHoje() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const proximas = allLeads
    .filter(l => ['agendado','realizada'].includes(l.status) && (l.dataagendamento || '') >= todayStr)
    .sort((a, b) => ((a.dataagendamento||'')+(a.horaagendamento||'')).localeCompare((b.dataagendamento||'')+(b.horaagendamento||'')))
    .slice(0, 5);
  if (!proximas.length) { toast('Nenhuma call próxima para copiar.', 'err'); return; }

  const groups = {};
  proximas.forEach(l => { const k = l.closer||'_sem'; if (!groups[k]) groups[k]=[]; groups[k].push(l); });

  let text = `📅 Próximas calls\n`;
  ['fernanda','thomaz',...Object.keys(groups).filter(k=>k!=='fernanda'&&k!=='thomaz')].filter(k=>groups[k]).forEach(key => {
    const c = CLOSERS[key];
    text += `\n${c?.icon||'👤'} @${c?.waName||c?.name||(key==='_sem'?'Sem closer':key)}\n`;
    groups[key].forEach(l => {
      text += `📅 ${fmtDate(l.dataagendamento)} ${l.horaagendamento||'--:--'} – ${l.nome||'—'}\n`;
    });
  });

  navigator.clipboard.writeText(text.trimEnd())
    .then(() => toast('Próximas calls copiadas!', 'ok'))
    .catch(() => toast('Não foi possível copiar.', 'err'));
}

// ─── NO SHOW SUB ─────────────────────────────────────────────────────
function renderNoShow() {
  const el = $('noshow-content');
  if (!el) return;
  nsSelectedIds.clear();

  const nsAll    = allLeads.filter(l => l.status === 'noshow');
  const mesAtual = new Date().toISOString().slice(0, 7);
  const semanaMs = 7 * 24 * 60 * 60 * 1000;
  const semanaAgo = new Date(Date.now() - semanaMs).toISOString().slice(0, 10);

  const nTotal   = nsAll.length;
  const nMes     = nsAll.filter(l => (l.dataagendamento||'').startsWith(mesAtual)).length;
  const nSemana  = nsAll.filter(l => (l.dataagendamento||'') >= semanaAgo).length;
  const nSemData = nsAll.filter(l => !l.dataagendamento).length;
  const mesPt    = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const uniq = arr => [...new Set(arr.filter(Boolean))].sort((a,b) => a.localeCompare(b,'pt-BR'));
  const origemOpts    = uniq(nsAll.map(l => l.origem));
  const closerOpts    = uniq(nsAll.map(l => l.closer));
  const agendPorOpts  = uniq(nsAll.map(l => l.agendadopor));
  const rendaOpts     = uniq(nsAll.map(l => l.renda));

  el.innerHTML = `
  <div class="filters-bar">
    <div class="stats-grid" style="margin-bottom:16px">
      <div class="stat-card accent-marsala">
        <div class="stat-top"><span class="stat-label">Total no-shows</span></div>
        <strong class="stat-num">${nTotal}</strong>
        <span class="stat-sub">todos os períodos</span>
      </div>
      <div class="stat-card">
        <div class="stat-top"><span class="stat-label">Este mês</span></div>
        <strong class="stat-num">${nMes}</strong>
        <span class="stat-sub">${mesPt}</span>
      </div>
      <div class="stat-card accent-gold">
        <div class="stat-top"><span class="stat-label">Esta semana</span></div>
        <strong class="stat-num">${nSemana}</strong>
        <span class="stat-sub">últimos 7 dias</span>
      </div>
      <div class="stat-card">
        <div class="stat-top"><span class="stat-label">Sem data</span></div>
        <strong class="stat-num">${nSemData}</strong>
        <span class="stat-sub">sem data de call</span>
      </div>
    </div>
    <div class="filters-row">
      <div class="filter-group">
        <label class="filter-label">Origem</label>
        <select class="filter-select" id="ns-filter-origem">
          <option value="">Todas</option>
          ${origemOpts.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label">Closer</label>
        <select class="filter-select" id="ns-filter-closer">
          <option value="">Todos</option>
          ${closerOpts.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label">Agendado por</label>
        <select class="filter-select" id="ns-filter-agendadopor">
          <option value="">Todos</option>
          ${agendPorOpts.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label">Renda</label>
        <select class="filter-select" id="ns-filter-renda">
          <option value="">Todas</option>
          ${rendaOpts.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label">Chegada de</label>
        <input type="date" class="filter-input filter-input--date" id="ns-filter-chegada-de">
      </div>
      <div class="filter-group">
        <label class="filter-label">até</label>
        <input type="date" class="filter-input filter-input--date" id="ns-filter-chegada-ate">
      </div>
      <div class="filter-group filter-group--search">
        <label class="filter-label">Buscar</label>
        <div class="search-wrap">
          <input type="text" class="filter-input" id="ns-filter-busca" placeholder="Nome ou celular…" autocomplete="off">
          <span class="search-ico">⌕</span>
        </div>
      </div>
      <button class="btn-clear" id="ns-btn-limpar">Limpar</button>
    </div>
  </div>

  <div class="bulk-bar" id="ns-bulk-bar" style="display:none">
    <span class="bulk-count" id="ns-bulk-count">0 selecionados</span>
    <div class="bulk-actions">
      <button class="btn-acao-inline" id="btn-ns-bulk-reagendar">${ICO_REFRESH} Reagendar</button>
      <button class="btn-acao-inline btn-destructive" id="btn-ns-bulk-descartar">${ICO_DISCARD} Descartar</button>
    </div>
    <button class="btn-ghost btn-sm" id="btn-ns-bulk-clear">${ICO_X_SM} Limpar</button>
  </div>
  <div class="table-wrap fdv-list-container">
    <table class="leads-table">
      <thead><tr>
        <th class="cell-chk"><input type="checkbox" id="chk-all-ns" title="Selecionar todos"></th>
        <th data-sort-col="datachegada">Chegou em</th><th data-sort-col="nome">Nome</th><th>Celular</th><th>Origem</th><th>Renda</th><th>Etiqueta</th><th>Ações</th>
      </tr></thead>
      <tbody id="ns-list"></tbody>
    </table>
  </div>`;

  if (el._nsClickHandler)   el.removeEventListener('click',  el._nsClickHandler);
  if (el._nsChangeHandler)  el.removeEventListener('change', el._nsChangeHandler);

  el._nsClickHandler = e => {
    const b = e.target.closest('[data-perfil],[data-descartar],.btn-wa-lead,.btn-reagendar-ns');
    if (!b) return;
    if (b.dataset.perfil)    { const l=allLeads.find(x=>x.id===b.dataset.perfil); if(l) openPerfil(l); return; }
    if (b.dataset.descartar) { openDescarteModal(b.dataset.descartar); return; }
    if (b.classList.contains('btn-wa-lead'))      { openWaChatFromLead(b.dataset.id); return; }
    if (b.classList.contains('btn-reagendar-ns')) { const l=allLeads.find(x=>x.id===b.dataset.id); if(l) openAgendar(l); return; }
  };
  el.addEventListener('click', el._nsClickHandler);

  el._nsChangeHandler = e => {
    const chk = e.target.closest('.ns-row-chk');
    if (chk) {
      if (chk.checked) nsSelectedIds.add(chk.dataset.id);
      else             nsSelectedIds.delete(chk.dataset.id);
      const allChks = [...el.querySelectorAll('#ns-list .ns-row-chk')];
      const d = $('chk-all-ns');
      if (d) { d.checked = allChks.length > 0 && allChks.every(c => c.checked); d.indeterminate = !d.checked && allChks.some(c => c.checked); }
      updateNsBulkBar();
      return;
    }
    if (e.target.id === 'chk-all-ns') {
      const checked = e.target.checked;
      el.querySelectorAll('#ns-list .ns-row-chk').forEach(c => {
        c.checked = checked;
        if (checked) nsSelectedIds.add(c.dataset.id);
        else         nsSelectedIds.delete(c.dataset.id);
      });
      updateNsBulkBar();
      applyNsFilters();
    }
  };
  el.addEventListener('change', el._nsChangeHandler);

  function applyNsFilters() {
    const origem     = $('ns-filter-origem')?.value     || '';
    const closer     = $('ns-filter-closer')?.value     || '';
    const agendPor   = $('ns-filter-agendadopor')?.value || '';
    const renda      = $('ns-filter-renda')?.value      || '';
    const chegadaDe  = $('ns-filter-chegada-de')?.value  || '';
    const chegadaAte = $('ns-filter-chegada-ate')?.value || '';
    const busca      = ($('ns-filter-busca')?.value     || '').toLowerCase().trim();

    let leads = nsAll;
    if (origem)     leads = leads.filter(l => l.origem === origem);
    if (closer)     leads = leads.filter(l => l.closer === closer);
    if (agendPor)   leads = leads.filter(l => l.agendadopor === agendPor);
    if (renda)      leads = leads.filter(l => l.renda === renda);
    if (chegadaDe)  leads = leads.filter(l => (l.datachegada||'') >= chegadaDe);
    if (chegadaAte) leads = leads.filter(l => (l.datachegada||'') <= chegadaAte);
    if (busca)      leads = leads.filter(l =>
      (l.nome||'').toLowerCase().includes(busca) ||
      (l.celular||'').replace(/\D/g,'').includes(busca.replace(/\D/g,''))
    );
    const { col: _nsc, dir: _nsd } = TABLE_SORT['noshow'] || {};
    leads = _nsc && _nsd
      ? sortTable(leads, _nsc, _nsd)
      : leads.sort((a,b) => (b.dataagendamento||'').localeCompare(a.dataagendamento||''));

    const listEl = $('ns-list');
    if (!listEl) return;
    if (!leads.length) {
      listEl.innerHTML = `<tr><td colspan="8" class="noshow-empty">Nenhum lead encontrado com os filtros aplicados.</td></tr>`;
      const allChkNs = $('chk-all-ns'); if (allChkNs) { allChkNs.checked = false; allChkNs.indeterminate = false; }
      updateNsBulkBar(); return;
    }
    listEl.innerHTML = leads.map(l => `
      <tr class="fdv-list-row" data-id="${l.id}">
        <td class="cell-chk"><input type="checkbox" class="ns-row-chk" data-id="${l.id}" ${nsSelectedIds.has(l.id)?'checked':''}></td>
        <td class="cell-data-chegou">${fmtDate(l.datachegada)}</td>
        <td class="cell-nome"><button class="nome-link noshow-row-name" data-perfil="${l.id}">${esc(l.nome||'—')}</button></td>
        <td class="cell-fone">${esc(l.celular||'—')}</td>
        <td>${badgeOrigem(l.origem)}</td>
        <td>${esc(abrevRenda(l.renda)||'—')}</td>
        <td>${(l.etiquetas||[]).slice(0,2).map(t=>etiquetaChip(t,true)).join('')||'—'}</td>
        <td class="cell-acoes">
          <button class="btn-ghost btn-sm btn-wa-lead" data-id="${l.id}" title="WhatsApp">${ICO_MSG_CIRCLE}</button>
          <button class="btn-ghost btn-sm btn-reagendar-ns" data-id="${l.id}">${ICO_REFRESH} Reagendar</button>
          <button class="btn-ghost btn-sm btn-destructive" data-descartar="${l.id}">${ICO_DISCARD} Descartar</button>
        </td>
      </tr>`).join('');

    const allChkNs = $('chk-all-ns');
    if (allChkNs) {
      allChkNs.checked = leads.length > 0 && leads.every(l => nsSelectedIds.has(l.id));
      allChkNs.indeterminate = !allChkNs.checked && leads.some(l => nsSelectedIds.has(l.id));
    }
    updateNsBulkBar();
    updateSortIcons(el.querySelector('.leads-table thead tr'), 'noshow');
  }

  bindSortHeaders(el.querySelector('.leads-table thead tr'), 'noshow', applyNsFilters);

  $('btn-ns-bulk-reagendar')?.addEventListener('click', () => {
    const ids = [...nsSelectedIds];
    if (!ids.length) return;
    if (ids.length > 1) { toast(`Selecione um lead por vez para reagendar.`, 'info'); return; }
    const l = allLeads.find(x => x.id === ids[0]); if (l) openAgendar(l);
  });
  $('btn-ns-bulk-descartar')?.addEventListener('click', () => {
    if (!nsSelectedIds.size) return;
    selectedIds.clear(); nsSelectedIds.forEach(id => selectedIds.add(id));
    openBulkDescarteModal();
  });
  $('btn-ns-bulk-clear')?.addEventListener('click', () => { nsSelectedIds.clear(); updateNsBulkBar(); applyNsFilters(); });

  ['ns-filter-origem','ns-filter-closer','ns-filter-agendadopor','ns-filter-renda',
   'ns-filter-chegada-de','ns-filter-chegada-ate'].forEach(id =>
    $(id)?.addEventListener('change', applyNsFilters)
  );
  $('ns-filter-busca')?.addEventListener('input', applyNsFilters);
  $('ns-btn-limpar')?.addEventListener('click', () => {
    ['ns-filter-origem','ns-filter-closer','ns-filter-agendadopor','ns-filter-renda',
     'ns-filter-chegada-de','ns-filter-chegada-ate','ns-filter-busca'].forEach(id => {
      const inp = $(id); if (inp) inp.value = '';
    });
    applyNsFilters();
  });

  applyNsFilters();
}

// ─── DESCARTADOS SUB ─────────────────────────────────────────────────
function renderDescartados() {
  const allDesc = allLeads.filter(l => l.status === 'descartado');
  const el      = $('descartados-content');
  if (!el) return;
  if (!allDesc.length) {
    el.innerHTML = `<div class="agenda-empty">
      <i data-lucide="user-x" class="empty-lucide"></i>
      <h3>Nenhum lead descartado</h3>
      <p>Leads descartados aparecem aqui. Você pode reativá-los a qualquer momento.</p>
    </div>`;
    lucide.createIcons({ nodes: [el] });
    return;
  }
  const uniq2 = arr => [...new Set(arr.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const origemOptsD = ['Instagram','Facebook','Indicação','Google','WhatsApp','Outros',...uniq2(allDesc.map(l=>l.origem))];
  const rendaOptsD  = uniq2(allDesc.map(l=>l.renda));

  const descMesAtual = new Date().toISOString().slice(0, 7);
  const nDescTotal   = allDesc.length;
  const nDescMes     = allDesc.filter(l => (l.datachegada||'').startsWith(descMesAtual)).length;
  const motivoFreq   = allDesc.reduce((acc, l) => {
    const k = l.motivo_descarte_label || l.motivo_descarte || '—';
    acc[k] = (acc[k] || 0) + 1; return acc;
  }, {});
  const motivoTop    = Object.entries(motivoFreq).sort((a,b) => b[1] - a[1])[0];
  const motivoLabel  = motivoTop ? motivoTop[0] : '—';
  const motivoCount  = motivoTop ? motivoTop[1] : 0;

  el.innerHTML = `
    <div class="filters-bar">
      <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
        <div class="stat-card accent-marsala">
          <div class="stat-top"><span class="stat-label">Total descartados</span></div>
          <strong class="stat-num">${nDescTotal}</strong>
          <span class="stat-sub">todos os períodos</span>
        </div>
        <div class="stat-card">
          <div class="stat-top"><span class="stat-label">Este mês</span></div>
          <strong class="stat-num">${nDescMes}</strong>
          <span class="stat-sub">${new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</span>
        </div>
        <div class="stat-card accent-gold">
          <div class="stat-top"><span class="stat-label">Motivo principal</span></div>
          <strong class="stat-num">${motivoCount}</strong>
          <span class="stat-sub" title="${esc(motivoLabel)}">${esc(motivoLabel)}</span>
        </div>
      </div>
      <div class="filters-row">
        <div class="filter-group">
          <label class="filter-label">Origem</label>
          <select class="filter-select" id="desc-filter-origem">
            <option value="">Todas</option>
            ${[...new Set(origemOptsD)].map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">Renda</label>
          <select class="filter-select" id="desc-filter-renda">
            <option value="">Todas</option>
            ${rendaOptsD.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">Motivo</label>
          <select class="filter-select" id="desc-filter-motivo">
            <option value="">Todos</option>
            ${MOTIVOS_DESCARTE.map(m=>`<option value="${esc(m.id)}">${esc(m.label)}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">Chegada de</label>
          <input type="date" class="filter-input filter-input--date" id="desc-filter-chegada-de">
        </div>
        <div class="filter-group">
          <label class="filter-label">até</label>
          <input type="date" class="filter-input filter-input--date" id="desc-filter-chegada-ate">
        </div>
        <div class="filter-group filter-group--search">
          <label class="filter-label">Buscar</label>
          <div class="search-wrap">
            <input type="text" class="filter-input" id="desc-busca" placeholder="Nome ou celular…" autocomplete="off">
            <span class="search-ico">⌕</span>
          </div>
        </div>
        <button class="btn-clear" id="desc-limpar">Limpar</button>
      </div>
    </div>
    <div class="bulk-bar" id="desc-bulk-bar" style="display:none">
      <span class="bulk-count" id="desc-bulk-count">0 selecionados</span>
      <div class="bulk-actions">
        <button class="btn-acao-inline btn-qualificar" id="btn-desc-bulk-reativar">${ICO_UNDO} Reativar para Novos</button>
        <button class="btn-acao-inline" id="btn-desc-bulk-tag">${ICO_TAG} Adicionar etiqueta</button>
        <button class="btn-acao-inline btn-destructive" id="btn-desc-bulk-delete">${ICO_TRASH} Excluir</button>
      </div>
      <button class="btn-ghost btn-sm" id="btn-desc-bulk-clear">${ICO_X_SM} Limpar</button>
    </div>
    <div class="table-wrap fdv-list-container"><table class="leads-table">
      <thead><tr>
        <th class="cell-chk"><input type="checkbox" id="chk-all-desc" title="Selecionar todos"></th>
        <th data-sort-col="datachegada">Chegou em</th><th data-sort-col="nome">Nome</th><th>Celular</th><th data-sort-col="origem">Origem</th><th>Etapa</th><th>Motivo</th><th>Ações</th>
      </tr></thead>
      <tbody id="desc-tbody"></tbody>
    </table></div>`;

  if (el._descClickHandler)  el.removeEventListener('click',  el._descClickHandler);
  if (el._descChangeHandler) el.removeEventListener('change', el._descChangeHandler);

  el._descClickHandler = e => {
    const b = e.target.closest('[data-perfil],[data-reativar],[data-excluir],.btn-wa-lead');
    if (!b || !b.closest('#desc-tbody')) return;
    if (b.dataset.perfil)   { const l=allLeads.find(x=>x.id===b.dataset.perfil); if(l) openPerfil(l); return; }
    if (b.dataset.reativar) { reativarLead(b.dataset.reativar); return; }
    if (b.dataset.excluir)  { deleteLead(b.dataset.excluir); return; }
    if (b.classList.contains('btn-wa-lead')) { openWaChatFromLead(b.dataset.id); return; }
  };
  el.addEventListener('click', el._descClickHandler);

  el._descChangeHandler = e => {
    const chk = e.target.closest('.row-chk');
    if (chk && chk.closest('#desc-tbody')) {
      if (chk.checked) selectedIds.add(chk.dataset.id);
      else             selectedIds.delete(chk.dataset.id);
      const allChks = [...el.querySelectorAll('#desc-tbody .row-chk')];
      const d = $('chk-all-desc');
      if (d) { d.checked = allChks.length > 0 && allChks.every(c => c.checked); d.indeterminate = !d.checked && allChks.some(c => c.checked); }
      updateDescBulkBar();
      return;
    }
    if (e.target.id === 'chk-all-desc') {
      const checked = e.target.checked;
      el.querySelectorAll('#desc-tbody .row-chk').forEach(c => {
        c.checked = checked;
        if (checked) selectedIds.add(c.dataset.id);
        else         selectedIds.delete(c.dataset.id);
      });
      updateDescBulkBar();
      renderDescTbody();
    }
  };
  el.addEventListener('change', el._descChangeHandler);

  function renderDescTbody() {
    const origem = $('desc-filter-origem')?.value || '';
    const renda  = $('desc-filter-renda')?.value  || '';
    const motivo = $('desc-filter-motivo')?.value  || '';
    const de     = $('desc-filter-chegada-de')?.value || '';
    const ate    = $('desc-filter-chegada-ate')?.value || '';
    const q      = ($('desc-busca').value || '').toLowerCase().trim();
    let leads = allDesc.filter(l => {
      if (origem && l.origem !== origem) return false;
      if (renda  && l.renda  !== renda)  return false;
      if (motivo && l.motivo_descarte !== motivo) return false;
      if (de     && (l.datachegada||'') < de)  return false;
      if (ate    && (l.datachegada||'') > ate) return false;
      if (q && !(l.nome||'').toLowerCase().includes(q) && !(l.celular||'').includes(q)) return false;
      return true;
    });
    const { col: _dc, dir: _dd } = TABLE_SORT['descartados'] || {};
    leads = _dc && _dd ? sortTable(leads, _dc, _dd) : [...leads].sort((a,b) => (b.datachegada||'').localeCompare(a.datachegada||''));
    const tbody = $('desc-tbody');
    if (!leads.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="padding:32px;text-align:center;color:var(--t3)">Nenhum resultado.</td></tr>`;
      const allChkD = $('chk-all-desc'); if (allChkD) { allChkD.checked = false; allChkD.indeterminate = false; }
      updateDescBulkBar(); return;
    }
    tbody.innerHTML = leads.map(l => {
      const etapa = l.kanban_column === 'descartado' ? 'Venda Perdida'
        : l.dataagendamento ? 'Agendamentos'
        : (l.status_followup || Number(l.contato_count) > 0) ? 'Qualificados'
        : 'Novos';
      const etapaCls = { 'Venda Perdida':'venda-perdida', Agendamentos:'agend', Qualificados:'qual', Novos:'novos' }[etapa];
      return `<tr class="${['fdv-list-row',isDup(l.id)?'dup-row':''].filter(Boolean).join(' ')}" data-id="${l.id}">
        <td class="cell-chk"><input type="checkbox" class="row-chk" data-id="${l.id}" ${selectedIds.has(l.id)?'checked':''}></td>
        <td>${fmtDate(l.datachegada)}</td>
        <td style="display:flex;align-items:center;gap:5px;padding-top:10px;padding-bottom:10px">${isDup(l.id)?`<button class="btn-dup-ico" data-dup-id="${l.id}" title="Possível duplicata — clique para comparar">${ICO_COPY}</button>`:''}<button class="nome-link" data-perfil="${l.id}">${esc(l.nome||'—')}</button></td>
        <td>${esc(l.celular||'—')}</td>
        <td>${badgeOrigem(l.origem)}</td>
        <td><span class="badge-etapa badge-etapa--${etapaCls}">${etapa}</span></td>
        <td><span class="badge-status descartado" title="${esc(l.motivo_descarte_label||l.motivo_descarte||'—')}">${esc(l.motivo_descarte_label||l.motivo_descarte||'—')}</span></td>
        <td class="cell-acoes">
          <button class="btn-ghost btn-sm" data-reativar="${l.id}">${ICO_UNDO} Reativar</button>
          <button class="btn-ghost btn-sm btn-wa-lead" data-id="${l.id}" title="WhatsApp">${ICO_MSG_CIRCLE}</button>
          <button class="btn-icon btn-destructive" data-excluir="${l.id}" title="Excluir lead">${ICO_TRASH}</button>
        </td>
      </tr>`;
    }).join('');
    // Selecionar todos
    const allChkD = $('chk-all-desc');
    if (allChkD) {
      allChkD.checked = leads.length > 0 && leads.every(l => selectedIds.has(l.id));
      allChkD.indeterminate = !allChkD.checked && leads.some(l => selectedIds.has(l.id));
    }
    updateDescBulkBar();
    updateSortIcons(el.querySelector('.leads-table thead tr'), 'descartados');
  }

  bindSortHeaders(el.querySelector('.leads-table thead tr'), 'descartados', renderDescTbody);

  $('btn-desc-bulk-reativar')?.addEventListener('click', bulkReativar);
  $('btn-desc-bulk-tag')?.addEventListener('click', openBulkTagModal);
  $('btn-desc-bulk-delete')?.addEventListener('click', bulkDelete);
  $('btn-desc-bulk-clear')?.addEventListener('click', () => { selectedIds.clear(); updateDescBulkBar(); renderDescTbody(); });

  ['desc-filter-origem','desc-filter-renda','desc-filter-motivo','desc-filter-chegada-de','desc-filter-chegada-ate'].forEach(id => { const el=$(id); if(el) el.addEventListener('change', renderDescTbody); });
  $('desc-busca')?.addEventListener('input', renderDescTbody);
  $('desc-limpar')?.addEventListener('click', () => {
    ['desc-filter-origem','desc-filter-renda','desc-filter-motivo','desc-filter-chegada-de','desc-filter-chegada-ate','desc-busca'].forEach(id=>{const el=$(id);if(el)el.value='';});
    renderDescTbody();
  });
  renderDescTbody();
}

// ─── DESCARTE MODAL ──────────────────────────────────────────────────
function openDescarteModal(leadId, ctx = 'agendamentos') {
  descarteLeadId   = leadId;
  descarteSelected = null;
  descarteContext  = ctx;
  const lead = allLeads.find(l => l.id === leadId);
  $('descarte-lead-nome').textContent = lead?.nome || '—';
  $('descarte-confirmar').disabled = true;

  const body = $('descarte-body');
  body.innerHTML = `
    <p class="mp-instr">Selecione o motivo do descarte:</p>
    <div class="mp-grid">
      ${MOTIVOS_DESCARTE.map(m => `
        <button class="mp-item" data-id="${m.id}">
          <span>${esc(m.label)}</span>
        </button>`).join('')}
    </div>
    <div id="descarte-outro-wrap" style="display:none;margin-top:14px">
      <textarea id="descarte-outro-text" class="form-ctrl" placeholder="Descreva o motivo…" rows="3" style="width:100%;resize:vertical"></textarea>
    </div>`;

  body.querySelectorAll('.mp-item').forEach(btn => {
    btn.addEventListener('click', () => {
      body.querySelectorAll('.mp-item').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      descarteSelected = btn.dataset.id;
      $('descarte-outro-wrap').style.display = descarteSelected === 'outro' ? 'block' : 'none';
      $('descarte-confirmar').disabled = false;
    });
  });

  $('descarte-backdrop').style.display = 'flex';
}

function closeDescarteModal() {
  $('descarte-backdrop').style.display = 'none';
  descarteLeadId   = null;
  descarteSelected = null;
  bulkDescarteIds  = null;
}

async function confirmarDescarte() {
  if (!descarteSelected) return;
  if (!bulkDescarteIds && !descarteLeadId) return;
  if (descarteSelected === 'outro') {
    const text = ($('descarte-outro-text')?.value || '').trim();
    if (!text) { toast('Descreva o motivo do descarte.', 'err'); return; }
  }
  const btn = $('descarte-confirmar');
  btn.disabled = true;

  const motivo    = MOTIVOS_DESCARTE.find(m => m.id === descarteSelected);
  const outroText = descarteSelected === 'outro' ? ($('descarte-outro-text')?.value || '').trim() : '';
  const payload   = {
    status:                'descartado',
    motivo_descarte:       descarteSelected,
    motivo_descarte_label: motivo?.label || descarteSelected,
    ...(outroText && { motivo_descarte_obs: outroText }),
    atualizadoem:          new Date().toISOString(),
  };

  try {
    if (bulkDescarteIds) {
      // Descarte em massa
      const ids = bulkDescarteIds;
      if (isLive) {
        const { error } = await supabase.from('leads').update(payload).in('id', ids);
        if (error) throw error;
      } else {
        ids.forEach(id => { const i = allLeads.findIndex(l=>l.id===id); if(i!==-1) allLeads[i]={...allLeads[i],...payload}; });
      }
      toast(`${ids.length} lead(s) descartado(s).`, 'ok');
      selectedIds.clear();
      closeDescarteModal();
      updateBulkBar();
      renderAll();
    } else if (descarteContext === 'kanban') {
      await ensureObsSaved(descarteLeadId);
      const hist = buildHistoryEntry(descarteLeadId, 'descartado', 'Descartado');
      await saveLead(descarteLeadId, {
        kanban_column:         'descartado',
        kanban_column_since:   new Date().toISOString(),
        ...payload,
        status:                'descartado',
        ...(hist && { historico_kanban: hist }),
      });
      toast('Lead descartado.', 'ok');
      closeDescarteModal();
      if (!isLive) renderKanban();
    } else {
      await saveLead(descarteLeadId, payload);
      toast('Lead descartado.', 'ok');
      closeDescarteModal();
    }
  } catch(e) {
    console.error(e);
    toast(e.message || 'Erro ao descartar.', 'err');
    btn.disabled = false;
  }
}

function openKanbanDescarte(leadId) {
  openDescarteModal(leadId, 'kanban');
}

// ─── PIPELINE ACTIONS ────────────────────────────────────────────────
async function qualificarLead(id) {
  try {
    await saveLead(id, { status: 'qualificado', atualizadoem: new Date().toISOString() });
    toast('Lead qualificado.', 'ok');
  } catch(e) { toast('Erro: ' + e.message, 'err'); }
}

async function reativarLead(id) {
  try {
    await saveLead(id, { status: 'aguardando', atualizadoem: new Date().toISOString() });
    toast('Lead reativado na aba Novos.', 'ok');
  } catch(e) { toast('Erro: ' + e.message, 'err'); }
}

// ─── ABRIR WHATSAPP PELO LEAD ─────────────────────────────────────────
function openWaChatFromLead(leadId) {
  const lead = allLeads.find(l => l.id === leadId);
  if (!lead) { toast('Lead não encontrado.', 'err'); return; }
  switchTab('whatsapp');
  openCentralChat(leadId);
}

function gerarAgendaDoDia() {
  const dataFilt   = $('agenda-filter-data')?.value;
  const mesFilt    = $('agenda-filter-mes').value;
  const closerFilt = $('agenda-filter-closer').value;

  let leads = allLeads.filter(l => l.status === 'agendado');
  if (dataFilt)          leads = leads.filter(l => l.dataagendamento === dataFilt);
  else if (mesFilt)      leads = leads.filter(l => (l.dataagendamento||'').startsWith(mesFilt));
  if (closerFilt) leads = leads.filter(l => (l.closer||'') === closerFilt);
  if (!leads.length) { toast('Nenhuma call para copiar.', 'err'); return; }

  leads.sort((a,b) => ((a.dataagendamento||'')+(a.horaagendamento||'')).localeCompare((b.dataagendamento||'')+(b.horaagendamento||'')));

  const refDate = dataFilt || leads[0]?.dataagendamento;
  const dateStr = refDate ? fmtDate(refDate) : '—';
  const dayName = refDate ? getDayOfWeek(refDate) : '';

  const groups = {};
  leads.forEach(l => { const k = l.closer||'_sem'; if(!groups[k]) groups[k]=[]; groups[k].push(l); });

  let text = `Bom dia! ☀️\n📅 Agenda – ${dateStr} (${dayName})\n`;

  ['fernanda','thomaz',...Object.keys(groups).filter(k=>k!=='fernanda'&&k!=='thomaz')].filter(k=>groups[k]).forEach(key => {
    const c      = CLOSERS[key];
    const waName = c?.waName || c?.name || (key==='_sem'?'Sem closer':key);
    const icon   = c?.icon || '👤';
    text += `\n${icon} @${waName}\n`;
    groups[key].forEach(l => {
      text += `🕐 ${l.horaagendamento||'--:--'} – ${l.nome||'—'}\n`;
      text += `⏳ Status: Aguardando confirmação\n`;
    });
  });

  navigator.clipboard.writeText(text.trimEnd())
    .then(() => toast('Agenda copiada para WhatsApp!', 'ok'))
    .catch(() => toast('Não foi possível copiar.', 'err'));
}

function gerarBriefingLead(lead) {
  // ── Closer: apenas nome, nunca telefone
  const closerKey  = lead.closer || '';
  const closerName = CLOSERS[closerKey]?.name || null;

  // ── Instagram sem duplicar @
  const instaRaw  = lead.instagram ? String(lead.instagram).trim() : '';
  const instagram = instaRaw ? (instaRaw.startsWith('@') ? instaRaw : '@' + instaRaw) : null;

  // ── Data/hora do agendamento
  const refDate = lead.dataagendamento;
  const dateStr = refDate ? fmtDate(refDate) : null;
  const dayName = refDate ? getDayOfWeek(refDate) : null;
  const hora    = lead.horaagendamento || null;

  // ── Bloco 1: cabeçalho (sem linha em branco interna)
  const header = [];
  header.push(`*${(lead.nome || '—').trim()}*`);
  if (dateStr && dayName && hora) header.push(`${dayName}, ${dateStr} · ${hora}`);
  else if (dateStr && dayName)    header.push(`${dayName}, ${dateStr}`);
  else if (dateStr)               header.push(dateStr);
  if (closerName) header.push(`Closer: ${closerName}`);

  // ── Bloco 2: contatos (apenas campos presentes, 3 emojis max)
  const contatos = [
    lead.celular ? `📞 ${lead.celular}` : null,
    lead.email   ? `✉️ ${lead.email}`   : null,
    instagram    ? `📸 ${instagram}`    : null,
  ].filter(Boolean);

  // ── Bloco 3: perfil (texto corrido, sem emojis)
  const perfil = [];
  if (lead.profissao && lead.renda) perfil.push(`${lead.profissao} · ${lead.renda}`);
  else if (lead.profissao)          perfil.push(lead.profissao);
  else if (lead.renda)              perfil.push(lead.renda);
  if (lead.desafio) perfil.push(lead.desafio.trim());

  // ── Monta texto: blocos separados por 1 linha em branco
  const blocks = [header.join('\n')];
  if (contatos.length) blocks.push(contatos.join('\n'));
  if (perfil.length)   blocks.push(perfil.join('\n'));

  const text = blocks.join('\n\n');

  navigator.clipboard.writeText(text)
    .then(() => toast(`Briefing de ${lead.nome} copiado!`, 'ok'))
    .catch(() => toast('Não foi possível copiar.', 'err'));
}

// ─── MINI CALENDÁRIO ─────────────────────────────────────────────────
const MCAL_MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                     'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function renderMiniCal(year, month) {
  const cal = $('agenda-mini-cal');
  if (!cal) return;

  const selectedDate = $('agenda-filter-data')?.value || '';
  const today = new Date().toISOString().slice(0,10);
  const ym = `${year}-${String(month+1).padStart(2,'0')}`;

  const dayStatusMini = {};
  const _rank = { venda: 4, realizada: 3, agendado: 2, noshow: 1 };
  allLeads.forEach(l => {
    const d = l.dataagendamento;
    if (!d || !d.startsWith(ym)) return;
    const s = l.status_closer === 'venda_ganha' ? 'venda'
            : l.status === 'realizada'           ? 'realizada'
            : l.status === 'agendado'            ? 'agendado'
            : l.status === 'noshow'              ? 'noshow' : null;
    if (s && (!dayStatusMini[d] || _rank[s] > _rank[dayStatusMini[d]])) dayStatusMini[d] = s;
  });

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let grid = '';
  for (let i = 0; i < firstDay; i++) grid += `<div class="mcal-day mcal-day--empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const iso  = `${ym}-${String(d).padStart(2,'0')}`;
    const _ds = dayStatusMini[iso];
    const cls  = ['mcal-day',
      _ds === 'venda'     ? 'mcal-day--venda'       : '',
      _ds === 'realizada' ? 'mcal-day--realizada'    : '',
      _ds === 'agendado'  ? 'mcal-day--agendado-fut' : '',
      _ds === 'noshow'    ? 'mcal-day--noshow'       : '',
      selectedDate === iso                           ? 'mcal-day--sel'   : '',
      iso === today && selectedDate !== iso          ? 'mcal-day--today' : '',
    ].filter(Boolean).join(' ');
    grid += `<button class="${cls}" data-date="${iso}">${d}</button>`;
  }

  cal.innerHTML = `
    <div class="mcal-nav-row">
      <button class="mcal-arrow" id="mcal-prev">‹</button>
      <span class="mcal-month-lbl">${MCAL_MONTHS[month]} ${year}</span>
      <button class="mcal-arrow" id="mcal-next">›</button>
    </div>
    <div class="mcal-weekdays"><span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span></div>
    <div class="mcal-grid">${grid}</div>
    <div class="cal-legend">
      <span class="cal-leg-item"><span class="cal-leg-dot cal-leg--venda"></span>Venda</span>
      <span class="cal-leg-item"><span class="cal-leg-dot cal-leg--realizada"></span>Realizada</span>
      <span class="cal-leg-item"><span class="cal-leg-dot cal-leg--agendada"></span>Agendada</span>
      <span class="cal-leg-item"><span class="cal-leg-dot cal-leg--noshow"></span>No Show</span>
    </div>`;

  cal.querySelector('#mcal-prev').addEventListener('click', () => {
    agendaCalMonth--; if (agendaCalMonth < 0)  { agendaCalMonth = 11; agendaCalYear--; }
    renderMiniCal(agendaCalYear, agendaCalMonth);
  });
  cal.querySelector('#mcal-next').addEventListener('click', () => {
    agendaCalMonth++; if (agendaCalMonth > 11) { agendaCalMonth = 0;  agendaCalYear++; }
    renderMiniCal(agendaCalYear, agendaCalMonth);
  });
  cal.querySelectorAll('.mcal-day[data-date]').forEach(btn => {
    btn.addEventListener('click', () => {
      const datePicker = $('agenda-filter-data');
      if (datePicker) datePicker.value = datePicker.value === btn.dataset.date ? '' : btn.dataset.date;
      renderMiniCal(agendaCalYear, agendaCalMonth);
      renderAgendaSub();
    });
  });
}

// ─── KANBAN ──────────────────────────────────────────────────────────
function getLeadKanbanCol(lead) {
  const col = lead.kanban_column;
  if (col === 'fechamento')    return 'negociacao';
  if (col === 'followup')      return 'decisao';
  if (col === 'venda_perdida') return 'descartado';
  if (col) return col;
  if (lead.status === 'agendado') return 'agendado';
  if (lead.status === 'noshow' || lead.status === 'cancelado') return 'descartado';
  if (lead.status === 'realizada') {
    const sc = lead.status_closer;
    if (sc === 'followup')      return 'decisao';
    if (sc === 'fechamento')    return 'negociacao';
    if (sc === 'venda_ganha')   return 'venda_ganha';
    if (sc === 'venda_perdida') return 'descartado';
    return 'call_realizada';
  }
  return 'agendado';
}

function renderKanban() {
  const board      = $('kanban-board');
  const mesFilt    = $('kanban-filter-mes')?.value    || '';
  const closerFilt = $('kanban-filter-closer')?.value || '';
  const etapaFilt  = $('kf-etapa')?.value             || '';
  const origemFilt = $('kf-origem')?.value             || '';
  const cols       = getKanbanCols();

  populateKanbanFilters();

  let leads = allLeads.filter(l =>
    l.kanban_column || ['agendado','cancelado','realizada'].includes(l.status)
  );
  if (mesFilt)    leads = leads.filter(l => (l.dataagendamento||l.datachegada||'').startsWith(mesFilt));
  if (closerFilt) leads = leads.filter(l => (l.closer||'') === closerFilt);
  if (etapaFilt)  leads = leads.filter(l => getLeadKanbanCol(l) === etapaFilt);
  if (origemFilt) leads = leads.filter(l => (l.origem||'') === origemFilt);

  // All leads that belong to the kanban (unfiltered) — used for delete safety check
  const allKanbanLeads = allLeads.filter(l =>
    l.kanban_column || ['agendado','cancelado','realizada'].includes(l.status)
  );

  board.innerHTML = cols.map(col => {
    const colLeads = leads.filter(l => getLeadKanbanCol(l) === col.id);
    // canDelete must check ALL leads (not filtered), so a column with leads hidden by filters can't be deleted
    const canDelete = allKanbanLeads.filter(l => getLeadKanbanCol(l) === col.id).length === 0;
    return `<div class="kanban-col" data-col="${col.id}">
      <div class="kanban-col-header">
        <span class="kc-drag-handle" draggable="true" data-drag-col="${col.id}" title="Arrastar coluna">⠿</span>
        <span class="kanban-col-title" contenteditable="true" data-col="${col.id}">${esc(col.label)}</span>
        <div style="display:flex;align-items:center;gap:4px;flex-shrink:0">
          <span class="kanban-col-count">${colLeads.length}</span>
          ${canDelete ? `<button class="kc-del-col" data-del-col="${col.id}" title="Remover coluna">×</button>` : ''}
        </div>
      </div>
      <div class="kanban-col-body" data-col="${col.id}">
        ${colLeads.length ? colLeads.map(l => kanbanCard(l, cols)).join('') : '<div class="kanban-empty"><i data-lucide="inbox" class="empty-lucide-sm"></i><span>Sem leads</span></div>'}
      </div>
    </div>`;
  }).join('') + `<button class="kc-add-col-trigger" id="btn-add-column" title="Adicionar coluna">+</button>`;
  lucide.createIcons();

  // Re-apply active search dimming after re-render
  if (kanbanSearchText) {
    board.querySelectorAll('.kanban-card').forEach(card => {
      card.classList.toggle('kc-dimmed', !card.dataset.nome.includes(kanbanSearchText));
    });
  }

  // Editable column titles
  board.querySelectorAll('.kanban-col-title[contenteditable]').forEach(el => {
    el.addEventListener('blur', () => {
      const cols  = getKanbanCols();
      const col   = cols.find(c => c.id === el.dataset.col);
      const label = el.textContent.trim();
      if (col && label && label !== col.label) {
        col.label = label;
        _kanbanCols = cols;
        if (isLive) {
          supabase.from('kanban_columns').update({ nome: label }).eq('slug', col.id)
            .then(({ error }) => { if (error) console.error('[FDV] renameCol:', error); });
        } else {
          localStorage.setItem(KANBAN_LS_KEY, JSON.stringify(cols));
        }
      }
    });
    el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } });
  });

  // Card click handlers
  board.querySelectorAll('[data-perfil]').forEach(b =>
    b.addEventListener('click', () => { const l=allLeads.find(x=>x.id===b.dataset.perfil); if(l) openPerfil(l); })
  );

  // Comentário no card — insert em lead_comentarios
  board.querySelectorAll('.kc-obs-input').forEach(ta => {
    ta.addEventListener('mousedown', e => e.stopPropagation()); // impede drag
  });
  board.querySelectorAll('.kc-obs-save').forEach(btn => {
    btn.addEventListener('mousedown', e => e.stopPropagation());
    btn.addEventListener('click', async () => {
      const id    = btn.dataset.id;
      const ta    = board.querySelector(`.kc-obs-input[data-id="${id}"]`);
      const texto = ta?.value.trim();
      if (!texto) return;
      btn.disabled = true;
      try {
        const autor = currentUser?.displayName || currentUser?.email || 'Desconhecido';
        if (isLive) {
          const { error } = await supabase.from('lead_comentarios').insert({ lead_id: id, autor_nome: autor, texto });
          if (error) throw error;
        }
        ta.value = '';
        toast('Comentário adicionado.', 'ok');
      } catch(e) { toast('Erro ao comentar.', 'err'); }
      finally { btn.disabled = false; }
    });
  });
  // Clicar em área em branco do card abre modal de detalhes
  board.querySelectorAll('.kanban-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('button, input, select, textarea, a')) return;
      const id = card.dataset.id;
      const lead = allLeads.find(l => l.id === id);
      if (lead) openPerfil(lead);
    });
  });

  // Mover para: dropdown
  board.querySelectorAll('.kc-move-select').forEach(sel => {
    sel.addEventListener('mousedown', e => e.stopPropagation());
    sel.addEventListener('change', async e => {
      const colId = e.target.value;
      if (!colId) return;
      e.target.value = '';
      await moveLeadToCol(e.target.dataset.id, colId);
    });
  });

  // Histórico toggle
  board.querySelectorAll('.kc-hist-toggle').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const hist = btn.closest('.kanban-card').querySelector('.kc-historico');
      if (hist) hist.style.display = hist.style.display === 'none' ? '' : 'none';
    });
  });

  // Venda Ganha + Descartar action buttons
  board.querySelectorAll('.btn-kc-venda').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); openVendaGanha(btn.dataset.id); });
  });
  board.querySelectorAll('.btn-kc-descartar').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); openKanbanDescarte(btn.dataset.id); });
  });

  // Delete column (only shown when empty)
  board.querySelectorAll('.kc-del-col').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const colId   = btn.dataset.delCol;
      const updated = getKanbanCols().filter(c => c.id !== colId);
      _kanbanCols   = updated;
      if (isLive) {
        supabase.from('kanban_columns').delete().eq('slug', colId)
          .then(({ error }) => { if (error) console.error('[FDV] deleteCol:', error); });
      } else {
        localStorage.setItem(KANBAN_LS_KEY, JSON.stringify(updated));
      }
      renderKanban();
    });
  });

  $('btn-add-column')?.addEventListener('click', addKanbanColumn);
  renderKanbanMetrics();
}

function renderKanbanMetrics() {
  const el = $('kanban-metrics');
  if (!el) return;

  const mesFilt    = $('kanban-filter-mes')?.value    || '';
  const closerFilt = $('kanban-filter-closer')?.value || '';
  const etapaFilt  = $('kf-etapa')?.value             || '';
  const origemFilt = $('kf-origem')?.value             || '';

  const currentMonth = new Date().toISOString().slice(0, 7);
  const [ano, mes]   = currentMonth.split('-');
  const mesLabel     = new Date(Number(ano), Number(mes) - 1, 2)
    .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

  const kanbanBase = allLeads.filter(l =>
    l.kanban_column || ['agendado','cancelado','realizada'].includes(l.status)
  );

  let filtered = kanbanBase;
  if (mesFilt)    filtered = filtered.filter(l => (l.dataagendamento||l.datachegada||'').startsWith(mesFilt));
  if (closerFilt) filtered = filtered.filter(l => (l.closer||'') === closerFilt);
  if (etapaFilt)  filtered = filtered.filter(l => getLeadKanbanCol(l) === etapaFilt);
  if (origemFilt) filtered = filtered.filter(l => (l.origem||'') === origemFilt);

  const pipeline       = filtered.filter(l => !['venda_ganha','venda_perdida','descartado'].includes(getLeadKanbanCol(l))).length;
  const nCallRealizada = filtered.filter(l => getLeadKanbanCol(l) === 'call_realizada').length;
  const nNegociacao    = filtered.filter(l => getLeadKanbanCol(l) === 'negociacao').length;
  const nDecisao       = filtered.filter(l => getLeadKanbanCol(l) === 'decisao').length;

  // Always current month — independent of mesFilt
  const vendasMes   = kanbanBase.filter(l => l.kanban_column === 'venda_ganha' && (l.kanban_column_since||'').startsWith(currentMonth)).length;
  const perdidosMes = kanbanBase.filter(l => l.kanban_column === 'descartado'  && (l.kanban_column_since||'').startsWith(currentMonth)).length;
  const totalMes    = kanbanBase.filter(l => (l.kanban_column_since||'').startsWith(currentMonth)).length;
  const taxa        = totalMes > 0 ? Math.round(vendasMes / totalMes * 100) : 0;

  el.innerHTML = `
    <div class="stat-card">
      <div class="stat-top"><span class="stat-label">Pipeline</span></div>
      <span class="stat-num">${pipeline}</span>
      <div class="stat-sub">leads ativos</div>
    </div>
    <div class="stat-card accent-gold">
      <div class="stat-top"><span class="stat-label">Call Realizada</span></div>
      <span class="stat-num">${nCallRealizada}</span>
      <div class="stat-sub">na coluna</div>
    </div>
    <div class="stat-card accent-blue">
      <div class="stat-top"><span class="stat-label">Negociação</span></div>
      <span class="stat-num">${nNegociacao}</span>
      <div class="stat-sub">na coluna</div>
    </div>
    <div class="stat-card accent-purple">
      <div class="stat-top"><span class="stat-label">Decisão</span></div>
      <span class="stat-num">${nDecisao}</span>
      <div class="stat-sub">na coluna</div>
    </div>
    <div class="stat-card accent-green">
      <div class="stat-top"><span class="stat-label">Vendas no mês</span></div>
      <span class="stat-num">${vendasMes}</span>
      <div class="stat-sub">${mesLabel}</div>
    </div>
    <div class="stat-card accent-green">
      <div class="stat-top"><span class="stat-label">Conversão</span></div>
      <span class="stat-num">${taxa}%</span>
      <div class="stat-sub">ganhos ÷ entradas</div>
    </div>
    <div class="stat-card accent-red">
      <div class="stat-top"><span class="stat-label">Perdidos no mês</span></div>
      <span class="stat-num">${perdidosMes}</span>
      <div class="stat-sub">${mesLabel}</div>
    </div>`;
}

function populateKanbanFilters() {
  const mesSel  = $('kanban-filter-mes');
  const origSel = $('kf-origem');
  if (!mesSel || !origSel) return;

  const kanbanLeads = allLeads.filter(l =>
    l.kanban_column || ['agendado','cancelado','realizada'].includes(l.status)
  );

  if (mesSel.options.length <= 1) {
    const months = [...new Set(
      kanbanLeads.map(l => (l.dataagendamento||l.datachegada||'').slice(0,7)).filter(Boolean)
    )].sort().reverse();
    months.forEach(m => {
      const [y, mo] = m.split('-');
      const label = new Date(Number(y), Number(mo) - 1, 2)
        .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const opt = document.createElement('option');
      opt.value = m; opt.textContent = label;
      mesSel.appendChild(opt);
    });
  }

  if (origSel.options.length <= 1) {
    const origins = [...new Set(kanbanLeads.map(l => l.origem).filter(Boolean))].sort();
    origins.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o; opt.textContent = o;
      origSel.appendChild(opt);
    });
  }
}

function kanbanCard(l, cols) {
  const closerName  = l.closer ? (CLOSERS[l.closer]?.name||l.closer) : null;
  const etiquetas   = (l.etiquetas||[]).slice(0,2);
  const isAgendado  = l.status === 'agendado';
  const unreadCount = l.unreadCount || 0;
  const currentCol  = getLeadKanbanCol(l);

  // Days in current column
  const days = l.kanban_column_since
    ? Math.floor((Date.now() - new Date(l.kanban_column_since).getTime()) / 86400000)
    : null;
  const daysClass = days === null ? '' : days >= 7 ? 'kc-days-danger' : days >= 3 ? 'kc-days-warn' : '';

  // WhatsApp
  const waPhone = normalizePhoneForEvolution(l.celular || l.telefone);
  const waHref  = waPhone ? `https://wa.me/${waPhone}` : null;

  // Move options (exclude current column)
  const allCols   = cols || getKanbanCols();
  const moveOpts  = allCols.filter(c => c.id !== currentCol)
    .map(c => `<option value="${c.id}">${esc(c.label)}</option>`).join('');

  // History (last 3, newest first)
  const hist = (l.historico_kanban || []).slice(-3).reverse();
  const histHtml = hist.length ? `
    <div class="kc-historico" style="display:none">
      ${hist.map(h => `<div class="kc-hist-item">
        <span class="kc-hist-col">${esc(h.colLabel||h.col)}</span>
        <span class="kc-hist-meta">${esc(h.movidoPor||'—')} · ${fmtNotifTime(h.movidoEm)}</span>
      </div>`).join('')}
    </div>` : '';

  return `<div class="kanban-card ${daysClass}" draggable="true" data-id="${l.id}" data-nome="${esc((l.nome||'').toLowerCase())}">

    <div class="kc-head">
      <button class="kc-nome" data-perfil="${l.id}">${esc(l.nome||'—')}</button>
      <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
        ${days !== null ? `<span class="kc-days-badge ${daysClass}">${days}d</span>` : ''}
        ${badgeKanbanCol(currentCol)}
      </div>
    </div>
    ${l.dataagendamento ? `<div class="kc-datetime"><i data-lucide="calendar" class="kc-cal-icon"></i>${fmtDateHora(l.dataagendamento,l.horaagendamento)}</div>` : ''}
    <div class="kc-meta">
      ${closerName ? `<span class="kc-closer">${esc(closerName)}</span>` : ''}
      ${l.agendadopor ? `<span class="kc-resp">via ${esc(l.agendadopor)}</span>` : ''}
      ${badgeOrigem(l.origem)}
    </div>
    ${etiquetas.length ? `<div class="kc-etiquetas">${etiquetas.map(t=>etiquetaChip(t,true)).join('')}</div>` : ''}
    ${waHref || hist.length ? `<div class="kc-foot">
      ${waHref ? `<a class="kc-wa-btn" href="${waHref}" target="_blank" rel="noopener" title="WhatsApp"><i data-lucide="message-circle" class="kc-wa-icon"></i></a>` : ''}
      ${hist.length ? `<button class="kc-hist-toggle" title="Histórico"><i data-lucide="history"></i></button>` : ''}
    </div>` : ''}
    ${histHtml}
    <div class="kc-actions">
      <select class="kc-move-select" data-id="${l.id}">
        <option value="">Mover</option>
        ${moveOpts}
      </select>
      <button class="btn-kc-venda" data-id="${l.id}" title="Registrar venda ganha"><i data-lucide="trophy"></i> Venda Ganha</button>
      <button class="btn-kc-descartar" data-id="${l.id}" title="Descartar lead"><i data-lucide="archive-x"></i> Descartar</button>
    </div>
    <div class="kc-obs-wrap">
      <textarea class="kc-obs-input" data-id="${l.id}" placeholder="Comentário…"></textarea>
      <button class="kc-obs-save" data-id="${l.id}" title="Comentar"><i class="ti ti-send"></i></button>
    </div>

  </div>`;
}

async function ensureObsSaved(leadId) {
  const ta = document.querySelector(`.kc-obs-input[data-id="${leadId}"]`);
  if (!ta || !ta.value.trim()) return;
  const texto = ta.value.trim();
  const autor = currentUser?.displayName || currentUser?.email || 'Desconhecido';
  try {
    if (isLive) await supabase.from('lead_comentarios').insert({ lead_id: leadId, autor_nome: autor, texto });
    ta.value = '';
  } catch(_) {}
}

function buildHistoryEntry(leadId, colId, colLabel) {
  const lead = allLeads.find(l => l.id === leadId);
  if (!lead) return null;
  const hist = [...(lead.historico_kanban || [])];
  hist.push({
    col: colId,
    colLabel,
    movidoPor: currentUser?.displayName || currentUser?.email || 'Desconhecido',
    movidoEm:  new Date().toISOString(),
  });
  if (hist.length > 20) hist.splice(0, hist.length - 20);
  return hist;
}

async function moveLeadToCol(leadId, colId) {
  if (colId === 'venda_perdida') { openMotivosPerda(leadId); return; }
  if (colId === 'venda_ganha')   { openVendaGanha(leadId);   return; }
  await ensureObsSaved(leadId);
  // Update otimista: reflete a mudança de coluna imediatamente na UI
  const lIdx = allLeads.findIndex(l => l.id === leadId);
  const prevCol = lIdx >= 0 ? allLeads[lIdx].kanban_column : null;
  if (lIdx >= 0) allLeads[lIdx] = { ...allLeads[lIdx], kanban_column: colId };
  renderKanban();
  try {
    const allCols   = getKanbanCols();
    const colLabel  = allCols.find(c => c.id === colId)?.label || colId;
    const hist      = buildHistoryEntry(leadId, colId, colLabel);
    await saveLead(leadId, {
      kanban_column:       colId,
      kanban_column_since: new Date().toISOString(),
      ...(hist && { historico_kanban: hist }),
      atualizadoem:        new Date().toISOString(),
    });
    toast('Card movido.', 'ok');
  } catch(e) {
    console.error(e);
    // Reverte o update otimista em caso de erro
    if (lIdx >= 0) allLeads[lIdx] = { ...allLeads[lIdx], kanban_column: prevCol };
    renderKanban();
    toast('Erro ao mover card.', 'err');
  }
}

function addKanbanColumn() {
  $('add-col-name').value = '';
  $('add-col-error').style.display = 'none';
  $('add-col-backdrop').classList.add('open');
  setTimeout(() => $('add-col-name')?.focus(), 60);
}
function closeAddColModal() { $('add-col-backdrop').classList.remove('open'); }
async function confirmAddCol() {
  const nameEl = $('add-col-name');
  const errEl  = $('add-col-error');
  const label  = (nameEl.value || '').trim();
  if (!label) { errEl.textContent = 'Nome obrigatório.'; errEl.style.display = ''; nameEl.focus(); return; }
  const cols = getKanbanCols();
  if (cols.some(c => c.label.toLowerCase() === label.toLowerCase())) {
    errEl.textContent = 'Já existe uma coluna com esse nome.'; errEl.style.display = ''; nameEl.focus(); return;
  }
  const slug    = 'col_' + Date.now();
  const newCols = [...cols, { id: slug, label }];
  if (isLive) {
    const { error } = await supabase.from('kanban_columns')
      .insert({ slug, nome: label, ordem: cols.length });
    if (error) { errEl.textContent = 'Erro ao salvar: ' + error.message; errEl.style.display = ''; return; }
  } else {
    localStorage.setItem(KANBAN_LS_KEY, JSON.stringify(newCols));
  }
  _kanbanCols = newCols;
  closeAddColModal();
  renderKanban();
}

// ─── CLOSER SUB-VIEWS ────────────────────────────────────────────────
function switchCloserView(view) {
  closerView = view;
  const board   = $('kanban-board');
  const subview = $('closer-subview');

  document.querySelectorAll('.cvt-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));

  const isKanban = view === 'kanban';
  board.style.display   = isKanban ? '' : 'none';
  subview.style.display = isKanban ? 'none' : '';

  const kf = $('kanban-filters');
  if (kf) kf.style.display = isKanban ? '' : 'none';

  if (isKanban)                    renderKanban();
  else if (view === 'vendas')      renderVendasView();
  else if (view === 'descartados') renderDescartadosView();
  updateBreadcrumb();
}

async function _backfillVendas(leads) {
  for (const l of leads) {
    const d = l.venda_ganha_dados || {};
    const { error } = await supabase.from('vendas').insert({
      lead_id:        l.id,
      closer:         l.closer         || null,
      programa:       d.programa       || null,
      valor:          d.valor          || null,
      valor_entrada:  d.entrada        || null,
      forma_pagamento:d.forma          || null,
      observacoes:    d.obs            || null,
      criadoem:       new Date().toISOString(),
    });
    if (error) console.warn('[FDV] backfill vendas:', l.id, error.message);
  }
}

async function renderVendasView() {
  const el = $('closer-subview');
  el.innerHTML = '<div class="table-wrap"><p style="color:var(--t2);padding:24px">Carregando vendas…</p></div>';

  // Filtros persistentes
  if (!renderVendasView._f) renderVendasView._f = {};
  const flt = renderVendasView._f;
  flt.mes      = flt.mes      ?? '';
  flt.closer   = flt.closer   ?? '';
  flt.programa = flt.programa ?? '';
  flt.forma    = flt.forma    ?? '';
  flt.search   = flt.search   ?? '';

  let allRows = [];
  if (isLive) {
    try {
      const { data, error } = await supabase.from('vendas').select('*, leads(nome, celular, realizadaem, kanban_column_since, datachegada)').order('criadoem', { ascending: false });
      if (!error) allRows = data || [];
    } catch(_) {}
  }

  // Fallback: leads com kanban_column='venda_ganha' sem linha na tabela vendas
  const vendaLeadIds = new Set(allRows.map(r => r.lead_id).filter(Boolean));
  const missing = allLeads.filter(l =>
    l.kanban_column === 'venda_ganha' && !vendaLeadIds.has(l.id)
  );
  for (const l of missing) {
    const d = l.venda_ganha_dados || {};
    allRows.push({
      lead_id:         l.id,
      leads:           { nome: l.nome, celular: l.celular, realizadaem: l.realizadaem, kanban_column_since: l.kanban_column_since, datachegada: l.datachegada },
      closer:          l.closer,
      programa:        d.programa       || null,
      valor:           d.valor          || null,
      valor_entrada:   d.entrada        || null,
      forma_pagamento: d.forma          || null,
      observacoes:     d.obs            || null,
      criadoem:        l.atualizadoem   || l.datachegada || null,
      status:          'ativa',
    });
  }
  allRows.sort((a, b) => (b.criadoem || '').localeCompare(a.criadoem || ''));

  // Backfill assíncrono
  if (isLive && missing.length > 0) {
    _backfillVendas(missing).then(() =>
      console.info(`[FDV] Backfill vendas: ${missing.length} linha(s) inserida(s).`)
    );
  }

  // Meses disponíveis para filtro
  const meses = [...new Set(
    allRows.map(r => {
      const ld = r.leads;
      return (ld?.realizadaem||ld?.kanban_column_since||ld?.datachegada||r.criadoem||'').slice(0,7);
    }).filter(m => /^\d{4}-\d{2}$/.test(m))
  )].sort().reverse();

  // Programas disponíveis
  const programas = [...new Set(allRows.filter(r => r.status !== 'cancelada').map(r => r.programa).filter(Boolean))].sort();

  const FORMA_LABELS = {
    avista:           'À vista',
    parcelado_cartao: 'Parcelado — Cartão',
    parcelado_boleto: 'Parcelado — Boleto',
    pix:              'PIX',
  };
  const fmtForma    = v => FORMA_LABELS[v] || esc(v||'—');
  const fmtCurrency = n => n ? n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : '—';
  const fmtBRL      = v => fmtCurrency(parseValor(v));

  // Aplicar filtros (search tratado via DOM após render)
  let rows = allRows.filter(r => r.status !== 'cancelada');
  if (flt.mes) {
    rows = rows.filter(r => {
      const ld = r.leads;
      const dateRef = ld?.realizadaem || ld?.kanban_column_since || ld?.datachegada || r.criadoem || '';
      return dateRef.startsWith(flt.mes);
    });
  }
  if (flt.closer)   rows = rows.filter(r => (r.closer||'') === flt.closer);
  if (flt.programa) rows = rows.filter(r => (r.programa||'') === flt.programa);
  if (flt.forma)    rows = rows.filter(r => (r.forma_pagamento||'') === flt.forma);

  const faturamento = rows.reduce((s, r) => s + parseValor(r.valor), 0);
  const ticketMedio = rows.length ? faturamento / rows.length : 0;

  const ICO_EDIT2 = _S('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',13);

  const mesOpts      = meses.map(m => `<option value="${m}"${flt.mes===m?' selected':''}>${fmtMes(m)}</option>`).join('');
  const closerOpts   = Object.entries(CLOSERS).map(([k,c]) => `<option value="${k}"${flt.closer===k?' selected':''}>${esc(c.name)}</option>`).join('');
  const programaOpts = programas.map(p => `<option value="${esc(p)}"${flt.programa===p?' selected':''}>${esc(p)}</option>`).join('');
  const formaKeys    = ['avista','parcelado_cartao','parcelado_boleto','pix'];
  const formaOpts    = formaKeys.map(k => `<option value="${k}"${flt.forma===k?' selected':''}>${FORMA_LABELS[k]}</option>`).join('');

  rows.forEach(r => { r._nome = r.leads?.nome || ''; });
  const { col: _vc, dir: _vd } = TABLE_SORT['vendas'] || {};
  if (_vc && _vd) rows = sortTable(rows, _vc, _vd);

  const rowsHtml = rows.map(r => {
    const hasId      = !!r.id;
    const idAttr     = r.id      || '';
    const leadAttr   = r.lead_id || '';
    const nome       = r.leads?.nome || r.lead_id || '—';
    const celular    = r.leads?.celular || '';
    const searchAttr = ((nome + '|' + celular).toLowerCase()).replace(/"/g,'');
    const closerName = r.closer ? (CLOSERS[r.closer]?.name || r.closer) : '—';
    return '<tr data-id="' + idAttr + '" data-lead="' + leadAttr + '" data-search="' + searchAttr + '">'
      + '<td class="cell-chk"><input type="checkbox" class="vv-chk-row row-chk" data-id="' + idAttr + '" data-lead="' + leadAttr + '"></td>'
      + '<td><button class="link-btn" data-perfil-venda="' + leadAttr + '">' + esc(nome) + '</button></td>'
      + '<td>' + esc(r.programa || '—') + '</td>'
      + '<td class="vendas-valor">' + fmtBRL(r.valor) + '</td>'
      + '<td>' + fmtBRL(r.valor_entrada) + '</td>'
      + '<td>' + fmtForma(r.forma_pagamento) + '</td>'
      + '<td>' + esc(closerName) + '</td>'
      + '<td class="cell-acoes">'
        + '<button class="btn-ghost btn-sm btn-edit-venda" data-id="' + idAttr + '" data-lead="' + leadAttr + '" title="Editar"' + (!hasId ? ' disabled' : '') + '>' + ICO_EDIT2 + '</button>'
        + '<button class="btn-ghost btn-sm btn-del-venda btn-destructive" data-id="' + idAttr + '" data-lead="' + leadAttr + '" title="Excluir">' + ICO_TRASH + '</button>'
      + '</td>'
      + '</tr>';
  }).join('');

  const tableHtml = rows.length === 0
    ? '<p class="hist-empty" style="margin-top:32px">Nenhuma venda encontrada.</p>'
    : `<div class="rel-table-wrap">
        <table class="rel-table vv-table">
          <thead><tr>
            <th class="cell-chk"><input type="checkbox" id="vv-chk-all" class="row-chk" title="Selecionar todos"></th>
            <th data-sort-col="_nome">Lead</th><th data-sort-col="programa">Programa</th><th data-sort-col="valor">Valor</th><th>Entrada</th><th>Forma Pgto</th><th data-sort-col="closer">Closer</th><th>Ações</th>
          </tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>`;

  el.innerHTML = `
    <div class="filters-bar">
      <div class="stats-grid stats-grid--3" style="margin-bottom:16px">
        <div class="stat-card accent-gold">
          <div class="stat-top"><span class="stat-label">Total de Vendas</span></div>
          <strong class="stat-num">${rows.length}</strong>
          <span class="stat-sub">contratos fechados</span>
        </div>
        <div class="stat-card accent-green">
          <div class="stat-top"><span class="stat-label">Faturamento</span></div>
          <strong class="stat-num" style="font-size:22px">${fmtCurrency(faturamento)}</strong>
          <span class="stat-sub">em vendas ativas</span>
        </div>
        <div class="stat-card accent-green">
          <div class="stat-top"><span class="stat-label">Ticket Médio</span></div>
          <strong class="stat-num" style="font-size:22px">${fmtCurrency(ticketMedio)}</strong>
          <span class="stat-sub">por venda ativa</span>
        </div>
      </div>
      <div class="filters-row">
        <div class="filter-group">
          <label class="filter-label">Mês</label>
          <select class="filter-select" id="vv-mes">
            <option value="">Todos os meses</option>${mesOpts}
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">Closer</label>
          <select class="filter-select" id="vv-closer">
            <option value="">Todos</option>${closerOpts}
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">Programa</label>
          <select class="filter-select" id="vv-programa">
            <option value="">Todos</option>${programaOpts}
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">Forma Pgto</label>
          <select class="filter-select" id="vv-forma">
            <option value="">Todas</option>${formaOpts}
          </select>
        </div>
        <div class="filter-group filter-group--search">
          <label class="filter-label">Buscar</label>
          <div class="search-wrap">
            <input type="text" class="filter-input" id="vv-search" placeholder="Nome ou celular…" autocomplete="off" value="${esc(flt.search)}">
            <span class="search-ico">⌕</span>
          </div>
        </div>
        <button class="btn-clear" id="vv-limpar">Limpar</button>
      </div>
    </div>
    <div class="bulk-bar" id="vv-bulk-bar" style="display:none">
      <span class="bulk-count" id="vv-bulk-count">0 selecionados</span>
      <div class="bulk-actions">
        <button class="btn-acao-inline btn-qualificar" id="btn-vv-bulk-negociacao">Voltar Negociação</button>
        <button class="btn-acao-inline btn-agendar" id="btn-vv-bulk-agendamento">Voltar Agendamento</button>
        <button class="btn-acao-inline btn-destructive" id="btn-vv-bulk-excluir">${ICO_TRASH} Excluir</button>
      </div>
      <button class="btn-ghost btn-sm" id="btn-vv-bulk-clear">${ICO_X_SM} Limpar</button>
    </div>
    ${tableHtml}`;

  lucide.createIcons({ nodes: [el] });

  bindSortHeaders(el.querySelector('.rel-table thead tr'), 'vendas', renderVendasView);
  updateSortIcons(el.querySelector('.rel-table thead tr'), 'vendas');

  // ── Search: DOM-only filter, sem re-render ───────────────────────
  function applySearch() {
    const q = flt.search;
    el.querySelectorAll('.vv-table tbody tr').forEach(tr => {
      tr.style.display = (!q || (tr.dataset.search || '').includes(q)) ? '' : 'none';
    });
  }
  applySearch();

  // ── Bulk helpers ─────────────────────────────────────────────────
  const bulkBar   = el.querySelector('#vv-bulk-bar');
  const bulkCount = el.querySelector('#vv-bulk-count');

  function updateBulkBar() {
    const checked = el.querySelectorAll('.vv-chk-row:checked');
    bulkBar.style.display = checked.length > 0 ? '' : 'none';
    bulkCount.textContent = checked.length + ' selecionado' + (checked.length !== 1 ? 's' : '');
    el.querySelectorAll('tr.row-selected').forEach(tr => tr.classList.remove('row-selected'));
    checked.forEach(chk => chk.closest('tr')?.classList.add('row-selected'));
  }

  async function bulkVoltarKanban(col) {
    const items = Array.from(el.querySelectorAll('.vv-chk-row:checked')).map(c => ({ vendaId: c.dataset.id, leadId: c.dataset.lead }));
    if (!items.length) return;
    for (const { vendaId, leadId } of items) {
      if (isLive && vendaId) { await supabase.from('vendas').delete().eq('id', vendaId); }
      if (leadId) {
        await saveLead(leadId, {
          kanban_column:       col,
          kanban_column_since: new Date().toISOString(),
          atualizadoem:        new Date().toISOString(),
        });
      }
    }
    toast(`${items.length} lead${items.length !== 1 ? 's' : ''} movido${items.length !== 1 ? 's' : ''}.`, 'ok');
    renderVendasView();
  }

  async function bulkExcluirVendas() {
    const items = Array.from(el.querySelectorAll('.vv-chk-row:checked')).map(c => ({ vendaId: c.dataset.id, leadId: c.dataset.lead }));
    if (!items.length) return;
    const n = items.length;
    if (!confirm(`Excluir ${n} venda${n !== 1 ? 's' : ''}? Esta ação não pode ser desfeita.`)) return;
    for (const { vendaId, leadId } of items) {
      if (isLive && vendaId) { await supabase.from('vendas').delete().eq('id', vendaId); }
      if (leadId) {
        await saveLead(leadId, {
          kanban_column:       'call_realizada',
          kanban_column_since: new Date().toISOString(),
          atualizadoem:        new Date().toISOString(),
        });
      }
    }
    toast(`${n} venda${n !== 1 ? 's' : ''} excluída${n !== 1 ? 's' : ''}.`, 'ok');
    renderVendasView();
  }

  // ── Event delegation no container estável ────────────────────────
  if (el._vvClickHandler)  el.removeEventListener('click',  el._vvClickHandler);
  if (el._vvChangeHandler) el.removeEventListener('change', el._vvChangeHandler);
  if (el._vvInputHandler)  el.removeEventListener('input',  el._vvInputHandler);

  el._vvClickHandler = e => {
    if (e.target.closest('#vv-limpar'))               { flt.mes = flt.closer = flt.programa = flt.forma = flt.search = ''; renderVendasView(); return; }
    if (e.target.closest('#btn-vv-bulk-clear'))        { const a=el.querySelector('#vv-chk-all'); if(a) a.checked=false; el.querySelectorAll('.vv-chk-row').forEach(c=>{c.checked=false;}); updateBulkBar(); return; }
    if (e.target.closest('#btn-vv-bulk-negociacao'))   { bulkVoltarKanban('call_realizada'); return; }
    if (e.target.closest('#btn-vv-bulk-agendamento'))  { bulkVoltarKanban('fechamento'); return; }
    if (e.target.closest('#btn-vv-bulk-excluir'))      { bulkExcluirVendas(); return; }
    const b = e.target.closest('[data-perfil-venda],.btn-edit-venda,.btn-del-venda');
    if (!b) return;
    if (b.dataset.perfilVenda)                         { const l=allLeads.find(x=>x.id===b.dataset.perfilVenda); if(l) openPerfil(l); return; }
    if (b.classList.contains('btn-edit-venda') && !b.disabled) { const row=allRows.find(r=>r.id===b.dataset.id); if(row) openEditarVenda(row); return; }
    if (b.classList.contains('btn-del-venda'))         { excluirVenda(b.dataset.id, b.dataset.lead); return; }
  };
  el.addEventListener('click', el._vvClickHandler);

  el._vvChangeHandler = e => {
    if (e.target.matches('#vv-mes'))      { flt.mes      = e.target.value; renderVendasView(); return; }
    if (e.target.matches('#vv-closer'))   { flt.closer   = e.target.value; renderVendasView(); return; }
    if (e.target.matches('#vv-programa')) { flt.programa = e.target.value; renderVendasView(); return; }
    if (e.target.matches('#vv-forma'))    { flt.forma    = e.target.value; renderVendasView(); return; }
    if (e.target.matches('#vv-chk-all'))  { el.querySelectorAll('.vv-chk-row').forEach(c=>{c.checked=e.target.checked;}); updateBulkBar(); return; }
    if (e.target.closest('.vv-chk-row'))  { updateBulkBar(); }
  };
  el.addEventListener('change', el._vvChangeHandler);

  el._vvInputHandler = e => {
    if (e.target.matches('#vv-search')) { flt.search = e.target.value.trim().toLowerCase(); applySearch(); }
  };
  el.addEventListener('input', el._vvInputHandler);
}

// ─── EDITAR VENDA ─────────────────────────────────────────────────────
let evVendaId = null;

function openEditarVenda(row) {
  evVendaId = row.id;
  $('ev-lead-nome').textContent = row.leads?.nome || '—';
  $('ev-id').value              = row.id || '';
  $('ev-lead-id').value         = row.lead_id || '';
  $('ev-programa').value        = row.programa || '';
  $('ev-valor').value           = row.valor || '';
  $('ev-entrada').value         = row.valor_entrada || '';
  $('ev-forma').value           = row.forma_pagamento || '';
  $('ev-obs').value             = row.observacoes || '';
  $('ev-backdrop').style.display = 'flex';
  document.body.style.overflow  = 'hidden';
  lucide.createIcons();
  setTimeout(() => $('ev-programa').focus(), 50);
}

function closeEditarVenda() {
  evVendaId = null;
  $('ev-backdrop').style.display = 'none';
  document.body.style.overflow  = '';
}

async function salvarEdicaoVenda() {
  const btn = $('ev-salvar');
  btn.disabled = true;
  try {
    const vendaId  = $('ev-id').value;
    const leadId   = $('ev-lead-id').value;
    const programa = $('ev-programa').value.trim();
    const valor    = $('ev-valor').value.trim();
    const entrada  = $('ev-entrada').value.trim();
    const forma    = $('ev-forma').value;
    const obs      = $('ev-obs').value.trim();

    if (!vendaId) { toast('ID da venda não encontrado.', 'err'); btn.disabled = false; return; }

    if (isLive) {
      const { error } = await supabase.from('vendas').update({
        programa, valor,
        valor_entrada:   entrada,
        forma_pagamento: forma,
        observacoes:     obs,
        atualizadoem:    new Date().toISOString(),
      }).eq('id', vendaId);
      if (error) throw error;
    }

    // Atualiza cache local
    const lIdx = allLeads.findIndex(l => l.id === leadId);
    if (lIdx >= 0) {
      allLeads[lIdx].venda_ganha_dados = { valor, entrada, forma, programa, obs };
    }

    toast('Venda atualizada!', 'ok');
    closeEditarVenda();
    renderVendasView();
  } catch(e) {
    console.error(e);
    toast('Erro ao atualizar venda.', 'err');
    btn.disabled = false;
  }
}

// ─── EXCLUIR VENDA ────────────────────────────────────────────────────
async function excluirVenda(vendaId, leadId) {
  if (!confirm('Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.')) return;
  try {
    if (isLive && vendaId) {
      const { error } = await supabase.from('vendas').delete().eq('id', vendaId);
      if (error) throw error;
    }
    // Move lead para call_realizada para não ser rebackfillado
    if (leadId) {
      await saveLead(leadId, {
        kanban_column:       'call_realizada',
        kanban_column_since: new Date().toISOString(),
        atualizadoem:        new Date().toISOString(),
      });
    }
    toast('Venda excluída.', 'ok');
    renderVendasView();
  } catch(e) {
    console.error(e);
    toast('Erro ao excluir venda.', 'err');
  }
}

// ─── VOLTAR PARA KANBAN ───────────────────────────────────────────────
let vkLeadId  = null;
let vkVendaId = null;

function openVoltaKanban(leadId, vendaId) {
  vkLeadId  = leadId  || null;
  vkVendaId = vendaId || null;
  const lead = allLeads.find(l => l.id === leadId);
  $('vk-lead-nome').textContent = lead?.nome || '—';

  const sel = $('vk-col');
  sel.innerHTML = '<option value="">Selecione a coluna…</option>';
  const cols = getKanbanCols().filter(c =>
    !['venda_ganha','venda_perdida','descartado'].includes(c.id)
  );
  cols.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id; opt.textContent = c.label;
    sel.appendChild(opt);
  });

  $('vk-confirmar').disabled = true;
  $('vk-backdrop').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  lucide.createIcons();
}

function closeVoltaKanban() {
  vkLeadId = vkVendaId = null;
  $('vk-backdrop').style.display = 'none';
  document.body.style.overflow  = '';
}

async function confirmarVoltaKanban() {
  const colId = $('vk-col').value;
  if (!colId) return;
  const btn = $('vk-confirmar');
  btn.disabled = true;
  try {
    if (isLive && vkVendaId) {
      const { error } = await supabase.from('vendas').delete().eq('id', vkVendaId);
      if (error) console.warn('[FDV] vk delete vendas:', error.message);
    }
    if (vkLeadId) {
      const cols     = getKanbanCols();
      const colLabel = cols.find(c => c.id === colId)?.label || colId;
      const hist     = buildHistoryEntry(vkLeadId, colId, colLabel);
      await saveLead(vkLeadId, {
        kanban_column:       colId,
        kanban_column_since: new Date().toISOString(),
        ...(hist && { historico_kanban: hist }),
        atualizadoem: new Date().toISOString(),
      });
    }
    toast('Lead movido de volta para o Kanban.', 'ok');
    closeVoltaKanban();
    renderVendasView();
  } catch(e) {
    console.error(e);
    toast('Erro ao mover lead.', 'err');
    btn.disabled = false;
  }
}

// ─── CANCELAR VENDA ───────────────────────────────────────────────────
async function cancelarVenda(vendaId) {
  if (!vendaId) { toast('ID da venda não encontrado.', 'err'); return; }
  if (!confirm('Tem certeza que deseja cancelar esta venda?')) return;
  try {
    if (isLive) {
      const { error } = await supabase.from('vendas').update({
        status:       'cancelada',
        atualizadoem: new Date().toISOString(),
      }).eq('id', vendaId);
      if (error) throw error;
    }
    toast('Venda cancelada.', 'ok');
    renderVendasView();
  } catch(e) {
    console.error(e);
    toast('Erro ao cancelar venda.', 'err');
  }
}

function renderDescartadosView() {
  const el = $('closer-subview');
  if (!el) return;

  // Filtros persistentes entre re-renders
  if (!renderDescartadosView._f) renderDescartadosView._f = { closer:'', mes:'', motivo:'' };
  const flt = renderDescartadosView._f;

  const MOTIVO_LABEL = Object.fromEntries(MOTIVOS_DESCARTE.map(m => [m.id, m.label]));

  // Todos os descartados (para preencher os dropdowns)
  const allDesc = allLeads.filter(l => l.kanban_column === 'descartado' || l.kanban_column === 'venda_perdida' || l.status === 'descartado');

  // Meses disponíveis
  const meses = [...new Set(
    allDesc.map(l => (l.kanban_column_since||l.atualizadoem||'').slice(0,7))
           .filter(m => /^\d{4}-\d{2}$/.test(m))
  )].sort().reverse();

  // Motivos disponíveis
  const motivosDisp = [...new Set(allDesc.map(l => l.motivo_descarte).filter(Boolean))];

  // Aplicar filtros
  let leads = allDesc;
  if (flt.closer)  leads = leads.filter(l => (l.closer||'') === flt.closer);
  if (flt.mes)     leads = leads.filter(l => (l.kanban_column_since||l.atualizadoem||'').startsWith(flt.mes));
  if (flt.motivo)  leads = leads.filter(l => l.motivo_descarte === flt.motivo);

  const hasAnyDesc = allDesc.length > 0;
  el.innerHTML = `
    <div class="subview-header">
      <h2 class="subview-title"><i data-lucide="archive-x"></i> Descartados</h2>
      <span class="subview-count">${allDesc.length} total · ${leads.length} exibido${leads.length!==1?'s':''}</span>
    </div>
    ${hasAnyDesc ? `
    <div class="desc-view-filters" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;padding:0 2px">
      <select class="filter-select" id="dv-closer" style="width:auto;min-width:140px">
        <option value="">Todos os closers</option>
        ${Object.entries(CLOSERS).map(([k,c])=>`<option value="${k}" ${flt.closer===k?'selected':''}>${esc(c.name)}</option>`).join('')}
      </select>
      <select class="filter-select" id="dv-mes" style="width:auto;min-width:140px">
        <option value="">Todos os meses</option>
        ${meses.map(m=>`<option value="${m}" ${flt.mes===m?'selected':''}>${fmtMes(m)}</option>`).join('')}
      </select>
      <select class="filter-select" id="dv-motivo" style="width:auto;min-width:160px">
        <option value="">Todos os motivos</option>
        ${motivosDisp.map(m=>`<option value="${m}" ${flt.motivo===m?'selected':''}>${esc(MOTIVO_LABEL[m]||m)}</option>`).join('')}
      </select>
      <button class="btn-ghost btn-sm" id="dv-limpar">Limpar</button>
    </div>` : ''}
    ${!hasAnyDesc ? `
      <div class="agenda-empty" style="margin-top:48px">
        ${_S('<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',36,';color:var(--t4);opacity:0.4')}
        <h3>Nenhum lead descartado</h3>
        <p>Leads descartados no Closer aparecerão aqui.</p>
      </div>` :
    leads.length === 0 ? '<p class="hist-empty" style="margin-top:32px">Nenhum resultado com esses filtros.</p>' : `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>Lead</th><th>Motivo</th><th>Closer</th><th>Descartado em</th><th>Ações</th>
        </tr></thead>
        <tbody>
          ${leads.map(l => `<tr>
            <td><button class="link-btn" data-perfil="${l.id}">${esc(l.nome||'—')}</button></td>
            <td>${esc(l.motivo_descarte_label || MOTIVO_LABEL[l.motivo_descarte] || l.motivo_descarte || '—')}</td>
            <td>${esc(l.closer?(CLOSERS[l.closer]?.name||l.closer):'—')}</td>
            <td>${fmtDate((l.kanban_column_since||l.atualizadoem||'').slice(0,10))}</td>
            <td class="cell-acoes">
              <button class="btn-ghost btn-sm btn-mover-kanban" data-id="${l.id}" title="Mover de volta para o Kanban">${ICO_UNDO} Kanban</button>
              <button class="btn-ghost btn-sm btn-wa-lead" data-id="${l.id}" title="WhatsApp">${ICO_MSG_CIRCLE}</button>
              <button class="btn-ghost btn-sm btn-ver-perfil" data-id="${l.id}" title="Ver perfil">${ICO_EYE||_S('<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',13)}</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`}
  `;
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
        toast(`${lead.nome} movido de volta para o Kanban.`, 'ok');
      } catch(e) { console.error(e); toast('Erro ao mover lead.','err'); }
    })
  );
}

// ─── MOTIVO DE PERDA ─────────────────────────────────────────────────
function openMotivosPerda(leadId) {
  mpLeadId  = leadId;
  mpSelected = null;
  const lead = allLeads.find(l => l.id === leadId);
  $('mp-lead-nome').textContent = lead?.nome || '—';
  $('mp-confirmar').disabled = true;

  const body = $('mp-body');
  body.innerHTML = MOTIVOS_PERDA.map(cat => `
    <div class="mp-cat">
      <div class="mp-cat-title"><i data-lucide="${cat.catIcon}" style="width:13px;height:13px;display:inline-block;vertical-align:middle;margin-right:5px"></i>${esc(cat.catLabel)}</div>
      <div class="mp-items">
        ${cat.items.map(item => `
          <button class="mp-item" data-id="${item.id}">
            <i data-lucide="${item.icon}" class="mp-icon"></i>
            <span>${esc(item.label)}</span>
          </button>`).join('')}
      </div>
    </div>`).join('') + `
    <div id="mp-outro-wrap" style="display:none;margin-top:14px">
      <textarea id="mp-outro-text" class="form-ctrl" placeholder="Descreva o motivo…" rows="3" style="width:100%;resize:vertical"></textarea>
    </div>`;
  lucide.createIcons();

  body.querySelectorAll('.mp-item').forEach(btn => {
    btn.addEventListener('click', () => {
      body.querySelectorAll('.mp-item').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      mpSelected = btn.dataset.id;
      $('mp-outro-wrap').style.display = mpSelected === 'outro' ? 'block' : 'none';
      $('mp-confirmar').disabled = false;
    });
  });

  $('motivo-perda-backdrop').style.display = 'flex';
}

function closeMotivosPerda() {
  $('motivo-perda-backdrop').style.display = 'none';
  mpLeadId  = null;
  mpSelected = null;
}

async function confirmarMotivosPerda() {
  if (!mpLeadId || !mpSelected) return;
  if (mpSelected === 'outro') {
    const text = ($('mp-outro-text')?.value || '').trim();
    if (!text) { toast('Descreva o motivo da perda.', 'err'); return; }
  }
  const btn = $('mp-confirmar');
  btn.disabled = true;

  const allItems   = MOTIVOS_PERDA.flatMap(c => c.items);
  const motivoItem = allItems.find(i => i.id === mpSelected);
  const outroText  = mpSelected === 'outro' ? ($('mp-outro-text')?.value || '').trim() : '';

  try {
    await ensureObsSaved(mpLeadId);
    const allCols  = getKanbanCols();
    const colLabel = allCols.find(c => c.id === 'venda_perdida')?.label || 'Venda Perdida';
    const hist     = buildHistoryEntry(mpLeadId, 'venda_perdida', colLabel);
    await saveLead(mpLeadId, {
      kanban_column:       'venda_perdida',
      kanban_column_since: new Date().toISOString(),
      motivo_perda:        mpSelected,
      motivo_perda_label:  motivoItem?.label || mpSelected,
      ...(outroText && { motivo_perda_obs: outroText }),
      ...(hist && { historico_kanban: hist }),
      atualizadoem:        new Date().toISOString(),
    });
    toast('Lead marcado como perda.', 'ok');
    closeMotivosPerda();
    if (!isLive) renderKanban();
  } catch(e) {
    console.error(e);
    toast('Erro ao salvar motivo.', 'err');
    btn.disabled = false;
  }
}

// ─── RELATÓRIOS ──────────────────────────────────────────────────────
// helpers
function _semaforo(val, cfg, lowerBetter) {
  if (lowerBetter) return val <= cfg.verde ? 'var(--green)' : val <= cfg.amarelo ? 'var(--gold)' : '#b05068';
  return val >= cfg.verde ? 'var(--green)' : val >= cfg.amarelo ? 'var(--gold)' : '#b05068';
}
function _healthBar(color, pct) {
  return `<div class="rel-health-bar"><div class="rel-health-fill" style="width:${Math.min(pct,100)}%;background:${color}"></div></div>`;
}
function _svgFunil(stages) {
  const W=320, SH=46, GAP=16, MAX=stages[0]?.val||1, MIN=56;
  const w = v => MIN + (W-MIN)*(Math.min(v,MAX)/MAX);
  const totalH = stages.length*(SH+GAP)-GAP;
  let svg = `<svg viewBox="0 0 ${W} ${totalH}" width="100%" style="display:block;max-height:280px">`;
  const COLORS = ['#1e4a5a','#173d4c','#10303e','#0a2330','#CE9221'];
  stages.forEach((s,i) => {
    const y=i*(SH+GAP), wTop=w(s.val), wBot=i<stages.length-1?w(stages[i+1].val):wTop*0.75;
    const lT=(W-wTop)/2, rT=lT+wTop, lB=(W-wBot)/2, rB=lB+wBot;
    const col=COLORS[Math.min(i,COLORS.length-1)];
    const advance = i<stages.length-1&&stages[i+1].val&&s.val ? Math.round(stages[i+1].val/s.val*100) : null;
    svg += `<polygon points="${lT},${y} ${rT},${y} ${rB},${y+SH} ${lB},${y+SH}" fill="${col}" rx="4"/>`;
    svg += `<text x="${W/2}" y="${y+SH/2+2}" text-anchor="middle" fill="rgba(232,228,220,0.95)" font-size="15" font-weight="800" font-family="Red Hat Display,sans-serif">${s.val}</text>`;
    svg += `<text x="${W/2}" y="${y+SH/2+14}" text-anchor="middle" fill="rgba(200,196,188,0.65)" font-size="9" font-weight="600">${s.label.toUpperCase()}</text>`;
    if(advance!==null) svg += `<text x="${W/2}" y="${y+SH+10}" text-anchor="middle" fill="rgba(200,196,188,0.45)" font-size="9">${advance}% avançaram</text>`;
  });
  svg += '</svg>';
  return svg;
}
function _dualBar(volume, maxVol, conv, maxConv) {
  const vPct = maxVol ? Math.round(volume/maxVol*100) : 0;
  const cPct = maxConv ? Math.round(conv/maxConv*100) : 0;
  return `<div class="rel-dual-bar-wrap">
    <div class="rel-dual-bar-row" title="${volume} leads">
      <span class="rel-dual-bar-ico" style="color:var(--petro-l)">●</span>
      <div class="rel-dual-bar"><div style="width:${vPct}%;background:var(--petro-l);height:6px;border-radius:3px"></div></div>
      <span class="rel-dual-num">${volume}</span>
    </div>
    <div class="rel-dual-bar-row" title="${conv}% conversão">
      <span class="rel-dual-bar-ico" style="color:var(--gold)">●</span>
      <div class="rel-dual-bar"><div style="width:${cPct}%;background:var(--gold);height:6px;border-radius:3px"></div></div>
      <span class="rel-dual-num">${conv}%</span>
    </div>
  </div>`;
}
function _parseRenda(v) {
  if (!v) return 0;
  const n = String(v).match(/\d[\d.]*,?\d*/);
  if (!n) return 0;
  return parseFloat(n[0].replace(/\./g,'').replace(',','.')) || 0;
}

function renderRelatorios() {
  const mesFilt    = $('rel-filter-mes').value;
  const origemFilt = $('rel-filter-origem').value;

  // base: filtrado por datachegada — total de leads e qualificados
  let base = [...allLeads];
  if (mesFilt)    base = base.filter(l => (l.datachegada||'').startsWith(mesFilt));
  if (origemFilt) base = base.filter(l => l.origem === origemFilt);
  _relBase = base;

  // callsBase: filtrado por dataagendamento — agendados, calls realizadas, no-shows
  let callsBase = allLeads.filter(l => l.dataagendamento);
  if (mesFilt)    callsBase = callsBase.filter(l => (l.dataagendamento||'').startsWith(mesFilt));
  if (origemFilt) callsBase = callsBase.filter(l => l.origem === origemFilt);
  const agendados  = callsBase;
  const realizadas = callsBase.filter(l => l.status === 'realizada');
  const noShows    = callsBase.filter(l => l.status === 'noshow');

  // vendasBase: filtrado por realizadaem como primário; exclui canceladas
  let vendasBase = [...allLeads];
  if (mesFilt)    vendasBase = vendasBase.filter(l => (l.realizadaem||l.kanban_column_since||l.datachegada||'').startsWith(mesFilt));
  if (origemFilt) vendasBase = vendasBase.filter(l => l.origem === origemFilt);
  const vendas = vendasBase.filter(l => l.kanban_column === 'venda_ganha' && l.venda_ganha_dados?.status !== 'cancelada');

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
  const fAgend  = agendados.length;
  const fCalls  = realizadas.length;
  const fVendas = vendas.length;
  const funnelStages = [
    { label:'Leads', val:base.length },
    { label:'Qualificados', val:fQualif },
    { label:'Agendados', val:fAgend },
    { label:'C. Realizadas', val:fCalls },
    { label:'Vendas', val:fVendas },
  ];

  // Bloco 0: saúde por origem — agrupa leads por canal com métricas de funil
  const funnelByOrigin = Object.entries(
    base.reduce((m,l) => {
      const o = l.origem||'Outros';
      if(!m[o]) m[o]={total:0,qualif:0,vendas:0};
      m[o].total++;
      if(!['aguardando','descartado','cancelado'].includes(l.status)) m[o].qualif++;
      if(l.kanban_column==='venda_ganha') m[o].vendas++;
      return m;
    }, {})
  ).map(([o,d]) => ({o,...d,conv:d.total?pct(d.vendas,d.total):0,qualifPct:d.total?pct(d.qualif,d.total):0}))
   .sort((a,b) => b.total-a.total);
  const maxLeadsOrig = Math.max(...funnelByOrigin.map(r=>r.total),1);

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
  const cleanUTMVal = v => (!v||/^\{\{.*\}\}$/.test(v.trim()))?null:v;
  const utmAgg = field => { const m={}; base.forEach(l=>{ const k=cleanUTMVal(l[field])||'Não identificado'; m[k]=(m[k]||{total:0,ve:0}); m[k].total++; if(l.kanban_column==='venda_ganha') m[k].ve++; }); return Object.entries(m).sort((a,b)=>b[1].total-a[1].total); };

  // Destroy charts
  [_relChart,_relChartDia]
    .forEach(c=>{try{c?.destroy();}catch(e){}});
  _relChart=_relChartDia=null;

  // ── UTM tab
  if (relShowUTM) {
    // Top anúncio por conversão (excluindo "Não identificado")
    const contentEntries = utmAgg('utm_content').filter(([k])=>k!=='Não identificado'&&k!=='(não informado)');
    const topAd = contentEntries.reduce((best,e) => {
      const c=e[1].total?pct(e[1].ve,e[1].total):-1;
      const bc=best?pct(best[1].ve,best[1].total):-1;
      return c>bc?e:best;
    }, null);

    const utmTableHTML = (field) => {
      const lbl={utm_source:'Origem',utm_campaign:'Campanha',utm_content:'Anúncio'}[field];
      const allE = utmAgg(field);
      const nonZero = allE.filter(([,d])=>d.total>0);
      const zero    = allE.filter(([,d])=>d.total===0);
      const maxV = Math.max(...nonZero.map(([,d])=>d.total),1);
      const maxC = Math.max(...nonZero.map(([,d])=>d.total?pct(d.ve,d.total):0),1);
      const rows = [...nonZero, ...zero];
      return `<div data-utm-panel="${field}" ${_utmTab!==field?'style="display:none"':''}>
        <div class="utm-perf-panel"><table class="rel-table">
          <thead><tr><th>${lbl}</th><th>Leads</th><th>Vendas</th><th>Conv.</th></tr></thead>
          <tbody>${rows.map(([k,d])=>{
            const convPct = d.total?pct(d.ve,d.total):0;
            const volW    = Math.round(d.total/maxV*100);
            const convW   = Math.round(convPct/maxC*100);
            return `<tr class="rel-drill-row${d.total===0?' roi-zero':''}" data-drill="${field}" data-drill-value="${esc(k)}" data-drill-title="${esc(lbl+': '+k)}">
              <td>
                <div class="utm-name-cell" title="${esc(k)}">${esc(k)}</div>
                ${d.total>0?`<div class="utm-mini-bars">
                  <div class="utm-mb-row"><div style="width:${volW}%;background:var(--petro-l)"></div></div>
                  <div class="utm-mb-row"><div style="width:${convW}%;background:var(--gold)"></div></div>
                </div>`:''}
              </td>
              <td>${d.total}</td>
              <td>${d.ve}</td>
              <td style="color:${convPct>0?'var(--green)':'var(--t3)'};font-weight:${convPct>0?700:400}">${convPct}%</td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>
      </div>`;
    };

    $('relatorios-content').innerHTML = `
      <div class="rel-utm-tab">
        <button class="btn-ghost btn-sm" id="rel-utm-back" style="margin-bottom:20px">← Voltar ao Relatório</button>
        ${topAd&&topAd[1].ve>0?`
        <div class="rel-utm-topad rel-block" style="margin-bottom:24px;padding:20px 24px;display:flex;align-items:center;gap:16px;border-left:3px solid var(--gold)">
          ${ICO_TROPHY}
          <div>
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--t3);margin-bottom:4px">Top anúncio do período</div>
            <div style="font-size:15px;font-weight:700;color:var(--t1)">${esc(topAd[0])}</div>
          </div>
          <div style="margin-left:auto;text-align:right">
            <div style="font-size:28px;font-weight:800;color:var(--gold);line-height:1">${pct(topAd[1].ve,topAd[1].total)}%</div>
            <div style="font-size:11px;color:var(--t3)">${topAd[1].total} leads · ${topAd[1].ve} vendas</div>
          </div>
        </div>`:''}
        <div class="rel-section-head">Performance por Campanha</div>
        <div class="utm-tab-bar sub-nav" style="margin-bottom:14px">
          <button class="sub-link${_utmTab==='utm_source'?' active':''}" data-utm-tab="utm_source">Por Origem</button>
          <button class="sub-link${_utmTab==='utm_campaign'?' active':''}" data-utm-tab="utm_campaign">Por Campanha</button>
          <button class="sub-link${_utmTab==='utm_content'?' active':''}" data-utm-tab="utm_content">Por Anúncio</button>
        </div>
        ${['utm_source','utm_campaign','utm_content'].map(utmTableHTML).join('')}
      </div>`;
    lucide.createIcons();
    $('rel-utm-back').addEventListener('click',()=>{ relShowUTM=false; renderRelatorios(); });
    document.querySelectorAll('[data-utm-tab]').forEach(b=>b.addEventListener('click',()=>{
      _utmTab=b.dataset.utmTab;
      document.querySelectorAll('[data-utm-tab]').forEach(t=>t.classList.toggle('active',t.dataset.utmTab===_utmTab));
      document.querySelectorAll('[data-utm-panel]').forEach(p=>{ p.style.display=p.dataset.utmPanel===_utmTab?'':'none'; });
    }));
    return;
  }

  // ── MAIN VIEW
  const fmtC = n => n?n.toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:0,maximumFractionDigits:0}):'—';
  const cComp = _semaforo(taxaComp, REL_CONFIG.comparecimento, false);
  const cConv = _semaforo(taxaConv,  REL_CONFIG.conversao, false);
  const cVel  = _semaforo(velocDias, REL_CONFIG.velocidade, true);

  $('relatorios-content').innerHTML = `

  <!-- Bloco 0: Métricas -->
  <div class="rel-section-head">Métricas do Período</div>
  <div class="stats-grid rel-summary">
    ${relStatCard('Total de Leads', base.length, _S('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'), '', 'data-drill="all" data-drill-title="Total de Leads"')}
    ${relStatCard('Comparecimento', taxaComp+'%', _S('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'), 'accent-petro', 'data-drill="status" data-drill-value="realizada" data-drill-title="Calls Realizadas"')}
    ${relStatCard('Conversão', taxaConv+'%', ICO_TROPHY, 'accent-green', 'data-drill="venda" data-drill-title="Vendas Ganhas"')}
    ${relStatCard('Faturamento', 'R$\xa0'+fmtValor(faturamento), _S('<line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'), 'accent-sand', 'data-drill="venda" data-drill-title="Vendas Ganhas"')}
    ${relStatCard('Ticket Médio', ticketMedio?'R$\xa0'+fmtValor(ticketMedio):'—', _S('<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>'), 'accent-gold')}
    ${relStatCard('Vendas', vendas.length, ICO_CHECK_CIRCLE, 'accent-gold', 'data-drill="venda" data-drill-title="Vendas Ganhas"')}
  </div>

  <!-- Bloco 1: Saúde por Origem -->
  <div class="rel-section-head">Saúde por Origem</div>
  <div class="rel-block">
    <table class="rel-table rel-origem-table">
      <thead><tr>
        <th>Canal</th><th>Leads</th><th>Qualificados</th><th>Conversão</th><th></th>
      </tr></thead>
      <tbody>${funnelByOrigin.map(r => {
        const dot = r.conv>0 ? 'var(--green)' : r.qualif>0 ? 'var(--gold)' : '#d06070';
        const volW = Math.round(r.total/maxLeadsOrig*100);
        return `<tr class="rel-drill-row" data-drill="origem" data-drill-value="${esc(r.o)}" data-drill-title="Canal: ${esc(r.o)}">
          <td>
            <div class="roi-nome">${esc(r.o)}</div>
            <div class="roi-bar"><div style="width:${volW}%;background:var(--petro-l);height:3px;border-radius:2px;transition:width .5s"></div></div>
          </td>
          <td>${r.total}</td>
          <td>${r.qualif} <span class="roi-pct">(${r.qualifPct}%)</span></td>
          <td style="color:${r.conv>0?'var(--green)':'var(--t3)'};font-weight:${r.conv>0?700:400}">${r.conv}%</td>
          <td><span class="roi-dot" style="background:${dot}"></span></td>
        </tr>`;
      }).join('')}</tbody>
    </table>
  </div>

  <!-- Bloco 2: Funil SVG -->
  <div class="rel-section-head">Funil de Conversão</div>
  <div class="rel-block" style="padding:28px;display:flex;gap:32px;align-items:center">
    <div style="flex:0 0 320px">${_svgFunil(funnelStages)}</div>
    <div style="flex:1;display:flex;flex-direction:column;gap:12px">
      ${funnelStages.map((s,i)=>{
        const next=funnelStages[i+1];
        const adv=next&&s.val?pct(next.val,s.val):null;
        return `<div class="rel-funil-row">
          <span class="rel-funil-lbl">${s.label}</span>
          <span class="rel-funil-n">${s.val}</span>
          ${adv!==null?'<span class="rel-funil-arrow">→ '+adv+'% avançaram</span>':''}
        </div>`;
      }).join('')}
      ${velocDias>0?'<div class="rel-funil-tempo">Tempo médio lead → call: <strong>'+velocDias+' dias</strong></div>':''}
    </div>
  </div>

  <!-- Bloco 3: Canais -->
  <div class="rel-section-head">Canais — Ranqueados por Conversão</div>
  ${topCanal?'<div class="rel-top-canal">⭐ Top canal: <strong>'+esc(topCanal.o)+'</strong> — '+topCanal.total+' leads, '+topCanal.conv+'% de conversão</div>':''}
  <div class="rel-block">
    <table class="rel-table">
      <thead><tr>
        <th>Canal</th><th>Volume + Conversão</th><th>Perfil qualificado %
          <span class="rel-th-tooltip" title="Leads com renda ≥ R$ ${(REL_CONFIG.rendaThreshold).toLocaleString('pt-BR')}">?</span>
        </th><th>Leads</th><th>Conv.</th>
      </tr></thead>
      <tbody>${canalRanking.map((r,i)=>
        `<tr class="rel-drill-row" data-drill="origem" data-drill-value="${esc(r.o)}" data-drill-title="Canal: ${esc(r.o)}">
          <td>${i===0?'⭐ ':''}<strong>${esc(r.o)}</strong></td>
          <td>${_dualBar(r.total,maxVol,r.conv,100)}</td>
          <td><span class="rel-qual-pct" style="color:${r.qualifPct>=50?'var(--green)':r.qualifPct>=25?'var(--gold)':'var(--t3)'}">${r.qualifPct}%</span></td>
          <td>${r.total}</td>
          <td>${r.conv}%</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <!-- Bloco 4: Perfil do Público — barras horizontais -->
  <div class="rel-section-head" style="display:flex;align-items:center;gap:12px">
    Perfil do Público
    <div class="rel-perfil-filter">
      <button class="rel-pf-btn active" data-pf="todos">Todos os leads</button>
      <button class="rel-pf-btn" data-pf="compradores">Apenas compradores</button>
    </div>
  </div>
  <div class="rel-hbars-grid" id="rel-hbars-grid"></div>

  <!-- Bloco 5: Equipe (duas tabelas lado a lado) -->
  <div class="rel-section-head">Performance da Equipe</div>
  <div class="rel-equipe-grid">
    ${relTable('Por Closer',['Closer','Agend.','C.Real.','No Shows','Vendas','Fat.','Conv.'],
      Object.entries(closerMap).map(([c,d])=>[CLOSERS[c]?.name||c,d.ag,d.re,d.ns,d.ve,d.val?'R$\xa0'+fmtValor(d.val):'—',d.re?pct(d.ve,d.re)+'%':'—']),
      i=>{const e=Object.entries(closerMap);return {type:'closer',value:e[i][0],title:'Closer: '+(CLOSERS[e[i][0]]?.name||e[i][0])};}
    )}
    ${relTable('Por Responsável',['Responsável','Agend.','Realizadas','Vendas'],
      Object.entries(respMap).map(([r,d])=>[r,d.ag,d.re,d.ve]),
      i=>{const e=Object.entries(respMap);return {type:'resp',value:e[i][0],title:'Resp.: '+e[i][0]};}
    )}
  </div>

  <!-- Bloco 6: Histórico mensal -->
  <div class="rel-section-head">Histórico Mensal</div>
  ${relTable('',['Mês','Leads','C. Realizadas','No Shows','Vendas','Faturamento'],
    mesEntries.map(([m,d])=>[fmtMes(m),d.total,d.re,d.ns,d.ve,d.val?'R$\xa0'+fmtValor(d.val):'—']),
    i=>{const e=mesEntries;return {type:'mes',value:e[i][0],title:'Mês: '+fmtMes(e[i][0])};}
  )}

  <!-- UTM card de destaque -->
  ${hasUTM&&topCanal?'<div class="rel-utm-cta rel-drill-row" id="rel-btn-utm">📡 Análise de Tráfego — '+esc(topCanal.o)+' trouxe '+topCanal.total+' leads · <u>ver análise completa</u></div>':''}

  ${!base.length?'<div class="agenda-empty"><h3>Sem dados</h3><p>Adicione leads ou ajuste os filtros.</p></div>':''}
  `;

  lucide.createIcons();

  // Bloco 4: barras horizontais — sem Chart.js
  function _mkHBars(field, color, label, pool) {
    const m = {};
    pool.forEach(l => { const v = (l[field]||'Não inf.').slice(0,30); m[v]=(m[v]||0)+1; });
    const entries = Object.entries(m).sort((a,b)=>b[1]-a[1]);
    const total   = entries.reduce((s,[,v])=>s+v,0);
    const maxVal  = entries[0]?.[1]||1;
    const show = entries.slice(0,10);
    const rest = entries.slice(10);
    const barRow = ([name,count]) => `
      <div class="rel-hbar-row">
        <div class="rel-hbar-name" title="${esc(name)}">${esc(name)}</div>
        <div class="rel-hbar-track">
          <div class="rel-hbar-fill" style="width:${Math.round(count/maxVal*100)}%;background:${color}"></div>
        </div>
        <span class="rel-hbar-count">${count}</span>
        <span class="rel-hbar-pct">${total?Math.round(count/total*100):0}%</span>
      </div>`;
    return `<div class="rel-hbar-block">
      <div class="rel-donut-title">${label}</div>
      <div class="rel-hbar-list">${show.map(barRow).join('')}</div>
      ${rest.length ? `
        <div class="rel-hbar-more" id="hbar-more-${field}" style="display:none">${rest.map(barRow).join('')}</div>
        <button class="btn-ghost btn-sm rel-hbar-toggle" data-field="${field}" data-count="${rest.length}" style="margin-top:8px;font-size:11px">Ver todos (${rest.length} mais)</button>` : ''}
    </div>`;
  }

  function _renderHBars(pfFilter) {
    const pool = pfFilter==='compradores' ? vendas : base;
    const grid = document.getElementById('rel-hbars-grid');
    if (!grid) return;
    grid.innerHTML = _mkHBars('profissao','var(--gold)','Por Profissão', pool)
                   + _mkHBars('renda','var(--petro-l)','Por Faixa de Renda', pool);
    grid.querySelectorAll('.rel-hbar-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const more = document.getElementById(`hbar-more-${btn.dataset.field}`);
        if (!more) return;
        const open = more.style.display !== 'none';
        more.style.display = open ? 'none' : '';
        btn.textContent = open ? `Ver todos (${btn.dataset.count} mais)` : 'Recolher';
      });
    });
  }
  _renderHBars('todos');

  // Profile filter pills
  document.querySelectorAll('.rel-pf-btn').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('.rel-pf-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    _renderHBars(b.dataset.pf);
  }));

  // UTM CTA
  document.getElementById('rel-btn-utm')?.addEventListener('click',()=>{ relShowUTM=true; renderRelatorios(); });

  // Drill-down delegation (existing)
}

// ── Funções auxiliares dos relatórios (globais para uso compartilhado)
function parseValor(v) {
  if (!v) return 0;
  return parseFloat(String(v).replace(/[^0-9,]/g,'').replace(',','.')) || 0;
}
function fmtValor(n) { return n.toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:0}); }
function pct(a,b)    { return b ? Math.round(a/b*100) : 0; }
function fmtMes(m)   { if(!m) return '—'; const [y,mo]=m.split('-'); return `${MONTHS[+mo]} ${y}`; }

function relStatCard(label, val, ico, accent='', drill='') {
  return `<div class="stat-card ${accent}${drill?' rel-drill-row':''}" ${drill} style="${drill?'cursor:pointer':''}">
    <div class="stat-top"><span class="stat-label">${esc(label)}</span><span class="stat-icon">${ico}</span></div>
    <strong class="stat-num">${val}</strong>
  </div>`;
}

function relTable(title, headers, rows, getDrill = null) {
  if (!rows.length) return '';
  const head = title ? `<h3 class="rel-section-title">${esc(title)}</h3>` : '';
  return `<div class="rel-section">${head}
    <div class="rel-table-wrap">
      <table class="rel-table">
        <thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${rows.map((row,i) => {
          const d = getDrill ? getDrill(i) : null;
          const attrs = d ? ` class="rel-drill-row" data-drill="${d.type}" data-drill-value="${esc(String(d.value))}" data-drill-title="${esc(d.title)}"` : '';
          return `<tr${attrs}>${row.map(cell=>`<td>${cell}</td>`).join('')}</tr>`;
        }).join('')}</tbody>
      </table>
    </div>
  </div>`;
}

// ─── TABLE ───────────────────────────────────────────────────────────
function renderTable() {
  const tbody = $('leads-tbody');
  const empty = $('empty-state');
  if (!filteredLeads.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    $('chk-all').checked = false;
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = filteredLeads.map(l => {
    const etiq = (l.etiquetas||[]).length
      ? (l.etiquetas||[]).slice(0,2).map(t=>etiquetaChip(t,true)).join('')
      : '—';
    return `<tr data-id="${l.id}" class="${['fdv-list-row',selectedIds.has(l.id)?'row-selected':'',isDup(l.id)?'dup-row':''].filter(Boolean).join(' ')}" style="cursor:pointer">
      <td class="cell-chk"><input type="checkbox" class="row-chk" data-id="${l.id}" ${selectedIds.has(l.id)?'checked':''}></td>
      <td class="cell-data-chegou">${fmtDate(l.datachegada)}</td>
      <td class="cell-nome">${isDup(l.id)?`<button class="btn-dup-ico" data-dup-id="${l.id}" title="Possível duplicata — clique para comparar">${ICO_COPY}</button> `:''} ${esc(l.nome||'—')}</td>
      <td class="cell-fone">${esc(l.celular||'—')}</td>
      <td>${badgeOrigem(l.origem)}</td>
      <td class="cell-renda" title="${esc(l.renda||'')}">${esc(abrevRenda(l.renda))}</td>
      <td>${etiq}</td>
      <td class="cell-acoes">${btnAcao(l)}</td>
    </tr>`;
  }).join('');

  const allChecked = filteredLeads.length > 0 && filteredLeads.every(l => selectedIds.has(l.id));
  $('chk-all').checked = allChecked;
  $('chk-all').indeterminate = !allChecked && filteredLeads.some(l => selectedIds.has(l.id));

  tbody.querySelectorAll('.row-chk').forEach(chk =>
    chk.addEventListener('change', () => {
      if (chk.checked) selectedIds.add(chk.dataset.id);
      else             selectedIds.delete(chk.dataset.id);
      updateBulkBar();
      chk.closest('tr').classList.toggle('row-selected', chk.checked);
      const all = filteredLeads.every(l => selectedIds.has(l.id));
      $('chk-all').checked = all;
      $('chk-all').indeterminate = !all && filteredLeads.some(l => selectedIds.has(l.id));
    })
  );
  // Clique na linha abre perfil (exceto em botões, inputs e ações)
  tbody.querySelectorAll('tr[data-id]').forEach(tr => {
    tr.addEventListener('click', e => {
      if (e.target.closest('button, input, a, .acoes-cell')) return;
      const l = allLeads.find(x => x.id === tr.dataset.id);
      if (l) openPerfil(l);
    });
  });
  tbody.querySelectorAll('[data-action]').forEach(b =>
    b.addEventListener('click', e => { e.stopPropagation(); handleAction(b.dataset.id, b.dataset.action); })
  );
  tbody.querySelectorAll('[data-postcall]').forEach(b =>
    b.addEventListener('click', e => { e.stopPropagation(); currentId=b.dataset.id; closeAllDropdowns(); handlePostCall(b.dataset.postcall); })
  );
  tbody.querySelectorAll('.btn-wa-lead').forEach(b =>
    b.addEventListener('click', e => { e.stopPropagation(); openWaChatFromLead(b.dataset.id); })
  );
}

// ─── MOBILE CARDS ────────────────────────────────────────────────────
function renderCards() {
  const wrap = $('leads-cards');
  if (!filteredLeads.length) {
    wrap.innerHTML = `<div class="cards-empty"><h3>Nenhum lead encontrado</h3><p>Ajuste os filtros ou cadastre um novo lead.</p></div>`;
    return;
  }
  wrap.innerHTML = filteredLeads.map(l => {
    const etiquetas = (l.etiquetas||[]).map(t=>etiquetaChip(t,true)).join('');
    const agendInfo = (l.status==='agendado' && l.dataagendamento)
      ? `<div class="card-agenda-info">${ICO_CALENDAR} ${fmtDateHora(l.dataagendamento,l.horaagendamento)} · ${esc(CLOSERS[l.closer]?.name||l.closer||'—')}</div>` : '';
    return `<div class="lead-card" data-id="${l.id}">
      <div class="card-head">
        <div>
          <button class="card-nome nome-link" data-perfil="${l.id}">${esc(l.nome||'—')}</button>
          <div class="card-fone">${esc(l.celular||'—')}</div>
        </div>
        <div class="card-badges">${badgeStatus(l.status)}${badgeOrigem(l.origem)}</div>
      </div>
      ${etiquetas ? `<div class="card-etiquetas">${etiquetas}</div>` : ''}
      <div class="card-grid">
        <div class="card-item"><label>Profissão</label><span>${esc(l.profissao||'—')}</span></div>
        <div class="card-item"><label>Renda</label><span class="renda-val">${esc(l.renda||'—')}</span></div>
      </div>
      ${agendInfo}
      <div class="card-foot">
        <span class="card-data">Chegou ${fmtDate(l.datachegada)}</span>
        ${btnAcao(l)}
      </div>
    </div>`;
  }).join('');

  wrap.querySelectorAll('[data-perfil]').forEach(b =>
    b.addEventListener('click', e => { e.stopPropagation(); const l=allLeads.find(x=>x.id===b.dataset.perfil); if(l) openPerfil(l); })
  );
  wrap.querySelectorAll('[data-action]').forEach(b =>
    b.addEventListener('click', () => handleAction(b.dataset.id, b.dataset.action))
  );
  wrap.querySelectorAll('[data-postcall]').forEach(b =>
    b.addEventListener('click', e => { e.stopPropagation(); currentId=b.dataset.id; closeAllDropdowns(); handlePostCall(b.dataset.postcall); })
  );
  wrap.querySelectorAll('.btn-wa-lead').forEach(b =>
    b.addEventListener('click', e => { e.stopPropagation(); openWaChatFromLead(b.dataset.id); })
  );
}

// ─── HELPERS ─────────────────────────────────────────────────────────
function badgeOrigem(o) {
  const map = { Instagram:'instagram', Facebook:'facebook', Indicação:'indicacao', Google:'google', WhatsApp:'whatsapp', Outros:'outros' };
  return `<span class="badge-origem ${map[o]||'outros'}" title="${esc(o||'')}">${esc(o||'—')}</span>`;
}
function abrevRenda(r) {
  if (!r) return '—';
  // Handle both "2.000" (BR thousands) and "2.000,00" (BR with cents)
  const nums = [...r.matchAll(/\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?/g)]
    .map(m => parseFloat(m[0].replace(/\./g,'').replace(',','.')))
    .filter(n => !isNaN(n) && n >= 100);
  if (!nums.length) return r;
  const fmt = v => v >= 1000 ? (v % 1000 === 0 ? (v/1000)+'k' : (v/1000).toFixed(1)+'k') : 'R$'+v;
  if (/acima|mais\s+de/i.test(r)) return '+'+fmt(Math.max(...nums));
  if (/até|menos\s+de/i.test(r))  return 'até '+fmt(Math.min(...nums));
  if (nums.length >= 2)           return fmt(Math.min(...nums))+'–'+fmt(Math.max(...nums));
  return fmt(nums[0]);
}
function badgeStatus(s) {
  const labels = { aguardando:'Aguardando', qualificado:'Qualificado', agendado:'Agendado', realizada:'Call Realizada', noshow:'No Show', cancelado:'Cancelado', descartado:'Descartado' };
  return `<span class="badge-status ${s||''}">${labels[s]||s||'—'}</span>`;
}
function badgeFollowup(sf, cc) {
  const key = sf || 'sem_contato';
  const labels = { sem_contato:'Sem contato', em_contato:`Contato ${cc||1}`, sem_resposta:'Sem resposta' };
  return `<span class="badge-followup badge-followup--${key}">${labels[key]||key}</span>`;
}
// Badge que reflete a coluna Kanban atual (não o status do lead)
const _KC_BADGE = {
  agendado:       { lbl:'Agendado',       cls:'agendado'   },
  call_realizada: { lbl:'Call Realizada', cls:'realizada'  },
  negociacao:     { lbl:'Negociação',     cls:'qualificado'},
  decisao:        { lbl:'Decisão',        cls:'agendado'   },
  venda_ganha:    { lbl:'Venda Ganha',    cls:'realizada'  },
  venda_perdida:  { lbl:'Descartado',     cls:'descartado' },
  descartado:     { lbl:'Descartado',     cls:'descartado' },
};
function badgeKanbanCol(col) {
  const b = _KC_BADGE[col];
  if (b) return `<span class="badge-status ${b.cls}">${b.lbl}</span>`;
  return `<span class="badge-status">${esc(col||'—')}</span>`;
}
function btnAcao(l) {
  const id = l.id;
  const st = l.status;

  const icoEye   = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const icoPen   = ICO_PENCIL;
  const icoDoc   = ICO_CLIPBOARD;

  let primary = '';
  if      (st === 'aguardando')                  primary = `<button class="btn-acao-inline btn-qualificar"     data-id="${id}" data-action="qualificar-lead" title="Qualificar este lead">${ICO_CHECK_SM} Qualificado</button><button class="btn-acao-inline btn-nao-qualificar" data-id="${id}" data-action="descartar" title="Não qualificar / descartar">${ICO_X_SM} Não Qualificado</button>`;
  else if (st === 'qualificado')                 primary = `<button class="btn-acao-inline btn-agendar"        data-id="${id}" data-action="agendar"         title="Agendar call">${ICO_CALENDAR} Agendar</button>`;
  else if (st === 'agendado' || st === 'noshow') primary = `<button class="btn-acao-inline btn-remarcar"       data-id="${id}" data-action="agendar"         title="Remarcar call">${ICO_REFRESH} Remarcar</button>`;
  else if (st === 'realizada')                   primary = `<button class="btn-acao-inline btn-ver"            data-id="${id}" data-action="ver"             title="Ver resultado da call">${ICO_PHONE_CHECK} Resultado</button>`;
  else if (st === 'descartado')                  primary = `<button class="btn-acao-inline btn-reativar"       data-id="${id}" data-action="reativar"        title="Reativar lead">${ICO_UNDO} Reativar</button>`;

  const postcall = st === 'agendado'
    ? `<button class="btn-icon btn-realizada" data-id="${id}" data-postcall="realizada" title="Marcar como Call Realizada">${ICO_CHECK_CIRCLE}</button>
       <button class="btn-icon btn-noshow"    data-id="${id}" data-postcall="noshow"    title="Marcar como No Show">${ICO_X_CIRCLE}</button>`
    : '';

  const briefingBtn = st !== 'aguardando'
    ? `<button class="btn-icon btn-briefing" data-id="${id}" data-action="briefing" title="Briefing">${icoDoc}</button>`
    : '';

  return `<div class="acoes-cell">
    ${primary}${postcall}
    ${briefingBtn}
    <button class="btn-icon btn-editar"  data-id="${id}" data-action="editar"     title="Editar lead">${icoPen}</button>
    <button class="btn-icon btn-destructive btn-excluir" data-id="${id}" data-action="excluir" title="Excluir lead">${ICO_TRASH}</button>
  </div>`;
}
function fmtDate(d) {
  if (!d) return '—';
  if (typeof d.toDate === 'function') d = d.toDate().toISOString().slice(0,10);
  const [y,m,dd] = String(d).split('-');
  return `${dd}/${m}/${y}`;
}
function fmtHora(h) { return h ? String(h).slice(0, 5) : '—'; }
function fmtDateHora(date, hora) { return date ? (hora ? `${fmtDate(date)} · ${fmtHora(hora)}` : fmtDate(date)) : '—'; }
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── SORT TABLE ──────────────────────────────────────────────────────
const TABLE_SORT = {};

function sortTable(rows, col, dir) {
  if (!col || !dir) return rows;
  const copy = [...rows];
  return copy.sort((a, b) => {
    const av = String(a[col] ?? '');
    const bv = String(b[col] ?? '');
    const cmp = av.localeCompare(bv, 'pt-BR', { numeric: true });
    return dir === 'asc' ? cmp : -cmp;
  });
}

function cycleSortState(tableId, col) {
  const cur = TABLE_SORT[tableId] || {};
  if (cur.col !== col)        TABLE_SORT[tableId] = { col, dir: 'asc' };
  else if (cur.dir === 'asc') TABLE_SORT[tableId] = { col, dir: 'desc' };
  else                        TABLE_SORT[tableId] = { col: null, dir: null };
}

function updateSortIcons(container, tableId) {
  if (!container) return;
  const { col, dir } = TABLE_SORT[tableId] || {};
  container.querySelectorAll('[data-sort-col]').forEach(el => {
    el.classList.remove('sort-asc', 'sort-desc');
    if (el.dataset.sortCol === col && dir) el.classList.add('sort-' + dir);
  });
}

function bindSortHeaders(container, tableId, rerenderFn) {
  if (!container) return;
  container.querySelectorAll('[data-sort-col]').forEach(el => {
    el.addEventListener('click', () => {
      cycleSortState(tableId, el.dataset.sortCol);
      rerenderFn();
    });
  });
  updateSortIcons(container, tableId);
}

// ─── STATS ───────────────────────────────────────────────────────────
function updateStats() {
  const mes  = $('filter-mes').value;
  const base = mes ? allLeads.filter(l=>(l.datachegada||'').startsWith(mes)) : allLeads;
  $('stat-total').textContent      = base.length;
  $('stat-aguardando').textContent = base.filter(l=>l.status==='aguardando').length;
  $('stat-agendado').textContent   = base.filter(l=>l.status==='agendado').length;
  $('stat-noshow').textContent     = base.filter(l=>l.status==='noshow').length;
  $('stat-realizada').textContent  = base.filter(l=>l.status==='realizada').length;
  $('stat-vendas').textContent     = base.filter(l=>l.kanban_column==='venda_ganha').length;
}
function updateCount() {
  const t = filteredLeads.length, a = allLeads.length;
  $('results-info').textContent = t===a ? `${t} lead${t!==1?'s':''}` : `${t} de ${a} lead${a!==1?'s':''}`;
}

// ─── MONTHS ──────────────────────────────────────────────────────────
const MONTHS = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function populateMonths() {
  const sel = $('filter-mes');
  const cur = sel.value;
  const months = [...new Set(allLeads.filter(l=>l.datachegada).map(l=>l.datachegada.slice(0,7)))].sort().reverse();
  while (sel.options.length > 1) sel.remove(1);
  months.forEach(m => { const [y,mo]=m.split('-'); sel.appendChild(new Option(`${MONTHS[+mo]} ${y}`,m)); });
  if (cur) sel.value = cur;
}

function populateAllMonths() {
  // datachegada months
  const datachegadaMonths = [...new Set(allLeads.filter(l=>l.datachegada).map(l=>l.datachegada.slice(0,7)))].sort().reverse();
  // dataagendamento months
  const agendaMonths = [...new Set(allLeads.filter(l=>l.dataagendamento).map(l=>l.dataagendamento.slice(0,7)))].sort().reverse();

  function fill(selId, months) {
    const sel = $(selId); if (!sel) return;
    const cur = sel.value;
    while (sel.options.length > 1) sel.remove(1);
    months.forEach(m => { const [y,mo]=m.split('-'); sel.appendChild(new Option(`${MONTHS[+mo]} ${y}`,m)); });
    if (cur) sel.value = cur;
  }
  fill('filter-mes',          datachegadaMonths);
  fill('agenda-filter-mes',   agendaMonths);
  fill('briefing-filter-mes', agendaMonths);
  fill('kanban-filter-mes',   agendaMonths);
  fill('rel-filter-mes',      datachegadaMonths);
}

// ─── ACTIONS ─────────────────────────────────────────────────────────
function handleAction(id, action) {
  currentId = id;
  const lead = allLeads.find(l=>l.id===id);
  if (!lead) return;
  if (action === 'menu') { toggleAcoesDropdown(id); return; }
  closeAllDropdowns();
  if      (action === 'agendar')          openAgendar(lead);
  else if (action === 'qualificar')       openPerfil(lead);
  else if (action === 'qualificar-lead')  qualificarLead(id);
  else if (action === 'descartar')        openDescarteModal(id);
  else if (action === 'reativar')         reativarLead(id);
  else if (action === 'ver')              verDetalhes(lead);
  else if (action === 'editar')           openNovoLead(lead);
  else if (action === 'excluir')          deleteLead(id);
  else if (action === 'briefing')         openBriefing(lead);
}

async function deleteLead(id) {
  if (!confirm('Excluir este lead? Esta ação não pode ser desfeita.')) return;
  try {
    if (isLive) { const { error } = await supabase.from('leads').delete().eq('id', id); if (error) throw error; }
    else        { allLeads = allLeads.filter(l=>l.id!==id); renderAll(); }
    selectedIds.delete(id); updateBulkBar();
    toast('Lead excluído.', 'ok');
  } catch(e) { console.error(e); toast('Erro ao excluir.', 'err'); }
}

// ─── BRIEFING ────────────────────────────────────────────────────────
let briefingLeadId = null;

function openBriefing(lead, readOnly = false) {
  briefingLeadId = lead.id;
  $('briefing-lead-name').textContent = lead.nome || '—';
  const ta = $('briefing-textarea');
  ta.value = lead.briefing || '';
  ta.readOnly = readOnly;
  ta.placeholder = readOnly ? '' : 'Nenhum briefing adicionado ainda. Cole ou escreva aqui…';
  const btnSalvar = $('btn-salvar-briefing');
  const btnCancelar = $('briefing-cancelar');
  btnSalvar.style.display = readOnly ? 'none' : '';
  btnCancelar.textContent = readOnly ? 'Fechar' : 'Cancelar';
  $('briefing-backdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
  if (!readOnly) setTimeout(() => ta.focus(), 50);
}

function closeBriefing() {
  $('briefing-backdrop').classList.remove('open');
  document.body.style.overflow = '';
  briefingLeadId = null;
}

async function salvarBriefing() {
  if (!briefingLeadId) return;
  const texto = $('briefing-textarea').value.trim();
  const btn = $('btn-salvar-briefing');
  btn.disabled = true;
  try {
    if (isLive) {
      const { error } = await supabase.from('leads').update({ briefing: texto || null, atualizadoem: new Date().toISOString() }).eq('id', briefingLeadId);
      if (error) throw error;
    }
    const lead = allLeads.find(l => l.id === briefingLeadId);
    if (lead) lead.briefing = texto || null;
    toast('Briefing salvo.', 'ok');
    closeBriefing();
    // Atualiza a aba Briefing se estiver ativa
    if (activeAgendadosSub === 'briefing') renderBriefingSub();
  } catch(e) {
    console.error(e);
    toast('Erro ao salvar briefing.', 'err');
  } finally {
    btn.disabled = false;
  }
}

// ─── BULK ─────────────────────────────────────────────────────────────
function updateBulkBar() {
  const n = selectedIds.size;
  $('bulk-bar').style.display = n > 0 ? 'flex' : 'none';
  $('bulk-count').textContent = `${n} selecionado${n!==1?'s':''}`;
}
async function bulkDelete() {
  const n = selectedIds.size; if (!n) return;
  if (!confirm(`Excluir ${n} lead(s)?`)) return;
  try {
    if (isLive) {
      const { error } = await supabase.from('leads').delete().in('id', [...selectedIds]);
      if (error) throw error;
    }
    allLeads = allLeads.filter(l => !selectedIds.has(l.id));
    selectedIds.clear(); updateBulkBar(); renderAll();
    toast(`${n} lead(s) excluído(s).`, 'ok');
  } catch(e) { console.error(e); toast('Erro ao excluir.', 'err'); }
}
async function bulkChangeStatus() {
  const status = $('bulk-status-sel').value, n = selectedIds.size;
  if (!status || !n) { toast('Selecione um status.', 'err'); return; }
  try {
    const now = new Date().toISOString();
    if (isLive) {
      const { error } = await supabase.from('leads').update({ status, atualizadoem: now }).in('id', [...selectedIds]);
      if (error) throw error;
    } else { selectedIds.forEach(id=>{ const i=allLeads.findIndex(l=>l.id===id); if(i!==-1) allLeads[i]={...allLeads[i],status,atualizadoem:now}; }); renderAll(); }
    toast(`Status atualizado em ${n} lead(s).`, 'ok');
    selectedIds.clear(); $('bulk-status-sel').value = ''; updateBulkBar();
  } catch(e) { console.error(e); toast('Erro ao atualizar status.', 'err'); }
}

async function bulkQualificar() {
  const ids = [...selectedIds]; if (!ids.length) return;
  try {
    const now = new Date().toISOString();
    if (isLive) {
      const { error } = await supabase.from('leads').update({ status: 'qualificado', atualizadoem: now }).in('id', ids);
      if (error) throw error;
    } else {
      ids.forEach(id => { const i = allLeads.findIndex(l=>l.id===id); if(i!==-1) allLeads[i]={...allLeads[i], status:'qualificado', atualizadoem:now}; });
    }
    toast(`${ids.length} lead(s) qualificado(s).`, 'ok');
    selectedIds.clear(); updateBulkBar(); renderAll();
  } catch(e) { console.error(e); toast('Erro ao qualificar.', 'err'); }
}

function updateQualBulkBar() {
  const bar = $('qual-bulk-bar'); if (!bar) return;
  const n = qualSelectedIds.size;
  bar.style.display = n > 0 ? 'flex' : 'none';
  const c = $('qual-bulk-count'); if (c) c.textContent = `${n} selecionado${n!==1?'s':''}`;
}
function updateDescBulkBar() {
  const bar = $('desc-bulk-bar'); if (!bar) return;
  const n = selectedIds.size;
  bar.style.display = n > 0 ? 'flex' : 'none';
  const c = $('desc-bulk-count'); if (c) c.textContent = `${n} selecionado${n!==1?'s':''}`;
}
function updateNsBulkBar() {
  const bar = $('ns-bulk-bar'); if (!bar) return;
  const n = nsSelectedIds.size;
  bar.style.display = n > 0 ? 'flex' : 'none';
  const c = $('ns-bulk-count'); if (c) c.textContent = `${n} selecionado${n!==1?'s':''}`;
}

function openBulkTagModal() {
  if (!selectedIds.size) return;
  const colors  = getEtiquetaColors();
  const allTags = [...new Set([...ETIQUETAS_DEFAULT, ...allLeads.flatMap(l => l.etiquetas || [])])];
  const pop = document.getElementById('_bulk-tag-pop') || document.createElement('div');
  pop.id = '_bulk-tag-pop';
  pop.className = 'modal-backdrop open';
  pop.innerHTML = `
    <div class="modal" style="max-width:360px" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h2 class="modal-title">Adicionar etiqueta</h2>
        <button class="modal-close" id="_btn-tag-close" aria-label="Fechar"><i data-lucide="x" style="width:14px;height:14px"></i></button>
      </div>
      <div class="modal-body" style="padding:16px 20px">
        <p style="font-size:12px;color:var(--t3);margin:0 0 12px">Selecione a etiqueta a adicionar em ${selectedIds.size} lead(s):</p>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${allTags.map(t => {
            const hex = colors[t];
            const s   = hex ? `background:${hex}22;border-color:${hex}55;color:${hex}` : '';
            return `<button class="etiqueta-default" data-tag="${esc(t)}"${s?` style="${s}"`:''}>${esc(t)}</button>`;
          }).join('')}
        </div>
      </div>
      <div class="modal-footer" style="justify-content:flex-end">
        <button class="btn-ghost" id="_btn-tag-cancel">Cancelar</button>
      </div>
    </div>`;
  document.body.appendChild(pop);
  lucide.createIcons({ nodes: [pop] });
  pop.querySelectorAll('[data-tag]').forEach(btn =>
    btn.addEventListener('click', async () => { pop.remove(); await bulkApplyTag(btn.dataset.tag); })
  );
  document.getElementById('_btn-tag-close')?.addEventListener('click',  () => pop.remove());
  document.getElementById('_btn-tag-cancel')?.addEventListener('click', () => pop.remove());
  pop.addEventListener('click', e => { if (e.target === pop) pop.remove(); });
}

async function bulkApplyTag(tag) {
  const ids = [...selectedIds]; if (!ids.length) return;
  const now = new Date().toISOString();
  let count = 0;
  for (const id of ids) {
    const idx = allLeads.findIndex(l => l.id === id); if (idx === -1) continue;
    const cur = allLeads[idx].etiquetas || [];
    if (cur.includes(tag)) continue;
    const newTags = [...cur, tag];
    if (isLive) {
      const { error } = await supabase.from('leads').update({ etiquetas: newTags, atualizadoem: now }).eq('id', id);
      if (error) { console.error(error); continue; }
    }
    allLeads[idx] = { ...allLeads[idx], etiquetas: newTags, atualizadoem: now };
    count++;
  }
  selectedIds.clear(); updateBulkBar(); renderAll();
  toast(`Etiqueta "${tag}" adicionada a ${count} lead(s).`, 'ok');
}

async function bulkReativar() {
  const ids = [...selectedIds]; if (!ids.length) return;
  const n = ids.length;
  if (!confirm(`Reativar ${n} lead(s) como Novos?`)) return;
  const now = new Date().toISOString();
  const payload = { status: 'aguardando', kanban_column: null, motivo_descarte: null, motivo_descarte_label: null, motivo_descarte_obs: null, atualizadoem: now };
  try {
    if (isLive) {
      const { error } = await supabase.from('leads').update(payload).in('id', ids);
      if (error) throw error;
    }
    ids.forEach(id => { const idx = allLeads.findIndex(l => l.id === id); if (idx !== -1) allLeads[idx] = { ...allLeads[idx], ...payload }; });
    selectedIds.clear(); updateBulkBar(); renderAll();
    toast(`${n} lead(s) reativado(s) como Novos.`, 'ok');
  } catch(e) { console.error(e); toast('Erro ao reativar.', 'err'); }
}

function openBulkDescarteModal() {
  const ids = [...selectedIds]; if (!ids.length) return;
  bulkDescarteIds  = ids;
  descarteLeadId   = null;
  descarteSelected = null;
  $('descarte-lead-nome').textContent = `${ids.length} lead(s) selecionado(s)`;
  $('descarte-confirmar').disabled = true;

  const body = $('descarte-body');
  body.innerHTML = `
    <p class="mp-instr">Selecione o motivo do descarte:</p>
    <div class="mp-grid">
      ${MOTIVOS_DESCARTE.map(m => `
        <button class="mp-item" data-id="${m.id}">
          <span>${esc(m.label)}</span>
        </button>`).join('')}
    </div>
    <div id="descarte-outro-wrap" style="display:none;margin-top:14px">
      <textarea id="descarte-outro-text" class="form-ctrl" placeholder="Descreva o motivo…" rows="3" style="width:100%;resize:vertical"></textarea>
    </div>`;

  body.querySelectorAll('.mp-item').forEach(btn => {
    btn.addEventListener('click', () => {
      body.querySelectorAll('.mp-item').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      descarteSelected = btn.dataset.id;
      $('descarte-outro-wrap').style.display = descarteSelected === 'outro' ? 'block' : 'none';
      $('descarte-confirmar').disabled = false;
    });
  });

  $('descarte-backdrop').style.display = 'flex';
}

// ─── AGENDAR MODAL ───────────────────────────────────────────────────
function openAgendar(lead) {
  currentId = lead.id;
  modalMode = 'agendar';
  cal = { step: 1, closer: null, leadSnap: lead };
  const calWrap = $('cal-connect-wrap');
  if (calWrap) {
    calWrap.style.display = hasPerm('usuarios') ? '' : 'none';
    if (hasPerm('usuarios')) updateCalConnectButtons();
  }
  $('modal-title').textContent    = 'Agendar Call';
  $('modal-subtitle').textContent = `${lead.nome} · ${lead.celular}`;
  $('lead-strip').style.display   = '';
  $('lead-strip').innerHTML = strip([
    { l:'Origem',    v: lead.origem    || '—' },
    { l:'Profissão', v: lead.profissao || '—' },
    { l:'Renda',     v: lead.renda     || '—' },
    { l:'Chegou em', v: fmtDate(lead.datachegada) },
  ]);
  $('sched-hint').textContent         = 'Selecione o closer — o link de agendamento abre em nova aba.';
  $('sched-banner-p').textContent     = 'Link aberto em nova aba. Confirme o horário com o lead e preencha os dados abaixo.';
  $('sched-closer-label').textContent = 'Closer';
  $('sched-obs').placeholder          = 'Contexto, interesse demonstrado, pontos de atenção…';
  $('form-resultado').style.display = 'none';
  $('form-agendar').style.display   = 'block';
  $('form-detalhes').style.display  = 'none';
  schedGoToStep(1);
  openModal();
}

function openAgendarSessao(sessao, aluna) {
  modalMode = 'agendar-sessao';
  cal = { step: 1, closer: null, sessaoId: sessao?.id || null, alunaId: aluna?.id || null };
  const calWrap = $('cal-connect-wrap');
  if (calWrap) calWrap.style.display = 'none';
  $('modal-title').textContent    = sessao ? 'Agendar Sessão' : 'Nova Sessão';
  $('modal-subtitle').textContent = (aluna?.nome || '—') + (sessao?.numero_sessao ? ` · Sessão ${sessao.numero_sessao}` : '');
  $('lead-strip').innerHTML       = '';
  $('lead-strip').style.display   = 'none';
  $('sched-hint').textContent         = 'Selecione o responsável — o link de agendamento abre em nova aba.';
  $('sched-banner-p').textContent     = 'Link aberto em nova aba. Confirme o horário com a aluna e preencha os dados abaixo.';
  $('sched-closer-label').textContent = 'Responsável';
  $('sched-obs').placeholder          = 'Observações sobre a sessão…';
  // Aluna selector: visible only when creating a new session
  const alunaRow = $('sched-aluna-row');
  if (!sessao) {
    const sel = $('sched-aluna-sel');
    sel.innerHTML = `<option value="">Selecione a aluna…</option>` +
      allAlunas.map(a => `<option value="${a.id}"${a.id === aluna?.id ? ' selected' : ''}>${esc(a.nome||'—')}</option>`).join('');
    alunaRow.style.display = '';
  } else {
    alunaRow.style.display = 'none';
  }
  $('form-resultado').style.display = 'none';
  $('form-agendar').style.display   = 'block';
  $('form-detalhes').style.display  = 'none';
  schedGoToStep(1);
  openModal();
}

function openEditarAgendamento(lead) {
  currentId = lead.id;
  modalMode = 'agendar';
  cal = { step: 2, closer: lead.closer, leadSnap: lead };
  const calWrap = $('cal-connect-wrap');
  if (calWrap) {
    calWrap.style.display = hasPerm('usuarios') ? '' : 'none';
    if (hasPerm('usuarios')) updateCalConnectButtons();
  }
  $('modal-title').textContent    = 'Editar Agendamento';
  $('modal-subtitle').textContent = `${lead.nome} · ${lead.celular}`;
  $('lead-strip').style.display   = '';
  $('lead-strip').innerHTML = strip([
    { l:'Origem',    v: lead.origem    || '—' },
    { l:'Profissão', v: lead.profissao || '—' },
    { l:'Renda',     v: lead.renda     || '—' },
    { l:'Chegou em', v: fmtDate(lead.datachegada) },
  ]);
  $('sched-banner-p').textContent     = 'Edite os dados do agendamento abaixo.';
  $('sched-closer-label').textContent = 'Closer';
  $('sched-obs').placeholder          = 'Contexto, interesse demonstrado, pontos de atenção…';
  const closerName = lead.closer ? (CLOSERS[lead.closer]?.name || lead.closer) : '';
  $('sched-closer-lbl').value = closerName;
  if (lead.dataagendamento && lead.horaagendamento) {
    const hora = lead.horaagendamento.length >= 5 ? lead.horaagendamento.slice(0, 5) : lead.horaagendamento;
    $('sched-datetime').value = `${lead.dataagendamento}T${hora}`;
  } else {
    $('sched-datetime').value = '';
  }
  $('sched-obs').value = lead.observacoes || '';
  $('form-resultado').style.display = 'none';
  $('form-agendar').style.display   = 'block';
  $('form-detalhes').style.display  = 'none';
  schedGoToStep(2);
  openModal();
}

async function excluirAgendamento(leadId) {
  const lead = allLeads.find(l => l.id === leadId);
  if (!lead) return;
  if (!confirm(`Remover agendamento de ${lead.nome}?\nEsta ação não pode ser desfeita.`)) return;
  try {
    await saveLead(leadId, {
      status: 'qualificado', kanban_column: 'qualificado',
      closer: null, dataagendamento: null, horaagendamento: null, agendadopor: null,
      atualizadoem: new Date().toISOString(),
    });
    toast(`Agendamento de ${lead.nome} removido.`, 'ok');
    renderAgendadosSub();
  } catch(e) {
    toast(e.message || 'Erro ao remover agendamento.', 'err');
  }
}

function schedGoToStep(n) {
  cal.step = n;
  $('sched-step-1').style.display = n===1 ? 'block' : 'none';
  $('sched-step-2').style.display = n===2 ? 'block' : 'none';
  $('btn-voltar').style.display   = n===2 ? 'inline-flex' : 'none';
  const btn = $('btn-confirmar');
  if (n===1) { btn.style.display = 'none'; }
  else { btn.textContent='Confirmar Agendamento'; btn.style.display=''; btn.style.background='var(--gold)'; btn.style.color='#0d1a1c'; btn.style.border='none'; btn.disabled=false; }
}

// ─── GOOGLE CALENDAR — OAUTH & API ───────────────────────────────────

async function connectCloserCalendar(closerKey) {
  const { id: clientId } = await getGcalCreds();
  const state    = 'gcal_' + closerKey;
  const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  oauthUrl.searchParams.set('client_id',    clientId);
  oauthUrl.searchParams.set('redirect_uri', GCAL_REDIRECT_URI);
  oauthUrl.searchParams.set('response_type','code');
  oauthUrl.searchParams.set('scope',        GCAL_SCOPE);
  oauthUrl.searchParams.set('access_type',  'offline');
  oauthUrl.searchParams.set('prompt',       'consent');
  oauthUrl.searchParams.set('state',        state);

  const popup = window.open(oauthUrl.toString(), 'gcal_oauth', 'width=520,height=640');
  if (!popup) { toast('Popup bloqueado — permita popups para este site.', 'err'); return; }

  const btn = $('cal-connect-' + closerKey);
  if (btn) { btn.disabled = true; btn.textContent = 'Aguardando…'; }

  new Promise((resolve, reject) => {
    const handler = async (event) => {
      if (event.data?.type !== 'gcal_oauth_code') return;
      if (event.data?.state !== state) return;
      window.removeEventListener('message', handler);
      clearInterval(poll);
      try { await exchangeCalendarCode(event.data.code, closerKey); resolve(); }
      catch (e) { reject(e); }
    };
    window.addEventListener('message', handler);
    const poll = setInterval(() => {
      if (popup.closed) {
        window.removeEventListener('message', handler);
        clearInterval(poll);
        reject(new Error('cancelled'));
      }
    }, 600);
  }).then(() => {
    toast(`Agenda de ${CLOSERS[closerKey]?.name || closerKey} conectada!`, 'ok');
    updateCalConnectButtons();
  }).catch(e => {
    if (e.message !== 'cancelled') toast('Erro ao conectar: ' + e.message, 'err');
    updateCalConnectButtons();
  });
}

async function exchangeCalendarCode(code, closerKey) {
  const { id: clientId, secret: clientSecret } = await getGcalCreds();
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  GCAL_REDIRECT_URI,
      grant_type:    'authorization_code',
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);
  const { error } = await supabase.from('calendar_tokens').upsert({
    closer_key:    closerKey,
    access_token:  data.access_token,
    refresh_token: data.refresh_token,
    token_expiry:  new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
    atualizadoem:  new Date().toISOString(),
  }, { onConflict: 'closer_key' });
  if (error) throw error;
}

async function getValidCalendarToken(closerKey) {
  const { data } = await supabase
    .from('calendar_tokens')
    .select('access_token,refresh_token,token_expiry')
    .eq('closer_key', closerKey)
    .maybeSingle();
  console.log('[GCAL token] closer_key:', closerKey);
  console.log('[GCAL token] row encontrado:', !!data);
  console.log('[GCAL token] refresh_token presente:', !!data?.refresh_token);
  console.log('[GCAL token] token_expiry:', data?.token_expiry || 'NULL');
  if (!data?.refresh_token) { console.warn('[GCAL token] SEM refresh_token — retornando null'); return null; }

  if (data.token_expiry && new Date(data.token_expiry) > new Date(Date.now() + 120_000)) {
    console.log('[GCAL token] access_token ainda válido — reutilizando');
    return data.access_token;
  }
  console.log('[GCAL token] token expirado ou sem expiry — tentando refresh…');
  const { id: clientId, secret: clientSecret } = await getGcalCreds();
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      client_id:     clientId,
      client_secret: clientSecret,
      refresh_token: data.refresh_token,
      grant_type:    'refresh_token',
    }),
  });
  const refreshed = await res.json();
  console.log('[GCAL token] refresh HTTP status:', res.status);
  console.log('[GCAL token] refresh resposta:', JSON.stringify(refreshed));
  if (refreshed.error || !refreshed.access_token) {
    console.warn('[GCAL token] refresh FALHOU — retornando null');
    return null;
  }
  const newExpiry = new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString();
  await supabase.from('calendar_tokens')
    .update({ access_token: refreshed.access_token, token_expiry: newExpiry, atualizadoem: new Date().toISOString() })
    .eq('closer_key', closerKey);
  console.log('[GCAL token] refresh OK — novo expiry:', newExpiry);
  return refreshed.access_token;
}

async function fetchCalendarEvents(closerKey) {
  const token = await getValidCalendarToken(closerKey);
  console.log('[GCAL] closer:', closerKey);
  console.log('[GCAL] token (primeiros 20 chars):', token ? token.slice(0, 20) + '…' : 'NULL — sem token');
  if (!token) return [];

  const timeMin = new Date();
  timeMin.setHours(0, 0, 0, 0);
  const timeMax = new Date(timeMin);
  timeMax.setDate(timeMax.getDate() + 60);
  const params = new URLSearchParams({
    timeMin:      timeMin.toISOString(),
    timeMax:      timeMax.toISOString(),
    orderBy:      'startTime',
    singleEvents: 'true',
    maxResults:   '20',
  });
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`;
  console.log('[GCAL] calendário: primary');
  console.log('[GCAL] timeMin:', timeMin.toISOString(), '/ timeMax:', timeMax.toISOString());
  console.log('[GCAL] URL:', url);

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  console.log('[GCAL] HTTP status:', res.status);
  console.log('[GCAL] resposta completa:', JSON.stringify(data, null, 2));

  const prefix = `Agenda ${CLOSERS[closerKey].name}`;
  const events = (data.items || [])
    .filter(ev => (ev.summary || '').startsWith(prefix))
    .map(ev => ({ startDt: ev.start?.dateTime || ev.start?.date, summary: ev.summary }))
    .filter(ev => ev.startDt);
  console.log('[GCAL] eventos com prefix "' + prefix + '":', events.length);
  return events;
}

async function updateCalConnectButtons() {
  for (const key of Object.keys(CLOSERS)) {
    const btn = $('cal-connect-' + key);
    if (!btn) continue;
    const { data } = await supabase.from('calendar_tokens').select('closer_key').eq('closer_key', key).maybeSingle();
    btn.disabled = false;
    if (data) {
      btn.innerHTML = `${ICO_CHECK_SM} ${CLOSERS[key].name}`;
      btn.style.color = 'var(--green, #4caf50)';
    } else {
      btn.innerHTML = `${ICO_CALENDAR} Conectar ${CLOSERS[key].name}`;
      btn.style.color = '';
    }
  }
}

function schedSelectCloser(closer) {
  cal.closer      = closer;
  cal.calOpenedAt = new Date().toISOString();
  window.open(CLOSERS[closer].calLink, '_blank', 'noopener,noreferrer');
  $('sched-closer-lbl').value = CLOSERS[closer].name;
  $('sched-datetime').value   = '';
  $('sched-obs').value        = '';
  schedGoToStep(2);

  const hint = $('sched-autofill-hint');
  if (hint) { hint.textContent = 'Aguardando retorno do Google Calendar…'; hint.style.display = ''; hint.style.color = ''; }

  const onFocus = async () => {
    window.removeEventListener('focus', onFocus);
    if (modalMode !== 'agendar' || !cal.closer) return;
    const dtField = $('sched-datetime');
    if (dtField?.value) { if (hint) hint.style.display = 'none'; return; }
    if (hint) { hint.textContent = 'Buscando na agenda do closer…'; hint.style.color = ''; }

    let events = [];
    console.log('[GCAL auto-fill] buscando eventos — closer:', cal.closer);
    try {
      events = await fetchCalendarEvents(cal.closer);
      console.log('[GCAL auto-fill] eventos encontrados:', events.length);
    } catch (e) { console.warn('[GCAL auto-fill] ERRO:', e); }

    if (!hint) return;
    if (!events.length) {
      hint.textContent = 'Nenhum agendamento encontrado — preencha manualmente.';
      return;
    }

    const WDAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    const fmtEv = iso => {
      const d = new Date(iso);
      return `${WDAYS[d.getDay()]} ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} às ${String(d.getHours()).padStart(2,'0')}h${String(d.getMinutes()).padStart(2,'0')}`;
    };
    const toDtLocal = iso => {
      const d = new Date(iso); const p = n => String(n).padStart(2,'0');
      return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
    };

    hint.style.color = '';
    hint.innerHTML = `<span style="color:var(--text-muted)">Selecione o horário na agenda:</span><div class="gcal-event-list">` +
      events.map(ev => `<button class="gcal-event-opt" data-dt="${esc(toDtLocal(ev.startDt))}">${esc(fmtEv(ev.startDt))}</button>`).join('') +
      `</div>`;

    hint.querySelectorAll('.gcal-event-opt').forEach(btn =>
      btn.addEventListener('click', () => {
        if (dtField) dtField.value = btn.dataset.dt;
        hint.textContent = `✓ ${fmtEv(btn.dataset.dt)} selecionado`;
        hint.style.color = 'var(--green, #4caf50)';
      })
    );
  };
  cal._focusCleanup = () => window.removeEventListener('focus', onFocus);
  window.addEventListener('focus', onFocus);
}

// ─── PERFIL DO LEAD ──────────────────────────────────────────────────
function instagramLink(raw) {
  if (!raw) return '—';
  const user = String(raw).replace(/^@/,'').trim();
  if (!user) return '—';
  return `<a href="https://instagram.com/${esc(user)}" target="_blank" rel="noopener" style="color:var(--gold)">@${esc(user)}</a>`;
}

function openPerfil(lead) {
  perfilLeadId = lead.id;
  switchPerfilTab('dados');
  // Unread badge
  const badge = $('perfil-unread-badge');
  if (badge) {
    const n = lead.unreadCount || 0;
    badge.textContent    = n;
    badge.style.display  = n > 0 ? '' : 'none';
  }
  const STATUS_LBL = { aguardando:'Aguardando', agendado:'Agendado', realizada:'Call Realizada', noshow:'No Show', cancelado:'Cancelado' };
  $('perfil-title').textContent    = lead.nome || '—';
  $('perfil-subtitle').textContent = STATUS_LBL[lead.status] || lead.status || '—';

  renderEtiquetas(lead);

  $('perfil-dados').innerHTML = [
    { l:'Nome',      field:'nome',      raw: lead.nome      || '', ig: false },
    { l:'Celular',   field:'celular',   raw: lead.celular   || lead.telefone || '', ig: false },
    { l:'E-mail',    field:'email',     raw: lead.email     || '', ig: false },
    { l:'Instagram', field:'instagram', raw: lead.instagram || '', ig: true  },
    { l:'Profissão', field:'profissao', raw: lead.profissao || '', ig: false },
    { l:'Renda',     field:'renda',     raw: lead.renda     || '', ig: false },
    { l:'Idade',     field:'idade',     raw: lead.idade     || '', ig: false },
  ].map(({l,field,raw,ig}) => `
    <div class="detalhes-item">
      <span class="detalhes-lbl">${esc(l)}</span>
      <span class="detalhes-val detalhes-editable" data-field="${field}" data-raw="${esc(raw)}" title="Clique para editar">
        ${ig ? instagramLink(raw || null) : esc(raw || '—')}
      </span>
    </div>`).join('');

  // Agendamento section
  const agendaWrap = $('perfil-agendamento-wrap');
  if (lead.dataagendamento) {
    $('perfil-agendamento').innerHTML = [
      { l:'Data', v: fmtDate(lead.dataagendamento) },
      { l:'Hora', v: lead.horaagendamento || '—' },
      { l:'Closer', v: CLOSERS[lead.closer]?.name || lead.closer || '—' },
      { l:'Agendado por', v: lead.agendadopor || '—' },
    ].map(({l,v}) => `<div class="detalhes-item"><span class="detalhes-lbl">${esc(l)}</span><span class="detalhes-val">${esc(v)}</span></div>`).join('');
    agendaWrap.style.display = 'block';
  } else {
    agendaWrap.style.display = 'none';
  }

  // Perfil section
  const perfilItems = [
    { l:'Desafio',v:lead.desafio||''}, { l:'Motivação',v:lead.motivacao||''},
    { l:'Já participou',v:lead.jaParticipou||''}, { l:'Já é aluna',v:lead.jaEAluna||''},
    { l:'Tempo que conhece',v:lead.tempoConhece||''}, { l:'De onde conhece',v:lead.deOnde||''},
  ].filter(c=>c.v);
  const perfilWrap = $('perfil-perfil-wrap');
  if (perfilItems.length) {
    $('perfil-perfil').innerHTML = perfilItems.map(({l,v})=>`<div class="detalhes-item"><span class="detalhes-lbl">${esc(l)}</span><span class="detalhes-val">${esc(v)}</span></div>`).join('');
    perfilWrap.style.display = 'block';
  } else { perfilWrap.style.display = 'none'; }

  // Origem section
  const origemItems = [
    { l:'Origem',v:lead.origem||''}, { l:'UTM Campaign',v:lead.utm_campaign||''},
    { l:'UTM Medium',v:lead.utm_medium||''}, { l:'UTM Source',v:lead.utm_source||''},
  ].filter(c=>c.v);
  const origemWrap = $('perfil-origem-wrap');
  if (origemItems.length) {
    $('perfil-origem').innerHTML = origemItems.map(({l,v})=>`<div class="detalhes-item"><span class="detalhes-lbl">${esc(l)}</span><span class="detalhes-val">${esc(v)}</span></div>`).join('');
    origemWrap.style.display = 'block';
  } else { origemWrap.style.display = 'none'; }

  $('perfil-obs').value = '';
  renderPerfilComentarios([]);

  // Show static history immediately, then enrich with lead_historico
  renderPerfilHistorico(lead, []);
  $('perfil-backdrop').classList.add('open');
  document.body.style.overflow = 'hidden';

  if (isLive) {
    supabase.from('lead_historico').select('*').eq('lead_id', lead.id).order('movido_em', { ascending: true })
      .then(({ data }) => {
        if (data && perfilLeadId === lead.id) renderPerfilHistorico(lead, data);
      });
    supabase.from('lead_comentarios').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false })
      .then(({ data }) => {
        if (perfilLeadId === lead.id) renderPerfilComentarios(data || []);
      });
  }
}

function renderPerfilHistorico(lead, kanbanRows) {
  const base = buildHistorico(lead);

  // Add kanban movement history from lead_historico table
  const KANBAN_COL_LBL = {
    agendado:'Agendado', call_realizada:'Call Realizada', negociacao:'Negociação', decisao:'Decisão',
    fechamento:'Negociação', followup:'Decisão', venda_ganha:'Venda Ganha', descartado:'Descartado', venda_perdida:'Descartado',
  };
  const kanbanItems = kanbanRows.map(r => ({
    ico: r.col === 'venda_ganha' ? ICO_TROPHY : r.col === 'descartado' ? ICO_TRASH : ICO_ARROW_RIGHT,
    label: `Kanban → ${r.col_label || KANBAN_COL_LBL[r.col] || r.col}`,
    sub: [
      r.movido_por || null,
      r.movido_em ? new Date(r.movido_em).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : null,
    ].filter(Boolean).join(' · '),
    ts: r.movido_em,
  }));

  // Merge and sort by approximate time (base items use lead date fields)
  const all = [...base, ...kanbanItems];

  $('perfil-historico').innerHTML = all.length
    ? all.map(h=>`<div class="hist-item"><span class="hist-ico">${h.ico}</span><div class="hist-body"><div class="hist-label">${esc(h.label)}</div>${h.sub?`<div class="hist-sub">${esc(h.sub)}</div>`:''}</div></div>`).join('')
    : '<p class="hist-empty">Nenhuma ação registrada.</p>';
}

function renderPerfilComentarios(data) {
  const el = $('perfil-comentarios');
  if (!el) return;
  if (!data?.length) { el.innerHTML = '<p class="hist-empty">Nenhuma observação registrada.</p>'; return; }
  el.innerHTML = data.map(c => `<div class="hist-item">
    <span class="hist-ico">${ICO_MSG_CIRCLE}</span>
    <div class="hist-body">
      <div class="hist-label">${esc(c.texto)}</div>
      <div class="hist-sub">${esc(c.autor_nome)} · ${fmtComentarioTime(c.created_at)}</div>
    </div>
  </div>`).join('');
}

function startInlineEdit(el) {
  const field = el.dataset.field;
  const raw   = el.dataset.raw || '';
  if (!field || !perfilLeadId) return;

  const displayHtml = el.innerHTML;
  let committed = false;

  // Input element
  const input = document.createElement('input');
  input.type      = 'text';
  input.value     = raw;
  input.className = 'detalhes-inline-input';

  // Renda: datalist com valores já existentes no banco
  if (field === 'renda') {
    const dlId = 'detalhes-renda-dl';
    let dl = document.getElementById(dlId);
    if (!dl) { dl = document.createElement('datalist'); dl.id = dlId; document.body.appendChild(dl); }
    dl.innerHTML = [...new Set(allLeads.map(l => l.renda).filter(Boolean))]
      .map(v => `<option value="${esc(v)}">`).join('');
    input.setAttribute('list', dlId);
  }

  el.innerHTML = '';
  el.appendChild(input);
  el.classList.add('detalhes-editing');
  input.focus();
  input.select();

  const cancel = () => {
    committed = true;
    el.innerHTML = displayHtml;
    el.classList.remove('detalhes-editing');
  };

  const save = async () => {
    if (committed) return;
    committed = true;
    input.removeEventListener('blur', save);
    el.classList.remove('detalhes-editing');

    const newVal = input.value.trim();
    if (newVal === raw) { el.innerHTML = displayHtml; return; }

    try {
      await saveLead(perfilLeadId, { [field]: newVal || null, atualizadoem: new Date().toISOString() });
      el.dataset.raw = newVal;
      el.innerHTML   = field === 'instagram' ? instagramLink(newVal || null) : esc(newVal || '—');
      el.classList.add('detalhes-saved');
      setTimeout(() => el.classList.remove('detalhes-saved'), 1000);
      if (field === 'nome' && newVal) $('perfil-title').textContent = newVal;
    } catch(e) {
      console.error(e);
      toast('Erro ao salvar.', 'err');
      el.innerHTML = displayHtml;
    }
  };

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); save(); }
    if (e.key === 'Escape') { cancel(); }
  });
  input.addEventListener('blur', save);
}

function closePerfil() {
  stopChatListener();
  switchPerfilTab('dados');
  $('perfil-backdrop').classList.remove('open');
  document.body.style.overflow = '';
  perfilLeadId = null;
}

function salvarObsPerfil() {
  closePerfil();
}

function buildHistorico(lead) {
  const items = [];
  if (lead.datachegada) items.push({ ico:ICO_USER_PLUS, label:'Lead cadastrado', sub:fmtDate(lead.datachegada) });
  if (lead.dataagendamento) {
    const closerName = lead.closer ? (CLOSERS[lead.closer]?.name||lead.closer) : null;
    const sub = [
      `${fmtDate(lead.dataagendamento)}${lead.horaagendamento?' às '+lead.horaagendamento:''}`,
      closerName ? 'Closer: '+closerName : null,
      lead.agendadopor ? 'Por: '+lead.agendadopor : null,
    ].filter(Boolean).join(' · ');
    items.push({ ico:ICO_CALENDAR, label:'Call agendada', sub });
  }
  if (lead.status === 'noshow')    items.push({ ico:ICO_X_CIRCLE, label:'No Show registrado', sub:'' });
  if (lead.status === 'cancelado') items.push({ ico:ICO_BAN,      label:'Cancelado', sub:'' });
  if (lead.status === 'realizada' || lead.realizadaem) {
    const CLOSER_LBL = { call_realizada:'Call Realizada', followup:'Follow Up', fechamento:'Fechamento', venda_ganha:'Venda Ganha', venda_perdida:'Venda Perdida' };
    const dataCall = lead.realizadaem
      ? new Date(lead.realizadaem).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})
      : fmtDate(lead.dataagendamento);
    const sub = [
      dataCall,
      lead.venda_ganha_dados?.programa ? lead.venda_ganha_dados.programa : null,
      lead.venda_ganha_dados?.valor    ? lead.venda_ganha_dados.valor    : null,
      lead.status_closer ? CLOSER_LBL[lead.status_closer]||lead.status_closer : null,
    ].filter(Boolean).join(' · ');
    items.push({ ico:ICO_CHECK_CIRCLE, label:'Call realizada', sub });
    if (lead.obs_call) items.push({ ico:ICO_MSG_CIRCLE, label:'Obs. da call', sub:lead.obs_call });
  }
  return items;
}

// ─── ETIQUETAS ───────────────────────────────────────────────────────
function chipInlineStyle(hex) {
  if (!hex) return '';
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `background:linear-gradient(135deg,rgba(${r},${g},${b},.22) 0%,rgba(${r},${g},${b},.10) 100%);border-color:rgba(${r},${g},${b},.44);color:${hex}`;
}

function renderEtiquetas(lead) {
  const tags   = lead.etiquetas || [];
  const colors = getEtiquetaColors();

  $('etiquetas-chips').innerHTML = tags.map(t => {
    const hex  = colors[t];
    const s    = chipInlineStyle(hex);
    return `<span class="etiqueta-chip etiqueta-chip--editable"${s?` style="${s}"`:''}>
      <input type="color" class="etiqueta-color-pick" data-tag="${esc(t)}" value="${hex||'#CE9221'}" title="Cor">
      <button class="etiqueta-swatch" data-tag="${esc(t)}"${hex?` style="background:${hex}"`:''} title="Mudar cor">⬤</button>
      ${esc(t)}
      <button class="etiqueta-remove" data-tag="${esc(t)}" title="Remover">×</button>
    </span>`;
  }).join('');

  $('etiquetas-defaults').innerHTML = ETIQUETAS_DEFAULT.map(t => {
    const active = tags.includes(t);
    const hex    = colors[t];
    const s      = active ? chipInlineStyle(hex) : '';
    return `<button class="etiqueta-default${active?' active':''}" data-tag="${esc(t)}"${s?` style="${s}"`:''}>
      ${hex ? `<span class="etiqueta-swatch-sm" style="background:${hex}"></span>` : ''}${esc(t)}
    </button>`;
  }).join('');

  $('etiquetas-chips').querySelectorAll('.etiqueta-remove').forEach(btn =>
    btn.addEventListener('click', () => toggleEtiqueta(lead.id, btn.dataset.tag, 'remove'))
  );
  $('etiquetas-chips').querySelectorAll('.etiqueta-swatch').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      btn.parentElement.querySelector('.etiqueta-color-pick')?.click();
    });
  });
  $('etiquetas-chips').querySelectorAll('.etiqueta-color-pick').forEach(inp => {
    inp.addEventListener('input', () => {
      saveEtiquetaColor(inp.dataset.tag, inp.value);
      const idx = allLeads.findIndex(l => l.id === lead.id);
      if (idx !== -1) renderEtiquetas(allLeads[idx]);
      renderAll();
    });
  });
  $('etiquetas-defaults').querySelectorAll('.etiqueta-default').forEach(btn =>
    btn.addEventListener('click', () => toggleEtiqueta(lead.id, btn.dataset.tag, 'toggle'))
  );
}

async function toggleEtiqueta(leadId, tag, mode) {
  const idx = allLeads.findIndex(l => l.id === leadId);
  if (idx === -1) return;
  const tags = [...(allLeads[idx].etiquetas || [])];
  if (mode === 'remove') {
    const i = tags.indexOf(tag); if (i !== -1) tags.splice(i, 1);
  } else {
    const i = tags.indexOf(tag);
    if (i !== -1) tags.splice(i, 1); else tags.push(tag);
  }
  allLeads[idx].etiquetas = tags;
  renderEtiquetas(allLeads[idx]);
  try { await saveLead(leadId, { etiquetas: tags, atualizadoem: new Date().toISOString() }); }
  catch(e) { toast('Erro ao salvar etiqueta.', 'err'); }
}

async function addEtiquetaCustom() {
  const input = $('etiqueta-custom-input');
  const tag   = input.value.trim();
  if (!tag) return;
  input.value = '';
  await toggleEtiqueta(perfilLeadId, tag, 'toggle');
}

// ─── RESULTADO MODAL ─────────────────────────────────────────────────
function openResultado(lead) {
  modalMode = 'resultado';
  $('modal-title').textContent    = 'Resultado da Call';
  $('modal-subtitle').textContent = `${lead.nome} · ${lead.celular}`;
  $('lead-strip').innerHTML = strip([
    { l:'Agendado',  v: lead.dataagendamento ? `${fmtDate(lead.dataagendamento)} ${lead.horaagendamento||''}`.trim() : '—' },
    { l:'Closer',    v: CLOSERS[lead.closer]?.name || lead.closer || '—' },
    { l:'Origem',    v: lead.origem    || '—' },
    { l:'Renda',     v: lead.renda     || '—' },
  ]);
  $('form-agendar').style.display   = 'none';
  $('form-resultado').style.display = 'block';
  $('form-detalhes').style.display  = 'none';
  document.querySelectorAll('#form-resultado .toggle-opt').forEach(b => b.classList.remove('selected'));
  $('res-obs').value = '';
  const btn = $('btn-confirmar');
  $('btn-voltar').style.display = 'none';
  btn.textContent='Salvar Resultado'; btn.style.display=''; btn.style.background='var(--green-bright)'; btn.style.color='#0d1a1c'; btn.style.border='none'; btn.disabled=false;
  openModal();
}

function openDetalhes(lead) {
  modalMode = 'detalhes';
  $('modal-title').textContent    = 'Detalhes da Call';
  $('modal-subtitle').textContent = `${lead.nome} · ${lead.celular}`;
  $('lead-strip').innerHTML = '';
  $('form-agendar').style.display   = 'none';
  $('form-resultado').style.display = 'block';

  document.querySelectorAll('#form-resultado .toggle-opt').forEach(b => b.classList.remove('selected'));

  if (lead.status_closer) setToggleVal('toggle-closer-status', lead.status_closer);
  $('res-obs').value = lead.obs_call || '';

  $('det-nome').textContent      = lead.nome      || '—';
  $('det-celular').textContent   = lead.celular   || '—';
  $('det-email').textContent     = lead.email     || '—';
  $('det-origem').textContent    = lead.origem    || '—';
  $('det-profissao').textContent = lead.profissao || '—';
  $('det-renda').textContent     = lead.renda     || '—';
  $('det-closer').textContent    = lead.closer ? (CLOSERS[lead.closer]?.name||lead.closer) : '—';
  let dataCall = '—';
  if (lead.realizadaem) dataCall = new Date(lead.realizadaem).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  else if (lead.dataagendamento) dataCall = `${fmtDate(lead.dataagendamento)} ${lead.horaagendamento||''}`.trim();
  $('det-data-call').textContent = dataCall;
  $('form-detalhes').style.display = 'block';

  $('btn-voltar').style.display = 'none';
  const btn = $('btn-confirmar');
  btn.textContent='Salvar Resultado'; btn.style.display=''; btn.style.background='var(--green-bright)'; btn.style.color='#0d1a1c'; btn.style.border='none'; btn.disabled=false;
  openModal();
}

function verDetalhes(lead) {
  if (lead.status==='realizada') { openDetalhes(lead); return; }
  const lbl = { noshow:'No Show', cancelado:'Cancelado' };
  toast(`${lead.nome} — ${lbl[lead.status]||lead.status}`, 'ok');
}

function setToggleVal(groupId, val) {
  document.querySelectorAll(`#${groupId} .toggle-opt`).forEach(b => b.classList.remove('selected'));
  const btn = document.querySelector(`#${groupId} .toggle-opt[data-val="${val}"]`);
  if (btn) btn.classList.add('selected');
}
function getToggleVal(groupId) {
  const sel = document.querySelector(`#${groupId} .toggle-opt.selected`);
  return sel ? sel.dataset.val : null;
}
function strip(items) {
  return items.map(({l,v}) => `<div class="strip-item"><span class="strip-lbl">${esc(l)}</span><span class="strip-val">${esc(v)}</span></div>`).join('');
}

// ─── MODAL ───────────────────────────────────────────────────────────
function openModal() {
  $('modal-backdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
  $('btn-confirmar').disabled = false;
}
function closeModal() {
  cal._focusCleanup?.();
  $('modal-backdrop').classList.remove('open');
  document.body.style.overflow = '';
  currentId = null; modalMode = 'agendar';
  cal = { step:1, closer:null, leadSnap:null };
  const hint = $('sched-autofill-hint');
  if (hint) { hint.style.display = 'none'; hint.textContent = ''; }
  $('btn-voltar').style.display     = 'none';
  $('form-resultado').style.display = 'none';
  $('form-detalhes').style.display  = 'none';
  $('form-agendar').style.display   = 'block';
  $('lead-strip').style.display     = '';
  const btn = $('btn-confirmar');
  btn.style.display=''; btn.style.background=''; btn.style.color=''; btn.style.border=''; btn.textContent='Confirmar';
  if (activeSucessoSub === 'sessoes') renderSucesso();
  renderActiveSub();
}

// ─── DROPDOWNS ───────────────────────────────────────────────────────
function closeAllDropdowns() {
  document.querySelectorAll('.acoes-dropdown.open').forEach(d => d.classList.remove('open'));
}
function toggleAcoesDropdown(id) {
  const wrap     = document.querySelector(`.acoes-wrap[data-leadid="${id}"]`);
  if (!wrap) return;
  const dropdown = wrap.querySelector('.acoes-dropdown');
  const isOpen   = dropdown.classList.contains('open');
  closeAllDropdowns();
  if (!isOpen) dropdown.classList.add('open');
}

// ─── PÓS-CALL ────────────────────────────────────────────────────────
async function handlePostCall(action) {
  const lead = allLeads.find(l => l.id === currentId);
  if (!lead) return;
  if (action === 'remarcar') { openAgendar(lead); return; }
  if (action === 'realizada') {
    const updates = {
      status:        'realizada',
      status_closer: 'call_realizada',
      kanban_column: 'call_realizada',
      realizadaem:   new Date().toISOString(),
      atualizadoem:  new Date().toISOString(),
    };
    try {
      await saveLead(currentId, updates);
      toast(`Call Realizada — ${lead.nome}`, 'ok');
      renderAll();
    } catch(e) { console.error('[FDV] handlePostCall realizada:', e); toast('Erro ao salvar.', 'err'); }
    return;
  }
  const msgs = { noshow:`No Show — ${lead.nome}`, cancelado:`Cancelado — ${lead.nome}` };
  const updates = { status: action, atualizadoem: new Date().toISOString() };
  // No Show → remove do Closer Kanban (kanban_column=null) e vai para aba No Show em Agendamentos
  if (action === 'noshow') updates.kanban_column = null;
  try { await saveLead(currentId, updates); toast(msgs[action]||'Status atualizado.', 'ok'); closeModal(); }
  catch(e) { console.error(e); toast('Erro ao salvar.', 'err'); }
}

// ─── CONFIRM ─────────────────────────────────────────────────────────
async function confirmar() {
  if (!currentId && modalMode !== 'agendar-sessao') return;
  const btn = $('btn-confirmar');
  btn.disabled = true;
  try {
    if (modalMode === 'agendar-sessao') {
      const dtVal = $('sched-datetime').value;
      if (!dtVal) { toast('Preencha a data e hora.', 'err'); btn.disabled=false; return; }
      const [datePart, timePart] = dtVal.split('T');
      const hora = timePart.length === 5 ? timePart + ':00' : timePart;
      const obs  = $('sched-obs').value.trim();

      if (cal.sessaoId) {
        // Update existing session
        const patch = { data: datePart, hora, status: 'Marcada', ...(obs ? { observacoes: obs } : {}) };
        if (isLive) {
          const { error } = await supabase.from('sessoes').update(patch).eq('id', cal.sessaoId);
          if (error) throw error;
        }
        const idx = allSessoes.findIndex(s => s.id === cal.sessaoId);
        if (idx !== -1) allSessoes[idx] = { ...allSessoes[idx], ...patch };
        toast(`Sessão agendada — ${timePart} · ${fmtDate(datePart)}`, 'ok');
      } else {
        // Create new session
        const alunaId = $('sched-aluna-sel')?.value || cal.alunaId;
        if (!alunaId) { toast('Selecione a aluna.', 'err'); btn.disabled=false; return; }
        const newSess = { aluna_id: alunaId, data: datePart, hora, status: 'Marcada', observacoes: obs || null, criadoem: new Date().toISOString() };
        if (isLive) {
          const { data: inserted, error } = await supabase.from('sessoes').insert(newSess).select().single();
          if (error) throw error;
          allSessoes.push(inserted);
        } else {
          allSessoes.push({ id: 'local-' + Date.now(), ...newSess });
        }
        toast(`Sessão criada — ${timePart} · ${fmtDate(datePart)}`, 'ok');
      }

    } else if (modalMode === 'agendar') {
      const dtVal = $('sched-datetime').value;
      if (!dtVal) { toast('Preencha a data e hora.', 'err'); btn.disabled=false; return; }
      const [datePart, timePart] = dtVal.split('T');
      const obs = $('sched-obs').value.trim();
      const agendadopor = currentUser?.displayName || currentUser?.email || 'Desconhecido';
      await saveLead(currentId, {
        status:'agendado', closer:cal.closer,
        dataagendamento:datePart, horaagendamento:timePart,
        observacoes:obs, agendadopor,
        kanban_column:'agendado',
        atualizadoem:new Date().toISOString()
      });
      toast(`Call agendada — ${timePart} · ${fmtDate(datePart)}`, 'ok');
      const closerUid = getCloserUid(cal.closer);
      if (closerUid && closerUid !== currentUser?.uid) {
        const leadName = allLeads.find(l => l.id === currentId)?.nome || '—';
        createNotification(closerUid, {
          type: 'agendamento', leadId: currentId,
          message: `📅 Nova call: ${leadName} — ${timePart} · ${fmtDate(datePart)}`,
        });
      }

    } else if (modalMode === 'resultado' || modalMode === 'detalhes') {
      const closerSt = getToggleVal('toggle-closer-status');
      if (!closerSt) { toast('Selecione o status da negociação.', 'err'); btn.disabled=false; return; }

      const kanbanColMap = { call_realizada:'call_realizada', followup:'followup', fechamento:'fechamento', venda_ganha:'venda_ganha', venda_perdida:'venda_perdida' };
      const payload = {
        status:        'realizada',
        status_closer: closerSt,
        kanban_column: kanbanColMap[closerSt] || 'call_realizada',
        obs_call:      $('res-obs').value.trim(),
        atualizadoem:  new Date().toISOString()
      };
      if (modalMode === 'resultado') payload.realizadaem = new Date().toISOString();

      const lead = allLeads.find(l => l.id === currentId);
      await saveLead(currentId, payload);
      toast(`Resultado salvo — ${lead?.nome||''}`, 'ok');
    }
    closeModal();
  } catch(e) {
    console.error(e);
    toast(e.message||'Erro ao confirmar.', 'err');
    btn.disabled = false;
  }
}

async function saveLead(id, data) {
  if (isLive) {
    const { historico_kanban, ...leadData } = data;
    if (historico_kanban) {
      const last = historico_kanban[historico_kanban.length - 1];
      if (last) {
        await supabase.from('lead_historico').insert({
          lead_id: id, col: last.col, col_label: last.colLabel,
          movido_por: last.movidoPor, movido_em: last.movidoEm,
        });
      }
      const idx = allLeads.findIndex(l => l.id === id);
      if (idx !== -1) allLeads[idx].historico_kanban = historico_kanban;
    }
    const { error } = await supabase.from('leads').update(leadData).eq('id', id);
    if (error) throw error;
    const idx = allLeads.findIndex(l => l.id === id);
    if (idx !== -1) allLeads[idx] = { ...allLeads[idx], ...leadData };
  } else {
    const i = allLeads.findIndex(l => l.id === id);
    if (i !== -1) allLeads[i] = { ...allLeads[i], ...data };
    renderAll();
  }
}

// ─── NOVO / EDITAR LEAD ──────────────────────────────────────────────
function openNovoLead(lead = null) {
  novoLeadId = lead ? lead.id : null;
  $('novo-lead-title').textContent = lead ? 'Editar Lead' : 'Novo Lead';
  $('btn-salvar-lead').textContent = lead ? 'Salvar alterações' : 'Cadastrar Lead';
  $('nl-nome').value      = lead?.nome                      || '';
  $('nl-celular').value   = lead?.celular || lead?.telefone || '';
  $('nl-email').value     = lead?.email                     || '';
  $('nl-instagram').value = lead?.instagram                 || '';
  $('nl-profissao').value = lead?.profissao                 || '';
  $('nl-renda').value     = lead?.renda                     || '';
  $('nl-origem').value    = lead?.origem                    || '';
  $('nl-obs').value       = lead?.observacoes               || '';
  // Atualiza o datalist de origem com valores já existentes no banco
  const dl = document.getElementById('nl-origem-list');
  if (dl) {
    const defaults = ['Instagram','Facebook','Indicação','Google','WhatsApp','Outros'];
    const extra = allLeads.map(l => l.origem).filter(Boolean);
    const all = [...new Set([...defaults, ...extra])];
    dl.innerHTML = all.map(v => `<option value="${esc(v)}">`).join('');
  }
  $('novo-lead-backdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('nl-nome').focus(), 50);
}
function closeNovoLead() {
  $('novo-lead-backdrop').classList.remove('open');
  document.body.style.overflow = '';
  novoLeadId = null;
}
async function confirmarNovoLead() {
  const nome    = $('nl-nome').value.trim();
  const celular = $('nl-celular').value.trim();
  if (!nome)    { toast('Preencha o nome.', 'err'); return; }
  if (!celular) { toast('Preencha o celular.', 'err'); return; }
  const btn = $('btn-salvar-lead');
  btn.disabled = true;
  const data = {
    nome, celular,
    email:       $('nl-email').value.trim(),
    instagram:   $('nl-instagram').value.trim(),
    profissao:   $('nl-profissao').value.trim(),
    renda:       $('nl-renda').value.trim(),
    origem:      $('nl-origem').value,
    observacoes: $('nl-obs').value.trim(),
    atualizadoem: new Date().toISOString(),
  };
  try {
    if (novoLeadId) {
      await saveLead(novoLeadId, data);
      toast(`Lead atualizado — ${nome}`, 'ok');
    } else {
      // Verificar duplicatas antes de criar
      const suspects = findDupCandidates({ ...data, id: '__new__' });
      if (suspects.length > 0) {
        btn.disabled = false;
        const result = await showDupWarning(suspects[0]);
        if (result === 'view') { closeNovoLead(); openPerfil(suspects[0]); return; }
        if (result !== 'save') return;
        btn.disabled = true;
      }
      data.status      = 'aguardando';
      data.datachegada = new Date().toISOString().slice(0,10);
      data.criadoem    = new Date().toISOString();
      data.etiquetas   = [];
      if (isLive) {
        const { data: newLead, error } = await supabase.from('leads').insert(data).select().single();
        if (error) throw error;
        allLeads.unshift(mapLead(newLead));
        renderAll();
      } else { allLeads.unshift({ id:'local-'+Date.now(), ...data }); renderAll(); }
      toast(`Lead cadastrado — ${nome}`, 'ok');
    }
    closeNovoLead();
  } catch(e) { console.error(e); toast(e.message||'Erro ao salvar.', 'err'); btn.disabled=false; }
}

// ─── NOTIFICATIONS ───────────────────────────────────────────────────
function loadNotifications(uid) {
  if (!isLive || !currentUserDbId) return;
  if (notifUnsub) notifUnsub();
  const fetch = () => supabase.from('notifications').select('*')
    .eq('usuario_id', currentUserDbId).order('created_at', { ascending: false })
    .then(({ data }) => { allNotifs = (data || []).map(n => ({ ...n, createdAt: n.created_at })); renderNotifPanel(); });
  fetch();
  const ch = supabase.channel(`notifs_${currentUserDbId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `usuario_id=eq.${currentUserDbId}` }, fetch)
    .subscribe();
  notifUnsub = () => { supabase.removeChannel(ch); notifUnsub = null; };
}

function renderNotifPanel() {
  const badge = $('notif-badge');
  const list  = $('notif-list');
  if (!badge || !list) return;
  const unread = allNotifs.filter(n => !n.read).length;
  badge.textContent  = unread > 9 ? '9+' : String(unread);
  badge.style.display = unread > 0 ? '' : 'none';
  if (!allNotifs.length) {
    list.innerHTML = '<div class="notif-empty">Nenhuma notificação</div>';
    return;
  }
  list.innerHTML = allNotifs.map(n => `
    <div class="notif-item${n.read ? '' : ' unread'}" data-id="${n.id}">
      <div class="notif-dot"></div>
      <div class="notif-content">
        <p class="notif-msg">${esc(n.message)}</p>
        <span class="notif-time">${fmtNotifTime(n.createdAt)}</span>
      </div>
    </div>`).join('');
}

function fmtNotifTime(iso) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (diff < 1)    return 'agora';
  if (diff < 60)   return `${diff}min`;
  if (diff < 1440) return `${Math.floor(diff/60)}h`;
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function fmtComentarioTime(iso) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (diff < 1)    return 'agora';
  if (diff < 60)   return `há ${diff}min`;
  if (diff < 1440) return `há ${Math.floor(diff/60)}h`;
  return new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

async function createNotification(userId, data) {
  if (!isLive || !userId) return;
  try {
    await supabase.from('notifications').insert({
      usuario_id: userId, message: data.message, read: false, created_at: new Date().toISOString(),
    });
  } catch(e) { console.error('[FDV] notif write error:', e); }
}

function getCloserUid(closerKey) {
  if (!closerKey) return null;
  const name = (CLOSERS[closerKey]?.name || '').toLowerCase();
  if (!name) return null;
  const u = allUsuarios.find(u => (u.nome || '').toLowerCase().includes(name));
  return u?.id || null;
}

// ─── VENDA GANHA MODAL ───────────────────────────────────────────────
let vgLeadId = null;

function openVendaGanha(leadId) {
  vgLeadId = leadId;
  const lead = allLeads.find(l => l.id === leadId);
  $('vg-lead-nome').textContent = lead?.nome || '—';
  $('vg-valor').value    = '';
  $('vg-entrada').value  = '';
  $('vg-forma').value    = '';
  $('vg-programa').value = '';
  $('vg-obs').value      = '';
  $('vg-confirmar').disabled = true;
  $('venda-ganha-backdrop').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  lucide.createIcons();
  setTimeout(() => $('vg-programa').focus(), 50);
}

function vgCheckReady() {
  const ok = !!$('vg-programa').value.trim()
          && !!$('vg-valor').value.trim()
          && !!$('vg-forma').value;
  $('vg-confirmar').disabled = !ok;
}

function closeVendaGanha() {
  vgLeadId = null;
  $('venda-ganha-backdrop').style.display = 'none';
  document.body.style.overflow = '';
}

async function confirmarVendaGanha() {
  const btn = $('vg-confirmar');
  btn.disabled = true;
  try {
    const lead  = allLeads.find(l => l.id === vgLeadId);
    const valor    = $('vg-valor').value.trim();
    const entrada  = $('vg-entrada').value.trim();
    const forma    = $('vg-forma').value;
    const programa = $('vg-programa').value;
    const obs      = $('vg-obs').value.trim();
    const hist     = buildHistoryEntry(vgLeadId, 'venda_ganha', 'Venda Ganha');
    const closer   = lead?.closer || null;

    await saveLead(vgLeadId, {
      kanban_column:       'venda_ganha',
      kanban_column_since: new Date().toISOString(),
      venda_ganha_dados:   { valor, entrada, forma, programa, obs },
      ...(hist && { historico_kanban: hist }),
      atualizadoem: new Date().toISOString(),
    });

    // Insert into vendas table + create aluna record
    if (isLive) {
      const { error: vendaErr } = await supabase.from('vendas').insert({
        lead_id: vgLeadId, closer, programa, valor,
        valor_entrada: entrada, forma_pagamento: forma, observacoes: obs,
        criadoem: new Date().toISOString(),
      });
      if (vendaErr) console.error('[FDV] vendas insert falhou:', vendaErr.message, vendaErr);

      // Create aluna from lead data
      const hoje = new Date().toISOString().slice(0, 10);
      const { data: novaAluna } = await supabase.from('alunas').insert({
        nome:          lead?.nome,
        email:         lead?.email,
        celular:       lead?.celular || lead?.telefone,
        produto:       programa,
        status:        'Nova compra',
        data_inscricao: hoje,
        lead_id:       vgLeadId,
        criadoem:      new Date().toISOString(),
        atualizadoem:  new Date().toISOString(),
      }).select().single();

      if (novaAluna) {
        await supabase.from('leads').update({ aluna_id: novaAluna.id }).eq('id', vgLeadId);
        const lIdx = allLeads.findIndex(l => l.id === vgLeadId);
        if (lIdx >= 0) allLeads[lIdx].aluna_id = novaAluna.id;
        allAlunas.unshift(novaAluna);
      }
    }

    toast('Venda registrada! 🏆', 'ok');
    notifyVendaGanha(vgLeadId);
    closeVendaGanha();
    switchCloserView('vendas');
  } catch(e) {
    console.error(e);
    toast('Erro ao registrar venda.', 'err');
    btn.disabled = false;
  }
}

async function notifyVendaGanha(leadId) {
  const lead = allLeads.find(l => l.id === leadId);
  if (!lead) return;
  // Notify Tati specifically, fall back to all admins if not found
  const tati = allUsuarios.find(u => (u.nome||'').toLowerCase().includes('tati') || (u.badge||'').toLowerCase() === 'tati');
  const targets = tati ? [tati] : allUsuarios.filter(u => u.role === 'admin' && u.id);
  for (const user of targets) {
    await createNotification(user.id, {
      message: `🏆 Venda ganha! ${lead.nome || '—'} fechou negócio.`,
    });
  }
}

// ─── TOAST ───────────────────────────────────────────────────────────
function toast(msg, type = 'ok') {
  const dock = $('toast-dock');
  const el   = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-ico">${type==='ok'?'✓':'✕'}</span><span>${esc(msg)}</span>`;
  dock.appendChild(el);
  setTimeout(() => { el.style.animation='toastOut .25s ease forwards'; setTimeout(()=>el.remove(),250); }, 3500);
}

// ─── CHAT / MENSAGENS ────────────────────────────────────────────────

function switchPerfilTab(tab) {
  ['dados','whatsapp'].forEach(t => {
    const el = $(`perfil-tab-${t}`);
    if (el) el.style.display = t === tab ? '' : 'none';
  });
  document.querySelectorAll('.perfil-tab').forEach(b =>
    b.classList.toggle('active', b.dataset.perfilTab === tab)
  );
  const saveBtn = $('btn-salvar-obs');
  if (saveBtn) saveBtn.style.display = tab === 'dados' ? '' : 'none';
  if (tab === 'whatsapp') { if (perfilLeadId) openChatForLead(perfilLeadId); }
  else stopChatListener();
}

function openChatForLead(leadId) {
  const lead = allLeads.find(l => l.id === leadId);
  if (!lead) return;
  chatLeadId = leadId;
  const metaEl = $('perfil-chat-meta');
  if (metaEl) metaEl.textContent = lead.celular || '—';
  populateChatInstanceSelector('perfil-chat-instance');
  startChatListener(leadId, 'perfil-chat-messages', 'perfil-chat-empty');
  if (isLive && (lead.unreadCount || 0) > 0) {
    supabase.from('leads').update({ unread_count: 0 }).eq('id', leadId).then(null, console.error);
    lead.unreadCount = 0; lead.unread_count = 0;
  }
  const badge = $('perfil-unread-badge');
  if (badge) badge.style.display = 'none';
}

function populateChatInstanceSelector(selectId) {
  const sel = $(selectId); if (!sel) return;
  sel.innerHTML = `<option value="">Selecionar instância…</option>` +
    getPermittedInstances().map(i =>
      `<option value="${esc(i.instanceName)}"${i.status!=='connected'?' disabled':''}>${esc(i.displayName)}${i.status==='connected'?' ✓':' (offline)'}</option>`
    ).join('');
  const first = getPermittedInstances().find(i => i.status === 'connected');
  if (first) sel.value = first.instanceName;
}

function startChatListener(id, messagesId, emptyId, isContact = false) {
  stopChatListener();
  chatLeadId    = isContact ? null : id;
  chatContactId = isContact ? id   : null;
  if (!isLive) {
    chatMessages = [];
    renderChatMessages(chatMessages, messagesId, emptyId); return;
  }
  const filterCol = isContact ? 'contact_id' : 'lead_id';
  const mapMsg = m => ({ ...m, senderName: m.sender_name, instanceName: m.instance_name });
  supabase.from('lead_messages').select('*').eq(filterCol, id).order('timestamp', { ascending: true })
    .then(({ data }) => {
      chatMessages = (data || []).map(mapMsg);
      renderChatMessages(chatMessages, messagesId, emptyId);
    });
  const ch = supabase.channel(`msgs_${filterCol}_${id}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lead_messages', filter: `${filterCol}=eq.${id}` },
      ({ new: msg }) => {
        chatMessages.push(mapMsg(msg));
        renderChatMessages(chatMessages, messagesId, emptyId);
        if (msg.direction === 'received') {
          playChatSound();
          const contactName = isContact
            ? (allContacts.find(x => x.id === id)?.push_name || 'WhatsApp')
            : (allLeads.find(x => x.id === id)?.nome || 'WhatsApp');
          showPushNotification(contactName, msg.text || '[mídia]');
        }
        // Para mensagens recebidas enquanto o chat está aberto: zera badge
        // localmente E salva no Supabase para neutralizar o incremento do webhook
        if (msg.direction === 'received' && activeTab === 'whatsapp' && activeWaSub === 'chats') {
          if (!isContact) {
            const ol = allLeads.find(x => x.id === id);
            if (ol) { ol.unread_count = 0; ol.unreadCount = 0; }
            if (isLive) supabase.from('leads').update({ unread_count: 0 }).eq('id', id).then(null, console.error);
          } else {
            const oc = allContacts.find(x => x.id === id);
            if (oc) oc.unread_count = 0;
            if (isLive) supabase.from('whatsapp_contacts').update({ unread_count: 0 }).eq('id', id).then(null, console.error);
          }
          renderChatsList();
        }
      })
    .subscribe();
  if (chatTypingUnsub) { chatTypingUnsub(); chatTypingUnsub = null; }
  const typingCh = supabase.channel(`typing:${id}`)
    .on('broadcast', { event: 'presence' }, ({ payload }) => handlePresenceBroadcast(payload?.status || ''))
    .subscribe();
  chatTypingUnsub = () => supabase.removeChannel(typingCh);
  chatUnsubscribe = () => { supabase.removeChannel(ch); };
}

function stopChatListener() {
  if (chatUnsubscribe) { chatUnsubscribe(); chatUnsubscribe = null; }
  if (chatTypingUnsub) { chatTypingUnsub(); chatTypingUnsub = null; }
  clearTimeout(chatTypingTimer); chatTypingTimer = null;
  chatMessages = []; chatLeadId = null; chatContactId = null;
}

function handlePresenceBroadcast(status) {
  const indicator = $('chat-typing');
  const statusEl  = $('cp-status');
  if (status === 'composing') {
    if (indicator) indicator.style.display = '';
    if (statusEl)  { statusEl.textContent = 'digitando…'; statusEl.className = 'cp-status cp-status--composing'; }
    clearTimeout(chatTypingTimer);
    chatTypingTimer = setTimeout(() => {
      if (indicator) indicator.style.display = 'none';
      if (statusEl)  { statusEl.textContent = ''; statusEl.className = 'cp-status'; }
    }, 5000);
  } else {
    if (indicator) { indicator.style.display = 'none'; clearTimeout(chatTypingTimer); }
    if (statusEl) {
      statusEl.className = `cp-status${status === 'available' ? ' cp-status--online' : ''}`;
      statusEl.textContent = status === 'available' ? '● online' : '';
    }
  }
}

function playChatSound() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880; osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
    osc.onended = () => ctx.close();
  } catch(_) {}
}

function showPushNotification(title, body) {
  if (document.hasFocus()) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, { body: body.slice(0, 100), icon: '/favicon.ico', tag: 'fdv-chat' });
    setTimeout(() => n.close(), 5000);
  } catch(_) {}
}

function renderChatMessages(messages, containerId, emptyId) {
  const container = $(containerId); if (!container) return;
  const emptyEl   = $(emptyId);
  container.querySelectorAll('.chat-msg, .chat-date-sep').forEach(el => el.remove());
  const filtered = chatMsgSearch
    ? messages.filter(m => (m.text || '').toLowerCase().includes(chatMsgSearch.toLowerCase()))
    : messages;
  if (filtered.length === 0) {
    if (emptyEl) emptyEl.style.display = '';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';
  const frag    = document.createDocumentFragment();
  let lastDate  = '';
  filtered.forEach(msg => {
    const ts      = new Date(msg.timestamp);
    const dateLbl = ts.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' });
    if (dateLbl !== lastDate) {
      const sep = document.createElement('div');
      sep.className = 'chat-date-sep'; sep.textContent = dateLbl;
      frag.appendChild(sep); lastDate = dateLbl;
    }
    const el = document.createElement('div');
    const dir = msg.direction || 'sent';
    el.className = `chat-msg chat-msg--${dir}`;
    el.dataset.msgId = msg.id || '';

    // reply quote
    const replyHtml = msg.reply_to_text
      ? `<div class="chat-reply-quote">${msg.reply_to_sender?`<span class="crq-sender">${esc(msg.reply_to_sender)}</span>`:''}<div class="crq-text">${esc((msg.reply_to_text||'').slice(0,120))}</div></div>`
      : '';

    // media or text
    let mediaHtml = '';
    if (msg.media_type) {
      const mt = msg.media_type;
      const mu = msg.media_url || '';
      if (mt === 'image' || mt === 'sticker') {
        if (mu) {
          mediaHtml = `<img src="${mu}" class="chat-media-img${mt === 'sticker' ? ' chat-sticker' : ''}" alt="${mt}">`;
        } else {
          mediaHtml = `<span class="chat-media-placeholder">${mt === 'sticker' ? '🎭 Figurinha' : '🖼 Imagem'}</span>`;
        }
      } else if (mt === 'video') {
        if (mu) {
          mediaHtml = `<video controls class="chat-media-video"><source src="${mu}"></video>`;
        } else {
          mediaHtml = `<span class="chat-media-placeholder">🎬 Vídeo</span>`;
        }
      } else if (mt === 'audio' || mt === 'ptt') {
        if (mu) {
          mediaHtml = `<audio controls class="chat-media-audio"><source src="${mu}"></audio>`;
        } else {
          mediaHtml = `<span class="chat-media-placeholder">🎤 Áudio</span>`;
        }
      } else {
        const n = esc(msg.media_name || msg.text || 'arquivo');
        if (mu) {
          mediaHtml = `<a href="${mu}" download="${n}" class="chat-media-doc" target="_blank"><span class="chat-media-doc-icon">📄</span><span class="chat-media-doc-name">${n}</span></a>`;
        } else {
          mediaHtml = `<span class="chat-media-placeholder">📄 ${n}</span>`;
        }
      }
    }

    el.innerHTML = `
      <div class="chat-msg-actions">
        <button class="chat-action-btn chat-reply-btn"   data-msg-id="${esc(msg.id||'')}" title="Responder">↩</button>
        <button class="chat-action-btn chat-copy-btn"    data-msg-id="${esc(msg.id||'')}" title="Copiar">⎘</button>
        <button class="chat-action-btn chat-star-btn${msg.starred?' chat-star-btn--on':''}" data-msg-id="${esc(msg.id||'')}" title="Estrelar">${ICO_STAR_SM}</button>
        <button class="chat-action-btn chat-forward-btn" data-msg-id="${esc(msg.id||'')}" title="Encaminhar">⟶</button>
        <button class="chat-action-btn chat-delete-btn btn-destructive"  data-msg-id="${esc(msg.id||'')}" title="Apagar">${ICO_TRASH}</button>
      </div>
      <div class="chat-bubble">
        ${replyHtml}
        ${mediaHtml || esc(msg.text||'')}
      </div>
      <div class="chat-msg-meta">
        ${msg.senderName||msg.sender_name ? `<span class="chat-sender">${esc(msg.senderName||msg.sender_name)}</span>` : ''}
        <span class="chat-time">${ts.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>
        ${dir==='sent' ? (msg.status==='read' ? '<span class="chat-tick chat-tick--read">✓✓</span>' : msg.status==='delivered' ? '<span class="chat-tick chat-tick--delivered">✓✓</span>' : '<span class="chat-tick">✓</span>') : ''}
      </div>`;
    frag.appendChild(el);
  });
  container.appendChild(frag);
  container.scrollTop = container.scrollHeight;
}

function normalizePhoneForEvolution(celular) {
  let d = (celular || '').replace(/\D/g, '');
  if (!d) return null;
  // Already correct: 55 + DDD(2) + number(8 or 9) = 12 or 13 digits
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) return d;
  // Has 55 prefix but too long — strip it and re-evaluate
  if (d.startsWith('55') && d.length > 13) d = d.slice(2);
  // Still too long — take last 11 digits (DDD + 9-digit mobile)
  if (d.length > 11) d = d.slice(-11);
  // Minimum: DDD(2) + number(8) = 10 digits
  if (d.length < 10) return null;
  return `55${d}`;
}

async function sendChatMessage(inputId, instSelectId, leadId) {
  if (!leadId) return;
  const input    = $(inputId);
  const instSel  = $(instSelectId);
  const text     = input?.value.trim();
  const instName = instSel?.value;
  if (!text)     { toast('Digite uma mensagem.','err'); return; }
  if (!instName) { toast('Selecione uma instância para enviar.','err'); return; }
  const lead = allLeads.find(l => l.id === leadId);
  if (!lead) return;
  const phone = normalizePhoneForEvolution(lead.celular);
  if (!phone) { toast('Lead sem número de celular válido.','err'); return; }
  input.disabled = true;
  const ts = new Date().toISOString();
  const replyRef = chatReplyTo ? { reply_to_text: chatReplyTo.text, reply_to_sender: chatReplyTo.sender } : {};
  clearReplyTo();
  const msgData = {
    text, direction: 'sent', timestamp: ts, instanceName: instName,
    senderName: currentUser?.displayName || 'FDV', status: 'sent',
  };
  try {
    await fetchEvolution(`/message/sendText/${instName}`, 'POST', { number: phone, text });
    if (isLive) {
      await supabase.from('lead_messages').insert({
        lead_id: leadId, text, direction: 'sent', timestamp: ts,
        instance_name: instName, sender_name: currentUser?.displayName || 'FDV', status: 'sent',
        ...replyRef,
      });
      await supabase.from('leads').update({ last_message_at: ts, last_message_text: text, last_message_instance: instName, atualizadoem: ts }).eq('id', leadId);
      lead.lastMessageAt = ts; lead.lastMessageText = text; lead.lastMessageInstance = instName;
    } else {
      chatMessages.push({ id:'local-'+Date.now(), ...msgData, ...replyRef });
      renderChatMessages(chatMessages, inputId.includes('perfil') ? 'perfil-chat-messages' : 'central-chat-messages',
                                       inputId.includes('perfil') ? 'perfil-chat-empty'    : 'central-chat-empty');
      lead.lastMessageAt = ts; lead.lastMessageText = text; lead.lastMessageInstance = instName;
    }
    toast('Mensagem enviada.', 'ok');
    input.value = '';
  } catch(e) { console.error('[sendChatMessage]', e); toast('Erro ao enviar: ' + (e.message||'falha na API'),'err'); }
  finally    { input.disabled = false; input.focus(); }
}

// ─── CONTACT PHOTOS ──────────────────────────────────────────────────

async function fetchContactPhoto(instanceName, phone) {
  if (!phone || !instanceName || !isLive) return null;
  if (phone in waContactPhotos) return waContactPhotos[phone];
  try {
    const data = await fetchEvolution(
      `/chat/fetchProfilePictureUrl/${instanceName}`,
      'POST',
      { number: phone }
    );
    const url = data?.profilePictureUrl || null;
    waContactPhotos[phone] = url;
    return url;
  } catch {
    waContactPhotos[phone] = null;
    return null;
  }
}

function updateChatListPhotos() {
  const listEl = $('chats-list'); if (!listEl) return;
  listEl.querySelectorAll('.cli-avatar[data-phone]').forEach(async el => {
    const phone    = el.dataset.phone;
    const instance = el.dataset.instance;
    if (!phone || !instance) return;
    const url = await fetchContactPhoto(instance, phone);
    if (!url) return;
    const img  = el.querySelector('.cli-photo');
    const span = el.querySelector('.cli-initials');
    if (!img || !span) return;
    img.onload  = () => { span.style.display = 'none'; img.style.display = ''; };
    img.onerror = () => { waContactPhotos[phone] = null; };
    img.src = url;
  });
}

async function updateChatHeaderPhoto(phone, instanceName) {
  if (!phone || !instanceName) return;
  const url = await fetchContactPhoto(instanceName, phone);
  if (!url) return;
  const el   = $('cp-avatar-wrap'); if (!el) return;
  const img  = el.querySelector('.cp-photo');
  const span = el.querySelector('.cp-initials');
  if (!img || !span) return;
  img.onload  = () => { span.style.display = 'none'; img.style.display = ''; };
  img.onerror = () => { waContactPhotos[phone] = null; };
  img.src = url;
}

// ─── CENTRAL DE CHATS ────────────────────────────────────────────────

function setReplyTo(msg) {
  chatReplyTo = { id: msg.id, text: msg.text || '', sender: msg.senderName || msg.sender_name || '' };
  const bar = $('chat-reply-bar');
  if (bar) {
    $('crb-sender').textContent = chatReplyTo.sender || 'Mensagem';
    $('crb-text').textContent   = (chatReplyTo.text || '').slice(0, 100);
    bar.style.display = '';
  }
  $('central-chat-input')?.focus();
}

function clearReplyTo() {
  chatReplyTo = null;
  const bar = $('chat-reply-bar');
  if (bar) bar.style.display = 'none';
}

function applyTextFormat(textareaId, wrap) {
  const ta = $(textareaId); if (!ta) return;
  const s = ta.selectionStart, e = ta.selectionEnd;
  const sel = ta.value.slice(s, e);
  const [l, r] = Array.isArray(wrap) ? wrap : [wrap, wrap];
  ta.value = ta.value.slice(0, s) + l + sel + r + ta.value.slice(e);
  ta.selectionStart = s + l.length;
  ta.selectionEnd   = e + l.length;
  ta.focus();
}

function buildChatInputBarHTML(textareaId) {
  return `
    <div class="quick-replies-menu" id="quick-replies-menu" style="display:none"></div>
    <div class="chat-reply-bar" id="chat-reply-bar" style="display:none">
      <div class="crb-line"></div>
      <div class="crb-body">
        <span class="crb-sender" id="crb-sender"></span>
        <span class="crb-text"   id="crb-text"></span>
      </div>
      <button class="crb-cancel btn-ghost btn-icon" id="btn-reply-cancel">✕</button>
    </div>
    <div class="chat-input-row">
      <input type="file" id="chat-file-input" class="chat-file-input"
             accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip">
      <button class="chat-tool-btn" id="btn-chat-attach" title="Enviar arquivo">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
      </button>
      <button class="chat-fmt-btn" data-fmt="bold"   title="Negrito (*texto*)"><b>B</b></button>
      <button class="chat-fmt-btn" data-fmt="italic" title="Itálico (_texto_)"><i>I</i></button>
      <button class="chat-fmt-btn" data-fmt="strike" title="Tachado (~texto~)"><s>S</s></button>
      <button class="chat-tool-btn" id="btn-chat-emoji" title="Emojis">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
      </button>
      <textarea class="chat-input" id="${textareaId}" placeholder="Digite uma mensagem ou / para respostas rápidas…" rows="1"></textarea>
      <button class="chat-tool-btn chat-mic-btn" id="btn-chat-mic" title="Gravar áudio">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
      </button>
      <button class="btn-primary chat-send-btn" id="btn-central-send">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
    <div id="chat-emoji-picker-wrap" style="display:none;position:absolute;bottom:70px;left:0;z-index:50;"></div>`;
}

function bindChatSearchEvents() {
  chatMsgSearch = '';
  $('btn-chat-search')?.addEventListener('click', () => {
    const bar = $('chat-search-bar');
    if (!bar) return;
    const isOpen = bar.style.display !== 'none';
    bar.style.display = isOpen ? 'none' : '';
    if (!isOpen) { $('chat-msg-search')?.focus(); }
    else { chatMsgSearch = ''; reRenderChatMessages(); }
  });
  $('btn-chat-search-close')?.addEventListener('click', () => {
    const bar = $('chat-search-bar'); if (bar) bar.style.display = 'none';
    chatMsgSearch = ''; reRenderChatMessages();
  });
  $('chat-msg-search')?.addEventListener('input', e => {
    chatMsgSearch = e.target.value.trim();
    reRenderChatMessages();
  });
}

function reRenderChatMessages() {
  const msgs = $('perfil-chat-messages') ? 'perfil-chat-messages' : 'central-chat-messages';
  const empty = $('perfil-chat-empty') ? 'perfil-chat-empty' : 'central-chat-empty';
  renderChatMessages(chatMessages, msgs, empty);
}

function bindChatFormatEvents(textareaId) {
  const fmtMap = { bold: ['*','*'], italic: ['_','_'], strike: ['~','~'], mono: ['```','```'] };
  document.querySelectorAll('.chat-fmt-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      applyTextFormat(textareaId, fmtMap[btn.dataset.fmt] || ['','']);
    });
  });
}

function bindChatEmojiEvents(textareaId) {
  const btn  = $('btn-chat-emoji');
  const wrap = $('chat-emoji-picker-wrap');
  if (!btn || !wrap) return;

  // Create picker on first use
  btn.addEventListener('click', e => {
    e.stopPropagation();
    if (!wrap.firstChild) {
      const picker = document.createElement('emoji-picker');
      picker.classList.add('light');
      wrap.appendChild(picker);
      picker.addEventListener('emoji-click', ev => {
        const ta = $(textareaId);
        if (!ta) return;
        const pos = ta.selectionStart ?? ta.value.length;
        ta.value  = ta.value.slice(0, pos) + ev.detail.unicode + ta.value.slice(pos);
        ta.selectionStart = ta.selectionEnd = pos + ev.detail.unicode.length;
        ta.focus();
      });
    }
    wrap.style.display = wrap.style.display === 'none' ? '' : 'none';
  });

  document.addEventListener('click', () => { if (wrap) wrap.style.display = 'none'; });
}

function bindChatAttachEvents(instSelectId, phone, isLead, entityId) {
  $('btn-chat-attach')?.addEventListener('click', () => $('chat-file-input')?.click());
  $('chat-file-input')?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) handleAttachmentFile(file, instSelectId, phone, isLead, entityId);
    e.target.value = '';
  });
}

async function handleAttachmentFile(file, instSelectId, phone, isLead, entityId) {
  const instName = $(instSelectId)?.value;
  if (!instName) { toast('Selecione uma instância.', 'err'); return; }
  if (!phone)    { toast('Número não disponível.', 'err'); return; }
  const MAX = 15 * 1024 * 1024;
  if (file.size > MAX) { toast('Arquivo muito grande (máx. 15MB).', 'err'); return; }
  const mediaType = file.type.startsWith('image/') ? 'image'
                  : file.type.startsWith('video/') ? 'video'
                  : file.type.startsWith('audio/') ? 'audio'
                  : 'document';
  const reader = new FileReader();
  reader.onload = async () => {
    const dataUrl = reader.result;
    const base64  = dataUrl.split(',')[1];
    try {
      await fetchEvolution(`/message/sendMedia/${instName}`, 'POST', {
        number: phone, mediatype: mediaType, mimetype: file.type,
        caption: '', media: base64, fileName: file.name,
      });
    } catch(e) { toast('Erro ao enviar: ' + e.message, 'err'); return; }
    if (!isLive) return;
    const ts  = new Date().toISOString();
    const row = {
      text: `[${mediaType}] ${file.name}`, direction: 'sent', timestamp: ts,
      instance_name: instName, sender_name: currentUser?.displayName || 'FDV', status: 'sent',
      media_type: mediaType, media_url: dataUrl, media_name: file.name,
    };
    if (isLead) {
      row.lead_id = entityId;
      await supabase.from('lead_messages').insert(row);
      await supabase.from('leads').update({ last_message_at: ts, last_message_text: `[${mediaType}]`, last_message_instance: instName }).eq('id', entityId);
    } else {
      row.contact_id = entityId;
      await supabase.from('lead_messages').insert(row);
      await supabase.from('whatsapp_contacts').update({ last_message_at: ts, last_message_text: `[${mediaType}]`, instance_name: instName }).eq('id', entityId);
    }
    toast('Arquivo enviado.', 'ok');
  };
  reader.readAsDataURL(file);
}

async function startAudioRecording() {
  if (isRecording) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks  = [];
    const mimeType = ['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/webm','audio/mp4']
      .find(t => MediaRecorder.isTypeSupported(t)) || '';
    mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
    mediaRecorder.start();
    isRecording = true;
    $('btn-chat-mic')?.classList.add('recording');
    mediaRecorder._stream = stream;
  } catch(e) { toast('Sem permissão para microfone.', 'err'); }
}

async function stopAudioRecording(instSelectId, phone, isLead, entityId) {
  if (!isRecording || !mediaRecorder) return;
  isRecording = false;
  $('btn-chat-mic')?.classList.remove('recording');
  const recMimeType = mediaRecorder.mimeType || 'audio/webm';
  mediaRecorder.onstop = async () => {
    const blob = new Blob(audioChunks, { type: recMimeType });
    if (blob.size < 1000) return;
    const instName = $(instSelectId)?.value;
    if (!instName) { toast('Selecione uma instância.', 'err'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      const base64  = dataUrl.split(',')[1];
      try {
        await fetchEvolution(`/message/sendWhatsAppAudio/${instName}`, 'POST', {
          number: phone, audio: base64, encoding: true,
        });
      } catch(e) { toast('Erro ao enviar áudio: ' + e.message, 'err'); return; }
      if (!isLive) return;
      const ts  = new Date().toISOString();
      const ext = recMimeType.includes('ogg') ? 'ogg' : recMimeType.includes('mp4') ? 'mp4' : 'webm';
      const row = {
        text: '[áudio]', direction: 'sent', timestamp: ts,
        instance_name: instName, sender_name: currentUser?.displayName || 'FDV', status: 'sent',
        media_type: 'audio', media_url: dataUrl, media_name: `audio.${ext}`,
      };
      if (isLead) {
        row.lead_id = entityId;
        await supabase.from('lead_messages').insert(row);
        await supabase.from('leads').update({ last_message_at: ts, last_message_text: '[áudio]', last_message_instance: instName }).eq('id', entityId);
      } else {
        row.contact_id = entityId;
        await supabase.from('lead_messages').insert(row);
        await supabase.from('whatsapp_contacts').update({ last_message_at: ts, last_message_text: '[áudio]', instance_name: instName }).eq('id', entityId);
      }
      toast('Áudio enviado.', 'ok');
    };
    reader.readAsDataURL(blob);
  };
  mediaRecorder.stop();
  mediaRecorder._stream?.getTracks().forEach(t => t.stop());
}

function bindChatMicEvents(instSelectId, phone, isLead, entityId) {
  const btn = $('btn-chat-mic'); if (!btn) return;
  btn.addEventListener('mousedown', e => { e.preventDefault(); startAudioRecording(); });
  btn.addEventListener('mouseup',   () => stopAudioRecording(instSelectId, phone, isLead, entityId));
  btn.addEventListener('mouseleave',() => { if (isRecording) stopAudioRecording(instSelectId, phone, isLead, entityId); });
  btn.addEventListener('touchstart', e => { e.preventDefault(); startAudioRecording(); }, { passive: false });
  btn.addEventListener('touchend',   e => { e.preventDefault(); stopAudioRecording(instSelectId, phone, isLead, entityId); }, { passive: false });
}

async function renderCentralChats() {
  renderChatsFilters();
  await loadLeadLabels();
  await loadQuickReplies();
  if (!contactsLoaded) loadContacts();
  renderChatsList();
}

function renderChatsFilters() {
  const sel = $('chats-filter-instance'); if (!sel) return;
  sel.innerHTML = `<option value="">Todas as instâncias</option>` +
    getPermittedInstances().map(i => `<option value="${esc(i.instanceName)}">${esc(i.displayName)}</option>`).join('');
}

function fmtChatTime(isoStr) {
  if (!isoStr) return '';
  const d   = new Date(isoStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (new Date(now - 86400000).toDateString() === d.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function renderLeadChatItem(lead) {
  const isActive = lead.id === chatActiveSide;
  const unread   = lead.unread_count || lead.unreadCount || 0;
  const lastMsg  = (lead.last_message_text || lead.lastMessageText || '').slice(0, 50);
  const lastTime = fmtChatTime(lead.last_message_at || lead.lastMessageAt);
  const initials = (lead.nome || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const phone    = normalizePhoneForEvolution(lead.celular) || '';
  const instance = lead.last_message_instance || lead.lastMessageInstance || '';
  const lblHtml  = (leadLabelsCache[lead.id] || []).map(l =>
    `<span class="cli-label-pill" style="background:${esc(l.cor)}22;color:${esc(l.cor)}">${esc(l.nome)}</span>`
  ).join('');
  const cachedUrl   = phone ? waContactPhotos[phone] : undefined;
  const avatarInner = cachedUrl
    ? `<img src="${esc(cachedUrl)}" alt="${esc(initials)}" class="cli-photo">`
    : `<span class="cli-initials">${esc(initials)}</span><img class="cli-photo" style="display:none" alt="${esc(initials)}">`;
  return `<div class="chats-list-item${isActive?' chats-list-item--active':''}${unread?' chats-list-item--unread':''}" data-lead-id="${esc(lead.id)}" role="button" tabindex="0">
    <div class="cli-avatar" data-phone="${esc(phone)}" data-instance="${esc(instance)}">${avatarInner}</div>
    <div class="cli-body">
      <div class="cli-top"><span class="cli-name">${esc(lead.nome||'—')}${lead.chat_pinned ? `<span class="cli-pin-icon">${ICO_PIN_SM}</span>` : ''}${lead.chat_starred ? `<span class="cli-pin-icon">${ICO_STAR_SM}</span>` : ''}</span><span class="cli-time">${esc(lastTime)}</span></div>
      <div class="cli-mid"><span class="cli-msg">${esc(lastMsg)}</span>${unread?`<span class="cli-unread-badge">${unread}</span>`:''}</div>
      ${lblHtml?`<div class="cli-labels">${lblHtml}</div>`:''}
    </div>
    <button class="cli-delete-btn" data-action="delete-conv" data-type="lead" data-id="${esc(lead.id)}" title="Excluir conversa" aria-label="Excluir conversa">${ICO_TRASH}</button>
  </div>`;
}

function renderContactChatItem(contact) {
  const isActive = chatActiveSide === 'contact:' + contact.id;
  const unread   = contact.unread_count || 0;
  const lastMsg  = (contact.last_message_text || '').slice(0, 50);
  const lastTime = fmtChatTime(contact.last_message_at);
  const pushName = contact.push_name || '';
  const phone    = contact.phone || '';
  const initials = pushName
    ? pushName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : phone.slice(-4);
  const instance = contact.instance_name || '';
  const cachedUrl   = phone ? waContactPhotos[phone] : undefined;
  const avatarInner = cachedUrl
    ? `<img src="${esc(cachedUrl)}" alt="${esc(initials)}" class="cli-photo">`
    : `<span class="cli-initials cli-initials--unknown">${esc(initials)}</span><img class="cli-photo" style="display:none" alt="${esc(initials)}">`;
  return `<div class="chats-list-item${isActive?' chats-list-item--active':''}${unread?' chats-list-item--unread':''}" data-contact-id="${esc(contact.id)}" role="button" tabindex="0">
    <div class="cli-avatar" data-phone="${esc(phone)}" data-instance="${esc(instance)}">${avatarInner}</div>
    <div class="cli-body">
      <div class="cli-top"><span class="cli-name">${esc(pushName||phone)}${contact.chat_pinned ? `<span class="cli-pin-icon">${ICO_PIN_SM}</span>` : ''}${contact.chat_starred ? `<span class="cli-pin-icon">${ICO_STAR_SM}</span>` : ''}</span><span class="cli-time">${esc(lastTime)}</span></div>
      <div class="cli-mid"><span class="cli-msg">${esc(lastMsg)}</span>${unread?`<span class="cli-unread-badge">${unread}</span>`:''}</div>
      <div class="cli-labels"><span class="cli-unknown-tag">Desconhecido</span></div>
    </div>
    <button class="cli-delete-btn" data-action="delete-conv" data-type="contact" data-id="${esc(contact.id)}" title="Excluir conversa" aria-label="Excluir conversa">${ICO_TRASH}</button>
  </div>`;
}

function renderChatsList() {
  const instFilt   = $('chats-filter-instance')?.value || '';
  const statusFilt = $('chats-filter-status')?.value   || '';
  const search     = chatSearchQuery.toLowerCase();

  let leadConvs = allLeads.filter(l => l.last_message_at || l.lastMessageAt);
  if (instFilt)   leadConvs = leadConvs.filter(l => (l.last_message_instance||l.lastMessageInstance) === instFilt);
  if (statusFilt) leadConvs = leadConvs.filter(l => l.status === statusFilt);
  if (search)     leadConvs = leadConvs.filter(l => (l.nome||'').toLowerCase().includes(search) || (l.celular||'').includes(search));

  let contactConvs = allContacts;
  if (instFilt)   contactConvs = contactConvs.filter(c => c.instance_name === instFilt);
  if (statusFilt) contactConvs = [];
  if (search)     contactConvs = contactConvs.filter(c => (c.push_name||'').toLowerCase().includes(search) || (c.phone||'').includes(search));

  // Quick filter
  if (chatQuickFilter === 'unread') {
    leadConvs    = leadConvs.filter(l => (l.unread_count || l.unreadCount || 0) > 0);
    contactConvs = contactConvs.filter(c => (c.unread_count || 0) > 0);
  } else if (chatQuickFilter === 'starred') {
    leadConvs    = leadConvs.filter(l => l.chat_starred);
    contactConvs = contactConvs.filter(c => c.chat_starred);
  } else if (chatQuickFilter === 'archived') {
    leadConvs    = allLeads.filter(l => l.chat_archived && (l.last_message_at || l.lastMessageAt));
    contactConvs = allContacts.filter(c => c.chat_archived);
  } else {
    leadConvs    = leadConvs.filter(l => !l.chat_archived);
    contactConvs = contactConvs.filter(c => !c.chat_archived);
  }

  const items = [
    ...leadConvs.map(l  => ({ type: 'lead',    data: l, at: l.last_message_at||l.lastMessageAt||'' })),
    ...contactConvs.map(c => ({ type: 'contact', data: c, at: c.last_message_at||'' })),
  ].sort((a, b) => {
    const ap = a.data.chat_pinned ? 1 : 0;
    const bp = b.data.chat_pinned ? 1 : 0;
    if (bp !== ap) return bp - ap; // pinned first
    return b.at.localeCompare(a.at);
  });

  const listEl = $('chats-list'); if (!listEl) return;
  if (!items.length) {
    listEl.innerHTML = `<div class="chat-list-empty"><div style="font-size:32px;margin-bottom:10px">💬</div><p>Nenhuma conversa ainda.</p></div>`;
    return;
  }
  listEl.innerHTML = items.map(({ type, data }) =>
    type === 'lead' ? renderLeadChatItem(data) : renderContactChatItem(data)
  ).join('');
  updateChatListPhotos();
}

function showConvContextMenu(x, y, type, id) {
  let menu = $('conv-ctx-menu');
  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'conv-ctx-menu';
    menu.className = 'conv-ctx-menu';
    document.body.appendChild(menu);
    menu.addEventListener('click', e => {
      const btn = e.target.closest('.ccm-btn');
      if (!btn) return;
      menu.style.display = 'none';
      if (btn.dataset.action === 'pin')     togglePinConversation(btn.dataset.type, btn.dataset.id);
      if (btn.dataset.action === 'unread')  markAsUnread(btn.dataset.type, btn.dataset.id);
      if (btn.dataset.action === 'archive') toggleArchiveConversation(btn.dataset.type, btn.dataset.id);
      if (btn.dataset.action === 'star')    toggleStarConversation(btn.dataset.type, btn.dataset.id);
    });
    document.addEventListener('click', () => { menu.style.display = 'none'; });
  }
  const rec        = type === 'lead' ? allLeads.find(l => l.id === id) : allContacts.find(c => c.id === id);
  const isPinned   = !!rec?.chat_pinned;
  const isStarred  = !!rec?.chat_starred;
  const isArchived = !!rec?.chat_archived;
  menu.innerHTML = `
    <button class="ccm-btn" data-action="pin" data-type="${type}" data-id="${id}">
      📌 ${isPinned ? 'Desafixar' : 'Fixar no topo'}
    </button>
    <button class="ccm-btn" data-action="star" data-type="${type}" data-id="${id}">
      ⭐ ${isStarred ? 'Remover dos favoritos' : 'Favoritar conversa'}
    </button>
    <button class="ccm-btn" data-action="archive" data-type="${type}" data-id="${id}">
      🗄️ ${isArchived ? 'Desarquivar' : 'Arquivar conversa'}
    </button>
    <button class="ccm-btn" data-action="unread" data-type="${type}" data-id="${id}">
      🔴 Marcar como não lida
    </button>`;
  menu.style.cssText = `display:block;left:${x}px;top:${y}px;`;
}

async function togglePinConversation(type, id) {
  if (!isLive) { toast('Não disponível no modo demo.', 'err'); return; }
  if (type === 'lead') {
    const lead = allLeads.find(l => l.id === id); if (!lead) return;
    const newVal = !lead.chat_pinned;
    await supabase.from('leads').update({ chat_pinned: newVal }).eq('id', id);
    lead.chat_pinned = newVal;
  } else {
    const c = allContacts.find(x => x.id === id); if (!c) return;
    const newVal = !c.chat_pinned;
    await supabase.from('whatsapp_contacts').update({ chat_pinned: newVal }).eq('id', id);
    c.chat_pinned = newVal;
  }
  renderChatsList();
  toast(type === 'lead' && allLeads.find(l=>l.id===id)?.chat_pinned ? 'Conversa fixada.' : 'Conversa desafixada.', 'ok');
}

async function toggleArchiveConversation(type, id) {
  if (!isLive) { toast('Não disponível no modo demo.', 'err'); return; }
  if (type === 'lead') {
    const lead = allLeads.find(l => l.id === id); if (!lead) return;
    const newVal = !lead.chat_archived;
    await supabase.from('leads').update({ chat_archived: newVal }).eq('id', id);
    lead.chat_archived = newVal;
    toast(newVal ? 'Conversa arquivada.' : 'Conversa desarquivada.', 'ok');
  } else {
    const c = allContacts.find(x => x.id === id); if (!c) return;
    const newVal = !c.chat_archived;
    await supabase.from('whatsapp_contacts').update({ chat_archived: newVal }).eq('id', id);
    c.chat_archived = newVal;
    toast(newVal ? 'Conversa arquivada.' : 'Conversa desarquivada.', 'ok');
  }
  renderChatsList();
}

async function toggleStarConversation(type, id) {
  if (!isLive) { toast('Não disponível no modo demo.', 'err'); return; }
  if (type === 'lead') {
    const lead = allLeads.find(l => l.id === id); if (!lead) return;
    const newVal = !lead.chat_starred;
    await supabase.from('leads').update({ chat_starred: newVal }).eq('id', id);
    lead.chat_starred = newVal;
    toast(newVal ? 'Conversa favoritada.' : 'Removida dos favoritos.', 'ok');
  } else {
    const c = allContacts.find(x => x.id === id); if (!c) return;
    const newVal = !c.chat_starred;
    await supabase.from('whatsapp_contacts').update({ chat_starred: newVal }).eq('id', id);
    c.chat_starred = newVal;
    toast(newVal ? 'Conversa favoritada.' : 'Removida dos favoritos.', 'ok');
  }
  renderChatsList();
}

// Feature 8: delete a single chat message
async function deleteChatMessage(msgId) {
  if (!msgId) return;
  if (!confirm('Apagar esta mensagem?')) return;
  if (isLive) {
    const { error } = await supabase.from('lead_messages').delete().eq('id', msgId);
    if (error) { toast('Erro ao apagar: ' + error.message, 'err'); return; }
  }
  chatMessages = chatMessages.filter(m => m.id !== msgId);
  const el = document.querySelector(`.chat-msg[data-msg-id="${msgId}"]`);
  if (el) el.remove();
  toast('Mensagem apagada.', 'ok');
}

// Feature 7: mark conversation as unread — called from context menu (showConvContextMenu)
async function markAsUnread(type, id) {
  if (!isLive) { toast('Não disponível no modo demo.', 'err'); return; }
  if (type === 'lead') {
    const lead = allLeads.find(l => l.id === id); if (!lead) return;
    await supabase.from('leads').update({ unread_count: 1 }).eq('id', id);
    lead.unread_count = 1; lead.unreadCount = 1;
  } else {
    const c = allContacts.find(x => x.id === id); if (!c) return;
    await supabase.from('whatsapp_contacts').update({ unread_count: 1 }).eq('id', id);
    c.unread_count = 1;
  }
  // Deselect the conversation from active side so badge shows
  if (chatActiveSide === id || chatActiveSide === 'contact:' + id) {
    chatActiveSide = null;
    stopChatListener();
    const p = $('chats-panel');
    if (p) p.innerHTML = `<div class="chats-panel-empty"><div style="font-size:40px;margin-bottom:12px">💬</div><h3>Selecione uma conversa</h3><p>Clique em um contato à esquerda para abrir o chat.</p></div>`;
  }
  renderChatsList();
  toast('Marcado como não lida.', 'ok');
}

function openCentralChat(leadId) {
  chatActiveSide = leadId;
  const lead = allLeads.find(l => l.id === leadId); if (!lead) return;
  lead.unread_count = 0; lead.unreadCount = 0;
  if (isLive)
    supabase.from('leads').update({ unread_count: 0 }).eq('id', leadId).then(null, console.error);
  renderChatsList();
  const panel = $('chats-panel'); if (!panel) return;

  const initials = (lead.nome || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const phone    = normalizePhoneForEvolution(lead.celular) || lead.celular || '—';

  const initSentHex     = localStorage.getItem('fdv_bubble_sent_hex') || '#CE9221';
  const initRecvHex     = localStorage.getItem('fdv_bubble_recv_hex') || '#2d444a';
  const initBubbleStyle = localStorage.getItem('fdv_bubble_style') || '';
  const initChatFont    = localStorage.getItem('fdv_chat_font') || '';

  panel.innerHTML = `
    <div class="cp-header">
      <div class="cp-header-left">
        <div class="cp-avatar" id="cp-avatar-wrap"><span class="cp-initials">${esc(initials)}</span><img class="cp-photo" style="display:none" alt="${esc(initials)}"></div>
        <div class="cp-header-info" id="btn-open-lead-info" role="button" title="Ver info do lead">
          <div class="cp-name">${esc(lead.nome || '—')}</div>
          <div class="cp-phone">${esc(phone)}</div>
          <div class="cp-status" id="cp-status"></div>
        </div>
      </div>
      <div class="cp-header-right">
        <select id="central-chat-instance" class="filter-select chat-inst-sel"></select>
        <button class="btn-ghost cp-header-btn" id="btn-chat-search" title="Buscar na conversa">
          <i data-lucide="search" style="width:14px;height:14px"></i>
        </button>
        <button class="btn-ghost cp-header-btn cp-settings-btn" id="btn-chat-settings" title="Personalizar">
          <i data-lucide="palette" style="width:14px;height:14px"></i><span>Personalizar</span>
        </button>
        ${buildChatSettingsPanelHTML(initSentHex, initRecvHex, initBubbleStyle, initChatFont)}
        <button class="btn-ghost cp-header-btn cp-info-btn" id="btn-toggle-info" title="Perfil do lead">
          <i data-lucide="user" style="width:14px;height:14px"></i><span>Perfil</span>
        </button>
      </div>
    </div>
    <div class="cp-labels-bar" id="central-chat-labels"></div>
    <div class="chat-search-bar" id="chat-search-bar" style="display:none">
      <input class="chat-search-input" id="chat-msg-search" placeholder="Buscar na conversa…">
      <button class="btn-ghost btn-icon chat-search-close" id="btn-chat-search-close">✕</button>
    </div>
    <div class="chat-messages" id="central-chat-messages">
      <div class="chat-empty" id="central-chat-empty">
        <span class="chat-empty-hint">Selecione uma instância e envie a primeira mensagem.</span>
      </div>
    </div>
    <div class="chat-typing-indicator" id="chat-typing" style="display:none">
      <div class="chat-typing-dots"><span></span><span></span><span></span></div>
    </div>
    <div class="chat-input-bar">${buildChatInputBarHTML('central-chat-input')}</div>`;

  lucide.createIcons({ nodes: [panel] });
  populateChatInstanceSelector('central-chat-instance');
  renderChatLabels(leadId);
  startChatListener(leadId, 'central-chat-messages', 'central-chat-empty');

  const headerPhone    = normalizePhoneForEvolution(lead.celular) || '';
  const headerInstance = lead.last_message_instance || lead.lastMessageInstance || waInstances[0]?.instanceName || '';
  if (headerPhone && headerInstance) updateChatHeaderPhoto(headerPhone, headerInstance);

  $('btn-central-send').addEventListener('click', () =>
    sendChatMessage('central-chat-input', 'central-chat-instance', leadId)
  );
  $('central-chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage('central-chat-input', 'central-chat-instance', leadId); }
    if (e.key === 'Escape') { closeQuickRepliesMenu(); clearReplyTo(); }
  });
  $('central-chat-input').addEventListener('input', e => {
    const val = e.target.value;
    if (val.startsWith('/')) showQuickRepliesMenu(val.slice(1));
    else closeQuickRepliesMenu();
  });
  $('btn-open-lead-info').addEventListener('click', () => toggleLeadInfoPanel(leadId));
  $('btn-toggle-info').addEventListener('click', () => toggleLeadInfoPanel(leadId));
  bindChatSettingsEvents();
  bindChatSearchEvents();
  bindChatFormatEvents('central-chat-input');
  bindChatAttachEvents('central-chat-instance', normalizePhoneForEvolution(lead.celular), true, leadId);
  bindChatEmojiEvents('central-chat-input');
  bindChatMicEvents('central-chat-instance', normalizePhoneForEvolution(lead.celular), true, leadId);
  $('central-chat-messages').addEventListener('click', e => {
    const rb = e.target.closest('.chat-reply-btn');
    if (rb) { const m = chatMessages.find(x => x.id === rb.dataset.msgId); if (m) setReplyTo(m); }
    const db = e.target.closest('.chat-delete-btn');
    if (db) deleteChatMessage(db.dataset.msgId);
    const fb = e.target.closest('.chat-forward-btn');
    if (fb) openForwardModal(fb.dataset.msgId);
    const cb = e.target.closest('.chat-copy-btn');
    if (cb) { const m = chatMessages.find(x => x.id === cb.dataset.msgId); if (m) copyChatMsg(m); }
    const sb = e.target.closest('.chat-star-btn');
    if (sb) toggleStarMessage(sb.dataset.msgId);
  });
  $('btn-reply-cancel')?.addEventListener('click', clearReplyTo);
}

// ── Lead info side panel ────────────────────────────────────────────────────
function toggleLeadInfoPanel(leadId) {
  const panel = $('chats-info-panel'); if (!panel) return;
  if (panel.style.display === 'none') openLeadInfoPanel(leadId);
  else { panel.style.display = 'none'; }
}

function openLeadInfoPanel(leadId) {
  const panel = $('chats-info-panel'); if (!panel) return;
  const lead  = allLeads.find(l => l.id === leadId); if (!lead) return;
  panel.style.display = '';

  const fields = [
    { key: 'nome',        label: 'Nome' },
    { key: 'celular',     label: 'Celular' },
    { key: 'email',       label: 'E-mail' },
    { key: 'instagram',   label: 'Instagram' },
    { key: 'profissao',   label: 'Profissão' },
    { key: 'renda',       label: 'Renda' },
    { key: 'idade',       label: 'Idade' },
    { key: 'observacoes', label: 'Obs.', multiline: true },
  ];

  panel.innerHTML = `
    <div class="cip-header">
      <span>Dados do lead</span>
      <button class="btn-ghost btn-icon" id="btn-close-info">
        <i data-lucide="x" style="width:16px;height:16px"></i>
      </button>
    </div>
    <div class="cip-body">
      <p class="cip-hint">Clique em qualquer campo para editar. Salva automaticamente.</p>
      ${fields.map(f => {
        const val = lead[f.key] || '';
        return `<div class="cip-inline-field">
          <label>${esc(f.label)}</label>
          ${f.multiline
            ? `<textarea class="cip-inline-val" data-field="${esc(f.key)}" rows="3">${esc(val)}</textarea>`
            : `<div class="cip-inline-val" contenteditable="true" data-field="${esc(f.key)}" spellcheck="false">${esc(val)}</div>`
          }
          <span class="cip-saved-tick" id="cip-tick-${esc(f.key)}" style="display:none">✓ salvo</span>
        </div>`;
      }).join('')}
    </div>
    <div class="cip-actions">
      <button class="btn-primary btn-sm" id="btn-cip-full">Perfil completo</button>
    </div>`;

  lucide.createIcons({ nodes: [panel] });
  $('btn-close-info').addEventListener('click', () => { panel.style.display = 'none'; });
  $('btn-cip-full').addEventListener('click', () => {
    const l = allLeads.find(x => x.id === leadId); if (l) openPerfil(l);
  });

  panel.querySelectorAll('.cip-inline-val[contenteditable]').forEach(el => {
    el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } });
    el.addEventListener('blur', () => saveCipField(leadId, lead, el.dataset.field, el.textContent.trim()));
  });
  panel.querySelectorAll('textarea.cip-inline-val').forEach(el => {
    el.addEventListener('blur', () => saveCipField(leadId, lead, el.dataset.field, el.value.trim()));
  });
}

async function saveCipField(leadId, lead, fieldKey, val) {
  if (String(lead[fieldKey] || '') === val) return;
  if (isLive) {
    const { error } = await supabase.from('leads')
      .update({ [fieldKey]: val, atualizadoem: new Date().toISOString() })
      .eq('id', leadId);
    if (error) { toast('Erro ao salvar ' + fieldKey + ': ' + error.message, 'err'); return; }
  }
  lead[fieldKey] = val;
  const tick = $('cip-tick-' + fieldKey);
  if (tick) { tick.style.display = ''; setTimeout(() => { tick.style.display = 'none'; }, 1800); }
}

// ── Lead labels in chat ────────────────────────────────────────────────────
async function loadLeadLabels() {
  if (!isLive) return;
  const { data } = await supabase.from('lead_labels').select('lead_id, labels(id, nome, cor)');
  leadLabelsCache = {};
  (data || []).forEach(r => {
    if (!leadLabelsCache[r.lead_id]) leadLabelsCache[r.lead_id] = [];
    if (r.labels) leadLabelsCache[r.lead_id].push(r.labels);
  });
}

async function renderChatLabels(leadId) {
  const bar = $('central-chat-labels'); if (!bar) return;
  if (!isLive) { bar.innerHTML = ''; return; }
  await loadLabels();
  const { data: ll } = await supabase.from('lead_labels').select('label_id, labels(id, nome, cor)').eq('lead_id', leadId);
  const applied    = (ll || []).map(r => r.labels).filter(Boolean);
  const appliedIds = applied.map(l => l.id);
  leadLabelsCache[leadId] = applied;

  bar.innerHTML = `
    ${applied.map(l => `
      <span class="cp-label-pill" style="background:${esc(l.cor)}22;border-color:${esc(l.cor)}55;color:${esc(l.cor)}">
        ${esc(l.nome)}<button class="cp-label-rm" data-lid="${esc(l.id)}" data-lead="${esc(leadId)}">×</button>
      </span>`).join('')}
    <div class="cp-label-picker-wrap">
      <button class="cp-label-add" id="btn-add-label" title="Adicionar etiqueta">＋</button>
      <div class="cp-label-picker" id="cp-label-picker" style="display:none">
        ${labelsData.length
          ? labelsData.map(l => `
              <div class="cp-label-opt${appliedIds.includes(l.id) ? ' cp-label-opt--on' : ''}" data-lid="${esc(l.id)}" data-lead="${esc(leadId)}">
                <span class="label-dot" style="background:${esc(l.cor)}"></span>${esc(l.nome)}
              </div>`).join('')
          : '<div class="cp-label-empty">Sem etiquetas. Crie em "Etiquetas".</div>'}
      </div>
    </div>`;

  $('btn-add-label')?.addEventListener('click', e => {
    e.stopPropagation();
    const pk = $('cp-label-picker');
    if (pk) pk.style.display = pk.style.display === 'none' ? '' : 'none';
  });
  bar.querySelectorAll('.cp-label-opt').forEach(opt => {
    opt.addEventListener('click', async () => {
      const lid  = opt.dataset.lid;
      const lead = opt.dataset.lead;
      if (opt.classList.contains('cp-label-opt--on'))
        await supabase.from('lead_labels').delete().match({ lead_id: lead, label_id: lid });
      else
        await supabase.from('lead_labels').insert({ lead_id: lead, label_id: lid });
      renderChatLabels(lead); renderChatsList();
    });
  });
  bar.querySelectorAll('.cp-label-rm').forEach(btn => {
    btn.addEventListener('click', async () => {
      await supabase.from('lead_labels').delete().match({ lead_id: btn.dataset.lead, label_id: btn.dataset.lid });
      renderChatLabels(btn.dataset.lead); renderChatsList();
    });
  });
  document.addEventListener('click', function closePk(e) {
    const pk = $('cp-label-picker');
    if (pk && !pk.contains(e.target) && e.target.id !== 'btn-add-label') pk.style.display = 'none';
  }, { once: true });
}

// ── Quick Replies ────────────────────────────────────────────────────────────
async function loadQuickReplies() {
  if (!isLive) return;
  const { data } = await supabase.from('quick_replies').select('*').order('titulo');
  quickReplies = data || [];
}

function showQuickRepliesMenu(query) {
  const menu = $('quick-replies-menu'); if (!menu) return;
  if (!quickReplies.length) { menu.style.display = 'none'; return; }
  const q        = query.toLowerCase();
  const filtered = q ? quickReplies.filter(r =>
    r.titulo.toLowerCase().includes(q) || r.texto.toLowerCase().includes(q)
  ) : quickReplies;
  if (!filtered.length) { menu.style.display = 'none'; return; }
  menu.style.display = '';
  menu.innerHTML = filtered.map(r => `
    <div class="qrm-item" data-text="${esc(r.texto)}" role="button" tabindex="0">
      <span class="qrm-title">/${esc(r.titulo)}</span>
      <span class="qrm-preview">${esc(r.texto.slice(0, 70))}${r.texto.length > 70 ? '…' : ''}</span>
    </div>`).join('');
  menu.querySelectorAll('.qrm-item').forEach(item => {
    item.addEventListener('click', () => {
      const input = $('central-chat-input');
      if (input) { input.value = item.dataset.text; input.focus(); }
      closeQuickRepliesMenu();
    });
  });
}

function closeQuickRepliesMenu() {
  const menu = $('quick-replies-menu'); if (menu) menu.style.display = 'none';
}

// CRUD quick replies
let qrEditId = null;

async function renderQuickRepliesPanel() {
  const wrap = $('quick-replies-table-wrap'); if (!wrap) return;
  await loadQuickReplies();
  if (!quickReplies.length) {
    wrap.innerHTML = '<div class="qr-empty">Nenhuma resposta cadastrada. Clique em "+ Nova resposta".</div>';
    return;
  }
  wrap.innerHTML = `
    <table class="qr-table">
      <thead><tr><th>Atalho</th><th>Texto</th><th></th></tr></thead>
      <tbody>${quickReplies.map(r => `
        <tr>
          <td><code>/${esc(r.titulo)}</code></td>
          <td class="qr-td-text">${esc(r.texto)}</td>
          <td class="qr-td-acts">
            <button class="btn-ghost btn-sm qr-edit" data-id="${esc(r.id)}">Editar</button>
            <button class="btn-icon qr-del btn-destructive" data-id="${esc(r.id)}" title="Excluir">${ICO_TRASH}</button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  wrap.querySelectorAll('.qr-edit').forEach(btn => btn.addEventListener('click', () => openQrForm(btn.dataset.id)));
  wrap.querySelectorAll('.qr-del').forEach(btn => btn.addEventListener('click', () => deleteQuickReply(btn.dataset.id)));
}

function openQrForm(id) {
  const form = $('quick-reply-form'); if (!form) return;
  qrEditId = id || null;
  form.style.display = '';
  if (id) {
    const r = quickReplies.find(r => r.id === id);
    if (r) { $('qr-titulo').value = r.titulo; $('qr-texto').value = r.texto; }
  } else {
    $('qr-titulo').value = ''; $('qr-texto').value = '';
  }
}

async function saveQuickReply() {
  const titulo = $('qr-titulo')?.value.trim();
  const texto  = $('qr-texto')?.value.trim();
  if (!titulo || !texto) { toast('Preencha título e texto.', 'err'); return; }
  if (qrEditId) {
    const { error } = await supabase.from('quick_replies').update({ titulo, texto }).eq('id', qrEditId);
    if (error) { toast('Erro ao salvar.', 'err'); return; }
  } else {
    const { error } = await supabase.from('quick_replies').insert({ titulo, texto });
    if (error) { toast('Erro ao salvar.', 'err'); return; }
  }
  toast('Resposta salva.', 'ok');
  $('quick-reply-form').style.display = 'none';
  qrEditId = null;
  renderQuickRepliesPanel();
}

async function deleteQuickReply(id) {
  if (!confirm('Excluir esta resposta rápida?')) return;
  await supabase.from('quick_replies').delete().eq('id', id);
  toast('Excluída.', 'ok');
  renderQuickRepliesPanel();
}

// ── Labels CRUD ───────────────────────────────────────────────────────────────
let labelEditId = null;

async function loadLabels() {
  if (!isLive) return;
  const { data } = await supabase.from('labels').select('*').order('nome');
  labelsData = data || [];
}

async function renderLabelsPanel() {
  const grid = $('labels-grid'); if (!grid) return;
  await loadLabels();
  if (!labelsData.length) {
    grid.innerHTML = '<div class="labels-empty">Nenhuma etiqueta criada ainda. Clique em "+ Nova etiqueta".</div>';
    return;
  }
  grid.innerHTML = labelsData.map(l => `
    <div class="label-admin-chip" style="border-color:${esc(l.cor)}33;background:${esc(l.cor)}11">
      <span class="label-dot" style="background:${esc(l.cor)}"></span>
      <span class="label-admin-nome">${esc(l.nome)}</span>
      <button class="btn-icon label-e" data-id="${esc(l.id)}" title="Editar">✏</button>
      <button class="btn-icon btn-destructive label-d" data-id="${esc(l.id)}" title="Excluir">${ICO_TRASH}</button>
    </div>`).join('');
  grid.querySelectorAll('.label-e').forEach(btn => btn.addEventListener('click', () => openLabelForm(btn.dataset.id)));
  grid.querySelectorAll('.label-d').forEach(btn => btn.addEventListener('click', () => deleteLabel(btn.dataset.id)));
}

function openLabelForm(id) {
  const form = $('label-form'); if (!form) return;
  labelEditId = id || null;
  form.style.display = '';
  if (id) {
    const l = labelsData.find(l => l.id === id);
    if (l) { $('label-nome').value = l.nome; $('label-cor').value = l.cor; }
  } else {
    $('label-nome').value = ''; $('label-cor').value = '#CE9221';
  }
}

async function saveLabel() {
  const nome = $('label-nome')?.value.trim();
  const cor  = $('label-cor')?.value || '#CE9221';
  if (!nome) { toast('Preencha o nome da etiqueta.', 'err'); return; }
  if (labelEditId)
    await supabase.from('labels').update({ nome, cor }).eq('id', labelEditId);
  else
    await supabase.from('labels').insert({ nome, cor });
  toast('Etiqueta salva.', 'ok');
  $('label-form').style.display = 'none';
  labelEditId = null;
  renderLabelsPanel();
}

async function deleteLabel(id) {
  if (!confirm('Excluir esta etiqueta?')) return;
  await supabase.from('labels').delete().eq('id', id);
  toast('Excluída.', 'ok');
  renderLabelsPanel();
}

// ─── WHATSAPP CONTACTS (números desconhecidos) ───────────────────────

function loadContacts() {
  if (!isLive) { allContacts = []; contactsLoaded = true; renderChatsList(); return; }
  const doFetch = () =>
    supabase.from('whatsapp_contacts').select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .then(({ data }) => {
        allContacts = (data || []).map(c => ({
          id: c.id, phone: c.phone, push_name: c.push_name,
          instance_name: c.instance_name, unread_count: c.unread_count || 0,
          last_message_at: c.last_message_at, last_message_text: c.last_message_text,
        }));
        // Keep unread at 0 for the currently open contact chat
        if (chatActiveSide?.startsWith('contact:')) {
          const activeContactId = chatActiveSide.slice(8);
          const oc = allContacts.find(c => c.id === activeContactId);
          if (oc && (oc.unread_count || 0) > 0) {
            oc.unread_count = 0;
            supabase.from('whatsapp_contacts').update({ unread_count: 0 }).eq('id', activeContactId).then(null, console.error);
          }
        }
        contactsLoaded = true;
        if (activeTab === 'whatsapp' && activeWaSub === 'chats') renderChatsList();
      });
  doFetch();
  supabase.channel('wa_contacts_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_contacts' }, doFetch)
    .subscribe();
}

function buildChatSettingsPanelHTML(iSentHex, iRecvHex, iBubStyle, iFont) {
  const s = (v, cur, l) => `<option value="${v}"${cur===v?' selected':''}>${l}</option>`;
  const iFontSize = localStorage.getItem('fdv_chat_font_size') || '13';
  return `<div class="cp-bubble-settings" id="cp-bubble-settings" style="display:none">
    <div class="cp-bs-title">Estilo dos balões</div>
    <div class="cp-bs-row"><label>Estilo</label>
      <select id="cp-bubble-style" class="filter-select cp-style-sel">
        ${s('',iBubStyle,'Padrão')}${s('comic-book',iBubStyle,'Comic Book')}${s('minimalista',iBubStyle,'Minimalista')}
        ${s('retro',iBubStyle,'Retrô')}${s('neon',iBubStyle,'Neon')}${s('paper',iBubStyle,'Paper')}
        ${s('glass',iBubStyle,'Glassmorphism')}${s('bubble',iBubStyle,'Bubble')}${s('sharp',iBubStyle,'Sharp')}
        ${s('shadow',iBubStyle,'Shadow')}${s('gradient',iBubStyle,'Gradient')}${s('typewriter',iBubStyle,'Typewriter')}
        ${s('sticker',iBubStyle,'Sticker')}
      </select></div>
    <div class="cp-bs-row" style="margin-top:6px"><label>Fonte</label>
      <select id="cp-chat-font" class="filter-select cp-font-sel">
        ${s('',iFont,'Padrão')}${s('inter',iFont,'Inter')}${s('roboto',iFont,'Roboto')}
        ${s('open-sans',iFont,'Open Sans')}${s('lato',iFont,'Lato')}${s('nunito',iFont,'Nunito')}
        ${s('poppins',iFont,'Poppins')}${s('raleway',iFont,'Raleway')}${s('montserrat',iFont,'Montserrat')}
        ${s('quicksand',iFont,'Quicksand')}${s('dm-sans',iFont,'DM Sans')}${s('playfair',iFont,'Playfair Display')}
        ${s('merriweather',iFont,'Merriweather')}${s('comic-neue',iFont,'Comic Neue')}
        ${s('space-mono',iFont,'Space Mono')}${s('pacifico',iFont,'Pacifico')}
      </select></div>
    <div class="cp-bs-row" style="margin-top:6px"><label>Tamanho</label>
      <div class="cp-font-size-wrap">
        <span class="cp-font-size-val" id="cp-font-size-label">${esc(iFontSize)}px</span>
        <input type="range" id="cp-font-size" min="11" max="22" step="1" value="${esc(iFontSize)}" class="cp-font-size-slider">
      </div></div>
    <div class="cp-bs-title" style="margin-top:10px">Cores dos balões</div>
    <div class="cp-bs-row"><label>Enviado</label><input type="color" id="cp-sent-color" class="cp-color-input" value="${esc(iSentHex)}"></div>
    <div class="cp-bs-row"><label>Recebido</label><input type="color" id="cp-recv-color" class="cp-color-input" value="${esc(iRecvHex)}"></div>
    <button class="btn-primary btn-sm" id="cp-bs-apply" style="width:100%;margin-top:8px">Aplicar cores</button>
  </div>`;
}

function bindChatSettingsEvents() {
  $('btn-chat-settings')?.addEventListener('click', e => {
    e.stopPropagation();
    const s = $('cp-bubble-settings');
    if (s) s.style.display = s.style.display === 'none' ? '' : 'none';
  });
  $('cp-bubble-style')?.addEventListener('change', e => {
    localStorage.setItem('fdv_bubble_style', e.target.value); applyBubbleStyle(); toast('Estilo salvo.', 'ok');
  });
  $('cp-chat-font')?.addEventListener('change', e => {
    localStorage.setItem('fdv_chat_font', e.target.value); applyChatFont(); toast('Fonte salva.', 'ok');
  });
  $('cp-font-size')?.addEventListener('input', e => {
    const val = e.target.value;
    const lbl = $('cp-font-size-label');
    if (lbl) lbl.textContent = val + 'px';
    localStorage.setItem('fdv_chat_font_size', val);
    applyChatFontSize();
  });
  $('cp-bs-apply')?.addEventListener('click', () => {
    const sentHex = $('cp-sent-color')?.value || '#CE9221';
    const recvHex = $('cp-recv-color')?.value || '#2d444a';
    localStorage.setItem('fdv_bubble_sent_hex', sentHex);
    localStorage.setItem('fdv_bubble_recv_hex', recvHex);
    applyBubbleColors();
    if ($('cp-bubble-settings')) $('cp-bubble-settings').style.display = 'none';
    toast('Cores dos balões salvas.', 'ok');
  });
  document.addEventListener('click', function closeBubbleSettings(e) {
    const s = $('cp-bubble-settings');
    if (s && !s.contains(e.target) && e.target.id !== 'btn-chat-settings') s.style.display = 'none';
  }, { once: true });
}

function openContactChat(contactId) {
  chatActiveSide = 'contact:' + contactId;
  const contact = allContacts.find(c => c.id === contactId); if (!contact) return;
  contact.unread_count = 0;
  if (isLive)
    supabase.from('whatsapp_contacts').update({ unread_count: 0 }).eq('id', contactId).then(null, console.error);
  renderChatsList();

  const panel    = $('chats-panel'); if (!panel) return;
  const pushName = contact.push_name || '';
  const phone    = contact.phone || '';
  const initials = pushName
    ? pushName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : phone.slice(-4);
  const iSentHex = localStorage.getItem('fdv_bubble_sent_hex') || '#CE9221';
  const iRecvHex = localStorage.getItem('fdv_bubble_recv_hex') || '#2d444a';
  const iBubStyle = localStorage.getItem('fdv_bubble_style') || '';
  const iFont     = localStorage.getItem('fdv_chat_font') || '';

  panel.innerHTML = `
    <div class="cp-header">
      <div class="cp-header-left">
        <div class="cp-avatar" id="cp-avatar-wrap">
          <span class="cp-initials" style="background:rgba(143,160,162,.20)">${esc(initials)}</span>
          <img class="cp-photo" style="display:none" alt="${esc(initials)}">
        </div>
        <div class="cp-header-info">
          <div class="cp-name">${esc(pushName || phone)}</div>
          <div class="cp-phone">${esc(phone)}</div>
          <div class="cp-status" id="cp-status"></div>
        </div>
      </div>
      <div class="cp-header-right">
        <select id="central-chat-instance" class="filter-select chat-inst-sel"></select>
        <button class="btn-ghost cp-header-btn" id="btn-chat-search" title="Buscar na conversa">
          <i data-lucide="search" style="width:14px;height:14px"></i>
        </button>
        <button class="btn-ghost cp-header-btn cp-settings-btn" id="btn-chat-settings" title="Personalizar">
          <i data-lucide="palette" style="width:14px;height:14px"></i><span>Personalizar</span>
        </button>
        ${buildChatSettingsPanelHTML(iSentHex, iRecvHex, iBubStyle, iFont)}
        <button class="btn-primary cp-header-btn" id="btn-add-as-lead">
          <i data-lucide="user-plus" style="width:14px;height:14px"></i><span>Adicionar como lead</span>
        </button>
      </div>
    </div>
    <div class="chat-search-bar" id="chat-search-bar" style="display:none">
      <input class="chat-search-input" id="chat-msg-search" placeholder="Buscar na conversa…">
      <button class="btn-ghost btn-icon chat-search-close" id="btn-chat-search-close">✕</button>
    </div>
    <div class="chat-messages" id="central-chat-messages">
      <div class="chat-empty" id="central-chat-empty">
        <span class="chat-empty-hint">Nenhuma mensagem ainda.</span>
      </div>
    </div>
    <div class="chat-typing-indicator" id="chat-typing" style="display:none">
      <div class="chat-typing-dots"><span></span><span></span><span></span></div>
    </div>
    <div class="chat-input-bar">${buildChatInputBarHTML('central-chat-input')}</div>`;

  lucide.createIcons({ nodes: [panel] });
  populateChatInstanceSelector('central-chat-instance');
  startChatListener(contactId, 'central-chat-messages', 'central-chat-empty', true);

  const instance = contact.instance_name || waInstances[0]?.instanceName || '';
  if (phone && instance) updateChatHeaderPhoto(phone, instance);

  $('btn-central-send').addEventListener('click', () =>
    sendContactMessage('central-chat-input', 'central-chat-instance', contactId)
  );
  $('central-chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendContactMessage('central-chat-input', 'central-chat-instance', contactId); }
    if (e.key === 'Escape') closeQuickRepliesMenu();
  });
  $('central-chat-input').addEventListener('input', e => {
    const val = e.target.value;
    if (val.startsWith('/')) showQuickRepliesMenu(val.slice(1));
    else closeQuickRepliesMenu();
  });
  bindChatSettingsEvents();
  bindChatSearchEvents();
  bindChatFormatEvents('central-chat-input');
  bindChatAttachEvents('central-chat-instance', contact.phone, false, contactId);
  bindChatEmojiEvents('central-chat-input');
  bindChatMicEvents('central-chat-instance', contact.phone, false, contactId);
  $('central-chat-messages').addEventListener('click', e => {
    const rb = e.target.closest('.chat-reply-btn');
    if (rb) { const m = chatMessages.find(x => x.id === rb.dataset.msgId); if (m) setReplyTo(m); }
    const db = e.target.closest('.chat-delete-btn');
    if (db) deleteChatMessage(db.dataset.msgId);
    const fb = e.target.closest('.chat-forward-btn');
    if (fb) openForwardModal(fb.dataset.msgId);
    const cb = e.target.closest('.chat-copy-btn');
    if (cb) { const m = chatMessages.find(x => x.id === cb.dataset.msgId); if (m) copyChatMsg(m); }
    const sb = e.target.closest('.chat-star-btn');
    if (sb) toggleStarMessage(sb.dataset.msgId);
  });
  $('btn-reply-cancel')?.addEventListener('click', clearReplyTo);
  $('btn-add-as-lead').addEventListener('click', () => openAddAsLeadModal(contactId));
}

async function sendContactMessage(inputId, instSelectId, contactId) {
  const contact  = allContacts.find(c => c.id === contactId); if (!contact) return;
  const input    = $(inputId);
  const instSel  = $(instSelectId);
  const text     = input?.value.trim();
  const instName = instSel?.value;
  if (!text)     { toast('Digite uma mensagem.', 'err'); return; }
  if (!instName) { toast('Selecione uma instância.', 'err'); return; }
  const phone = contact.phone;
  if (!phone)    { toast('Número não disponível.', 'err'); return; }
  const replyRef = chatReplyTo ? { reply_to_text: chatReplyTo.text, reply_to_sender: chatReplyTo.sender } : {};
  input.value = '';
  closeQuickRepliesMenu();
  clearReplyTo();
  if (!isLive) return;
  try {
    await fetchEvolution(`/message/sendText/${instName}`, 'POST', {
      number: phone, text, options: { delay: 1200 },
    });
  } catch (e) { toast('Erro ao enviar: ' + e.message, 'err'); return; }
  const now = new Date().toISOString();
  await supabase.from('lead_messages').insert({
    contact_id: contactId, text, direction: 'sent', instance_name: instName, timestamp: now,
    ...replyRef,
  });
  await supabase.from('whatsapp_contacts').update({
    last_message_at: now, last_message_text: text.slice(0, 200), instance_name: instName,
  }).eq('id', contactId);
}

function openAddAsLeadModal(contactId) {
  const contact = allContacts.find(c => c.id === contactId); if (!contact) return;
  $('add-lead-contact-id').value = contactId;
  $('add-lead-nome').value       = contact.push_name || '';
  $('add-lead-celular').value    = contact.phone || '';
  $('add-lead-backdrop').classList.add('open');
}

function closeAddAsLeadModal() {
  $('add-lead-backdrop').classList.remove('open');
}

async function confirmAddAsLead() {
  const contactId = $('add-lead-contact-id').value;
  const nome      = $('add-lead-nome').value.trim();
  const celular   = $('add-lead-celular').value.trim();
  if (!nome)    { toast('Preencha o nome.', 'err'); return; }
  if (!celular) { toast('Preencha o celular.', 'err'); return; }
  if (!isLive)  { toast('Não disponível no modo demo.', 'err'); return; }
  const contact = allContacts.find(c => c.id === contactId); if (!contact) return;
  const today   = new Date().toISOString().split('T')[0];

  const { data: newLead, error: leadErr } = await supabase.from('leads').insert({
    nome, celular, status: 'Novo', origem: 'WHATSAPP', datachegada: today,
    last_message_instance: contact.instance_name,
    last_message_at:       contact.last_message_at,
    last_message_text:     contact.last_message_text,
  }).select('id').single();
  if (leadErr) { toast('Erro ao criar lead: ' + leadErr.message, 'err'); return; }

  await supabase.from('lead_messages')
    .update({ lead_id: newLead.id, contact_id: null })
    .eq('contact_id', contactId);

  await supabase.from('whatsapp_contacts').delete().eq('id', contactId);
  allContacts = allContacts.filter(c => c.id !== contactId);

  closeAddAsLeadModal();
  toast(`${nome} adicionado(a) como lead.`, 'ok');

  await fetchLeads();
  openCentralChat(newLead.id);
}

// ─── EXCLUIR CONVERSA ────────────────────────────────────────────────

async function deleteConversation(type, id) {
  if (!confirm('Excluir todas as mensagens desta conversa? O lead não será removido.')) return;
  if (!isLive) { toast('Não disponível no modo demo.', 'err'); return; }
  if (type === 'lead') {
    const { error: e1 } = await supabase.from('lead_messages').delete().eq('lead_id', id);
    if (e1) { toast('Erro ao excluir mensagens: ' + e1.message, 'err'); return; }
    await supabase.from('leads').update({
      last_message_at: null, last_message_text: null, last_message_instance: null, unread_count: 0,
    }).eq('id', id);
    const lead = allLeads.find(l => l.id === id);
    if (lead) {
      lead.last_message_at = null; lead.lastMessageAt = null;
      lead.last_message_text = ''; lead.lastMessageText = '';
      lead.last_message_instance = null; lead.lastMessageInstance = null;
      lead.unread_count = 0; lead.unreadCount = 0;
    }
    if (chatActiveSide === id) {
      stopChatListener();
      chatActiveSide = null;
      const p = $('chats-panel');
      if (p) p.innerHTML = `<div class="chats-panel-empty"><div style="font-size:40px;margin-bottom:12px">💬</div><h3>Selecione uma conversa</h3><p>Clique em um contato à esquerda para abrir o chat.</p></div>`;
    }
  } else if (type === 'contact') {
    const { error: e2 } = await supabase.from('lead_messages').delete().eq('contact_id', id);
    if (e2) { toast('Erro ao excluir mensagens: ' + e2.message, 'err'); return; }
    await supabase.from('whatsapp_contacts').delete().eq('id', id);
    allContacts = allContacts.filter(c => c.id !== id);
    if (chatActiveSide === 'contact:' + id) {
      stopChatListener();
      chatActiveSide = null;
      const p = $('chats-panel');
      if (p) p.innerHTML = `<div class="chats-panel-empty"><div style="font-size:40px;margin-bottom:12px">💬</div><h3>Selecione uma conversa</h3><p>Clique em um contato à esquerda para abrir o chat.</p></div>`;
    }
  }
  toast('Conversa excluída.', 'ok');
  renderChatsList();
}

// ─── NOVA CONVERSA ───────────────────────────────────────────────────

function openNovaConversaModal() {
  const el = $('nova-conversa-numero');
  if (el) el.value = '';
  $('nova-conversa-backdrop').classList.add('open');
  if (el) setTimeout(() => el.focus(), 50);
}

function closeNovaConversaModal() {
  $('nova-conversa-backdrop').classList.remove('open');
}

async function confirmNovaConversa() {
  const rawNum = $('nova-conversa-numero')?.value.trim();
  if (!rawNum) { toast('Digite um número.', 'err'); return; }
  const phone = normalizePhoneForEvolution(rawNum);
  if (!phone) { toast('Número inválido. Use DDD + número (ex: 11 99999-9999).', 'err'); return; }

  const lead = allLeads.find(l => normalizePhoneForEvolution(l.celular) === phone);
  if (lead) {
    closeNovaConversaModal();
    openCentralChat(lead.id);
    return;
  }

  const contact = allContacts.find(c => c.phone === phone);
  if (contact) {
    closeNovaConversaModal();
    openContactChat(contact.id);
    return;
  }

  if (!isLive) { toast('Não disponível no modo demo.', 'err'); return; }
  const instance = waInstances.find(i => i.status === 'connected');
  if (!instance) { toast('Nenhuma instância conectada.', 'err'); return; }

  const { data: newContact, error } = await supabase.from('whatsapp_contacts').insert({
    phone,
    instance_name: instance.instanceName,
    last_message_at: new Date().toISOString(),
    last_message_text: '',
  }).select('id').single();
  if (error) { toast('Erro: ' + error.message, 'err'); return; }

  const newContactObj = {
    id: newContact.id, phone, push_name: '', instance_name: instance.instanceName,
    unread_count: 0, last_message_at: new Date().toISOString(), last_message_text: '',
  };
  allContacts.unshift(newContactObj);
  closeNovaConversaModal();
  renderChatsList();
  openContactChat(newContact.id);
}

// ─── WHATSAPP / EVOLUTION API ────────────────────────────────────────

const WA_RESPONSAVEIS = {
  muy:      { name: 'Muyane',   color: '#CE9221', bg: 'rgba(206,146,33,.12)' },
  fernanda: { name: 'Fernanda', color: '#CE9221', bg: 'rgba(206,146,33,.12)' },
  thomaz:   { name: 'Thomaz',   color: '#4db5c8', bg: 'rgba(77,181,200,.12)' },
  tati:     { name: 'Tati',     color: '#4caf8e', bg: 'rgba(76,175,142,.12)' },
};
const WA_FUNILS = { captacao: 'Captação', closer: 'Closer', 'pos-venda': 'Pós-venda', geral: 'Geral' };

function loadWaInstances() {
  if (!isLive) {
    waInstances = []; waInstancesLoaded = true; renderInstancias(); return;
  }
  const fetch = () => supabase.from('whatsapp_instances').select('*')
    .then(({ data }) => {
      waInstances = (data || []).map(mapWaInstance);
      waInstancesLoaded = true;
      if (activeTab === 'whatsapp' && activeWaSub === 'instancias') renderInstancias();
      if ($('instancias-modal-backdrop')?.classList.contains('open')) renderInstanciasModal();
    });
  fetch();
  supabase.channel('wa_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_instances' }, fetch)
    .subscribe();
}

function switchWaSub(sub) {
  activeWaSub = sub;
  document.querySelectorAll('#tab-whatsapp .sub-panel').forEach(p => p.style.display = 'none');
  const panel = $('sub-' + sub); if (panel) panel.style.display = '';
  document.querySelectorAll('#tab-whatsapp .sub-link[data-sub]').forEach(l =>
    l.classList.toggle('active', l.dataset.sub === sub)
  );
  if      (sub === 'instancias') renderInstancias();
  else if (sub === 'chats')      renderCentralChats();
  else if (sub === 'respostas')  renderQuickRepliesPanel();
  else if (sub === 'etiquetas')  renderLabelsPanel();
}

function renderInstancias() {
  const grid    = $('wa-instances-grid');
  const loading = $('wa-loading');
  if (!grid) return;
  if (!waInstancesLoaded) { if (loading) loading.style.display = ''; return; }
  if (loading) loading.style.display = 'none';
  renderWaStats();
  const permitted = getPermittedInstances();
  if (permitted.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-ico">${_S(`<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>`,36)}</div>
      <h3>Nenhuma instância configurada</h3>
      <p>Clique em "+ Conectar número" para adicionar seu primeiro número WhatsApp.</p>
    </div>`; return;
  }
  grid.innerHTML = permitted.map(renderInstanceCard).join('');
}

function renderWaStats() {
  const el = $('wa-stats'); if (!el) return;
  const total      = waInstances.length;
  const connected  = waInstances.filter(i => i.status === 'connected').length;
  const discon     = waInstances.filter(i => i.status === 'disconnected').length;
  const awaiting   = waInstances.filter(i => i.status === 'awaiting_qr').length;
  el.innerHTML = `
    <div class="stat-card"><div class="stat-top"><span class="stat-label">Total</span><span class="stat-icon">◈</span></div><strong class="stat-num">${total}</strong><span class="stat-sub">instâncias</span></div>
    <div class="stat-card accent-green"><div class="stat-top"><span class="stat-label">Conectadas</span><span class="stat-icon">◉</span></div><strong class="stat-num">${connected}</strong><span class="stat-sub">online</span></div>
    <div class="stat-card accent-marsala"><div class="stat-top"><span class="stat-label">Desconectadas</span><span class="stat-icon">✕</span></div><strong class="stat-num">${discon}</strong><span class="stat-sub">offline</span></div>
    <div class="stat-card accent-gold"><div class="stat-top"><span class="stat-label">Aguardando QR</span><span class="stat-icon">◷</span></div><strong class="stat-num">${awaiting}</strong><span class="stat-sub">escanear</span></div>`;
}

function renderInstanceCard(inst) {
  const resp = WA_RESPONSAVEIS[inst.responsavel] || { name: inst.responsavel || '—', color: '#8fa0a2', bg: 'rgba(143,160,162,.12)' };
  const funil = WA_FUNILS[inst.funil] || inst.funil || '—';
  const ST = {
    connected:    { label: 'Conectado',     cls: 'wa-status--connected' },
    disconnected: { label: 'Desconectado',  cls: 'wa-status--disconnected' },
    awaiting_qr:  { label: 'Aguardando QR', cls: 'wa-status--awaiting' },
  };
  const st = ST[inst.status] || { label: inst.status || '—', cls: '' };
  const lastAct = inst.lastActivity
    ? new Date(inst.lastActivity.seconds ? inst.lastActivity.seconds * 1000 : inst.lastActivity)
        .toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })
    : 'Nunca';
  const actionBtn = inst.status === 'connected'
    ? `<button class="btn-ghost btn-sm wa-btn-disconnect" data-id="${esc(inst.id)}">Desconectar</button>`
    : `<button class="btn-primary btn-sm wa-btn-reconnect" data-id="${esc(inst.id)}">Reconectar</button>`;
  return `<div class="wa-instance-card">
    <div class="wa-inst-header">
      <div class="wa-inst-name-wrap">
        <span class="wa-inst-icon">${_S(`<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>`,22)}</span>
        <div>
          <div class="wa-inst-name">${esc(inst.displayName || inst.instanceName)}</div>
          <div class="wa-inst-id">${esc(inst.instanceName)}</div>
        </div>
      </div>
      <span class="wa-status ${st.cls}">${st.label}</span>
    </div>
    <div class="wa-inst-meta">
      <div class="wa-inst-meta-item">
        <span class="wa-inst-meta-lbl">Responsável</span>
        <span class="wa-inst-chip" style="color:${resp.color};background:${resp.bg};border-color:${resp.color}40">${esc(resp.name)}</span>
      </div>
      <div class="wa-inst-meta-item">
        <span class="wa-inst-meta-lbl">Funil</span>
        <span class="wa-inst-chip">${esc(funil)}</span>
      </div>
      <div class="wa-inst-meta-item">
        <span class="wa-inst-meta-lbl">Número</span>
        <span class="wa-inst-phone">${esc(inst.phoneNumber || '—')}</span>
      </div>
      <div class="wa-inst-meta-item">
        <span class="wa-inst-meta-lbl">Última atividade</span>
        <span class="wa-inst-phone">${lastAct}</span>
      </div>
    </div>
    <div class="wa-inst-actions">
      ${actionBtn}
      <button class="btn-icon wa-btn-delete btn-destructive" data-id="${esc(inst.id)}" title="Excluir instância">${ICO_TRASH}</button>
    </div>
  </div>`;
}

// ── Instâncias Modal ─────────────────────────────────────────────────

function openInstanciasModal() {
  renderInstanciasModal();
  $('instancias-modal-backdrop').classList.add('open');
}

function closeInstanciasModal() {
  $('instancias-modal-backdrop').classList.remove('open');
}

function renderInstanciasModal() {
  const list = $('instancias-modal-list');
  if (!list) return;
  if (!waInstancesLoaded) {
    list.innerHTML = '<div class="im-loading"><div class="spinner"></div><span>Carregando…</span></div>';
    return;
  }
  if (waInstances.length === 0) {
    list.innerHTML = '<div class="im-empty"><span style="font-size:32px">📱</span><p>Nenhuma instância configurada.<br>Clique em "+ Conectar novo número" para começar.</p></div>';
    return;
  }
  const ST = {
    connected:    { label: 'Conectado',     cls: 'wa-status--connected' },
    disconnected: { label: 'Desconectado',  cls: 'wa-status--disconnected' },
    awaiting_qr:  { label: 'Aguardando QR', cls: 'wa-status--awaiting' },
  };
  list.innerHTML = waInstances.map(inst => {
    const resp = WA_RESPONSAVEIS[inst.responsavel] || { name: inst.responsavel || '—', color: '#8fa0a2', bg: 'rgba(143,160,162,.12)' };
    const st   = ST[inst.status] || { label: inst.status || '—', cls: '' };
    const actionBtn = inst.status === 'connected'
      ? `<button class="btn-ghost btn-sm im-btn-disconnect" data-id="${esc(inst.id)}">Desconectar</button>`
      : `<button class="btn-ghost btn-sm im-btn-reconnect" data-id="${esc(inst.id)}">Reconectar</button>`;
    return `<div class="im-row">
      <div class="im-row-info">
        <span class="im-row-icon">${_S(`<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>`,20)}</span>
        <div class="im-row-details">
          <span class="im-row-name">${esc(inst.displayName || inst.instanceName)}</span>
          <span class="im-row-phone">${esc(inst.phoneNumber || inst.instanceName)}</span>
        </div>
      </div>
      <span class="im-row-resp" style="color:${resp.color};background:${resp.bg};border-color:${resp.color}40">${esc(resp.name)}</span>
      <span class="wa-status ${st.cls}">${st.label}</span>
      <div class="im-row-actions">
        ${actionBtn}
        <button class="btn-icon im-btn-delete btn-destructive" data-id="${esc(inst.id)}" title="Excluir instância">${ICO_TRASH}</button>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('.im-btn-disconnect').forEach(btn =>
    btn.addEventListener('click', () => disconnectInstance(btn.dataset.id)));
  list.querySelectorAll('.im-btn-reconnect').forEach(btn =>
    btn.addEventListener('click', () => { closeInstanciasModal(); openQRModal(btn.dataset.id); }));
  list.querySelectorAll('.im-btn-delete').forEach(btn =>
    btn.addEventListener('click', () => deleteInstance(btn.dataset.id)));
}

// ── QR Modal ──────────────────────────────────────────────────────────

function openQRModal(instanceId = null) {
  qrInstanceId = instanceId;
  stopQRTimer(); stopQRPolling();
  if (instanceId) {
    const inst = waInstances.find(i => i.id === instanceId);
    $('qr-title').textContent    = `Reconectar — ${inst?.displayName || 'instância'}`;
    $('qr-subtitle').textContent = inst?.instanceName || '';
    $('qr-confirmar').style.display = 'none';
    qrGoToStep('qr');
    triggerQRGenerate(inst?.instanceName);
  } else {
    $('qr-title').textContent    = 'Conectar número';
    $('qr-subtitle').textContent = 'Preencha os dados da instância';
    $('qr-display-name').value = ''; $('qr-instance-name').value = '';
    $('qr-responsavel').value  = ''; $('qr-funil').value = '';
    $('qr-confirmar').style.display = '';
    $('qr-confirmar').textContent   = 'Avançar →';
    qrGoToStep('form');
  }
  $('qr-backdrop').classList.add('open');
}

function closeQRModal() {
  $('qr-backdrop').classList.remove('open');
  stopQRTimer(); stopQRPolling(); qrInstanceId = null;
}

function qrGoToStep(step) {
  $('qr-step-form').style.display = step === 'form' ? '' : 'none';
  $('qr-step-qr').style.display   = step === 'qr'   ? '' : 'none';
  if (step === 'qr') $('qr-subtitle').textContent = 'Escaneie com o WhatsApp';
}

function setQRState(state) {
  ['loading','waiting','connected','expired','error'].forEach(s => {
    const el = $(`qr-state-${s}`); if (el) el.style.display = s === state ? '' : 'none';
  });
}

async function confirmQRStep() {
  if ($('qr-step-form').style.display !== 'none') {
    const displayName  = $('qr-display-name').value.trim();
    const instanceName = $('qr-instance-name').value.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
    if (!displayName || !instanceName) { toast('Preencha nome e ID da instância.','err'); return; }
    const btn = $('qr-confirmar');
    btn.disabled = true; btn.textContent = 'Criando…';
    try {
      const data = {
        instanceName, displayName,
        responsavel: $('qr-responsavel').value,
        funil:       $('qr-funil').value,
        status: 'awaiting_qr', phoneNumber: '', lastActivity: null,
        createdAt: new Date().toISOString(),
      };
      if (isLive) {
        const { data: inst, error: instErr } = await supabase.from('whatsapp_instances').insert({
          instance_name: instanceName, display_name: displayName,
          responsavel: $('qr-responsavel').value, funil: $('qr-funil').value,
          status: 'awaiting_qr', phone_number: '', last_activity: null,
        }).select().single();
        if (instErr) throw instErr;
        qrInstanceId = inst.id;
      } else {
        qrInstanceId = 'local-' + Date.now();
        waInstances.push({ id: qrInstanceId, ...data });
        renderInstancias();
      }
      $('qr-confirmar').style.display = 'none';
      qrGoToStep('qr');
      await triggerQRGenerate(instanceName);
    } catch(e) { console.error(e); toast('Erro ao criar instância.','err'); }
    finally    { btn.disabled = false; }
  }
}

async function triggerQRGenerate(instanceName) {
  setQRState('loading'); stopQRTimer(); stopQRPolling();
  const imgEl = $('qr-img');
  if (imgEl) imgEl.style.display = '';
  try {
    // 403 = instância já existe — ignora e vai direto ao connect
    try {
      await fetchEvolution('/instance/create', 'POST', { instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' });
    } catch(createErr) {
      if (!createErr.message.includes('403')) throw createErr;
    }
    const res = await fetchEvolution(`/instance/connect/${instanceName}`);
    // v2 retorna res.base64 diretamente; v1/create retorna res.qrcode.base64
    const qrBase64 = res?.base64 || res?.qrcode?.base64;
    if (qrBase64) {
      imgEl.src = qrBase64;
      setQRState('waiting'); startQRTimer(instanceName); startQRPolling(instanceName);
    } else { throw new Error('sem QR'); }
  } catch(e) {
    console.warn('[FDV] Evolution API (mock):', e.message);
    if (imgEl) { imgEl.style.display = 'none'; }
    const wrap = document.querySelector('.qr-image-wrap');
    if (wrap && !wrap.querySelector('.qr-mock-msg')) {
      const p = document.createElement('p');
      p.className = 'qr-mock-msg';
      p.innerHTML = 'Evolution API não conectada.<br><code>EVOLUTION_API_URL</code> = <code>' + EVOLUTION_API_URL + '</code>';
      wrap.appendChild(p);
    }
    setQRState('waiting'); startQRTimer(instanceName);
  }
}

async function fetchEvolution(path, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${EVOLUTION_API_URL}${path}`, opts);
  if (!res.ok) {
    let detail = `Evolution API ${res.status}`;
    try {
      const err = await res.json();
      const msgs = err?.response?.message;
      if (Array.isArray(msgs) && msgs[0]?.exists === false) {
        detail = 'Número não registrado no WhatsApp';
      } else if (Array.isArray(msgs) && typeof msgs[0] === 'string') {
        detail = msgs[0];
      } else if (typeof msgs === 'string') {
        detail = msgs;
      }
    } catch { /* keep default */ }
    throw new Error(detail);
  }
  return res.json();
}

function startQRTimer(instanceName) {
  qrSecondsLeft = 60;
  const el = $('qr-timer-count'); if (el) el.textContent = qrSecondsLeft;
  stopQRTimer();
  qrTimerInterval = setInterval(() => {
    qrSecondsLeft--;
    const c = $('qr-timer-count'); if (c) c.textContent = qrSecondsLeft;
    if (qrSecondsLeft <= 0) { stopQRTimer(); stopQRPolling(); setQRState('expired'); }
  }, 1000);
}
function stopQRTimer()   { if (qrTimerInterval)   { clearInterval(qrTimerInterval);   qrTimerInterval   = null; } }

function startQRPolling(instanceName) {
  stopQRPolling();
  qrPollingInterval = setInterval(async () => {
    try {
      const res = await fetchEvolution(`/instance/connectionState/${instanceName}`);
      const state = res?.instance?.state || res?.state;
      if (state === 'open') {
        stopQRPolling(); stopQRTimer();
        $('qr-connected-phone').textContent = 'Número conectado com sucesso.';
        setQRState('connected');
        if (isLive && qrInstanceId && !qrInstanceId.startsWith('local-')) {
          await supabase.from('whatsapp_instances').update({ status: 'connected', last_activity: new Date().toISOString() }).eq('id', qrInstanceId);
        } else {
          const inst = waInstances.find(i => i.id === qrInstanceId);
          if (inst) inst.status = 'connected';
        }
        setTimeout(() => closeQRModal(), 2500);
      }
    } catch(e) { /* ignore */ }
  }, 3000);
}
function stopQRPolling() { if (qrPollingInterval) { clearInterval(qrPollingInterval); qrPollingInterval = null; } }

async function disconnectInstance(id) {
  const inst = waInstances.find(i => i.id === id); if (!inst) return;
  if (!confirm(`Desconectar "${inst.displayName}"?`)) return;
  try { await fetchEvolution(`/instance/logout/${inst.instanceName}`, 'DELETE'); } catch(e) { /* mock */ }
  if (isLive && !id.startsWith('local-')) {
    await supabase.from('whatsapp_instances').update({ status: 'disconnected' }).eq('id', id);
  } else { inst.status = 'disconnected'; renderInstancias(); }
  toast(`${inst.displayName} desconectada.`, 'ok');
}

async function deleteInstance(id) {
  const inst = waInstances.find(i => i.id === id); if (!inst) return;
  if (!confirm(`Excluir "${inst.displayName}"? Esta ação não pode ser desfeita.`)) return;
  try { await fetchEvolution(`/instance/delete/${inst.instanceName}`, 'DELETE'); } catch(e) { /* mock */ }
  if (isLive && !id.startsWith('local-')) {
    await supabase.from('whatsapp_instances').delete().eq('id', id);
  } else { waInstances = waInstances.filter(x => x.id !== id); renderInstancias(); }
  toast(`"${inst.displayName}" excluída.`, 'ok');
}

// ─── DRILL-DOWN DE RELATÓRIOS ────────────────────────────────────────
function openDrillDown(title, leads) {
  _drillTitle = title;
  _drillLeads = leads;
  _drillStatusFilt = '';
  $('drill-title').textContent = title;
  $('drill-subtitle').textContent = `${leads.length} lead${leads.length !== 1 ? 's' : ''}`;
  renderDrillDownBody();
  $('drill-backdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeDrillDown() {
  $('drill-backdrop').classList.remove('open');
  document.body.style.overflow = '';
}
function renderDrillDownBody() {
  const all = _drillLeads;
  const shown = _drillStatusFilt
    ? all.filter(l => _drillStatusFilt === 'venda' ? l.kanban_column === 'venda_ganha' : l.status === _drillStatusFilt)
    : all;

  const cnt = s => all.filter(l => s === 'venda' ? l.kanban_column === 'venda_ganha' : l.status === s).length;
  const vendas  = cnt('venda');
  const taxaLV  = all.length ? pct(vendas, all.length) : 0;
  const hasUTM  = all.some(l => l.utm_campaign || l.utm_source || l.utm_content || l.utm_medium);

  const pills = [
    { val:'',          lbl:'Todos' },
    { val:'aguardando',lbl:'Novos' },
    { val:'qualificado',lbl:'Qualificados' },
    { val:'agendado',  lbl:'Agendados' },
    { val:'descartado',lbl:'Descartados' },
    { val:'venda',     lbl:'Vendas' },
  ];

  const utmCols = hasUTM ? '<th>Campanha</th><th>Conjunto</th><th>Anúncio</th><th>Origem UTM</th>' : '';
  const utmCellsFn = l => hasUTM
    ? `<td>${esc(l.utm_campaign||'—')}</td><td>${esc(l.utm_medium||'—')}</td><td>${esc(l.utm_content||'—')}</td><td>${esc(l.utm_source||'—')}</td>`
    : '';
  const colspan = hasUTM ? 9 : 5;

  $('drill-body').innerHTML = `
    <div class="drill-stats">
      <div class="drill-stat"><div class="drill-stat-val">${all.length}</div><div class="drill-stat-lbl">Total</div></div>
      <div class="drill-stat"><div class="drill-stat-val">${cnt('aguardando')}</div><div class="drill-stat-lbl">Novos</div></div>
      <div class="drill-stat"><div class="drill-stat-val">${cnt('qualificado')}</div><div class="drill-stat-lbl">Qualif.</div></div>
      <div class="drill-stat"><div class="drill-stat-val">${cnt('agendado')}</div><div class="drill-stat-lbl">Agend.</div></div>
      <div class="drill-stat"><div class="drill-stat-val">${cnt('descartado')}</div><div class="drill-stat-lbl">Desc.</div></div>
      <div class="drill-stat ds-green"><div class="drill-stat-val">${vendas}</div><div class="drill-stat-lbl">Vendas</div></div>
      <div class="drill-stat ds-gold"><div class="drill-stat-val">${taxaLV}%</div><div class="drill-stat-lbl">Conv.</div></div>
    </div>
    <div class="drill-filter-bar">
      ${pills.map(p => `<button class="cqf-btn${p.val === _drillStatusFilt ? ' cqf-btn--active' : ''}" data-drf="${p.val}">${p.lbl}</button>`).join('')}
    </div>
    <div class="drill-table-wrap">
      <table class="rel-table drill-table">
        <thead><tr>
          <th>Nome</th><th>Data entrada</th><th>Status</th><th>Renda</th><th>Closer</th>${utmCols}
        </tr></thead>
        <tbody>
          ${!shown.length
            ? `<tr><td colspan="${colspan}" style="text-align:center;color:var(--t3);padding:24px">Nenhum lead neste filtro.</td></tr>`
            : shown.map(l => `<tr>
                <td><button class="nome-link" data-perfil="${l.id}">${esc(l.nome||'—')}</button></td>
                <td>${fmtDate(l.datachegada)}</td>
                <td>${badgeStatus(l.status)}</td>
                <td>${esc(l.renda||'—')}</td>
                <td>${esc(CLOSERS[l.closer]?.name||l.closer||'—')}</td>
                ${utmCellsFn(l)}
              </tr>`).join('')
          }
        </tbody>
      </table>
    </div>`;

  $('drill-body').querySelectorAll('[data-drf]').forEach(btn =>
    btn.addEventListener('click', () => { _drillStatusFilt = btn.dataset.drf; renderDrillDownBody(); })
  );
  $('drill-body').querySelectorAll('[data-perfil]').forEach(btn =>
    btn.addEventListener('click', () => {
      const l = allLeads.find(x => x.id === btn.dataset.perfil);
      if (l) { closeDrillDown(); openPerfil(l); }
    })
  );
}
function exportDrillCSV() {
  const hasUTM = _drillLeads.some(l => l.utm_campaign || l.utm_source || l.utm_content);
  const hdr = ['Nome','Celular','Email','Status','Renda','Closer','Data de entrada'];
  if (hasUTM) hdr.push('utm_campaign','utm_medium','utm_content','utm_source');
  const rows = _drillLeads.map(l => {
    const r = [l.nome||'',l.celular||'',l.email||'',l.status||'',l.renda||'',
                CLOSERS[l.closer]?.name||l.closer||'',l.datachegada||''];
    if (hasUTM) r.push(l.utm_campaign||'',l.utm_medium||'',l.utm_content||'',l.utm_source||'');
    return r;
  });
  const csv = [hdr,...rows].map(r => r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8;' })),
    download: `fdv-${_drillTitle.replace(/[^a-z0-9]/gi,'_')}-${new Date().toISOString().slice(0,10)}.csv`,
  });
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
}
function exportDrillPDF() {
  const hasUTM = _drillLeads.some(l => l.utm_campaign || l.utm_source || l.utm_content);
  const hdr = ['Nome','Status','Renda','Closer','Data entrada'];
  if (hasUTM) hdr.push('Campanha','Conjunto','Anúncio','Origem UTM');
  const date = new Date().toLocaleDateString('pt-BR');
  const bodyRows = _drillLeads.map(l => {
    const cells = [esc(l.nome||'—'),esc(l.status||'—'),esc(l.renda||'—'),
                   esc(CLOSERS[l.closer]?.name||l.closer||'—'),esc(fmtDate(l.datachegada))];
    if (hasUTM) cells.push(esc(l.utm_campaign||'—'),esc(l.utm_medium||'—'),esc(l.utm_content||'—'),esc(l.utm_source||'—'));
    return `<tr>${cells.map(c=>`<td>${c}</td>`).join('')}</tr>`;
  }).join('');
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>FDV — ${esc(_drillTitle)}</title>
<style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;margin:0;padding:30px 36px;font-size:12px}
.hd{border-bottom:2px solid #CE9221;padding-bottom:10px;margin-bottom:18px}
.hd h1{margin:0;font-size:17px}.hd p{margin:4px 0 0;color:#555;font-size:11px}
table{width:100%;border-collapse:collapse;margin-top:10px}
th{background:#f0f0f0;font-size:9.5px;text-transform:uppercase;letter-spacing:.4px;padding:6px 9px;text-align:left;border:1px solid #ddd}
td{padding:6px 9px;border:1px solid #ddd;font-size:11px}
tr:nth-child(even) td{background:#fafafa}
.ft{margin-top:16px;font-size:9.5px;color:#999}</style>
</head><body>
<div class="hd"><h1>FDV — Relatório de Leads</h1>
<p>${esc(_drillTitle)} · Gerado em ${date} · ${_drillLeads.length} lead(s)</p></div>
<table><thead><tr>${hdr.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
<tbody>${bodyRows}</tbody></table>
<div class="ft">Faculdade da Vida · Sistema FDV · Exportado automaticamente</div>
<script>window.onload=()=>window.print()</script>
</body></html>`;
  const w = window.open('','_blank'); w.document.write(html); w.document.close();
}

// Filtra placeholders de automação não resolvidos (ex: {{campaign.name}})
function cleanUTM(v) { return (!v || /^\{\{.*\}\}$/.test(v.trim())) ? null : v; }

function exportRelatoriosCSV() {
  if (!_relBase.length) { toast('Sem dados para exportar.', 'err'); return; }
  _drillLeads = _relBase;
  _drillTitle = `relatorio-${new Date().toISOString().slice(0,10)}`;
  exportDrillCSV();
}
// Inicializa gráficos Chart.js em canvases off-screen para captura no PDF.
// Necessário porque o redesign removeu os canvases do DOM principal —
// os gráficos agora são SVG/CSS e não existem como <canvas>.
async function _ensureRelChartsReady(base) {
  if (typeof Chart === 'undefined') return;

  // Limpar instâncias anteriores
  [_relChart, _relChartDia].forEach(c => { try { c?.destroy(); } catch(e){} });
  _relChart = _relChartDia = null;

  // Criar container off-screen persistente
  let offEl = document.getElementById('_pdf-charts-offscreen');
  if (!offEl) {
    offEl = document.createElement('div');
    offEl.id = '_pdf-charts-offscreen';
    offEl.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:620px;opacity:0;pointer-events:none;';
    document.body.appendChild(offEl);
  }
  offEl.innerHTML = `
    <canvas id="rel-chart-comparativo" width="600" height="280"></canvas>
    <canvas id="rel-chart-dia"         width="600" height="200"></canvas>`;

  const CHART_DEF = {
    responsive: false,
    animation: { duration: 0 }, // render imediato sem animação
    plugins: { legend:{ labels:{ color:'#e8e4dc', font:{size:11} } }, tooltip:{ enabled:false } },
    scales: {
      x: { grid:{ color:'rgba(255,255,255,0.04)' }, ticks:{ color:'rgba(200,196,188,0.75)', font:{size:10} }, border:{ color:'rgba(255,255,255,0.06)' } },
      y: { grid:{ color:'rgba(255,255,255,0.04)' }, ticks:{ color:'rgba(200,196,188,0.75)', font:{size:10} }, border:{ color:'rgba(255,255,255,0.06)' }, beginAtZero:true },
    },
  };

  // Gráfico comparativo mensal
  const mesMap = {};
  base.forEach(l => {
    if(!l.datachegada) return;
    const m = l.datachegada.slice(0,7);
    if(!mesMap[m]) mesMap[m]={total:0,vendas:0};
    mesMap[m].total++;
    if(l.kanban_column==='venda_ganha') mesMap[m].vendas++;
  });
  const mesEntries = Object.entries(mesMap).sort((a,b)=>a[0].localeCompare(b[0]));
  if (mesEntries.length >= 1) {
    const ctx = document.getElementById('rel-chart-comparativo')?.getContext('2d');
    if (ctx) {
      _relChart = new Chart(ctx, { type:'bar', data:{
        labels: mesEntries.map(([m]) => fmtMes(m)),
        datasets:[
          { label:'Leads',  data:mesEntries.map(([,d])=>d.total),  backgroundColor:'rgba(77,181,200,0.90)', borderColor:'#4db5c8', borderWidth:1, borderRadius:3 },
          { label:'Vendas', data:mesEntries.map(([,d])=>d.vendas), backgroundColor:'rgba(206,146,33,0.88)', borderColor:'#CE9221', borderWidth:1, borderRadius:3 },
        ]
      }, options: CHART_DEF });
    }
  }

  // Gráfico por dia (stacked)
  const diaMap = {};
  base.forEach(l => {
    if(!l.datachegada) return;
    if(!diaMap[l.datachegada]) diaMap[l.datachegada]=0;
    diaMap[l.datachegada]++;
  });
  const diaEntries = Object.entries(diaMap).sort((a,b)=>a[0].localeCompare(b[0])).slice(-30);
  if (diaEntries.length >= 1) {
    const ctx2 = document.getElementById('rel-chart-dia')?.getContext('2d');
    if (ctx2) {
      _relChartDia = new Chart(ctx2, { type:'bar', data:{
        labels: diaEntries.map(([d])=>d.slice(5)),
        datasets:[{ label:'Leads', data:diaEntries.map(([,v])=>v), backgroundColor:'rgba(77,181,200,0.85)', borderWidth:0, borderRadius:2 }]
      }, options:{ ...CHART_DEF, plugins:{ legend:{ display:false } } }});
    }
  }

  // Aguardar 2 frames + 400ms para garantir render completo
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise(r => setTimeout(r, 400));
}

async function exportRelatoriosPDF() {
  if (!_relBase.length) renderRelatorios();
  if (!_relBase.length) { toast('Sem dados para exportar.', 'err'); return; }
  const base      = _relBase;

  toast('Preparando gráficos para PDF…', 'ok');

  // Forçar inicialização de todos os gráficos Chart.js antes de capturar
  await _ensureRelChartsReady(base);

  const dateGen   = new Date().toLocaleDateString('pt-BR');
  const periodoEl = $('rel-filter-mes');
  const periodoVal= periodoEl?.value || '';
  const periodo   = periodoVal ? fmtMes(periodoVal) : 'Todos os períodos';

  // Capturar canvases (agora garantidamente inicializados)
  const imgOf = id => { try { return document.getElementById(id)?.toDataURL?.('image/png')||''; } catch{return '';} };
  const imgDia = imgOf('rel-chart-dia');
  const imgMes = imgOf('rel-chart-comparativo');

  // Para gráficos que viraram CSS/HTML, gerar versão tabular no PDF
  const origemMap = {};
  base.forEach(l => {
    const o=l.origem||'Outros'; if(!origemMap[o]) origemMap[o]={total:0,vendas:0};
    origemMap[o].total++; if(l.kanban_column==='venda_ganha') origemMap[o].vendas++;
  });
  const origemRows = Object.entries(origemMap)
    .map(([o,d])=>([o, d.total, d.vendas, d.total?pct(d.vendas,d.total)+'%':'—']))
    .sort((a,b)=>b[1]-a[1]);

  const profMap={}, rendaMap={};
  base.forEach(l=>{
    const p=(l.profissao||'Não inf.').slice(0,30); profMap[p]=(profMap[p]||0)+1;
    const r=(l.renda||'Não inf.').slice(0,30);      rendaMap[r]=(rendaMap[r]||0)+1;
  });
  const profRows  = Object.entries(profMap).sort((a,b)=>b[1]-a[1]).slice(0,10)
                          .map(([n,c])=>[n, c, base.length?pct(c,base.length)+'%':'—']);
  const rendaRows = Object.entries(rendaMap).sort((a,b)=>b[1]-a[1]).slice(0,10)
                          .map(([n,c])=>[n, c, base.length?pct(c,base.length)+'%':'—']);

  // Métricas
  const vendas      = base.filter(l => l.kanban_column === 'venda_ganha');
  const agendados   = base.filter(l => l.dataagendamento);
  const realizadas  = base.filter(l => l.status === 'realizada');
  const taxaComp    = agendados.length  ? pct(realizadas.length, agendados.length)  : 0;
  const taxaConv    = realizadas.length ? pct(vendas.length,     realizadas.length) : 0;
  const fat         = vendas.reduce((s,l)=>s+parseValor(l.venda_ganha_dados?.valor),0);
  const ticket      = vendas.length ? fat/vendas.length : 0;
  const fmtC        = n => n ? n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : '—';
  const fmtPct      = n => n+'%';

  // Tabelas para PDF
  const closerRows = Object.entries((() => {
    const m = {}; realizadas.forEach(l => {
      const k = l.closer||'_sem'; if(!m[k]) m[k]={ag:0,re:0,ve:0,val:0};
      m[k].re++; if(l.kanban_column==='venda_ganha'){m[k].ve++;m[k].val+=parseValor(l.venda_ganha_dados?.valor);}
    }); agendados.forEach(l => { const k=l.closer||'_sem'; if(!m[k]) m[k]={ag:0,re:0,ve:0,val:0}; m[k].ag++; });
    return m;
  })()).map(([c,d])=>[CLOSERS[c]?.name||c, d.ag, d.re, d.ve, fmtC(d.val), d.re?pct(d.ve,d.re)+'%':'—']);

  const respRows = Object.entries((() => {
    const m = {}; agendados.forEach(l => {
      const r=l.agendadopor||'—'; if(!m[r]) m[r]={ag:0,re:0,ve:0};
      m[r].ag++; if(l.status==='realizada') m[r].re++; if(l.kanban_column==='venda_ganha') m[r].ve++;
    }); return m;
  })()).map(([r,d])=>[r, d.ag, d.re, d.ve]);

  const mkMetric = (lbl, val, color='#CE9221') =>
    `<div class="m"><div class="mv" style="color:${color}">${val}</div><div class="ml">${lbl}</div></div>`;
  const mkChart = (img, alt) => img
    ? `<img src="${img}" style="width:100%;max-height:220px;object-fit:contain;margin:10px 0;border-radius:8px">`
    : `<p style="color:#5a6e72;font-size:11px;padding:12px 0;font-style:italic">[${alt} — sem dados no período]</p>`;
  const mkTbl = (headers, rows) => `
    <table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

  const html = `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"><title>Relatório Comercial FDV — ${periodo}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{background:#0f0c08;color:#e8e4dc;font-family:Arial,sans-serif;font-size:12px;line-height:1.5}
  .page{width:210mm;min-height:280mm;padding:20mm 18mm;page-break-after:always;position:relative}
  .page:last-child{page-break-after:auto}
  h1{font-size:28px;font-weight:900;color:#CE9221;letter-spacing:-1px}
  h2{font-size:16px;font-weight:700;color:#CE9221;margin:18px 0 10px;padding-bottom:6px;border-bottom:1px solid rgba(206,146,33,0.3)}
  h3{font-size:13px;font-weight:700;color:#c8c4bc;margin:14px 0 8px}
  .logo{font-size:11px;color:#8a9ea0;font-weight:700;letter-spacing:2px;margin-bottom:8px}
  .subtitle{font-size:13px;color:#8a9ea0;margin-top:6px}
  .meta{font-size:11px;color:#5a6e72;margin-top:4px}
  .cover-body{display:flex;flex-direction:column;justify-content:center;height:220mm}
  .metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0}
  .m{background:#1a2124;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px 16px}
  .mv{font-size:26px;font-weight:800;line-height:1}
  .ml{font-size:10px;color:#8a9ea0;text-transform:uppercase;letter-spacing:.6px;margin-top:4px}
  table{width:100%;border-collapse:collapse;margin:10px 0;font-size:11px}
  th{background:#1a2124;color:#8a9ea0;text-transform:uppercase;letter-spacing:.5px;font-size:9.5px;padding:7px 10px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.08)}
  td{padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.04);color:#c8c4bc}
  tr:nth-child(even) td{background:rgba(255,255,255,0.02)}
  .footer{position:absolute;bottom:14mm;left:18mm;right:18mm;display:flex;justify-content:space-between;font-size:9.5px;color:#3a4e52;border-top:1px solid rgba(255,255,255,0.05);padding-top:6px}
  .sep{height:1px;background:rgba(206,146,33,0.2);margin:14px 0}
  @media print{html,body{background:#0f0c08}@page{margin:0;size:A4}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>

<div class="page">
  <div class="logo">FDV — FACULDADE DA VIDA</div>
  <div class="cover-body">
    <h1>Relatório<br>Comercial</h1>
    <p class="subtitle" style="margin-top:16px;font-size:15px">${periodo}</p>
    <div class="sep"></div>
    <p class="meta">Total de leads analisados: <strong style="color:#e8e4dc">${base.length}</strong></p>
    <p class="meta">Gerado em: ${dateGen}</p>
    <p class="meta" style="margin-top:24px;font-size:10px;color:#3a4e52">Documento confidencial — uso interno FDV</p>
  </div>
  <div class="footer"><span>FDV — Relatório Comercial</span><span>Confidencial</span><span>Pág 1</span></div>
</div>

<div class="page">
  <div class="logo">FDV — FACULDADE DA VIDA</div>
  <h2>Resumo Executivo — ${periodo}</h2>
  <div class="metrics">
    ${mkMetric('Total de Leads', base.length)}
    ${mkMetric('Comparecimento', fmtPct(taxaComp), '#4db5c8')}
    ${mkMetric('Conversão', fmtPct(taxaConv), '#4caf8e')}
    ${mkMetric('Faturamento', fmtC(fat), '#CE9221')}
    ${mkMetric('Ticket Médio', fmtC(ticket), '#CE9221')}
    ${mkMetric('Vendas', vendas.length, '#4caf8e')}
  </div>
  <div class="sep"></div>
  <h3>Leads por Dia</h3>${mkChart(imgDia,'gráfico leads/dia')}
  <h3>Comparativo Mês a Mês</h3>${mkChart(imgMes,'gráfico comparativo mensal')}
  <div class="footer"><span>FDV — Relatório Comercial</span><span>Confidencial</span><span>Pág 2</span></div>
</div>

<div class="page">
  <div class="logo">FDV — FACULDADE DA VIDA</div>
  <h2>Origem e Canais</h2>
  <h3>Ranking de Origem por Volume</h3>
  ${mkTbl(['Canal','Leads','Vendas','Conversão'], origemRows)}
  <div class="footer"><span>FDV — Relatório Comercial</span><span>Confidencial</span><span>Pág 3</span></div>
</div>

<div class="page">
  <div class="logo">FDV — FACULDADE DA VIDA</div>
  <h2>Perfil dos Leads</h2>
  <h3>Por Profissão (top 10)</h3>
  ${mkTbl(['Profissão','Leads','% do total'], profRows)}
  <div class="sep"></div>
  <h3>Por Faixa de Renda (top 10)</h3>
  ${mkTbl(['Renda','Leads','% do total'], rendaRows)}
  <div class="footer"><span>FDV — Relatório Comercial</span><span>Confidencial</span><span>Pág 4</span></div>
</div>

<div class="page">
  <div class="logo">FDV — FACULDADE DA VIDA</div>
  <h2>Performance da Equipe</h2>
  <h3>Taxa de Conversão por Closer</h3>
  ${mkTbl(['Closer','Agendados','Realizadas','Vendas','Faturamento','Conv.'], closerRows)}
  <div class="sep"></div>
  <h3>Responsável pelo Agendamento</h3>
  ${mkTbl(['Responsável','Agendados','Realizadas','Vendas'], respRows)}
  <div class="footer"><span>FDV — Relatório Comercial</span><span>Confidencial</span><span>Pág 5</span></div>
</div>

<script>window.onload=()=>window.print()</script>
</body></html>`;
  const w = window.open('','_blank'); w.document.write(html); w.document.close();
}

// ─── DUPLICATAS ──────────────────────────────────────────────────────
const _DUP_EXCL_KEY = 'fdv_dup_exclusions';

// Pares que o usuário marcou explicitamente como "Não são duplicatas".
// Persistido em localStorage; cada entrada é "idA|idB" (sorted).
function _dupExclKey(a, b) { return [a, b].sort().join('|'); }
function getDupExcl() {
  try { return new Set(JSON.parse(localStorage.getItem(_DUP_EXCL_KEY) || '[]')); }
  catch { return new Set(); }
}
function addDupExcl(idA, idB) {
  const s = getDupExcl();
  s.add(_dupExclKey(idA, idB));
  localStorage.setItem(_DUP_EXCL_KEY, JSON.stringify([...s]));
}

function phoneNorm(p) { return String(p||'').replace(/\D/g,''); }

// Duplicata: apenas telefone OU email idênticos.
// Nome parecido sozinho NÃO é critério.
function findDupCandidates(lead, pool, excl) {
  const ph  = phoneNorm(lead.celular);
  const em  = (lead.email||'').toLowerCase().trim();
  const ex  = excl || getDupExcl();
  return (pool||allLeads).filter(c => {
    if (c.id === lead.id) return false;
    if (ex.has(_dupExclKey(lead.id, c.id))) return false;
    if (ph && ph.length >= 8 && phoneNorm(c.celular) === ph) return true;
    if (em && (c.email||'').toLowerCase().trim() === em) return true;
    return false;
  });
}
function buildDupMap() {
  const excl = getDupExcl(); // lê uma vez, passa para todos os candidatos
  dupMap.clear();
  for (const l of allLeads) {
    const dups = findDupCandidates(l, allLeads, excl);
    if (dups.length) dupMap.set(l.id, dups.map(d=>d.id));
  }
  updateDupAlertBtn();
}
function isDup(id) { return dupMap.has(id); }
function updateDupAlertBtn() {
  const badge = $('dup-notif-badge');
  if (!badge) return;
  const pairs = countDupPairs();
  badge.textContent = pairs;
  badge.style.display = pairs > 0 ? '' : 'none';
}
function openFirstDupPair() {
  for (const [id] of dupMap) { openDupCompare(id); return; }
}
function countDupPairs() {
  const seen = new Set();
  let count = 0;
  for (const [aId, bIds] of dupMap) {
    for (const bId of bIds) {
      const key = [aId, bId].sort().join('|');
      if (!seen.has(key)) { seen.add(key); count++; }
    }
  }
  return count;
}

let _dupA = null, _dupB = null;

function openDupCompare(leadId) {
  const lead = allLeads.find(l=>l.id===leadId); if (!lead) return;
  const dups = (dupMap.get(leadId)||[]).map(id=>allLeads.find(l=>l.id===id)).filter(Boolean);
  if (!dups.length) return;
  _dupA = lead; _dupB = dups[0];
  // Inicializa seleções de merge: campo mais completo (mais longo) vence
  _mergeSelections = {};
  for (const f of MERGE_FIELDS) {
    const va = String(_dupA[f.k]||''), vb = String(_dupB[f.k]||'');
    _mergeSelections[f.k] = va.length >= vb.length ? 'a' : 'b';
  }
  renderDupCompareBody();
  $('dup-compare-subtitle').textContent = `${_dupA.nome||'—'} vs ${_dupB.nome||'—'}`;
  $('dup-compare-backdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeDupCompare() {
  $('dup-compare-backdrop').classList.remove('open');
  document.body.style.overflow = '';
  _dupA = _dupB = null;
}
function renderDupCompareBody() {
  const INFO_FIELDS = [
    { k:'status',      lbl:'Status',    fmt: s=>badgeStatus(s) },
    { k:'datachegada', lbl:'Chegou em', fmt: fmtDate },
  ];
  const a = _dupA, b = _dupB;

  const mergeRows = MERGE_FIELDS.map(f => {
    const va = esc(a[f.k]||'—'), vb = esc(b[f.k]||'—');
    const selA = _mergeSelections[f.k] === 'a';
    const selB = _mergeSelections[f.k] === 'b';
    return `<div class="dcc-merge-row">
      <div class="dcc-cell-lbl">${f.lbl}</div>
      <div class="dcc-merge-opt${selA?' dcc-merge-sel':' dcc-merge-dim'}" data-field="${f.k}" data-side="a">${va}</div>
      <div class="dcc-merge-opt${selB?' dcc-merge-sel':' dcc-merge-dim'}" data-field="${f.k}" data-side="b">${vb}</div>
    </div>`;
  }).join('');

  const infoRows = INFO_FIELDS.map(f => {
    const va = f.fmt ? f.fmt(a[f.k]||'') : esc(a[f.k]||'—');
    const vb = f.fmt ? f.fmt(b[f.k]||'') : esc(b[f.k]||'—');
    const diff = String(a[f.k]||'') !== String(b[f.k]||'');
    return `<div class="dcc-merge-row${diff?' dcc-info-diff':''}">
      <div class="dcc-cell-lbl">${f.lbl}</div>
      <div class="dcc-merge-info">${va||'—'}</div>
      <div class="dcc-merge-info">${vb||'—'}</div>
    </div>`;
  }).join('');

  const body = $('dup-compare-body');
  body.innerHTML = `
    <div class="dcc-merge-table">
      <div class="dcc-merge-header">
        <div></div>
        <div class="dcc-col-head">Lead A <span class="dcc-lead-name">${esc(a.nome||'—')}</span></div>
        <div class="dcc-col-head">Lead B <span class="dcc-lead-name">${esc(b.nome||'—')}</span></div>
      </div>
      <div class="dcc-merge-hint">Clique no valor que deseja manter em cada campo.</div>
      ${mergeRows}
      ${infoRows}
    </div>`;

  body.querySelectorAll('.dcc-merge-opt').forEach(el => {
    el.addEventListener('click', () => {
      _mergeSelections[el.dataset.field] = el.dataset.side;
      renderDupCompareBody();
    });
  });
}
async function dupMerge() {
  if (!_dupA || !_dupB) return;
  const mergedData = {};
  for (const f of MERGE_FIELDS) {
    const side = _mergeSelections[f.k] || 'a';
    const val = side === 'a' ? _dupA[f.k] : _dupB[f.k];
    if (val !== undefined) mergedData[f.k] = val;
  }
  mergedData.etiquetas = [...new Set([
    ...(Array.isArray(_dupA.etiquetas) ? _dupA.etiquetas : []),
    ...(Array.isArray(_dupB.etiquetas) ? _dupB.etiquetas : []),
  ])];
  mergedData.status = (STATUS_RANK[_dupA.status]||0) >= (STATUS_RANK[_dupB.status]||0)
    ? _dupA.status : _dupB.status;
  const keepId = _dupA.id, deleteId = _dupB.id;
  closeDupCompare();
  try {
    await executeMerge(keepId, deleteId, mergedData);
    renderAll();
    toast('Leads mesclados com sucesso.', 'ok');
  } catch(e) { console.error(e); toast('Erro ao mesclar.', 'err'); }
}
// Handler unificado: reassign FKs → DELETE duplicata → UPDATE keeper.
// Ordem importa: reassign antes do DELETE (evita on delete set null/cascade),
// DELETE antes do UPDATE (libera celular do UNIQUE index).
async function executeMerge(keepId, deleteId, mergedData) {
  // Se o keeper não tem agendamento mas o deletado tem, preservar dados do deletado
  const SCHED_FIELDS = ['dataagendamento', 'horaagendamento', 'closer', 'agendadopor'];
  const keeper  = allLeads.find(l => l.id === keepId);
  const deleted = allLeads.find(l => l.id === deleteId);
  if (keeper && deleted) {
    for (const f of SCHED_FIELDS) {
      if (!keeper[f] && deleted[f]) mergedData[f] = deleted[f];
    }
  }
  if (isLive) {
    await supabase.from('lead_historico').update({ lead_id: keepId }).eq('lead_id', deleteId);
    await supabase.from('lead_messages').update({ lead_id: keepId }).eq('lead_id', deleteId);
    await supabase.from('vendas').update({ lead_id: keepId }).eq('lead_id', deleteId);
    await supabase.from('alunas').update({ lead_id: keepId }).eq('lead_id', deleteId);
    const { error: errDel } = await supabase.from('leads').delete().eq('id', deleteId);
    if (errDel) throw errDel;
    const { error: errUpd } = await supabase.from('leads').update(mergedData).eq('id', keepId);
    if (errUpd) throw errUpd;
  }
  allLeads = allLeads.filter(l => l.id !== deleteId);
  selectedIds.delete(deleteId);
  const idx = allLeads.findIndex(l => l.id === keepId);
  if (idx !== -1) allLeads[idx] = { ...allLeads[idx], ...mergedData };
}
function dupNaoSaoDuplicatas() {
  if (!_dupA || !_dupB) return;
  // Persiste a exclusão: buildDupMap (chamado por renderAll) vai ignorar este par
  addDupExcl(_dupA.id, _dupB.id);
  closeDupCompare();
  renderAll(); // rebuilds dupMap respeitando a nova exclusão
}
function autoMergeLeads(a, b) {
  const merged = {};
  for (const f of MERGE_FIELDS) {
    if (f.k === 'observacoes') continue; // tratado separadamente abaixo
    const va = String(a[f.k]||''), vb = String(b[f.k]||'');
    merged[f.k] = va.length >= vb.length ? a[f.k] : b[f.k];
  }
  // Observações: concatena quando ambas têm conteúdo distinto; caso contrário mantém a mais longa
  const obsA = (a.observacoes||'').trim(), obsB = (b.observacoes||'').trim();
  merged.observacoes = (obsA && obsB && obsA !== obsB)
    ? `${obsA}\n\n---\n\n${obsB}`
    : (obsA.length >= obsB.length ? (a.observacoes||null) : (b.observacoes||null));
  merged.etiquetas = [...new Set([
    ...(Array.isArray(a.etiquetas) ? a.etiquetas : []),
    ...(Array.isArray(b.etiquetas) ? b.etiquetas : []),
  ])];
  merged.status = (STATUS_RANK[a.status]||0) >= (STATUS_RANK[b.status]||0) ? a.status : b.status;
  return merged;
}
async function mergeAllDuplicates() {
  const pairs = [];
  const seen = new Set();
  for (const [aId, bIds] of dupMap) {
    for (const bId of bIds) {
      const key = [aId, bId].sort().join('|');
      if (!seen.has(key)) { seen.add(key); pairs.push([aId, bId]); }
    }
  }
  if (!pairs.length) { toast('Nenhuma duplicata encontrada.', 'err'); return; }
  const ok = confirm(
    `Isso vai mesclar automaticamente ${pairs.length} par(es) de duplicata(s).\n` +
    `O campo mais completo de cada par será mantido.\n\n` +
    `Esta ação é IRREVERSÍVEL. Deseja continuar?`
  );
  if (!ok) return;
  let merged = 0, removed = 0, errors = 0;
  for (const [aId, bId] of pairs) {
    const a = allLeads.find(l=>l.id===aId);
    const b = allLeads.find(l=>l.id===bId);
    if (!a || !b) continue;
    try {
      await executeMerge(aId, bId, autoMergeLeads(a, b));
      merged++; removed++;
    } catch(e) { console.error(e); errors++; }
  }
  renderAll();
  toast(`${merged} duplicata(s) mesclada(s), ${removed} registro(s) removido(s)${errors?' · '+errors+' erro(s)':''}`, merged>0?'ok':'err');
}
async function _deleteLeadForce(id) {
  try {
    if (isLive) { const { error } = await supabase.from('leads').delete().eq('id', id); if (error) throw error; }
    allLeads = allLeads.filter(l=>l.id!==id); selectedIds.delete(id); updateBulkBar();
    renderAll(); toast('Lead excluído.', 'ok');
  } catch(e) { console.error(e); toast('Erro ao excluir.', 'err'); }
}

let _dupWarnResolve = null, _dupWarnSuspect = null;
function showDupWarning(suspect) {
  return new Promise(resolve => {
    _dupWarnResolve = resolve;
    _dupWarnSuspect = suspect;
    $('dup-warn-msg').textContent =
      `Já existe um lead com dados similares: "${suspect.nome}"${suspect.celular?' · '+suspect.celular:''}.`;
    $('dup-warn-backdrop').classList.add('open');
  });
}
function closeDupWarn(result) {
  $('dup-warn-backdrop').classList.remove('open');
  if (_dupWarnResolve) { _dupWarnResolve(result); _dupWarnResolve = null; }
  _dupWarnSuspect = null;
}

// ─── RESIZE PAINEL LATERAL DE CHATS ─────────────────────────────────
function initChatSidebarResize() {
  const handle = $('chats-resize-handle');
  const layout = document.querySelector('.chats-layout');
  if (!handle || !layout) return;

  const LS_KEY = 'fdv_chat_sidebar_w';
  const MIN_W = 260, MAX_W = 480;

  let sidebarW = Math.min(MAX_W, Math.max(MIN_W,
    parseInt(localStorage.getItem(LS_KEY) || '340', 10)
  ));
  layout.style.setProperty('--chat-sidebar-w', sidebarW + 'px');

  let dragging = false, startX = 0, startW = 0;

  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    dragging = true;
    startX = e.clientX;
    startW = sidebarW;
    handle.classList.add('dragging');
    document.body.style.cursor    = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    sidebarW = Math.min(MAX_W, Math.max(MIN_W, startW + (e.clientX - startX)));
    layout.style.setProperty('--chat-sidebar-w', sidebarW + 'px');
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    document.body.style.cursor    = '';
    document.body.style.userSelect = '';
    localStorage.setItem(LS_KEY, sidebarW);
  });
}

// ─── BUSCA GLOBAL ────────────────────────────────────────────────────
// O input é um overlay position:fixed fora do header, posicionado via JS.
let _searchTimer = null;
function openSearch() {
  document.getElementById('header-search-wrap')?.classList.add('expanded');
  $('search-input')?.focus();
}
function closeSearch() {
  document.getElementById('header-search-wrap')?.classList.remove('expanded');
  const inp = $('search-input'); if (inp) inp.value = '';
  closeSearchDD();
}
function closeSearchDD() { const dd=$('search-dropdown'); if(dd) dd.classList.remove('open'); }

function runSearch(q) {
  const dd = $('search-dropdown'); if (!dd) return;
  const ql = q.toLowerCase().trim();
  if (ql.length < 3) { closeSearchDD(); return; }
  const phoneQ = ql.replace(/\D/g,'');
  const results = allLeads.filter(l =>
    (l.nome||'').toLowerCase().includes(ql) ||
    (phoneQ && (l.celular||'').replace(/\D/g,'').includes(phoneQ)) ||
    (l.email||'').toLowerCase().includes(ql)
  ).slice(0, 8);
  if (!results.length) {
    dd.innerHTML = `<div class="search-empty">
      ${_S(`<path d="m13.5 8.5-5 5"/><path d="m8.5 8.5 5 5"/><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>`,28,';color:var(--t3)')}
      <span>Nenhum lead encontrado</span></div>`;
  } else {
    dd.innerHTML = results.map(l => {
      const dupBadge = isDup(l.id) ? `<span class="search-dup-badge">duplicata</span>` : '';
      const statusBadge = isInCloser(l)
        ? `<span class="badge-status agendado">Closer</span>`
        : badgeStatus(l.status);
      return `<div class="search-result-item" data-lead-id="${esc(l.id)}">
        <div class="search-result-nome">${esc(l.nome||'—')} ${dupBadge}</div>
        <div class="search-result-meta">${esc(l.celular||'')} ${statusBadge}</div>
      </div>`;
    }).join('');
    dd.querySelectorAll('.search-result-item').forEach(item =>
      item.addEventListener('mousedown', e => {
        e.preventDefault();
        const lead = allLeads.find(l=>l.id===item.dataset.leadId);
        closeSearch();
        if (!lead) return;
        if (isDup(lead.id)) {
          openDupCompare(lead.id);
        } else {
          navigateToLead(lead);
        }
      })
    );
  }
  dd.classList.add('open');
}

// Leads com kanban_column são exibidos no Closer (tab-closer).
// Leads com status agendado/noshow/realizada sem kanban_column ainda estão no
// sub-painel Agendados (tab-agendamentos), então só usamos o Closer quando
// kanban_column está definido.
function isInCloser(lead) { return !!lead.kanban_column; }

const _STATUS_TO_SUB = {
  aguardando: 'novos', qualificado: 'qualificados',
  agendado:   'agendados', noshow:  'agendados',
  realizada:  'agendados', descartado: 'descartados',
  cancelado:  'descartados',
};
function navigateToLead(lead) {
  if (lead.kanban_column === 'descartado') {
    switchTab('agendamentos');
    switchSub('descartados');
    setTimeout(() => highlightLead(lead.id), 120);
    return;
  }
  if (isInCloser(lead)) {
    switchTab('closer');
    setTimeout(() => highlightLead(lead.id), 200);
    return;
  }
  const sub = _STATUS_TO_SUB[lead.status] || 'novos';
  switchTab('agendamentos');
  switchSub(sub);
  setTimeout(() => highlightLead(lead.id), 120);
}
function highlightLead(id) {
  // 1. Tabela (Novos / Noshow / Descartados)
  let el = document.querySelector(`tr[data-id="${id}"]`);
  // 1b. Qualificados (followup-row — div, não <tr>)
  if (!el) el = document.querySelector(`.followup-row[data-id="${id}"]`);
  // 2. Card do Closer (Kanban)
  if (!el) el = document.querySelector(`.kanban-card[data-id="${id}"]`);
  // 3. Card de agenda (Agendados – hoje / todos)
  if (!el) {
    const btn = document.querySelector(`[data-perfil="${id}"]`);
    el = btn?.closest('.agenda-card') || null;
  }
  if (!el) return;
  el.scrollIntoView({ behavior:'smooth', block:'center' });
  el.classList.remove('row-highlight'); void el.offsetWidth;
  el.classList.add('row-highlight');
  setTimeout(() => el.classList.remove('row-highlight'), 2300);
}

// ─── EVENTS ──────────────────────────────────────────────────────────
function bindEvents() {
  // Kanban drag-and-drop — delegated on the persistent board element so listeners
  // survive renderKanban() innerHTML replacements (fixes modal not firing mid-session)
  const kboard = $('kanban-board');

  kboard.addEventListener('dragstart', e => {
    // Column drag — initiated from the drag handle span (which has draggable=true)
    const handle = e.target.closest('.kc-drag-handle[draggable]');
    if (handle) {
      dragColId = handle.dataset.dragCol;
      setTimeout(() => handle.closest('.kanban-col')?.classList.add('col-dragging'), 0);
      return;
    }
    // Card drag
    const card = e.target.closest('.kanban-card[draggable]');
    if (!card) return;
    dragLeadId = card.dataset.id;
    setTimeout(() => card.classList.add('dragging'), 0);
  });
  kboard.addEventListener('dragend', e => {
    const card = e.target.closest('.kanban-card');
    if (card) card.classList.remove('dragging');
    dragLeadId = null;
    kboard.querySelectorAll('.kanban-col').forEach(c => c.classList.remove('col-dragging', 'col-drag-over'));
    dragColId = null;
  });
  kboard.addEventListener('dragover', e => {
    if (dragColId) {
      const col = e.target.closest('.kanban-col');
      if (!col) return;
      e.preventDefault();
      kboard.querySelectorAll('.kanban-col').forEach(c => c.classList.remove('col-drag-over'));
      col.classList.add('col-drag-over');
      return;
    }
    const body = e.target.closest('.kanban-col-body');
    if (!body) return;
    e.preventDefault();
    body.classList.add('drag-over');
  });
  kboard.addEventListener('dragleave', e => {
    const body = e.target.closest('.kanban-col-body');
    if (body && !body.contains(e.relatedTarget)) body.classList.remove('drag-over');
  });
  kboard.addEventListener('drop', async e => {
    if (dragColId) {
      const targetCol = e.target.closest('.kanban-col');
      if (!targetCol) return;
      e.preventDefault();
      kboard.querySelectorAll('.kanban-col').forEach(c => c.classList.remove('col-drag-over'));
      const fromId = dragColId;
      const toId   = targetCol.dataset.col;
      dragColId = null;
      if (fromId === toId) return;
      const cols    = getKanbanCols();
      const fromIdx = cols.findIndex(c => c.id === fromId);
      const toIdx   = cols.findIndex(c => c.id === toId);
      if (fromIdx < 0 || toIdx < 0) return;
      const [moved] = cols.splice(fromIdx, 1);
      cols.splice(toIdx, 0, moved);
      saveKanbanCols(cols);
      renderKanban();
      return;
    }
    const body = e.target.closest('.kanban-col-body');
    if (!body) return;
    e.preventDefault();
    kboard.querySelectorAll('.kanban-col-body').forEach(b => b.classList.remove('drag-over'));
    if (dragLeadId) {
      const id = dragLeadId;
      dragLeadId = null;
      await moveLeadToCol(id, body.dataset.col);
    }
  });

  // Sub-nav principal
  document.querySelectorAll('.sub-link[data-sub]').forEach(btn =>
    btn.addEventListener('click', () => switchSub(btn.dataset.sub))
  );

  // Sub-nav secundário (Agendados: hoje/todos/briefing)
  document.querySelectorAll('[data-agendados-sub]').forEach(btn =>
    btn.addEventListener('click', () => switchAgendadosSub(btn.dataset.agendadosSub))
  );

  // Próximas calls — copiar
  $('btn-copiar-proximas')?.addEventListener('click', gerarAgendaHoje);

  // Tab nav — direct links (Início, WhatsApp, Usuários)
  document.querySelectorAll('.nav-link[data-tab]').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
  );

  // Sucesso / Financeiro sub-nav
  document.querySelectorAll('[data-sucesso-sub]').forEach(btn =>
    btn.addEventListener('click', () => switchSucessoSub(btn.dataset.sucessoSub))
  );
  document.querySelectorAll('[data-financeiro-sub]').forEach(btn =>
    btn.addEventListener('click', () => switchFinanceiroSub(btn.dataset.financeiroSub))
  );

  // Leads filters (Novos)
  ['filter-status','filter-origem','filter-mes','filter-renda','filter-profissao','filter-etiqueta','filter-chegada-de','filter-chegada-ate'].forEach(id => { const el=$(id); if(el) el.addEventListener('change', applyFilters); });
  ['filter-busca'].forEach(id => { const el=$(id); if(el) el.addEventListener('input', applyFilters); });
  // Sort headers — Novos (thead estático, bind único)
  document.querySelector('.leads-table thead tr')?.querySelectorAll('[data-sort-col]').forEach(th => {
    th.addEventListener('click', () => { cycleSortState('novos', th.dataset.sortCol); applyFilters(); });
  });
  $('btn-limpar').addEventListener('click', () => {
    ['filter-status','filter-origem','filter-mes','filter-renda','filter-profissao','filter-etiqueta'].forEach(id => { const el=$(id); if(el) el.value=''; });
    ['filter-busca','filter-chegada-de','filter-chegada-ate'].forEach(id => { const el=$(id); if(el) el.value=''; });
    applyFilters();
  });

  // Filtros do sub Agendados (Hoje + Todos)
  ['agend-filter-origem','agend-filter-closer','agend-filter-agendadopor','agend-filter-renda','agend-filter-chegada-de','agend-filter-chegada-ate'].forEach(id => { const el=$(id); if(el) el.addEventListener('change', renderAgendadosSub); });
  $('agend-filter-busca')?.addEventListener('input', renderAgendadosSub);
  $('agend-btn-limpar')?.addEventListener('click', () => {
    ['agend-filter-origem','agend-filter-closer','agend-filter-agendadopor','agend-filter-renda','agend-filter-chegada-de','agend-filter-chegada-ate'].forEach(id => { const el=$(id); if(el) el.value=''; });
    const b = $('agend-filter-busca'); if(b) b.value = '';
    renderAgendadosSub();
  });

  // Agenda filters (Todos — legacy selects no sub-panel)
  ['agenda-filter-mes','agenda-filter-closer'].forEach(id => { const el=$(id); if(el) el.addEventListener('change', renderAgendaSub); });
  $('agenda-filter-data')?.addEventListener('change', renderAgendaSub);
  $('btn-gerar-agenda')?.addEventListener('click', gerarAgendaDoDia);

  // Briefing filters
  ['briefing-filter-mes','briefing-filter-closer'].forEach(id => $(id).addEventListener('change', renderBriefingSub));
  $('briefing-filter-data')?.addEventListener('change', renderBriefingSub);
  $('briefing-filter-busca')?.addEventListener('input', renderBriefingSub);

  // Closer view tabs
  document.querySelectorAll('.cvt-btn').forEach(btn =>
    btn.addEventListener('click', () => switchCloserView(btn.dataset.view))
  );

  // Kanban filters
  ['kanban-filter-mes','kanban-filter-closer','kf-etapa','kf-origem'].forEach(id => {
    $(id)?.addEventListener('change', renderKanban);
  });
  $('kf-search')?.addEventListener('input', e => {
    kanbanSearchText = e.target.value.toLowerCase().trim();
    document.querySelectorAll('.kanban-card').forEach(card => {
      card.classList.toggle('kc-dimmed', !!kanbanSearchText && !card.dataset.nome.includes(kanbanSearchText));
    });
  });
  $('kf-clear')?.addEventListener('click', () => {
    const inp = $('kf-search');
    if (inp) inp.value = '';
    kanbanSearchText = '';
    document.querySelectorAll('.kanban-card').forEach(card => card.classList.remove('kc-dimmed'));
  });

  // Modal: Nova coluna
  $('add-col-confirm').addEventListener('click', confirmAddCol);
  $('add-col-cancel').addEventListener('click', closeAddColModal);
  $('add-col-cancel-x').addEventListener('click', closeAddColModal);
  $('add-col-backdrop').addEventListener('click', e => { if (e.target === $('add-col-backdrop')) closeAddColModal(); });
  $('add-col-name').addEventListener('keydown', e => { if (e.key === 'Enter') confirmAddCol(); else if (e.key === 'Escape') closeAddColModal(); });

  // Relatórios filters
  ['rel-filter-mes','rel-filter-origem'].forEach(id => $(id).addEventListener('change', renderRelatorios));

  // Novo lead
  $('btn-novo-lead-sub').addEventListener('click', () => openNovoLead());

  // Modal
  $('modal-close').addEventListener('click', closeModal);
  $('btn-cancelar').addEventListener('click', closeModal);
  $('btn-confirmar').addEventListener('click', confirmar);
  $('modal-backdrop').addEventListener('click', e => { if(e.target===$('modal-backdrop')) closeModal(); });
  $('btn-voltar').addEventListener('click', () => schedGoToStep(1));
  $('sched-step-1').addEventListener('click', e => {
    const card = e.target.closest('.closer-card');
    if (card) { schedSelectCloser(card.dataset.closer); return; }
    const btn = e.target.closest('[data-cal-connect]');
    if (btn) connectCloserCalendar(btn.dataset.calConnect);
  });

  // Resultado: toggles
  $('form-resultado').addEventListener('click', e => {
    const opt = e.target.closest('.toggle-opt');
    if (!opt) return;
    const group = opt.closest('.toggle-group');
    if (!group) return;
    document.querySelectorAll(`#${group.id} .toggle-opt`).forEach(b=>b.classList.remove('selected'));
    opt.classList.add('selected');

  });

  // Bulk
  $('chk-all').addEventListener('change', e => {
    if (e.target.checked) filteredLeads.forEach(l=>selectedIds.add(l.id));
    else                  filteredLeads.forEach(l=>selectedIds.delete(l.id));
    updateBulkBar(); renderTable();
  });
  $('btn-bulk-qualificar').addEventListener('click', bulkQualificar);
  $('btn-bulk-descartar').addEventListener('click', openBulkDescarteModal);
  $('btn-bulk-tag')?.addEventListener('click', openBulkTagModal);
  $('btn-bulk-delete')?.addEventListener('click', bulkDelete);
  $('btn-bulk-clear').addEventListener('click', () => { selectedIds.clear(); updateBulkBar(); renderTable(); });

  // Perfil
  $('perfil-close').addEventListener('click', closePerfil);
  $('perfil-fechar').addEventListener('click', closePerfil);
  $('btn-salvar-obs').addEventListener('click', salvarObsPerfil);
  $('btn-comentar-perfil').addEventListener('click', async () => {
    if (!perfilLeadId) return;
    const texto = $('perfil-obs').value.trim();
    if (!texto) return;
    const btn = $('btn-comentar-perfil');
    btn.disabled = true;
    try {
      if (isLive) {
        const autor = currentUser?.displayName || currentUser?.email || 'Desconhecido';
        const { error } = await supabase.from('lead_comentarios').insert({ lead_id: perfilLeadId, autor_nome: autor, texto });
        if (error) throw error;
        const { data } = await supabase.from('lead_comentarios').select('*')
          .eq('lead_id', perfilLeadId).order('created_at', { ascending: false });
        renderPerfilComentarios(data || []);
      }
      $('perfil-obs').value = '';
      toast('Comentário adicionado.', 'ok');
    } catch(e) { console.error(e); toast('Erro ao comentar.', 'err'); }
    finally { btn.disabled = false; }
  });
  $('perfil-backdrop').addEventListener('click', e => { if(e.target===$('perfil-backdrop')) closePerfil(); });

  // Edição inline dos campos de dados pessoais no modal de perfil
  $('perfil-dados').addEventListener('click', e => {
    const el = e.target.closest('.detalhes-editable');
    if (!el || el.classList.contains('detalhes-editing')) return;
    startInlineEdit(el);
  });

  // Etiquetas
  $('btn-add-etiqueta').addEventListener('click', addEtiquetaCustom);
  $('etiqueta-custom-input').addEventListener('keydown', e => { if(e.key==='Enter') addEtiquetaCustom(); });

  // Novo lead modal
  $('novo-lead-close').addEventListener('click', closeNovoLead);
  $('novo-lead-cancelar').addEventListener('click', closeNovoLead);
  $('btn-salvar-lead').addEventListener('click', confirmarNovoLead);
  $('novo-lead-backdrop').addEventListener('click', e => { if(e.target===$('novo-lead-backdrop')) closeNovoLead(); });

  // Briefing modal
  $('briefing-close').addEventListener('click', closeBriefing);
  $('briefing-cancelar').addEventListener('click', closeBriefing);
  $('btn-salvar-briefing').addEventListener('click', salvarBriefing);
  $('briefing-backdrop').addEventListener('click', e => { if(e.target===$('briefing-backdrop')) closeBriefing(); });

  // Dropdown: fechar ao clicar fora
  document.addEventListener('click', e => { if(!e.target.closest('.acoes-wrap')) closeAllDropdowns(); });

  // Auth
  $('btn-login-email').addEventListener('click', loginWithEmail);
  $('btn-esqueci-senha').addEventListener('click', esqueceuSenha);
  ['login-email','login-senha'].forEach(id =>
    $(id).addEventListener('keydown', e => { if (e.key === 'Enter') loginWithEmail(); })
  );
  $('btn-logout').addEventListener('click', logoutUser);
  document.getElementById('btn-logo-home').addEventListener('click', () => switchTab('inicio'));

  // Usuários
  $('btn-novo-usuario')?.addEventListener('click', openNovoUsuario);
  $('novo-usuario-close')?.addEventListener('click', closeNovoUsuario);
  $('novo-usuario-cancelar')?.addEventListener('click', closeNovoUsuario);
  $('novo-usuario-backdrop')?.addEventListener('click', e => { if (e.target === $('novo-usuario-backdrop')) closeNovoUsuario(); });
  $('btn-salvar-usuario')?.addEventListener('click', salvarNovoUsuario);
  $('usuarios-tbody')?.addEventListener('change', e => {
    const sel = e.target.closest('.usuario-role-sel');
    if (sel) updateRoleUsuario(sel.dataset.uid, sel.value);
  });
  $('usuarios-tbody')?.addEventListener('click', e => {
    const edit     = e.target.closest('.usuario-edit-btn');
    if (edit) openEditarUsuario(edit.dataset.uid);
    const del      = e.target.closest('.usuario-delete-btn');
    if (del) deleteUsuario(del.dataset.uid, del.dataset.nome);
    const reenviar = e.target.closest('[data-reenviar]');
    if (reenviar) reenviarCredenciais(reenviar.dataset.reenviar);
    const copiarWa = e.target.closest('[data-copiar-wa]');
    if (copiarWa) copiarCredenciaisWhatsApp(copiarWa.dataset.copiarWa);
  });
  $('eu-role')?.addEventListener('change', () => {
    renderPermCheckboxes('eu-perm-grid', ROLE_PERMISSIONS[$('eu-role').value] || { ...DEFAULT_PERMISSIONS });
  });
  $('nu-role')?.addEventListener('change', () => {
    renderPermCheckboxes('nu-perm-grid', ROLE_PERMISSIONS[$('nu-role').value] || { ...DEFAULT_PERMISSIONS });
  });
  $('editar-usuario-close')?.addEventListener('click', closeEditarUsuario);
  $('editar-usuario-cancelar')?.addEventListener('click', closeEditarUsuario);
  $('editar-usuario-backdrop')?.addEventListener('click', e => { if (e.target === $('editar-usuario-backdrop')) closeEditarUsuario(); });
  $('btn-salvar-editar-usuario')?.addEventListener('click', salvarEditarUsuario);
  $('eu-foto')?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    const preview = $('eu-foto-preview');
    const labelText = $('eu-foto-label-text');
    if (file && preview) {
      preview.src = URL.createObjectURL(file);
      preview.style.display = '';
      if (labelText) labelText.textContent = file.name;
    }
  });

  $('nu-foto')?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    const preview = $('nu-foto-preview');
    const labelText = $('nu-foto-label-text');
    if (file && preview) {
      preview.src = URL.createObjectURL(file);
      preview.style.display = '';
      if (labelText) labelText.textContent = file.name;
    }
  });

  // Perfil tabs
  document.querySelectorAll('.perfil-tab').forEach(btn =>
    btn.addEventListener('click', () => switchPerfilTab(btn.dataset.perfilTab))
  );

  // Chat no perfil
  $('btn-perfil-send').addEventListener('click', () =>
    sendChatMessage('perfil-chat-input', 'perfil-chat-instance', perfilLeadId)
  );
  $('perfil-chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage('perfil-chat-input','perfil-chat-instance',perfilLeadId); }
  });

  // Central de chats — filtros + busca
  ['chats-filter-instance','chats-filter-status'].forEach(id =>
    $(id)?.addEventListener('change', renderChatsList)
  );
  $('chats-search')?.addEventListener('input', e => {
    chatSearchQuery = e.target.value.trim();
    renderChatsList();
  });
  document.querySelectorAll('.cqf-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      chatQuickFilter = btn.dataset.filter || 'all';
      document.querySelectorAll('.cqf-btn').forEach(b => b.classList.toggle('cqf-btn--active', b === btn));
      renderChatsList();
    })
  );

  // Central de chats — clique na conversa (delegado)
  $('chats-list').addEventListener('click', e => {
    const delBtn = e.target.closest('.cli-delete-btn[data-action="delete-conv"]');
    if (delBtn) { e.stopPropagation(); deleteConversation(delBtn.dataset.type, delBtn.dataset.id); return; }
    const item = e.target.closest('.chats-list-item');
    if (!item) return;
    if (item.dataset.leadId)    openCentralChat(item.dataset.leadId);
    else if (item.dataset.contactId) openContactChat(item.dataset.contactId);
  });

  // Central de chats — menu de contexto (botão direito)
  $('chats-list').addEventListener('contextmenu', e => {
    e.preventDefault();
    const item = e.target.closest('.chats-list-item');
    if (!item) return;
    const type = item.dataset.leadId ? 'lead' : 'contact';
    const id   = item.dataset.leadId || item.dataset.contactId;
    showConvContextMenu(e.clientX, e.clientY, type, id);
  });

  // Nova conversa
  $('btn-nova-conversa').addEventListener('click', openNovaConversaModal);
  $('nova-conversa-close').addEventListener('click',   closeNovaConversaModal);
  $('nova-conversa-cancel').addEventListener('click',  closeNovaConversaModal);
  $('nova-conversa-confirm').addEventListener('click', confirmNovaConversa);
  $('nova-conversa-numero').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmNovaConversa();
  });
  $('nova-conversa-backdrop').addEventListener('click', e => {
    if (e.target === $('nova-conversa-backdrop')) closeNovaConversaModal();
  });

  // WhatsApp — botão instâncias (abre modal)
  $('btn-nova-instancia').addEventListener('click', () => openInstanciasModal());
  $('instancias-modal-close').addEventListener('click',   closeInstanciasModal);
  $('instancias-modal-cancel').addEventListener('click',  closeInstanciasModal);
  $('instancias-modal-connect').addEventListener('click', () => { closeInstanciasModal(); openQRModal(null); });
  $('instancias-modal-backdrop').addEventListener('click', e => {
    if (e.target === $('instancias-modal-backdrop')) closeInstanciasModal();
  });

  // WhatsApp — sub-nav
  document.querySelectorAll('#tab-whatsapp .sub-link[data-sub]').forEach(btn =>
    btn.addEventListener('click', () => switchWaSub(btn.dataset.sub))
  );

  // Respostas rápidas — CRUD
  $('btn-nova-resposta')?.addEventListener('click', () => openQrForm(null));
  $('btn-qr-save')?.addEventListener('click', saveQuickReply);
  $('btn-qr-cancel')?.addEventListener('click', () => { $('quick-reply-form').style.display = 'none'; qrEditId = null; });

  // Etiquetas — CRUD
  $('btn-nova-etiqueta')?.addEventListener('click', () => openLabelForm(null));
  $('btn-label-save')?.addEventListener('click', saveLabel);
  $('btn-label-cancel')?.addEventListener('click', () => { $('label-form').style.display = 'none'; labelEditId = null; });

  // WhatsApp — ações nos cards (delegado)
  $('wa-instances-grid').addEventListener('click', e => {
    const reconnect  = e.target.closest('.wa-btn-reconnect');
    const disconnect = e.target.closest('.wa-btn-disconnect');
    const del        = e.target.closest('.wa-btn-delete');
    if (reconnect)  openQRModal(reconnect.dataset.id);
    if (disconnect) disconnectInstance(disconnect.dataset.id);
    if (del)        deleteInstance(del.dataset.id);
  });

  // QR modal
  $('qr-close').addEventListener('click', closeQRModal);
  $('qr-cancelar').addEventListener('click', closeQRModal);
  $('qr-confirmar').addEventListener('click', confirmQRStep);
  $('qr-backdrop').addEventListener('click', e => { if (e.target === $('qr-backdrop')) closeQRModal(); });
  $('btn-regenerate-qr').addEventListener('click', () => {
    const inst = waInstances.find(i => i.id === qrInstanceId);
    if (inst) triggerQRGenerate(inst.instanceName);
  });
  $('btn-retry-qr').addEventListener('click', () => {
    const inst = waInstances.find(i => i.id === qrInstanceId);
    if (inst) triggerQRGenerate(inst.instanceName);
  });

  // Motivo de perda
  $('mp-close').addEventListener('click', closeMotivosPerda);
  $('mp-cancelar').addEventListener('click', closeMotivosPerda);
  $('mp-confirmar').addEventListener('click', confirmarMotivosPerda);
  $('motivo-perda-backdrop').addEventListener('click', e => { if (e.target === $('motivo-perda-backdrop')) closeMotivosPerda(); });

  // Venda ganha — validação e bindings
  $('vg-close').addEventListener('click', closeVendaGanha);
  $('vg-cancelar').addEventListener('click', closeVendaGanha);
  $('vg-confirmar').addEventListener('click', confirmarVendaGanha);
  $('venda-ganha-backdrop').addEventListener('click', e => { if (e.target === $('venda-ganha-backdrop')) closeVendaGanha(); });
  $('vg-programa').addEventListener('input',  vgCheckReady);
  $('vg-valor').addEventListener('input',     vgCheckReady);
  $('vg-forma').addEventListener('change',    vgCheckReady);

  // Editar venda
  $('ev-close').addEventListener('click', closeEditarVenda);
  $('ev-cancelar').addEventListener('click', closeEditarVenda);
  $('ev-salvar').addEventListener('click', salvarEdicaoVenda);
  $('ev-backdrop').addEventListener('click', e => { if (e.target === $('ev-backdrop')) closeEditarVenda(); });

  // Voltar para kanban
  $('vk-close').addEventListener('click', closeVoltaKanban);
  $('vk-cancelar').addEventListener('click', closeVoltaKanban);
  $('vk-confirmar').addEventListener('click', confirmarVoltaKanban);
  $('vk-backdrop').addEventListener('click', e => { if (e.target === $('vk-backdrop')) closeVoltaKanban(); });
  $('vk-col').addEventListener('change', e => { $('vk-confirmar').disabled = !e.target.value; });

  // Notificações
  $('notif-btn').addEventListener('click', e => {
    e.stopPropagation();
    const panel = $('notif-panel');
    panel.style.display = panel.style.display === 'none' ? '' : 'none';
  });
  $('notif-mark-all').addEventListener('click', async () => {
    if (!isLive || !currentUserDbId) return;
    const ids = allNotifs.filter(n => !n.read).map(n => n.id);
    if (ids.length) await supabase.from('notifications').update({ read: true }).in('id', ids);
  });
  $('notif-list').addEventListener('click', async e => {
    const item = e.target.closest('.notif-item');
    if (!item || !isLive) return;
    await supabase.from('notifications').update({ read: true }).eq('id', item.dataset.id);
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('#notif-wrapper')) { const p = $('notif-panel'); if (p) p.style.display = 'none'; }
  });

  // Adicionar como lead modal
  $('add-lead-close').addEventListener('click',   closeAddAsLeadModal);
  $('add-lead-cancel').addEventListener('click',  closeAddAsLeadModal);
  $('add-lead-confirm').addEventListener('click', confirmAddAsLead);
  $('add-lead-backdrop').addEventListener('click', e => {
    if (e.target === $('add-lead-backdrop')) closeAddAsLeadModal();
  });

  // Descarte modal
  $('descarte-close').addEventListener('click', closeDescarteModal);
  $('descarte-cancelar').addEventListener('click', closeDescarteModal);
  $('descarte-confirmar').addEventListener('click', confirmarDescarte);
  $('descarte-backdrop').addEventListener('click', e => {
    if (e.target === $('descarte-backdrop')) closeDescarteModal();
  });

  // Modal Aluna
  $('am-close').addEventListener('click', closeAlunaModal);
  $('am-cancelar').addEventListener('click', closeAlunaModal);
  $('am-salvar').addEventListener('click', salvarAluna);
  $('am-backdrop').addEventListener('click', e => { if (e.target === $('am-backdrop')) closeAlunaModal(); });

  // Modal Sessão
  $('sm-close').addEventListener('click', closeSessaoModal);
  $('sm-cancelar').addEventListener('click', closeSessaoModal);
  $('sm-salvar').addEventListener('click', salvarSessao);
  $('sm-backdrop').addEventListener('click', e => { if (e.target === $('sm-backdrop')) closeSessaoModal(); });

  // Modal Contrato
  $('cm-close').addEventListener('click', closeContratoModal);
  $('cm-cancelar').addEventListener('click', closeContratoModal);
  $('cm-salvar').addEventListener('click', salvarContrato);
  $('cm-backdrop').addEventListener('click', e => { if (e.target === $('cm-backdrop')) closeContratoModal(); });

  // ── Stat cards clicáveis no Início (delegação na tab, sobrevive a re-renders)
  $('tab-inicio')?.addEventListener('click', e => {
    const card = e.target.closest('[data-inicio-nav]');
    if (!card) return;
    const nav = card.dataset.inicioNav;
    if      (nav === 'agendados') { switchTab('agendamentos'); switchSub('agendados'); }
    else if (nav === 'novos')     { switchTab('agendamentos'); switchSub('novos'); }
    else if (nav === 'vendas')    { switchTab('closer'); setTimeout(() => switchCloserView('vendas'), 80); }
    else if (nav === 'relatorios') { switchTab('relatorios'); }
  });

  // ── Exportação de relatórios
  $('rel-utm-toggle')?.addEventListener('click', () => { relShowUTM = !relShowUTM; renderRelatorios(); });
  $('rel-export-csv')?.addEventListener('click', exportRelatoriosCSV);
  $('rel-export-pdf')?.addEventListener('click', exportRelatoriosPDF);

  // ── Drill-down de relatórios
  $('drill-close')    ?.addEventListener('click', closeDrillDown);
  $('drill-close-btn')?.addEventListener('click', closeDrillDown);
  $('drill-backdrop') ?.addEventListener('click', e => { if (e.target===$('drill-backdrop')) closeDrillDown(); });
  $('drill-export-csv')?.addEventListener('click', exportDrillCSV);
  $('drill-export-pdf')?.addEventListener('click', exportDrillPDF);

  // Delegação: qualquer [data-drill] dentro de #relatorios-content
  $('relatorios-content')?.addEventListener('click', e => {
    // UTM tabs — troca sem re-render
    const utmTab = e.target.closest('[data-utm-tab]');
    if (utmTab) {
      _utmTab = utmTab.dataset.utmTab;
      document.querySelectorAll('[data-utm-tab]').forEach(t => t.classList.toggle('active', t.dataset.utmTab === _utmTab));
      document.querySelectorAll('[data-utm-panel]').forEach(p => { p.style.display = p.dataset.utmPanel === _utmTab ? '' : 'none'; });
      return;
    }
    const el = e.target.closest('[data-drill]');
    if (!el) return;
    const mesFilt    = $('rel-filter-mes')?.value    || '';
    const origemFilt = $('rel-filter-origem')?.value || '';
    let base = [...allLeads];
    if (mesFilt)    base = base.filter(l => (l.datachegada||'').startsWith(mesFilt));
    if (origemFilt) base = base.filter(l => l.origem === origemFilt);
    const drill = el.dataset.drill, value = el.dataset.drillValue || '', title = el.dataset.drillTitle || value;
    let leads;
    if      (drill === 'all')          leads = base;
    else if (drill === 'status')       leads = base.filter(l => l.status === value);
    else if (drill === 'venda')        leads = base.filter(l => l.kanban_column === 'venda_ganha');
    else if (drill === 'origem')       leads = base.filter(l => (l.origem||'Outros') === value);
    else if (drill === 'mes')          leads = base.filter(l => (l.datachegada||'').startsWith(value));
    else if (drill === 'closer')       leads = base.filter(l => (l.closer||'_sem') === value);
    else if (drill === 'resp')         leads = base.filter(l => (l.agendadopor||'Desconhecido') === value);
    else if (drill === 'utm_source')   leads = base.filter(l => (cleanUTM(l.utm_source)||'Não identificado') === value);
    else if (drill === 'utm_campaign') leads = base.filter(l => (cleanUTM(l.utm_campaign)||'Não identificado') === value);
    else if (drill === 'utm_content')  leads = base.filter(l => (cleanUTM(l.utm_content)||'Não identificado') === value);
    else return;
    openDrillDown(title, leads);
  });

  // ── Resize painel lateral de chats
  initChatSidebarResize();

  // ── Busca global (input no header)
  document.getElementById('header-search-wrap')?.addEventListener('click', () => openSearch());
  $('search-input')?.addEventListener('input', e => {
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(() => runSearch(e.target.value), 180);
  });
  $('search-input')?.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeSearch(); e.stopPropagation(); }
  });
  $('search-input')?.addEventListener('blur', () => setTimeout(closeSearchDD, 200));

  // ── Duplicata compare + merge
  $('dup-compare-close').addEventListener('click', closeDupCompare);
  $('dup-compare-backdrop').addEventListener('click', e => { if (e.target===$('dup-compare-backdrop')) closeDupCompare(); });
  $('dup-merge').addEventListener('click', dupMerge);
  $('dup-merge-all')?.addEventListener('click', mergeAllDuplicates);
  $('dup-nao-duplicata').addEventListener('click', dupNaoSaoDuplicatas);
  $('dup-notif-btn')?.addEventListener('click', openFirstDupPair);

  // ── Duplicata warning
  $('dup-warn-close').addEventListener('click', () => closeDupWarn('cancel'));
  $('dup-warn-backdrop').addEventListener('click', e => { if (e.target===$('dup-warn-backdrop')) closeDupWarn('cancel'); });
  $('dup-warn-salvar').addEventListener('click', () => closeDupWarn('save'));
  $('dup-warn-ver').addEventListener('click', () => { const s=_dupWarnSuspect; closeDupWarn('cancel'); if(s) openPerfil(s); });

  // ── Delegação global: clicar fora da busca fecha overlay + ícone duplicata
  document.addEventListener('click', e => {
    if (!e.target.closest('#header-search-wrap') && !e.target.closest('#search-overlay')) closeSearch();
    const dupBtn = e.target.closest('.btn-dup-ico');
    if (dupBtn) { e.stopPropagation(); openDupCompare(dupBtn.dataset.dupId); }
  });

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal(); closePerfil(); closeNovoLead(); closeQRModal();
      closeMotivosPerda(); closeVendaGanha(); closeAddAsLeadModal();
      closeNovaConversaModal(); closeDescarteModal();
      closeAlunaModal(); closeSessaoModal(); closeContratoModal();
      closeSearch(); closeDupCompare(); closeDupWarn('cancel'); closeDrillDown();
    }
  });
}

// ─── SHORTHAND ───────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

// ─── BUBBLE COLOR & STYLE SETTINGS ──────────────────────────────────
function applyBubbleColors() {
  function hexToRgba(hex, a) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${a})`;
  }
  const sentHex = localStorage.getItem('fdv_bubble_sent_hex') || '#CE9221';
  const recvHex = localStorage.getItem('fdv_bubble_recv_hex') || '#2d444a';
  document.documentElement.style.setProperty('--bubble-sent-bg',  hexToRgba(sentHex, .50));
  document.documentElement.style.setProperty('--bubble-sent-brd', hexToRgba(sentHex, .65));
  document.documentElement.style.setProperty('--bubble-recv-bg',  recvHex);
}

function applyBubbleStyle() {
  const style = localStorage.getItem('fdv_bubble_style') || '';
  if (style) document.body.setAttribute('data-bubble-style', style);
  else document.body.removeAttribute('data-bubble-style');
}

// ─── CHAT FONT SETTINGS ───────────────────────────────────────────────
const CHAT_FONTS = {
  inter:        { label: 'Inter',            gf: 'Inter:wght@400;500;600',                      css: "'Inter', sans-serif" },
  roboto:       { label: 'Roboto',           gf: 'Roboto:wght@400;500;700',                     css: "'Roboto', sans-serif" },
  'open-sans':  { label: 'Open Sans',        gf: 'Open+Sans:wght@400;500;600',                  css: "'Open Sans', sans-serif" },
  lato:         { label: 'Lato',             gf: 'Lato:wght@400;700',                           css: "'Lato', sans-serif" },
  nunito:       { label: 'Nunito',           gf: 'Nunito:wght@400;500;600',                     css: "'Nunito', sans-serif" },
  poppins:      { label: 'Poppins',          gf: 'Poppins:wght@400;500;600',                    css: "'Poppins', sans-serif" },
  raleway:      { label: 'Raleway',          gf: 'Raleway:wght@400;500;600',                    css: "'Raleway', sans-serif" },
  montserrat:   { label: 'Montserrat',       gf: 'Montserrat:wght@400;500;600',                 css: "'Montserrat', sans-serif" },
  quicksand:    { label: 'Quicksand',        gf: 'Quicksand:wght@400;500;600',                  css: "'Quicksand', sans-serif" },
  'dm-sans':    { label: 'DM Sans',          gf: 'DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500', css: "'DM Sans', sans-serif" },
  playfair:     { label: 'Playfair Display', gf: 'Playfair+Display:wght@400;700',               css: "'Playfair Display', serif" },
  merriweather: { label: 'Merriweather',     gf: 'Merriweather:wght@400;700',                   css: "'Merriweather', serif" },
  'comic-neue': { label: 'Comic Neue',       gf: 'Comic+Neue:wght@400;700',                     css: "'Comic Neue', cursive" },
  'space-mono': { label: 'Space Mono',       gf: 'Space+Mono:wght@400;700',                     css: "'Space Mono', monospace" },
  pacifico:     { label: 'Pacifico',         gf: 'Pacifico',                                    css: "'Pacifico', cursive" },
};

function loadGoogleFont(key) {
  if (!key || !CHAT_FONTS[key]) return;
  const id = `gf-${key}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id   = id;
  link.rel  = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${CHAT_FONTS[key].gf}&display=swap`;
  document.head.appendChild(link);
}

function applyChatFont() {
  const key = localStorage.getItem('fdv_chat_font') || '';
  if (key && CHAT_FONTS[key]) {
    loadGoogleFont(key);
    document.documentElement.style.setProperty('--chat-font', CHAT_FONTS[key].css);
  } else {
    document.documentElement.style.removeProperty('--chat-font');
  }
}

function applyChatFontSize() {
  const size = parseInt(localStorage.getItem('fdv_chat_font_size') || '13', 10);
  // Injeta (ou atualiza) um <style> dedicado que afeta APENAS o texto
  // dentro dos balões, sem herança em avatares, padding ou outros elementos.
  let el = document.getElementById('_fdv-chat-font-style');
  if (!el) {
    el = document.createElement('style');
    el.id = '_fdv-chat-font-style';
    document.head.appendChild(el);
  }
  el.textContent = `.chat-bubble { font-size: ${size}px !important; }`;
}

// ─── ESTRELAR MENSAGEM ───────────────────────────────────────────────
async function toggleStarMessage(msgId) {
  const msg = chatMessages.find(m => m.id === msgId); if (!msg || !isLive) return;
  const newVal = !msg.starred;
  const { error } = await supabase.from('lead_messages').update({ starred: newVal }).eq('id', msgId);
  if (error) { toast('Erro ao estrelar.', 'err'); return; }
  msg.starred = newVal;
  const btn = document.querySelector(`.chat-star-btn[data-msg-id="${msgId}"]`);
  if (btn) btn.classList.toggle('chat-star-btn--on', newVal);
  toast(newVal ? 'Mensagem estrelada.' : 'Estrela removida.', 'ok');
}

// ─── COPIAR MENSAGEM ─────────────────────────────────────────────────
function copyChatMsg(msg) {
  const text = msg.text || '';
  navigator.clipboard.writeText(text)
    .then(() => toast('Texto copiado.', 'ok'))
    .catch(() => toast('Não foi possível copiar.', 'err'));
}

// ─── ENCAMINHAR MENSAGEM ─────────────────────────────────────────────
function openForwardModal(msgId) {
  const msg = chatMessages.find(m => m.id === msgId); if (!msg) return;
  let existing = $('forward-modal');
  if (existing) existing.remove();

  const convs = [
    ...allLeads.filter(l => l.last_message_at || l.lastMessageAt).map(l => ({
      id: l.id, type: 'lead', name: l.nome || l.celular || '—',
    })),
    ...allContacts.map(c => ({
      id: c.id, type: 'contact', name: c.push_name || c.phone || '—',
    })),
  ].filter(c => !(c.type === 'lead' && c.id === chatLeadId) && !(c.type === 'contact' && c.id === chatContactId));

  const modal = document.createElement('div');
  modal.id = 'forward-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:380px">
      <div class="modal-header"><h3>Encaminhar mensagem</h3><button class="btn-ghost btn-icon" id="fwd-close">✕</button></div>
      <input class="filter-input" id="fwd-search" placeholder="Buscar conversa…" style="margin:12px 0;width:100%;box-sizing:border-box">
      <div id="fwd-list" style="max-height:300px;overflow-y:auto;display:flex;flex-direction:column;gap:4px"></div>
    </div>`;
  document.body.appendChild(modal);

  const renderList = (q = '') => {
    const filtered = convs.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));
    $('fwd-list').innerHTML = filtered.map(c =>
      `<button class="fwd-conv-btn" data-id="${esc(c.id)}" data-type="${c.type}">${esc(c.name)}</button>`
    ).join('') || '<p style="color:var(--t3);font-size:12px;text-align:center">Nenhuma conversa</p>';
  };
  renderList();

  $('fwd-search').addEventListener('input', e => renderList(e.target.value));
  $('fwd-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  $('fwd-list').addEventListener('click', async e => {
    const btn = e.target.closest('.fwd-conv-btn'); if (!btn) return;
    const { id, type } = btn.dataset;
    modal.remove();
    const instSel = $('central-chat-instance');
    const inst = instSel?.value || waInstances[0]?.instanceName || '';
    if (!inst) { toast('Selecione uma instância.', 'err'); return; }
    let phone = null;
    if (type === 'lead') {
      const lead = allLeads.find(l => l.id === id);
      phone = normalizePhoneForEvolution(lead?.celular);
    } else {
      const contact = allContacts.find(c => c.id === id);
      phone = contact?.phone ? normalizePhoneForEvolution(contact.phone) || contact.phone : null;
    }
    if (!phone) { toast('Contato sem número.', 'err'); return; }
    try {
      const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${inst}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_API_KEY },
        body: JSON.stringify({ number: phone, text: msg.text }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast('Mensagem encaminhada.', 'ok');
    } catch(err) { toast('Erro ao encaminhar: ' + err.message, 'err'); }
  });
}

// ─── BOOT ────────────────────────────────────────────────────────────
applyBubbleColors();
applyBubbleStyle();
applyChatFont();
applyChatFontSize();
bindEvents();
initAuth();
