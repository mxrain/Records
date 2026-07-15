'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Settings,
  Link as LinkIcon,
  Info,
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  Check,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SocialLink } from '@/lib/data/settings';

type PanelKey = 'site' | 'contact';

interface NavItem {
  key: PanelKey;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>;
  desc: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'site', label: '网站信息', icon: Info, desc: '网站标题、Logo、SEO、底部版权' },
  { key: 'contact', label: '联系方式', icon: LinkIcon, desc: '前台 Footer 社交链接、二维码、群号' },
];

// 网站信息字段
interface SiteInfoForm {
  site_name: string;
  site_title_seo: string;
  site_description_seo: string;
  favicon_url: string;
  copyright_text: string;
  copyright_year_start: number;
}

const DEFAULT_SITE_INFO: SiteInfoForm = {
  site_name: '',
  site_title_seo: '',
  site_description_seo: '',
  favicon_url: '',
  copyright_text: '',
  copyright_year_start: 2023,
};

export default function SettingsPage() {
  const [activePanel, setActivePanel] = useState<PanelKey>('site');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [siteInfo, setSiteInfo] = useState<SiteInfoForm>(DEFAULT_SITE_INFO);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const { toast } = useToast();

  // 拉取全部设置
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('获取设置失败');
      const data = await res.json();
      setSiteInfo({
        site_name: data.site_name ?? '',
        site_title_seo: data.site_title_seo ?? '',
        site_description_seo: data.site_description_seo ?? '',
        favicon_url: data.favicon_url ?? '',
        copyright_text: data.copyright_text ?? '',
        copyright_year_start: typeof data.copyright_year_start === 'number' ? data.copyright_year_start : 2023,
      });
      setSocialLinks(Array.isArray(data.social_links) ? data.social_links : []);
    } catch (e) {
      toast({ title: '错误', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // 保存网站信息
  const saveSiteInfo = async () => {
    setSaving(true);
    try {
      const keys: (keyof SiteInfoForm)[] = [
        'site_name',
        'site_title_seo',
        'site_description_seo',
        'favicon_url',
        'copyright_text',
        'copyright_year_start',
      ];
      await Promise.all(
        keys.map((k) =>
          fetch(`/api/settings/${k}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: siteInfo[k] }),
          })
        )
      );
      toast({ title: '保存成功', description: '网站信息已更新' });
    } catch (e) {
      toast({ title: '错误', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // 保存联系方式
  const saveContact = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/social_links', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: socialLinks }),
      });
      if (!res.ok) throw new Error('保存失败');
      toast({ title: '保存成功', description: '联系方式已更新' });
    } catch (e) {
      toast({ title: '错误', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // 联系方式编辑操作
  const addSocial = () => {
    setSocialLinks((prev) => [
      ...prev,
      { platform: '', icon: '', link: '', qr_code: '', info: '' },
    ]);
  };
  const updateSocial = (idx: number, field: keyof SocialLink, value: string) => {
    setSocialLinks((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };
  const removeSocial = (idx: number) => {
    setSocialLinks((prev) => prev.filter((_, i) => i !== idx));
  };
  const moveSocial = (idx: number, dir: -1 | 1) => {
    setSocialLinks((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

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
          <Settings size={18} aria-hidden="true" style={{ color: 'hsl(var(--muted-foreground))' }} />
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'hsl(var(--muted-foreground))',
            }}
          >
            设置
          </span>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {NAV_ITEMS.map((item) => {
            const active = item.key === activePanel;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActivePanel(item.key)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.625rem',
                  padding: '0.625rem 0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid',
                  borderColor: active ? 'hsl(var(--border))' : 'transparent',
                  background: active ? 'hsl(var(--secondary))' : 'transparent',
                  color: active ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 150ms cubic-bezier(.2,.8,.2,1)',
                }}
              >
                <Icon size={16} className="shrink-0 mt-[2px]" aria-hidden />
                <span style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', minWidth: 0 }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: active ? 600 : 500 }}>{item.label}</span>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      color: 'hsl(var(--muted-foreground))',
                      lineHeight: 1.3,
                    }}
                  >
                    {item.desc}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* 主面板 */}
      <main className="flex-grow overflow-y-auto" style={{ padding: '1.5rem 2rem' }}>
        <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
          {loading ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 0',
                color: 'hsl(var(--muted-foreground))',
                gap: '0.5rem',
              }}
            >
              <Loader2 size={20} className="animate-spin" aria-hidden="true" />
              <span style={{ fontSize: '0.875rem' }}>加载中...</span>
            </div>
          ) : activePanel === 'site' ? (
            <SiteInfoPanel
              value={siteInfo}
              onChange={setSiteInfo}
              onSave={saveSiteInfo}
              saving={saving}
            />
          ) : (
            <ContactPanel
              value={socialLinks}
              onAdd={addSocial}
              onUpdate={updateSocial}
              onRemove={removeSocial}
              onMove={moveSocial}
              onSave={saveContact}
              saving={saving}
            />
          )}
        </div>
      </main>
    </div>
  );
}

/* ============ 网站信息面板 ============ */
function SiteInfoPanel({
  value,
  onChange,
  onSave,
  saving,
}: {
  value: SiteInfoForm;
  onChange: (v: SiteInfoForm) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const update = <K extends keyof SiteInfoForm>(key: K, v: SiteInfoForm[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <section>
      <PanelHeader
        title="网站信息"
        desc="设置网站名称、Logo、SEO 元数据与底部版权文案"
      />
      <div
        style={{
          display: 'grid',
          gap: '1.25rem',
          padding: '1.5rem',
          borderRadius: '0.75rem',
          border: '1px solid hsl(var(--border))',
          background: 'hsl(var(--card))',
        }}
      >
        <Field label="网站名称" hint="显示在前台 Header logo 与后台 Sidebar 品牌区">
          <TextInput value={value.site_name} onChange={(v) => update('site_name', v)} placeholder="四次元资源桶" />
        </Field>
        <Field label="浏览器标签标题" hint="SEO metadata.title,影响浏览器标签页与搜索引擎">
          <TextInput value={value.site_title_seo} onChange={(v) => update('site_title_seo', v)} placeholder="四次元资源桶" />
        </Field>
        <Field label="网站描述" hint="SEO meta description,搜索引擎结果摘要">
          <TextInput value={value.site_description_seo} onChange={(v) => update('site_description_seo', v)} placeholder="资源管理与分享平台" />
        </Field>
        <Field label="Logo / Favicon URL" hint="网站 favicon 图标地址,如 /favicon.ico 或 CDN URL">
          <TextInput value={value.favicon_url} onChange={(v) => update('favicon_url', v)} placeholder="/favicon.ico" />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="版权文案" hint="不含年份,系统自动在前面追加年份">
            <TextInput value={value.copyright_text} onChange={(v) => update('copyright_text', v)} placeholder="资源桶. 保留所有权利." />
          </Field>
          <Field label="版权起始年份" hint="若与当前年份不同,显示为 2023-2026">
            <TextInput
              type="number"
              value={String(value.copyright_year_start)}
              onChange={(v) => update('copyright_year_start', Number(v) || 2023)}
              placeholder="2023"
            />
          </Field>
        </div>
        <SaveButton onClick={onSave} saving={saving} />
      </div>
    </section>
  );
}

/* ============ 联系方式面板 ============ */
function ContactPanel({
  value,
  onAdd,
  onUpdate,
  onRemove,
  onMove,
  onSave,
  saving,
}: {
  value: SocialLink[];
  onAdd: () => void;
  onUpdate: (idx: number, field: keyof SocialLink, v: string) => void;
  onRemove: (idx: number) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <section>
      <PanelHeader
        title="联系方式"
        desc="编辑前台 Footer 显示的社交链接、群号与二维码"
        action={
          <button
            type="button"
            onClick={onAdd}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.4375rem 0.875rem',
              borderRadius: '0.5rem',
              border: '1px solid hsl(var(--border))',
              background: 'hsl(var(--card))',
              color: 'hsl(var(--foreground))',
              fontSize: '0.8125rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Plus size={14} aria-hidden="true" />
            新增
          </button>
        }
      />
      {value.length === 0 ? (
        <div
          style={{
            padding: '3rem 1.5rem',
            textAlign: 'center',
            color: 'hsl(var(--muted-foreground))',
            fontSize: '0.875rem',
            border: '1px dashed hsl(var(--border))',
            borderRadius: '0.75rem',
          }}
        >
          暂无联系方式,点击右上角"新增"添加
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {value.map((s, idx) => (
            <div
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr 1fr',
                gap: '0.75rem',
                padding: '1rem',
                borderRadius: '0.625rem',
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--card))',
                alignItems: 'end',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.125rem' }}>
                  <button
                    type="button"
                    onClick={() => onMove(idx, -1)}
                    disabled={idx === 0}
                    aria-label="上移"
                    style={iconBtnStyle(idx === 0)}
                  >
                    <GripVertical size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(idx, 1)}
                    disabled={idx === value.length - 1}
                    aria-label="下移"
                    style={iconBtnStyle(idx === value.length - 1)}
                  >
                    <GripVertical size={14} aria-hidden="true" style={{ transform: 'rotate(180deg)' }} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  aria-label="删除"
                  style={{
                    ...iconBtnStyle(false),
                    color: 'hsl(var(--destructive))',
                  }}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
              <Field label="平台标识" hint="如 facebook / twitter / weixin / qq">
                <TextInput value={s.platform} onChange={(v) => onUpdate(idx, 'platform', v)} placeholder="facebook" />
              </Field>
              <Field label="显示信息" hint="Tooltip 文案,如 QQ群: 6200052">
                <TextInput value={s.info} onChange={(v) => onUpdate(idx, 'info', v)} placeholder="QQ群: 6200052" />
              </Field>
              <Field label="链接 URL">
                <TextInput value={s.link} onChange={(v) => onUpdate(idx, 'link', v)} placeholder="https://facebook.com" />
              </Field>
              <Field label="图标标识" hint="图标库内置 key,如 facebook / twitter / weixin">
                <TextInput value={s.icon} onChange={(v) => onUpdate(idx, 'icon', v)} placeholder="facebook" />
              </Field>
              <Field label="二维码图片 URL" hint="可选,微信等平台需要展示二维码时填写">
                <TextInput value={s.qr_code} onChange={(v) => onUpdate(idx, 'qr_code', v)} placeholder="https://..." />
              </Field>
            </div>
          ))}
          <SaveButton onClick={onSave} saving={saving} />
        </div>
      )}
    </section>
  );
}

/* ============ 通用组件 ============ */
function PanelHeader({
  title,
  desc,
  action,
}: {
  title: string;
  desc: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '1.25rem',
      }}
    >
      <div>
        <h1
          style={{
            fontSize: '1.375rem',
            fontWeight: 600,
            color: 'hsl(var(--foreground))',
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h1>
        <p
          style={{
            marginTop: '0.375rem',
            fontSize: '0.8125rem',
            color: 'hsl(var(--muted-foreground))',
          }}
        >
          {desc}
        </p>
      </div>
      {action}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', minWidth: 0 }}>
      <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'hsl(var(--foreground))' }}>{label}</span>
      {children}
      {hint && (
        <span style={{ fontSize: '0.6875rem', color: 'hsl(var(--muted-foreground))', lineHeight: 1.3 }}>
          {hint}
        </span>
      )}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: 'text' | 'number';
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '0.5rem 0.75rem',
        borderRadius: '0.5rem',
        border: '1px solid hsl(var(--border))',
        background: 'hsl(var(--background))',
        color: 'hsl(var(--foreground))',
        fontSize: '0.875rem',
        outline: 'none',
        transition: 'border-color 150ms',
      }}
      onFocus={(e) => (e.currentTarget.style.borderColor = 'hsl(var(--primary))')}
      onBlur={(e) => (e.currentTarget.style.borderColor = 'hsl(var(--border))')}
    />
  );
}

function SaveButton({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
      <button
        type="button"
        onClick={onClick}
        disabled={saving}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          padding: '0.5rem 1.125rem',
          borderRadius: '0.5rem',
          border: 'none',
          background: saving ? 'hsl(var(--muted))' : 'hsl(var(--primary))',
          color: saving ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary-foreground))',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
        {saving ? '保存中...' : '保存'}
      </button>
    </div>
  );
}

function iconBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: '0.375rem',
    border: '1px solid hsl(var(--border))',
    background: 'hsl(var(--background))',
    color: disabled ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    padding: 0,
  };
}
