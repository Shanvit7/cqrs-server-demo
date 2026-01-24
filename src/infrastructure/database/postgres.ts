// DATABASE
import { Pool } from 'pg';
// CONSTANTS
import { POSTGRES_CONFIG } from '@/utils/constants';
// LOGGER
import logger from '@/utils/logger';

let pool: Pool | null = null;

export const getPostgresPool = (): Pool => {
  if (!pool) {
    pool = new Pool(POSTGRES_CONFIG);

    pool.on('error', (err) => {
      logger.error('Unexpected error on idle PostgreSQL client', err);
    });

    pool.on('connect', () => {
      logger.info('PostgreSQL client connected');
    });
  }

  return pool;
};

export const closePostgresPool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('PostgreSQL pool closed');
  }
};

// Initialize connection on import
export const postgresPool = getPostgresPool();
