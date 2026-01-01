"use client";

import { useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, Share2, Edit, MoreHorizontal, Trash2, Plus } from "lucide-react";
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
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

function AlbumDetailContent() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const albumId = parseInt(params.id as string);

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  // 获取相册详情
  const { data: album, isLoading } = useQuery({
    queryKey: ["album", albumId],
    queryFn: () => albumsApi.get(albumId).then((r) => r.data),
  });

  // 获取相册资产
  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ["albumAssets", albumId],
    queryFn: () => albumsApi.getAssets(albumId).then((r) => r.data),
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
      toast.success("已从相册移除");
    },
    onError: () => {
      toast.error("移除失败");
    },
  });

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
                <p className="text-sm text-[var(--muted-foreground)] mt-1">
                  {album.asset_count} 个资产 · 更新于 {formatDate(album.updated_at, "relative")}
                </p>
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

      {/* 删除确认 */}
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
