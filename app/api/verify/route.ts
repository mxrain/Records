// 导入必要的模块
import { NextResponse } from 'next/server';
// JWT相关功能
import * as jwt from 'jsonwebtoken';
// Cookie操作
import { cookies } from 'next/headers';

// JWT payload 类型定义
interface TokenPayload {
  userId?: string;
  timestamp?: number;
}

/**
 * 获取 JWT Secret，如果未配置则抛出错误
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET 环境变量未配置');
  }
  return secret;
}

/**
 * 获取 JWT Refresh Secret
 */
function getJwtRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET 环境变量未配置');
  }
  return secret;
}

/**
 * 获取允许的 CORS 来源
 */
function getAllowedOrigin(request: Request): string {
  const origin = request.headers.get('origin');
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

  // 开发环境允许 localhost
  if (process.env.NODE_ENV === 'development') {
    if (origin?.includes('localhost') || origin?.includes('127.0.0.1')) {
      return origin;
    }
  }

  // 检查是否在允许列表中
  if (origin && allowedOrigins.includes(origin)) {
    return origin;
  }

  // 默认返回第一个允许的来源或空字符串
  return allowedOrigins[0] || '';
}

/**
 * 生成JWT Token
 * @param payload 负载数据
 * @param expiresIn 过期时间
 * @returns JWT Token字符串
 */
function generateToken(payload: TokenPayload, expiresIn: string) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: expiresIn as any }); // 生成Token
}

/**
 * 验证JWT Token有效性
 * @param token 要验证的Token
 * @returns 是否有效
 */
function verifyToken(token: string) {
  try {
    jwt.verify(token, getJwtSecret());  // 验证Token
    return true;
  } catch {
    return false;
  }
}

/**
 * GET请求处理 - 验证Token有效性
 * @param request 请求对象
 * @returns 验证结果
 */
export async function GET(request: Request) {
  // 从cookie中获取token
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value as string | undefined;
  
  // 检查token是否存在
  if (!token) {
    // 返回401未授权错误
    return NextResponse.json({ error: 'Token不存在' }, { status: 401 });
  }
  
  // 验证token有效性并返回结果
  return token && verifyToken(token)
    ? NextResponse.json({ valid: true }, { status: 200 })  // 验证成功
    : NextResponse.json({ error: 'Token无效' }, { status: 401 });  // 验证失败
}

/**
 * 验证Turnstile人机验证结果
 * @param token Turnstile验证token
 * @returns 验证是否通过
 */
async function verifyTurnstile(token: string | null): Promise<boolean> {  
  if (!token) {
    return false;
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    console.error('TURNSTILE_SECRET_KEY is not defined in environment variables.');
    return false;
  }

  const formData = new FormData();
  formData.append('secret', secretKey);
  formData.append('response', token);

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Error verifying Turnstile token:', error);
    return false;
  }
}

/**
 * OPTIONS请求处理 - CORS预检请求
 * @param request 请求对象
 * @returns 空响应
 */
export async function OPTIONS(request: Request) {
  const allowedOrigin = getAllowedOrigin(request);
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

/**
 * POST请求处理 - 主要验证逻辑
 * 支持三种验证方式:
 * 1. 密码验证
 * 2. Token验证
 * 3. RefreshToken验证
 * @param request 请求对象
 * @returns 验证结果
 */
export async function POST(request: Request) {
  let password, token, refreshToken;
  try {
    // 从请求体中解析参数
    const { 
      password: reqPassword,  // 密码参数
      token: reqToken,        // token参数
      refreshToken: reqRefreshToken,  // refreshToken参数
      turnstileToken          // 人机验证token
    } = await request.json();
    
    // 赋值给局部变量
    password = reqPassword;
    token = reqToken;
    refreshToken = reqRefreshToken;

    // 开发环境跳过 Turnstile 人机验证
    const isTurnstileEnabled = process.env.NODE_ENV === 'production';

    // 检查是否提供了人机验证token（仅生产环境要求）
    if (isTurnstileEnabled) {
      if (!turnstileToken) {
        // 返回400错误，缺少必要参数
        return NextResponse.json({ error: '缺少 turnstileToken 参数' }, { status: 400 });
      }

      // 验证人机验证token
      const turnstileValid = await verifyTurnstile(turnstileToken);
      if (!turnstileValid) {
        console.log('Turnstile验证失败，token:', turnstileToken);
        // 返回400错误，人机验证失败
        return NextResponse.json({ error: '人机验证失败' }, { status: 400 });
      }
    }

    // 处理refreshToken验证
    if (refreshToken) {
      try {
        // 验证refreshToken有效性
        jwt.verify(refreshToken, getJwtRefreshSecret());
        // 解码refreshToken获取payload
        const payload = jwt.decode(refreshToken) as TokenPayload | null;
        // 生成新的token
        const newToken = generateToken({ userId: payload?.userId }, '7d');
        // 返回新token
        return NextResponse.json({ success: true, token: newToken }, { status: 200 });
      } catch {
        // refreshToken验证失败
        return NextResponse.json({ error: 'RefreshToken无效' }, { status: 401 });
      }
    } 
    // 处理token验证
    else if (token) {
      if (verifyToken(token)) {
        // token验证通过，生成新token
        const newToken = generateToken({ timestamp: Date.now() }, '7d');
        return NextResponse.json({ success: true, token: newToken }, { status: 200 });
      } else {
        // token验证失败
        return NextResponse.json({ error: 'Token无效' }, { status: 401 });
      }
    } 
    // 处理密码验证
    else if (password) {
      const passwordEnvKey = process.env.AUTH_PASSWORD_ENV_KEY || 'ADMIN_PASSWORD';
      if (password !== process.env[passwordEnvKey]) {
        // 密码不匹配，不泄露环境变量信息
        return NextResponse.json({
          error: '密码错误'
        }, { status: 400 });
      }
    } 
    // 没有提供任何验证参数
    else {
      return NextResponse.json({ error: '缺少 password, token 或 refreshToken 参数' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: '无效的请求体' }, { status: 400 });
  }

  if (process.env.ENABLE_GITHUB_VERIFY === 'true') {
    const githubApi = process.env.GITHUB_TOKEN;
    const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER;
    const repo = process.env.NEXT_PUBLIC_GITHUB_REPO;
    if (!githubApi || !owner || !repo) {
      return NextResponse.json({ error: '缺少必要的环境变量' }, { status: 400 });
    }

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { Authorization: `token ${githubApi}` },
    });

    if (response.ok) {
      // 创建token payload
      const payload = { timestamp: Date.now() };
      // 生成7天有效期的token
      const token = generateToken(payload, '7d');
      // 生成30天有效期的refreshToken
      const refreshToken = generateToken(payload, '30d');
      
      const cookieStore = await cookies();
      // 设置token cookie
      cookieStore.set('token', token, {
        httpOnly: true,  // 防止XSS攻击
        secure: process.env.NODE_ENV === 'production',  // 生产环境启用HTTPS
        sameSite: 'strict',  // 防止CSRF攻击
        path: '/',  // 全站有效
        maxAge: 7 * 24 * 60 * 60, // 7天有效期(秒)
      });
      
      // 设置refreshToken cookie
      cookieStore.set('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30天有效期(秒)
      });
      
      // 返回成功响应和token
      return NextResponse.json({ success: true, token, refreshToken }, { status: 200 });
    } else {
      return NextResponse.json({ error: '验证失败' }, { status: 400 });
    }
  } else {
    const payload = { timestamp: Date.now() };
    const token = generateToken(payload, '7d');
    const refreshToken = generateToken(payload, '30d');
    const cookieStore = await cookies();
    cookieStore.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7天
      });
      cookieStore.set('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30天
      });
    return NextResponse.json({ success: true, token, refreshToken }, { status: 200 });
  }
}
