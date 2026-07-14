"use client"

import React, { useState, useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Resource, ResourcesState, ColumnName } from '@/app/sys/add/types'
import { useGetCategoriesQuery } from '@/app/store/api/categoriesApi'
import { useGetTagsQuery } from '@/app/store/api/tagsApi'
import { useGetResourcesQuery } from '@/app/store/api/resourcesApi'
import { useGetListItemsQuery } from '@/app/store/api/listApi'
import { useDispatch, useSelector } from 'react-redux'
import { addChangeRecord } from '@/app/store/features/changeRecords/changeRecordsSlice'
import { RootState } from '@/app/store/store'
import {
  PlusIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  RefreshCwIcon,
  ColumnsIcon,
  Search,
  Filter,
  Trash2,
} from 'lucide-react'
import LoadingAnimation from '@/app/components/LoadingAnimation/LoadingAnimation'

// 动态导入客户端组件
const ColumnVisibilityToggle = dynamic(
  () => import('./components/ColumnVisibilityToggle').then(mod => mod.ColumnVisibilityToggle),
  { ssr: false }
)

const BulkOperationButtons = dynamic(
  () => import('./components/BulkOperationButtons').then(mod => mod.BulkOperationButtons),
  { ssr: false }
)

const ResourceTable = dynamic(
  () => import('./components/ResourceTable').then(mod => mod.ResourceTable),
  { ssr: false }
)

const ResourceForm = dynamic(
  () => import('./components/ResourceForm').then(mod => mod.ResourceForm),
  { ssr: false }
)

function ResourceCRUDContent() {
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)
  const [resources, setResources] = useState<ResourcesState>({})
  const [visibleColumns, setVisibleColumns] = useState<ColumnName[]>(['name', 'uuid', 'category', 'images', 'source_links', 'tags', 'uploaded', 'update_time'])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingResource, setEditingResource] = useState<{ uuid: string; resource: Resource } | null>(null)
  const { toast } = useToast()
  const [selectedUuids, setSelectedUuids] = useState<string[]>([])
  const [isMenuExpanded, setIsMenuExpanded] = useState(false)
  const [search, setSearch] = useState('')

  const dispatch = useDispatch()
  const changeRecords = useSelector((state: RootState) => state.changeRecords.records)

  const { data: categoriesData, refetch: refetchCategories } = useGetCategoriesQuery()
  const { data: tagsData, refetch: refetchTags } = useGetTagsQuery()
  const { data: resourcesData, refetch: refetchResources } = useGetResourcesQuery()
  const { data: listData, refetch: refetchListData } = useGetListItemsQuery()

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (resourcesData) {
      setResources(resourcesData)
    }
  }, [resourcesData])

  const handleAddResource = async (data: Resource) => {
    const uuid = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    const newResource = {
      ...data,
      uploaded: Date.now(),
      update_time: Date.now(),
    }
    setResources(prev => ({ ...prev, [uuid]: newResource }))
    setIsAddDialogOpen(false)
    dispatch(addChangeRecord({ action: 'add', uuid, data: newResource }))
    toast({ title: '添加成功', description: `资源「${data.name}」已添加` })
  }

  const handleEditResource = async (uuid: string, data: Resource) => {
    const updatedResource = {
      ...data,
      update_time: Date.now(),
    }
    setResources(prev => ({ ...prev, [uuid]: updatedResource }))
    setEditingResource(null)
    dispatch(addChangeRecord({ action: 'edit', uuid, data: updatedResource }))
    toast({ title: '编辑成功', description: `资源「${data.name}」已更新` })
  }

  const handleDeleteResource = async (uuid: string) => {
    const name = resources[uuid]?.name
    setResources(prev => {
      const newResources = { ...prev }
      delete newResources[uuid]
      return newResources
    })

    dispatch(addChangeRecord({ action: 'delete', uuid }))
    toast({ title: '删除成功', description: `资源「${name}」已删除` })
  }

  const handleBulkOperation = async (operation: string, uuids: string[]) => {
    dispatch(addChangeRecord({
      action: 'bulk' as const,
      data: { operation, uuids }
    }))
    toast({ title: '批量操作', description: `对 ${uuids.length} 项执行了 ${operation}` })
  }

  // 过滤后的资源（基于搜索）
  const filteredResources = React.useMemo<ResourcesState>(() => {
    if (!search.trim()) return resources
    const q = search.trim().toLowerCase()
    const result: ResourcesState = {}
    Object.entries(resources).forEach(([uuid, r]) => {
      const inName = (r.name || '').toLowerCase().includes(q)
      const inCat = (r.category || '').toLowerCase().includes(q)
      if (inName || inCat) result[uuid] = r
    })
    return result
  }, [resources, search])

  if (!isClient) {
    return <LoadingAnimation />
  }

  const totalCount = Object.keys(resources).length
  const filteredCount = Object.keys(filteredResources).length

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-[1400px] mx-auto">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 添加新资源 */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 font-medium text-sm whitespace-nowrap"
              style={{
                background: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
                border: 'none',
                borderRadius: '2rem',
                cursor: 'pointer',
                transition: 'transform 150ms cubic-bezier(.2,.8,.2,1)',
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'translateY(1px)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <PlusIcon size={16} aria-hidden="true" />
              添加资源
            </button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>添加新资源</DialogTitle>
            </DialogHeader>
            <ResourceForm
              onSubmit={handleAddResource}
              categories={categoriesData || []}
              tags={tagsData || {}}
            />
          </DialogContent>
        </Dialog>

        {/* 搜索框 */}
        <div
          className="flex items-center gap-2 flex-1 min-w-[200px]"
          style={{
            maxWidth: '28rem',
            padding: '0.5rem 0.875rem',
            borderRadius: '2rem',
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--card))',
          }}
        >
          <Search size={16} style={{ color: 'hsl(var(--muted-foreground))' }} aria-hidden="true" />
          <input
            type="text"
            placeholder="搜索资源..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="搜索资源"
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

        {/* 批量操作 + 列可见性 */}
        <div className="flex items-center gap-2 ml-auto">
          <BulkOperationButtons
            onOperation={handleBulkOperation}
            selectedUuids={selectedUuids}
          />
          <ColumnVisibilityToggle
            columns={['uuid', 'name', 'category', 'images', 'source_links', 'tags', 'uploaded', 'update_time']}
            visibleColumns={visibleColumns}
            setVisibleColumns={setVisibleColumns}
          />
        </div>
      </div>

      {/* 数据表格卡片 */}
      <div
        className="sys-card overflow-hidden"
        style={{ borderRadius: '2rem' }}
      >
        <div className="overflow-x-auto">
          <ResourceTable
            resources={filteredResources}
            visibleColumns={visibleColumns}
            onEdit={(uuid) => setEditingResource({ uuid, resource: resources[uuid] })}
            onDelete={handleDeleteResource}
            onSelectionChange={(newSelectedUuids) => {
              setSelectedUuids(newSelectedUuids)
            }}
          />
        </div>
      </div>

      {/* 表格统计 */}
      <div
        className="flex items-center justify-between text-xs"
        style={{ color: 'hsl(var(--muted-foreground))' }}
      >
        <span>
          显示 {filteredCount} 项{search.trim() ? `（共 ${totalCount} 项）` : ''}
        </span>
        {selectedUuids.length > 0 && (
          <span>已选择 {selectedUuids.length} 项</span>
        )}
      </div>

      {/* 移动端浮动按钮 */}
      <div className="fixed bottom-4 right-4 flex flex-col-reverse gap-2 sm:hidden z-10">
        <button
          type="button"
          onClick={() => setIsMenuExpanded(!isMenuExpanded)}
          className="inline-flex items-center justify-center"
          style={{
            width: 48,
            height: 48,
            borderRadius: '9999px',
            background: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
          aria-label="操作菜单"
        >
          {isMenuExpanded ? <ChevronDownIcon size={20} /> : <ChevronUpIcon size={20} />}
        </button>

        {isMenuExpanded && (
          <>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center"
                  style={{
                    width: 48, height: 48, borderRadius: '9999px',
                    background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))',
                    border: 'none', cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                  aria-label="添加资源"
                >
                  <PlusIcon size={20} />
                </button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>添加新资源</DialogTitle>
                </DialogHeader>
                <ResourceForm
                  onSubmit={handleAddResource}
                  categories={categoriesData || []}
                  tags={tagsData || {}}
                />
              </DialogContent>
            </Dialog>
            <button
              type="button"
              onClick={() => refetchResources()}
              className="inline-flex items-center justify-center"
              style={{
                width: 48, height: 48, borderRadius: '9999px',
                background: 'hsl(var(--card))', color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))', cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
              aria-label="刷新"
            >
              <RefreshCwIcon size={20} />
            </button>
            <BulkOperationButtons
              onOperation={handleBulkOperation}
              selectedUuids={selectedUuids}
              useSmallScreen={true}
            />
            <ColumnVisibilityToggle
              columns={['uuid', 'name', 'category', 'images', 'source_links', 'tags', 'uploaded', 'update_time']}
              visibleColumns={visibleColumns}
              setVisibleColumns={setVisibleColumns}
              useSmallScreen={true}
            >
              <button
                type="button"
                className="inline-flex items-center justify-center"
                style={{
                  width: 48, height: 48, borderRadius: '9999px',
                  background: 'hsl(var(--card))', color: 'hsl(var(--foreground))',
                  border: '1px solid hsl(var(--border))', cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
                aria-label="列显示"
              >
                <ColumnsIcon size={20} />
              </button>
            </ColumnVisibilityToggle>
          </>
        )}
      </div>

      {editingResource && (
        <Dialog open={!!editingResource} onOpenChange={() => setEditingResource(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑资源</DialogTitle>
            </DialogHeader>
            <ResourceForm
              initialData={editingResource.resource}
              onSubmit={(data) => handleEditResource(editingResource.uuid, data)}
              categories={categoriesData || []}
              tags={tagsData || {}}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default function ResourceCRUD() {
  return (
    <Suspense fallback={<LoadingAnimation />}>
      <ResourceCRUDContent />
    </Suspense>
  )
}
