"use client"

import React, { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Resource, ResourcesState, ColumnName } from '@/app/sys/add/types'
import { useGetCategoriesQuery } from '@/app/store/api/categoriesApi';
import { useGetTagsQuery } from '@/app/store/api/tagsApi';
import { useGetResourcesQuery } from '@/app/store/api/resourcesApi';
import { useGetListItemsQuery } from '@/app/store/api/listApi';
import { useDispatch, useSelector } from 'react-redux';
import { addChangeRecord, clearChangeRecords } from '@/app/store/features/changeRecords/changeRecordsSlice';
import { RootState } from '@/app/store/store';
import { PlusIcon, ChevronUpIcon, ChevronDownIcon, RefreshCwIcon, ColumnsIcon } from 'lucide-react';
import LoadingAnimation from '@/app/components/LoadingAnimation/LoadingAnimation';

// 动态导入客户端组件
const ColumnVisibilityToggle = dynamic(
  () => import('./components/ColumnVisibilityToggle').then(mod => mod.ColumnVisibilityToggle),
  { ssr: false }
);

const BulkOperationButtons = dynamic(
  () => import('./components/BulkOperationButtons').then(mod => mod.BulkOperationButtons),
  { ssr: false }
);

const ResourceTable = dynamic(
  () => import('./components/ResourceTable').then(mod => mod.ResourceTable),
  { ssr: false }
);

const ResourceForm = dynamic(
  () => import('./components/ResourceForm').then(mod => mod.ResourceForm),
  { ssr: false }
);

function ResourceCRUDContent() {
  const [isClient, setIsClient] = useState(false);
  const [resources, setResources] = useState<ResourcesState>({});
  const [visibleColumns, setVisibleColumns] = useState<ColumnName[]>(['name', 'uuid', 'category', 'images', 'source_links', 'tags', 'uploaded', 'update_time']);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<{ uuid: string; resource: Resource } | null>(null);
  const { toast } = useToast();
  const [selectedUuids, setSelectedUuids] = useState<string[]>([]);
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);

  const dispatch = useDispatch();
  const changeRecords = useSelector((state: RootState) => state.changeRecords.records);

  const { data: categoriesData, refetch: refetchCategories } = useGetCategoriesQuery();
  const { data: tagsData, refetch: refetchTags } = useGetTagsQuery();
  const { data: resourcesData, refetch: refetchResources } = useGetResourcesQuery();
  const { data: listData, refetch: refetchListData } = useGetListItemsQuery();


  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (resourcesData) {
      setResources(resourcesData);
    }
  }, [resourcesData]);

  const handleAddResource = async (data: Resource) => {
    const uuid = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const newResource = {
      ...data,
      uploaded: Date.now(),
      update_time: Date.now(),
    };
    setResources(prev => ({ ...prev, [uuid]: newResource }));
    setIsAddDialogOpen(false);
    dispatch(addChangeRecord({ action: 'add', uuid, data: newResource }));
  };

  const handleEditResource = async (uuid: string, data: Resource) => {
    const updatedResource = {
      ...data,
      update_time: Date.now(),
    };
    setResources(prev => ({ ...prev, [uuid]: updatedResource }));
    setEditingResource(null);
    dispatch(addChangeRecord({ action: 'edit', uuid, data: updatedResource }));
  };

  const handleDeleteResource = async (uuid: string) => {
    setResources(prev => {
      const newResources = { ...prev };
      delete newResources[uuid];
      return newResources;
    });
    
    dispatch(addChangeRecord({ action: 'delete', uuid }));
  };


  const handleBulkOperation = async (operation: string, uuids: string[]) => {
    dispatch(addChangeRecord({ 
      action: 'bulk' as const,
      data: { operation, uuids }
    }));
  };

  if (!isClient) {
    return <LoadingAnimation />;
  }

  return (
    <div>
      <div className="hidden sm:flex justify-between items-center mb-5">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>添加新资源</Button>
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

      {/* 小屏幕布局 */}
      <div className="fixed bottom-4 right-4 flex flex-col-reverse gap-2 sm:hidden z-10">
        <Button
          className="rounded-full w-12 h-12 p-0"
          onClick={() => setIsMenuExpanded(!isMenuExpanded)}
        >
          {isMenuExpanded ? <ChevronDownIcon /> : <ChevronUpIcon />}
        </Button>

        {isMenuExpanded && (
          <>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-full w-12 h-12 p-0">
                  <PlusIcon />
                </Button>
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
            <Button className="rounded-full w-12 h-12 p-0" onClick={() => {
              console.log('test');
            }}>
              <RefreshCwIcon />
            </Button>
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
              <Button className="rounded-full w-12 h-12 p-0">
                <ColumnsIcon />
              </Button>
            </ColumnVisibilityToggle>
          </>
        )}
      </div>

      <ResourceTable
        resources={resources}
        visibleColumns={visibleColumns}
        onEdit={(uuid) => setEditingResource({ uuid, resource: resources[uuid] })}
        onDelete={handleDeleteResource}
        onSelectionChange={(newSelectedUuids) => {
          setSelectedUuids(newSelectedUuids);
        }}
      />
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
  );
}

export default function ResourceCRUD() {
  return (
    <Suspense fallback={<LoadingAnimation />}>
      <div className="mx-auto container p-4">
        <ResourceCRUDContent />
      </div>
    </Suspense>
  );
}
