"use client";

import { useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Share2, Edit, MoreHorizontal, Trash2, Plus, Download } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { AssetGrid } from "@/components/asset/asset-grid";
import { AssetDetail } from "@/components/asset/asset-detail";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmModal } from "@/components/ui/modal";
import { Dropdown, DropdownItem, DropdownSeparator } from "@/components/ui/dropdown";
import { Skeleton } from "@/components/ui/skeleton";
import { albumsApi, type Asset } from "@/lib/api";
import { formatDate, formatFileSize } from "@/lib/utils";
import { useAppStore } from "@/store";
import toast from "react-hot-toast";
import { X, Image as ImageIcon } from "lucide-react";

function AlbumDetailContent() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const albumId = parseInt(params.id as string);

  const { selectedAssets, clearSelection, setBatchMode, batchMode } = useAppStore();
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [showBatchRemove, setShowBatchRemove] = useState(false);

  // 获取相册详情
  const { data: album, isLoading } = useQuery({
    queryKey: ["album", albumId],
    queryFn: () => albumsApi.get(albumId).then((r) => r.data),
  });

  // 获取相册资产
  const { data: assets, isLoading: assetsLoading, refetch: refetchAssets } = useQuery({
    queryKey: ["albumAssets", albumId],
    queryFn: () => albumsApi.getAssets(albumId).then((r) => r.data),
  });

  // 获取相册统计
  const { data: stats } = useQuery({
    queryKey: ["albumStats", albumId],
    queryFn: () => albumsApi.getStats(albumId).then((r) => r.data),
    enabled: !!album,
  });

  // 删除相册
  const deleteMutation = useMutation({
    mutationFn: () => albumsApi.delete(albumId),
    onSuccess: () => {
      toast.success("相册已删除");
      router.push("/albums");
    },
    onError: () => {
      toast.error("删除失败");
    },
  });

  // 移除资产
  const removeAssetMutation = useMutation({
    mutationFn: (assetId: number) => albumsApi.removeAsset(albumId, assetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["albumAssets", albumId] });
      queryClient.invalidateQueries({ queryKey: ["album", albumId] });
      queryClient.invalidateQueries({ queryKey: ["albumStats", albumId] });
      toast.success("已从相册移除");
    },
    onError: () => {
      toast.error("移除失败");
    },
  });

  // 批量移除资产
  const batchRemoveMutation = useMutation({
    mutationFn: (assetIds: number[]) => albumsApi.removeAssets(albumId, assetIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["albumAssets", albumId] });
      queryClient.invalidateQueries({ queryKey: ["album", albumId] });
      queryClient.invalidateQueries({ queryKey: ["albumStats", albumId] });
      toast.success(`已移除 ${selectedAssets.length} 个资产`);
      clearSelection();
      setShowBatchRemove(false);
    },
    onError: () => {
      toast.error("批量移除失败");
    },
  });

  // 设为封面
  const setCoverMutation = useMutation({
    mutationFn: (assetId: number) => albumsApi.update(albumId, { cover_asset_id: assetId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["album", albumId] });
      queryClient.invalidateQueries({ queryKey: ["albums"] });
      toast.success("封面已更新");
      clearSelection();
    },
    onError: () => {
      toast.error("设置失败");
    },
  });

  const handleDownload = async () => {
    try {
      toast.promise(
        albumsApi.download(albumId).then((response) => {
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `${album?.name || "album"}.zip`);
          document.body.appendChild(link);
          link.click();
          link.remove();
        }),
        {
          loading: "正在准备下载...",
          success: "开始下载",
          error: "下载请求失败",
        }
      );
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32 mb-6" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-2xl" />
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--muted-foreground)]">相册不存在</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex-1 flex">
        <Sidebar />

        <main className="flex-1 overflow-y-auto">
          {/* 页面头部 */}
          <div className="sticky top-0 z-10 glass border-b border-[var(--border)] px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/albums")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold">{album.name}</h1>
                  {album.album_type !== "manual" && (
                    <Badge
                      variant={album.album_type === "smart" ? "success" : "warning"}
                      size="sm"
                    >
                      {album.album_type === "smart" ? "智能" : "AI 建议"}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-[var(--muted-foreground)]">
                  <span>{stats?.asset_count || album.asset_count || 0} 个资产</span>
                  {stats?.total_size && (
                    <>
                      <span>·</span>
                      <span>{formatFileSize(stats.total_size)}</span>
                    </>
                  )}
                  {stats?.date_range?.start && (
                    <>
                      <span>·</span>
                      <span>
                        {formatDate(stats.date_range.start)} - {formatDate(stats.date_range.end || stats.date_range.start)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => toast.success("分享功能开发中")}>
                  <Share2 className="h-4 w-4 mr-2" />
                  分享
                </Button>
                <Dropdown
                  trigger={
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  }
                  align="right"
                >
                  <DropdownItem
                    icon={<Edit className="h-4 w-4" />}
                    onClick={() => toast.success("编辑功能开发中")}
                  >
                    编辑相册
                  </DropdownItem>
                  <DropdownItem
                    icon={<Download className="h-4 w-4" />}
                    onClick={handleDownload}
                  >
                    下载相册
                  </DropdownItem>
                  <DropdownSeparator />
                  <DropdownItem
                    icon={<Trash2 className="h-4 w-4" />}
                    onClick={() => setShowDelete(true)}
                    destructive
                  >
                    删除相册
                  </DropdownItem>
                </Dropdown>
              </div>
            </div>

            {album.description && (
              <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                {album.description}
              </p>
            )}
          </div>

          {/* 资产网格 */}
          <div className="p-6">
            <AssetGrid
              assets={assets ?? []}
              loading={assetsLoading}
              onAssetClick={setSelectedAsset}
              onAssetDelete={(asset) => removeAssetMutation.mutate(asset.id)}
            />
          </div>
        </main>
      </div>

      {/* 资产详情 */}
      <AnimatePresence>
        {selectedAsset && (
          <AssetDetail
            asset={selectedAsset}
            onClose={() => setSelectedAsset(null)}
          />
        )}
      </AnimatePresence>

      {/* 批量操作工具栏 */}
      <AnimatePresence>
        {selectedAssets.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40"
          >
            <div className="bg-[var(--background)]/80 backdrop-blur-md border border-[var(--border)] text-[var(--foreground)] px-4 py-2 rounded-full shadow-2xl flex items-center gap-2">
              <div className="flex items-center gap-2 border-r border-[var(--border)] pr-3 mr-1">
                <span className="font-medium text-sm">{selectedAssets.length} 已选择</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full"
                  onClick={clearSelection}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              {/* 设为封面 */}
              {selectedAssets.length === 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setCoverMutation.mutate(selectedAssets[0])}
                >
                  <ImageIcon className="h-3 w-3 mr-1.5" />
                  设为封面
                </Button>
              )}

              {/* 移除 */}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10"
                onClick={() => setShowBatchRemove(true)}
              >
                <Trash2 className="h-3 w-3 mr-1.5" />
                移出
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 删除相册确认 */}
      <ConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="删除相册"
        description={`确定要删除相册 "${album.name}" 吗？相册中的资产不会被删除。`}
        confirmText="删除"
        variant="destructive"
        loading={deleteMutation.isPending}
      />

      {/* 批量移除确认 */}
      <ConfirmModal
        open={showBatchRemove}
        onClose={() => setShowBatchRemove(false)}
        onConfirm={() => batchRemoveMutation.mutate(selectedAssets)}
        title="移出资产"
        description={`确定要将选中的 ${selectedAssets.length} 个资产从相册中移出吗？此操作不会删除原始文件。`}
        confirmText="移出"
        variant="destructive"
        loading={batchRemoveMutation.isPending}
      />
    </div>
  );
}

export default function AlbumDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">加载中...</div>}>
      <AlbumDetailContent />
    </Suspense>
  );
}
