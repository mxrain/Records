import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '@/app/store/store';

// 首先定义 ChangeRecord 类型
export interface ChangeRecord {
  action: 'add' | 'edit' | 'delete' | 'bulk';
  uuid?: string;  // 对于 add/edit/delete 操作需要
  data?: any;     // 对于 add/edit/bulk 操作需要
}

interface ChangeRecordsState {
  records: ChangeRecord[];
  syncStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  selectedRecords: number[]; // 用于批量操作的选中记录索引
}

const initialState: ChangeRecordsState = {
  records: [],
  syncStatus: 'idle',
  error: null,
  selectedRecords: [],
};

const changeRecordsSlice = createSlice({
  name: 'changeRecords',
  initialState,
  reducers: {
    // 添加变更记录
    addChangeRecord: (state, action: PayloadAction<ChangeRecord>) => {
      state.records.push(action.payload);
    },
    // 删除变更记录
    deleteChangeRecord: (state, action: PayloadAction<number>) => {
      state.records.splice(action.payload, 1);
    },
    // 移动变更记录的位置
    moveChangeRecord: (state, action: PayloadAction<{ index: number; direction: 'up' | 'down' }>) => {
      const { index, direction } = action.payload;
      // 如果方向是向上移动，且当前索引大于0（不是第一个元素）
      if (direction === 'up' && index > 0) {
        // 交换当前元素和它上面的元素
        [state.records[index - 1], state.records[index]] = [state.records[index], state.records[index - 1]];
      }
      // 如果方向是向下移动，且当前索引小于数组最后一个元素的索引
      else if (direction === 'down' && index < state.records.length - 1) {
        // 交换当前元素和它下面的元素
        [state.records[index], state.records[index + 1]] = [state.records[index + 1], state.records[index]];
      }
      // 如果不满足上述条件（例如，已经是第一个或最后一个元素），则不进行任何操作
    },
    // 清空所有变更记录
    clearChangeRecords: (state) => {
      state.records = [];
    },
    // 编辑变更记录
    editChangeRecord: (
      state,
      action: PayloadAction<{ index: number; updatedRecord: Partial<ChangeRecord> }>
    ) => {
      const { index, updatedRecord } = action.payload;
      state.records[index] = { ...state.records[index], ...updatedRecord };
    },
    // 切换变更记录的选中状态
    toggleRecordSelection: (state, action: PayloadAction<number>) => {
      const index = state.selectedRecords.indexOf(action.payload);
      if (index === -1) {
        state.selectedRecords.push(action.payload);
      } else {
        state.selectedRecords.splice(index, 1);
      }
    },

    // 删除选中的变更记录
    deleteSelectedRecords: (state) => {
      // 从大到小排序，以避免删除时索引变化的问题
      const sortedIndices = [...state.selectedRecords].sort((a, b) => b - a);
      sortedIndices.forEach(index => {
        state.records.splice(index, 1);
      });
      state.selectedRecords = [];
    },
    // 设置同步状态
    setSyncStatus: (
      state,
      action: PayloadAction<{ status: 'idle' | 'loading' | 'succeeded' | 'failed'; error?: string }>
    ) => {
      state.syncStatus = action.payload.status;
      state.error = action.payload.error || null;
    },
  },
});

export const {
  addChangeRecord,
  deleteChangeRecord,
  moveChangeRecord,
  clearChangeRecords,
  editChangeRecord,
  toggleRecordSelection,
  deleteSelectedRecords,
  setSyncStatus,
} = changeRecordsSlice.actions;


const fetchFileSha = async (owner: string, repo: string, path: string): Promise<string> => {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const response = await fetch(apiUrl, {
    headers: {
      'Authorization': `token ${process.env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error('获取文件 SHA 失败');
  }

  const data = await response.json();
  return data.sha;
};

export const syncToGithub = createAsyncThunk(
  'changeRecords/syncToGithub',
  async (_, { getState, dispatch }) => {
    const state = getState() as RootState;

    // 检查是否有变更记录
    if (state.changeRecords.records.length === 0) {
      throw new Error('没有需要同步的变更记录');
    }

    try {
      // 处理每个变更记录
      const promises = state.changeRecords.records.map(async (change) => {
        if (!change.uuid) {
          console.error('变更记录缺少 UUID:', change);
          return;
        }

        switch (change.action) {
          case 'add':
            try {
                // 1. 首先创建独立的 JSON 文件
                const fileContent = JSON.stringify(change.data, null, 2);
                const createFileResponse = await fetch('/api/github/createFile', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        path: `${change.uuid}.json`,
                        content: fileContent,
                    })
                });

                if (!createFileResponse.ok) {
                    const errorData = await createFileResponse.json();
                    throw new Error(errorData.error || `创建文件 ${change.uuid}.json 失败`);
                }

                // 2. 然后更新 resources.json
                const addResourceResponse = await fetch('/api/github/addResource', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        uuid: change.uuid,
                        data: change.data
                    })
                });

                if (!addResourceResponse.ok) {
                    const errorData = await addResourceResponse.json();
                    throw new Error(errorData.error || `更新 resources.json 失败`);
                }

                return {
                    file: await createFileResponse.json(),
                    resource: await addResourceResponse.json()
                };
            } catch (error) {
                console.error(`处理变更记录 ${change.uuid} 时出错:`, error);
                throw error;
            }
          case 'edit':
            
            try {
              // 1. 更新独立的 JSON 文件
              const fileContent = JSON.stringify(change.data, null, 2);
              const updateFileResponse = await fetch('/api/github/updateFile', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  path: `${change.uuid}.json`,
                  content: fileContent,
                })
              });

              if (!updateFileResponse.ok) {
                const errorData = await updateFileResponse.json();
                throw new Error(errorData.error || `更新文件 ${change.uuid}.json 失败`);
              }

              // 2. 更新 resources.json
              const updateResourceResponse = await fetch('/api/github/addResource', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  uuid: change.uuid,
                  data: change.data,
                  isEdit: true // 标记这是一个编辑操作
                })
              });

              if (!updateResourceResponse.ok) {
                const errorData = await updateResourceResponse.json();
                throw new Error(errorData.error || `更新 resources.json 失败`);
              }

              return {
                file: await updateFileResponse.json(),
                resource: await updateResourceResponse.json()
              };
            } catch (error) {
              console.error(`处理编辑记录 ${change.uuid} 时出错:`, error);
              throw error;
            }
          default:
            break;
        }
      });

      // 等待所有请求完成
      await Promise.all(promises.filter(p => p)); // 过滤掉 undefined

      // 同步成功后，清空变更记录
      dispatch(clearChangeRecords());

      return { success: true };

    } catch (error) {
      console.error('GitHub 同步错误:', error);
      throw error;
    }
  }
);



export default changeRecordsSlice.reducer;
