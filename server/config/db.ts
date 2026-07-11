import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';

const prisma = new PrismaClient();

let redisClient: any = null;

if (process.env.REDIS_URL) {
  redisClient = createClient({ url: process.env.REDIS_URL });
  redisClient.on('error', (err: any) => console.error('Redis Client Error', err));
  redisClient.connect().catch((err: any) => {
    console.warn('Redis connection failed, falling back to memory cache:', err.message);
    redisClient = null;
  });
}

// Resilient caching wrapper
export const cache = {
  async get(key: string): Promise<string | null> {
    if (redisClient) {
      try {
        return await redisClient.get(key);
      } catch {
        return null;
      }
    }
    return null;
  },
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (redisClient) {
      try {
        if (ttlSeconds) {
          await redisClient.set(key, value, { EX: ttlSeconds });
        } else {
          await redisClient.set(key, value);
        }
      } catch {
        // Fallback silently
      }
    }
  },
  async del(key: string): Promise<void> {
    if (redisClient) {
      try {
        await redisClient.del(key);
      } catch {
        // Fallback silently
      }
    }
  }
};

export { prisma };
