#!/usr/bin/env bun

/**
 * Migration CLI - Custom migration system similar to db-migrate
 * Usage:
 *   bun run migrate up        - Run pending migrations
 *   bun run migrate down       - Rollback last migration
 *   bun run migrate down 2     - Rollback last 2 migrations
 *   bun run migrate status     - Show migration status
 */

// INFRASTRUCTURE
import { migrationRunner } from './migration-runner';
import { closePostgresPool } from './postgres';
// LOGGER
import logger from '@/utils/logger';

const main = async () => {
  const command = process.argv[2] || 'up';
  const count = parseInt(process.argv[3] || '1', 10);

  try {
    switch (command) {
      case 'up':
        await migrationRunner.up();
        break;

      case 'down':
        await migrationRunner.down(count);
        break;

      case 'status':
        await migrationRunner.status();
        break;

      default:
        logger.error(`Unknown command: ${command}`);
        logger.info('\nUsage:');
        logger.info('  bun run migrate up          - Run pending migrations');
        logger.info('  bun run migrate down        - Rollback last migration');
        logger.info('  bun run migrate down 2       - Rollback last 2 migrations');
        logger.info('  bun run migrate status       - Show migration status');
        await closePostgresPool();
        process.exit(1);
    }
  } catch (error) {
    logger.error('Migration command failed', error);
    await closePostgresPool();
    process.exit(1);
  } finally {
    // Always close the pool to allow the process to exit
    await closePostgresPool();
  }
};

main();
