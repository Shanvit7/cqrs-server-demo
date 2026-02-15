// ENV
import 'dotenv/config';

export const PORT = process.env.PORT || 3000;

/** Allowed origin for CORS (e.g. frontend URL). Default: http://localhost:5173 */
export const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

export const isProduction = process.env.NODE_ENV === 'production';

// PostgreSQL Configuration
export const POSTGRES_CONFIG = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'cqrs_oms',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  max: 20, // Connection pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Redis Configuration
export const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};
