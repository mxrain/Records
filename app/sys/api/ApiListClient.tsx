'use client';

import React, { useMemo, useState } from 'react';
import {
  Code2,
  Search,
  Copy,
  Check,
  ExternalLink,
  Globe,
  Settings2,
  Github,
  ShieldCheck,
  ChevronDown,
  KeyRound,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ApiSide, ApiRouteInfo, ApiParam } from './page';
import ApiKeysManager from './ApiKeysManager';

const METHOD_COLORS: Record<string, { bg: string; fg: string }> = {
  GET: { bg: '#16a34a1a', fg: '#16a34a' },
  POST: { bg: '#2563eb1a', fg: '#2563eb' },
  PUT: { bg: '#d977061a', fg: '#d97706' },
  DELETE: { bg: '#dc26261a', fg: '#dc2626' },
  PATCH: { bg: '#9333ea1a', fg: '#9333ea' },
};

// side 元信息
const SIDE_META: Record<ApiSide, { label: string; icon: React.ElementType; color: string; desc: string }> = {
  frontend: { label: '前台 API', icon: Globe, color: '#16a34a', desc: '前台页面调用,以读取为主' },
  backend: { label: '后台 API', icon: Settings2, color: '#2563eb', desc: '后台管理使用,需登录鉴权' },
  github: { label: 'GitHub 集成', icon: Github, color: '#6b7280', desc: '与 GitHub 仓库交互' },
  auth: { label: '身份认证', icon: ShieldCheck, color: '#9333ea', desc: '登录与鉴权' },
};

const SIDE_ORDER: ApiSide[] = ['frontend', 'backend', 'github', 'auth'];

export default function ApiListClient({ routes }: { routes: ApiRouteInfo[] }) {
  const [activeTab, setActiveTab] = useState<'docs' | 'apikeys'>('docs');
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<string | 'ALL'>('ALL');
  const [sideFilter, setSideFilter] = useState<ApiSide | 'ALL'>('ALL');
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();

  // 过滤
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return routes.filter((r) => {
      if (sideFilter !== 'ALL' && r.side !== sideFilter) return false;
      if (methodFilter !== 'ALL' && !r.methods.includes(methodFilter)) return false;
      if (!q) return true;
      return (
        r.path.toLowerCase().includes(q) ||
        r.desc.toLowerCase().includes(q) ||
        r.file.toLowerCase().includes(q) ||
        r.effect.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    });
  }, [routes, search, methodFilter, sideFilter]);

  // 统计
  const sideCounts = useMemo(() => {
    const counts: Record<string, number> = { frontend: 0, backend: 0, github: 0, auth: 0 };
    routes.forEach((r) => { counts[r.side] = (counts[r.side] || 0) + 1; });
    return counts;
  }, [routes]);
  const methodCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    routes.forEach((r) => r.methods.forEach((m) => { counts[m] = (counts[m] || 0) + 1; }));
    return counts;
  }, [routes]);

  // 按 side → category 二级分组
  const grouped = useMemo(() => {
    const map: Record<string, { category: string; items: ApiRouteInfo[] }[]> = {};
    SIDE_ORDER.forEach((s) => { map[s] = []; });
    filtered.forEach((r) => {
      let catGroup = map[r.side].find((g) => g.category === r.category);
      if (!catGroup) {
        catGroup = { category: r.category, items: [] };
        map[r.side].push(catGroup);
      }
      catGroup.items.push(r);
    });
    return map;
  }, [filtered]);

  // 生成 curl
  const buildCurl = (route: ApiRouteInfo): string => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const url = `${origin}${route.path}`;
    const methods = route.methods.length > 0 ? route.methods : ['GET'];
    return methods
      .map((m) => {
        const lines: string[] = [`curl -X ${m} '${url}'`];
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(m)) {
          // 根据参数生成示例 body
          const bodyParams = (route.params || []).filter((p) => p.location === 'body');
          if (bodyParams.length > 0 || ['POST', 'PUT', 'PATCH'].includes(m)) {
            lines.push(`  -H 'Content-Type: application/json'`);
            const example = buildExampleBody(bodyParams);
            lines.push(`  -d '${example}'`);
          }
        }
        return lines.join(' \\\n  ');
      })
      .join('\n\n');
  };

  // 根据 body 参数生成示例 JSON
  const buildExampleBody = (bodyParams: ApiParam[]): string => {
    if (bodyParams.length === 0) return '{}';
    const obj: Record<string, unknown> = {};
    bodyParams.forEach((p) => {
      obj[p.name] = buildExampleValue(p);
    });
    return JSON.stringify(obj);
  };

  const buildExampleValue = (p: ApiParam): unknown => {
    const t = p.type.toLowerCase();
    if (t.includes('boolean')) return false;
    if (t.includes('number') || t.includes('int')) return 0;
    if (t.includes('array') || t.endsWith('[]')) return [];
    if (t.includes('object')) return {};
    // 特定字段名给出更有意义的示例
    const n = p.name.toLowerCase();
    if (n === 'path' || n === 'sourcepath' || n === 'targetpath') return [];
    if (n === 'name') return '示例名称';
    if (n === 'position') return 'before';
    if (n === 'icon') return 'folder';
    if (n === 'link') return 'https://example.com';
    return 'string';
  };

  const handleCopy = async (route: ApiRouteInfo) => {
    const text = buildCurl(route);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(route.path);
      toast({
        title: '已复制 curl 命令',
        description: route.methods.length > 1
          ? `${route.methods.join('/')} · ${route.path}`
          : `${route.methods[0] || 'GET'} · ${route.path}`,
      });
      setTimeout(() => setCopied(null), 1500);
    } catch (e) {
      toast({ title: '复制失败', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-full h-auto">
      <main className="overflow-y-auto" style={{ padding: '1.5rem 2rem' }}>
        {/* 顶部 Tab 切换 */}
        <div style={{ maxWidth: '56rem', margin: '0 auto 1.25rem', display: 'flex', gap: '0.25rem', borderBottom: '1px solid hsl(var(--border))' }}>
          <TabButton
            label="接口文档"
            icon={Code2}
            active={activeTab === 'docs'}
            onClick={() => setActiveTab('docs')}
          />
          <TabButton
            label="API Keys"
            icon={KeyRound}
            active={activeTab === 'apikeys'}
            onClick={() => setActiveTab('apikeys')}
          />
        </div>

        {activeTab === 'apikeys' ? (
          <ApiKeysManager />
        ) : (
        <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
          {/* 分类筛选条 */}
          <div
            style={{
              display: 'flex',
              gap: '0.375rem',
              marginBottom: '0.875rem',
              flexWrap: 'wrap',
            }}
          >
            <SideChip
              label="全部"
              count={routes.length}
              active={sideFilter === 'ALL'}
              onClick={() => setSideFilter('ALL')}
              icon={Code2}
              color="#475569"
            />
            {SIDE_ORDER.map((s) => {
              const meta = SIDE_META[s];
              return (
                <SideChip
                  key={s}
                  label={meta.label}
                  count={sideCounts[s] || 0}
                  active={sideFilter === s}
                  onClick={() => setSideFilter(s)}
                  icon={meta.icon}
                  color={meta.color}
                />
              );
            })}
          </div>

          {/* 搜索 + 方法过滤 */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <Search
                size={14}
                aria-hidden="true"
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="按路径、作用、文件名搜索..."
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem 0.5rem 2rem',
                  borderRadius: '0.5rem',
                  border: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--background))',
                  color: 'hsl(var(--foreground))',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'hsl(var(--primary))')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'hsl(var(--border))')}
              />
            </div>
            {/* 方法过滤 */}
            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
              <MethodChip
                label="ALL"
                count={routes.length}
                active={methodFilter === 'ALL'}
                onClick={() => setMethodFilter('ALL')}
              />
              {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => (
                <MethodChip
                  key={m}
                  label={m}
                  count={methodCounts[m] || 0}
                  active={methodFilter === m}
                  onClick={() => setMethodFilter(m)}
                  color={METHOD_COLORS[m]}
                />
              ))}
            </div>
          </div>

          {/* 分组列表 */}
          {filtered.length === 0 ? (
            <div style={emptyStateStyle}>
              <Search size={20} aria-hidden="true" />
              <span style={{ fontSize: '0.875rem' }}>未匹配到 API 路由</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {SIDE_ORDER.map((side) => {
                const cats = grouped[side];
                if (!cats || cats.length === 0) return null;
                const meta = SIDE_META[side];
                const SideIcon = meta.icon;
                const sideTotal = cats.reduce((sum, c) => sum + c.items.length, 0);
                return (
                  <section key={side}>
                    {/* side 大标题 */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.625rem',
                        paddingBottom: '0.625rem',
                        marginBottom: '0.75rem',
                        borderBottom: '2px solid',
                        borderColor: `${meta.color}40`,
                      }}
                    >
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: '0.5rem',
                          background: `${meta.color}1a`,
                          color: meta.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        aria-hidden="true"
                      >
                        <SideIcon size={16} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                            {meta.label}
                          </span>
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              padding: '0.0625rem 0.4375rem',
                              borderRadius: '0.625rem',
                              background: `${meta.color}1a`,
                              color: meta.color,
                              fontWeight: 600,
                            }}
                          >
                            {sideTotal}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.6875rem', color: 'hsl(var(--muted-foreground))' }}>
                          {meta.desc}
                        </span>
                      </div>
                    </div>

                    {/* category 小组 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {cats.map((cat) => (
                        <div key={cat.category}>
                          {/* category 小标题 */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              marginBottom: '0.5rem',
                              paddingLeft: '0.25rem',
                            }}
                          >
                            <span
                              style={{
                                width: 3,
                                height: 14,
                                background: meta.color,
                                borderRadius: 2,
                              }}
                              aria-hidden="true"
                            />
                            <span
                              style={{
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                color: 'hsl(var(--foreground))',
                              }}
                            >
                              {cat.category}
                            </span>
                            <span
                              style={{
                                fontSize: '0.6875rem',
                                color: 'hsl(var(--muted-foreground))',
                              }}
                            >
                              {cat.items.length} 个
                            </span>
                          </div>
                          {/* 路由卡片 */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {cat.items.map((route) => (
                              <RouteCard
                                key={route.file + route.path}
                                route={route}
                                copied={copied === route.path}
                                onCopy={() => handleCopy(route)}
                                accentColor={meta.color}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
        )}
      </main>
    </div>
  );
}

/* ============ Tab 切换按钮 ============ */
function TabButton({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.625rem 0.875rem',
        background: 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid hsl(var(--primary))' : '2px solid transparent',
        color: active ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
        fontSize: '0.875rem',
        fontWeight: active ? 600 : 500,
        cursor: 'pointer',
        marginBottom: '-1px',
        transition: 'all 150ms',
      }}
    >
      <Icon size={15} aria-hidden="true" />
      {label}
    </button>
  );
}

/* ============ 路由卡片 ============ */
function RouteCard({
  route,
  copied,
  onCopy,
  accentColor,
}: {
  route: ApiRouteInfo;
  copied: boolean;
  onCopy: () => void;
  accentColor: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasParams = route.params && route.params.length > 0;
  // 参数按 location 分组
  const paramsByLocation = useMemo(() => {
    const map: Record<string, ApiParam[]> = { path: [], query: [], body: [] };
    (route.params || []).forEach((p) => {
      if (map[p.location]) map[p.location].push(p);
    });
    return map;
  }, [route.params]);

  return (
    <div
      style={{
        border: '1px solid hsl(var(--border))',
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: '0.625rem',
        background: 'hsl(var(--card))',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* 顶部:可点击展开 */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          flexWrap: 'wrap',
          padding: '0.875rem 1rem',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
        }}
      >
        {/* 方法徽章 */}
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {route.methods.length === 0 ? (
            <span style={{ ...methodBadgeStyle, color: '#64748b', background: '#64748b1a' }}>
              NONE
            </span>
          ) : (
            route.methods.map((m) => {
              const c = METHOD_COLORS[m] || METHOD_COLORS.GET;
              return (
                <span key={m} style={{ ...methodBadgeStyle, color: c.fg, background: c.bg }}>
                  {m}
                </span>
              );
            })
          )}
        </div>
        {/* 路径 */}
        <code
          style={{
            fontSize: '0.875rem',
            color: 'hsl(var(--foreground))',
            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            wordBreak: 'break-all',
            flex: 1,
            minWidth: 0,
          }}
        >
          {route.path}
        </code>
        {/* 参数计数徽章 */}
        {hasParams && (
          <span
            style={{
              fontSize: '0.625rem',
              padding: '0.125rem 0.5rem',
              borderRadius: '0.625rem',
              background: 'hsl(var(--muted))',
              color: 'hsl(var(--muted-foreground))',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              flexShrink: 0,
            }}
          >
            {route.params.length} 个参数
          </span>
        )}
        {/* 展开/收起箭头 */}
        <ChevronDown
          size={16}
          aria-hidden="true"
          style={{
            color: 'hsl(var(--muted-foreground))',
            transition: 'transform 150ms',
            transform: expanded ? 'rotate(180deg)' : 'none',
            flexShrink: 0,
          }}
        />
      </button>

      {/* 操作按钮(复制 curl / 打开)— 放在顶部下方右侧,不触发展开 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.25rem',
          padding: '0 1rem',
          marginTop: '-0.25rem',
        }}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onCopy(); }}
          style={iconBtnStyle}
          aria-label="复制 curl 命令"
          title="复制 curl 命令"
        >
          {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
        </button>
        {route.methods.includes('GET') && (
          <a
            href={route.path}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...iconBtnStyle, textDecoration: 'none' }}
            aria-label="在浏览器打开"
            title="在浏览器打开(GET)"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        )}
      </div>

      {/* 作用描述 */}
      {(route.effect || route.desc) && (
        <p
          style={{
            margin: '0.5rem 1rem 0',
            fontSize: '0.8125rem',
            color: 'hsl(var(--muted-foreground))',
            lineHeight: 1.5,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.375rem',
          }}
        >
          <span
            style={{
              flexShrink: 0,
              fontSize: '0.6875rem',
              fontWeight: 600,
              color: accentColor,
              background: `${accentColor}1a`,
              padding: '0.0625rem 0.375rem',
              borderRadius: '0.25rem',
              marginTop: 1,
            }}
          >
            作用
          </span>
          <span>{route.effect || route.desc}</span>
        </p>
      )}

      {/* 文件位置 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
          fontSize: '0.75rem',
          color: 'hsl(var(--muted-foreground))',
          padding: '0.5rem 1rem',
        }}
      >
        <span style={{ opacity: 0.6 }}>app/api/</span>
        <code
          style={{
            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            color: 'hsl(var(--foreground))',
            opacity: 0.8,
          }}
        >
          {route.file}
        </code>
      </div>

      {/* 展开内容:参数详情表 */}
      {expanded && (
        <div
          style={{
            borderTop: '1px solid hsl(var(--border))',
            background: 'hsl(var(--muted) / 0.3)',
            padding: '0.875rem 1rem',
          }}
        >
          {hasParams ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: 'hsl(var(--muted-foreground))',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '-0.25rem',
                }}
              >
                参数字段
              </div>
              {(['path', 'query', 'body'] as const).map((loc) => {
                const ps = paramsByLocation[loc];
                if (!ps || ps.length === 0) return null;
                const locLabel = loc === 'path' ? '路径参数' : loc === 'query' ? 'Query 参数' : 'Body 字段';
                const locColor = loc === 'path' ? '#d97706' : loc === 'query' ? '#2563eb' : '#9333ea';
                return (
                  <div key={loc}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        marginBottom: '0.375rem',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          padding: '0.125rem 0.5rem',
                          borderRadius: '0.25rem',
                          background: `${locColor}1a`,
                          color: locColor,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {locLabel}
                      </span>
                      <span style={{ fontSize: '0.6875rem', color: 'hsl(var(--muted-foreground))' }}>
                        {ps.length} 个
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {ps.map((p) => (
                        <div
                          key={`${p.location}:${p.name}`}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(120px, auto) minmax(70px, auto) 28px 1fr',
                            alignItems: 'baseline',
                            gap: '0.625rem',
                            padding: '0.375rem 0.625rem',
                            borderRadius: '0.375rem',
                            background: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            fontSize: '0.8125rem',
                          }}
                        >
                          <code
                            style={{
                              fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                              color: 'hsl(var(--foreground))',
                              fontWeight: 600,
                            }}
                          >
                            {p.name}
                          </code>
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              color: 'hsl(var(--muted-foreground))',
                              fontFamily: 'ui-monospace, monospace',
                            }}
                          >
                            {p.type}
                          </span>
                          {p.required ? (
                            <span
                              style={{
                                fontSize: '0.625rem',
                                fontWeight: 700,
                                color: 'hsl(var(--destructive))',
                                textAlign: 'center',
                              }}
                              title="必填"
                            >
                              *
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '0.625rem',
                                color: 'hsl(var(--muted-foreground))',
                                textAlign: 'center',
                              }}
                              title="可选"
                            >
                              -
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: '0.75rem',
                              color: 'hsl(var(--muted-foreground))',
                            }}
                          >
                            {p.desc || ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '1rem',
                fontSize: '0.8125rem',
                color: 'hsl(var(--muted-foreground))',
              }}
            >
              该接口无需参数
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============ 子组件 ============ */
function MethodChip({
  label,
  count,
  active,
  onClick,
  color,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color?: { bg: string; fg: string };
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '0.3125rem 0.625rem',
        borderRadius: '0.375rem',
        border: '1px solid',
        borderColor: active ? 'hsl(var(--primary))' : 'hsl(var(--border))',
        background: active
          ? 'hsl(var(--primary))'
          : color
          ? color.bg
          : 'hsl(var(--card))',
        color: active
          ? 'hsl(var(--primary-foreground))'
          : color
          ? color.fg
          : 'hsl(var(--muted-foreground))',
        fontSize: '0.75rem',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        fontFamily: label !== 'ALL' ? 'ui-monospace, monospace' : 'inherit',
      }}
    >
      {label}
      <span
        style={{
          fontSize: '0.625rem',
          opacity: 0.8,
          padding: '0.0625rem 0.3125rem',
          borderRadius: '0.25rem',
          background: active ? 'rgba(255,255,255,0.2)' : 'hsl(var(--muted))',
        }}
      >
        {count}
      </span>
    </button>
  );
}

/* ============ 分类筛选 chip ============ */
function SideChip({
  label,
  count,
  active,
  onClick,
  icon: Icon,
  color,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.375rem 0.75rem',
        borderRadius: '0.5rem',
        border: '1px solid',
        borderColor: active ? color : 'hsl(var(--border))',
        background: active ? `${color}1a` : 'hsl(var(--card))',
        color: active ? color : 'hsl(var(--muted-foreground))',
        fontSize: '0.8125rem',
        fontWeight: active ? 600 : 500,
        cursor: 'pointer',
        transition: 'all 150ms cubic-bezier(.2,.8,.2,1)',
        lineHeight: 1.2,
      }}
    >
      <Icon size={14} aria-hidden="true" style={{ color: active ? color : 'currentColor' }} />
      <span>{label}</span>
      <span
        style={{
          fontSize: '0.6875rem',
          fontWeight: 600,
          padding: '0.0625rem 0.375rem',
          borderRadius: '0.625rem',
          background: active ? color : 'hsl(var(--muted))',
          color: active ? '#fff' : 'hsl(var(--muted-foreground))',
          flexShrink: 0,
        }}
      >
        {count}
      </span>
    </button>
  );
}

const methodBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 48,
  padding: '0.125rem 0.375rem',
  borderRadius: '0.25rem',
  fontSize: '0.6875rem',
  fontWeight: 700,
  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
  letterSpacing: '0.04em',
};

const iconBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 26,
  height: 26,
  borderRadius: '0.375rem',
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--background))',
  color: 'hsl(var(--foreground))',
  cursor: 'pointer',
  padding: 0,
};

const emptyStateStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '3rem 1.5rem',
  color: 'hsl(var(--muted-foreground))',
  gap: '0.5rem',
  border: '1px dashed hsl(var(--border))',
  borderRadius: '0.75rem',
};
