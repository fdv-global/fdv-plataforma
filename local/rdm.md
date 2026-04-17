# RDM — Sistema FDV: Tasks Pendentes

> Última atualização: 2026-04-17 — kanban UX: venda ganha modal · remoção de campos legados · fix drag delegation

---

## ✅ CONCLUÍDO (v1–v2 — base, kanban, etiquetas, relatórios)

- [x] **Qualificação de lead** — etiquetas (Super Lead, Bom, Neutro, Frio) + personalizadas no perfil
- [x] **Card do lead** — mostra data/hora/closer/agendadopor após agendamento (tabela + card mobile)
- [x] **Status visível no card** — badge de status na tabela e nos cards mobile
- [x] **Tela Closer** — kanban com botão Resultado e No Show em cada card
- [x] **Closer: formato Kanban** — colunas Agendado → Call Realizada → Fechamento → Follow Up → Venda Ganha → Venda Perdida (colunas editáveis e novas colunas)
- [x] **Menu** — unificado: Agendamentos (Lista de Leads, Agenda de Hoje, Briefing), Closer, Relatórios
- [x] **Closer** — responsável pelo agendamento (`agendadopor`) visível no kanban e perfil
- [x] **Produto** — campo com opções (Comunidade, PRM, Mentoria Individual, Comunidade 6m, Comunidade 1a)
- [x] **Forma de pagamento** — múltiplas formas simultâneas, parcelado X vezes, entrada (sim/não + valor)
- [x] **Filtro por mês** — em todas as telas (Lista de Leads, Agenda, Briefing, Kanban, Relatórios)
- [x] **Tela de Resultado de Call** — produto, pagamento multi, entrada, status de negociação
- [x] **Relatórios** — visão geral, faturamento, conversão por closer, por origem
- [x] **iniciar.bat** — atalho para rodar `node server.js` e abrir browser em `localhost:3000`
- [x] **Hot reload** — server SSE com `fs.watch` + inject automático no HTML (sem npm)

---

## ✅ CONCLUÍDO (v3 — redesign + melhorias)

- [x] **Design System v3** — Apple Design × Attio CRM: tokens de superfície (`--s1/s2/s3`), bordas rgba (`--b0–b3`), spring animations, glassmorphism nos modais
- [x] **Briefing WhatsApp** — formato limpo: nome bold, data/dia/hora, closer, contatos com 3 emojis, profissão·renda, desafio. Sem campos vazios, sem duplas linhas em branco
- [x] **Agenda — WhatsApp copy** — formato por closer com ícone, hora, nome e status "Aguardando confirmação"
- [x] **Etiquetas — cores personalizáveis** — pills com gradiente e borda colorida. Padrão: dourado (Super Lead), verde (Bom), petróleo (Neutro), marsala (Frio). Botão ⬤ abre color picker nativo; cor persiste em `localStorage`
- [x] **Etiquetas visíveis na tabela** — coluna dedicada com chips coloridos (até 2 por linha)
- [x] **Timeline do lead** — seção Histórico no modal com linha vertical conectora, badges circulares e sub-texto de data/hora/responsável
- [x] **Obs pós-call no Kanban** — textarea editável no rodapé de cada card, salva no Firebase/demo no blur. Drag bloqueado durante digitação
- [x] **Relatórios — ranking de origem** — barras horizontais com % de conversão colorida (verde ≥50%, dourado ≥25%)
- [x] **Relatórios — comparativo mês a mês** — barras duplas leads × vendas com legenda
- [x] **Relatórios — ticket médio** — por mês na tabela + no summary stats
- [x] **Agenda — mini calendário lateral** — navegação prev/next de mês, dias com calls marcados com ponto, dia selecionado em dourado, clique deseleciona, responsivo (colapsa em mobile)

---

---

## ✅ CONCLUÍDO (v3 — WhatsApp, itens 1–4)

- [x] **WhatsApp — aba no menu** — nova aba "WhatsApp" no header com sub-nav: Instâncias / Central de Chats
- [x] **WhatsApp — tela de instâncias** — cards com nome, ID, responsável (Muy/Fernanda/Thomaz/Tati), funil, número, última atividade; stats em tempo real (total, conectadas, desconectadas, aguardando QR)
- [x] **WhatsApp — status badges** — Conectado (verde pulsante) / Desconectado (vermelho) / Aguardando QR (dourado)
- [x] **WhatsApp — ações por instância** — Reconectar, Desconectar, Excluir (com confirmação)
- [x] **WhatsApp — Firebase** — coleção `whatsapp_instances` com listener `onSnapshot` em tempo real
- [x] **Modal QR Code** — step 1: formulário (nome, ID, responsável, funil) → step 2: QR com timer regressivo 60s
- [x] **Modal QR Code — estados visuais** — carregando → aguardando scan → conectado → expirado → erro
- [x] **Modal QR Code — polling** — verifica `/instance/connectionState` a cada 3s; fecha modal ao conectar
- [x] **Modal QR Code — modo mock** — funciona sem a Evolution API; mostra mensagem explicativa
- [x] **WhatsApp — aba no perfil do lead** — tabs "Dados do Lead" / "WhatsApp" no modal de perfil
- [x] **WhatsApp — chat no lead** — histórico em tempo real via `leads/{id}/messages`; bubbles enviadas (direita/dourado) e recebidas (esquerda/cinza); separador de data
- [x] **WhatsApp — envio de mensagem** — seletor de instância + campo + botão ↑ + Enter para enviar
- [x] **WhatsApp — badge de não lidas** — no botão da aba WhatsApp no perfil + nos cards do Kanban (`unreadCount`)
- [x] **Central de Chats** — layout duas colunas: lista de conversas + painel de chat
- [x] **Central de Chats — ordenação** — última mensagem primeiro; não lidas em destaque (bold + badge vermelho)
- [x] **Central de Chats — filtros** — por instância e por status do lead
- [x] **GitHub Actions** — deploy automático da pasta `app/` para GitHub Pages a cada push no `master`
- [x] **GitHub Pages** — site publicado em `https://faculdadedavida.github.io/faculdadavida`

---

## ✅ CONCLUÍDO (UX polish + gestão de usuários · 2026-04-16)

- [x] **Aba Início** — primeira tab (ícone Lucide `house`, padrão ao logar); saudação com nome + bom dia/tarde/noite; versículo do dia em card centralizado glassmorphism (varia por dia do ano, consistente durante o dia); 3 cards resumo: Calls Hoje / Leads Aguardando / Vendas do Mês
- [x] **Ticker fixo removido** — versículo saiu do layout fixo e passou para a aba Início exclusivamente; `padding-top` do `app-main` reduzido 180px → 110px
- [x] **`VERSES` centralizado** — array de 51 versículos em `app.js` (constante `VERSES`); índice = `dayOfYear % VERSES.length`
- [x] **Usuários — botão Cadastrar corrigido** — causa raiz: `openNovoUsuario` usava `style.display=''` mas o modal CSS exige `.modal-backdrop.open`; corrigido para `classList.add/remove('open')` + `body.overflow`
- [x] **Usuários — formulário salva corretamente** — corrigido `showToast` → `toast` (função que não existia); mensagem de erro agora exibe `e.message`; campos: `uid, email, nome, role, ativo, criadoEm, photoURL`
- [x] **Usuários — foto/avatar** — campo de upload no modal com preview circular; importação de `getStorage / uploadBytes / getDownloadURL` do Firebase Storage (v10.12.0); foto salva em `usuarios/{uid}/foto`; `photoURL` persiste no Firestore; `getStorage(app)` inicializado em `initFirebase()`
- [x] **Usuários — avatar na tabela** — célula Nome mostra `<img>` circular (32px) se `photoURL` existir, ou `<span>` com inicial dourada como fallback; coluna Ações com flex gap
- [x] **Usuários — avatar na taskbar** — `loadCurrentUserProfile(uid)` lê o doc Firestore após login e alimenta `#user-avatar` (img 30px) e `#user-name` com o `nome` real do doc; chamada adicionada em `onAuthStateChanged`
- [x] **Usuários — desativar com confirmação** — `confirm('Desativar este usuário? Ele perderá o acesso ao sistema.')` antes de `updateDoc`; toast de feedback para ativar/desativar
- [x] **Usuários — excluir** — botão vermelho (`.usuario-delete-btn`) com `confirm('Excluir "X"?\nEsta ação não pode ser desfeita.')`; remove doc do Firestore; `resolveRole` já bloqueia login quando doc não existe (chama `signOut` + erro)
- [x] **Lucide icons nas abas** — substituídos pseudo-elementos Unicode por `<i data-lucide="...">` nas 6 abas do menu; ícone `house` para Início

---

## ✅ CONCLUÍDO (theme — glassmorphism + polish visual)

- [x] **theme.css criado** — arquivo separado importado após style.css; não toca app.js nem HTML existente
- [x] **Wallpaper + overlay** — `html` com `linear-gradient(rgba overlay) + url('fdv-wallpaper.png')` fixo; `body { background: transparent }`
- [x] **Logo sem fundo preto** — `.header-brand` com `mix-blend-mode: screen`; texto `.brand-abbr/.brand-sep/.brand-full` oculto
- [x] **Tipografia** — Google Fonts Red Hat Display (títulos) + Red Hat Text (corpo) via `@import`
- [x] **Versículo estático por sessão** — `#fdv-ticker` fixo abaixo do header (top 64px, z-index 98); script inline sorteia 1 de 50 versículos via `Math.random()` a cada carregamento; sem animação de scroll
- [x] **Header glassmorphism** — `rgba(14,21,23,0.76) + blur(28px) saturate(1.5) + borda dourada`
- [x] **Navegação** — nav-links e sub-links com pill `border-radius: 30px`, hover dourado suave, active com borda/fundo dourado
- [x] **Botões** — pill + hover `translateY(-1px) scale(1.016)` + box-shadow dourado; btn-primary, btn-confirm, btn-ghost, btn-logout, btn-google
- [x] **Botão Novo Lead** — destaque especial: gradiente `#CE9221 → #DDC79E`, padding `14px 28px`, font 15px/700, box-shadow dourado, hover animado
- [x] **Login card** — glassmorphism profundo `blur(32px) + borda dourada + box-shadow`
- [x] **Stat cards** — glassmorphism + borda dourada `rgba(206,146,33,0.35)` (mais visível)
- [x] **Modais** — glassmorphism `blur(28px)`, borda dourada, inset highlight
- [x] **Kanban** — colunas e cards com glassmorphism; card hover com `translateY(-1px) + borda dourada`
- [x] **Table + filtros** — `.table-wrap` e `.filters-bar` com glassmorphism
- [x] **WhatsApp** — instância cards, chats-layout, chats-sidebar/panel com glassmorphism
- [x] **Relatórios** — `.rel-block` com glassmorphism
- [x] **Formulários** — inputs semi-transparentes com focus dourado + `box-shadow`
- [x] **Sub-nav** — glassmorphism pronunciado `bg rgba(28,37,39,0.70) + borda rgba(206,146,33,0.25)`
- [x] **Título da seção** — `text-shadow: 0 0 30px rgba(206,146,33,0.3)` nos `h1` de página
- [x] **Overlay wallpaper** — opacidade reduzida para `0.45` (árvore mais nítida e brilhante)
- [x] **Scrollbars custom** — `5px`, track transparente, thumb dourado
- [x] **Agenda + Briefing** — `.briefing-card/.briefing-item` com glassmorphism
- [x] **Spacing premium** — `page-top/kanban-page-top` com padding generoso
- [x] **Seleção de texto** — `::selection` com fundo dourado translúcido

---

## ✅ CONCLUÍDO (theme v2 — taskbar Win11 + polish avançado · 2026-04-16)

- [x] **Wallpaper full-brightness** — overlay reduzido para `rgba(15,21,23,0.45)`; árvore nítida e imersiva
- [x] **Login Win11** — wallpaper full (overlay 0.22), vinheta `::after` nos 42% inferiores, card glassmorphism `blur(44px)` com `align-items:flex-end + justify-content:center` → card centralizado na base da tela
- [x] **Versículo bíblico (fdv-ticker)** — posição topo-central: `fixed; top:0; left:50%; transform:translateX(-50%)`; `border-radius: 0 0 12px 12px`; cor `#FFD700` + `text-shadow` dourado brilhante; `pointer-events:none`; oculto em mobile
- [x] **Taskbar Win11 flutuante** — header migrado de `position:sticky;top:0` para `position:fixed;bottom:24px;left:50%;transform:translateX(-50%)`; `border-radius:20px`; glassmorphism `blur(24px)`; `box-shadow: 0 -4px 32px` (sombra para cima); `padding:16px 40px`, `min-height:64px`
- [x] **Ícones Unicode na taskbar** — pseudo-elemento `::before` em cada `nav-link[data-tab]`: 📅 Agendamentos · 👤 Closer · 📊 Relatórios · 💬 WhatsApp; `gap:16px` entre botões
- [x] **Logo mix-blend-mode: lighten** — fundo preto da PNG some sobre painel escuro; `height:48px`, `width:160px`
- [x] **Botões Win11 translúcidos** — base: `rgba(206,146,33,0.15) + backdrop-filter:blur(12px) + borda dourada`; CTAs: gradiente `#CE9221→#DDC79E`; hover `scale(1.03) + box-shadow dourado`; active `scale(0.97)`
- [x] **Cards opacos** — `rgba(12,18,20,0.85)` em stat-cards, kanban-cards, wa-instance-card, briefing-card para legibilidade sobre wallpaper
- [x] **Contraste aprimorado** — `:root { --t1:#e8e4dc; --t2:#c8c4bc }` sobrescreve tokens do style.css; labels, títulos e col-titles em `#e8e4dc / font-weight:500`
- [x] **Microanimações fdvFadeUp** — `@keyframes fdvFadeUp` com `opacity:0;translateY(10px) → 1;0`; aplicado em `.kanban-col`, `.stat-card`, `.briefing-card`; stagger por `:nth-child()` (delays de 55ms por coluna)
- [x] **Sub-nav pills visíveis** — inativas: `padding:10px 20px`, `font-size:14px/600`, `color:#e8e4dc`, `border:rgba(206,146,33,0.40)`; ativas: `background:#CE9221` sólido, `color:#0f1517` (texto escuro sobre ouro)
- [x] **Nav-link font aumentada** — `font-size:16px/600` nos botões da taskbar
- [x] **Proteção header duplicado** — seção 25 no theme.css: `top:auto!important` + seletor `~ .app-header { display:none }` como seguro
- [x] **`.gitignore`** — exclui `.claude/` (configuração local do IDE, não deve ir ao repositório)

---

## ✅ CONCLUÍDO (kanban UX polish · 2026-04-17 — sessões A e B)

- [x] **Toast/Snackbar** — sucesso ao mover card (ex: "Card movido.") e ao enviar mensagem no chat
- [x] **Empty States** — ícones Lucide (`inbox`, `calendar-x`, `users`) substituem emojis em kanban, agenda e briefing; `lucide.createIcons()` chamado após cada innerHTML dinâmico
- [x] **Skeleton Loading** — spinner de overlay substituído por linhas shimmer animadas na tabela de leads
- [x] **Motivo de Perda** — modal obrigatório ao arrastar card para "Venda Perdida"; 9 motivos em 3 categorias com ícone Lucide; campo de texto livre para "Outro"; salva `motivo_perda` + `motivo_perda_label` no Firestore
- [x] **Notificações In-App** — sininho no header com badge de contagem; painel dropdown com lista de notificações; coleção Firestore `notifications/{uid}/items`; marcar tudo como lido; `createNotification()` chamado em agendamento, motivo de perda e venda ganha
- [x] **Kanban — mover card pelo menu** — dropdown "Mover para:" em cada card com todas as colunas disponíveis
- [x] **Kanban — histórico de movimentação** — campo `historico_kanban` (array, max 20 entradas) com coluna, label, responsável e timestamp; expansível por toggle no card
- [x] **Kanban — contador de dias na coluna** — `kanban_column_since` gravado a cada movimentação; badge "X dias" no card com cor verde/dourado/vermelho
- [x] **Kanban — atalho WhatsApp** — botão no card abre `https://wa.me/{celular}` em nova aba
- [x] **Kanban — quick-filter pills** — pills de closer acima do kanban; sincronizados bidirecionalmente com o select de filtro
- [x] **Kanban — busca por nome** — campo de busca que aplica classe `.kc-dimmed` (opacity 0.18) nos cards que não correspondem, sem re-render
- [x] **Kanban — data do agendamento no card** — exibe data/hora formatada do `dataagendamento`
- [x] **Contraste — tabela de leads** — headers `rgba(255,255,255,0.55)`, badges de origem mais visíveis, botões de ação (`cell-acoes` opacity `.72`, `btn-acao-main` cor `0.85`), checkboxes com `appearance:none` + fundo dourado quando marcado
- [x] **Venda Ganha — modal celebratório** — intercepta `moveLeadToCol` para a coluna `venda_ganha`; modal com trophy Lucide verde; campos: Valor da Venda, Valor da Entrada, Forma de Pagamento (dropdown: À vista / Parcelado cartão / Parcelado boleto / PIX), Programa Vendido (dropdown: 5 opções), Observações; salva `venda_ganha_dados` no Firestore; notifica admins via `createNotification()`
- [x] **Remove `venda_realizada`** — campo legado completamente eliminado de demo data, `getLeadKanbanCol()`, `confirmarMotivosPerda()`, todos os relatórios (5 pontos), `stat-vendas`, briefing, `confirmar()`, `openDetalhes()`, `openResultado()`; substituído por `kanban_column === 'venda_ganha'` como fonte da verdade; faturamento lê de `venda_ganha_dados.valor`
- [x] **Remove `temperatura do lead`** — toggle removido do modal de resultado (HTML + JS: `openDetalhes`, `confirmar`, `bindEvents`)
- [x] **Bug fix — drag delegation** — listeners `dragstart/dragend/dragover/dragleave/drop` migrados de `board.querySelectorAll('.kanban-col-body')` (re-criados a cada `renderKanban()`) para `#kanban-board` via event delegation; listeners agora sobrevivem a qualquer `onSnapshot` que dispare `renderKanban()` durante um arrasto; `dragLeadId` limpo também no `dragend` como segurança
- [x] **Escape fecha Venda Ganha** — `closeVendaGanha()` adicionado ao handler global de `keydown`

---

## 🔲 PENDENTE

### Usuários — o que ainda falta
- [ ] **Editar usuário** — modal de edição para alterar nome, role e foto de um usuário existente (hoje só o role é alterável via select inline na tabela)
- [ ] **Excluir do Firebase Authentication** — hoje só remove o doc Firestore (bloqueia login via `resolveRole`). Remoção real do Auth requer Admin SDK via Cloud Function
- [ ] **Firebase Storage CORS** — configurar regras de CORS no bucket `faculdade-da-vida.firebasestorage.app` para permitir upload de foto pela origem do GitHub Pages
- [ ] **Foto na tela de login** — mostrar avatar do usuário logado na tela de boas-vindas da aba Início (já existe `user-avatar` na taskbar; falta preencher no Início)

### WhatsApp — infraestrutura (aguardando AWS)
- [ ] **Evolution API no AWS** — instalar e configurar; trocar `EVOLUTION_API_URL = 'http://localhost:8080'` em `app.js`
- [ ] **Webhook de recebimento** — Firebase Functions (ou endpoint externo) para receber mensagens da Evolution API, salvar em `leads/{id}/messages` e incrementar `unreadCount` no lead
- [ ] **Webhook de status** — atualizar `status` da instância em `whatsapp_instances` quando desconectar/reconectar

### Features prioritárias
- [ ] **Integração Google Sheets** — importar leads dos formulários ISCAS/Respondi para o Firestore automaticamente
- [ ] **Notificações de agenda** — lembrete antes da call (WhatsApp via Evolution API)
- [ ] **Busca global** — busca por nome, celular, e-mail direto no header (qualquer tela)

### Features secundárias
- [ ] **Pós-venda** — frente futura para gestão de alunos
- [ ] **Export CSV/Excel** — exportar lista de leads com filtros ativos

---

## NOTAS TÉCNICAS

### Leads (`leads`)
- `kanban_column` — fonte da verdade para posição no kanban (substitui `venda_realizada` legado)
- `kanban_column_since: ISO string` — quando o lead entrou na coluna atual (base do contador de dias)
- `historico_kanban: []` — array de até 20 entradas `{ col, colLabel, movidoPor, movidoEm }`
- `etiquetas: []` — array de strings no lead
- `etiqueta_colors` — cores salvas em `localStorage` (chave `fdv_etiqueta_colors`), não no Firestore
- `agendadopor` — nome do usuário logado no momento do agendamento
- `obs_call: string` — observações da call, editável pelo closer direto no kanban
- `motivo_perda: string` — id do motivo selecionado; `motivo_perda_label: string`; `motivo_perda_obs?: string`
- `venda_ganha_dados: { valor, entrada, forma, programa, obs }` — dados registrados no modal celebratório
- `lastMessageAt: ISO string` — timestamp da última mensagem (enviada ou recebida)
- `lastMessageText: string` — prévia da última mensagem
- `lastMessageInstance: string` — instanceName usada na última mensagem
- `unreadCount: number` — mensagens não lidas; zerado ao abrir o chat
- **Campos removidos:** `venda_realizada`, `produto`, `formas_pagamento`, `parcelas`, `tem_entrada`, `valor_entrada`, `temperatura`

### Mensagens (`leads/{id}/messages`)
- `text: string`
- `direction: 'sent' | 'received'`
- `timestamp: ISO string`
- `instanceName: string`
- `senderName: string`
- `status: 'sent' | 'delivered' | 'read'`

### WhatsApp Instances (`whatsapp_instances`)
- `instanceName: string` — slug usado nas chamadas da Evolution API
- `displayName: string` — nome de exibição
- `responsavel: 'muy' | 'fernanda' | 'thomaz' | 'tati'`
- `funil: 'captacao' | 'closer' | 'pos-venda' | 'geral'`
- `status: 'connected' | 'disconnected' | 'awaiting_qr'`
- `phoneNumber: string`
- `lastActivity: ISO string`

### Usuários (`usuarios`)
- `uid: string` — mesmo UID do Firebase Authentication
- `email: string`
- `nome: string`
- `role: 'admin' | 'closer' | 'operacoes'`
- `ativo: boolean` — false bloqueia login (resolveRole chama signOut)
- `criadoEm: Date`
- `photoURL?: string` — URL do Firebase Storage (`usuarios/{uid}/foto`)
- Criação: instância Firebase temporária (`initializeApp` + `fdv-tmp-{ts}`) para não deslogar o admin atual
- Exclusão: apenas Firestore (Auth não é deletado pelo cliente — sem Admin SDK)

### Infra
- `EVOLUTION_API_URL` — constante no topo de `app.js`; trocar para URL do AWS quando disponível
- Colunas do kanban salvas em `localStorage` (chave `fdv_kanban_columns`)
- `agendaCalYear / agendaCalMonth` — estado do mini calendário (em memória, reset ao recarregar)
- Servidor local: `node app/server.js` na porta 3000, hot reload via SSE
- Deploy: GitHub Actions (`.github/workflows/deploy.yml`) → GitHub Pages no push para `master`
