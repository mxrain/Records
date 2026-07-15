import 'server-only';
import { NextResponse } from 'next/server';
import type { ZodSchema, ZodError } from 'zod';

/**
 * 用 zod schema 校验请求体,失败返回 400 响应,成功返回 parsed.data
 *
 * 用法:
 *   const parsed = validateBody(schema, body);
 *   if (parsed instanceof NextResponse) return parsed;
 *   // parsed 此时是已校验的数据
 */
export function validateBody<T>(
  schema: ZodSchema<T>,
  body: unknown
): T | NextResponse {
  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: '参数错误',
        details: (result.error as ZodError).flatten(),
      },
      { status: 400 }
    );
  }
  return result.data;
}
