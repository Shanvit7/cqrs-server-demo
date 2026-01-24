// INFRASTRUCTURE
import { postgresPool } from './postgres';
// LOGGER
import logger from '@/utils/logger';
// NODE.JS
import { readdir, readFile, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MIGRATIONS_DIR = join(__dirname, 'migrations');

export interface Migration {
  name: string;
  path: string;
  upSql: string;
  downSql: string;
}

export class MigrationRunner {
  private async ensureMigrationsTable(): Promise<void> {
    await postgresPool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
  }

  private async getExecutedMigrations(): Promise<string[]> {
    const result = await postgresPool.query('SELECT name FROM migrations ORDER BY executed_at');
    return result.rows.map((row: { name: string }) => row.name);
  }

  private async loadMigrations(): Promise<Migration[]> {
    const files = await readdir(MIGRATIONS_DIR);
    const migrationDirs = files.filter((file) => {
      // Migration directories should be: timestamp_name
      return /^\d+_.+$/.test(file);
    });

    const migrations: Migration[] = [];

    for (const dir of migrationDirs.sort()) {
      const dirPath = join(MIGRATIONS_DIR, dir);
      const dirStat = await stat(dirPath);

      if (!dirStat.isDirectory()) {
        continue;
      }

      const upPath = join(dirPath, 'up.sql');
      const downPath = join(dirPath, 'down.sql');

      try {
        const upSql = await readFile(upPath, 'utf-8');
        const downSql = await readFile(downPath, 'utf-8');

        migrations.push({
          name: dir,
          path: dirPath,
          upSql,
          downSql,
        });
      } catch (error) {
        logger.warn(`Skipping migration ${dir}: missing up.sql or down.sql`);
      }
    }

    return migrations;
  }

  async up(): Promise<void> {
    await this.ensureMigrationsTable();
    const migrations = await this.loadMigrations();
    const executed = await this.getExecutedMigrations();
    const executedSet = new Set(executed);

    const pending = migrations.filter((m) => !executedSet.has(m.name));

    if (pending.length === 0) {
      logger.info('No pending migrations');
      return;
    }

    logger.info(`Running ${pending.length} pending migration(s)...`);

    for (const migration of pending) {
      try {
        logger.info(`Migrating: ${migration.name}`);
        await postgresPool.query('BEGIN');
        await postgresPool.query(migration.upSql);
        await postgresPool.query('INSERT INTO migrations (name) VALUES ($1)', [migration.name]);
        await postgresPool.query('COMMIT');
        logger.info(`✓ Migration ${migration.name} completed`);
      } catch (error) {
        await postgresPool.query('ROLLBACK');
        logger.error(`✗ Migration ${migration.name} failed:`, error);
        throw error;
      }
    }

    logger.info('All migrations completed successfully');
  }

  async down(count: number = 1): Promise<void> {
    await this.ensureMigrationsTable();
    const migrations = await this.loadMigrations();
    const executed = await this.getExecutedMigrations();

    if (executed.length === 0) {
      logger.info('No migrations to rollback');
      return;
    }

    const toRollback = executed.slice(-count).reverse();

    logger.info(`Rolling back ${toRollback.length} migration(s)...`);

    for (const migrationName of toRollback) {
      const migration = migrations.find((m) => m.name === migrationName);

      if (!migration) {
        logger.warn(`Migration ${migrationName} not found, skipping`);
        continue;
      }

      try {
        logger.info(`Rolling back: ${migration.name}`);
        await postgresPool.query('BEGIN');
        await postgresPool.query(migration.downSql);
        await postgresPool.query('DELETE FROM migrations WHERE name = $1', [migration.name]);
        await postgresPool.query('COMMIT');
        logger.info(`✓ Rollback ${migration.name} completed`);
      } catch (error) {
        await postgresPool.query('ROLLBACK');
        logger.error(`✗ Rollback ${migration.name} failed:`, error);
        throw error;
      }
    }

    logger.info('Rollback completed successfully');
  }

  async status(): Promise<void> {
    await this.ensureMigrationsTable();
    const migrations = await this.loadMigrations();
    const executed = await this.getExecutedMigrations();
    const executedSet = new Set(executed);

    logger.info('\nMigration Status:');
    logger.info('==================');

    for (const migration of migrations) {
      const status = executedSet.has(migration.name) ? '✓ EXECUTED' : '○ PENDING';
      logger.info(`${status} - ${migration.name}`);
    }

    const pending = migrations.filter((m) => !executedSet.has(m.name));
    logger.info(`\nTotal: ${migrations.length} migrations, ${pending.length} pending`);
  }
}

export const migrationRunner = new MigrationRunner();
