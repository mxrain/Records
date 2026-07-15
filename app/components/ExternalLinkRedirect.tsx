'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, ArrowLeft, Loader2 } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

interface ExternalLinkRedirectProps {
  href: string;
}

type MotionComponent = React.ComponentType<any>;

const MotionDiv: MotionComponent = motion.div;
const MotionSpan: MotionComponent = motion.span;

const ExternalLinkRedirect: React.FC<ExternalLinkRedirectProps> = ({ href }) => {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // 安全校验:仅允许 http/https 协议,拒绝 javascript:/data:/vbscript: 等危险协议(防 XSS)
  const safeHref = (() => {
    try {
      const u = new URL(href, window.location.origin);
      if (u.protocol === 'http:' || u.protocol === 'https:') return href;
      return null;
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    if (!safeHref) return;
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.href = safeHref;
      }
    }, 3000);

    const interval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 33.33, 100));
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [safeHref]);

  const handleImmediateRedirect = () => {
    if (!safeHref) return;
    setShowConfetti(true);
    setTimeout(() => {
      window.location.href = safeHref;
    }, 1000);
  };

  if (!safeHref) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-300">
        <div className="w-full max-w-md px-4">
          <div className="bg-white rounded-lg shadow-lg border border-red-200 p-6 text-center">
            <p className="text-red-600 font-semibold mb-2">无效的链接</p>
            <p className="text-sm text-gray-600 mb-4">该链接协议不被允许,已阻止跳转以保障安全。</p>
            <Button variant="outline" onClick={() => router.back()} className="border-black text-black hover:bg-gray-100">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回上一页
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const confettiParticles = useMemo(() => 
    Array.from({ length: 50 }, (_, i) => ({
      key: i,
      initial: { 
        top: "50%", 
        left: "50%", 
        scale: 0 
      },
      animate: { 
        top: `${Math.random() * 100}%`, 
        left: `${Math.random() * 100}%`, 
        scale: [0, 1, 0] as [number, number, number],
        opacity: [1, 1, 0] as [number, number, number]
      },
      transition: { duration: shouldReduceMotion ? 0 : 1, ease: "easeOut" as const }
    })), [shouldReduceMotion]
  );

  const cardTransition = { duration: shouldReduceMotion ? 0 : 0.5 };
  const progressTransition = { duration: shouldReduceMotion ? 0 : 3, ease: "linear" as const };
  const fadeTransition = { duration: shouldReduceMotion ? 0 : 0.5, delay: shouldReduceMotion ? 0 : 0.2 };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-300">
      <MotionDiv
        initial={{ scale: shouldReduceMotion ? 1 : 0.9, opacity: shouldReduceMotion ? 1 : 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={cardTransition}
        className="w-full max-w-md px-4"
      >
        <Card className="overflow-hidden shadow-lg border border-gray-200">
          <CardHeader className="bg-black text-white">
            <CardTitle className="text-2xl font-bold">正在跳转到外部链接</CardTitle>
            <CardDescription className="text-gray-300">您即将离开本站，前往以下地址：</CardDescription>
          </CardHeader>
          <CardContent className="mt-6 space-y-4">
            <p className="text-sm text-gray-800 break-all p-3 bg-gray-100 rounded-md border border-gray-200">
              {href}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">自动跳转倒计时：</span>
              <MotionDiv
                initial={{ opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={fadeTransition}
              >
                <Loader2 className="animate-spin text-gray-500" />
              </MotionDiv>
            </div>
            <MotionDiv
              className="h-2 bg-gray-200 rounded-full overflow-hidden"
              initial={{ width: shouldReduceMotion ? 100 : 0 }}
              animate={{ width: '100%' }}
              transition={progressTransition}
            >
              <MotionSpan
                className="h-full bg-black block will-change-transform"
                style={{ width: `${progress}%` }}
              />
            </MotionDiv>
          </CardContent>
          <CardFooter className="flex justify-between mt-4">
            <Button variant="outline" onClick={handleImmediateRedirect} className="flex-1 mr-2 border-black text-black hover:bg-gray-100">
              <ExternalLink className="mr-2 h-4 w-4" />
              立即跳转
            </Button>
            <Button variant="ghost" onClick={() => router.back()} className="flex-1 ml-2 text-gray-600 hover:text-black hover:bg-gray-100">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回上一页
            </Button>
          </CardFooter>
        </Card>
      </MotionDiv>
      <AnimatePresence>
        {showConfetti && (
          <MotionDiv
            className="fixed inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {confettiParticles.map((particle) => (
              <MotionDiv
                key={particle.key}
                className="absolute w-2 h-2 bg-gray-800 rounded-full will-change-transform"
                initial={particle.initial}
                animate={particle.animate}
                transition={particle.transition}
              />
            ))}
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExternalLinkRedirect;
