'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  HardDrive,
  Upload,
  RefreshCw,
  Download,
  Trash2,
  Loader2,
  Search,
  FileIcon,
  AlertCircle,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Archive,
  File,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StorageItem {
  key: string;
  size: number;
  lastModified: string;
  etag?: string;
}

// 字节大小格式化
function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

// 文件类型分类
type CatKey = 'all' | 'image' | 'video' | 'audio' | 'pdf' | 'archive' | 'text' | 'other';

interface NavItem {
  key: CatKey;
  label: string;
  icon: React.ElementType;
  color: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'all', label: '全部文件', icon: HardDrive, color: '#2563eb' },
  { key: 'image', label: '图片', icon: ImageIcon, color: '#16a34a' },
  { key: 'video', label: '视频', icon: Video, color: '#dc2626' },
  { key: 'audio', label: '音频', icon: Music, color: '#9333ea' },
  { key: 'pdf', label: 'PDF', icon: FileText, color: '#ea580c' },
  { key: 'archive', label: '压缩包', icon: Archive, color: '#0891b2' },
  { key: 'text', label: '文本', icon: FileText, color: '#475569' },
  { key: 'other', label: '其他', icon: File, color: '#64748b' },
];

function getCatKey(key: string): CatKey {
  const ext = key.split('.').pop()?.toLowerCase() || '';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'flac', 'ogg'].includes(ext)) return 'audio';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  if (['json', 'md', 'txt', 'csv', 'log'].includes(ext)) return 'text';
  return 'other';
}

const CAT_META: Record<CatKey, { color: string; label: string }> = {
  all: { color: '#2563eb', label: '文件' },
  image: { color: '#16a34a', label: '图片' },
  video: { color: '#dc2626', label: '视频' },
  audio: { color: '#9333ea', label: '音频' },
  pdf: { color: '#ea580c', label: 'PDF' },
  archive: { color: '#0891b2', label: '压缩包' },
  text: { color: '#475569', label: '文本' },
  other: { color: '#64748b', label: '文件' },
};

export default function StoragePage() {
  const [items, setItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [bucket, setBucket] = useState<string>('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<CatKey>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/storage');
      if (!res.ok) throw new Error('获取对象列表失败');
      const data = await res.json();
      setBucket(data.bucket || '');
      setItems(
        (data.files || []).sort((a: StorageItem, b: StorageItem) =>
          (b.lastModified || '').localeCompare(a.lastModified || '')
        )
      );
    } catch (e) {
      toast({ title: '错误', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    let okCount = 0;
    let failCount = 0;
    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('key', file.name);
        const res = await fetch('/api/storage', { method: 'POST', body: formData });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `上传 ${file.name} 失败`);
        }
        okCount++;
      } catch (e) {
        failCount++;
        console.error(e);
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (okCount > 0) {
      toast({ title: '上传完成', description: `成功 ${okCount} 个${failCount ? `,失败 ${failCount} 个` : ''}` });
    } else if (failCount > 0) {
      toast({ title: '上传失败', description: `${failCount} 个文件上传失败`, variant: 'destructive' });
    }
    fetchFiles();
  };

  const handleDelete = async (key: string) => {
    try {
      const res = await fetch(`/api/storage?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '删除失败');
      }
      toast({ title: '删除成功', description: key });
      setConfirmDelete(null);
      fetchFiles();
    } catch (e) {
      toast({ title: '错误', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const handleDownload = (key: string) => {
    window.open(`/api/storage/download/${key.split('/').map(encodeURIComponent).join('/')}`, '_blank');
  };

  // 按类型统计
  const catCounts = useMemo(() => {
    const counts: Record<CatKey, number> = {
      all: items.length,
      image: 0, video: 0, audio: 0, pdf: 0, archive: 0, text: 0, other: 0,
    };
    items.forEach((i) => {
      const k = getCatKey(i.key);
      counts[k]++;
    });
    return counts;
  }, [items]);

  // 过滤:类型 + 搜索
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (activeCat !== 'all' && getCatKey(i.key) !== activeCat) return false;
      if (!q) return true;
      return i.key.toLowerCase().includes(q);
    });
  }, [items, activeCat, search]);

  const totalSize = items.reduce((sum, i) => sum + (i.size || 0), 0);
  const filteredSize = filtered.reduce((sum, i) => sum + (i.size || 0), 0);

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
          <HardDrive size={18} aria-hidden="true" style={{ color: 'hsl(var(--muted-foreground))' }} />
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'hsl(var(--muted-foreground))',
            }}
          >
            对象存储
          </span>
        </div>
        {/* Bucket 信息 */}
        {bucket && (
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
              <span>Bucket</span>
              <span style={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}>{bucket}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
              <span>总用量</span>
              <span style={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}>{formatBytes(totalSize)}</span>
            </div>
          </div>
        )}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {NAV_ITEMS.map((item) => {
            const active = item.key === activeCat;
            const Icon = item.icon;
            const count = catCounts[item.key] || 0;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveCat(item.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid',
                  borderColor: active ? 'hsl(var(--border))' : 'transparent',
                  background: active ? 'hsl(var(--secondary))' : 'transparent',
                  color: active ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 150ms cubic-bezier(.2,.8,.2,1)',
                  fontSize: '0.875rem',
                  fontWeight: active ? 600 : 500,
                }}
              >
                <Icon
                  size={16}
                  className="shrink-0"
                  aria-hidden="true"
                  style={{ color: active ? item.color : undefined }}
                />
                <span style={{ flex: 1 }}>{item.label}</span>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    padding: '0.0625rem 0.375rem',
                    borderRadius: '0.625rem',
                    background: active ? item.color : 'hsl(var(--muted))',
                    color: active ? '#fff' : 'hsl(var(--muted-foreground))',
                    fontWeight: 600,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* 主面板 */}
      <main className="flex-grow overflow-y-auto" style={{ padding: '1.5rem 2rem' }}>
        <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
          {/* 头部 */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
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
                {activeCat === 'all' ? '全部文件' : NAV_ITEMS.find((n) => n.key === activeCat)?.label}
              </h1>
              <p style={{ marginTop: '0.375rem', fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))' }}>
                {filtered.length} 个对象 · {formatBytes(filteredSize)}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={fetchFiles}
                disabled={loading}
                style={btnSecondaryStyle}
                aria-label="刷新"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
                刷新
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={btnPrimaryStyle}
              >
                {uploading ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Upload size={14} aria-hidden="true" />}
                {uploading ? '上传中...' : '上传文件'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => handleUpload(e.target.files)}
              />
            </div>
          </div>

          {/* 搜索框 */}
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <Search
              size={14}
              aria-hidden="true"
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="按对象 Key 过滤..."
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

          {/* 列表 */}
          {loading ? (
            <div style={emptyStateStyle}>
              <Loader2 size={20} className="animate-spin" aria-hidden="true" />
              <span style={{ fontSize: '0.875rem' }}>加载中...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div style={emptyStateStyle}>
              <AlertCircle size={20} aria-hidden="true" />
              <span style={{ fontSize: '0.875rem' }}>
                {items.length === 0 ? '暂无对象,点击右上角上传文件' : '当前分类下无对象'}
              </span>
            </div>
          ) : (
            <div
              style={{
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.75rem',
                background: 'hsl(var(--card))',
                overflow: 'hidden',
              }}
            >
              {/* 表头 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1fr) 100px 160px 100px',
                  gap: '0.75rem',
                  padding: '0.625rem 1rem',
                  background: 'hsl(var(--muted))',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'hsl(var(--muted-foreground))',
                  borderBottom: '1px solid hsl(var(--border))',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <span>对象 Key</span>
                <span style={{ textAlign: 'right' }}>大小</span>
                <span>最后修改</span>
                <span style={{ textAlign: 'right' }}>操作</span>
              </div>
              {/* 行 */}
              {filtered.map((item) => {
                const catKey = getCatKey(item.key);
                const meta = CAT_META[catKey];
                const isConfirm = confirmDelete === item.key;
                return (
                  <div
                    key={item.key}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0,1fr) 100px 160px 100px',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderBottom: '1px solid hsl(var(--border))',
                      alignItems: 'center',
                      fontSize: '0.875rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '0.375rem',
                          background: `${meta.color}1a`,
                          color: meta.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                        aria-hidden="true"
                      >
                        <FileIcon size={14} />
                      </div>
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: 'hsl(var(--foreground))',
                        }}
                        title={item.key}
                      >
                        {item.key}
                      </span>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          color: meta.color,
                          background: `${meta.color}1a`,
                          padding: '0.0625rem 0.375rem',
                          borderRadius: '0.25rem',
                          flexShrink: 0,
                        }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <span style={{ textAlign: 'right', color: 'hsl(var(--muted-foreground))', fontVariantNumeric: 'tabular-nums' }}>
                      {formatBytes(item.size)}
                    </span>
                    <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.8125rem' }}>
                      {item.lastModified ? new Date(item.lastModified).toLocaleString('zh-CN') : '-'}
                    </span>
                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                      {isConfirm ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.key)}
                            style={{ ...iconBtnStyle, color: 'hsl(var(--destructive))', borderColor: 'hsl(var(--destructive))' }}
                            aria-label="确认删除"
                            title="确认删除"
                          >
                            <CheckIcon size={14} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(null)}
                            style={iconBtnStyle}
                            aria-label="取消"
                            title="取消"
                          >
                            <XIcon size={14} aria-hidden="true" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDownload(item.key)}
                            style={iconBtnStyle}
                            aria-label="下载"
                            title="下载"
                          >
                            <Download size={14} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(item.key)}
                            style={{ ...iconBtnStyle, color: 'hsl(var(--destructive))' }}
                            aria-label="删除"
                            title="删除"
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </div>
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

/* ============ 内联图标 ============ */
function CheckIcon({ size, ...props }: { size?: number } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function XIcon({ size, ...props }: { size?: number } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

/* ============ 样式 ============ */
const btnPrimaryStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.375rem',
  padding: '0.5rem 0.875rem',
  borderRadius: '0.5rem',
  border: 'none',
  background: 'hsl(var(--primary))',
  color: 'hsl(var(--primary-foreground))',
  fontSize: '0.8125rem',
  fontWeight: 600,
  cursor: 'pointer',
};
const btnSecondaryStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.375rem',
  padding: '0.5rem 0.875rem',
  borderRadius: '0.5rem',
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--card))',
  color: 'hsl(var(--foreground))',
  fontSize: '0.8125rem',
  fontWeight: 500,
  cursor: 'pointer',
};
const iconBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
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
