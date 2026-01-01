"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, FolderPlus, Download, Tag, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SelectionToolbarProps {
    selectedCount: number;
    onClearSelection: () => void;
    onDelete: () => void;
    onAddToAlbum: () => void;
    onBatchDownload: () => void;
    onBatchTag: () => void;
    onMoveToVault: () => void;
}

export function SelectionToolbar({
    selectedCount,
    onClearSelection,
    onDelete,
    onAddToAlbum,
    onBatchDownload,
    onBatchTag,
}: SelectionToolbarProps) {
    if (selectedCount === 0) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
            >
                <div className="glass rounded-2xl border border-white/10 shadow-2xl p-4 min-w-[600px]">
                    <div className="flex items-center justify-between gap-4">
                        {/* 选中数量 */}
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center">
                                <Check className="h-4 w-4 text-white" />
                            </div>
                            <span className="font-medium">
                                已选择 {selectedCount} 个资产
                            </span>
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onAddToAlbum}
                                className="hover:bg-blue-500/10 hover:text-blue-500"
                            >
                                <FolderPlus className="h-4 w-4 mr-2" />
                                加入相册
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onBatchTag}
                                className="hover:bg-green-500/10 hover:text-green-500"
                            >
                                <Tag className="h-4 w-4 mr-2" />
                                批量标签
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onBatchDownload}
                                className="hover:bg-purple-500/10 hover:text-purple-500"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                批量下载
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onDelete}
                                className="hover:bg-red-500/10 hover:text-red-500"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                删除
                            </Button>
                        </div>

                        {/* 取消按钮 */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClearSelection}
                            className="rounded-full hover:bg-white/10"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
