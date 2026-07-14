/**
 * 三个存储服务的连通性测试脚本
 * 用法: node scripts/test-connections.mjs
 */
import pkg from '@next/env';
const { loadEnvConfig } = pkg;
import { Pool } from 'pg';
import { createClient } from 'redis';
import { S3Client, HeadBucketCommand, ListBucketsCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// 加载 .env.local
loadEnvConfig(process.cwd());

const results = { postgres: null, redis: null, r2: null };

async function testPostgres() {
  const url = process.env.DATABASE_URL;
  if (!url) return { ok: false, msg: 'DATABASE_URL 未配置' };

  const pool = new Pool({
    connectionString: url,
    max: 1,
    connectionTimeoutMillis: 10000,
  });

  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW() as now, current_database() as db, version() as v');
    client.release();

    const tablesRes = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `);

    return {
      ok: true,
      msg: `连接成功 | 数据库: ${res.rows[0].db} | 服务器时间: ${res.rows[0].now}`,
      version: res.rows[0].v.split(' ').slice(0, 2).join(' '),
      tables: tablesRes.rows.map(r => r.table_name),
    };
  } catch (e) {
    return { ok: false, msg: `连接失败: ${e.message}` };
  } finally {
    await pool.end();
  }
}

async function testRedis() {
  const url = process.env.REDIS_URL;
  if (!url) return { ok: false, msg: 'REDIS_URL 未配置' };

  const client = createClient({ url });
  client.on('error', (err) => { /* 忽略,统一在 try/catch 处理 */ });

  try {
    await client.connect();
    await client.set('test:ping', 'pong', { EX: 10 });
    const val = await client.get('test:ping');
    await client.del('test:ping');

    const info = await client.info('server');
    const versionMatch = info.match(/redis_version:([^\r\n]+)/);

    return {
      ok: val === 'pong',
      msg: val === 'pong' ? '读写测试通过' : `读写测试异常,返回值: ${val}`,
      version: versionMatch ? versionMatch[1].trim() : 'unknown',
    };
  } catch (e) {
    return { ok: false, msg: `连接失败: ${e.message}` };
  } finally {
    try { await client.disconnect(); } catch {}
  }
}

async function testR2() {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.R2_ENDPOINT;
  const bucket = process.env.R2_BUCKET || 'records';

  if (!accessKeyId || !secretAccessKey || !endpoint) {
    return { ok: false, msg: 'R2 配置缺失 (需要 R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_ENDPOINT)' };
  }

  const client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });

  let buckets = [];
  let canListBuckets = false;

  // 测试 1: 尝试列出所有 buckets(可能因权限受限而失败,R2 Token 通常只授权特定 bucket)
  try {
    const listRes = await client.send(new ListBucketsCommand({}));
    buckets = (listRes.Buckets || []).map(b => b.Name);
    canListBuckets = true;
  } catch (e) {
    // ListBuckets 失败不代表账号无效,继续做 bucket 级别测试
  }

  // 测试 2: 验证目标 bucket 是否存在且可访问
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (e) {
    return {
      ok: false,
      msg: `Bucket "${bucket}" 不存在或无权访问: ${e.message}`,
      buckets,
      canListBuckets,
    };
  }

  // 测试 3: 实际的 PUT / GET / DELETE 读写测试
  const testKey = `test/conn-test-${Date.now()}.txt`;
  const testContent = `connection-test-${Date.now()}`;
  try {
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain',
    }));

    const getRes = await client.send(new GetObjectCommand({ Bucket: bucket, Key: testKey }));
    const bodyStr = await getRes.Body?.transformToString();

    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: testKey }));

    if (bodyStr !== testContent) {
      return {
        ok: false,
        msg: `读写测试异常: 写入 "${testContent}", 读回 "${bodyStr}"`,
        buckets,
        canListBuckets,
      };
    }

    return {
      ok: true,
      msg: `Bucket "${bucket}" 可访问,PUT/GET/DELETE 读写测试通过`,
      buckets,
      canListBuckets,
    };
  } catch (e) {
    return {
      ok: false,
      msg: `Bucket 可访问但读写失败: ${e.message}`,
      buckets,
      canListBuckets,
    };
  } finally {
    client.destroy();
  }
}

async function main() {
  console.log('=== 存储服务连通性测试 ===\n');

  console.log('[1/3] 测试 PostgreSQL (Neon)...');
  results.postgres = await testPostgres();
  console.log(`  ${results.postgres.ok ? '✓' : '✗'} ${results.postgres.msg}`);
  if (results.postgres.version) console.log(`    版本: ${results.postgres.version}`);
  if (results.postgres.tables) console.log(`    表: ${results.postgres.tables.join(', ') || '(无)'}`);

  console.log('\n[2/3] 测试 Redis (Upstash)...');
  results.redis = await testRedis();
  console.log(`  ${results.redis.ok ? '✓' : '✗'} ${results.redis.msg}`);
  if (results.redis.version) console.log(`    版本: Redis ${results.redis.version}`);

  console.log('\n[3/3] 测试 Cloudflare R2...');
  results.r2 = await testR2();
  console.log(`  ${results.r2.ok ? '✓' : '✗'} ${results.r2.msg}`);
  if (results.r2.canListBuckets) {
    console.log(`    账号下 Buckets: ${results.r2.buckets.join(', ') || '(空)'}`);
  } else {
    console.log(`    ListBuckets 权限受限(仅特定 bucket 授权,属正常)`);
  }

  console.log('\n=== 总结 ===');
  const allOk = results.postgres.ok && results.redis.ok && results.r2.ok;
  console.log(`PostgreSQL: ${results.postgres.ok ? '✓ 通' : '✗ 不通'}`);
  console.log(`Redis:      ${results.redis.ok ? '✓ 通' : '✗ 不通'}`);
  console.log(`R2:         ${results.r2.ok ? '✓ 通' : '✗ 不通'}`);
  console.log(`\n${allOk ? '✓ 三个服务全部接通' : '✗ 存在未接通的服务'}`);

  process.exit(allOk ? 0 : 1);
}

main().catch(e => {
  console.error('脚本异常:', e);
  process.exit(1);
});
