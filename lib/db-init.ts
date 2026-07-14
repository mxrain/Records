import { loadEnvConfig } from '@next/env';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectDir = resolve(__dirname, '..');

loadEnvConfig(projectDir);

let _db: Awaited<typeof import('./db-core')>['db'] | null = null;

async function getDb() {
  if (!_db) {
    _db = (await import('./db-core')).db;
  }
  return _db;
}

export async function initializeTables() {
  const db = await getDb();
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

    // 站点配置表:Key-Value 模式,value 为 JSONB 承载任意结构
    await db.query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        key VARCHAR(64) PRIMARY KEY,
        value JSONB NOT NULL DEFAULT '{}'::jsonb,
        description TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ Site settings table created');

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

    // 插入站点默认配置(幂等)
    await seedSiteSettings(db);

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

/**
 * 插入站点默认配置(幂等,若已存在则跳过)
 */
async function seedSiteSettings(db: any) {
  const defaults = [
    {
      key: 'site_name',
      value: '四次元资源桶',
      description: '网站名称(用于 Header logo、后台 Sidebar 品牌文字)',
    },
    {
      key: 'site_title_seo',
      value: '四次元资源桶',
      description: '浏览器标签页标题(SEO metadata.title)',
    },
    {
      key: 'site_description_seo',
      value: '资源管理与分享平台',
      description: 'SEO meta description',
    },
    {
      key: 'favicon_url',
      value: '/favicon.ico',
      description: '网站 favicon / logo 图 URL',
    },
    {
      key: 'copyright_text',
      value: '资源桶. 保留所有权利.',
      description: '底部版权文案(不含年份,年份自动追加)',
    },
    {
      key: 'copyright_year_start',
      value: 2023,
      description: '版权起始年份(若与当前年份不同,显示为 2023-2026)',
    },
    {
      key: 'social_links',
      value: [
        { platform: 'facebook', icon: 'facebook', link: 'https://facebook.com', qr_code: '', info: 'Facebook: 资源桶' },
        { platform: 'twitter', icon: 'twitter', link: 'https://twitter.com', qr_code: '', info: 'Twitter: @resourcebucket' },
        { platform: 'instagram', icon: 'instagram', link: 'https://instagram.com', qr_code: '', info: 'Instagram: @resourcebucket' },
        { platform: 'weixin', icon: 'weixin', link: 'https://weixin.qq.com', qr_code: 'https://img.4040000.xyz/file/4a858c5f6ddac6fb26b0b-f43d37bc2b71c1e230.png', info: '微信: 资源桶' },
        { platform: 'telegram', icon: 'telegram', link: 'https://t.me/resourcebucket', qr_code: '', info: 'Telegram: @resourcebucket' },
        { platform: 'qq', icon: 'qq', link: 'https://im.qq.com', qr_code: '', info: 'QQ群: 6200052' },
      ],
      description: '前台 Footer 联系方式列表',
    },
  ];

  for (const item of defaults) {
    await db.query(
      `INSERT INTO site_settings (key, value, description)
       VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (key) DO NOTHING`,
      [item.key, JSON.stringify(item.value), item.description]
    );
  }
  console.log('✓ Site settings seeded');
}

main().catch((error) => {
  console.error('Database initialization failed:', error);
  process.exit(1);
});
