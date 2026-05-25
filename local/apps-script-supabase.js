// ============================================================
//  FDV LEAD SYNC — Google Apps Script
//  Iscas e Respondi.app → Supabase (PostgreSQL)
//
//  Substitui a integração anterior com Firebase Firestore.
//  Usa a Supabase REST API via UrlFetchApp.
// ============================================================

var CONFIG = {
  // Coluna onde a flag ✅/❌ é gravada
  FLAG_COLUMN_ISCAS: 'Q',   // coluna 17
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
    url: 'https://yadxcbhginjvoemacdly.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZHhjYmhnaW5qdm9lbWFjZGx5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk2Nzk4MSwiZXhwIjoyMDkyNTQzOTgxfQ.Vp_JSA4ReP40a25L8GS7stNdROAy5YIIw-7HM98z_RY',
    table: 'leads',
  },

  // Linhas iniciais de cada aba (ignora histórico antigo)
  START_ROW_ISCAS: 2038,
  START_ROW_RESPONDI: 1153,

  // Data de corte para o backfill (inclusive)
  BACKFILL_FROM: new Date(2026, 4, 25), // 25 de maio de 2026 — data de corte do reset

  FLAG_OK: '✅',
  FLAG_ERR: '❌',
};

// ─── ENTRADA PRINCIPAL ───────────────────────────────────────────────
/**
 * Função principal — executada pelo trigger de 5 minutos.
 * Varre as duas abas e envia leads novos ao Supabase.
 */
function syncLeads() {
  processSheet('Iscas', CONFIG.ISCAS_COLUMNS, CONFIG.FLAG_COLUMN_ISCAS, 'Iscas', CONFIG.START_ROW_ISCAS);
  processSheet('Respondi.app', CONFIG.RESPONDI_COLUMNS, CONFIG.FLAG_COLUMN_RESPONDI, 'Respondi.app', CONFIG.START_ROW_RESPONDI);
}

// ─── PROCESSAR ABA ───────────────────────────────────────────────────
function processSheet(sheetName, cols, flagCol, fonte, startRow) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log('Aba "' + sheetName + '" não encontrada — pulando.');
    return;
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < startRow) return;

  var flagColIdx = columnLetterToIndex(flagCol);
  var data = sheet.getRange(startRow, 1, lastRow - startRow + 1, flagColIdx).getValues();

  data.forEach(function (row, i) {
    var rowNumber = i + startRow;
    var flagCell = sheet.getRange(rowNumber, flagColIdx);
    var flag = String(flagCell.getValue()).trim();

    if (flag === CONFIG.FLAG_OK || flag === CONFIG.FLAG_ERR) return;

    var lead = buildLead(row, cols, fonte);
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
  if (cols.desafio && get(cols.desafio)) extras.desafio = get(cols.desafio);
  if (cols.idade && get(cols.idade)) extras.idade = get(cols.idade);
  if (cols.jaParticipou && get(cols.jaParticipou)) extras.jaParticipou = get(cols.jaParticipou);
  if (cols.jaEAluna && get(cols.jaEAluna)) extras.jaEAluna = get(cols.jaEAluna);
  if (cols.tempoConhece && get(cols.tempoConhece)) extras.tempoConhece = get(cols.tempoConhece);
  if (cols.motivacao && get(cols.motivacao)) extras.motivacao = get(cols.motivacao);
  if (cols.deOnde && get(cols.deOnde)) extras.deOnde = get(cols.deOnde);

  return {
    nome: get(cols.nome),
    celular: get(cols.telefone),   // schema Supabase usa "celular"
    email: get(cols.email),
    instagram: get(cols.instagram),
    profissao: get(cols.profissao),
    renda: get(cols.renda),
    origem: get(cols.origem) || fonte,
    status: 'aguardando',
    datachegada: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    observacoes: Object.keys(extras).length > 0 ? JSON.stringify(extras) : null,
    etiquetas: [],
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
    method: 'post',
    contentType: 'application/json',
    headers: {
      'apikey': CONFIG.SUPABASE.key,
      'Authorization': 'Bearer ' + CONFIG.SUPABASE.key,
      'Prefer': 'return=minimal',
    },
    payload: JSON.stringify(lead),
    muteHttpExceptions: true,
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();

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
    .filter(function (t) { return t.getHandlerFunction() === 'syncLeads'; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });

  ScriptApp.newTrigger('syncLeads')
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log('Trigger de 5 minutos criado para syncLeads.');
}

function deleteTimeTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === 'syncLeads'; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });

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

// ─── BACKFILL MANUAL ─────────────────────────────────────────────────
/**
 * Importação histórica: percorre TODAS as linhas (desde a linha 2) das
 * abas Iscas e Respondi.app e insere no Supabase os leads que ainda não
 * estão lá — verificando duplicatas por celular ou e-mail antes de inserir.
 *
 * Execute UMA VEZ manualmente: selecione "backfillLeads" → ▶ Executar
 * Acompanhe o progresso em: Visualizar → Registros de execução
 */
function backfillLeads() {
  Logger.log('=== BACKFILL INICIADO ===');
  var existing = fetchExistingContacts();
  Logger.log('Contatos já no Supabase: ' + existing.count);

  backfillSheet('Iscas', CONFIG.ISCAS_COLUMNS, CONFIG.FLAG_COLUMN_ISCAS, 'Iscas', existing);
  backfillSheet('Respondi.app', CONFIG.RESPONDI_COLUMNS, CONFIG.FLAG_COLUMN_RESPONDI, 'Respondi.app', existing);

  Logger.log('=== BACKFILL CONCLUÍDO ===');
}

/**
 * Busca todos os celulares e e-mails já presentes na tabela do Supabase.
 * Usa paginação para suportar mais de 1 000 registros.
 */
function fetchExistingContacts() {
  var phones = {};
  var emails = {};
  var count = 0;
  var offset = 0;
  var batch = 1000;

  while (true) {
    var url = CONFIG.SUPABASE.url + '/rest/v1/' + CONFIG.SUPABASE.table
      + '?select=celular,email&limit=' + batch + '&offset=' + offset;

    var resp = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        'apikey': CONFIG.SUPABASE.key,
        'Authorization': 'Bearer ' + CONFIG.SUPABASE.key,
        'Range-Unit': 'items',
      },
      muteHttpExceptions: true,
    });

    var rows = JSON.parse(resp.getContentText());
    if (!rows || rows.length === 0) break;

    rows.forEach(function (r) {
      if (r.celular) phones[r.celular.trim()] = true;
      if (r.email) emails[r.email.trim()] = true;
      count++;
    });

    if (rows.length < batch) break;
    offset += batch;
  }

  return { phones: phones, emails: emails, count: count };
}

/**
 * Percorre uma aba desde a linha 2 e insere os leads ausentes no Supabase.
 * Linhas já marcadas com ✅ são ignoradas. Linhas com ❌ são retentadas.
 */
function backfillSheet(sheetName, cols, flagCol, fonte, existing) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log('Aba "' + sheetName + '" não encontrada — pulando.');
    return;
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var flagColIdx = columnLetterToIndex(flagCol);
  var inserted = 0;
  var skipped = 0;

  var data = sheet.getRange(2, 1, lastRow - 1, flagColIdx).getValues();

  data.forEach(function (row, i) {
    var rowNumber = i + 2;
    var flagCell = sheet.getRange(rowNumber, flagColIdx);
    var flag = String(flagCell.getValue()).trim();

    if (flag === CONFIG.FLAG_OK) { skipped++; return; }

    // Filtra por data de corte
    var rowDate = row[cols.data - 1];
    if (!(rowDate instanceof Date) || rowDate < CONFIG.BACKFILL_FROM) { skipped++; return; }

    var celular = String(row[cols.telefone - 1] || '').trim();
    var email = String(row[cols.email - 1] || '').trim();

    if (!celular && !email) { skipped++; return; }

    if ((celular && existing.phones[celular]) || (email && existing.emails[email])) {
      flagCell.setValue(CONFIG.FLAG_OK);
      skipped++;
      return;
    }

    var lead = buildLead(row, cols, fonte);

    // Preserva a data original da planilha quando disponível
    var rawDate = row[cols.data - 1];
    if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
      lead.datachegada = Utilities.formatDate(rawDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }

    var success = sendToSupabase(lead);
    flagCell.setValue(success ? CONFIG.FLAG_OK : CONFIG.FLAG_ERR);
    SpreadsheetApp.flush();

    if (success) {
      if (celular) existing.phones[celular] = true;
      if (email) existing.emails[email] = true;
      inserted++;
    }
  });

  Logger.log(sheetName + ': ' + inserted + ' inseridos, ' + skipped + ' ignorados.');
}

// ─── TESTE DE CONEXÃO ────────────────────────────────────────────────
/**
 * Verifica se a conexão com o Supabase está funcionando.
 * Executa no editor: selecione "testConnection" → ▶ Executar
 */
function testConnection() {
  var url = CONFIG.SUPABASE.url + '/rest/v1/' + CONFIG.SUPABASE.table + '?limit=1';
  var options = {
    method: 'get',
    headers: {
      'apikey': CONFIG.SUPABASE.key,
      'Authorization': 'Bearer ' + CONFIG.SUPABASE.key,
    },
    muteHttpExceptions: true,
  };

  var response = UrlFetchApp.fetch(url, options);
  var code = response.getResponseCode();
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
//     - TODOS os leads são enviados, independente do status na planilha
//     - Após envio: coluna Q (Iscas) ou V (Respondi.app) recebe ✅
//     - Em caso de erro: recebe ❌ (apague a flag para tentar novamente)
//
//  7. BACKFILL HISTÓRICO (executar UMA VEZ)
//     Selecione "backfillLeads" → ▶ Executar
//     Importa todos os leads históricos das abas Iscas e Respondi.app
//     verificando duplicatas por celular/e-mail antes de inserir.
//
//  8. PAUSAR A SYNC
//     Execute "deleteTimeTrigger" para remover o trigger.
//
// ============================================================
