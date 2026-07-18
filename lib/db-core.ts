import 'server-only';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

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

// 事务接口:既可执行 query,也可在事务内嵌套调用
export interface TransactionClient {
  query<R extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<R>>;
}

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
  /**
   * 在单个数据库事务中执行多个写操作
   * - 自动 BEGIN / COMMIT / ROLLBACK
   * - 自动释放连接(即使出错)
   * - 事务内通过 tx.query 执行 SQL,所有操作共享同一连接
   *
   * 用法:
   *   await db.withTransaction(async (tx) => {
   *     await tx.query('INSERT ...', [...]);
   *     await tx.query('INSERT ...', [...]);
   *   });
   */
  async withTransaction<T>(fn: (tx: TransactionClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('Transaction ROLLBACK failed:', rollbackErr);
      }
      throw error;
    } finally {
      client.release();
    }
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
