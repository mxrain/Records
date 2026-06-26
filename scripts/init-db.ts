/**
 * 数据库初始化脚本
 * 运行此脚本以初始化 PostgreSQL 表结构
 */

import { initializeDatabases } from '../lib/db';
import { initializeTables } from '../lib/db-init';

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
  }
}

main();