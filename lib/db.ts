import { Pool } from 'pg';
import 'server-only';

declare global {
  var postgres: Pool | undefined;
}

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL environment variable is not set');
}

const pool = global.postgres || new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

if (process.env.NODE_ENV !== 'production') global.postgres = pool;

export const db = {
  async query(text: string, params?: any[]) {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  },
  async getClient() {
    const client = await pool.connect();
    return client;
  },
  pool,
};

export async function closeDatabaseConnections() {
  try {
    await pool.end();
    console.log('PostgreSQL connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
}
