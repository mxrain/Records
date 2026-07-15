import { z } from 'zod';

/**
 * 集中式 API 请求体 schema 校验
 *
 * 用法:
 *   const parsed = createResourceSchema.safeParse(body);
 *   if (!parsed.success) {
 *     return NextResponse.json({ error: '参数错误', details: parsed.error.flatten() }, { status: 400 });
 *   }
 *   // 使用 parsed.data
 */

// ========== /api/resources/[id] ==========
export const createResourceSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(200),
  images: z.array(z.string().url().max(2048)).default([]),
  tags: z.union([z.array(z.string()), z.record(z.string())]).default({}),
  source_links: z
    .record(
      z.object({
        link: z.string().max(2048),
        psw: z.string().max(200).default(''),
        size: z.string().max(100).default(''),
      })
    )
    .default({}),
  uploaded: z.number(),
  update_time: z.number(),
  introduction: z.string().max(5000).optional(),
  resource_information: z.record(z.union([z.string(), z.number()])).optional(),
  link: z.string().max(2048).optional(),
  rating: z.number().min(0).max(5).optional(),
  comments: z.number().min(0).optional(),
  download_count: z.number().min(0).optional(),
  download_limit: z.number().min(0).optional(),
  other_information: z.record(z.union([z.string(), z.number()])).optional(),
});

// PATCH 允许部分字段
export const patchResourceSchema = createResourceSchema.partial();

// ========== /api/categories ==========
const pathSegmentSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[^/<>{}\\]+$/, '路径段不能包含 / < > { } \\');

export const categoryPathSchema = z.array(pathSegmentSchema);

export const createCategorySchema = z.object({
  path: categoryPathSchema.default([]),
  name: z.string().min(1).max(100),
  icon: z.string().max(500).default(''),
  link: z.string().max(2048).default(''),
});

export const updateCategorySchema = z.object({
  path: categoryPathSchema.min(1, 'path 不能为空'),
  name: z.string().min(1).max(100),
  icon: z.string().max(500).default(''),
  link: z.string().max(2048).default(''),
});

export const deleteCategorySchema = z.object({
  path: categoryPathSchema.min(1, 'path 不能为空'),
});

export const moveCategorySchema = z.object({
  sourcePath: categoryPathSchema.min(1, 'sourcePath 不能为空'),
  targetPath: categoryPathSchema.min(1, 'targetPath 不能为空'),
  position: z.enum(['before', 'after', 'inside']),
});

// ========== /api/list/override ==========
export const listOverrideSchema = z.object({
  type: z.enum(['hot', 'latest']),
  pinned: z.array(z.string()).default([]),
  excluded: z.array(z.string()).default([]),
  limit: z.number().int().positive().max(100).default(20),
});

// ========== /api/settings/[key] ==========
export const updateSettingSchema = z.object({
  value: z.unknown(),
  description: z.string().max(500).optional(),
});

// ========== /api/github/createFile ==========
export const githubCreateFileSchema = z.object({
  path: z
    .string()
    .min(1)
    .max(500)
    .refine((p) => !p.includes('..') && !p.startsWith('/') && !/[\\]/.test(p), {
      message: '路径不能包含 .. 反斜杠 或以 / 开头',
    }),
  content: z.string().min(1),
});

// ========== /api/github/updateFile ==========
export const githubUpdateFileSchema = z.object({
  path: z
    .string()
    .min(1)
    .max(500)
    .refine((p) => !p.includes('..') && !p.startsWith('/') && !/[\\]/.test(p), {
      message: '路径不能包含 .. 反斜杠 或以 / 开头',
    }),
  content: z.string().min(1),
  sha: z.string().min(1),
  commitMessage: z.string().max(500).optional(),
});

// ========== /api/github/addResource ==========
export const githubAddResourceSchema = z.object({
  uuid: z.string().min(1).max(200),
  data: z.unknown(),
});

// ========== /api/mcp ==========
export const mcpServiceSchema = z.object({
  name: z.string().min(1).max(100),
  command: z.string().min(1).max(500),
  args: z.array(z.string()).default([]),
  env: z.record(z.string()).optional(),
  enabled: z.boolean().default(true),
  desc: z.string().max(500).optional(),
  createdAt: z.string().optional(),
});

export const deleteMcpSchema = z.object({
  name: z.string().min(1).max(100),
});

// ========== /api/skill ==========
export const skillFileSchema = z.object({
  name: z.string().min(1).max(100),
  content: z.string().max(2_000_000), // 2MB 上限
});
