import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const LoadingAnimation: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gt-background p-4">
      <div className="max-w-4xl w-full space-y-6">
        {/* 页面标题骨架 */}
        <div className="space-y-2">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
        </div>

        {/* 卡片网格骨架 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <Card key={index} className="overflow-hidden bg-gt-card text-gt-foreground rounded-gt shadow-gt border-gt-border font-gt tracking-gt">
              <CardHeader className="p-0">
                <Skeleton className="w-full h-48 rounded-t-gt" />
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 加载提示 */}
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 gpu-accelerated relative">
            <div className="w-16 h-16 border-4 border-gt-muted rounded-full"></div>
            <div className="absolute w-16 h-16 border-4 border-gt-foreground rounded-full border-t-transparent animate-spin will-change-transform"></div>
          </div>
          <p className="text-gt-muted-foreground font-gt tracking-gt">正在加载资源...</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingAnimation;
