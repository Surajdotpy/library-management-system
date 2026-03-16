import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PoolClient } from 'pg';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDirectory = path.join(__dirname, 'migrations');

async function ensureMigrationsTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function getMigrationFiles(): Promise<string[]> {
  const entries = await readdir(migrationsDirectory, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

export async function runPendingMigrations(): Promise<string[]> {
  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);

    const appliedResult = await client.query<{ name: string }>(
      'SELECT name FROM schema_migrations ORDER BY name',
    );
    const appliedMigrations = new Set(appliedResult.rows.map((row) => row.name));
    const migrationFiles = await getMigrationFiles();
    const newlyApplied: string[] = [];

    for (const migrationFile of migrationFiles) {
      if (appliedMigrations.has(migrationFile)) {
        continue;
      }

      const migrationPath = path.join(migrationsDirectory, migrationFile);
      const sql = await readFile(migrationPath, 'utf8');

      await client.query('BEGIN');

      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (name) VALUES ($1)',
          [migrationFile],
        );
        await client.query('COMMIT');
        newlyApplied.push(migrationFile);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(
          `Failed to apply migration "${migrationFile}": ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    }

    return newlyApplied;
  } finally {
    client.release();
  }
}
