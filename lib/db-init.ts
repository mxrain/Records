import { db } from './db';

export async function initializeTables() {
  try {
    // 创建用户表
    await db.query(`
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
    await db.query(`
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

    // 创建分类表
    await db.query(`
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
    await db.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        color VARCHAR(7) DEFAULT '#3B82F6',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Tags table created');

    // 创建下载记录表
    await db.query(`
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
    await db.query(`
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
    await db.query(`
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

// 如果直接运行此脚本
if (require.main === module) {
  initializeTables()
    .then(() => {
      console.log('Database initialization completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database initialization failed:', error);
      process.exit(1);
    });
}