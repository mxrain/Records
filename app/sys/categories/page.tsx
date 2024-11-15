"use client"

import React, { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, Album, Plus, Trash2, Edit, MoveUp } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useGetCategoriesQuery } from '@/app/store/api/categoriesApi';
import { useGetIconsQuery } from '@/app/store/features/icons/iconsApi';
import * as Icons from 'lucide-react';
import { useDispatch } from 'react-redux';
import { addChangeRecord } from '@/app/store/features/changeRecords/changeRecordsSlice';

type CategoryData = {
  icon: string
  link: string
  items?: Record<string, CategoryData>
}

type TreeData = Record<string, CategoryData>

const initialTreeData: TreeData = {
  "影视动漫": {
    "icon": "Album",
    "link": "mv",
    "items": {
      "番剧": { "icon": "path_d_value_here", "link": "anime" },
      "动画": { "icon": "path_d_value_here", "link": "animation" },
      "电影": {
        "icon": "path_d_value_here",
        "link": "movie",
        "items": {
          "动作片": { "icon": "path_d_value_here", "link": "action" },
          "喜剧片": { "icon": "path_d_value_here", "link": "comedy" }
        }
      },
    }
  },
  "软件游戏": {
    "icon": "path_d_value_here",
    "link": "software-game",
    "items": {
      "电脑软件": { "icon": "path_d_value_here", "link": "pc-software" },
      "手机软件": { "icon": "path_d_value_here", "link": "mobile-software" },
    }
  },
}

const InteractiveTreeTable: React.FC = () => {
  const { data: categoriesData, isLoading, isError } = useGetCategoriesQuery();
  const [treeData, setTreeData] = useState<TreeData>(categoriesData as TreeData || initialTreeData);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [editingItem, setEditingItem] = useState<{ key: string, parentKey: string } | null>(null)
  const [newItemData, setNewItemData] = useState({ name: '', link: '', icon: '', parentKey: '' })
  const [page, setPage] = useState(1);
  const pageSize = 60;
  const [allIcons, setAllIcons] = useState<string[]>([]);
  const dispatch = useDispatch();

  const { data: iconsData, isLoading: iconsLoading } = useGetIconsQuery({ 
    page, 
    pageSize 
  });

  useEffect(() => {
    if (iconsData?.icons) {
      setAllIcons(prev => [...prev, ...iconsData.icons]);
    }
  }, [iconsData]);

  useEffect(() => {
    if (categoriesData) {
      setTreeData(categoriesData as TreeData);
    }
  }, [categoriesData]);

  const pushNewTreeData = () => {
    console.log('Pushing tree data:', treeData);
    
    if (!treeData || Object.keys(treeData).length === 0) {
      console.error('Tree data is empty or invalid');
      return;
    }

    dispatch(addChangeRecord({
      action: 'edit',
      uuid: 'categories',
      data: treeData
    }));
  };
  
  const toggleRow = (rowKey: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(rowKey)) {
        newSet.delete(rowKey)
      } else {
        newSet.add(rowKey)
      }
      return newSet
    })
  }

  const addItem = (parentKey: string = 'root') => {
    if (!newItemData.name || !newItemData.link || !newItemData.icon) {
      return;
    }

    setTreeData((prevData) => {
      const newData = JSON.parse(JSON.stringify(prevData));
      const newItem = { 
        icon: newItemData.icon, 
        link: newItemData.link 
      };

      if (parentKey === 'root') {
        newData[newItemData.name] = newItem;
      } else {
        const keys = parentKey.split('-');
        let current = newData;
        
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) return prevData;
          if (!current[keys[i]].items) {
            current[keys[i]].items = {};
          }
          current = current[keys[i]].items;
        }

        const lastKey = keys[keys.length - 1];
        if (!current[lastKey]) return prevData;
        if (!current[lastKey].items) {
          current[lastKey].items = {};
        }
        current[lastKey].items[newItemData.name] = newItem;
      }

      return newData;
    });

    setNewItemData({ name: '', link: '', icon: '', parentKey: '' });
  };

  const deleteItem = (key: string, parentKey: string = '') => {
    setTreeData((prevData) => {
      const newData = JSON.parse(JSON.stringify(prevData));
      if (parentKey) {
        const keys = parentKey.split('-');
        let current = newData;
        for (let i = 0; i < keys.length - 1; i++) {
          current = current[keys[i]].items;
        }
        delete current[keys[keys.length - 1]].items[key];
      } else {
        delete newData[key];
      }
      return newData;
    });
  };

  const editItem = (key: string, parentKey: string = '') => {
    setEditingItem({ key, parentKey })
  }

  const saveEdit = (newName: string, newLink: string, newIcon: string) => {
    if (!editingItem) return;
    setTreeData((prevData) => {
      const newData = JSON.parse(JSON.stringify(prevData));
      const { key, parentKey } = editingItem;
      let itemToEdit;
      if (parentKey) {
        const keys = parentKey.split('-');
        let current = newData;
        for (let i = 0; i < keys.length; i++) {
          current = current[keys[i]].items;
        }
        itemToEdit = current[key];
      } else {
        itemToEdit = newData[key];
      }
      itemToEdit.link = newLink;
      itemToEdit.icon = newIcon;
      if (key !== newName) {
        if (parentKey) {
          const keys = parentKey.split('-');
          let current = newData;
          for (let i = 0; i < keys.length; i++) {
            current = current[keys[i]].items;
          }
          current[newName] = itemToEdit;
          delete current[key];
        } else {
          newData[newName] = itemToEdit;
          delete newData[key];
        }
      }
      return newData;
    });
    setEditingItem(null);
  };

  const changeParent = (key: string, oldParentKey: string, newParentKey: string) => {
    setTreeData((prevData) => {
      const newData = JSON.parse(JSON.stringify(prevData))
      let item

      if (oldParentKey === "root") {
        item = { ...newData[key] }
        delete newData[key]
      } else {
        const oldKeys = oldParentKey.split('-')
        let oldCurrent = newData
        for (let i = 0; i < oldKeys.length; i++) {
          if (i === oldKeys.length - 1) {
            if (oldCurrent[oldKeys[i]]?.items) {
              item = { ...oldCurrent[oldKeys[i]].items[key] }
              delete oldCurrent[oldKeys[i]].items[key]
            }
          } else {
            oldCurrent = oldCurrent[oldKeys[i]]?.items || {}
          }
        }
      }

      if (item) {
        if (newParentKey === "root") {
          newData[key] = item
        } else {
          const newKeys = newParentKey.split('-')
          let newCurrent = newData
          for (let i = 0; i < newKeys.length; i++) {
            if (i === newKeys.length - 1) {
              if (!newCurrent[newKeys[i]].items) {
                newCurrent[newKeys[i]].items = {}
              }
              newCurrent[newKeys[i]].items[key] = item
            } else {
              newCurrent = newCurrent[newKeys[i]]?.items || {}
            }
          }
        }
      }

      return newData
    })
  }

  const renderTreeNodes = (nodes: TreeData | undefined, depth: number = 0, parentKey: string = '') => {
    if (!nodes) return null;
    
    return Object.entries(nodes).map(([key, node]) => {
      const fullKey = parentKey ? `${parentKey}-${key}` : key
      const isExpanded = expandedRows.has(fullKey)
      const hasChildren = node.items && Object.keys(node.items).length > 0

      return (
        <React.Fragment key={fullKey}>
          <TableRow>
            <TableCell className="relative">
              <div style={{ paddingLeft: `${depth * 20}px` }} className="flex items-center">
                {hasChildren && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mr-2"
                    onClick={() => toggleRow(fullKey)}
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                )}
                {depth > 0 && (
                  <div
                    className="absolute left-0 top-0 bottom-0 border-l border-gray-200"
                    style={{ left: `${(depth - 1) * 20 + 10}px` }}
                  />
                )}
                {key}
              </div>
            </TableCell>
            <TableCell>{node.link}</TableCell>
            <TableCell>
              <Album className="h-4 w-4" />
            </TableCell>
            <TableCell>
              <div className="flex space-x-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => editItem(key, parentKey)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>编辑项目</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <Input
                        placeholder="名称"
                        defaultValue={key}
                        onChange={(e) => setNewItemData({ ...newItemData, name: e.target.value })}
                      />
                      <Input
                        placeholder="链接"
                        defaultValue={node.link}
                        onChange={(e) => setNewItemData({ ...newItemData, link: e.target.value })}
                      />
                      <Select 
                        defaultValue={node.icon}
                        onValueChange={(value) => setNewItemData({ ...newItemData, icon: value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {newItemData.icon || node.icon ? (
                              <div className="flex items-center">
                                {React.createElement(
                                  (Icons as unknown as Record<string, React.ComponentType>)[newItemData.icon || node.icon] || Icons.HelpCircle,
                                  { className: "h-4 w-4 mr-2" } as React.SVGProps<SVGSVGElement>
                                )}
                                {newItemData.icon || node.icon}
                              </div>
                            ) : (
                              "选择图标"
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="h-[300px]">
                          <div className="grid grid-cols-10 gap-2 p-2">
                            {allIcons.map(iconName => {
                              const IconComponent = Icons[iconName as keyof typeof Icons] as React.ElementType;
                              return (
                                <SelectItem key={iconName} value={iconName} className="p-0">
                                  <div className="group relative flex items-center justify-center w-[50px] h-[50px] hover:bg-gray-50 rounded">
                                    <IconComponent className="h-8 w-8" />
                                    <span className="absolute bottom-[-20px] left-1/2 transform -translate-x-1/2 
                                      text-xs bg-gray-800 text-white px-2 py-1 rounded 
                                      opacity-0 group-hover:opacity-100 transition-opacity duration-200
                                      whitespace-nowrap z-50">
                                      {iconName}
                                    </span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </div>
                          {iconsLoading && (
                            <div className="p-2 text-center">加载中...</div>
                          )}
                          {iconsData?.total && allIcons.length < iconsData.total && (
                            <Button 
                              variant="ghost" 
                              className="w-full"
                              onClick={() => setPage(p => p + 1)}
                            >
                              加载更多
                            </Button>
                          )}
                        </SelectContent>
                      </Select>
                      <Button onClick={() => saveEdit(newItemData.name, newItemData.link, newItemData.icon)}>
                        保存
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" size="icon" onClick={() => deleteItem(key, parentKey)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Select onValueChange={(value) => changeParent(key, parentKey || "root", value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="移动到..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="root">根目录</SelectItem>
                    {renderMoveOptions(treeData, fullKey)}
                  </SelectContent>
                </Select>
              </div>
            </TableCell>
          </TableRow>
          {isExpanded && node.items && renderTreeNodes(node.items, depth + 1, fullKey)}
        </React.Fragment>
      )
    })
  }

  const renderMoveOptions = (nodes: TreeData | undefined, currentKey: string, parentKey: string = '', depth: number = 0) => {
    if (!nodes) return [];
    
    return Object.entries(nodes).flatMap(([key, node]) => {
      const fullKey = parentKey ? `${parentKey}-${key}` : key;
      if (fullKey === currentKey) return [];
      const options = [
        <SelectItem key={fullKey} value={fullKey}>
          <span className="inline-block" style={{ marginLeft: `${depth * 16}px` }}>
            {key}
          </span>
        </SelectItem>
      ];
      if (node.items) {
        options.push(...renderMoveOptions(node.items, currentKey, fullKey, depth + 1));
      }
      return options;
    });
  };

  return (
    <div className="space-y-4">
      <Dialog>
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            添加新项目
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加新项目</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              placeholder="名称"
              value={newItemData.name}
              onChange={(e) => setNewItemData({ ...newItemData, name: e.target.value })}
            />
            <Input
              placeholder="链接"
              value={newItemData.link}
              onChange={(e) => setNewItemData({ ...newItemData, link: e.target.value })}
            />
            <Select onValueChange={(value) => setNewItemData({ ...newItemData, icon: value })}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {newItemData.icon ? (
                    <div className="flex items-center">
                      {React.createElement(
                        (Icons as unknown as Record<string, React.ComponentType>)[newItemData.icon] || Icons.HelpCircle,
                        { className: "h-4 w-4 mr-2" } as React.SVGProps<SVGSVGElement>
                      )}
                      {newItemData.icon}
                    </div>
                  ) : (
                    "选择图标"
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="h-[300px]">
                <div className="grid grid-cols-10 gap-2 p-2">
                  {allIcons.map(iconName => {
                    const IconComponent = Icons[iconName as keyof typeof Icons] as React.ElementType;
                    return (
                      <SelectItem key={iconName} value={iconName} className="p-0">
                        <div className="group relative flex items-center justify-center w-[50px] h-[50px] hover:bg-gray-50 rounded">
                          <IconComponent className="h-8 w-8" />
                          <span className="absolute bottom-[-20px] left-1/2 transform -translate-x-1/2 
                            text-xs bg-gray-800 text-white px-2 py-1 rounded 
                            opacity-0 group-hover:opacity-100 transition-opacity duration-200
                            whitespace-nowrap z-50">
                            {iconName}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </div>
                {iconsLoading && (
                  <div className="p-2 text-center">加载中...</div>
                )}
                {iconsData?.total && allIcons.length < iconsData.total && (
                  <Button 
                    variant="ghost" 
                    className="w-full"
                    onClick={() => setPage(p => p + 1)}
                  >
                    加载更多
                  </Button>
                )}
              </SelectContent>
            </Select>
            <Select onValueChange={(value) => setNewItemData({ ...newItemData, parentKey: value })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择父类别" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">根目录</SelectItem>
                {renderMoveOptions(treeData, "")}
              </SelectContent>
            </Select>
            <Button onClick={() => addItem(newItemData.parentKey || 'root')}>添加</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名称</TableHead>
            <TableHead>链接</TableHead>
            <TableHead>图标</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {renderTreeNodes(treeData)}
        </TableBody>
      </Table>
      <Button onClick={() => pushNewTreeData()}>提交</Button>
      <div>
        <pre>{JSON.stringify(treeData, null, 2)}</pre>
      </div>
    </div>
  )
}


export default function Component() {
  return (
    <div className="container mx-auto py-10">
      <InteractiveTreeTable />
    </div>
  )
}
