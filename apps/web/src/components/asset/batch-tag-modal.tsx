"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X, Plus, Tag as TagIcon } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { assetsApi } from "@/lib/api";
import toast from "react-hot-toast";

interface BatchTagModalProps {
    open: boolean;
    onClose: () => void;
    assetIds: number[];
    onSuccess?: () => void;
}

export function BatchTagModal({ open, onClose, assetIds, onSuccess }: BatchTagModalProps) {
    const [tagsToAdd, setTagsToAdd] = useState<string[]>([]);
    const [tagsToRemove, setTagsToRemove] = useState<string[]>([]);
    const [newTag, setNewTag] = useState("");
    const queryClient = useQueryClient();

    const updateMutation = useMutation({
        mutationFn: () =>
            assetsApi.batchUpdate({
                asset_ids: assetIds,
                add_tags: tagsToAdd,
                remove_tags: tagsToRemove,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["assets"] });
            toast.success("批量更新成功");
            onSuccess?.();
            handleClose();
        },
        onError: () => toast.error("更新失败"),
    });

    const handleClose = () => {
        setTagsToAdd([]);
        setTagsToRemove([]);
        setNewTag("");
        onClose();
    };

    const addTag = () => {
        const tag = newTag.trim();
        if (tag && !tagsToAdd.includes(tag)) {
            setTagsToAdd([...tagsToAdd, tag]);
            setTagsToRemove(tagsToRemove.filter((t) => t !== tag));
            setNewTag("");
        }
    };

    return (
        <Modal open={open} onClose={handleClose} title="批量管理标签" size="md">
            <div className="space-y-6">
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                    <p className="text-sm text-[var(--muted-foreground)]">
                        将对选中的 <span className="font-bold text-[var(--primary)]">{assetIds.length}</span> 个资产执行以下操作：
                    </p>
                </div>

                <div className="space-y-4">
                    {/* 添加标签 */}
                    <div>
                        <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                            <Plus className="h-4 w-4 text-green-500" />
                            要添加的标签
                        </label>
                        <div className="flex gap-2 mb-2">
                            <Input
                                placeholder="输入新标签..."
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && addTag()}
                            />
                            <Button onClick={addTag} size="sm">添加</Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {tagsToAdd.map((tag) => (
                                <Badge key={tag} variant="secondary" className="pl-2 gap-1 bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">
                                    {tag}
                                    <X className="h-3 w-3 cursor-pointer" onClick={() => setTagsToAdd(tagsToAdd.filter(t => t !== tag))} />
                                </Badge>
                            ))}
                            {tagsToAdd.length === 0 && <span className="text-xs text-[var(--muted-foreground)] italic">未添加</span>}
                        </div>
                    </div>

                    <div className="h-px bg-[var(--border)]" />

                    {/* 移除标签 (输入) */}
                    <div>
                        <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                            <X className="h-4 w-4 text-red-500" />
                            要移除的标签
                        </label>
                        <p className="text-xs text-[var(--muted-foreground)] mb-2">输入完全匹配的标签名称进行移除</p>
                        <div className="flex flex-wrap gap-2">
                            {tagsToRemove.map((tag) => (
                                <Badge key={tag} variant="secondary" className="pl-2 gap-1 bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20">
                                    {tag}
                                    <X className="h-3 w-3 cursor-pointer" onClick={() => setTagsToRemove(tagsToRemove.filter(t => t !== tag))} />
                                </Badge>
                            ))}
                            <div className="flex gap-2 w-full mt-2">
                                <Input
                                    placeholder="输入要移除的标签..."
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            const val = (e.currentTarget as HTMLInputElement).value.trim();
                                            if (val && !tagsToRemove.includes(val)) {
                                                setTagsToRemove([...tagsToRemove, val]);
                                                setTagsToAdd(tagsToAdd.filter(t => t !== val));
                                                (e.currentTarget as HTMLInputElement).value = "";
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                    <Button variant="outline" onClick={handleClose}>取消</Button>
                    <Button
                        onClick={() => updateMutation.mutate()}
                        disabled={updateMutation.isPending || (tagsToAdd.length === 0 && tagsToRemove.length === 0)}
                    >
                        {updateMutation.isPending ? "正在应用..." : "应用更改"}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
