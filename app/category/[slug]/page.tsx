'use client'

import React, { useMemo, useState, use } from 'react';
import ResourceCard from '@/components/ui/resource-card';
import { Skeleton } from "@/components/ui/skeleton";
import { Resource } from '@/app/sys/add/types';
import Link from 'next/link';
import { Card, CardContent } from "@/components/ui/card";
import { useGetCategoriesQuery } from '@/app/store/api/categoriesApi';
import { useGetResourcesQuery } from '@/app/store/api/resourcesApi';
import { ChevronRight, FolderOpen, FileText, Grid, List } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface Category {
  link: string;
  items?: Record<string, Category>;
}

const findCategoryPath = (categories: Record<string, Category>, slug: string): string[] => {
  if (categories[slug]) return [slug];

  for (const [key, value] of Object.entries(categories)) {
    if (value.link === `/${slug}/` || value.link === `/${slug}` || value.link === slug) {
      return [key];
    }
    if (value.items) {
      const subPath = findCategoryPath(value.items, slug);
      if (subPath.length > 0) {
        return [key, ...subPath];
      }
    }
  }
  return [];
};

export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  // Next.js 15: params is a Promise
  const { slug } = use(params);

  const { data: categories, isLoading: isCategoriesLoading, isError: isCategoriesError } = useGetCategoriesQuery();
  const { data: resources, isLoading: isResourcesLoading, isError: isResourcesError } = useGetResourcesQuery();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const categoryPath = useMemo(() =>
    categories ? findCategoryPath(categories as Record<string, Category>, slug) : []
    , [categories, slug]);

  const currentCategory = categoryPath.length > 0 ? categoryPath[categoryPath.length - 1] : slug;
  const currentCategoryData = categories?.[currentCategory] as Category | undefined;

  const filteredResources = useMemo(() => {
    if (!resources) return [];

    const categoryString = categoryPath.join(' > ');

    return Object.entries(resources)
      .filter(([, resource]: [string, Resource]) =>
        resource.category === categoryString ||
        resource.category.startsWith(categoryString + ' > ') ||
        (categoryPath.length === 1 && resource.category.startsWith(currentCategory))
      )
      .map(([uuid, resource]) => ({ ...resource, uuid }));
  }, [resources, categoryPath, currentCategory]);

  const showSubcategories = !isResourcesLoading && filteredResources.length === 0 && !!currentCategoryData?.items;
  const subcategoryCount = currentCategoryData?.items ? Object.keys(currentCategoryData.items).length : 0;

  const isLoading = isCategoriesLoading || isResourcesLoading;

  if (isCategoriesError) return <div>加载分类时出错</div>;
  if (isResourcesError) return <div>加载资源时出错</div>;

  // 拆分渲染逻辑以避免复杂的嵌套三元表达式错误
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className={viewMode === 'grid'
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          : "space-y-4"
        }>
          {[...Array(6)].map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <Skeleton className="w-full h-48" />
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (showSubcategories) {
      return (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <FolderOpen className="w-6 h-6" />
            子分类
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(currentCategoryData!.items!).map(([key, value]) => (
              <Link key={key} href={`/category${value.link}`}>
                <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 border-transparent hover:border-primary/20">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <FolderOpen className="w-5 h-5 text-primary" />
                      </div>
                      <p className="text-lg font-semibold group-hover:text-primary transition-colors">{key}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      );
    }

    // Default: Resource List
    return (
      <>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            资源列表
          </h2>
          {filteredResources.length > 0 && (
            <div className="text-sm text-muted-foreground">
              共 {filteredResources.length} 个资源
            </div>
          )}
        </div>

        {filteredResources.length > 0 ? (
          <div className={viewMode === 'grid'
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
          }>
            {filteredResources.map(({ uuid, ...resource }) => (
              <ResourceCard
                key={uuid}
                resource={resource}
                uuid={uuid}
              />
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <p className="text-lg text-muted-foreground mb-2">该分类下暂无资源</p>
              <p className="text-sm text-muted-foreground/70">请尝试选择其他分类</p>
            </CardContent>
          </Card>
        )}
      </>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 mt-20 max-w-7xl">
      {/* 面包屑导航 */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-primary transition-colors">
          首页
        </Link>
        {categoryPath.map((category, index) => (
          <React.Fragment key={index}>
            <ChevronRight className="w-4 h-4" />
            <Link
              href={`/category/${category}`}
              className={index === categoryPath.length - 1
                ? "text-foreground font-medium"
                : "hover:text-primary transition-colors"
              }
            >
              {category}
            </Link>
          </React.Fragment>
        ))}
      </nav>

      {/* 分类标题和统计信息 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold text-foreground">
            {currentCategory}
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              aria-label="网格视图"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              aria-label="列表视图"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>{filteredResources.length} 个资源</span>
          </div>
          {subcategoryCount > 0 && (
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              <span>{subcategoryCount} 个子分类</span>
            </div>
          )}
        </div>
      </div>

      {renderContent()}
    </div>
  );
}
