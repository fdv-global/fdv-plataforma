// filtros-config.js — Agrupamento De→Para para os filtros de Renda e Profissão.
// Fonte única: nenhuma tela deve reimplementar esses mapas ou a lógica de agrupamento.
// Regra dura: isto NUNCA altera o dado bruto do lead (colunas renda/profissao no Supabase).
// Serve só para decidir em qual grupo um lead cai, para exibição e para os filtros.

export const GRUPO_NAO_INFORMADO = 'Não informado';

export const MAPA_RENDA = [
  { grupo: 'Até R$1.500', valores: [
    'Até R$1.500', 'Menos de R$2.000,00',
  ]},
  { grupo: 'R$1.500 a R$5.000', valores: [
    '2k-a-5k', 'R$1.500 – R$3.000', 'R$3.000 – R$5.000',
    'De R$ 2.000 a R$ 5.000 por mês', 'De R$ 2.000,00 a R$ 4.000,00', 'De R$ 4.000,00 a R$ 6.000,00',
  ]},
  { grupo: 'R$5.000 a R$8.000', valores: [
    '5k-a-8k', 'R$5.000 – R$8.000', 'R$ 5.000,00 a R$ 8.000,00', 'De R$ 5.000 a R$ 10.000 por mês',
    'de_r$_5.000_a_r$_10.000_por_mês',
  ]},
  { grupo: 'R$8.000 a R$15.000', valores: [
    '8k-a-15k', 'R$8.000 – R$12.000', 'De R$8.000,00 a R$ 10.000,00', 'R$ 8.000,00 a r$ 15.000,00',
  ]},
  { grupo: 'R$15.000 a R$30.000', valores: [
    '15k-a-30k', 'De R$ 15.000,00 a R$ 30.000,00 por mês', 'R$12.000 – R$20.000', 'R$ 12.000,00 a R$ 20.000,00',
    '300.000,00 anual', 'mais de 300.000,00, anual', 'Menos de 300 mil', 'Menos de R$ 300.000,00 por ano',
    'de_r$_10.000_a_r$_20.000_por_mês',
  ]},
  { grupo: 'Acima de R$30.000', valores: [
    'acima-de-30k', 'Mais de R$50.000', 'R$20.000 – R$50.000', 'Acima de 2 milhões',
  ]},
];

// Unificações aprovadas. Qualquer profissão fora daqui aparece solta, com o próprio texto.
export const MAPA_PROFISSAO = [
  { grupo: 'Empresária(o)', valores: [
    'Empresaria', 'Empresária', 'Empresária(o)', 'Empresária/Empreendedora', 'Empreendedora',
  ]},
  { grupo: 'Profissional Autônoma(o)', valores: [
    'Autonoma', 'Profissional Autônoma(o)', 'Profissional Liberal',
  ]},
  { grupo: 'Do lar', valores: [
    'Em casa',
  ]},
];

// Chave de comparação: ignora espaçamento e capitalização, só isso — variação de
// digitação/copy-paste no dado bruto ("R$ 2.000,00" vs "R$2.000,00", "clt" vs "CLT")
// não pode gerar dois grupos diferentes pra mesma coisa.
function chaveComparacao(v) {
  return v.trim().toLowerCase().replace(/\s+/g, '');
}

// Título padrão pra valor sem mapa: só a primeira letra maiúscula, resto como veio
// (espaçamento normalizado). Garante que "clt" e "CLT" caiam no mesmo grupo solto
// em vez de duplicar — sem sair reescrevendo o texto inteiro em Title Case.
function capitalizarPadrao(v) {
  const t = v.trim().replace(/\s+/g, ' ').toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// Ordem de exibição da Renda: crescente por valor de faixa, não alfabética
// (a ordem de declaração em MAPA_RENDA já é a ordem crescente correta).
const ORDEM_RENDA = MAPA_RENDA.map(m => m.grupo);

function buildLookup(mapa) {
  const lookup = new Map();
  mapa.forEach(({ grupo, valores }) => valores.forEach(v => lookup.set(chaveComparacao(v), grupo)));
  return lookup;
}

const LOOKUP_RENDA     = buildLookup(MAPA_RENDA);
const LOOKUP_PROFISSAO = buildLookup(MAPA_PROFISSAO);

// Valor bruto do lead -> grupo de exibição/filtro.
// Nunca retorna vazio/undefined: cai em "Não informado" ou numa versão padronizada do texto original.
export function getGrupoRenda(valorBruto) {
  const v = (valorBruto || '').trim();
  if (!v) return GRUPO_NAO_INFORMADO;
  return LOOKUP_RENDA.get(chaveComparacao(v)) || capitalizarPadrao(v);
}

export function getGrupoProfissao(valorBruto) {
  const v = (valorBruto || '').trim();
  if (!v) return GRUPO_NAO_INFORMADO;
  return LOOKUP_PROFISSAO.get(chaveComparacao(v)) || capitalizarPadrao(v);
}

// Grupos presentes numa lista de valores brutos, em ordem crescente de valor
// (faixas conhecidas na ordem de MAPA_RENDA, depois fora-do-mapa em ordem
// alfabética) — "Não informado" sempre por último, fixo, fora do sort.
export function listaGruposRenda(valoresBrutos) {
  const presentes  = new Set(valoresBrutos.map(getGrupoRenda));
  const conhecidos = ORDEM_RENDA.filter(g => presentes.has(g));
  const foraDoMapa = [...presentes]
    .filter(g => !ORDEM_RENDA.includes(g) && g !== GRUPO_NAO_INFORMADO)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const naoInformado = presentes.has(GRUPO_NAO_INFORMADO) ? [GRUPO_NAO_INFORMADO] : [];
  return [...conhecidos, ...foraDoMapa, ...naoInformado];
}

// Mesma regra da Renda: mapeados e fora-do-mapa juntos em ordem alfabética,
// "Não informado" sempre por último.
export function listaGruposProfissao(valoresBrutos) {
  const presentes    = new Set(valoresBrutos.map(getGrupoProfissao));
  const naoInformado = presentes.has(GRUPO_NAO_INFORMADO) ? [GRUPO_NAO_INFORMADO] : [];
  const resto = [...presentes]
    .filter(g => g !== GRUPO_NAO_INFORMADO)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return [...resto, ...naoInformado];
}

export function leadNoGrupoRenda(lead, gruposSelecionados) {
  if (!gruposSelecionados || !gruposSelecionados.length) return true;
  return gruposSelecionados.includes(getGrupoRenda(lead.renda));
}

export function leadNoGrupoProfissao(lead, gruposSelecionados) {
  if (!gruposSelecionados || !gruposSelecionados.length) return true;
  return gruposSelecionados.includes(getGrupoProfissao(lead.profissao));
}
