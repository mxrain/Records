import React, { useState, useRef } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../../store/store'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'
import DataTable from '@/components/ui/data-table'
import Draggable from 'react-draggable' // 确保已导入

const DebugWindow: React.FC = () => {
  const storeData = useSelector((state: RootState) => state)
  const [width, setWidth] = useState(600) // 将初始宽度从 300 增加到 600
  const [height, setHeight] = useState(600) // 新增初始高度
  const [collapsed, setCollapsed] = useState(true) // 默认收起
  const resizerRef = useRef<HTMLDivElement>(null)
  const isResizing = useRef(false)

  const startResizing = (e: React.MouseEvent) => {
    isResizing.current = true
    document.addEventListener('mousemove', resize)
    document.addEventListener('mouseup', stopResizing)
  }

  const resize = (e: MouseEvent) => {
    if (isResizing.current && resizerRef.current) {
      const newWidth = e.clientX - resizerRef.current.getBoundingClientRect().left
      const newHeight = e.clientY - resizerRef.current.getBoundingClientRect().top
      if (newWidth > 300 && newWidth < 1200) { // 增大最小和最大宽度限制
        setWidth(newWidth)
      }
      if (newHeight > 300 && newHeight < 1000) { // 新增高度调整限制
        setHeight(newHeight)
      }
    }
  }

  const stopResizing = () => {
    isResizing.current = false
    document.removeEventListener('mousemove', resize)
    document.removeEventListener('mouseup', stopResizing)
  }

  const toggleCollapse = () => {
    setCollapsed(!collapsed)
  }

  const showDebugWindow = () => {
    setCollapsed(false)
  }

  const hideDebugWindow = () => {
    setCollapsed(true)
  }

  return (
    <>
      {collapsed ? (
        <Button
          className="fixed bottom-5 right-5 z-[1001]"
          onClick={showDebugWindow}
        >
          显示调试窗口
        </Button>
      ) : (
        <Draggable handle=".drag-handle">
          <div
            className={`fixed bottom-5 right-5 h-[600px] max-w-[90%] min-w-[300px] bg-white border border-[#ddd] rounded-lg transition-[width,height] duration-300 z-[1000] shadow-[0_4px_6px_rgba(0,0,0,0.1)] ${collapsed ? 'hidden' : ''}`}
            style={{ width, height }} // 应用宽度和高度
          >
            <Card className="h-full bg-white border overflow-auto p-4 shadow-lg">
              <CardHeader className="flex justify-between items-center drag-handle cursor-move">
                <h2 className="text-xl font-bold">调试窗口</h2>
                <Button variant="ghost" size="sm" onClick={toggleCollapse} className="p-0">
                  {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </Button>
              </CardHeader>
              {!collapsed && (
                <CardContent>
                  <DataTable data={storeData} />
                </CardContent>
              )}
            </Card>
            {!collapsed && (
              <div
                ref={resizerRef}
                className="absolute bottom-0 right-0 w-2.5 h-2.5 cursor-nwse-resize bg-[#ddd] z-10 hover:bg-[#bbb]"
                onMouseDown={startResizing}
              />
            )}
            <Button
              className="absolute top-2.5 right-2.5"
              onClick={hideDebugWindow}
            >
              关闭调试窗口
            </Button>
          </div>
        </Draggable>
      )}
    </>
  )
}

export default DebugWindow
