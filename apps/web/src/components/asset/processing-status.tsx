"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp, Sparkles, Download, Zap } from "lucide-react";
import { assetsApi, type ProcessingAsset } from "@/lib/api";
import { cn } from "@/lib/utils";

const STEP_LABELS: Record<string, { label: string; icon: React.ReactNode; progress: number }> = {
    pending: { label: "等待处理", icon: <Loader2 className="h-3 w-3 animate-spin" />, progress: 0 },
    downloading: { label: "准备中", icon: <Download className="h-3 w-3" />, progress: 10 },
    ai_analysis: { label: "AI 分析", icon: <Sparkles className="h-3 w-3 animate-pulse" />, progress: 40 },
    vector: { label: "向量化", icon: <Zap className="h-3 w-3" />, progress: 80 },
    completed: { label: "完成", icon: <CheckCircle className="h-3 w-3 text-green-500" />, progress: 100 },
    failed: { label: "失败", icon: <XCircle className="h-3 w-3 text-red-500" />, progress: 0 },
};

export function ProcessingStatus() {
    const queryClient = useQueryClient();
    const [isExpanded, setIsExpanded] = useState(true);

    const { data: processingAssets = [] } = useQuery({
        queryKey: ["assets", "processing"],
        queryFn: () => assetsApi.listProcessing().then((r) => r.data),
        refetchInterval: 2000, // 每 2 秒刷新一次
        staleTime: 1000,
    });

    // 当处理完成时，刷新资产列表
    useEffect(() => {
        if (processingAssets.length === 0) {
            queryClient.invalidateQueries({ queryKey: ["assets"] });
        }
    }, [processingAssets.length, queryClient]);

    // 如果没有正在处理的资产，不显示
    if (processingAssets.length === 0) {
        return null;
    }

    const completedCount = processingAssets.filter((a) => a.processing_step === "completed").length;
    const totalCount = processingAssets.length;

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 right-4 z-50 w-80 glass rounded-2xl shadow-2xl border border-[var(--border)] overflow-hidden"
        >
            {/* 头部 */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-[var(--accent)] transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Loader2 className="h-5 w-5 text-[var(--primary)] animate-spin" />
                        <span className="absolute -top-1 -right-1 bg-[var(--primary)] text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                            {totalCount}
                        </span>
                    </div>
                    <div className="text-left">
                        <p className="font-medium text-sm">资产处理中</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                            {completedCount}/{totalCount} 完成
                        </p>
                    </div>
                </div>
                {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-[var(--muted-foreground)]" />
                ) : (
                    <ChevronUp className="h-4 w-4 text-[var(--muted-foreground)]" />
                )}
            </button>

            {/* 展开的详情列表 */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="max-h-64 overflow-y-auto px-4 pb-4 space-y-2">
                            {processingAssets.map((asset) => (
                                <ProcessingItem key={asset.id} asset={asset} />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function ProcessingItem({ asset }: { asset: ProcessingAsset }) {
    const stepInfo = STEP_LABELS[asset.processing_step || "pending"] || STEP_LABELS.pending;

    return (
        <div className="bg-[var(--muted)] rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
                {stepInfo.icon}
                <span className="text-xs font-medium truncate flex-1">{asset.filename}</span>
                <span className="text-xs text-[var(--muted-foreground)]">{stepInfo.label}</span>
            </div>
            <div className="h-1.5 bg-[var(--background)] rounded-full overflow-hidden">
                <motion.div
                    className={cn(
                        "h-full rounded-full",
                        asset.processing_step === "failed" ? "bg-red-500" : "bg-[var(--primary)]"
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${stepInfo.progress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                />
            </div>
        </div>
    );
}
