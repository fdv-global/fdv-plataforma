import { initializeApp, deleteApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SB_URL     = 'https://yadxcbhginjvoemacdly.supabase.co';
const SB_ANON    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZHhjYmhnaW5qdm9lbWFjZGx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Njc5ODEsImV4cCI6MjA5MjU0Mzk4MX0.n0_WC_KDBX4kdag8N6dYe2Xs0E284U2JESmNKyWT4Wo';
// TODO: após aplicar supabase/migrations/003_anon_rls_policies.sql, remover SB_SERVICE_KEY
// e mudar createClient(SB_URL, SB_SERVICE_KEY) de volta para createClient(SB_URL, SB_ANON)
const SB_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZHhjYmhnaW5qdm9lbWFjZGx5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk2Nzk4MSwiZXhwIjoyMDkyNTQzOTgxfQ.Vp_JSA4ReP40a25L8GS7stNdROAy5YIIw-7HM98z_RY';

// ─── CLOSERS ─────────────────────────────────────────────────────────
const CLOSERS = {
  fernanda: { name: 'Fernanda', waName: 'Fernanda Ayub',      icon: '⭐', color: '#CE9221', bg: 'rgba(206,146,33,.12)', calLink: 'https://calendar.app.google/hWWi6tVKAhoXg5cUA' },
  thomaz:   { name: 'Thomaz',   waName: 'Thomaz Empresarial', icon: '🧑', color: '#4db5c8', bg: 'rgba(77,181,200,.12)',  calLink: 'https://calendar.app.google/1heVe3395Tsk9GeM8' }
};

// ─── ADMIN EMAILS — auto-provisionados como admin no primeiro login ──
const ADMIN_EMAILS = [
  'muyane.petters@faculdadedavida.com.br',
  'thomaz@faculdadedavida.com.br',
];

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
const KANBAN_LS_KEY = 'fdv_kanban_columns';
const DEFAULT_KANBAN_COLS = [
  { id: 'agendado',       label: 'Agendado' },
  { id: 'call_realizada', label: 'Call Realizada' },
  { id: 'fechamento',     label: 'Fechamento' },
  { id: 'followup',       label: 'Follow Up' },
  { id: 'venda_ganha',    label: 'Venda Ganha' },
  { id: 'venda_perdida',  label: 'Venda Perdida' },
];

function getKanbanCols() {
  try { const s = localStorage.getItem(KANBAN_LS_KEY); if (s) return JSON.parse(s); } catch(e) {}
  return structuredClone(DEFAULT_KANBAN_COLS);
}
function saveKanbanCols(cols) { localStorage.setItem(KANBAN_LS_KEY, JSON.stringify(cols)); }

// ─── STATE ───────────────────────────────────────────────────────────
let allLeads       = [];
let filteredLeads  = [];
let currentId      = null;
let modalMode      = 'agendar';
let supabase       = null;
let isLive         = false;
let currentUserDbId = null; // UUID do usuario na tabela Supabase
let selectedIds   = new Set();
let perfilLeadId  = null;
let novoLeadId    = null;
let auth          = null;
let storage       = null;
let currentUser   = null;
let currentRole   = null;
let leadsLoaded   = false;
let usuariosUnsub = null;
let allUsuarios   = [];
let activeTab     = 'inicio';
let activeSub     = 'leads';
let dragLeadId    = null;
let cal = { step: 1, closer: null, leadSnap: null };
let agendaCalYear  = 0;
let agendaCalMonth = 0;

// WhatsApp state
let waInstances        = [];
let waInstancesLoaded  = false;
let activeWaSub        = 'instancias';
let qrInstanceId       = null;
let qrTimerInterval    = null;
let qrPollingInterval  = null;
let qrSecondsLeft      = 60;

// Chat state
let chatLeadId         = null;
let chatUnsubscribe    = null;
let chatMessages       = [];
let chatActiveSide     = null;

// Motivo de perda state
let mpLeadId  = null;
let mpSelected = null;

// Kanban search
let kanbanSearchText = '';

// Notification state
let notifUnsub = null;
let allNotifs  = [];

// ─── MOTIVOS DE PERDA ────────────────────────────────────────────────
const MOTIVOS_PERDA = [
  {
    cat: '💰 Financeiro',
    items: [
      { id: 'sem_condicoes', icon: 'wallet',       label: 'Sem condições financeiras no momento' },
      { id: 'valor_alto',    icon: 'trending-down', label: 'Valor acima do orçamento' },
    ]
  },
  {
    cat: '👤 Perfil',
    items: [
      { id: 'sem_perfil',  icon: 'user-x',       label: 'Não tem o perfil ideal para o programa' },
      { id: 'momento_vida',icon: 'clock',         label: 'Momento de vida não adequado' },
      { id: 'expectativas',icon: 'alert-circle',  label: 'Expectativas não alinhadas com o programa' },
    ]
  },
  {
    cat: '📵 Contato',
    items: [
      { id: 'sem_resposta',  icon: 'message-x', label: 'Não respondeu após follow up' },
      { id: 'desapareceu',   icon: 'ghost',     label: 'Desapareceu após a call' },
      { id: 'numero_errado', icon: 'phone-off', label: 'Número errado/inativo' },
    ]
  },
  {
    cat: '📝 Outro',
    items: [
      { id: 'outro', icon: 'pencil', label: 'Outro (campo livre)' },
    ]
  },
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

// ─── AUTH ────────────────────────────────────────────────────────────
function initAuth() {
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
      loadCurrentUserProfile(user.uid);
      if (!leadsLoaded) { leadsLoaded = true; loadLeads(); }
      if (role === 'admin') loadUsuarios();
      loadNotifications(user.uid);
      switchTab('inicio');
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
      currentUserDbId = userRow.id;
      return userRow.role || (ADMIN_EMAILS.includes(user.email) ? 'admin' : null);
    }

    // Não existe — provisionar admin se email autorizado
    console.log('[FDV] resolveRole: sem registro, checando ADMIN_EMAILS para', user.email);
    if (ADMIN_EMAILS.includes(user.email)) {
      console.log('[FDV] resolveRole: provisionando admin no Supabase...');
      try {
        const { data: newUser, error: insErr } = await supabase
          .from('usuarios')
          .insert({ firebase_uid: user.uid, email: user.email, nome: user.email.split('@')[0], role: 'admin', ativo: true })
          .select()
          .single();
        if (!insErr && newUser) currentUserDbId = newUser.id;
        console.log('[FDV] resolveRole: admin provisionado');
      } catch(writeErr) {
        console.warn('[FDV] resolveRole: falha ao provisionar admin:', writeErr.message);
      }
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
  const roleBadge = role => {
    const map    = { admin: 'accent-gold', closer: 'accent-petro', operacoes: 'accent-sand' };
    const labels = { admin: 'Admin', closer: 'Closer', operacoes: 'Operações' };
    return `<span class="lead-status-badge ${map[role]||''}">${labels[role]||role}</span>`;
  };
  tbody.innerHTML = lista.map(u => {
    const initials = esc((u.nome||u.email||'?')[0].toUpperCase());
    const avatar   = u.photoURL
      ? `<img class="usuario-avatar" src="${esc(u.photoURL)}" alt="">`
      : `<span class="usuario-avatar usuario-avatar--initials">${initials}</span>`;
    return `
    <tr>
      <td><div class="usuario-nome-cell">${avatar}<span>${esc(u.nome||'—')}</span></div></td>
      <td>${esc(u.email)}</td>
      <td>
        <select class="filter-select usuario-role-sel" data-uid="${u.id}">
          <option value="admin"${u.role==='admin'?' selected':''}>Admin</option>
          <option value="closer"${u.role==='closer'?' selected':''}>Closer</option>
          <option value="operacoes"${u.role==='operacoes'?' selected':''}>Operações</option>
        </select>
      </td>
      <td>${roleBadge(u.role)}</td>
      <td><span class="lead-status-badge ${u.ativo?'accent-green':'accent-marsala'}">${u.ativo?'Ativo':'Inativo'}</span></td>
      <td class="usuario-acoes">
        <button class="btn-ghost btn-sm usuario-edit-btn" data-uid="${u.id}">
          Editar
        </button>
        <button class="btn-ghost btn-sm usuario-delete-btn" data-uid="${u.id}" data-nome="${esc(u.nome||u.email)}">
          Excluir
        </button>
      </td>
    </tr>`;
  }).join('');
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
    const { error: updErr } = await supabase.from('usuarios')
      .update({ nome, email, role, ...(photoURL && { photo_url: photoURL }) }).eq('id', uid);
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

    const { error: insErr2 } = await supabase.from('usuarios').insert({
      firebase_uid: uid, email, nome, role, ativo: true,
      ...(photoURL && { photo_url: photoURL }),
    });
    if (insErr2) throw insErr2;
    await signOut(tempAuth);
    closeNovoUsuario();
    toast('Usuário criado com sucesso!', 'ok');
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

function mapWaInstance(row) {
  return { ...row, instanceName: row.instance_name, displayName: row.display_name, phoneNumber: row.phone_number, lastActivity: row.last_activity };
}

// ─── LOAD ────────────────────────────────────────────────────────────
function loadLeads() {
  if (!isLive) {
    setTimeout(() => {
      allLeads = structuredClone(DEMO);
      $('loading-layer').style.display = 'none';
      $('demo-banner').style.display = 'block';
      renderAll();
    }, 600);
    return;
  }

  const fetchLeads = async () => {
    try {
      const [{ data: leads, error }, { data: histRows }] = await Promise.all([
        supabase.from('leads').select('*'),
        supabase.from('lead_historico').select('*').order('movido_em', { ascending: true }),
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
      allLeads = (leads || []).map(d => mapLead(d, histMap));
      $('loading-layer').style.display = 'none';
      renderAll();
    } catch(err) { $('loading-layer').style.display = 'none'; showDbError(err.message); }
  };

  fetchLeads();

  supabase.channel('leads_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchLeads)
    .subscribe();
}

function showDbError(msg) {
  $('table-wrap').innerHTML = `<div style="padding:48px 32px;text-align:center">
    <div style="font-size:28px;margin-bottom:16px">⚠️</div>
    <h3 style="font-size:16px;font-weight:700;margin-bottom:10px">Não foi possível carregar os leads</h3>
    <p style="font-size:13px;color:var(--text-muted)">${esc(msg||'Erro desconhecido')}</p>
  </div>`;
}

// ─── TAB / SUB SWITCHING ─────────────────────────────────────────────
function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
  const panel = $('tab-' + tab);
  if (panel) panel.style.display = '';
  document.querySelectorAll('.nav-link[data-tab]').forEach(l =>
    l.classList.toggle('active', l.dataset.tab === tab)
  );
  populateAllMonths();
  if      (tab === 'inicio')       renderInicio();
  else if (tab === 'agendamentos') renderActiveSub();
  else if (tab === 'closer')       renderKanban();
  else if (tab === 'relatorios')   renderRelatorios();
  else if (tab === 'whatsapp')     { if (!waInstancesLoaded) loadWaInstances(); else renderInstancias(); }
}

function switchSub(sub) {
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
  if      (activeSub === 'leads')   { populateMonths(); applyFilters(); }
  else if (activeSub === 'agenda')  renderAgendaSub();
  else if (activeSub === 'briefing') renderBriefingSub();
}

// ─── RENDER ALL ──────────────────────────────────────────────────────
function renderAll() {
  allLeads.sort((a, b) => (b.datachegada || '').localeCompare(a.datachegada || ''));
  populateAllMonths();
  updateStats();
  if      (activeTab === 'inicio')       renderInicio();
  else if (activeTab === 'agendamentos') renderActiveSub();
  else if (activeTab === 'closer')       renderKanban();
  else if (activeTab === 'relatorios')   renderRelatorios();
  else if (activeTab === 'whatsapp')     renderInstancias();
}

// ─── INÍCIO ──────────────────────────────────────────────────────────
const VERSES = [
  "Bem-aventurado o homem que não anda no conselho dos ímpios... Será como árvore plantada junto a correntes de águas. — Salmos 1:1,3",
  "O Senhor é o meu pastor e nada me faltará. — Salmos 23:1",
  "Ainda que eu andasse pelo vale da sombra da morte, não temeria mal nenhum, pois tu estás comigo. — Salmos 23:4",
  "Deleita-te também no Senhor, e ele te concederá os desejos do teu coração. — Salmos 37:4",
  "Entrega o teu caminho ao Senhor; confia nele, e ele o fará. — Salmos 37:5",
  "Cria em mim, ó Deus, um coração puro. — Salmos 51:10",
  "Deus é o nosso refúgio e força, socorro bem presente na angústia. — Salmos 46:1",
  "Como o cervo anseia pelas correntes das águas, assim a minha alma anseia por ti, ó Deus. — Salmos 42:1",
  "A tua palavra é lâmpada para os meus pés e luz para o meu caminho. — Salmos 119:105",
  "O Senhor te guardará de todo o mal; ele guardará a tua alma. — Salmos 121:7",
  "Os que semeiam com lágrimas colherão com alegria. — Salmos 126:5",
  "Ele me faz deitar em pastos verdejantes, guia-me mansamente a águas tranquilas. — Salmos 23:2",
  "Não há falta para os que o temem. — Salmos 34:9",
  "Louvarei ao Senhor enquanto viver; cantarei louvores ao meu Deus enquanto eu existir. — Salmos 146:2",
  "Confia no Senhor de todo o teu coração e não te apoies no teu próprio entendimento. — Provérbios 3:5",
  "Reconhece-o em todos os teus caminhos, e ele endireitará as tuas veredas. — Provérbios 3:6",
  "O fruto do justo é árvore da vida. — Provérbios 11:30",
  "Onde não há visão o povo perece. — Provérbios 29:18",
  "Instrui o jovem no caminho em que deve andar; e até quando envelhecer não se desviará dele. — Provérbios 22:6",
  "Bendito o homem que confia no Senhor... Será como árvore plantada junto às águas. — Jeremias 17:7-8",
  "Porque sou eu que conheço os planos que tenho para vocês, planos de fazê-los prosperar e não de causar dano, planos de dar a vocês esperança e um futuro. — Jeremias 29:11",
  "Clama a mim e eu te responderei, e te anunciarei coisas grandes e ocultas. — Jeremias 33:3",
  "Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus. — Isaías 41:10",
  "Os que esperam no Senhor renovam as suas forças, sobem com asas como águias. — Isaías 40:31",
  "Eis que faço uma coisa nova; está a brotar; não a percebeis? — Isaías 43:19",
  "Eu sou a videira, vocês são os ramos. Quem permanece em mim e eu nele dará muito fruto. — João 15:5",
  "Eu vim para que tenham vida, e a tenham em abundância. — João 10:10",
  "Busquem primeiro o Reino de Deus e a sua justiça, e todas essas coisas lhes serão acrescentadas. — Mateus 6:33",
  "Vinde a mim, todos os que estais cansados e sobrecarregados, e eu vos aliviarei. — Mateus 11:28",
  "E conhecereis a verdade, e a verdade vos libertará. — João 8:32",
  "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito. — João 3:16",
  "Pedi e dar-se-vos-á; buscai e achareis; batei e abrir-se-vos-á. — Mateus 7:7",
  "Eu sou o caminho, a verdade e a vida. — João 14:6",
  "Tudo posso naquele que me fortalece. — Filipenses 4:13",
  "Alegrem-se sempre no Senhor. Repito: alegrem-se! — Filipenses 4:4",
  "A paz de Deus, que excede todo o entendimento, guardará os vossos corações. — Filipenses 4:7",
  "Não vos inquieteis com nada; antes em tudo, pela oração e súplica, com ação de graças. — Filipenses 4:6",
  "O fruto do Espírito é amor, alegria, paz, paciência, amabilidade, bondade, fidelidade. — Gálatas 5:22",
  "Não nos cansemos de fazer o bem, pois a seu tempo ceifaremos, se não desanimarmos. — Gálatas 6:9",
  "Sede fortes e corajosos. Não temais nem vos assusteis. — Josué 1:9",
  "Não vos conformeis com este século, mas transformai-vos pela renovação da vossa mente. — Romanos 12:2",
  "Se Deus é por nós, quem será contra nós? — Romanos 8:31",
  "Tudo coopera para o bem daqueles que amam a Deus. — Romanos 8:28",
  "Agora, pois, permanecem a fé, a esperança e o amor; mas o maior destes é o amor. — 1 Coríntios 13:13",
  "Sede fortes no Senhor e na força do seu poder. — Efésios 6:10",
  "Porque pela graça sois salvos, mediante a fé. — Efésios 2:8",
  "Aquele que começou boa obra em vós a aperfeiçoará até ao dia de Cristo Jesus. — Filipenses 1:6",
  "Mas os que esperam no Senhor renovam as suas forças; sobem com asas como águias. — Isaías 40:31",
  "Deus não nos deu espírito de covardia, mas de poder, de amor e de equilíbrio. — 2 Timóteo 1:7",
  "Seja forte e corajoso! Não se apavore nem desanime, pois o Senhor, o seu Deus, estará com você. — Josué 1:9",
  "O nome do Senhor é uma torre forte; o justo corre para ela e fica seguro. — Provérbios 18:10",
];

function renderInicio() {
  const el = document.getElementById('inicio-content');
  if (!el) return;

  const now   = new Date();
  const hour  = now.getHours();
  const greet = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const name  = esc(currentUser?.displayName || (currentUser?.email?.split('@')[0]) || 'visitante');
  const datePt = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const dateStr = datePt.charAt(0).toUpperCase() + datePt.slice(1);

  const start     = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  const raw       = VERSES[dayOfYear % VERSES.length];
  const sep       = raw.lastIndexOf(' \u2014 ');
  const verseText = sep >= 0 ? raw.slice(0, sep) : raw;
  const verseRef  = sep >= 0 ? raw.slice(sep + 3) : '';

  const todayStr  = now.toISOString().slice(0, 10);
  const thisMonth = todayStr.slice(0, 7);
  const callsHoje = allLeads.filter(l => (l.dataagendamento || '').startsWith(todayStr)).length;
  const aguardando = allLeads.filter(l => l.status === 'aguardando').length;
  const vendasMes  = allLeads.filter(l => l.kanban_column === 'venda_ganha' &&
    ((l.dataagendamento || l.datachegada || '').startsWith(thisMonth))).length;

  el.innerHTML = `
    <div class="inicio-header">
      <h1 class="inicio-greeting">${greet}, ${name}!</h1>
      <p class="inicio-date">${dateStr}</p>
    </div>
    <div class="inicio-verse-card">
      <div class="inicio-verse-text">${verseText}</div>
      <div class="inicio-verse-ref">${verseRef}</div>
    </div>
    <div class="inicio-stats">
      <div class="stat-card accent-petro">
        <div class="stat-top"><span class="stat-label">Calls Hoje</span><span class="stat-icon">📅</span></div>
        <strong class="stat-num">${callsHoje}</strong>
        <span class="stat-sub">agendadas para hoje</span>
      </div>
      <div class="stat-card accent-gold">
        <div class="stat-top"><span class="stat-label">Aguardando</span><span class="stat-icon">◷</span></div>
        <strong class="stat-num">${aguardando}</strong>
        <span class="stat-sub">leads para agendar</span>
      </div>
      <div class="stat-card accent-green">
        <div class="stat-top"><span class="stat-label">Vendas do Mês</span><span class="stat-icon">◆</span></div>
        <strong class="stat-num">${vendasMes}</strong>
        <span class="stat-sub">fechadas este mês</span>
      </div>
    </div>
  `;
}

// ─── LEADS LIST ──────────────────────────────────────────────────────
function applyFilters() {
  const status = $('filter-status').value;
  const origem = $('filter-origem').value;
  const mes    = $('filter-mes').value;
  const busca  = $('filter-busca').value.toLowerCase().trim();

  filteredLeads = allLeads.filter(l => {
    if (status && l.status !== status) return false;
    if (origem && l.origem !== origem) return false;
    if (mes    && !(l.datachegada || '').startsWith(mes)) return false;
    if (busca) {
      const n = (l.nome    || '').toLowerCase();
      const c = (l.celular || '').toLowerCase();
      if (!n.includes(busca) && !c.includes(busca)) return false;
    }
    return true;
  });

  renderTable();
  renderCards();
  updateCount();
  updateStats();
}

// ─── AGENDA SUB ──────────────────────────────────────────────────────
function renderAgendaSub() {
  const dataFilt   = $('agenda-filter-data')?.value;
  const mesFilt    = $('agenda-filter-mes').value;
  const closerFilt = $('agenda-filter-closer').value;
  const content    = $('agenda-content');

  // Mini cal — inicializa no mês atual se for a primeira vez
  if (agendaCalYear === 0) { const n = new Date(); agendaCalYear = n.getFullYear(); agendaCalMonth = n.getMonth(); }
  renderMiniCal(agendaCalYear, agendaCalMonth);

  let leads = allLeads.filter(l => l.status === 'agendado');
  if (dataFilt)          leads = leads.filter(l => l.dataagendamento === dataFilt);
  else if (mesFilt)      leads = leads.filter(l => (l.dataagendamento || '').startsWith(mesFilt));
  if (closerFilt) leads = leads.filter(l => (l.closer || '') === closerFilt);

  if (!leads.length) {
    content.innerHTML = `<div class="agenda-empty">
      <i data-lucide="calendar-x" class="empty-lucide"></i>
      <h3>Nenhuma call encontrada</h3><p>Sem calls para os filtros selecionados.</p></div>`;
    lucide.createIcons();
    return;
  }

  const groups = {};
  leads.forEach(l => {
    const k = l.closer || '_sem';
    if (!groups[k]) groups[k] = [];
    groups[k].push(l);
  });
  Object.values(groups).forEach(arr =>
    arr.sort((a, b) => ((a.dataagendamento||'')+(a.horaagendamento||'')).localeCompare((b.dataagendamento||'')+(b.horaagendamento||'')))
  );

  const order = ['fernanda','thomaz',...Object.keys(groups).filter(k => k!=='fernanda' && k!=='thomaz')];

  content.innerHTML = order.filter(k => groups[k]?.length).map(key => {
    const c     = CLOSERS[key];
    const name  = c ? c.name : (key === '_sem' ? 'Sem closer' : key);
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
            <div class="agenda-card-time">${esc(l.horaagendamento||'—')}</div>
            <div class="agenda-card-info">
              <button class="agenda-card-nome" data-perfil="${l.id}">${esc(l.nome||'—')}</button>
              <span class="agenda-card-sub">${[
                fmtDate(l.dataagendamento),
                l.celular, l.origem, l.renda,
                l.agendadopor ? 'via '+l.agendadopor : null
              ].filter(Boolean).map(esc).join(' · ')}</span>
              ${(l.etiquetas||[]).length ? `<div class="card-etiquetas">${(l.etiquetas||[]).map(t=>etiquetaChip(t,true)).join('')}</div>` : ''}
            </div>
            <button class="btn-ghost btn-sm btn-briefing" data-id="${l.id}">Copiar Briefing</button>
          </div>`).join('')}
      </div>
    </div>`;
  }).join('');

  content.querySelectorAll('[data-perfil]').forEach(b =>
    b.addEventListener('click', () => { const l = allLeads.find(x=>x.id===b.dataset.perfil); if(l) openPerfil(l); })
  );
  content.querySelectorAll('.btn-briefing').forEach(b =>
    b.addEventListener('click', () => { const l = allLeads.find(x=>x.id===b.dataset.id); if(l) gerarBriefingLead(l); })
  );
}

// ─── BRIEFING SUB ────────────────────────────────────────────────────
function renderBriefingSub() {
  const dataFilt   = $('briefing-filter-data')?.value;
  const mesFilt    = $('briefing-filter-mes').value;
  const closerFilt = $('briefing-filter-closer').value;
  const content    = $('briefing-content');

  let leads = allLeads.filter(l => l.dataagendamento);
  if (dataFilt)          leads = leads.filter(l => l.dataagendamento === dataFilt);
  else if (mesFilt)      leads = leads.filter(l => (l.dataagendamento||'').startsWith(mesFilt));
  if (closerFilt) leads = leads.filter(l => (l.closer||'') === closerFilt);
  leads.sort((a,b) => ((a.dataagendamento||'')+(a.horaagendamento||'')).localeCompare((b.dataagendamento||'')+(b.horaagendamento||'')));

  if (!leads.length) {
    content.innerHTML = `<div class="agenda-empty">
      <i data-lucide="clipboard-list" class="empty-lucide"></i>
      <h3>Nenhum briefing disponível</h3><p>Sem leads agendados para os filtros selecionados.</p></div>`;
    lucide.createIcons();
    return;
  }

  content.innerHTML = `<div class="briefing-list">${leads.map(l => {
    const closerName = l.closer ? (CLOSERS[l.closer]?.name||l.closer) : '—';
    const fields = [
      ['Nome', l.nome], ['Celular', l.celular], ['E-mail', l.email],
      ['Instagram', l.instagram], ['Profissão', l.profissao], ['Renda', l.renda],
      ['Origem', l.origem], ['Call', l.dataagendamento ? `${fmtDate(l.dataagendamento)} às ${l.horaagendamento||'—'}` : null],
      ['Closer', closerName], ['Agendado por', l.agendadopor],
      ['Etiquetas', (l.etiquetas||[]).join(', ')],
      ['Observações', l.observacoes],
    ].filter(([,v]) => v);

    return `<div class="briefing-card">
      <div class="briefing-card-head">
        <div>
          <button class="briefing-nome" data-perfil="${l.id}">${esc(l.nome||'—')}</button>
          <span class="briefing-meta">${fmtDateHora(l.dataagendamento,l.horaagendamento)} · ${esc(closerName)}</span>
        </div>
        <button class="btn-ghost btn-sm btn-briefing" data-id="${l.id}">📋 Copiar</button>
      </div>
      <div class="briefing-fields">
        ${fields.map(([l,v])=>`<div class="briefing-field"><span class="briefing-lbl">${esc(l)}</span><span class="briefing-val">${esc(v||'—')}</span></div>`).join('')}
      </div>
    </div>`;
  }).join('')}</div>`;

  content.querySelectorAll('[data-perfil]').forEach(b =>
    b.addEventListener('click', () => { const l = allLeads.find(x=>x.id===b.dataset.perfil); if(l) openPerfil(l); })
  );
  content.querySelectorAll('.btn-briefing').forEach(b =>
    b.addEventListener('click', () => { const l = allLeads.find(x=>x.id===b.dataset.id); if(l) gerarBriefingLead(l); })
  );
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

  const daysWithCalls = new Set(
    allLeads
      .filter(l => l.status === 'agendado' && (l.dataagendamento||'').startsWith(ym))
      .map(l => l.dataagendamento)
  );

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let grid = '';
  for (let i = 0; i < firstDay; i++) grid += `<div class="mcal-day mcal-day--empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const iso  = `${ym}-${String(d).padStart(2,'0')}`;
    const cls  = ['mcal-day',
      daysWithCalls.has(iso)          ? 'mcal-day--calls' : '',
      selectedDate === iso            ? 'mcal-day--sel' : '',
      iso === today && selectedDate !== iso ? 'mcal-day--today' : '',
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
  `;

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
  if (lead.kanban_column) return lead.kanban_column;
  if (lead.status === 'agendado') return 'agendado';
  if (lead.status === 'noshow' || lead.status === 'cancelado') return 'venda_perdida';
  if (lead.status === 'realizada') {
    const sc = lead.status_closer;
    if (sc === 'followup')     return 'followup';
    if (sc === 'fechamento')   return 'fechamento';
    if (sc === 'venda_ganha')   return 'venda_ganha';
    if (sc === 'venda_perdida') return 'venda_perdida';
    return 'call_realizada';
  }
  return 'agendado';
}

function renderKanban() {
  const board      = $('kanban-board');
  const mesFilt    = $('kanban-filter-mes').value;
  const closerFilt = $('kanban-filter-closer').value;
  const cols       = getKanbanCols();

  // Sync quick-filter pills with the select value
  document.querySelectorAll('.kqf-btn').forEach(b => b.classList.toggle('active', b.dataset.closer === closerFilt));

  let leads = allLeads.filter(l => l.status !== 'aguardando');
  if (mesFilt)    leads = leads.filter(l => (l.dataagendamento||l.datachegada||'').startsWith(mesFilt));
  if (closerFilt) leads = leads.filter(l => (l.closer||'') === closerFilt);

  board.innerHTML = cols.map(col => {
    const colLeads = leads.filter(l => getLeadKanbanCol(l) === col.id);
    return `<div class="kanban-col" data-col="${col.id}">
      <div class="kanban-col-header">
        <span class="kanban-col-title" contenteditable="true" data-col="${col.id}">${esc(col.label)}</span>
        <span class="kanban-col-count">${colLeads.length}</span>
      </div>
      <div class="kanban-col-body" data-col="${col.id}">
        ${colLeads.length ? colLeads.map(l => kanbanCard(l, cols)).join('') : '<div class="kanban-empty"><i data-lucide="inbox" class="empty-lucide-sm"></i><span>Sem leads</span></div>'}
      </div>
    </div>`;
  }).join('');
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
      const cols = getKanbanCols();
      const col  = cols.find(c => c.id === el.dataset.col);
      if (col) { col.label = el.textContent.trim() || col.label; saveKanbanCols(cols); }
    });
    el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } });
  });

  // Card click handlers
  board.querySelectorAll('[data-perfil]').forEach(b =>
    b.addEventListener('click', () => { const l=allLeads.find(x=>x.id===b.dataset.perfil); if(l) openPerfil(l); })
  );
  board.querySelectorAll('.btn-kanban-resultado').forEach(b =>
    b.addEventListener('click', () => { const l=allLeads.find(x=>x.id===b.dataset.id); if(!l) return; currentId=l.id; openResultado(l); })
  );
  board.querySelectorAll('.btn-kanban-noshow').forEach(b =>
    b.addEventListener('click', async () => { currentId=b.dataset.id; await handlePostCall('noshow'); })
  );

  // Obs pós-call — salva no blur
  board.querySelectorAll('.kc-obs-input').forEach(ta => {
    ta.addEventListener('mousedown', e => e.stopPropagation()); // impede drag
    ta.addEventListener('blur', async () => {
      const id  = ta.dataset.id;
      const obs = ta.value.trim();
      const lead = allLeads.find(l => l.id === id);
      if (!lead || obs === (lead.obs_call || '').trim()) return;
      try { await saveLead(id, { obs_call: obs, atualizadoem: new Date().toISOString() }); }
      catch(e) { toast('Erro ao salvar obs.', 'err'); }
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
  const phone  = (l.celular||l.telefone||'').replace(/\D/g,'');
  const waHref = phone ? `https://wa.me/55${phone}` : null;

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
        ${unreadCount ? `<span class="kc-unread-badge">${unreadCount}</span>` : ''}
        ${days !== null ? `<span class="kc-days-badge ${daysClass}">${days}d</span>` : ''}
        ${badgeStatus(l.status)}
      </div>
    </div>
    ${etiquetas.length ? `<div class="kc-etiquetas">${etiquetas.map(t=>etiquetaChip(t,true)).join('')}</div>` : ''}
    ${l.dataagendamento ? `<div class="kc-datetime"><i data-lucide="calendar" class="kc-cal-icon"></i>${fmtDateHora(l.dataagendamento,l.horaagendamento)}</div>` : ''}
    <div class="kc-meta">
      ${closerName ? `<span class="kc-closer">${esc(closerName)}</span>` : ''}
      ${l.agendadopor ? `<span class="kc-resp">via ${esc(l.agendadopor)}</span>` : ''}
      ${badgeOrigem(l.origem)}
    </div>
    <div class="kc-foot">
      ${isAgendado ? `<button class="btn-kanban-noshow" data-id="${l.id}">No Show</button>` : ''}
      <button class="btn-kanban-resultado" data-id="${l.id}">${isAgendado?'Resultado →':'Ver →'}</button>
      ${waHref ? `<a class="kc-wa-btn" href="${waHref}" target="_blank" rel="noopener" title="WhatsApp"><i data-lucide="message-circle" class="kc-wa-icon"></i></a>` : ''}
      ${hist.length ? `<button class="kc-hist-toggle" title="Histórico"><i data-lucide="history"></i></button>` : ''}
    </div>
    ${histHtml}
    <div class="kc-move-wrap">
      <select class="kc-move-select" data-id="${l.id}">
        <option value="">Mover para…</option>
        ${moveOpts}
      </select>
    </div>
    <div class="kc-obs-wrap">
      <textarea class="kc-obs-input" data-id="${l.id}" placeholder="Obs. pós-call…">${esc(l.obs_call||'')}</textarea>
    </div>
  </div>`;
}

async function ensureObsSaved(leadId) {
  const ta   = document.querySelector(`.kc-obs-input[data-id="${leadId}"]`);
  if (!ta) return;
  const obs  = ta.value.trim();
  const lead = allLeads.find(l => l.id === leadId);
  if (!lead || obs === (lead.obs_call||'').trim()) return;
  try { await saveLead(leadId, { obs_call: obs, atualizadoem: new Date().toISOString() }); } catch(_) {}
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
    if (!isLive) renderKanban();
  } catch(e) {
    console.error(e);
    toast('Erro ao mover card.', 'err');
  }
}

function addKanbanColumn() {
  const label = prompt('Nome da nova coluna:');
  if (!label || !label.trim()) return;
  const cols = getKanbanCols();
  cols.push({ id: 'col_' + Date.now(), label: label.trim() });
  saveKanbanCols(cols);
  renderKanban();
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
      <div class="mp-cat-title">${esc(cat.cat)}</div>
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
function renderRelatorios() {
  const mesFilt    = $('rel-filter-mes').value;
  const origemFilt = $('rel-filter-origem').value;

  let base = [...allLeads];
  if (mesFilt)    base = base.filter(l => (l.datachegada||'').startsWith(mesFilt));
  if (origemFilt) base = base.filter(l => l.origem === origemFilt);

  const agendados  = base.filter(l => l.dataagendamento);
  const realizadas = base.filter(l => l.status === 'realizada');
  const noShows    = base.filter(l => l.status === 'noshow');
  const vendas     = base.filter(l => l.kanban_column === 'venda_ganha');

  const taxaComp    = agendados.length  ? pct(realizadas.length, agendados.length)  : 0;
  const taxaConv    = realizadas.length ? pct(vendas.length,     realizadas.length) : 0;
  const faturamento = vendas.reduce((s,l) => s + parseValor(l.venda_ganha_dados?.valor), 0);
  const ticketMedio = vendas.length ? Math.round(faturamento / vendas.length) : 0;

  // Por closer
  const closerMap = {};
  realizadas.forEach(l => {
    const k = l.closer||'_sem';
    if (!closerMap[k]) closerMap[k] = { agendados:0, realizadas:0, vendas:0, valor:0 };
    closerMap[k].realizadas++;
    if (l.kanban_column === 'venda_ganha') { closerMap[k].vendas++; closerMap[k].valor += parseValor(l.venda_ganha_dados?.valor); }
  });
  agendados.forEach(l => {
    const k = l.closer||'_sem';
    if (!closerMap[k]) closerMap[k] = { agendados:0, realizadas:0, vendas:0, valor:0 };
    closerMap[k].agendados++;
  });

  // Por origem
  const origemMap = {};
  base.forEach(l => {
    const o = l.origem||'Outros';
    if (!origemMap[o]) origemMap[o] = { total:0, agendados:0, realizadas:0, vendas:0 };
    origemMap[o].total++;
    if (l.dataagendamento) origemMap[o].agendados++;
    if (l.status==='realizada') origemMap[o].realizadas++;
    if (l.kanban_column === 'venda_ganha') origemMap[o].vendas++;
  });

  // Por responsável
  const respMap = {};
  agendados.forEach(l => {
    const r = l.agendadopor||'Desconhecido';
    if (!respMap[r]) respMap[r] = { agendados:0, realizadas:0, vendas:0 };
    respMap[r].agendados++;
    if (l.status==='realizada') respMap[r].realizadas++;
    if (l.kanban_column === 'venda_ganha') respMap[r].vendas++;
  });

  // Por mês
  const mesMap = {};
  base.forEach(l => {
    if (!l.datachegada) return;
    const m = l.datachegada.slice(0,7);
    if (!mesMap[m]) mesMap[m] = { total:0, realizadas:0, vendas:0, noShows:0, valor:0 };
    mesMap[m].total++;
    if (l.status==='realizada') mesMap[m].realizadas++;
    if (l.kanban_column === 'venda_ganha') { mesMap[m].vendas++; mesMap[m].valor += parseValor(l.venda_ganha_dados?.valor); }
    if (l.status==='noshow') mesMap[m].noShows++;
  });

  const relStatCard = (label, val, ico, accent='') => `
    <div class="stat-card ${accent}">
      <div class="stat-top"><span class="stat-label">${esc(label)}</span><span class="stat-icon">${ico}</span></div>
      <strong class="stat-num">${val}</strong>
    </div>`;

  // ── Ranking de origem por conversão
  const origemRanking = Object.entries(origemMap)
    .map(([o,d]) => ({ o, ...d, conv: d.realizadas ? pct(d.vendas,d.realizadas) : 0 }))
    .sort((a,b) => b.conv - a.conv || b.vendas - a.vendas);
  const maxLeads = Math.max(...Object.values(origemMap).map(d=>d.total), 1);

  // ── Comparativo mês a mês
  const mesEntries = Object.entries(mesMap).sort((a,b)=>a[0].localeCompare(b[0]));
  const maxMesLeads = Math.max(...mesEntries.map(([,d])=>d.total), 1);

  $('relatorios-content').innerHTML = `
    <div class="stats-grid rel-summary">
      ${relStatCard('Total de Leads', base.length, '◈')}
      ${relStatCard('Comparecimento', taxaComp+'%', '◉', 'accent-petro')}
      ${relStatCard('Conversão', taxaConv+'%', '◆', 'accent-green')}
      ${relStatCard('Faturamento', 'R$\xa0'+fmtValor(faturamento), '◈', 'accent-sand')}
      ${relStatCard('Ticket Médio', ticketMedio ? 'R$\xa0'+fmtValor(ticketMedio) : '—', '◈', 'accent-gold')}
      ${relStatCard('Vendas', vendas.length, '✦', 'accent-gold')}
    </div>

    ${mesEntries.length >= 2 ? `
    <div class="rel-section">
      <h3 class="rel-section-title">Comparativo Mês a Mês</h3>
      <div class="rel-chart">
        ${mesEntries.map(([m,d]) => `
          <div class="rel-chart-row">
            <span class="rel-chart-lbl">${fmtMes(m)}</span>
            <div class="rel-chart-bars">
              <div class="rel-bar rel-bar--leads"  style="width:${pct(d.total,maxMesLeads)}%" title="${d.total} leads"></div>
              <div class="rel-bar rel-bar--vendas"  style="width:${pct(d.vendas,maxMesLeads)}%" title="${d.vendas} vendas"></div>
            </div>
            <span class="rel-chart-val">${d.total} leads · ${d.vendas} vendas${d.valor?' · R$\xa0'+fmtValor(d.valor):''}</span>
          </div>`).join('')}
        <div class="rel-chart-legend">
          <span class="rel-legend-item"><i class="rel-legend-dot rel-legend-dot--leads"></i>Leads</span>
          <span class="rel-legend-item"><i class="rel-legend-dot rel-legend-dot--vendas"></i>Vendas</span>
        </div>
      </div>
    </div>` : ''}

    <div class="rel-section">
      <h3 class="rel-section-title">Ranking de Origem — Conversão</h3>
      <div class="rel-origin-rank">
        ${origemRanking.map((r,i) => `
          <div class="rel-rank-row">
            <span class="rel-rank-pos">${i+1}</span>
            <div class="rel-rank-info">
              <div class="rel-rank-name">${esc(r.o)}</div>
              <div class="rel-rank-bar-wrap">
                <div class="rel-rank-bar" style="width:${pct(r.total,maxLeads)}%"></div>
              </div>
            </div>
            <div class="rel-rank-nums">
              <span class="rel-rank-conv${r.conv>=50?' rel-rank-conv--hi':r.conv>=25?' rel-rank-conv--mid':''}">${r.conv}%</span>
              <span class="rel-rank-sub">${r.total} leads · ${r.vendas} vendas</span>
            </div>
          </div>`).join('')}
      </div>
    </div>

    ${relTable('Leads por Mês', ['Mês','Leads','Realizadas','Vendas','No Shows','Faturamento','Ticket Médio'],
      Object.entries(mesMap).sort((a,b)=>b[0].localeCompare(a[0])).map(([m,d])=> {
        const tm = d.vendas ? Math.round(d.valor/d.vendas) : 0;
        return [fmtMes(m), d.total, d.realizadas, d.vendas, d.noShows,
          d.valor?'R$\xa0'+fmtValor(d.valor):'—',
          tm?'R$\xa0'+fmtValor(tm):'—'];
      })
    )}

    ${relTable('Taxa de Conversão por Closer', ['Closer','Agendados','Realizadas','Vendas','Faturamento','Conv.'],
      Object.entries(closerMap).map(([c,d])=>
        [CLOSERS[c]?.name||c, d.agendados, d.realizadas, d.vendas,
         d.valor?'R$\xa0'+fmtValor(d.valor):'—',
         d.realizadas?pct(d.vendas,d.realizadas)+'%':'—'])
    )}

    ${relTable('Responsável pelo Agendamento', ['Responsável','Agendados','Realizadas','Vendas'],
      Object.entries(respMap).map(([r,d])=>[r, d.agendados, d.realizadas, d.vendas])
    )}

    ${!base.length ? '<div class="agenda-empty"><i data-lucide="bar-chart-2" class="empty-lucide"></i><h3>Sem dados</h3><p>Adicione leads ou ajuste os filtros.</p></div>' : ''}
  `;
  lucide.createIcons();
}

function relTable(title, headers, rows) {
  if (!rows.length) return '';
  return `<div class="rel-section">
    <h3 class="rel-section-title">${esc(title)}</h3>
    <div class="rel-table-wrap">
      <table class="rel-table">
        <thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(row=>`<tr>${row.map(cell=>`<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>
  </div>`;
}

function parseValor(v) {
  if (!v) return 0;
  return parseFloat(String(v).replace(/[^0-9,]/g,'').replace(',','.')) || 0;
}
function fmtValor(n) { return n.toLocaleString('pt-BR', {minimumFractionDigits:0,maximumFractionDigits:0}); }
function pct(a,b)    { return b ? Math.round(a/b*100) : 0; }
function fmtMes(m)   { if(!m) return '—'; const [y,mo]=m.split('-'); return `${MONTHS[+mo]} ${y}`; }

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
    const agendInfo = (l.status === 'agendado' && l.dataagendamento)
      ? `<span class="cell-agenda-info">${fmtDateHora(l.dataagendamento,l.horaagendamento)}<br>
          <span style="color:var(--text-dim);font-size:11px">${esc(CLOSERS[l.closer]?.name||l.closer||'—')}</span>
          ${l.agendadopor?`<br><span style="color:var(--text-dim);font-size:11px">via ${esc(l.agendadopor)}</span>`:''}
        </span>`
      : '—';
    const etiq = (l.etiquetas||[]).length
      ? (l.etiquetas||[]).slice(0,2).map(t=>etiquetaChip(t,true)).join('')
      : '—';
    return `<tr data-id="${l.id}" class="${selectedIds.has(l.id)?'row-selected':''}">
      <td class="cell-chk"><input type="checkbox" class="row-chk" data-id="${l.id}" ${selectedIds.has(l.id)?'checked':''}></td>
      <td class="cell-nome"><button class="nome-link" data-perfil="${l.id}">${esc(l.nome||'—')}</button></td>
      <td class="cell-fone">${esc(l.celular||'—')}</td>
      <td>${badgeOrigem(l.origem)}</td>
      <td class="cell-renda">${esc(l.renda||'—')}</td>
      <td>${etiq}</td>
      <td>${badgeStatus(l.status)}</td>
      <td class="cell-data">${agendInfo}</td>
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
  tbody.querySelectorAll('[data-perfil]').forEach(b =>
    b.addEventListener('click', e => { e.stopPropagation(); const l=allLeads.find(x=>x.id===b.dataset.perfil); if(l) openPerfil(l); })
  );
  tbody.querySelectorAll('[data-action]').forEach(b =>
    b.addEventListener('click', e => { e.stopPropagation(); handleAction(b.dataset.id, b.dataset.action); })
  );
  tbody.querySelectorAll('[data-postcall]').forEach(b =>
    b.addEventListener('click', e => { e.stopPropagation(); currentId=b.dataset.id; closeAllDropdowns(); handlePostCall(b.dataset.postcall); })
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
      ? `<div class="card-agenda-info">📅 ${fmtDateHora(l.dataagendamento,l.horaagendamento)} · ${esc(CLOSERS[l.closer]?.name||l.closer||'—')}</div>` : '';
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
}

// ─── HELPERS ─────────────────────────────────────────────────────────
function badgeOrigem(o) {
  const map = { Instagram:'instagram', Facebook:'facebook', Indicação:'indicacao', Google:'google', WhatsApp:'whatsapp', Outros:'outros' };
  return `<span class="badge-origem ${map[o]||'outros'}">${esc(o||'—')}</span>`;
}
function badgeStatus(s) {
  const labels = { aguardando:'Aguardando', agendado:'Agendado', realizada:'Call Realizada', noshow:'No Show', cancelado:'Cancelado' };
  return `<span class="badge-status ${s||''}">${labels[s]||s||'—'}</span>`;
}
function btnAcao(l) {
  const id = l.id;
  const canAgendar  = l.status !== 'cancelado';
  const canRemarcar = l.status === 'agendado' || l.status === 'noshow';
  const isAgendado  = l.status === 'agendado';
  const isRealizada = l.status === 'realizada';
  const opts = [
    canAgendar  ? `<button class="acao-opt opt-agendar"   data-id="${id}" data-action="agendar">📅 Agendar</button>`   : '',
                  `<button class="acao-opt opt-qualificar" data-id="${id}" data-action="qualificar">🔍 Ver Perfil</button>`,
    canRemarcar ? `<button class="acao-opt opt-remarcar"   data-id="${id}" data-action="agendar">🔄 Remarcar</button>` : '',
    isRealizada ? `<button class="acao-opt opt-ver"        data-id="${id}" data-action="ver">📋 Ver Resultado</button>`: '',
    isAgendado  ? `<div class="acao-sep"></div>
                   <button class="acao-opt opt-realizada" data-id="${id}" data-postcall="realizada">✅ Call Realizada</button>
                   <button class="acao-opt opt-noshow"    data-id="${id}" data-postcall="noshow">❌ No Show</button>
                   <button class="acao-opt opt-cancelado" data-id="${id}" data-postcall="cancelado">🚫 Cancelado</button>` : '',
  ].filter(Boolean).join('');
  return `<div class="acoes-cell">
    <div class="acoes-wrap" data-leadid="${id}">
      <button class="btn-acao-main" data-id="${id}" data-action="menu" title="Ações">⋯</button>
      <div class="acoes-dropdown">${opts}</div>
    </div>
    <button class="btn-icon btn-editar"  data-id="${id}" data-action="editar"  title="Editar">✏</button>
    <button class="btn-icon btn-excluir" data-id="${id}" data-action="excluir" title="Excluir">🗑</button>
  </div>`;
}
function fmtDate(d) {
  if (!d) return '—';
  if (typeof d.toDate === 'function') d = d.toDate().toISOString().slice(0,10);
  const [y,m,dd] = String(d).split('-');
  return `${dd}/${m}/${y}`;
}
function fmtDateHora(date, hora) { return date ? (hora ? `${fmtDate(date)} · ${hora}` : fmtDate(date)) : '—'; }
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
  if      (action === 'agendar')    openAgendar(lead);
  else if (action === 'qualificar') openPerfil(lead);
  else if (action === 'ver')        verDetalhes(lead);
  else if (action === 'editar')     openNovoLead(lead);
  else if (action === 'excluir')    deleteLead(id);
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
    } else { allLeads = allLeads.filter(l=>!selectedIds.has(l.id)); renderAll(); }
    selectedIds.clear(); updateBulkBar();
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

// ─── AGENDAR MODAL ───────────────────────────────────────────────────
function openAgendar(lead) {
  modalMode = 'agendar';
  cal = { step: 1, closer: null, leadSnap: lead };
  $('modal-title').textContent    = 'Agendar Call';
  $('modal-subtitle').textContent = `${lead.nome} · ${lead.celular}`;
  $('lead-strip').innerHTML = strip([
    { l:'Origem',    v: lead.origem    || '—' },
    { l:'Profissão', v: lead.profissao || '—' },
    { l:'Renda',     v: lead.renda     || '—' },
    { l:'Chegou em', v: fmtDate(lead.datachegada) },
  ]);
  $('form-resultado').style.display = 'none';
  $('form-agendar').style.display   = 'block';
  $('form-detalhes').style.display  = 'none';
  schedGoToStep(1);
  openModal();
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

function schedSelectCloser(closer) {
  cal.closer = closer;
  window.open(CLOSERS[closer].calLink, '_blank', 'noopener,noreferrer');
  $('sched-closer-lbl').value = CLOSERS[closer].name;
  $('sched-datetime').value   = '';
  $('sched-obs').value        = '';
  schedGoToStep(2);
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
    { l:'Nome',      v: lead.nome      || '—' },
    { l:'Celular',   v: lead.celular   || lead.telefone || '—' },
    { l:'E-mail',    v: lead.email     || '—' },
    { l:'Instagram', v: lead.instagram || null, ig: true },
    { l:'Profissão', v: lead.profissao || '—' },
    { l:'Renda',     v: lead.renda     || '—' },
    { l:'Idade',     v: lead.idade     || '—' },
  ].map(({l,v,ig}) => `<div class="detalhes-item"><span class="detalhes-lbl">${esc(l)}</span><span class="detalhes-val">${ig?instagramLink(v):esc(v||'—')}</span></div>`).join('');

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

  $('perfil-obs').value = lead.observacoes || '';

  const hist = buildHistorico(lead);
  $('perfil-historico').innerHTML = hist.length
    ? hist.map(h=>`<div class="hist-item"><span class="hist-ico">${h.ico}</span><div class="hist-body"><div class="hist-label">${esc(h.label)}</div>${h.sub?`<div class="hist-sub">${esc(h.sub)}</div>`:''}</div></div>`).join('')
    : '<p class="hist-empty">Nenhuma ação registrada.</p>';

  $('perfil-backdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closePerfil() {
  stopChatListener();
  switchPerfilTab('dados');
  $('perfil-backdrop').classList.remove('open');
  document.body.style.overflow = '';
  perfilLeadId = null;
}

async function salvarObsPerfil() {
  if (!perfilLeadId) return;
  const obs = $('perfil-obs').value.trim();
  const btn = $('btn-salvar-obs');
  btn.disabled = true;
  try { await saveLead(perfilLeadId, { observacoes: obs, atualizadoem: new Date().toISOString() }); toast('Observações salvas.', 'ok'); }
  catch(e) { console.error(e); toast('Erro ao salvar.', 'err'); }
  finally { btn.disabled = false; }
}

function buildHistorico(lead) {
  const items = [];
  if (lead.datachegada) items.push({ ico:'◈', label:'Lead cadastrado', sub:fmtDate(lead.datachegada) });
  if (lead.dataagendamento) {
    const closerName = lead.closer ? (CLOSERS[lead.closer]?.name||lead.closer) : null;
    const sub = [
      `${fmtDate(lead.dataagendamento)}${lead.horaagendamento?' às '+lead.horaagendamento:''}`,
      closerName ? 'Closer: '+closerName : null,
      lead.agendadopor ? 'Por: '+lead.agendadopor : null,
    ].filter(Boolean).join(' · ');
    items.push({ ico:'📅', label:'Call agendada', sub });
  }
  if (lead.status === 'noshow')    items.push({ ico:'❌', label:'No Show registrado', sub:'' });
  if (lead.status === 'cancelado') items.push({ ico:'🚫', label:'Cancelado', sub:'' });
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
    items.push({ ico:'✅', label:'Call realizada', sub });
    if (lead.obs_call) items.push({ ico:'💬', label:'Obs. da call', sub:lead.obs_call });
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
  $('modal-backdrop').classList.remove('open');
  document.body.style.overflow = '';
  currentId = null; modalMode = 'agendar';
  cal = { step:1, closer:null, leadSnap:null };
  $('btn-voltar').style.display     = 'none';
  $('form-resultado').style.display = 'none';
  $('form-detalhes').style.display  = 'none';
  $('form-agendar').style.display   = 'block';
  const btn = $('btn-confirmar');
  btn.style.display=''; btn.style.background=''; btn.style.color=''; btn.style.border=''; btn.textContent='Confirmar';
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
  if (action === 'realizada') { openResultado(lead); return; }
  const msgs = { noshow:`No Show — ${lead.nome}`, cancelado:`Cancelado — ${lead.nome}` };
  const updates = { status: action, atualizadoem: new Date().toISOString() };
  if (action === 'noshow') updates.kanban_column = 'venda_perdida';
  try { await saveLead(currentId, updates); toast(msgs[action]||'Status atualizado.', 'ok'); closeModal(); }
  catch(e) { console.error(e); toast('Erro ao salvar.', 'err'); }
}

// ─── CONFIRM ─────────────────────────────────────────────────────────
async function confirmar() {
  if (!currentId) return;
  const btn = $('btn-confirmar');
  btn.disabled = true;
  try {
    if (modalMode === 'agendar') {
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
  $('venda-ganha-backdrop').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  lucide.createIcons();
  setTimeout(() => $('vg-valor').focus(), 50);
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
    const allCols  = getKanbanCols();
    const colLabel = allCols.find(c => c.id === 'venda_ganha')?.label || 'Venda Ganha';
    const hist     = buildHistoryEntry(vgLeadId, 'venda_ganha', colLabel);
    await saveLead(vgLeadId, {
      kanban_column:       'venda_ganha',
      kanban_column_since: new Date().toISOString(),
      venda_ganha_dados: {
        valor:    $('vg-valor').value.trim(),
        entrada:  $('vg-entrada').value.trim(),
        forma:    $('vg-forma').value,
        programa: $('vg-programa').value,
        obs:      $('vg-obs').value.trim(),
      },
      ...(hist && { historico_kanban: hist }),
      atualizadoem: new Date().toISOString(),
    });
    toast('Venda registrada! 🏆', 'ok');
    notifyVendaGanha(vgLeadId);
    closeVendaGanha();
    if (!isLive) renderKanban();
  } catch(e) {
    console.error(e);
    toast('Erro ao registrar venda.', 'err');
    btn.disabled = false;
  }
}

async function notifyVendaGanha(leadId) {
  const lead   = allLeads.find(l => l.id === leadId);
  if (!lead) return;
  const admins = allUsuarios.filter(u => u.role === 'admin' && u.id);
  for (const admin of admins) {
    await createNotification(admin.id, {
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
    supabase.from('leads').update({ unread_count: 0 }).eq('id', leadId).catch(console.error);
    lead.unreadCount = 0; lead.unread_count = 0;
  }
  const badge = $('perfil-unread-badge');
  if (badge) badge.style.display = 'none';
}

function populateChatInstanceSelector(selectId) {
  const sel = $(selectId); if (!sel) return;
  sel.innerHTML = `<option value="">Selecionar instância…</option>` +
    waInstances.map(i =>
      `<option value="${esc(i.instanceName)}"${i.status!=='connected'?' disabled':''}>${esc(i.displayName)}${i.status==='connected'?' ✓':' (offline)'}</option>`
    ).join('');
  const first = waInstances.find(i => i.status === 'connected');
  if (first) sel.value = first.instanceName;
}

function startChatListener(leadId, messagesId, emptyId) {
  stopChatListener();
  chatLeadId = leadId;
  if (!isLive) {
    chatMessages = [];
    renderChatMessages(chatMessages, messagesId, emptyId); return;
  }
  const mapMsg = m => ({ ...m, senderName: m.sender_name, instanceName: m.instance_name });
  supabase.from('lead_messages').select('*').eq('lead_id', leadId).order('timestamp', { ascending: true })
    .then(({ data }) => {
      chatMessages = (data || []).map(mapMsg);
      renderChatMessages(chatMessages, messagesId, emptyId);
    });
  const ch = supabase.channel(`msgs_${leadId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lead_messages', filter: `lead_id=eq.${leadId}` },
      ({ new: msg }) => {
        chatMessages.push(mapMsg(msg));
        renderChatMessages(chatMessages, messagesId, emptyId);
        if (activeTab === 'whatsapp' && activeWaSub === 'chats') renderChatsList();
      })
    .subscribe();
  chatUnsubscribe = () => { supabase.removeChannel(ch); };
}

function stopChatListener() {
  if (chatUnsubscribe) { chatUnsubscribe(); chatUnsubscribe = null; }
  chatMessages = []; chatLeadId = null;
}

function renderChatMessages(messages, containerId, emptyId) {
  const container = $(containerId); if (!container) return;
  const emptyEl   = $(emptyId);
  container.querySelectorAll('.chat-msg, .chat-date-sep').forEach(el => el.remove());
  if (messages.length === 0) {
    if (emptyEl) emptyEl.style.display = '';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';
  const frag    = document.createDocumentFragment();
  let lastDate  = '';
  messages.forEach(msg => {
    const ts      = new Date(msg.timestamp);
    const dateLbl = ts.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' });
    if (dateLbl !== lastDate) {
      const sep = document.createElement('div');
      sep.className = 'chat-date-sep'; sep.textContent = dateLbl;
      frag.appendChild(sep); lastDate = dateLbl;
    }
    const el = document.createElement('div');
    el.className = `chat-msg chat-msg--${msg.direction||'sent'}`;
    el.innerHTML = `<div class="chat-bubble">${esc(msg.text||'')}</div>
      <div class="chat-msg-meta">
        ${msg.senderName ? `<span class="chat-sender">${esc(msg.senderName)}</span>` : ''}
        <span class="chat-time">${ts.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>
        ${(msg.direction||'sent')==='sent'?`<span class="chat-tick">${msg.status==='read'?'✓✓':'✓'}</span>`:''}
      </div>`;
    frag.appendChild(el);
  });
  container.appendChild(frag);
  container.scrollTop = container.scrollHeight;
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
  const phone = (lead.celular||'').replace(/\D/g,'');
  if (!phone)   { toast('Lead sem número de celular.','err'); return; }
  input.disabled = true;
  const ts = new Date().toISOString();
  const msgData = {
    text, direction: 'sent', timestamp: ts, instanceName: instName,
    senderName: currentUser?.displayName || 'FDV', status: 'sent',
  };
  try {
    if (isLive) {
      await supabase.from('lead_messages').insert({
        lead_id: leadId, text, direction: 'sent', timestamp: ts,
        instance_name: instName, sender_name: currentUser?.displayName || 'FDV', status: 'sent',
      });
      await supabase.from('leads').update({ last_message_at: ts, last_message_text: text, last_message_instance: instName, atualizadoem: ts }).eq('id', leadId);
      lead.lastMessageAt = ts; lead.lastMessageText = text; lead.lastMessageInstance = instName;
    } else {
      chatMessages.push({ id:'local-'+Date.now(), ...msgData });
      renderChatMessages(chatMessages, inputId.includes('perfil') ? 'perfil-chat-messages' : 'central-chat-messages',
                                       inputId.includes('perfil') ? 'perfil-chat-empty'    : 'central-chat-empty');
      lead.lastMessageAt = ts; lead.lastMessageText = text; lead.lastMessageInstance = instName;
    }
    try { await fetchEvolution(`/message/sendText/${instName}`, 'POST', { number: phone, text }); } catch(e) { /* mock */ }
    toast('Mensagem enviada.', 'ok');
    input.value = '';
  } catch(e) { console.error(e); toast('Erro ao enviar mensagem.','err'); }
  finally    { input.disabled = false; input.focus(); }
}

// ─── CENTRAL DE CHATS ────────────────────────────────────────────────

function renderCentralChats() {
  renderChatsFilters();
  renderChatsList();
}

function renderChatsFilters() {
  const sel = $('chats-filter-instance'); if (!sel) return;
  sel.innerHTML = `<option value="">Todas as instâncias</option>` +
    waInstances.map(i => `<option value="${esc(i.instanceName)}">${esc(i.displayName)}</option>`).join('');
}

function renderChatsList() {
  const instFilt   = $('chats-filter-instance')?.value || '';
  const statusFilt = $('chats-filter-status')?.value   || '';
  let convs = allLeads.filter(l => l.lastMessageAt);
  if (instFilt)   convs = convs.filter(l => l.lastMessageInstance === instFilt);
  if (statusFilt) convs = convs.filter(l => l.status === statusFilt);
  convs.sort((a,b) => (b.lastMessageAt||'').localeCompare(a.lastMessageAt||''));
  const listEl = $('chats-list'); if (!listEl) return;
  if (convs.length === 0) {
    listEl.innerHTML = `<div class="chat-list-empty"><div style="font-size:32px;margin-bottom:10px">💬</div><p>Nenhuma conversa ainda.</p></div>`;
    return;
  }
  listEl.innerHTML = convs.map(lead => {
    const isActive = lead.id === chatActiveSide;
    const unread   = lead.unreadCount || 0;
    const lastMsg  = lead.lastMessageText ? esc(lead.lastMessageText.slice(0,55)) : '—';
    const lastTime = lead.lastMessageAt
      ? new Date(lead.lastMessageAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : '';
    return `<div class="chats-list-item${isActive?' chats-list-item--active':''}${unread?' chats-list-item--unread':''}" data-lead-id="${esc(lead.id)}" role="button" tabindex="0">
      <div class="cli-avatar">${esc((lead.nome||'?')[0].toUpperCase())}</div>
      <div class="cli-body">
        <div class="cli-top">
          <span class="cli-name">${esc(lead.nome||'—')}</span>
          <span class="cli-time">${lastTime}</span>
        </div>
        <div class="cli-preview">
          <span class="cli-msg">${lastMsg}</span>
          ${unread?`<span class="cli-unread-badge">${unread}</span>`:''}
        </div>
      </div>
    </div>`;
  }).join('');
}

function openCentralChat(leadId) {
  chatActiveSide = leadId;
  renderChatsList();
  const lead = allLeads.find(l => l.id === leadId); if (!lead) return;
  const panel = $('chats-panel'); if (!panel) return;
  panel.innerHTML = `
    <div class="chats-panel-header">
      <div class="chats-panel-lead">
        <div class="cli-avatar" style="width:38px;height:38px;font-size:15px">${esc((lead.nome||'?')[0].toUpperCase())}</div>
        <div>
          <div class="chats-panel-name">${esc(lead.nome||'—')}</div>
          <div class="chats-panel-phone">${esc(lead.celular||'—')}</div>
        </div>
      </div>
      <select id="central-chat-instance" class="filter-select chat-inst-sel">
        <option value="">Selecionar instância…</option>
      </select>
    </div>
    <div class="chat-messages" id="central-chat-messages">
      <div class="chat-empty" id="central-chat-empty">
        <span>Nenhuma mensagem ainda.</span>
        <span class="chat-empty-hint">Selecione uma instância e envie a primeira mensagem.</span>
      </div>
    </div>
    <div class="chat-input-bar">
      <textarea class="chat-input" id="central-chat-input" placeholder="Digite uma mensagem…" rows="2"></textarea>
      <button class="btn-primary chat-send-btn" id="btn-central-send">↑</button>
    </div>`;
  $('btn-central-send').addEventListener('click', () => sendChatMessage('central-chat-input','central-chat-instance',leadId));
  $('central-chat-input').addEventListener('keydown', e => {
    if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage('central-chat-input','central-chat-instance',leadId); }
  });
  populateChatInstanceSelector('central-chat-instance');
  startChatListener(leadId, 'central-chat-messages', 'central-chat-empty');
  if (isLive && (lead.unreadCount||0) > 0) {
    supabase.from('leads').update({ unread_count: 0 }).eq('id', leadId).catch(console.error);
    lead.unreadCount = 0; lead.unread_count = 0; renderChatsList();
  }
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
}

function renderInstancias() {
  const grid    = $('wa-instances-grid');
  const loading = $('wa-loading');
  if (!grid) return;
  if (!waInstancesLoaded) { if (loading) loading.style.display = ''; return; }
  if (loading) loading.style.display = 'none';
  renderWaStats();
  if (waInstances.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-ico">📱</div>
      <h3>Nenhuma instância configurada</h3>
      <p>Clique em "+ Conectar número" para adicionar seu primeiro número WhatsApp.</p>
    </div>`; return;
  }
  grid.innerHTML = waInstances.map(renderInstanceCard).join('');
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
        <span class="wa-inst-icon">📱</span>
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
      <button class="btn-ghost btn-sm wa-btn-delete" data-id="${esc(inst.id)}" style="color:var(--marsala)">Excluir</button>
    </div>
  </div>`;
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
  if (!res.ok) throw new Error(`Evolution API ${res.status}`);
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

// ─── EVENTS ──────────────────────────────────────────────────────────
function bindEvents() {
  // Kanban drag-and-drop — delegated on the persistent board element so listeners
  // survive renderKanban() innerHTML replacements (fixes modal not firing mid-session)
  const kboard = $('kanban-board');
  kboard.addEventListener('dragstart', e => {
    const card = e.target.closest('.kanban-card[draggable]');
    if (!card) return;
    dragLeadId = card.dataset.id;
    setTimeout(() => card.classList.add('dragging'), 0);
  });
  kboard.addEventListener('dragend', e => {
    const card = e.target.closest('.kanban-card');
    if (card) card.classList.remove('dragging');
    dragLeadId = null;
  });
  kboard.addEventListener('dragover', e => {
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

  // Sub-nav
  document.querySelectorAll('.sub-link[data-sub]').forEach(btn =>
    btn.addEventListener('click', () => switchSub(btn.dataset.sub))
  );

  // Tab nav
  document.querySelectorAll('.nav-link[data-tab]').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
  );

  // Leads filters
  ['filter-status','filter-origem','filter-mes'].forEach(id => $(id).addEventListener('change', applyFilters));
  $('filter-busca').addEventListener('input', applyFilters);
  $('btn-limpar').addEventListener('click', () => {
    ['filter-status','filter-origem','filter-mes'].forEach(id => $(id).value = '');
    $('filter-busca').value = '';
    applyFilters();
  });

  // Agenda filters
  ['agenda-filter-mes','agenda-filter-closer'].forEach(id => $(id).addEventListener('change', renderAgendaSub));
  $('agenda-filter-data')?.addEventListener('change', renderAgendaSub);
  $('btn-gerar-agenda').addEventListener('click', gerarAgendaDoDia);

  // Briefing filters
  ['briefing-filter-mes','briefing-filter-closer'].forEach(id => $(id).addEventListener('change', renderBriefingSub));
  $('briefing-filter-data')?.addEventListener('change', renderBriefingSub);

  // Kanban filters
  ['kanban-filter-mes','kanban-filter-closer'].forEach(id => $(id).addEventListener('change', renderKanban));
  $('btn-add-column').addEventListener('click', addKanbanColumn);

  // Kanban search
  $('kanban-search').addEventListener('input', e => {
    kanbanSearchText = e.target.value.toLowerCase().trim();
    document.querySelectorAll('#kanban-board .kanban-card').forEach(card => {
      card.classList.toggle('kc-dimmed', !!(kanbanSearchText && !card.dataset.nome.includes(kanbanSearchText)));
    });
  });

  // Quick-filter pills
  document.querySelectorAll('.kqf-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $('kanban-filter-closer').value = btn.dataset.closer;
      renderKanban();
    });
  });

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
    if (card) schedSelectCloser(card.dataset.closer);
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
  $('btn-bulk-delete').addEventListener('click', bulkDelete);
  $('btn-bulk-status').addEventListener('click', bulkChangeStatus);
  $('btn-bulk-clear').addEventListener('click', () => { selectedIds.clear(); updateBulkBar(); renderTable(); });

  // Perfil
  $('perfil-close').addEventListener('click', closePerfil);
  $('perfil-fechar').addEventListener('click', closePerfil);
  $('btn-salvar-obs').addEventListener('click', salvarObsPerfil);
  $('perfil-backdrop').addEventListener('click', e => { if(e.target===$('perfil-backdrop')) closePerfil(); });

  // Etiquetas
  $('btn-add-etiqueta').addEventListener('click', addEtiquetaCustom);
  $('etiqueta-custom-input').addEventListener('keydown', e => { if(e.key==='Enter') addEtiquetaCustom(); });

  // Novo lead modal
  $('novo-lead-close').addEventListener('click', closeNovoLead);
  $('novo-lead-cancelar').addEventListener('click', closeNovoLead);
  $('btn-salvar-lead').addEventListener('click', confirmarNovoLead);
  $('novo-lead-backdrop').addEventListener('click', e => { if(e.target===$('novo-lead-backdrop')) closeNovoLead(); });

  // Dropdown: fechar ao clicar fora
  document.addEventListener('click', e => { if(!e.target.closest('.acoes-wrap')) closeAllDropdowns(); });

  // Auth
  $('btn-login-email').addEventListener('click', loginWithEmail);
  $('btn-esqueci-senha').addEventListener('click', esqueceuSenha);
  ['login-email','login-senha'].forEach(id =>
    $(id).addEventListener('keydown', e => { if (e.key === 'Enter') loginWithEmail(); })
  );
  $('btn-logout').addEventListener('click', logoutUser);

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
    const edit = e.target.closest('.usuario-edit-btn');
    if (edit) openEditarUsuario(edit.dataset.uid);
    const del = e.target.closest('.usuario-delete-btn');
    if (del) deleteUsuario(del.dataset.uid, del.dataset.nome);
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

  // Central de chats — filtros
  ['chats-filter-instance','chats-filter-status'].forEach(id =>
    $(id)?.addEventListener('change', renderChatsList)
  );

  // Central de chats — clique na conversa (delegado)
  $('chats-list').addEventListener('click', e => {
    const item = e.target.closest('.chats-list-item');
    if (item) openCentralChat(item.dataset.leadId);
  });

  // WhatsApp — nova instância
  $('btn-nova-instancia').addEventListener('click', () => openQRModal(null));

  // WhatsApp — sub-nav
  document.querySelectorAll('#tab-whatsapp .sub-link[data-sub]').forEach(btn =>
    btn.addEventListener('click', () => switchWaSub(btn.dataset.sub))
  );

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

  // Venda ganha
  $('vg-close').addEventListener('click', closeVendaGanha);
  $('vg-cancelar').addEventListener('click', closeVendaGanha);
  $('vg-confirmar').addEventListener('click', confirmarVendaGanha);
  $('venda-ganha-backdrop').addEventListener('click', e => { if (e.target === $('venda-ganha-backdrop')) closeVendaGanha(); });

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

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closePerfil(); closeNovoLead(); closeQRModal(); closeMotivosPerda(); closeVendaGanha(); }
  });
}

// ─── SHORTHAND ───────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

// ─── BOOT ────────────────────────────────────────────────────────────
bindEvents();
initAuth();
