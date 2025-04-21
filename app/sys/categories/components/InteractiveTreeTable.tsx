'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Album, Plus, Trash2, Edit, MoveUp } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetCategoriesQuery, useUpdateCategoriesMutation } from '@/app/store/api/categoriesApi';
import type { CategoryData } from '@/app/types/categories';
import { useGetIconsQuery } from '@/app/store/features/icons/iconsApi';
import * as Icons from 'lucide-react';
import { useDispatch } from 'react-redux';
import { addChangeRecord } from '@/app/store/features/changeRecords/changeRecordsSlice';
import { Suspense } from 'react';
import LoadingAnimation from '@/app/components/LoadingAnimation/LoadingAnimation';

type TreeData = Record<string, CategoryData>;

interface CategoryFormData {
  name: string;
  icon: string;
  link: string;
}

export function InteractiveTreeTable() {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [editingCategory, setEditingCategory] = useState<{ path: string[]; data: CategoryData } | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({ name: '', icon: '', link: '' });

  const { data: categories = {}, isLoading: isCategoriesLoading } = useGetCategoriesQuery();
  const { data: icons, isLoading: isIconsLoading } = useGetIconsQuery({
    page: 1,
    pageSize: 1000 // 获取足够多的图标以供选择
  });
  const dispatch = useDispatch();

  const toggleExpand = (path: string[]) => {
    if (expandedCategories.includes(path.join('>'))) {
      setExpandedCategories(expandedCategories.filter(p => p !== path.join('>')));
    } else {
      setExpandedCategories([...expandedCategories, path.join('>')]);
    }
  };

  const handleAdd = (path: string[]) => {
    setCurrentPath(path);
    setFormData({ name: '', icon: '', link: '' });
    setIsAddDialogOpen(true);
  };

  const handleEdit = (path: string[], categoryData: CategoryData) => {
    setEditingCategory({ path, data: categoryData });
    setFormData({
      name: path[path.length - 1],
      icon: categoryData.icon || '',
      link: categoryData.link || ''
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = (path: string[]) => {
    dispatch(addChangeRecord({
      action: 'delete',
      uuid: 'categories',
      data: {
        path: path.join('>'),
        operation: 'delete'
      }
    }));
  };

  const renderCategoryRow = (name: string, data: CategoryData, path: string[] = []): JSX.Element => {
    const isExpanded = expandedCategories.includes(path.join('>'));
    const hasChildren = data.items && Object.keys(data.items).length > 0;
    const IconComponent = (Icons[data.icon as keyof typeof Icons] || Album) as React.ElementType;
    const depth = path.length;

    return (
      <>
        <TableRow key={path.join('>')}>
          <TableCell className="w-[500px]">
            <div className="flex items-center" style={{ paddingLeft: `${depth * 20}px` }}>
              {hasChildren ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="p-0 w-4 h-4"
                  onClick={() => toggleExpand(path)}
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </Button>
              ) : (
                <span className="w-4" />
              )}
              <IconComponent size={16} className="ml-2 mr-2" />
              <span>{name}</span>
            </div>
          </TableCell>
          <TableCell>{data.link || '无链接'}</TableCell>
          <TableCell className="text-right">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleAdd([...path, name])}
            >
              <Plus size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit([...path, name], data)}
            >
              <Edit size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete([...path, name])}
            >
              <Trash2 size={16} />
            </Button>
          </TableCell>
        </TableRow>
        {isExpanded && data.items && Object.entries(data.items).map(([childName, childData]) => 
          renderCategoryRow(childName, childData, [...path, name])
        )}
      </>
    );
  };

  if (isCategoriesLoading || isIconsLoading) {
    return <LoadingAnimation />;
  }

  return (
    <Suspense fallback={<LoadingAnimation />}>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">分类管理</h2>
          <Button onClick={() => handleAdd([])}>
            <Plus size={16} className="mr-2" />
            添加顶级分类
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>链接</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(categories).map(([name, data]) => 
              renderCategoryRow(name, {
                ...data,
                icon: data.icon || 'Album' // 确保 icon 有默认值
              })
            )}
          </TableBody>
        </Table>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? '编辑分类' : '添加分类'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label>名称</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label>图标</label>
                <Select
                  value={formData.icon}
                  onValueChange={(value) => setFormData({ ...formData, icon: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择图标" />
                  </SelectTrigger>
                  <SelectContent>
                    {icons?.icons?.map((icon: string) => (
                      <SelectItem key={icon} value={icon}>
                        {icon}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label>链接</label>
                <Input
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={() => {
                const action = editingCategory ? 'edit' : 'add';
                dispatch(addChangeRecord({
                  action,
                  uuid: 'categories',
                  data: {
                    path: action === 'edit' && editingCategory ? editingCategory.path.join('>') : currentPath.join('>'),
                    ...formData
                  }
                }));
                setIsAddDialogOpen(false);
                setEditingCategory(null);
                setFormData({ name: '', icon: '', link: '' });
              }}>
                {editingCategory ? '保存' : '添加'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  );
}