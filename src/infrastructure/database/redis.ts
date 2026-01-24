// DATABASE
import Redis from 'ioredis';
// CONSTANTS
import { REDIS_CONFIG } from '@/utils/constants';
// LOGGER
import logger from '@/utils/logger';

let redisClient: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    redisClient = new Redis(REDIS_CONFIG);

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis client error', err);
    });

    redisClient.on('close', () => {
      logger.info('Redis client closed');
    });
  }

  return redisClient;
};

export const closeRedisClient = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis client closed');
  }
};

// Initialize connection on import
export const redis = getRedisClient();
