import { NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

function generateToken(payload: any, expiresIn: string) {
  return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn });
}

function verifyToken(token: string) {
  try {
    jwt.verify(token, process.env.JWT_SECRET as string);
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

export async function GET(request: Request) {
  const token = cookies().get('token')?.value as string | undefined;
  if (!token) {
    return NextResponse.json({ error: 'Token不存在' }, { status: 401 });
  }
  return token && verifyToken(token)
    ? NextResponse.json({ valid: true }, { status: 200 })
    : NextResponse.json({ error: 'Token无效' }, { status: 401 });
}

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

export async function POST(request: Request) {
  const { password, token, refreshToken, turnstileToken } = await request.json();

  const turnstileValid = await verifyTurnstile(turnstileToken);
  if (!turnstileValid) {
    console.log('Turnstile验证失败，token:', turnstileToken);
    return NextResponse.json({ error: '人机验证失败' }, { status: 400 });
  }

  if (refreshToken) {
    try {
      jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET as string);
      const payload = jwt.decode(refreshToken) as any;
      const newToken = generateToken({ userId: payload.userId }, '7d');
      return NextResponse.json({ success: true, token: newToken }, { status: 200 });
    } catch (error) {
      return NextResponse.json({ error: 'RefreshToken无效' }, { status: 401 });
    }
  }

  if (token) {
    if (verifyToken(token)) {
      const newToken = generateToken({ timestamp: Date.now() }, '7d');
      return NextResponse.json({ success: true, token: newToken }, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Token无效' }, { status: 401 });
    }
  }

  if (password !== process.env.VERIFY_PASSWORD) {
    console.log('密码验证失败，输入密码:', password, '存储密码:', process.env.VERIFY_PASSWORD);
    return NextResponse.json({ 
      error: '密码错误',
      hint: '请检查环境变量VERIFY_PASSWORD是否包含正确的密码'
    }, { status: 400 });
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
      const payload = { timestamp: Date.now() };
      const token = generateToken(payload, '7d');
      const refreshToken = generateToken(payload, '30d');
      cookies().set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7天
      });
      cookies().set('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30天
      });
      return NextResponse.json({ success: true, token, refreshToken }, { status: 200 });
    } else {
      return NextResponse.json({ error: '验证失败' }, { status: 400 });
    }
  } else {
    const payload = { timestamp: Date.now() };
    const token = generateToken(payload, '7d');
    const refreshToken = generateToken(payload, '30d');
    cookies().set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7天
      });
      cookies().set('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30天
      });
    return NextResponse.json({ success: true, token, refreshToken }, { status: 200 });
  }
}
