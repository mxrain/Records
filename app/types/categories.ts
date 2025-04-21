// 定义类别的接口
export interface CategoryData {
  link?: string;
  icon?: string;
  items?: { [key: string]: CategoryData };
  [key: string]: any;
} 