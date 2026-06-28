import React, { useState, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Resource } from '@/app/sys/add/types';

interface ResourceCardProps {
  uuid: string;
  resource?: Resource;
  isLoading?: boolean;
  showCategory?: boolean;
  showUpdateTime?: boolean;
  maxTags?: number;
}

const ResourceCard: React.FC<ResourceCardProps> = ({
  uuid,
  resource,
  isLoading = false,
  showCategory = true,
  showUpdateTime = false,
  maxTags = 3
}) => {
  const [imageError, setImageError] = useState(false);

  // 骨架屏加载状态
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="p-0">
          <Skeleton className="w-full h-48 rounded-t-lg" />
        </CardHeader>
        <CardContent className="p-4">
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </CardFooter>
      </Card>
    );
  }

  // 如果没有资源数据，返回 null
  if (!resource) return null;

  const { name, images, tags, introduction, category, update_time } = resource;

  // 处理标签显示
  const displayTags = Array.isArray(tags)
    ? tags.slice(0, maxTags)
    : Object.values(tags).slice(0, maxTags);

  return (
    <Link
      href={`/resource/${uuid}`}
      className="block h-full"
      aria-label={`查看 ${name} 的详细信息`}
    >
      <Card className="h-full transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
        <CardHeader className="p-0">
          <div className="relative aspect-video w-full">
            {imageError ? (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <span className="text-gray-400 text-sm">暂无图片</span>
              </div>
            ) : (
              <Image
                src={images?.[0] ?? ''}
                alt={name}
                fill
                className="object-cover rounded-t-lg"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                onError={() => setImageError(true)}
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold mb-2 line-clamp-2">{name}</h3>
          {showCategory && category && (
            <p className="text-sm text-muted-foreground mb-2">{category}</p>
          )}
          <p className="text-sm text-gray-600 line-clamp-2">{introduction}</p>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {displayTags.map((tag: string, index: number) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          {showUpdateTime && update_time && (
            <p className="text-xs text-gray-500">
              更新时间：{new Date(update_time).toLocaleDateString()}
            </p>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
};

export default memo(ResourceCard);