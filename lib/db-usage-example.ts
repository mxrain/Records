import { db, redis, minio, initializeDatabases, closeDatabaseConnections } from './db';

/**
 * PostgreSQL 使用示例
 */
async function postgresExample() {
  console.log('\n=== PostgreSQL Examples ===');

  // 查询示例
  const result = await db.query('SELECT * FROM users LIMIT 10');
  console.log('Users:', result.rows);

  // 插入示例
  const insertResult = await db.query(
    'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
    ['testuser', 'test@example.com', 'hashed_password']
  );
  console.log('Inserted user:', insertResult.rows[0]);

  // 更新示例
  const updateResult = await db.query(
    'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
    [insertResult.rows[0].id]
  );
  console.log('Updated user:', updateResult.rows[0]);

  // 删除示例
  const deleteResult = await db.query(
    'DELETE FROM users WHERE id = $1 RETURNING *',
    [insertResult.rows[0].id]
  );
  console.log('Deleted user:', deleteResult.rows[0]);
}

/**
 * Redis 使用示例
 */
async function redisExample() {
  console.log('\n=== Redis Examples ===');

  // 设置缓存
  await redis.set('user:1', JSON.stringify({ id: 1, name: 'John' }));
  console.log('Cache set');

  // 获取缓存
  const cached = await redis.get('user:1');
  console.log('Cache get:', cached);

  // 设置过期时间（秒）
  await redis.set('session:abc123', 'user_data', 3600);
  console.log('Cache with expiry set');

  // 检查键是否存在
  const exists = await redis.exists('user:1');
  console.log('Key exists:', exists);

  // 删除键
  await redis.del('user:1');
  console.log('Cache deleted');
}

/**
 * MinIO 使用示例
 */
async function minioExample() {
  console.log('\n=== MinIO Examples ===');

  const bucketName = 'records';

  // 上传文件
  try {
    const uploadResult = await minio.uploadFile(
      bucketName,
      'test-file.txt',
      './test-file.txt',
      { 'Content-Type': 'text/plain' }
    );
    console.log('Upload result:', uploadResult);
  } catch (error) {
    console.log('Upload failed (file may not exist):', (error as Error).message);
  }

  // 获取文件 URL
  try {
    const urlResult = await minio.getFileUrl(bucketName, 'test-file.txt', 3600);
    console.log('File URL:', urlResult.url);
  } catch (error) {
    console.log('Get URL failed:', (error as Error).message);
  }

  // 列出文件
  try {
    const listResult = await minio.listFiles(bucketName);
    console.log('Files in bucket:', listResult.files);
  } catch (error) {
    console.log('List files failed:', (error as Error).message);
  }

  // 下载文件
  try {
    const downloadResult = await minio.downloadFile(
      bucketName,
      'test-file.txt',
      './downloaded-file.txt'
    );
    console.log('Download result:', downloadResult);
  } catch (error) {
    console.log('Download failed:', (error as Error).message);
  }

  // 删除文件
  try {
    const deleteResult = await minio.deleteFile(bucketName, 'test-file.txt');
    console.log('Delete result:', deleteResult);
  } catch (error) {
    console.log('Delete failed:', (error as Error).message);
  }
}

/**
 * 综合使用示例：缓存资源数据
 */
async function cacheResourceExample() {
  console.log('\n=== Cache Resource Example ===');

  const resourceId = 1;
  const cacheKey = `resource:${resourceId}`;

  // 尝试从缓存获取
  let resource = await redis.get(cacheKey);

  if (resource) {
    console.log('✓ Resource loaded from cache');
    return JSON.parse(resource);
  }

  // 缓存未命中，从数据库获取
  console.log('✗ Cache miss, loading from database');
  const result = await db.query('SELECT * FROM resources WHERE id = $1', [resourceId]);

  if (result.rows.length > 0) {
    resource = result.rows[0];
    // 缓存数据，过期时间 1 小时
    await redis.set(cacheKey, JSON.stringify(resource), 3600);
    console.log('✓ Resource cached');
    return resource;
  }

  return null;
}

/**
 * 主函数
 */
async function main() {
  try {
    // 初始化数据库连接
    console.log('Initializing databases...');
    await initializeDatabases();

    // 运行示例
    await postgresExample();
    await redisExample();
    await minioExample();
    await cacheResourceExample();

    console.log('\n✓ All examples completed successfully');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // 关闭连接
    await closeDatabaseConnections();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

export {
  postgresExample,
  redisExample,
  minioExample,
  cacheResourceExample,
};