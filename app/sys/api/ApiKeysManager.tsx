'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, Plus, Trash2, Copy, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface CreatedKey {
  plaintext: string;
  meta: ApiKeyItem;
}

export default function ApiKeysManager() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<CreatedKey | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/apikeys');
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      setKeys(data.keys || []);
    } catch (e) {
      toast({ title: '加载失败', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      toast({ title: '请输入名称', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/apikeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '签发失败');
      setJustCreated({ plaintext: data.key, meta: data.meta });
      setNewName('');
      await loadKeys();
      toast({ title: '签发成功', description: '请立即复制保存,明文仅显示一次' });
    } catch (e) {
      toast({ title: '签发失败', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string, name: string) => {
    if (!confirm(`确定吊销 API Key "${name}"?此操作不可撤销,该 Key 将立即失效。`)) return;
    setRevokingId(id);
    try {
      const res = await fetch('/api/apikeys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '吊销失败');
      await loadKeys();
      toast({ title: '已吊销', description: name });
    } catch (e) {
      toast({ title: '吊销失败', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setRevokingId(null);
    }
  };

  const handleCopyPlaintext = async () => {
    if (!justCreated) return;
    try {
      await navigator.clipboard.writeText(justCreated.plaintext);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast({ title: '已复制' });
    } catch {
      toast({ title: '复制失败', variant: 'destructive' });
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '从未使用';
    try {
      const d = new Date(iso);
      return d.toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
      {/* 签发表单 */}
      <div
        style={{
          padding: '1rem',
          border: '1px solid hsl(var(--border))',
          borderRadius: '0.625rem',
          background: 'hsl(var(--card))',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
          <Plus size={16} aria-hidden="true" style={{ color: 'hsl(var(--primary))' }} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>签发新 API Key</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Key 名称,如:数据同步脚本 / CI 部署"
            maxLength={100}
            style={{
              flex: 1,
              minWidth: 200,
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid hsl(var(--border))',
              background: 'hsl(var(--background))',
              color: 'hsl(var(--foreground))',
              fontSize: '0.875rem',
              outline: 'none',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
            }}
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: creating ? 'not-allowed' : 'pointer',
              opacity: creating ? 0.6 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
            }}
          >
            {creating ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <KeyRound size={14} aria-hidden="true" />}
            签发
          </button>
        </div>
      </div>

      {/* 刚签发的明文(只显示一次) */}
      {justCreated && (
        <div
          style={{
            padding: '1rem',
            border: '1px solid #16a34a',
            background: '#16a34a1a',
            borderRadius: '0.625rem',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <AlertCircle size={16} aria-hidden="true" style={{ color: '#16a34a' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#16a34a' }}>
              请立即复制保存,明文仅显示一次
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <code
              style={{
                flex: 1,
                minWidth: 0,
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                background: 'hsl(var(--card))',
                fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                fontSize: '0.8125rem',
                color: 'hsl(var(--foreground))',
                wordBreak: 'break-all',
                border: '1px solid hsl(var(--border))',
              }}
            >
              {justCreated.plaintext}
            </code>
            <button
              type="button"
              onClick={handleCopyPlaintext}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--card))',
                color: 'hsl(var(--foreground))',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                flexShrink: 0,
              }}
            >
              {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
              {copied ? '已复制' : '复制'}
            </button>
            <button
              type="button"
              onClick={() => setJustCreated(null)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--card))',
                color: 'hsl(var(--muted-foreground))',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              我已保存
            </button>
          </div>
        </div>
      )}

      {/* Key 列表 */}
      <div
        style={{
          border: '1px solid hsl(var(--border))',
          borderRadius: '0.625rem',
          background: 'hsl(var(--card))',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '0.75rem 1rem',
            borderBottom: '1px solid hsl(var(--border))',
            background: 'hsl(var(--muted) / 0.4)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'hsl(var(--muted-foreground))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>已签发 Key({keys.length})</span>
          <span style={{ fontSize: '0.6875rem', fontWeight: 500 }}>
            第三方调用请用 <code style={{ fontFamily: 'ui-monospace, monospace' }}>X-API-Key</code> 请求头
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>
            <Loader2 size={16} className="animate-spin" aria-hidden="true" style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} />
            加载中...
          </div>
        ) : keys.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>
            暂无 API Key,在上方签发第一个
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {keys.map((k, idx) => (
              <div
                key={k.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  gap: '0.75rem',
                  padding: '0.875rem 1rem',
                  alignItems: 'center',
                  borderBottom: idx < keys.length - 1 ? '1px solid hsl(var(--border))' : 'none',
                }}
              >
                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                      {k.name}
                    </span>
                    <code
                      style={{
                        fontSize: '0.6875rem',
                        padding: '0.125rem 0.5rem',
                        borderRadius: '0.375rem',
                        background: 'hsl(var(--muted))',
                        color: 'hsl(var(--muted-foreground))',
                        fontFamily: 'ui-monospace, monospace',
                      }}
                    >
                      {k.prefix}…
                    </code>
                  </div>
                  <div
                    style={{
                      fontSize: '0.6875rem',
                      color: 'hsl(var(--muted-foreground))',
                      display: 'flex',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>创建: {formatDate(k.createdAt)}</span>
                    <span>最后使用: {formatDate(k.lastUsedAt)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevoke(k.id, k.name)}
                  disabled={revokingId === k.id}
                  style={{
                    padding: '0.375rem 0.625rem',
                    borderRadius: '0.375rem',
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--card))',
                    color: '#dc2626',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: revokingId === k.id ? 'not-allowed' : 'pointer',
                    opacity: revokingId === k.id ? 0.6 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                  aria-label={`吊销 ${k.name}`}
                >
                  {revokingId === k.id ? (
                    <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 size={12} aria-hidden="true" />
                  )}
                  吊销
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 使用说明 */}
      <div
        style={{
          marginTop: '1rem',
          padding: '0.875rem 1rem',
          borderRadius: '0.625rem',
          background: 'hsl(var(--muted) / 0.5)',
          fontSize: '0.8125rem',
          color: 'hsl(var(--muted-foreground))',
          lineHeight: 1.6,
        }}
      >
        <div style={{ fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: '0.375rem' }}>使用方式</div>
        <div>第三方服务端调用写接口时,在请求头中加入:</div>
        <pre
          style={{
            margin: '0.5rem 0',
            padding: '0.625rem 0.75rem',
            background: 'hsl(var(--card))',
            borderRadius: '0.375rem',
            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            fontSize: '0.75rem',
            color: 'hsl(var(--foreground))',
            overflowX: 'auto',
          }}
        >
{`curl -X POST https://你的域名/api/resources/abc \\
  -H 'Content-Type: application/json' \\
  -H 'X-API-Key: rak_xxxxxxxxxxxxxxxx' \\
  -d '{"name":"示例","category":"test",...}'`}
        </pre>
        <div style={{ marginTop: '0.25rem' }}>
          限速:每个 Key 每分钟 60 次请求,超限返回 429
        </div>
      </div>
    </div>
  );
}
