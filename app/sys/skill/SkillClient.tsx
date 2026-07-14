'use client';

import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  FileCode,
  Save,
  RefreshCw,
  Loader2,
  Check,
  FileText,
  Eye,
  Code,
  Copy,
  Terminal,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SkillFile {
  name: string;
  size: number;
  mtime: string;
  lineCount: number;
  preview: string;
  exists?: boolean;
}

// 给 Agent 的安装提示词
const INSTALL_PROMPT = `请安装并加载"四次元资源桶后台管理"Skill。

## Skill 信息
- 名称:records-admin
- 功能:通过本后台 API 管理分类树、资源条目、首页列表
- 入口文件:SKILL.md

## 安装步骤
1. 从项目根目录读取 SKILL.md 文件内容(若不存在,通过 GET /api/skill/file?name=SKILL.md 获取默认模板)
2. 将该文件注册为你的 skill 上下文,后续涉及分类/资源/列表管理时优先参考其接口契约
3. 确保持有有效的 token cookie(登录后台获取 JWT),所有写操作需携带 Content-Type: application/json
4. 安装完成后回复"Skill records-admin 已就绪",并简要列出你可执行的 3 类操作(分类/资源/列表)

## 覆盖能力
- 分类管理:GET/POST/PUT/DELETE/PATCH /api/categories(含拖拽层级)
- 资源管理:GET/POST/PUT/DELETE /api/resources(写操作记录 change_logs,待同步 GitHub)
- 列表管理:GET /api/list + GET/POST /api/list/override(推荐/热门/最新/置顶)

请开始安装。`;

export default function SkillClient() {
  const { toast } = useToast();
  const [files, setFiles] = useState<SkillFile[]>([]);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingFile, setLoadingFile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('preview');

  const loadList = async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/skill');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFiles(data.files || []);
      if (data.files?.length > 0 && !selectedName) {
        selectFile(data.files[0].name);
      }
    } catch (e) {
      toast({ title: '加载失败', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoadingList(false);
    }
  };

  const selectFile = async (name: string) => {
    if (dirty && !confirm('当前文件未保存,是否切换?')) return;
    setSelectedName(name);
    setLoadingFile(true);
    try {
      const res = await fetch(`/api/skill/file?name=${encodeURIComponent(name)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setContent(data.content || '');
      setOriginalContent(data.content || '');
      setDirty(false);
      // SKILL.md 默认用预览模式,其他文件用编辑模式
      setViewMode(name === 'SKILL.md' ? 'preview' : 'edit');
    } catch (e) {
      toast({ title: '读取失败', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoadingFile(false);
    }
  };

  const handleSave = async () => {
    if (!selectedName) return;
    setSaving(true);
    try {
      const res = await fetch('/api/skill', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selectedName, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOriginalContent(content);
      setDirty(false);
      toast({ title: '保存成功', description: `${selectedName} · ${content.length} 字节` });
      loadList();
    } catch (e) {
      toast({ title: '保存失败', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const copyInstallPrompt = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_PROMPT);
      toast({ title: '已复制', description: '粘贴给 AI Agent 即可自动安装本 Skill' });
    } catch {
      toast({ title: '复制失败', description: '请手动选择文本复制', variant: 'destructive' });
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  const onContentChange = (v: string) => {
    setContent(v);
    setDirty(v !== originalContent);
  };

  const selectedFile = files.find((f) => f.name === selectedName);

  return (
    <div className="flex min-h-full h-auto">
      {/* 子侧边栏:文件列表 */}
      <aside
        style={{
          width: 260,
          flexShrink: 0,
          borderRight: '1px solid hsl(var(--border))',
          background: 'hsl(var(--card))',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1.25rem 1rem 0.875rem' }}>
          <Sparkles size={18} aria-hidden="true" style={{ color: 'hsl(var(--muted-foreground))' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', flex: 1 }}>
            Skill 文件
          </span>
          <button
            type="button"
            onClick={loadList}
            aria-label="刷新"
            title="刷新"
            style={iconBtnStyle}
          >
            <RefreshCw size={13} className={loadingList ? 'animate-spin' : ''} aria-hidden="true" />
          </button>
        </div>
        <div style={{ padding: '0 0.75rem 0.75rem' }}>
          <div style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: 'hsl(var(--muted))', fontSize: '0.6875rem', color: 'hsl(var(--muted-foreground))', display: 'flex', justifyContent: 'space-between' }}>
            <span>文件总数</span>
            <span style={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}>{files.length}</span>
          </div>
        </div>
        <nav style={{ flex: 1, overflowY: 'auto', padding: '0 0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {loadingList ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
              <Loader2 size={16} className="animate-spin" style={{ margin: '0 auto' }} />
            </div>
          ) : files.length === 0 ? (
            <div style={{ padding: '1.5rem 0.75rem', textAlign: 'center', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
              暂无文件
            </div>
          ) : (
            files.map((f) => {
              const active = f.name === selectedName;
              return (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => selectFile(f.name)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    padding: '0.625rem 0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid',
                    borderColor: active ? 'hsl(var(--border))' : 'transparent',
                    background: active ? 'hsl(var(--secondary))' : 'transparent',
                    color: active ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileCode size={14} aria-hidden="true" style={{ flexShrink: 0, color: active ? '#9333ea' : undefined }} />
                    <span style={{ fontSize: '0.8125rem', fontWeight: active ? 600 : 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.name}
                    </span>
                    {f.exists === false && (
                      <span style={{ fontSize: '0.5625rem', fontWeight: 600, padding: '0.0625rem 0.375rem', borderRadius: '0.625rem', background: '#9333ea1a', color: '#9333ea', flexShrink: 0 }}>
                        默认
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.625rem', color: 'hsl(var(--muted-foreground))', paddingLeft: 18 }}>
                    {f.exists === false ? '尚未保存 · 点击编辑' : `${f.lineCount} 行 · ${(f.size / 1024).toFixed(1)} KB`}
                  </span>
                </button>
              );
            })
          )}
        </nav>
      </aside>

      {/* 主面板 */}
      <main className="flex-grow flex flex-col" style={{ minWidth: 0 }}>
        {/* 安装说明卡片 */}
        <InstallGuide onCopyPrompt={copyInstallPrompt} />

        {/* 编辑器工具栏 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.875rem 1.5rem',
            borderBottom: '1px solid hsl(var(--border))',
            background: 'hsl(var(--card))',
            flexShrink: 0,
          }}
        >
          <FileText size={18} aria-hidden="true" style={{ color: '#9333ea' }} />
          <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'hsl(var(--foreground))' }}>
            {selectedName || '未选择文件'}
          </span>
          {selectedFile && (
            <span style={{ fontSize: '0.6875rem', color: 'hsl(var(--muted-foreground))' }}>
              · {selectedFile.lineCount} 行 · {(selectedFile.size / 1024).toFixed(1)} KB · 修改于 {new Date(selectedFile.mtime).toLocaleString('zh-CN')}
            </span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {dirty && (
              <span style={{ fontSize: '0.6875rem', color: 'hsl(var(--destructive))', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'hsl(var(--destructive))' }} />
                未保存
              </span>
            )}
            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'edit' ? 'preview' : 'edit')}
              aria-label="切换视图"
              title={viewMode === 'edit' ? '切到预览' : '切到编辑'}
              style={iconBtnStyle}
            >
              {viewMode === 'edit' ? <Eye size={14} aria-hidden="true" /> : <Code size={14} aria-hidden="true" />}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!selectedName || saving || !dirty}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.4375rem 0.875rem',
                borderRadius: '0.375rem',
                border: 'none',
                background: dirty ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                color: dirty ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
                fontSize: '0.8125rem',
                fontWeight: 500,
                cursor: dirty && !saving ? 'pointer' : 'not-allowed',
              }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : dirty ? <Save size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>

        {/* 内容区:编辑/预览切换 */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {loadingFile ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--muted-foreground))' }}>
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : selectedName ? (
            viewMode === 'edit' ? (
              <textarea
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                spellCheck={false}
                style={{
                  flex: 1,
                  padding: '1.5rem',
                  border: 'none',
                  outline: 'none',
                  background: 'hsl(var(--background))',
                  color: 'hsl(var(--foreground))',
                  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                  fontSize: '0.8125rem',
                  lineHeight: 1.7,
                  resize: 'none',
                  tabSize: 2,
                  whiteSpace: 'pre',
                  overflow: 'auto',
                }}
                placeholder="选择左侧文件开始编辑..."
              />
            ) : (
              <div
                style={{
                  flex: 1,
                  overflow: 'auto',
                  padding: '1.5rem 2rem',
                  background: 'hsl(var(--background))',
                }}
              >
                <MarkdownPreview content={content} />
              </div>
            )
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--muted-foreground))', gap: '0.75rem', padding: '2rem' }}>
              <FileCode size={28} aria-hidden="true" />
              <span style={{ fontSize: '0.875rem' }}>从左侧选择一个 Skill 文件进行查看</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// 安装说明卡片:复制提示词给 Agent
function InstallGuide({ onCopyPrompt }: { onCopyPrompt: () => void }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--muted) / 0.3)' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.75rem 1.5rem', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
      >
        <Terminal size={16} aria-hidden="true" style={{ color: '#9333ea', flexShrink: 0 }} />
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'hsl(var(--foreground))', flex: 1 }}>
          安装到 AI Agent
        </span>
        <span style={{ fontSize: '0.6875rem', color: 'hsl(var(--muted-foreground))' }}>{open ? '收起' : '展开'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))', lineHeight: 1.6 }}>
            复制下方提示词,粘贴给你的 AI Agent(如 TRAE / Claude / Cursor),Agent 会自动读取 <code style={{ fontSize: '0.75rem', background: 'hsl(var(--muted))', padding: '0 0.25rem', borderRadius: '0.25rem' }}>SKILL.md</code> 并完成安装,之后即可通过本后台 API 管理分类、资源、列表。
          </p>
          <button
            type="button"
            onClick={onCopyPrompt}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: '#9333ea',
              color: '#fff',
              fontSize: '0.8125rem',
              fontWeight: 500,
              cursor: 'pointer',
              alignSelf: 'flex-start',
            }}
          >
            <Copy size={14} aria-hidden="true" />
            复制安装提示词
          </button>
        </div>
      )}
    </div>
  );
}

// 简易 Markdown 预览组件
function MarkdownPreview({ content }: { content: string }) {
  const html = renderMarkdown(content);
  return (
    <div
      className="sys-md-preview"
      style={{ maxWidth: '48rem', color: 'hsl(var(--foreground))', fontSize: '0.875rem', lineHeight: 1.7 }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// 极简 markdown 渲染:标题、代码块、行内代码、列表、加粗、链接
function renderMarkdown(md: string): string {
  // 先转义 HTML
  let s = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // 代码块 ```lang ... ```
  s = s.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, code) => {
    return `<pre style="background:hsl(var(--muted));border:1px solid hsl(var(--border));border-radius:0.5rem;padding:0.875rem 1rem;overflow:auto;margin:0.75rem 0;"><code style="font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:0.8125rem;color:hsl(var(--foreground));white-space:pre;">${code.replace(/\n$/, '')}</code></pre>`;
  });

  // 按行处理
  const lines = s.split('\n');
  const out: string[] = [];
  let inList = false;
  for (const line of lines) {
    // 标题
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      if (inList) { out.push('</ul>'); inList = false; }
      const level = h[1].length;
      const sizes = ['1.5rem', '1.3125rem', '1.125rem', '1rem', '0.9375rem', '0.875rem'];
      out.push(`<h${level} style="font-weight:600;margin:1.25rem 0 0.625rem;color:hsl(var(--foreground));font-size:${sizes[level - 1]};letter-spacing:-0.01em;">${inlineFmt(h[2])}</h${level}>`);
      continue;
    }
    // 无序列表
    const li = line.match(/^[-*]\s+(.*)$/);
    if (li) {
      if (!inList) { out.push('<ul style="margin:0.5rem 0;padding-left:1.25rem;display:flex;flex-direction:column;gap:0.25rem;">'); inList = true; }
      out.push(`<li style="color:hsl(var(--foreground));">${inlineFmt(li[1])}</li>`);
      continue;
    }
    // 有序列表
    const ol = line.match(/^\d+\.\s+(.*)$/);
    if (ol) {
      if (!inList) { out.push('<ol style="margin:0.5rem 0;padding-left:1.5rem;display:flex;flex-direction:column;gap:0.25rem;">'); inList = true; }
      out.push(`<li style="color:hsl(var(--foreground));">${inlineFmt(ol[1])}</li>`);
      continue;
    }
    if (inList) { out.push('</ul>'); inList = false; }
    // 空行
    if (line.trim() === '') {
      out.push('<div style="height:0.5rem;"></div>');
      continue;
    }
    // 段落
    out.push(`<p style="margin:0.5rem 0;color:hsl(var(--foreground));">${inlineFmt(line)}</p>`);
  }
  if (inList) out.push('</ul>');
  return out.join('');
}

// 行内格式:加粗、行内代码、链接
function inlineFmt(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:hsl(var(--foreground));font-weight:600;">$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="background:hsl(var(--muted));padding:0.0625rem 0.375rem;border-radius:0.25rem;font-family:ui-monospace,monospace;font-size:0.8125rem;color:hsl(var(--foreground));">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#9333ea;text-decoration:underline;">$1</a>');
}

const iconBtnStyle: React.CSSProperties = {
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
};
