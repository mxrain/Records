import React from 'react';
import { useGetAllIconsQuery } from '@/app/store/features/icons/iconsApi';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectLabel, SelectItem } from "@/components/ui/select";

const IconSelector: React.FC<{ value: string; onChange: (value: string) => void }> = ({ value, onChange }) => {
  const { data: icons, isLoading, isError } = useGetAllIconsQuery();

  if (isLoading) return <div>加载中...</div>;
  if (isError) return <div>加载图标失败</div>;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-40">
        <SelectValue placeholder="选择图标" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>图标</SelectLabel>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {icons?.map((icon) => (
              <SelectItem key={icon} value={icon}>
                {icon}
              </SelectItem>
            ))}
          </div>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export default IconSelector;
