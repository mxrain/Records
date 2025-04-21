import { useState, useEffect } from 'react'
import Image from 'next/image'
import { format, formatDistanceToNow } from 'date-fns'
import { Star, Download, MessageSquare, ExternalLink, Copy, Eye, Calendar, Info, Link as LinkIcon, FileText, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react'

import { motion, AnimatePresence } from 'framer-motion' // 新增：用于动画效果

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip" // 新增：用于提示

import { Resource } from '@/app/sys/add/types'
import { fetchResourceInfo } from '@/lib/api'
import ResourceSkeleton from './ResourceSkeleton'
import Link from 'next/link'
import { cn } from "@/lib/utils"

interface ResourceDetailProps {
    uuid: string;
}

const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const href = e.currentTarget.href;
    if (href.startsWith('http') && !href.includes(window.location.hostname)) {
      if (typeof window !== 'undefined') { // 添加检查
        window.location.href = `/external-redirect?url=${encodeURIComponent(href)}`;
      }
    } else {
      if (typeof window !== 'undefined') { // 添加检查
        window.location.href = href;
      }
    }
};

// 在组件顶部添加一个新的函数来处理toast
const showToast = (title: string, description: string) => {
  toast({
    title,
    description,
    className: "sm:max-w-[90vw] md:max-w-[350px]", // 添加这一行
  });
};

export default function ResourceDetail({ uuid }: ResourceDetailProps) {
    const [resource, setResource] = useState<Resource | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const [isImageModalOpen, setIsImageModalOpen] = useState(false)

    const [imageLoaded, setImageLoaded] = useState<boolean[]>([]);
    const [skeletonColors, setSkeletonColors] = useState<string[]>([]);

    useEffect(() => {
        const fetchResource = async () => {
            try {
                const data = await fetchResourceInfo(uuid);
                setResource(data);
            } catch (error) {
                console.error('获取资源详情时出错:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchResource();
    }, [uuid]);

    useEffect(() => {
        if (resource) {
            setImageLoaded(new Array(resource.images.length).fill(false));
            setSkeletonColors(resource.images.map(() => getRandomColor()));
        }
    }, [resource]);

    const getRandomColor = () => {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    };

    if (loading) {
        return <ResourceSkeleton />;
    }

    if (!resource) {
        return <div className="text-center p-4">资源未找到</div>;
    }

    const nextImage = () => {
        setCurrentImageIndex((prevIndex) =>
            prevIndex === resource.images.length - 1 ? 0 : prevIndex + 1
        )
    }

    const prevImage = () => {
        setCurrentImageIndex((prevIndex) =>
            prevIndex === 0 ? resource.images.length - 1 : prevIndex - 1
        )
    }

    const copyToClipboard = async (text: string, description: string) => {
        try {
            await navigator.clipboard.writeText(text);
            showToast("已复制", description);
        } catch (err) {
            console.error('复制失败:', err);
            showToast("复制失败", "请手动复制内容");
        }
    }

    const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        const href = e.currentTarget.href;
        if (href.startsWith('http') && !href.includes(window.location.hostname)) {
            if (typeof window !== 'undefined') { // 添加检查
                window.location.href = `/external-redirect?url=${encodeURIComponent(href)}`;
            }
        } else {
            if (typeof window !== 'undefined') { // 添加检查
                window.location.href = href;
            }
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="container mx-auto px-4 py-8"
        >
            <Card className="rounded-lg overflow-hidden bg-white border-transparent shadow-md">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 p-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                        <div>
                            <CardTitle className="text-3xl font-bold mb-2 text-gray-800">{resource.name}</CardTitle>
                            <CardDescription className="text-gray-600 text-lg">{resource.category}</CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 mt-4 md:mt-0">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center space-x-2 bg-white rounded-full px-4 py-2 shadow-sm">
                                            <Star className="h-5 w-5 text-yellow-500" />
                                            <span className="text-gray-700 font-medium">{resource.rating}</span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="text-sm">资源评分</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center space-x-2 bg-white rounded-full px-4 py-2 shadow-sm">
                                            <Download className="h-5 w-5 text-blue-500" />
                                            <span className="text-gray-700 font-medium">10</span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="text-sm">下载次数</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center space-x-2 bg-white rounded-full px-4 py-2 shadow-sm">
                                            <MessageSquare className="h-5 w-5 text-green-500" />
                                            <span className="text-gray-700 font-medium">{resource.comments}</span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="text-sm">评论数</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 bg-gray-50">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="relative w-full h-[300px] mb-6 overflow-hidden rounded-lg"
                    >
                        <div
                            className={cn(
                                "absolute inset-0 transition-opacity duration-300",
                                imageLoaded[currentImageIndex] ? "opacity-0" : "opacity-100"
                            )}
                            style={{ backgroundColor: skeletonColors[currentImageIndex] }}
                        />
                        <Image
                            src={resource.images[currentImageIndex]}
                            alt={`${resource.name} - 图片`}
                            fill
                            className={cn(
                                "rounded-lg transition-opacity duration-300 object-cover",
                                imageLoaded[currentImageIndex] ? "opacity-100" : "opacity-0"
                            )}
                            onLoad={() => {
                                const newImageLoaded = [...imageLoaded];
                                newImageLoaded[currentImageIndex] = true;
                                setImageLoaded(newImageLoaded);
                            }}
                        />
                        <div className="absolute inset-0 flex items-center justify-between p-4">
                            <Button onClick={prevImage} variant="ghost" size="icon" className="bg-black bg-opacity-50 text-white">
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                            <Button onClick={nextImage} variant="ghost" size="icon" className="bg-black bg-opacity-50 text-white">
                                <ChevronRight className="h-6 w-6" />
                            </Button>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-wrap gap-2 mb-4"
                    >
                        {resource.tags.map((tag: any, index: number) => (
                            <Badge key={index} variant="secondary" className="animate-pulse">{tag}</Badge>
                        ))}
                    </motion.div>

                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                            <Download className="mr-2" /> 网盘资源
                        </h3>
                        {Object.entries(resource.source_links).map(([source, info]) => (
                            <Card key={source} className="mb-4 p-4 transition-all duration-300 cursor-pointer border-transparent bg-gray-100 shadow-none"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <p className="font-bold text-lg">{source}</p>
                                    <p className="text-sm text-muted-foreground">大小：{info.size}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="relative flex-grow group">
                                        <Input
                                            value={info.link}
                                            readOnly
                                            className="pr-10"
                                            onClick={() => copyToClipboard(info.link, "链接已复制到剪贴板")}
                                        />
                                        <Button
                                            className="absolute right-0 top-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => copyToClipboard(info.link, "链接已复制到剪贴板")}
                                            size="icon"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {info.psw && (
                                        <div className="relative w-24 group">
                                            <Input
                                                value={info.psw}
                                                readOnly
                                                className="pr-10"
                                                onClick={() => copyToClipboard(info.psw, "密码已复制到剪贴板")}
                                            />
                                            <Button
                                                className="absolute right-0 top-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => copyToClipboard(info.psw, "密码已复制到剪贴板")}
                                                size="icon"
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                    <Button 
                                        onClick={() => {
                                            copyToClipboard(`${info.link} ${info.psw ? `密码：${info.psw}` : ''}`, "分享链接已复制");
                                        }} 
                                        variant="outline" 
                                        size="icon"
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                        onClick={() => {
                                            if (info.psw) {
                                                copyToClipboard(info.psw, "密码已复制到剪贴板");
                                            }
                                            if (typeof window !== 'undefined') { // 添加检查
                                                window.location.href = `/external-redirect?url=${encodeURIComponent(info.link)}`;
                                            }
                                        }} 
                                        variant="outline" 
                                        size="icon"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </motion.div>

                    <Separator className="my-6" />

                    {/* 资源信息部分 */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                            <Info className="mr-2" /> 资源信息
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="p-4 bg-gray-100 rounded-lg shadow-sm">
                                <div className="flex items-center">
                                    <Calendar className="mr-2 text-gray-500" />
                                    <span className="w-32 inline-block">更新时间：</span>
                                    <span className="text-gray-400">{format(new Date(resource.update_time), 'yyyy-MM-dd HH:mm:ss')}</span>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-100 rounded-lg shadow-sm">
                                <div className="flex items-center">
                                    <LinkIcon className="mr-2 text-gray-500" />
                                    <span className="w-32 inline-block">官方地址：</span>
                                    <a 
                                        href={resource.link} 
                                        onClick={handleLinkClick} 
                                        className="text-gray-500 hover:text-gray-700 transition-colors duration-200 truncate"
                                    >
                                        {resource.link}
                                    </a>
                                </div>
                            </div>
                            {Object.entries(resource.resource_information || {}).map(([key, value]) => (
                                <div key={key} className="p-4 bg-gray-100 rounded-lg shadow-sm">
                                    <div className="flex items-center">
                                        <Info className="mr-2 text-gray-500" />
                                        <span className="w-32 inline-block font-semibold">{key}：</span>
                                        {typeof value === 'string' && value.startsWith('http') ? (
                                            <a 
                                                href={value} 
                                                onClick={handleLinkClick} 
                                                className="text-gray-500 hover:text-gray-700 transition-colors duration-200 truncate"
                                            >
                                                {value}
                                            </a>
                                        ) : (
                                            <span className="text-gray-500">{value}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <Separator className="my-6" />

                    {/* 简介部分 */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.6 }}
                    >
                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                            <FileText className="mr-2" /> 简介
                        </h3>
                        <p className="text-gray-700">{resource.introduction}</p>
                    </motion.div>

                    <Separator className="my-6" />

                    {/* 图集部分 */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.7 }}
                    >
                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                            <Eye className="mr-2" /> 图集
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {resource.images.map((image, index) => (
                                <motion.div
                                    key={index}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
                                        <DialogTrigger asChild>
                                            <div className="relative w-full h-[150px] cursor-pointer overflow-hidden rounded-lg">
                                                <div
                                                    className={cn(
                                                        "absolute inset-0 transition-opacity duration-300",
                                                        imageLoaded[index] ? "opacity-0" : "opacity-100"
                                                    )}
                                                    style={{ backgroundColor: skeletonColors[index] }}
                                                />
                                                <Image
                                                    src={image}
                                                    alt={`${resource.name} - 图片 ${index + 1}`}
                                                    fill
                                                    className={cn(
                                                        "rounded-lg transition-opacity duration-300 object-cover",
                                                        imageLoaded[index] ? "opacity-100" : "opacity-0"
                                                    )}
                                                    onLoad={() => {
                                                        const newImageLoaded = [...imageLoaded];
                                                        newImageLoaded[index] = true;
                                                        setImageLoaded(newImageLoaded);
                                                    }}
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity">
                                                    <Eye className="h-6 w-6 text-white" />
                                                </div>
                                            </div>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-3xl">
                                            <Image
                                                src={image}
                                                alt={`${resource.name} - 图片 ${index + 1}`}
                                                width={800}
                                                height={600}
                                                className="object-contain" 
                                                sizes="(max-width: 768px) 100vw, 800px"
                                            />
                                        </DialogContent>
                                    </Dialog>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </CardContent>
                <CardFooter>
                    <Badge variant="outline" className="w-full justify-center">
                        UUID: {uuid}
                    </Badge>
                </CardFooter>
            </Card>
        </motion.div>
    )
}
