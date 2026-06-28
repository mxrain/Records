import { db } from './db';

export async function initializeTables() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS resources (
        id SERIAL PRIMARY KEY,
        uuid VARCHAR(36) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        category VARCHAR(100) DEFAULT '',
        tags JSONB DEFAULT '{}',
        download_links JSONB DEFAULT '[]',
        images JSONB DEFAULT '[]',
        source_links JSONB DEFAULT '[]',
        json_data JSONB DEFAULT '{}',
        sync_status VARCHAR(20) DEFAULT 'pending',
        github_sha VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ Resources table created');

    await db.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT DEFAULT '',
        icon VARCHAR(50),
        children JSONB DEFAULT '[]',
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ Categories table created');

    await db.query(`
      CREATE TABLE IF NOT EXISTS list_config (
        id SERIAL PRIMARY KEY,
        list_type VARCHAR(50) NOT NULL,
        resource_uuids JSONB DEFAULT '[]',
        config JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(list_type)
      )
    `);
    console.log('✓ List config table created');

    await db.query(`
      CREATE TABLE IF NOT EXISTS change_logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(20) NOT NULL,
        resource_uuid VARCHAR(36),
        data JSONB,
        old_data JSONB,
        synced BOOLEAN DEFAULT false,
        github_sha VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ Change logs table created');

    await db.query(`
      CREATE TABLE IF NOT EXISTS media_files (
        id SERIAL PRIMARY KEY,
        resource_uuid VARCHAR(36),
        bucket_name VARCHAR(100) NOT NULL,
        object_key VARCHAR(255) NOT NULL,
        original_name VARCHAR(255),
        file_size BIGINT,
        mime_type VARCHAR(100),
        uploaded_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ Media files table created');

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_resources_uuid ON resources(uuid);
      CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
      CREATE INDEX IF NOT EXISTS idx_resources_tags ON resources USING GIN(tags);
      CREATE INDEX IF NOT EXISTS idx_resources_json_data ON resources USING GIN(json_data);
      CREATE INDEX IF NOT EXISTS idx_change_logs_resource ON change_logs(resource_uuid);
      CREATE INDEX IF NOT EXISTS idx_change_logs_synced ON change_logs(synced);
      CREATE INDEX IF NOT EXISTS idx_media_files_resource ON media_files(resource_uuid);
    `);
    console.log('✓ Indexes created');

    console.log('All tables initialized successfully');
  } catch (error) {
    console.error('Error initializing tables:', error);
    throw error;
  }
}

async function main() {
  await initializeTables();
  console.log('Database initialization completed');
  process.exit(0);
}

main().catch((error) => {
  console.error('Database initialization failed:', error);
  process.exit(1);
});
