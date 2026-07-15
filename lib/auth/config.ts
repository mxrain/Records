import 'server-only';

// 配置接口定义
export interface AuthConfig {
  enabled: boolean
  strategies: {
    password?: {
      enabled: boolean
      envKey: string
    }
    turnstile?: {
      enabled: boolean
      siteKey: string
      secretKey: string
    }
    oauth?: Array<{
      provider: string
      enabled: boolean
      clientId: string
      clientSecret: string
    }>
  }
  paths: {
    protected: string[]
    public: string[]
    redirectTo: string
  }
  tokens: {
    access: {
      expires: string
      cookieName: string
      secure: boolean
    }
    refresh: {
      expires: string
      cookieName: string
      secure: boolean
    }
  }
}

// 环境变量加载器
function loadEnv(key: string, defaultValue?: any) {
  const value = process.env[`AUTH_${key}`] ?? defaultValue
  if (value === 'true') return true
  if (value === 'false') return false
  return value
}

// 默认配置
export const defaultAuthConfig: AuthConfig = {
  enabled: loadEnv('ENABLED', true),
  strategies: {
    password: {
      enabled: loadEnv('PASSWORD_ENABLED', true),
      envKey: loadEnv('PASSWORD_ENV_KEY', 'ADMIN_PASSWORD')
    },
    turnstile: {
      enabled: loadEnv('TURNSTILE_ENABLED', process.env.NODE_ENV === 'production'),
      siteKey: loadEnv('TURNSTILE_SITE_KEY', ''),
      secretKey: loadEnv('TURNSTILE_SECRET_KEY', '')
    }
  },
  paths: {
    protected: ['/sys', '/admin'],
    public: ['/verify', '/login'],
    redirectTo: '/verify'
  },
  tokens: {
    access: {
      expires: '7d',
      cookieName: 'token',
      secure: process.env.NODE_ENV === 'production'
    },
    refresh: {
      expires: '30d',
      cookieName: 'refreshToken',
      secure: process.env.NODE_ENV === 'production'
    }
  }
}

// 配置验证
export function validateAuthConfig(config: AuthConfig) {
  if (config.enabled && config.strategies.password?.enabled) {
    if (!process.env[config.strategies.password.envKey]) {
      throw new Error('密码验证已启用但未设置管理员密码')
    }
  }
  
  if (config.strategies.turnstile?.enabled) {
    if (!config.strategies.turnstile.siteKey || !config.strategies.turnstile.secretKey) {
      throw new Error('Turnstile已启用但未配置siteKey和secretKey')
    }
  }
}
