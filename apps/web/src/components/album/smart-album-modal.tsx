"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Sparkles, Eye, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SmartAlbumBuilder, type SmartAlbumRules } from "./smart-album-builder";
import { albumsApi } from "@/lib/api";
import Image from "next/image";
import toast from "react-hot-toast";

interface SmartAlbumModalProps {
    open: boolean;
    onClose: () => void;
}

export function SmartAlbumModal({ open, onClose }: SmartAlbumModalProps) {
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [rules, setRules] = useState<SmartAlbumRules>({});
    const [previewAlbumId, setPreviewAlbumId] = useState<number | null>(null);

    // 创建智能相册
    const createMutation = useMutation({
        mutationFn: async () => {
            const response = await albumsApi.create({
                name,
                description: description || undefined,
                album_type: "smart" as any,
                smart_rules: rules as any,
            });
            return response.data;
        },
        onSuccess: (album) => {
            queryClient.invalidateQueries({ queryKey: ["albums"] });
            toast.success(`智能相册「${album.name}」创建成功`);
            handleClose();
        },
        onError: () => {
            toast.error("创建失败");
        },
    });

    // 预览匹配结果（如果有临时相册）
    const { data: previewData, isLoading: previewLoading } = useQuery({
        queryKey: ["smart-album-preview", rules],
        queryFn: async () => {
            // 这里我们用一个特殊的模拟请求，实际需要后端支持临时评估
            // 由于现在没有专门的临时评估端点，我们先简单返回空
            // 真正实现需要后端添加 POST /albums/preview-rules 接点
            return { matched_count: 0, assets: [] };
        },
        enabled: false, // 暂时禁用，等backend完善
    });

    const handleClose = () => {
        setName("");
        setDescription("");
        setRules({});
        onClose();
    };

    const handleCreate = () => {
        if (!name.trim()) return;
        createMutation.mutate();
    };

    const hasRules =
        (rules.tags?.include?.length || 0) > 0 ||
        (rules.tags?.exclude?.length || 0) > 0 ||
        rules.date_range?.start ||
        rules.date_range?.end ||
        rules.camera_model ||
        rules.asset_type;

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title={
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    创建智能相册
                </div>
            }
            description="智能相册会根据规则自动收集匹配的资产"
            size="lg"
        >
            <div className="space-y-4">
                {/* 基本信息 */}
                <div>
                    <label className="text-sm font-medium">相册名称</label>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="例如：2024年香港之旅"
                        className="mt-1"
                        autoFocus
                    />
                </div>

                <div>
                    <label className="text-sm font-medium">描述（可选）</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="添加相册描述"
                        className="mt-1 w-full h-16 px-3 py-2 text-sm rounded-xl border border-[var(--input)] bg-[var(--background)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                    />
                </div>

                {/* 规则构建器 */}
                <div>
                    <label className="text-sm font-medium mb-2 block">筛选规则</label>
                    <div className="max-h-80 overflow-y-auto">
                        <SmartAlbumBuilder rules={rules} onChange={setRules} />
                    </div>
                </div>

                {/* 规则摘要 */}
                {hasRules && (
                    <div className="p-3 bg-purple-500/10 rounded-xl text-sm">
                        <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                            <Eye className="h-4 w-4" />
                            <span className="font-medium">规则摘要</span>
                        </div>
                        <ul className="mt-2 space-y-1 text-purple-600 dark:text-purple-400">
                            {(rules.tags?.include?.length || 0) > 0 && (
                                <li>• 包含标签: {rules.tags?.include?.join(", ")}</li>
                            )}
                            {(rules.tags?.exclude?.length || 0) > 0 && (
                                <li>• 排除标签: {rules.tags?.exclude?.join(", ")}</li>
                            )}
                            {rules.date_range?.start && (
                                <li>• 开始日期: {rules.date_range.start}</li>
                            )}
                            {rules.date_range?.end && (
                                <li>• 结束日期: {rules.date_range.end}</li>
                            )}
                            {rules.camera_model && (
                                <li>• 相机型号: {rules.camera_model}</li>
                            )}
                            {rules.asset_type && (
                                <li>• 类型: {rules.asset_type === "image" ? "仅图片" : "仅视频"}</li>
                            )}
                        </ul>
                    </div>
                )}

                {/* 操作按钮 */}
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={handleClose}>
                        取消
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={!name.trim() || !hasRules}
                        loading={createMutation.isPending}
                        className="bg-purple-500 hover:bg-purple-600"
                    >
                        <Sparkles className="h-4 w-4 mr-1" />
                        创建智能相册
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
