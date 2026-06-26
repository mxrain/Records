import { createClient } from 'redis';
import 'server-only';

declare global {
  var redisClient: ReturnType<typeof createClient> | undefined;
}

export async function getRedisClient() {
  const existingClient = global.redisClient;

  if (existingClient?.isOpen) {
    return existingClient;
  }

  if (existingClient) {
    try { await existingClient.disconnect(); } catch (e) { console.error('Error disconnecting stale redis client:', e); }
    global.redisClient = undefined;
  }

  if (!process.env.REDIS_URL) {
    console.warn('REDIS_URL environment variable is not set');
  }

  const client = createClient({
    url: process.env.REDIS_URL,
  });

  client.on('error', (err) => console.error('Redis Client Error:', err));
  client.on('connect', () => console.log('Redis Client Connected'));

  await client.connect();

  if (process.env.NODE_ENV !== 'production') global.redisClient = client;

  return client;
}

export const redis = {
  async get(key: string) {
    const client = await getRedisClient();
    return await client.get(key);
  },
  async set(key: string, value: string, expiry?: number) {
    const client = await getRedisClient();
    if (expiry) {
      return await client.setEx(key, expiry, value);
    }
    return await client.set(key, value);
  },
  async del(key: string) {
    const client = await getRedisClient();
    return await client.del(key);
  },
  async exists(key: string) {
    const client = await getRedisClient();
    return await client.exists(key);
  },
  async disconnect() {
    if (global.redisClient) {
      await global.redisClient.disconnect();
      global.redisClient = undefined;
    }
  },
};
