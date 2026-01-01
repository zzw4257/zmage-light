"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { AssetGrid } from "@/components/asset/asset-grid";
import { AssetDetail } from "@/components/asset/asset-detail";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/modal";
import { trashApi, assetsApi, type Asset } from "@/lib/api";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { Trash2, RotateCcw } from "lucide-react";

export default function TrashPage() {
    const queryClient = useQueryClient();
    const { sidebarOpen } = useAppStore();

    const [page, setPage] = useState(1);
    const [deleteAsset, setDeleteAsset] = useState<Asset | null>(null);
    const [restoreAsset, setRestoreAsset] = useState<Asset | null>(null);
    const [showEmptyTrash, setShowEmptyTrash] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

    // 获取回收站列表
    const { data, isLoading } = useQuery({
        queryKey: ["trash", { page }],
        queryFn: async () => {
            const response = await trashApi.list({ page, page_size: 50 });
            return response.data;
        },
    });

    // 恢复资产
    const restoreMutation = useMutation({
        mutationFn: (id: number) => trashApi.restore(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["trash"] });
            queryClient.invalidateQueries({ queryKey: ["assets"] }); // 更新主列表
            toast.success("已恢复");
            setRestoreAsset(null);
        },
        onError: () => toast.error("恢复失败"),
    });

    // 永久删除
    const deleteMutation = useMutation({
        mutationFn: (id: number) => assetsApi.delete(id, true), // permanent=true
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["trash"] });
            toast.success("已永久删除");
            setDeleteAsset(null);
        },
        onError: () => toast.error("删除失败"),
    });

    // 清空回收站
    const emptyTrashMutation = useMutation({
        mutationFn: () => trashApi.empty(),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["trash"] });
            toast.success(data.data.message);
            setShowEmptyTrash(false);
        },
        onError: () => toast.error("清空失败"),
    });


    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <div className="flex-1 flex overflow-hidden">
                <Sidebar mobile onClose={useAppStore.getState().toggleSidebar} />
                <Sidebar />

                <main className={cn("flex-1 overflow-y-auto", sidebarOpen && "md:ml-0")}>
                    <div className="sticky top-0 z-10 glass border-b border-[var(--border)] px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Trash2 className="w-5 h-5 text-[var(--muted-foreground)]" />
                                <h1 className="text-xl font-semibold">回收站</h1>
                                <span className="text-sm text-[var(--muted-foreground)] ml-2">
                                    {data?.total || 0} 个项目
                                </span>
                            </div>

                            {data && data.total > 0 && (
                                <Button variant="destructive" size="sm" onClick={() => setShowEmptyTrash(true)}>
                                    清空回收站
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="p-6">
                        <AssetGrid
                            assets={data?.items ?? []}
                            loading={isLoading}
                            onAssetClick={(asset) => setSelectedAsset(asset)}
                            actionRenderer={(asset) => (
                                <div className="flex gap-1 justify-end p-2 bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 inset-x-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        className="h-8 w-8 rounded-full"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            restoreMutation.mutate(asset.id);
                                        }}
                                        title="恢复"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="h-8 w-8 rounded-full"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteAsset(asset);
                                        }}
                                        title="永久删除"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        />
                    </div>
                </main>
            </div>

            <ConfirmModal
                open={!!deleteAsset}
                onClose={() => setDeleteAsset(null)}
                onConfirm={() => deleteAsset && deleteMutation.mutate(deleteAsset.id)}
                title="永久删除"
                description="此操作不可恢复，确定要彻底删除该文件吗？"
                confirmText="彻底删除"
                variant="destructive"
            />

            <ConfirmModal
                open={showEmptyTrash}
                onClose={() => setShowEmptyTrash(false)}
                onConfirm={() => emptyTrashMutation.mutate()}
                title="清空回收站"
                description="确定要清空回收站吗？所有文件将永久丢失。"
                confirmText="清空"
                variant="destructive"
            />

            {selectedAsset && (
                <div className="z-[100]">
                    <AssetDetail
                        asset={selectedAsset}
                        onClose={() => setSelectedAsset(null)}
                        onRestore={() => {
                            restoreMutation.mutate(selectedAsset.id);
                            setSelectedAsset(null);
                        }}
                    />
                </div>
            )}
        </div>
    );
}
