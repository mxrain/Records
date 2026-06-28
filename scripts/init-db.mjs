/**
 * 数据库初始化脚本 (JavaScript 版本)
 * 运行此脚本以初始化 PostgreSQL 表结构
 */

import { Pool } from 'pg';
import { createClient } from 'redis';
import { Client } from 'minio';

// PostgreSQL 连接配置
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://mxrain:zilidr160@postgresql.6200052.xyz:5432/records',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Redis 连接配置
let redisClient = null;

async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://:zilidr160@redis.6200052.xyz:6379',
      password: process.env.REDIS_PASSWORD || 'zilidr160',
    });

    redisClient.on('error', (err) => console.error('Redis Client Error:', err));
    redisClient.on('connect', () => console.log('Redis Client Connected'));

    await redisClient.connect();
  }
  return redisClient;
}

// MinIO 连接配置
const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'minio.6200052.xyz',
  port: parseInt(process.env.MINIO_PORT || '444'),
  useSSL: process.env.MINIO_USE_SSL !== 'false',
  accessKey: process.env.MINIO_ACCESS_KEY || 'mxrain',
  secretKey: process.env.MINIO_SECRET_KEY || 'zilidr160',
});

async function ensureBucket(bucketName) {
  const exists = await minioClient.bucketExists(bucketName);
  if (!exists) {
    await minioClient.makeBucket(bucketName);
    console.log(`Bucket ${bucketName} created`);
  }
  return exists;
}

// 数据库查询函数
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// 初始化数据库连接
async function initializeDatabases() {
  try {
    // 测试 PostgreSQL 连接
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✓ PostgreSQL connected successfully');

    // 测试 Redis 连接
    await getRedisClient();
    await redisClient.set('test', 'ok');
    await redisClient.del('test');
    console.log('✓ Redis connected successfully');

    // 测试 MinIO 连接（可选，如果失败则跳过）
    try {
      await ensureBucket(process.env.MINIO_BUCKET || 'records');
      console.log('✓ MinIO connected successfully');
    } catch (minioError) {
      console.warn('⚠ MinIO connection failed (skipping):', minioError.message);
    }

    console.log('All databases initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// 创建表结构
async function initializeTables() {
  try {
    // 创建分类表
    await query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        icon VARCHAR(50),
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Categories table created');

    // 创建标签表
    await query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        color VARCHAR(7) DEFAULT '#3B82F6',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Tags table created');

    // 创建用户表
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Users table created');

    // 创建资源表
    await query(`
      CREATE TABLE IF NOT EXISTS resources (
        id SERIAL PRIMARY KEY,
        uuid VARCHAR(36) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category_id INTEGER,
        tags TEXT[],
        download_links JSONB,
        images JSONB,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
      )
    `);
    console.log('✓ Resources table created');

    // 创建下载记录表
    await query(`
      CREATE TABLE IF NOT EXISTS download_records (
        id SERIAL PRIMARY KEY,
        resource_id INTEGER NOT NULL,
        user_id INTEGER,
        ip_address VARCHAR(45),
        user_agent TEXT,
        downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✓ Download records table created');

    // 创建文件存储表
    await query(`
      CREATE TABLE IF NOT EXISTS file_storage (
        id SERIAL PRIMARY KEY,
        resource_id INTEGER NOT NULL,
        bucket_name VARCHAR(100) NOT NULL,
        object_name VARCHAR(255) NOT NULL,
        original_name VARCHAR(255),
        file_size BIGINT,
        mime_type VARCHAR(100),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ File storage table created');

    // 创建索引
    await query(`
      CREATE INDEX IF NOT EXISTS idx_resources_uuid ON resources(uuid);
      CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category_id);
      CREATE INDEX IF NOT EXISTS idx_resources_tags ON resources USING GIN(tags);
      CREATE INDEX IF NOT EXISTS idx_download_records_resource ON download_records(resource_id);
      CREATE INDEX IF NOT EXISTS idx_download_records_user ON download_records(user_id);
      CREATE INDEX IF NOT EXISTS idx_file_storage_resource ON file_storage(resource_id);
    `);
    console.log('✓ Indexes created');

    console.log('All tables initialized successfully');
  } catch (error) {
    console.error('Error initializing tables:', error);
    throw error;
  }
}

// 主函数
async function main() {
  try {
    console.log('Starting database initialization...\n');

    // 初始化数据库连接
    console.log('1. Connecting to databases...');
    await initializeDatabases();

    // 创建表结构
    console.log('\n2. Creating tables...');
    await initializeTables();

    console.log('\n✓ Database initialization completed successfully!');
    console.log('\nYou can now start the application with: npm run dev');
  } catch (error) {
    console.error('\n✗ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
    if (redisClient) {
      await redisClient.disconnect();
    }
  }
}

main();