import React, { useEffect, useRef, useState } from 'react';
import { X, ArrowUp, ArrowDown, Trash2, GithubIcon, ChevronDown, ChevronRight } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/app/store/store';
import { deleteChangeRecord, moveChangeRecord, syncToGithub } from '@/app/store/features/changeRecords/changeRecordsSlice';

interface ChangeHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangeHistoryDrawer: React.FC<ChangeHistoryDrawerProps> = ({ isOpen, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const changeRecords = useSelector((state: RootState) => state.changeRecords.records);
  const drawerRef = useRef<HTMLDivElement>(null);
  const [expandedItems, setExpandedItems] = useState<number[]>([]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const getBackgroundColor = (action: string) => {
    switch (action) {
      case 'add':
        return 'bg-green-100';
      case 'edit':
        return 'bg-yellow-100';
      case 'bulk':
        return 'bg-blue-100';
      default:
        return 'bg-gray-100';
    }
  };

  const handleDelete = (index: number) => {
    dispatch(deleteChangeRecord(index));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    dispatch(moveChangeRecord({ index, direction }));
  };

  const toggleExpand = (index: number) => {
    setExpandedItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const getActionSummary = (record: any) => {
    switch (record.action) {
      case 'add':
        return `添加资源: ${record.data?.title || record.data?.name || '未命名'}`;
      case 'edit':
        return `编辑资源: ${record.data?.title || record.data?.name || '未命名'}`;
      case 'bulk':
        return `批量操作: ${record.data?.operation || '未知操作'}`;
      default:
        return `${record.action} 操作`;
    }
  };

  const getFieldsSummary = (data: any) => {
    if (!data) return '无数据';
    const fields = Object.keys(data);
    return fields.length > 3 
      ? `${fields.slice(0, 3).join(', ')}...等${fields.length}个字段` 
      : fields.join(', ');
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div
        ref={drawerRef}
        className={`absolute bg-white shadow-lg rounded-tl-lg overflow-hidden flex flex-col transition-all duration-300 ease-in-out ${
          isOpen ? 'bottom-0 right-0 w-[80vw] h-[80vh]' : 'bottom-0 right-0 w-0 h-0'
        }`}
        style={{ maxWidth: '80vw', maxHeight: '80vh' }}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">变更历史</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-grow overflow-y-auto p-4 scrollbar-hide">
          {changeRecords.map((record, index) => (
            <div 
              key={index} 
              className={`mb-2 rounded-lg border ${getBackgroundColor(record.action)} hover:shadow-md transition-shadow`}
            >
              <div 
                className="flex items-center justify-between p-3 cursor-pointer"
                onClick={() => toggleExpand(index)}
              >
                <div className="flex items-center space-x-2">
                  {expandedItems.includes(index) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  <span className="font-medium">{getActionSummary(record)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{getFieldsSummary(record.data)}</span>
                  <div className="flex space-x-1">
                    <button onClick={(e) => { e.stopPropagation(); handleMove(index, 'up'); }} className="p-1 hover:bg-gray-200 rounded-full">
                      <ArrowUp size={16} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleMove(index, 'down'); }} className="p-1 hover:bg-gray-200 rounded-full">
                      <ArrowDown size={16} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(index); }} className="p-1 hover:bg-gray-200 rounded-full">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
              
              {expandedItems.includes(index) && (
                <div className="px-3 pb-3 border-t">
                  <pre className="text-sm overflow-x-auto mt-2">
                    {JSON.stringify(record.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t">
          <button 
            onClick={() => dispatch(syncToGithub())} 
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded flex items-center justify-center"
          >
            <GithubIcon className="mr-2" size={20} />
            同步到 GitHub
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangeHistoryDrawer;
