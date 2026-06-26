import { db } from '../lib/db';
import { redis } from '../lib/cache/redis';
import { r2 } from '../lib/storage/r2';

export async function initializeDatabases() {
  try {
    const client = await db.getClient();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✓ PostgreSQL connected successfully');

    await redis.set('test', 'ok');
    await redis.del('test');
    console.log('✓ Redis connected successfully');

    console.log('✓ R2 client ready (bucket must be created in Cloudflare dashboard)');

    console.log('All remote services initialized successfully');
  } catch (error) {
    console.error('Remote service initialization error:', error);
    throw error;
  }
}

async function main() {
  await initializeDatabases();
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('Service check completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Service check failed:', error);
      process.exit(1);
    });
}
