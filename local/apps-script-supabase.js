// ============================================================
//  FDV LEAD SYNC — Google Apps Script
//  ISCAS e Respondi.app → Supabase (PostgreSQL)
//
//  Substitui a integração anterior com Firebase Firestore.
//  Usa a Supabase REST API via UrlFetchApp.
// ============================================================

var CONFIG = {
  // Coluna onde a flag ✅/❌ é gravada
  FLAG_COLUMN_ISCAS:    'Q',   // coluna 17
  FLAG_COLUMN_RESPONDI: 'V',   // coluna 22

  // Mapeamento de colunas — ISCAS
  ISCAS_COLUMNS: {
    origem: 1, data: 2, status: 3, nome: 4, telefone: 5,
    email: 6, instagram: 7, desafio: 8, profissao: 9, renda: 10,
  },

  // Mapeamento de colunas — Respondi.app
  RESPONDI_COLUMNS: {
    origem: 1, data: 2, status: 3, nome: 4, telefone: 5,
    email: 6, instagram: 7, idade: 8, desafio: 9, profissao: 10,
    jaParticipou: 11, jaEAluna: 12, tempoConhece: 13, renda: 14,
    motivacao: 15, deOnde: 16,
  },

  // Supabase
  // TODO: após aplicar supabase/migrations/003_anon_rls_policies.sql,
  // trocar KEY pelo anon key para reduzir escopo de permissões.
  SUPABASE: {
    url:   'https://yadxcbhginjvoemacdly.supabase.co',
    key:   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZHhjYmhnaW5qdm9lbWFjZGx5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk2Nzk4MSwiZXhwIjoyMDkyNTQzOTgxfQ.Vp_JSA4ReP40a25L8GS7stNdROAy5YIIw-7HM98z_RY',
    table: 'leads',
  },

  // Linhas iniciais de cada aba (ignora histórico antigo)
  START_ROW_ISCAS:    2038,
  START_ROW_RESPONDI: 1153,

  // Valor do campo "status" na planilha que dispara o envio
  STATUS_TRIGGER: 'Qualificado',

  FLAG_OK:  '✅',
  FLAG_ERR: '❌',
};

// ─── ENTRADA PRINCIPAL ───────────────────────────────────────────────
/**
 * Função principal — executada pelo trigger de 5 minutos.
 * Varre as duas abas e envia leads novos ao Supabase.
 */
function syncLeads() {
  processSheet('ISCAS',        CONFIG.ISCAS_COLUMNS,    CONFIG.FLAG_COLUMN_ISCAS,    'ISCAS',        CONFIG.START_ROW_ISCAS);
  processSheet('Respondi.app', CONFIG.RESPONDI_COLUMNS, CONFIG.FLAG_COLUMN_RESPONDI, 'Respondi.app', CONFIG.START_ROW_RESPONDI);
}

// ─── PROCESSAR ABA ───────────────────────────────────────────────────
function processSheet(sheetName, cols, flagCol, fonte, startRow) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log('Aba "' + sheetName + '" não encontrada — pulando.');
    return;
  }

  var lastRow    = sheet.getLastRow();
  if (lastRow < startRow) return;

  var flagColIdx = columnLetterToIndex(flagCol);
  var data       = sheet.getRange(startRow, 1, lastRow - startRow + 1, flagColIdx).getValues();

  data.forEach(function(row, i) {
    var rowNumber = i + startRow;
    var flagCell  = sheet.getRange(rowNumber, flagColIdx);
    var flag      = String(flagCell.getValue()).trim();

    if (flag === CONFIG.FLAG_OK || flag === CONFIG.FLAG_ERR) return;

    var status = String(row[cols.status - 1] || '').trim();
    if (status !== CONFIG.STATUS_TRIGGER) return;

    var lead    = buildLead(row, cols, fonte);
    var success = sendToSupabase(lead);

    flagCell.setValue(success ? CONFIG.FLAG_OK : CONFIG.FLAG_ERR);
    SpreadsheetApp.flush();
  });
}

// ─── MONTAR OBJETO DO LEAD ───────────────────────────────────────────
function buildLead(row, cols, fonte) {
  function get(colNum) {
    return colNum ? String(row[colNum - 1] || '').trim() : '';
  }

  // Campos extras do formulário — guardados em observacoes como JSON
  // (exibidos na seção Perfil do app via parseObs)
  var extras = {};
  if (cols.desafio      && get(cols.desafio))      extras.desafio      = get(cols.desafio);
  if (cols.idade        && get(cols.idade))         extras.idade        = get(cols.idade);
  if (cols.jaParticipou && get(cols.jaParticipou))  extras.jaParticipou = get(cols.jaParticipou);
  if (cols.jaEAluna     && get(cols.jaEAluna))      extras.jaEAluna     = get(cols.jaEAluna);
  if (cols.tempoConhece && get(cols.tempoConhece))  extras.tempoConhece = get(cols.tempoConhece);
  if (cols.motivacao    && get(cols.motivacao))     extras.motivacao    = get(cols.motivacao);
  if (cols.deOnde       && get(cols.deOnde))        extras.deOnde       = get(cols.deOnde);

  return {
    nome:        get(cols.nome),
    celular:     get(cols.telefone),   // schema Supabase usa "celular"
    email:       get(cols.email),
    instagram:   get(cols.instagram),
    profissao:   get(cols.profissao),
    renda:       get(cols.renda),
    origem:      get(cols.origem) || fonte,
    status:      'aguardando',
    datachegada: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    observacoes: Object.keys(extras).length > 0 ? JSON.stringify(extras) : null,
    etiquetas:   [],
  };
}

// ─── ENVIAR AO SUPABASE ──────────────────────────────────────────────
/**
 * Insere um lead na tabela "leads" via Supabase REST API.
 * Retorna true em caso de sucesso, false em caso de erro.
 */
function sendToSupabase(lead) {
  var url = CONFIG.SUPABASE.url + '/rest/v1/' + CONFIG.SUPABASE.table;

  var options = {
    method:             'post',
    contentType:        'application/json',
    headers: {
      'apikey':         CONFIG.SUPABASE.key,
      'Authorization':  'Bearer ' + CONFIG.SUPABASE.key,
      'Prefer':         'return=minimal',
    },
    payload:            JSON.stringify(lead),
    muteHttpExceptions: true,
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var code     = response.getResponseCode();

    if (code >= 200 && code < 300) {
      Logger.log('✅ Lead enviado: ' + lead.nome + ' (' + lead.origem + ')');
      return true;
    } else {
      Logger.log('❌ Erro ' + code + ' ao enviar ' + lead.nome + ': ' + response.getContentText());
      return false;
    }
  } catch (e) {
    Logger.log('❌ Exceção ao enviar ' + lead.nome + ': ' + e.message);
    return false;
  }
}

// ─── UTILITÁRIOS ─────────────────────────────────────────────────────
function columnLetterToIndex(letters) {
  var result = 0;
  for (var i = 0; i < letters.length; i++) {
    result = result * 26 + letters.toUpperCase().charCodeAt(i) - 64;
  }
  return result;
}

// ─── GERENCIAR TRIGGER ───────────────────────────────────────────────
/**
 * Cria o trigger de 5 minutos para syncLeads.
 * Execute esta função UMA VEZ manualmente no editor do Apps Script.
 */
function createTimeTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(function(t) { return t.getHandlerFunction() === 'syncLeads'; })
    .forEach(function(t) { ScriptApp.deleteTrigger(t); });

  ScriptApp.newTrigger('syncLeads')
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log('Trigger de 5 minutos criado para syncLeads.');
}

function deleteTimeTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(function(t) { return t.getHandlerFunction() === 'syncLeads'; })
    .forEach(function(t) { ScriptApp.deleteTrigger(t); });

  Logger.log('Triggers de syncLeads removidos.');
}

// ─── TESTE MANUAL ────────────────────────────────────────────────────
/**
 * Executa syncLeads uma vez para testar sem esperar o trigger.
 * Veja logs em: Visualizar → Registros de execução
 */
function testSync() {
  syncLeads();
}

// ─── TESTE DE CONEXÃO ────────────────────────────────────────────────
/**
 * Verifica se a conexão com o Supabase está funcionando.
 * Executa no editor: selecione "testConnection" → ▶ Executar
 */
function testConnection() {
  var url = CONFIG.SUPABASE.url + '/rest/v1/' + CONFIG.SUPABASE.table + '?limit=1';
  var options = {
    method:  'get',
    headers: {
      'apikey':        CONFIG.SUPABASE.key,
      'Authorization': 'Bearer ' + CONFIG.SUPABASE.key,
    },
    muteHttpExceptions: true,
  };

  var response = UrlFetchApp.fetch(url, options);
  var code     = response.getResponseCode();
  Logger.log('Status: ' + code);
  Logger.log('Body: ' + response.getContentText().slice(0, 500));

  if (code === 200) {
    Logger.log('✅ Conexão com Supabase OK');
  } else {
    Logger.log('❌ Falha na conexão — verifique a key e o projeto');
  }
}

// ============================================================
//  COMO USAR — INSTRUÇÕES PARA O GOOGLE APPS SCRIPT
// ============================================================
//
//  1. ABRIR O EDITOR
//     Na planilha Google Sheets: Extensões → Apps Script
//
//  2. COLAR O CÓDIGO
//     Substitua o conteúdo de "Código.gs" pelo conteúdo deste
//     arquivo. Salve (Ctrl+S).
//
//  3. TESTAR A CONEXÃO (antes de ativar o trigger)
//     Selecione "testConnection" → ▶ Executar → autorize o
//     acesso à internet (UrlFetchApp). Deve ver "✅ Conexão OK".
//
//  4. ATIVAR O TRIGGER
//     Selecione "createTimeTrigger" → ▶ Executar
//     Confirme em "Acionadores" que aparece "A cada 5 minutos".
//
//  5. TESTAR O SYNC
//     Selecione "testSync" → ▶ Executar.
//     Veja logs em "Visualizar → Registros de execução".
//
//  6. LÓGICA DE FLAGS
//     - Somente linhas com status "Qualificado" são enviadas
//     - Após envio: coluna Q (ISCAS) ou V (Respondi.app) recebe ✅
//     - Em caso de erro: recebe ❌ (apague a flag para tentar novamente)
//
//  7. PAUSAR A SYNC
//     Execute "deleteTimeTrigger" para remover o trigger.
//
// ============================================================
