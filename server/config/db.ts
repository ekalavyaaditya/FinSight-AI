import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simple in-memory cache (no Redis dependency required)
const memoryStore = new Map<string, { value: string; expiresAt: number | null }>();

export const cache = {
  async get(key: string): Promise<string | null> {
    const entry = memoryStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      memoryStore.delete(key);
      return null;
    }
    return entry.value;
  },
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    memoryStore.set(key, { value, expiresAt });
  },
  async del(key: string): Promise<void> {
    memoryStore.delete(key);
  }
};

export { prisma };

