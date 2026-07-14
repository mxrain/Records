import { useGetResourcesQuery } from '@/app/store/api/resourcesApi';
import ResourceCard from '@/components/ui/resource-card';
import { FiAlertCircle, FiInbox } from 'react-icons/fi';

const ResourceList = () => {
  const { data: resources, isLoading, isError } = useGetResourcesQuery();

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1400px] grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6 p-6 max-[1024px]:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] max-[1024px]:gap-5 max-[1024px]:p-5 max-[768px]:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] max-[768px]:gap-4 max-[768px]:p-4 max-[480px]:grid-cols-1 max-[480px]:gap-4 max-[480px]:p-4">
        {[...Array(8)].map((_, index) => (
          <ResourceCard key={index} uuid={`loading-${index}`} isLoading={true} />
        ))}
      </div>
    );
  }

  if (isError) return (
    <div className="flex flex-col items-center justify-center h-[300px] text-center p-5">
      <FiAlertCircle className="text-[3rem] text-gt-muted mb-4" />
      <p className="text-[1.125rem] text-gt-muted-foreground font-gt">加载出错，请稍后重试</p>
    </div>
  );

  if (!resources || Object.keys(resources).length === 0) return (
    <div className="flex flex-col items-center justify-center h-[300px] text-center p-5">
      <FiInbox className="text-[3rem] text-gt-muted mb-4" />
      <p className="text-[1.125rem] text-gt-muted-foreground font-gt">暂无资源</p>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1400px] grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6 p-6 max-[1024px]:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] max-[1024px]:gap-5 max-[1024px]:p-5 max-[768px]:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] max-[768px]:gap-4 max-[768px]:p-4 max-[480px]:grid-cols-1 max-[480px]:gap-4 max-[480px]:p-4">
      {Object.entries(resources).map(([key, resource]) => (
        <ResourceCard key={key} uuid={key} resource={resource} />
      ))}
    </div>
  );
};

export default ResourceList;
