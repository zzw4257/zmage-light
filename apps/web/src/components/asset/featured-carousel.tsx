"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { type Asset, getStorageUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FeaturedCarouselProps {
    assets: Asset[];
    onAssetClick?: (asset: Asset) => void;
}

export function FeaturedCarousel({ assets, onAssetClick }: FeaturedCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (assets.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % assets.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [assets.length]);

    if (assets.length === 0) return null;

    const currentAsset = assets[currentIndex];

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + assets.length) % assets.length);
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % assets.length);
    };

    return (
        <div className="relative h-[300px] mb-8 overflow-hidden rounded-3xl bg-[var(--card)] group border border-[var(--border)] shadow-xl">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentAsset.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 flex flex-col md:flex-row cursor-pointer"
                    onClick={() => onAssetClick?.(currentAsset)}
                >
                    {/* 图片区域 */}
                    <div className="relative w-full md:w-1/2 h-48 md:h-full overflow-hidden bg-black/5">
                        <Image
                            src={currentAsset.url || getStorageUrl(currentAsset.file_path)}
                            alt={currentAsset.title || currentAsset.original_filename}
                            fill
                            className="object-cover"
                            priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>

                    {/* 内容区域 */}
                    <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-3">
                            <Badge variant="warning" className="animate-pulse">
                                <Sparkles className="h-3 w-3 mr-1" />
                                精选展示
                            </Badge>
                            {currentAsset.tags && currentAsset.tags.length > 0 && (
                                <Badge variant="secondary">
                                    {currentAsset.tags[0]}
                                </Badge>
                            )}
                        </div>

                        <h2 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight">
                            {currentAsset.title || currentAsset.original_filename}
                        </h2>

                        <p className="text-[var(--muted-foreground)] line-clamp-2 mb-6">
                            {currentAsset.description || "AI 自动识别该资产并提供了智能描述..."}
                        </p>

                        <div className="flex items-center gap-4 text-xs font-medium text-[var(--muted-foreground)]">
                            <span>尺寸: {currentAsset.width}x{currentAsset.height}</span>
                            <span>格式: {currentAsset.mime_type.split("/")[1].toUpperCase()}</span>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* 箭头控制 */}
            <div className="absolute inset-y-0 left-4 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full shadow-lg"
                    onClick={(e) => {
                        e.stopPropagation();
                        handlePrev();
                    }}
                >
                    <ChevronLeft className="h-5 w-5" />
                </Button>
            </div>
            <div className="absolute inset-y-0 right-4 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full shadow-lg"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleNext();
                    }}
                >
                    <ChevronRight className="h-5 w-5" />
                </Button>
            </div>

            {/* 指示器 */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {assets.map((_, i) => (
                    <button
                        key={i}
                        onClick={(e) => {
                            e.stopPropagation();
                            setCurrentIndex(i);
                        }}
                        className={cn(
                            "h-1.5 rounded-full transition-all duration-300",
                            i === currentIndex ? "w-6 bg-[var(--primary)]" : "w-1.5 bg-white/40 hover:bg-white/60"
                        )}
                    />
                ))}
            </div>
        </div>
    );
}

const cn = (...classes: any[]) => classes.filter(Boolean).join(" ");
