'use client';

import React, { useEffect, useState } from 'react';
import {
  Plug,
  Plus,
  RefreshCw,
  Loader2,
  Trash2,
  Power,
  PowerOff,
  Cable,
  ChevronDown,
  ChevronRight,
  Terminal,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface McpService {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  enabled: boolean;
  desc?: string;
  createdAt: string;
}

export default function McpClient() {
  const { toast } = useToast();
  const [services, setServices] = useState<McpService[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedName, setExpandedName] = useState<string | null>(null);
  const [editing, setEditing] = useState<McpService | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mcp');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setServices(data.services || []);
    } catch (e) {
      toast({ title: '加载失败', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleEnabled = async (svc: McpService) => {
    try {
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...svc, enabled: !svc.enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setServices(data.services);
      toast({
        title: svc.enabled ? '已停用' : '已启用',
        description: svc.name,
      });
    } catch (e) {
      toast({ title: '操作失败', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`确认删除 MCP 服务 "${name}"?`)) return;
    try {
      const res = await fetch('/api/mcp', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setServices(data.services);
      toast({ title: '已删除', description: name });
    } catch (e) {
      toast({ title: '删除失败', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const handleSave = async (svc: McpService) => {
    try {
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(svc),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setServices(data.services);
      setShowForm(false);
      setEditing(null);
      toast({ title: '已保存', description: svc.name });
    } catch (e) {
      toast({ title: '保存失败', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const enabledCount = services.filter((s) => s.enabled).length;

  return (
    <div className="flex min-h-full h-auto">
      {/* 子侧边栏 */}
      <aside
        style={{
          width: 240,
          flexShrink: 0,
          borderRight: '1px solid hsl(var(--border))',
          background: 'hsl(var(--card))',
          padding: '1.25rem 0.75rem',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0 0.75rem',
            marginBottom: '1rem',
          }}
        >
          <Plug size={18} aria-hidden="true" style={{ color: 'hsl(var(--muted-foreground))' }} />
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'hsl(var(--muted-foreground))',
              flex: 1,
            }}
          >
            MCP 服务
          </span>
          <button
            type="button"
            onClick={load}
            aria-label="刷新"
            title="刷新"
            style={{
              width: 26,
              height: 26,
              borderRadius: '0.375rem',
              border: '1px solid hsl(var(--border))',
              background: 'hsl(var(--background))',
              color: 'hsl(var(--muted-foreground))',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
          </button>
        </div>
        <div
          style={{
            padding: '0.5rem 0.75rem',
            marginBottom: '0.75rem',
            borderRadius: '0.5rem',
            background: 'hsl(var(--muted))',
            fontSize: '0.6875rem',
            color: 'hsl(var(--muted-foreground))',
            lineHeight: 1.5,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>服务总数</span>
            <span style={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}>{services.length}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
            <span>已启用</span>
            <span style={{ color: '#16a34a', fontWeight: 600 }}>{enabledCount}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setEditing(null); setShowForm(true); }}
          style={{
            width: '100%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.375rem',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.5rem',
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--secondary))',
            color: 'hsl(var(--foreground))',
            fontSize: '0.8125rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Plus size={14} aria-hidden="true" />
          添加服务
        </button>
      </aside>

      {/* 主面板 */}
      <main className="flex-grow overflow-y-auto" style={{ padding: '1.5rem 2rem' }}>
        <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
          {/* 头部 */}
          <div style={{ marginBottom: '1.25rem' }}>
            <h1
              style={{
                fontSize: '1.375rem',
                fontWeight: 600,
                color: 'hsl(var(--foreground))',
                margin: 0,
                letterSpacing: '-0.01em',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Plug size={22} aria-hidden="true" style={{ color: '#2563eb' }} />
              MCP 服务
            </h1>
            <p
              style={{
                marginTop: '0.375rem',
                fontSize: '0.8125rem',
                color: 'hsl(var(--muted-foreground))',
              }}
            >
              注册并管理控制本后台的 MCP 连接器(命令行启动方式)· {enabledCount}/{services.length} 启用中
            </p>
          </div>

          {/* 服务列表 */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'hsl(var(--muted-foreground))' }}>
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : showForm ? (
            <ServiceForm
              initial={editing}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditing(null); }}
            />
          ) : services.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3.5rem 1.5rem',
                color: 'hsl(var(--muted-foreground))',
                gap: '0.75rem',
                border: '1px dashed hsl(var(--border))',
                borderRadius: '0.75rem',
              }}
            >
              <Cable size={22} aria-hidden="true" />
              <span style={{ fontSize: '0.875rem' }}>尚未注册任何 MCP 服务</span>
              <button
                type="button"
                onClick={() => { setEditing(null); setShowForm(true); }}
                style={{
                  marginTop: '0.5rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '2rem',
                  border: 'none',
                  background: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <Plus size={14} aria-hidden="true" />
                添加第一个服务
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {services.map((svc) => {
                const expanded = expandedName === svc.name;
                return (
                  <div
                    key={svc.name}
                    style={{
                      border: '1px solid hsl(var(--border))',
                      borderLeft: `3px solid ${svc.enabled ? '#16a34a' : 'hsl(var(--muted-foreground))'}`,
                      borderRadius: '0.625rem',
                      background: 'hsl(var(--card))',
                      overflow: 'hidden',
                    }}
                  >
                    {/* 顶部 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.875rem 1rem' }}>
                      <button
                        type="button"
                        onClick={() => setExpandedName(expanded ? null : svc.name)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'inline-flex',
                          color: 'hsl(var(--muted-foreground))',
                        }}
                        aria-label={expanded ? '收起' : '展开'}
                      >
                        {expanded ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
                      </button>
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: '0.5rem',
                          background: svc.enabled ? '#16a34a1a' : 'hsl(var(--muted))',
                          color: svc.enabled ? '#16a34a' : 'hsl(var(--muted-foreground))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Terminal size={15} aria-hidden="true" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                          {svc.name}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {svc.desc || `${svc.command} ${svc.args.join(' ')}`}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          padding: '0.1875rem 0.5rem',
                          borderRadius: '0.625rem',
                          background: svc.enabled ? '#16a34a1a' : 'hsl(var(--muted))',
                          color: svc.enabled ? '#16a34a' : 'hsl(var(--muted-foreground))',
                          flexShrink: 0,
                        }}
                      >
                        {svc.enabled ? '运行中' : '已停用'}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleEnabled(svc)}
                        aria-label={svc.enabled ? '停用' : '启用'}
                        title={svc.enabled ? '停用' : '启用'}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '0.375rem',
                          border: '1px solid hsl(var(--border))',
                          background: 'hsl(var(--background))',
                          color: svc.enabled ? '#16a34a' : 'hsl(var(--muted-foreground))',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                        }}
                      >
                        {svc.enabled ? <Power size={14} aria-hidden="true" /> : <PowerOff size={14} aria-hidden="true" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(svc.name)}
                        aria-label="删除"
                        title="删除"
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '0.375rem',
                          border: '1px solid hsl(var(--border))',
                          background: 'hsl(var(--background))',
                          color: 'hsl(var(--muted-foreground))',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                        }}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                    {/* 展开详情 */}
                    {expanded && (
                      <div
                        style={{
                          borderTop: '1px solid hsl(var(--border))',
                          background: 'hsl(var(--muted) / 0.3)',
                          padding: '0.875rem 1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.625rem',
                        }}
                      >
                        <DetailRow label="启动命令" value={svc.command} mono />
                        <DetailRow label="参数" value={svc.args.length ? svc.args.join(' ') : '(无)'} mono />
                        {svc.env && Object.keys(svc.env).length > 0 && (
                          <div>
                            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))', marginBottom: '0.25rem' }}>环境变量</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              {Object.entries(svc.env).map(([k, v]) => (
                                <div key={k} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', fontFamily: 'ui-monospace, monospace' }}>
                                  <span style={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}>{k}</span>
                                  <span style={{ color: 'hsl(var(--muted-foreground))' }}>={v}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <DetailRow label="创建时间" value={new Date(svc.createdAt).toLocaleString('zh-CN')} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
      <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))', flexShrink: 0, width: 70 }}>
        {label}
      </span>
      <code
        style={{
          fontSize: '0.8125rem',
          color: 'hsl(var(--foreground))',
          fontFamily: mono ? 'ui-monospace, "SF Mono", Menlo, monospace' : 'inherit',
          wordBreak: 'break-all',
        }}
      >
        {value}
      </code>
    </div>
  );
}

function ServiceForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: McpService | null;
  onSave: (svc: McpService) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [command, setCommand] = useState(initial?.command || 'npx');
  const [argsText, setArgsText] = useState((initial?.args || []).join(' '));
  const [desc, setDesc] = useState(initial?.desc || '');
  const [envText, setEnvText] = useState(
    initial?.env ? Object.entries(initial.env).map(([k, v]) => `${k}=${v}`).join('\n') : ''
  );
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);

  const submit = () => {
    const args = argsText.trim().split(/\s+/).filter(Boolean);
    const env: Record<string, string> = {};
    envText.split('\n').forEach((line) => {
      const idx = line.indexOf('=');
      if (idx > 0) {
        env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      }
    });
    onSave({
      name: name.trim(),
      command: command.trim(),
      args,
      env: Object.keys(env).length > 0 ? env : undefined,
      enabled,
      desc: desc.trim() || undefined,
      createdAt: initial?.createdAt || new Date().toISOString(),
    });
  };

  return (
    <div
      style={{
        border: '1px solid hsl(var(--border))',
        borderRadius: '0.75rem',
        background: 'hsl(var(--card))',
        padding: '1.5rem',
        maxWidth: '40rem',
      }}
    >
      <h2 style={{ margin: '0 0 1rem', fontSize: '1.0625rem', fontWeight: 600, color: 'hsl(var(--foreground))' }}>
        {initial ? '编辑 MCP 服务' : '添加 MCP 服务'}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Field label="服务名" required>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如:filesystem"
            disabled={!!initial}
            style={inputStyle}
          />
        </Field>
        <Field label="启动命令" required>
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="例如:npx"
            style={inputStyle}
          />
        </Field>
        <Field label="参数(空格分隔)">
          <input
            value={argsText}
            onChange={(e) => setArgsText(e.target.value)}
            placeholder="例如:-y @modelcontextprotocol/server-filesystem /tmp"
            style={inputStyle}
          />
        </Field>
        <Field label="描述">
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="服务用途说明(可选)"
            style={inputStyle}
          />
        </Field>
        <Field label="环境变量(每行 KEY=VALUE)">
          <textarea
            value={envText}
            onChange={(e) => setEnvText(e.target.value)}
            placeholder={'API_KEY=xxx\nNODE_ENV=production'}
            rows={3}
            style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace', resize: 'vertical' }}
          />
        </Field>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'hsl(var(--foreground))' }}>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          启用此服务
        </label>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
            fontSize: '0.8125rem',
            cursor: 'pointer',
          }}
        >
          取消
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!name.trim() || !command.trim()}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            border: 'none',
            background: name.trim() && command.trim() ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
            color: name.trim() && command.trim() ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
            fontSize: '0.8125rem',
            fontWeight: 500,
            cursor: name.trim() && command.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          保存
        </button>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'hsl(var(--foreground))' }}>
        {label}
        {required && <span style={{ color: 'hsl(var(--destructive))', marginLeft: '0.25rem' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem',
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--background))',
  color: 'hsl(var(--foreground))',
  fontSize: '0.875rem',
  outline: 'none',
};
