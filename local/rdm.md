# RDM — Sistema FDV: Tasks Pendentes

> Última atualização: 2026-04-16 — theme v2 completo · taskbar Win11 · versículo topo · microanimações

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

## 🔲 PENDENTE

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
- [ ] **Multi-usuário** — controle de acesso por role (admin, closer, SDR)

---

## NOTAS TÉCNICAS

### Leads (`leads`)
- `kanban_column` — campo no lead que controla a coluna no kanban (persistido no Firestore)
- `etiquetas: []` — array de strings no lead
- `etiqueta_colors` — cores salvas em `localStorage` (chave `fdv_etiqueta_colors`), não no Firestore
- `agendadopor` — nome do usuário logado no momento do agendamento
- `formas_pagamento: []` — array de métodos (avista, pix, cartao, boleto, parcelado)
- `parcelas: number`, `tem_entrada: bool`, `valor_entrada: string`
- `produto: string`
- `obs_call: string` — observações da call, editável pelo closer direto no kanban
- `lastMessageAt: ISO string` — timestamp da última mensagem (enviada ou recebida)
- `lastMessageText: string` — prévia da última mensagem
- `lastMessageInstance: string` — instanceName usada na última mensagem
- `unreadCount: number` — mensagens não lidas; zerado ao abrir o chat

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

### Infra
- `EVOLUTION_API_URL` — constante no topo de `app.js`; trocar para URL do AWS quando disponível
- Colunas do kanban salvas em `localStorage` (chave `fdv_kanban_columns`)
- `agendaCalYear / agendaCalMonth` — estado do mini calendário (em memória, reset ao recarregar)
- Servidor local: `node app/server.js` na porta 3000, hot reload via SSE
- Deploy: GitHub Actions (`.github/workflows/deploy.yml`) → GitHub Pages no push para `master`
