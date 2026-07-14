'use client';

import React, { useState, useMemo } from 'react';
import { ChevronRight, Album, Plus, Trash2, Edit, Folder, FolderOpen, FileText, Search, ArrowRight, ChevronsDownUp, ChevronsUpDown, Loader2, Check, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetCategoriesQuery, categoriesApi } from '@/app/store/api/categoriesApi';
import { useGetResourcesQuery } from '@/app/store/api/resourcesApi';
import type { CategoryData } from '@/app/types/categories';
import { useGetIconsQuery } from '@/app/store/features/icons/iconsApi';
import * as Icons from 'lucide-react';
import { useDispatch } from 'react-redux';
import { addChangeRecord } from '@/app/store/features/changeRecords/changeRecordsSlice';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import LoadingAnimation from '@/app/components/LoadingAnimation/LoadingAnimation';
import { useToast } from '@/hooks/use-toast';

type TreeData = Record<string, CategoryData>;

interface CategoryFormData {
  name: string;
  icon: string;
  link: string;
}

interface FlatNode {
  name: string;
  data: CategoryData;
  path: string[];
  depth: number;
  hasChildren: boolean;
  childCount: number;
}

export function InteractiveTreeTable() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { toast } = useToast();
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [editingCategory, setEditingCategory] = useState<{ path: string[]; data: CategoryData } | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({ name: '', icon: '', link: '' });
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  // 拖拽状态
  const [draggingPath, setDraggingPath] = useState<string[] | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{ path: string[]; position: 'before' | 'inside' | 'after' } | null>(null);
  const [moving, setMoving] = useState(false);

  const { data: categories = {}, isLoading: isCategoriesLoading } = useGetCategoriesQuery();
  const { data: resources = {} } = useGetResourcesQuery();
  const { data: icons, isLoading: isIconsLoading } = useGetIconsQuery({
    page: 1,
    pageSize: 1000,
  });

  // 统计每个分类下的资源数
  const categoryResourceCount = useMemo(() => {
    const map = new Map<string, number>();
    Object.values(resources).forEach((r) => {
      const cat = r.category || '';
      if (cat) map.set(cat, (map.get(cat) || 0) + 1);
    });
    return map;
  }, [resources]);

  // 将树形数据扁平化（用于渲染）
  const flatNodes = useMemo<FlatNode[]>(() => {
    const result: FlatNode[] = [];
    const walk = (data: TreeData, path: string[] = []) => {
      Object.entries(data).forEach(([name, item]) => {
        const childCount = item.items ? Object.keys(item.items).length : 0;
        const hasChildren = childCount > 0;
        result.push({
          name,
          data: item,
          path,
          depth: path.length,
          hasChildren,
          childCount,
        });
        if (hasChildren && item.items) {
          walk(item.items, [...path, name]);
        }
      });
    };
    walk(categories);
    return result;
  }, [categories]);

  // 过滤搜索
  const filteredNodes = useMemo(() => {
    if (!search.trim()) return flatNodes;
    const q = search.trim().toLowerCase();
    return flatNodes.filter((n) => {
      const inName = n.name.toLowerCase().includes(q);
      const inPath = n.path.some((p) => p.toLowerCase().includes(q));
      return inName || inPath;
    });
  }, [flatNodes, search]);

  // 展开状态控制
  const toggleExpand = (key: string) => {
    setExpandedCategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const expandAll = () => {
    const allKeys = flatNodes
      .filter((n) => n.hasChildren)
      .map((n) => [...n.path, n.name].join('>'));
    setExpandedCategories(allKeys);
  };

  const collapseAll = () => {
    setExpandedCategories([]);
  };

  // 判断某节点是否应显示（基于父节点展开状态）
  const isNodeVisible = (node: FlatNode): boolean => {
    if (node.depth === 0) return true;
    // 检查所有祖先节点是否展开
    for (let i = 0; i < node.path.length; i++) {
      const ancestorKey = node.path.slice(0, i + 1).join('>');
      if (!expandedCategories.includes(ancestorKey)) return false;
    }
    return true;
  };

  const handleAdd = (path: string[]) => {
    setCurrentPath(path);
    setFormData({ name: '', icon: '', link: '' });
    setEditingCategory(null);
    setIsAddDialogOpen(true);
  };

  const handleEdit = (path: string[], categoryData: CategoryData) => {
    setEditingCategory({ path, data: categoryData });
    setFormData({
      name: path[path.length - 1],
      icon: categoryData.icon || '',
      link: categoryData.link || '',
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (path: string[]) => {
    setDeletingPath(path.join('>'));
    try {
      const res = await fetch('/api/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '删除失败');
      // 同步记录到变更历史(便于 GitHub 备份追踪)
      dispatch(
        addChangeRecord({
          action: 'delete',
          uuid: 'categories',
          data: { path: path.join('>'), operation: 'delete' },
        })
      );
      // 刷新 RTK Query 缓存
      dispatch(categoriesApi.util.invalidateTags(['Categories']));
      toast({ title: '删除成功', description: path.join(' > ') });
      setConfirmDelete(null);
    } catch (e) {
      toast({ title: '删除失败', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setDeletingPath(null);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: '请输入分类名称', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const isEdit = !!editingCategory;
      const body = isEdit
        ? { path: editingCategory!.path, name: formData.name, icon: formData.icon, link: formData.link }
        : { path: currentPath, name: formData.name, icon: formData.icon, link: formData.link };
      const res = await fetch('/api/categories', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || (isEdit ? '更新失败' : '新增失败'));
      // 同步记录到变更历史
      dispatch(
        addChangeRecord({
          action: isEdit ? 'edit' : 'add',
          uuid: 'categories',
          data: isEdit
            ? { path: editingCategory!.path.join('>'), ...formData }
            : { path: currentPath.join('>'), ...formData },
        })
      );
      // 刷新 RTK Query 缓存
      dispatch(categoriesApi.util.invalidateTags(['Categories']));
      toast({
        title: isEdit ? '更新成功' : '添加成功',
        description: formData.name,
      });
      setIsAddDialogOpen(false);
      setEditingCategory(null);
      setFormData({ name: '', icon: '', link: '' });
    } catch (e) {
      toast({
        title: editingCategory ? '更新失败' : '添加失败',
        description: (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ============ 拖拽排序 ============
  // 判断是否允许拖到目标:禁止拖到自身或自身子树
  const canDrop = (source: string[], target: string[]): boolean => {
    if (!source) return false;
    if (source.join('>') === target.join('>')) return false;
    if (target.join('>').startsWith(source.join('>') + '>')) return false;
    return true;
  };

  const handleDragStart = (e: React.DragEvent, path: string[]) => {
    if (search.trim()) {
      e.preventDefault();
      return;
    } // 搜索模式下禁用拖拽
    setDraggingPath(path);
    e.dataTransfer.effectAllowed = 'move';
    // Firefox 需要 setData 才能触发 drag
    e.dataTransfer.setData('text/plain', path.join('>'));
  };

  const handleDragOver = (e: React.DragEvent, path: string[]) => {
    if (!draggingPath || !canDrop(draggingPath, path)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;
    // 上 30% => before, 中 40% => inside, 下 30% => after
    let position: 'before' | 'inside' | 'after';
    if (y < h * 0.3) position = 'before';
    else if (y > h * 0.7) position = 'after';
    else position = 'inside';

    setDragOverInfo({ path, position });
  };

  const handleDragLeave = (e: React.DragEvent, path: string[]) => {
    // 只在离开整个行时清除
    const related = e.relatedTarget as HTMLElement | null;
    if (related && (e.currentTarget as HTMLElement).contains(related)) return;
    setDragOverInfo((prev) => (prev && prev.path.join('>') === path.join('>') ? null : prev));
  };

  const handleDrop = async (e: React.DragEvent, targetPath: string[]) => {
    e.preventDefault();
    if (!draggingPath || !dragOverInfo) {
      setDraggingPath(null);
      setDragOverInfo(null);
      return;
    }
    if (!canDrop(draggingPath, targetPath)) {
      setDraggingPath(null);
      setDragOverInfo(null);
      toast({ title: '无法移动', description: '不能拖到自身或其子分类中', variant: 'destructive' });
      return;
    }

    const { position } = dragOverInfo;
    setMoving(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourcePath: draggingPath, targetPath, position }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '移动失败');
      // 记录变更
      dispatch(
        addChangeRecord({
          action: 'move',
          uuid: 'categories',
          data: { sourcePath: draggingPath.join('>'), targetPath: targetPath.join('>'), position },
        })
      );
      dispatch(categoriesApi.util.invalidateTags(['Categories']));
      // 若 inside,自动展开目标节点以显示新位置
      if (position === 'inside') {
        setExpandedCategories((prev) =>
          prev.includes(targetPath.join('>')) ? prev : [...prev, targetPath.join('>')]
        );
      }
      toast({
        title: '移动成功',
        description: `${draggingPath.join(' > ')} → ${position === 'inside' ? targetPath.join(' > ') + ' 内' : targetPath.join(' > ')} ${position === 'before' ? '前' : position === 'after' ? '后' : ''}`.trim(),
      });
    } catch (err) {
      toast({ title: '移动失败', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setMoving(false);
      setDraggingPath(null);
      setDragOverInfo(null);
    }
  };

  const handleDragEnd = () => {
    setDraggingPath(null);
    setDragOverInfo(null);
  };

  if (isCategoriesLoading || isIconsLoading) {
    return <LoadingAnimation />;
  }

  return (
    <Suspense fallback={<LoadingAnimation />}>
      <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-[1400px] mx-auto">
        {/* 工具栏 */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => handleAdd([])}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 font-medium text-sm whitespace-nowrap"
            style={{
              background: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
              border: 'none',
              borderRadius: '2rem',
              cursor: 'pointer',
              transition: 'transform 150ms cubic-bezier(.2,.8,.2,1)',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'translateY(1px)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <Plus size={16} aria-hidden="true" />
            添加分类
          </button>

          <div
            className="flex items-center gap-2 flex-1 min-w-[200px]"
            style={{
              maxWidth: '24rem',
              height: 42,
              padding: '0 0.875rem',
              borderRadius: '2rem',
              border: '1px solid hsl(var(--border))',
              background: 'hsl(var(--card))',
            }}
          >
            <Search size={16} style={{ color: 'hsl(var(--muted-foreground))' }} aria-hidden="true" />
            <input
              type="text"
              placeholder="搜索分类..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="搜索分类"
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                color: 'hsl(var(--foreground))',
                fontSize: '0.875rem',
                minWidth: 0,
              }}
            />
          </div>

          <button
            type="button"
            onClick={expandAll}
            className="sys-btn-outline"
          >
            <ChevronsUpDown size={16} aria-hidden="true" />
            展开全部
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="sys-btn-outline"
          >
            <ChevronsDownUp size={16} aria-hidden="true" />
            折叠全部
          </button>
          <button
            type="button"
            onClick={() => router.push('/sys/list/recommend')}
            className="sys-btn-outline"
          >
            推荐列表
            <ArrowRight size={14} aria-hidden="true" />
          </button>
          {!search.trim() && (
            <span
              className="text-xs ml-auto"
              style={{ color: 'hsl(var(--muted-foreground))' }}
            >
              提示:拖拽行可调整层级与排序(上/下边界=同级前后,中间=设为子级)
            </span>
          )}
        </div>

        {/* 树形表格卡片 */}
        <div
          className="sys-card overflow-hidden"
          style={{ borderRadius: '2rem' }}
        >
          <div className="overflow-x-auto">
            <div style={{ minWidth: 720 }}>
              {/* 表头 */}
              <div
                className="grid items-center"
                style={{
                  gridTemplateColumns: 'minmax(220px, 1fr) 100px 100px 140px 160px',
                  padding: '0.875rem 1.25rem',
                  background: 'hsl(var(--muted))',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'hsl(var(--muted-foreground))',
                  gap: '0.75rem',
                }}
              >
                <span>分类名称</span>
                <span style={{ textAlign: 'right' }}>资源数</span>
                <span style={{ textAlign: 'right' }}>排序</span>
                <span style={{ textAlign: 'right' }}>链接</span>
                <span style={{ textAlign: 'right' }}>操作</span>
              </div>

              {/* 树形行 */}
              {filteredNodes.length === 0 ? (
                <div
                  className="flex items-center justify-center py-12"
                  style={{ color: 'hsl(var(--muted-foreground))' }}
                >
                  {search.trim() ? '未找到匹配的分类' : '暂无分类，点击"添加分类"开始'}
                </div>
              ) : (
                filteredNodes.map((node) => {
                  if (!isNodeVisible(node) && !search.trim()) return null;
                  const nodeKey = [...node.path, node.name].join('>');
                  const nodePath = [...node.path, node.name];
                  const isExpanded = expandedCategories.includes(nodeKey);
                  const IconComponent = (Icons[node.data.icon as keyof typeof Icons] || Album) as React.ElementType;
                  const resourceCount = categoryResourceCount.get(node.name) || 0;

                  // 拖拽视觉状态
                  const isDragging = draggingPath && draggingPath.join('>') === nodeKey;
                  const isDragOver = dragOverInfo && dragOverInfo.path.join('>') === nodeKey;
                  const dragPosition = isDragOver ? dragOverInfo!.position : null;
                  const isDropTarget = isDragOver && canDrop(draggingPath || [], nodePath);

                  return (
                    <div
                      key={nodeKey}
                      draggable={!search.trim() && !moving}
                      onDragStart={(e) => handleDragStart(e, nodePath)}
                      onDragOver={(e) => handleDragOver(e, nodePath)}
                      onDragLeave={(e) => handleDragLeave(e, nodePath)}
                      onDrop={(e) => handleDrop(e, nodePath)}
                      onDragEnd={handleDragEnd}
                      className="sys-table-row grid items-center relative"
                      style={{
                        gridTemplateColumns: 'minmax(220px, 1fr) 100px 100px 140px 160px',
                        padding: '0.75rem 1.25rem',
                        borderBottom: '1px solid hsl(var(--border))',
                        gap: '0.75rem',
                        cursor: !search.trim() ? 'grab' : 'default',
                        opacity: isDragging ? 0.4 : 1,
                        background: isDropTarget && dragPosition === 'inside'
                          ? 'hsl(var(--primary) / 0.08)'
                          : 'transparent',
                        transition: 'background 100ms',
                      }}
                    >
                      {/* 拖拽插入指示线 - before(顶部蓝线) */}
                      {isDropTarget && dragPosition === 'before' && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 2,
                            background: 'hsl(var(--primary))',
                            zIndex: 5,
                            pointerEvents: 'none',
                          }}
                        />
                      )}
                      {/* 拖拽插入指示线 - after(底部蓝线) */}
                      {isDropTarget && dragPosition === 'after' && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: 2,
                            background: 'hsl(var(--primary))',
                            zIndex: 5,
                            pointerEvents: 'none',
                          }}
                        />
                      )}
                      {/* 名称（带缩进 + 展开/折叠 + 图标） */}
                      <div
                        className="flex items-center gap-2 min-w-0"
                        style={{ paddingLeft: `${node.depth * 1.5}rem` }}
                      >
                        {node.hasChildren ? (
                          <button
                            type="button"
                            onClick={() => toggleExpand(nodeKey)}
                            className="shrink-0 inline-flex items-center justify-center"
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: '0.375rem',
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              color: 'hsl(var(--secondary))',
                              transition: 'transform 200ms',
                              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            }}
                            aria-label={isExpanded ? '折叠' : '展开'}
                          >
                            <ChevronRight size={16} aria-hidden="true" />
                          </button>
                        ) : (
                          <span style={{ width: 20, display: 'inline-block' }} />
                        )}
                        {node.hasChildren ? (
                          isExpanded ? (
                            <FolderOpen size={16} className="shrink-0" style={{ color: 'hsl(var(--secondary))' }} aria-hidden="true" />
                          ) : (
                            <Folder size={16} className="shrink-0" style={{ color: 'hsl(var(--secondary))' }} aria-hidden="true" />
                          )
                        ) : (
                          <FileText size={16} className="shrink-0" style={{ color: 'hsl(var(--muted-foreground))' }} aria-hidden="true" />
                        )}
                        <IconComponent size={14} className="shrink-0" style={{ color: 'hsl(var(--muted-foreground))' }} aria-hidden="true" />
                        <span
                          className="truncate"
                          style={{
                            color: 'hsl(var(--foreground))',
                            fontSize: '0.875rem',
                            fontWeight: node.depth === 0 ? 600 : 400,
                          }}
                        >
                          {node.name}
                        </span>
                      </div>

                      {/* 资源数 */}
                      <div style={{ textAlign: 'right' }}>
                        <span
                          className="inline-flex items-center justify-center"
                          style={{
                            minWidth: '2.5rem',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '0.625rem',
                            background: 'hsl(var(--accent))',
                            color: 'hsl(var(--accent-foreground))',
                            fontSize: '0.75rem',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {resourceCount}
                        </span>
                      </div>

                      {/* 排序权重 */}
                      <div
                        style={{
                          textAlign: 'right',
                          fontSize: '0.8125rem',
                          color: 'hsl(var(--muted-foreground))',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        —
                      </div>

                      {/* 链接 */}
                      <div
                        className="truncate"
                        style={{
                          textAlign: 'right',
                          fontSize: '0.8125rem',
                          color: node.data.link ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                        }}
                      >
                        {node.data.link ? (
                          <a
                            href={node.data.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {node.data.link}
                          </a>
                        ) : (
                          '—'
                        )}
                      </div>

                      {/* 操作 */}
                      <div className="flex items-center justify-end gap-1">
                        {confirmDelete && confirmDelete.join('>') === nodeKey ? (
                          <>
                            <RowActionButton
                              icon={deletingPath === nodeKey ? Loader2 : Check}
                              label={deletingPath === nodeKey ? '删除中' : '确认删除'}
                              variant="danger"
                              loading={deletingPath === nodeKey}
                              onClick={() => handleDelete([...node.path, node.name])}
                            />
                            <RowActionButton
                              icon={X}
                              label="取消"
                              disabled={!!deletingPath}
                              onClick={() => setConfirmDelete(null)}
                            />
                          </>
                        ) : (
                          <>
                            <RowActionButton
                              icon={Edit}
                              label="编辑"
                              onClick={() => handleEdit([...node.path, node.name], node.data)}
                            />
                            <RowActionButton
                              icon={Plus}
                              label="添加子分类"
                              onClick={() => handleAdd([...node.path, node.name])}
                            />
                            <RowActionButton
                              icon={Trash2}
                              label="删除"
                              variant="danger"
                              onClick={() => setConfirmDelete([...node.path, node.name])}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 添加/编辑分类 Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => { if (!submitting) setIsAddDialogOpen(open); }}>
          <DialogContent className="max-w-[560px]">
            <DialogHeader>
              <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {editingCategory ? <Edit size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
                {editingCategory ? '编辑分类' : '添加分类'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* 当前路径提示 */}
              {(editingCategory ? editingCategory.path.length > 0 : currentPath.length > 0) && (
                <div
                  className="flex items-center gap-2 text-xs"
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.5rem',
                    background: 'hsl(var(--muted))',
                    color: 'hsl(var(--muted-foreground))',
                  }}
                >
                  <Folder size={14} aria-hidden="true" />
                  <span>父级路径:</span>
                  <code style={{ fontFamily: 'ui-monospace, monospace', color: 'hsl(var(--foreground))' }}>
                    {(editingCategory ? editingCategory.path : currentPath).join(' / ')}
                  </code>
                </div>
              )}

              {/* 实时预览卡片 */}
              <div
                style={{
                  padding: '0.875rem 1rem',
                  borderRadius: '0.75rem',
                  border: '1px dashed hsl(var(--border))',
                  background: 'hsl(var(--muted) / 0.4)',
                }}
              >
                <div
                  style={{
                    fontSize: '0.6875rem',
                    color: 'hsl(var(--muted-foreground))',
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 600,
                  }}
                >
                  预览
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  {(() => {
                    const PreviewIcon = (Icons[formData.icon as keyof typeof Icons] || Album) as React.ElementType;
                    return (
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '0.5rem',
                          background: 'hsl(var(--secondary))',
                          color: 'hsl(var(--secondary-foreground))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <PreviewIcon size={18} aria-hidden="true" />
                      </div>
                    );
                  })()}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: '0.9375rem',
                        fontWeight: 600,
                        color: 'hsl(var(--foreground))',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formData.name.trim() || '分类名称'}
                    </span>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        color: 'hsl(var(--muted-foreground))',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formData.link || `/${formData.name.trim() || 'slug'}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* 名称字段 */}
              <div className="space-y-1.5">
                <label
                  className="text-sm font-medium flex items-center gap-1"
                  style={{ color: 'hsl(var(--foreground))' }}
                >
                  名称
                  <span style={{ color: 'hsl(var(--destructive))' }}>*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如:游戏工具"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter' && !submitting) handleSubmit(); }}
                />
                <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', margin: 0 }}>
                  分类的显示名称,同时作为 URL 标识(自动 slugify)
                </p>
              </div>

              {/* 图标选择器(可视化网格) */}
              <IconPicker
                icons={icons?.icons || []}
                value={formData.icon}
                onChange={(v) => setFormData({ ...formData, icon: v })}
              />

              {/* 链接字段 */}
              <div className="space-y-1.5">
                <label
                  className="text-sm font-medium flex items-center gap-1"
                  style={{ color: 'hsl(var(--foreground))' }}
                >
                  链接
                  <span
                    style={{
                      fontSize: '0.625rem',
                      padding: '0.0625rem 0.375rem',
                      borderRadius: '0.25rem',
                      background: 'hsl(var(--muted))',
                      color: 'hsl(var(--muted-foreground))',
                      fontWeight: 500,
                    }}
                  >
                    可选
                  </span>
                </label>
                <Input
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  placeholder={`留空使用 /${formData.name.trim() || 'slug'}`}
                />
                <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', margin: 0 }}>
                  自定义跳转链接;留空则默认使用 <code style={{ fontFamily: 'ui-monospace, monospace' }}>/{formData.name.trim() || 'slug'}</code>
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2" style={{ borderTop: '1px solid hsl(var(--border))', marginTop: '0.5rem' }}>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                disabled={submitting}
              >
                取消
              </Button>
              <Button onClick={handleSubmit} disabled={submitting || !formData.name.trim()}>
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin mr-1" aria-hidden="true" />
                    {editingCategory ? '保存中...' : '添加中...'}
                  </>
                ) : (
                  editingCategory ? '保存' : '添加'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  );
}

interface RowActionButtonProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
  loading?: boolean;
  disabled?: boolean;
}

function RowActionButton({ icon: Icon, label, onClick, variant = 'default', loading, disabled }: RowActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={label}
      title={label}
      className="inline-flex items-center justify-center"
      style={{
        width: 32,
        height: 32,
        borderRadius: '0.5rem',
        border: 'none',
        background: 'transparent',
        color: variant === 'danger' ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background-color 150ms, color 150ms',
      }}
      onMouseEnter={(e) => {
        if (disabled || loading) return;
        if (variant === 'danger') {
          e.currentTarget.style.background = 'hsl(var(--destructive) / 0.1)';
          e.currentTarget.style.color = 'hsl(var(--destructive))';
        } else {
          e.currentTarget.style.background = 'hsl(var(--accent) / 0.5)';
          e.currentTarget.style.color = 'hsl(var(--foreground))';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'hsl(var(--muted-foreground))';
      }}
    >
      <Icon size={16} aria-hidden="true" className={loading ? 'animate-spin' : ''} />
    </button>
  );
}

/* ============ 图标可视化选择器 ============ */
interface IconPickerProps {
  icons: string[];
  value: string;
  onChange: (v: string) => void;
}

function IconPicker({ icons, value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return icons;
    return icons.filter((name) => name.toLowerCase().includes(q));
  }, [icons, search]);

  const SelectedIcon = (Icons[value as keyof typeof Icons] || Album) as React.ElementType;

  return (
    <div className="space-y-1.5">
      <label
        className="text-sm font-medium flex items-center gap-1"
        style={{ color: 'hsl(var(--foreground))' }}
      >
        图标
        <span
          style={{
            fontSize: '0.625rem',
            padding: '0.0625rem 0.375rem',
            borderRadius: '0.25rem',
            background: 'hsl(var(--muted))',
            color: 'hsl(var(--muted-foreground))',
            fontWeight: 500,
          }}
        >
          可选
        </span>
      </label>

      {/* 当前选中 + 开关按钮 */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.5rem',
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--background))',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '0.375rem',
              background: value ? 'hsl(var(--secondary))' : 'hsl(var(--muted))',
              color: value ? 'hsl(var(--secondary-foreground))' : 'hsl(var(--muted-foreground))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <SelectedIcon size={16} aria-hidden="true" />
          </div>
          <span
            style={{
              fontSize: '0.875rem',
              color: value ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            {value || '未选择图标'}
          </span>
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              aria-label="清除图标"
              title="清除图标"
              style={{
                marginLeft: 'auto',
                width: 22,
                height: 22,
                borderRadius: '0.25rem',
                border: 'none',
                background: 'transparent',
                color: 'hsl(var(--muted-foreground))',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'hsl(var(--destructive) / 0.1)';
                e.currentTarget.style.color = 'hsl(var(--destructive))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'hsl(var(--muted-foreground))';
              }}
            >
              <X size={13} aria-hidden="true" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            padding: '0.5rem 0.875rem',
            borderRadius: '0.5rem',
            border: '1px solid hsl(var(--border))',
            background: open ? 'hsl(var(--secondary))' : 'hsl(var(--card))',
            color: open ? 'hsl(var(--secondary-foreground))' : 'hsl(var(--foreground))',
            fontSize: '0.8125rem',
            fontWeight: 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {open ? '收起' : '选择图标'}
        </button>
      </div>

      {/* 图标网格面板 */}
      {open && (
        <div
          style={{
            marginTop: '0.5rem',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0.625rem',
            background: 'hsl(var(--card))',
            overflow: 'hidden',
          }}
        >
          {/* 搜索框 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              borderBottom: '1px solid hsl(var(--border))',
              background: 'hsl(var(--muted) / 0.3)',
            }}
          >
            <Search size={14} aria-hidden="true" style={{ color: 'hsl(var(--muted-foreground))' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索图标名..."
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                color: 'hsl(var(--foreground))',
                fontSize: '0.8125rem',
                minWidth: 0,
              }}
            />
            <span style={{ fontSize: '0.6875rem', color: 'hsl(var(--muted-foreground))' }}>
              {filtered.length} / {icons.length}
            </span>
          </div>

          {/* 网格 */}
          <div
            style={{
              maxHeight: 240,
              overflowY: 'auto',
              padding: '0.5rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))',
              gap: '0.375rem',
            }}
          >
            {filtered.length === 0 ? (
              <div
                style={{
                  gridColumn: '1 / -1',
                  padding: '1.5rem',
                  textAlign: 'center',
                  fontSize: '0.8125rem',
                  color: 'hsl(var(--muted-foreground))',
                }}
              >
                未找到匹配的图标
              </div>
            ) : (
              filtered.map((iconName) => {
                const IconComp = (Icons[iconName as keyof typeof Icons] || Album) as React.ElementType;
                const active = value === iconName;
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => {
                      onChange(active ? '' : iconName);
                    }}
                    title={iconName}
                    aria-label={iconName}
                    aria-pressed={active}
                    style={{
                      width: '100%',
                      aspectRatio: '1 / 1',
                      borderRadius: '0.5rem',
                      border: active
                        ? '2px solid hsl(var(--primary))'
                        : '1px solid hsl(var(--border))',
                      background: active ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--background))',
                      color: active ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      transition: 'all 100ms',
                      padding: 0,
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'hsl(var(--accent))';
                        e.currentTarget.style.borderColor = 'hsl(var(--primary) / 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'hsl(var(--background))';
                        e.currentTarget.style.borderColor = 'hsl(var(--border))';
                      }
                    }}
                  >
                    <IconComp size={18} aria-hidden="true" />
                    {active && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          background: 'hsl(var(--primary))',
                          color: 'hsl(var(--primary-foreground))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Check size={10} aria-hidden="true" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
