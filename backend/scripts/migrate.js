import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db.js';

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      dosya VARCHAR(255) NOT NULL UNIQUE,
      tarih TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const { rowCount } = await pool.query('SELECT 1 FROM _migrations WHERE dosya = $1', [file]);
    if (rowCount > 0) {
      console.log(`Atlandı (zaten uygulanmış): ${file}`);
      continue;
    }
    const sql = await readFile(path.join(migrationsDir, file), 'utf8');
    await pool.query(sql);
    await pool.query('INSERT INTO _migrations (dosya) VALUES ($1)', [file]);
    console.log(`Uygulandı: ${file}`);
  }
  await pool.end();
  console.log('Migrasyon tamamlandı.');
}

migrate().catch((err) => {
  console.error('Migrasyon hatası:', err);
  process.exit(1);
});
