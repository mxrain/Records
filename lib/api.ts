// 客户端数据获取函数(已废弃,请使用 RTK Query hooks)
// 历史遗留:此文件曾经混入服务端 GitHub Token 同步逻辑,已移除以避免密钥泄露风险。

import { ResourcesState, Resource } from '@/app/sys/add/types';

// 缓存数据类型
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// 添加一个简单的内存缓存
const cache: Record<string, CacheEntry<unknown>> = {};
const CACHE_DURATION = 60000; // 缓存时间，例如1分钟

/**
 * @deprecated 请使用 RTK Query hooks (useGetCategoriesQuery) 替代
 * 此函数将在后续版本中删除
 * @see app/store/api/categoriesApi.ts
 */
export async function fetchCategories() {
  const cacheKey = 'categories';
  const now = Date.now();
  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_DURATION) {
    return cache[cacheKey].data;
  }

  const res = await fetch('/api/categories');
  if (!res.ok) {
    throw new Error('Failed to fetch categories');
  }
  const data = await res.json();
  cache[cacheKey] = { data, timestamp: now };
  return data;
}

/**
 * @deprecated 请使用 RTK Query hooks (useGetResourcesQuery) 替代
 * 此函数将在后续版本中删除
 * @see app/store/api/resourcesApi.ts
 */
export async function fetchResources() {
  const cacheKey = 'resources';
  const now = Date.now();
  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_DURATION) {
    return cache[cacheKey].data;
  }

  const res = await fetch('/api/resources');
  if (!res.ok) {
    throw new Error('Failed to fetch resources');
  }
  const data = await res.json();
  cache[cacheKey] = { data, timestamp: now };
  return data;
}

/**
 * @deprecated 请使用 RTK Query hooks (useGetResourceByIdQuery) 替代
 * 此函数将在后续版本中删除
 * @see app/store/api/resourcesApi.ts
 */
export async function fetchResourceInfo(uuid: string) {
  const cacheKey = `resource_${uuid}`;
  const now = Date.now();
  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_DURATION) {
    return cache[cacheKey].data;
  }

  try {
    const res = await fetch(`/api/resources-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uuid }),
    });
    if (!res.ok) {
      throw new Error('获取资源信息失败');
    }
    const data = await res.json();
    cache[cacheKey] = { data, timestamp: now };
    return data;
  } catch (error) {
    console.error('获取资源信息时出错:', error);
    throw new Error('获取资源信息失败');
  }
}

/**
 * @deprecated 请使用 RTK Query hooks (useGetListItemsQuery) 替代
 * 此函数将在后续版本中删除
 * @see app/store/api/listApi.ts
 */
export async function fetchList() {
  const response = await fetch('/api/list', {
    cache: 'no-store',
    next: { revalidate: 0 }
  });
  if (!response.ok) {
    throw new Error('Failed to fetch list');
  }
  return response.json();
}
