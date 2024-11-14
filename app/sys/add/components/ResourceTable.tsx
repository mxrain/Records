import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ResourcesState, ColumnName } from '@/app/sys/add/types'
import { ImagePreview } from './ImagePreview'
import { SourceLinksPreview } from './SourceLinksPreview'
import { formatTimeAgo } from '@/lib/utils'
import { TagsPreview } from './TagsPreview'
import { MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ResourceTableProps {
  resources: ResourcesState;
  visibleColumns: ColumnName[];
  onEdit: (uuid: string) => void;
  onDelete: (uuid: string) => void;
  onSelectionChange: (selectedUuids: string[]) => void;
}

export function ResourceTable({ resources, visibleColumns, onEdit, onDelete, onSelectionChange }: ResourceTableProps) {
  // 用于跟踪选中的资源UUID
  const [selectedUuids, setSelectedUuids] = useState<string[]>([]);

  // 处理全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    const newSelectedUuids = checked ? Object.keys(resources) : [];
    setSelectedUuids(newSelectedUuids);
    onSelectionChange(newSelectedUuids);
  };

  // 处理单个资源的选择/取消选择
  const handleSelectOne = (uuid: string, checked: boolean) => {
    const newSelectedUuids = checked
      ? [...selectedUuids, uuid] // 添加到选中列表
      : selectedUuids.filter(id => id !== uuid); // 从选中列表移除
    setSelectedUuids(newSelectedUuids);
    onSelectionChange(newSelectedUuids);
  };

  const renderCell = (column: ColumnName, resource: any, uuid: string) => {
    switch (column) {
      case 'name': return resource.name;
      case 'category': return resource.category;
      case 'images': return <ImagePreview images={resource.images} />;
      case 'source_links': return <SourceLinksPreview links={resource.source_links} />;
      case 'tags': return <TagsPreview tags={resource.tags} />;
      case 'uploaded': return new Date(resource.uploaded).toLocaleDateString();
      case 'update_time': return formatTimeAgo(resource.update_time);
      case 'uuid': return uuid;
      default: return null;
    }
  };

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const handleMenuOpenChange = (uuid: string, open: boolean) => {
    setOpenMenus(prev => ({ ...prev, [uuid]: open }));
  };

  const handleEditClick = (uuid: string) => {
    onEdit(uuid);
    handleMenuOpenChange(uuid, false);
  };

  const handleDeleteClick = (uuid: string) => {
    onDelete(uuid);
    handleMenuOpenChange(uuid, false);
  };

  const [isLargeScreen, setIsLargeScreen] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 1024); // 假设1024px是大屏幕的阈值
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const displayColumns = isLargeScreen ? visibleColumns : visibleColumns.slice(0, 3);

  return (
    <div className="overflow-x-auto scrollbar-hide">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[20px]">
              <Checkbox
                checked={selectedUuids.length === Object.keys(resources).length}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            {displayColumns.map((column) => (
              <TableHead key={column} className="whitespace-nowrap">{column}</TableHead>
            ))}
            <TableHead className="whitespace-nowrap">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(resources).map(([uuid, resource]) => (
            <TableRow key={uuid}>
              <TableCell className="w-[20px]">
                <Checkbox
                  checked={selectedUuids.includes(uuid)}
                  onCheckedChange={(checked) => handleSelectOne(uuid, checked as boolean)}
                />
              </TableCell>
              {displayColumns.map((column) => (
                <TableCell key={column} className="whitespace-nowrap overflow-hidden text-ellipsis">
                  <div className="max-w-[200px] overflow-hidden text-ellipsis">
                    {renderCell(column, resource, uuid)}
                  </div>
                </TableCell>
              ))}
              <TableCell className="whitespace-nowrap">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">打开菜单</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(uuid)}>
                      编辑
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(uuid)}>
                      删除
                    </DropdownMenuItem>
                    {!isLargeScreen && visibleColumns.slice(3).map((column) => (
                      <DropdownMenuItem key={column}>
                        <span className="font-medium">{column}:</span> {renderCell(column, resource, uuid)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
