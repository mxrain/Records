import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// 站点配置类型(与 lib/data/settings.ts 保持一致)
export interface SocialLink {
  platform: string;
  icon: string;
  link: string;
  qr_code: string;
  info: string;
}

export interface SiteSettings {
  site_name?: string;
  site_title_seo?: string;
  site_description_seo?: string;
  favicon_url?: string;
  copyright_text?: string;
  copyright_year_start?: number;
  social_links?: SocialLink[];
}

export const settingsApi = createApi({
  reducerPath: 'settingsApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Settings'],
  endpoints: (builder) => ({
    getSiteSettings: builder.query<SiteSettings, void>({
      query: () => '/settings',
      providesTags: ['Settings'],
      extraOptions: {
        staleTime: 5 * 60 * 1000, // 5 分钟
      },
    }),
  }),
});

export const { useGetSiteSettingsQuery } = settingsApi;
