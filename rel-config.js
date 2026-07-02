// rel-config.js — Benchmarks de referência para semáforos e análise
// Editar aqui para ajustar os thresholds sem mexer na lógica principal.

export const REL_CONFIG = {
  // Taxa de comparecimento: % de agendados que apareceram na call
  comparecimento: { verde: 65, amarelo: 40 }, // verde ≥65%, amarelo 40-64%, vermelho <40%

  // Taxa de conversão: % de calls realizadas que viraram venda
  conversao: { verde: 30, amarelo: 15 },      // verde ≥30%, amarelo 15-29%, vermelho <15%

  // Velocidade do funil: média de dias do lead entrar até a call
  velocidade: { verde: 7, amarelo: 14 },      // verde ≤7d, amarelo 8-14d, vermelho >14d

  // Renda mínima para classificar como "perfil qualificado" na análise de canais
  rendaThreshold: 5000,                       // R$ 5.000
};
