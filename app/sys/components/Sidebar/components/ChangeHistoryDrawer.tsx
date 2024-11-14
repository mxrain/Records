import React, { useEffect, useRef } from 'react';
import { X, ArrowUp, ArrowDown, Trash2, GithubIcon } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/app/store/store';
import { deleteChangeRecord, moveChangeRecord, syncToGithub2 } from '@/app/store/features/changeRecords/changeRecordsSlice';
import { log } from 'console';


interface ChangeHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangeHistoryDrawer: React.FC<ChangeHistoryDrawerProps> = ({ isOpen, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const changeRecords = useSelector((state: RootState) => state.changeRecords.records);
  const drawerRef = useRef<HTMLDivElement>(null);

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

  const handleSyncToGithub = async () => {
    // await dispatch(syncToGithub());
  };

  const handleTest = async () => {
    await dispatch(syncToGithub2());
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div
        ref={drawerRef}
        className={`absolute bg-white shadow-lg rounded-tl-lg overflow-hidden flex flex-col transition-all duration-300 ease-in-out ${isOpen ? 'bottom-0 right-0 w-[80vw] h-[80vh]' : 'bottom-0 right-0 w-0 h-0'
          }`}
        style={{
          maxWidth: '80vw',
          maxHeight: '80vh',
        }}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">变更历史</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
            <X size={24} />
          </button>
        </div>
        <div className="flex-grow overflow-y-auto p-4 scrollbar-hide">
          {changeRecords.map((record, index) => (
            <div key={index} className={`mb-4 p-3 rounded-lg ${getBackgroundColor(record.action)}`}>
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold">{record.action === 'bulk' ? `${record.data.operation}` : record.action}</span>
                <div>
                  <button onClick={() => handleMove(index, 'up')} className="p-1 hover:bg-gray-200 rounded-full mr-1">
                    <ArrowUp size={16} />
                  </button>
                  <button onClick={() => handleMove(index, 'down')} className="p-1 hover:bg-gray-200 rounded-full mr-1">
                    <ArrowDown size={16} />
                  </button>
                  <button onClick={() => handleDelete(index)} className="p-1 hover:bg-gray-200 rounded-full">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <pre className="text-sm overflow-x-auto">{JSON.stringify(record.data, null, 2)}</pre>
            </div>
          ))}
          <div>
            <pre>{JSON.stringify(changeRecords, null, 2)}</pre>
          </div>
        </div>

        <div className="p-4 border-t">
          <button onClick={handleSyncToGithub} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded flex items-center justify-center">
            <GithubIcon className="mr-2" size={20} />
            同步到 GitHub
          </button>
          <button onClick={handleTest} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded flex items-center justify-center">
            <GithubIcon className="mr-2" size={20} />
            test
          </button>
        </div>


      </div>

    </div>
  );
};

export default ChangeHistoryDrawer;
