'use client';

import type React from "react";
import { useState, useEffect } from "react";
import Turnstile from 'react-turnstile';
import { useToast } from "@/components/ui/use-toast";

// 占位符组件
const Card = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={`border rounded-md shadow-sm ${className}`}>{children}</div>
);
const CardHeader = ({ children }: { children: React.ReactNode }) => <div className="p-4">{children}</div>;
const CardTitle = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>
);
const CardContent = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={`p-4 ${className}`}>{children}</div>
);
const CardFooter = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={`p-4 ${className}`}>{children}</div>
);
const Input = ({ type, placeholder, value, onChange, className }: { type?: string; placeholder: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; className?: string }) => (
  <input
    type={type}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    className={`border rounded-md p-2 w-full ${className}`}
  />
);
const Button = ({ type, className, children, disabled }: { 
  type: "submit"; 
  className?: string; 
  children: React.ReactNode;
  disabled?: boolean;
}) => (
  <button 
    type={type} 
    className={`bg-blue-500 text-white rounded-md p-2 hover:bg-blue-700 ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    disabled={disabled}
  >
    {children}
  </button>
);

export default function SimpleLogin() {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // 清除错误提示
  useEffect(() => {
    if (password && turnstileToken) {
      const toasts = document.querySelectorAll('[data-sonner-toast]');
      toasts.forEach(toast => toast.remove());
    }
  }, [password, turnstileToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      toast({
        title: "请输入密码",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    if (!turnstileToken) {
      toast({
        title: "请完成人机验证",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);
    try {
      // 实际登录请求
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password, turnstileToken }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '登录失败');
      }
      
      const data = await response.json();
      if (data.success) {
        setSuccess(true);
        toast({
          title: "登录成功",
          variant: "default",
          duration: 3000,
        });
        // 登录成功后跳转到管理页面
        window.location.href = '/sys';
      } else {
        throw new Error(data.message || '登录失败');
      }
    } catch (err) {
      toast({
        title: "登录失败",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full text-lg p-3 bg-white" // Added bg-white
              />
            </div>

            {/* 人机验证占位区域 */}
            <Turnstile
                sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
                onSuccess={(token) => {
                  setTurnstileToken(token);
                }}
              />
          </CardContent>

          <CardFooter>
            <Button 
              type="submit" 
              className="w-full bg-gray-900 hover:bg-gray-800"
              disabled={isLoading}
            >
              {isLoading ? "检查..." : "进入"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
