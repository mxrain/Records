import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import 'server-only';

declare global {
  var r2Client: S3Client | undefined;
}

function getR2Client(): S3Client {
  if (global.r2Client) return global.r2Client;

  if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_ENDPOINT) {
    console.warn('R2 environment variables are not fully configured');
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT || 'https://<account_id>.r2.cloudflarestorage.com',
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
    forcePathStyle: true,
  });

  if (process.env.NODE_ENV !== 'production') global.r2Client = client;

  return client;
}

export const r2 = {
  client: getR2Client(),

  async ensureBucket(bucketName: string) {
    try {
      await getR2Client().send(new HeadBucketCommand({ Bucket: bucketName }));
      return true;
    } catch {
      console.warn(`R2 bucket "${bucketName}" not found. Please create it in Cloudflare dashboard.`);
      return false;
    }
  },

  async uploadFile(bucketName: string, objectName: string, body: Buffer | Uint8Array | string, contentType?: string) {
    try {
      const client = getR2Client();
      await client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: objectName,
        Body: body,
        ContentType: contentType,
      }));
      console.log(`File uploaded to R2: ${objectName}`);
      return { success: true, objectName };
    } catch (error) {
      console.error('Error uploading file to R2:', error);
      throw error;
    }
  },

  async getFileUrl(bucketName: string, objectName: string, expiry: number = 3600) {
    try {
      const client = getR2Client();
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: objectName,
      });
      const url = await getSignedUrl(client, command, { expiresIn: expiry });
      return { success: true, url };
    } catch (error) {
      console.error('Error getting file URL from R2:', error);
      throw error;
    }
  },

  async deleteFile(bucketName: string, objectName: string) {
    try {
      const client = getR2Client();
      await client.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: objectName,
      }));
      console.log(`File deleted from R2: ${objectName}`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting file from R2:', error);
      throw error;
    }
  },

  async listFiles(bucketName: string, prefix?: string) {
    try {
      const client = getR2Client();
      const result = await client.send(new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
      }));
      return { success: true, files: result.Contents || [] };
    } catch (error) {
      console.error('Error listing files in R2:', error);
      throw error;
    }
  },

  async getFile(bucketName: string, objectName: string) {
    try {
      const client = getR2Client();
      const result = await client.send(new GetObjectCommand({
        Bucket: bucketName,
        Key: objectName,
      }));
      const body = await result.Body?.transformToByteArray();
      return {
        success: true,
        data: body ? Buffer.from(body) : null,
        contentType: result.ContentType,
        contentLength: result.ContentLength,
      };
    } catch (error) {
      console.error('Error getting file from R2:', error);
      throw error;
    }
  },
};
