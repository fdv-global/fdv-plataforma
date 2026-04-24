'use strict';

/**
 * FDV — Migration Runner
 * Executa qualquer arquivo SQL no Supabase via pg direto.
 *
 * Uso:
 *   DB_PASSWORD="suasenha" node run-migration.js [arquivo.sql]
 *
 * Exemplos:
 *   DB_PASSWORD="suasenha" node run-migration.js
 *   DB_PASSWORD="suasenha" node run-migration.js migrations/003_anon_rls_policies.sql
 *
 * Onde encontrar a senha:
 *   Supabase Dashboard → Settings → Database → Connection string → password
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'yadxcbhginjvoemacdly';
const DB_HOST     = `db.${PROJECT_REF}.supabase.co`;
const DB_PASSWORD = process.env.DB_PASSWORD;

if (!DB_PASSWORD) {
  console.error('\n  ❌  Variável DB_PASSWORD não definida.');
  console.error('  Uso: DB_PASSWORD="suasenha" node run-migration.js [arquivo.sql]\n');
  process.exit(1);
}

const sqlArg = process.argv[2];
const SQL_FILE = sqlArg
  ? path.resolve(__dirname, sqlArg)
  : path.join(__dirname, 'migrations', '001_initial_schema.sql');

async function main() {
  const sql = fs.readFileSync(SQL_FILE, 'utf8');
  const line = '─'.repeat(55);

  console.log('');
  console.log('  FDV — Migration Runner');
  console.log(`  ${line}`);
  console.log(`  Host    : ${DB_HOST}:5432`);
  console.log(`  Arquivo : ${path.basename(SQL_FILE)}`);
  console.log(`  ${line}`);
  console.log('');

  const client = new Client({
    host:     DB_HOST,
    port:     5432,
    database: 'postgres',
    user:     'postgres',
    password: DB_PASSWORD,
    ssl:      { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  console.log('  Conectando...');
  await client.connect();
  console.log('  ✅  Conectado\n');

  console.log('  Executando SQL...');
  const start = Date.now();
  await client.query(sql);
  const ms = Date.now() - start;

  console.log(`  ✅  SQL executado em ${ms}ms\n`);

  // Verificar tabelas criadas
  const result = await client.query(`
    SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `);

  console.log('  Tabelas no schema public:');
  console.log(`  ${line}`);
  result.rows.forEach(r => {
    console.log(`  ✓  ${r.tablename.padEnd(25)} ${r.size}`);
  });
  console.log(`  ${line}`);
  console.log(`  Total: ${result.rows.length} tabela(s)\n`);

  await client.end();
  console.log('  ✨  Migração concluída com sucesso!\n');
}

main().catch(err => {
  console.error('\n  ❌  Erro:', err.message);
  process.exit(1);
});
