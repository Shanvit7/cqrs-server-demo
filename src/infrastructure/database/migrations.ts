// INFRASTRUCTURE
import { migrationRunner } from './migration-runner';
// LOGGER
import logger from '@/utils/logger';

export const runMigrations = async (): Promise<void> => {
  try {
    logger.info('Running database migrations...');
    await migrationRunner.up();
    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed', error);
    throw error;
  }
};
