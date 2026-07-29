import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function initDB() {
  console.log('🔄 Initializing MySQL database setup...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  });

  console.log('✅ Connected to MySQL server.');

  await connection.query('CREATE DATABASE IF NOT EXISTS cert_techcol CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
  console.log('✅ Database cert_techcol created / confirmed.');
  
  await connection.query('USE cert_techcol;');

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  const statements = schemaSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Executing ${statements.length} schema DDL statements...`);
  for (const stmt of statements) {
    await connection.query(stmt);
  }

  console.log('✅ Database schema loaded successfully.');
  await connection.end();
}

initDB().catch((err) => {
  console.error('❌ Error initializing database:', err);
  process.exit(1);
});
