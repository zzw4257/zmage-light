"use client";

import { useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, Share2, Edit, MoreHorizontal, Trash2, Plus, StickyNote, Image as ImageIcon } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { AssetGrid } from "@/components/asset/asset-grid";
import { AssetDetail } from "@/components/asset/asset-detail";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/modal";
import { Dropdown, DropdownItem, DropdownSeparator } from "@/components/ui/dropdown";
import { Skeleton } from "@/components/ui/skeleton";
import { collectionsApi, type Asset } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

function CollectionDetailContent() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const collectionId = parseInt(params.id as string);

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  // 获取集合详情
  const { data: collection, isLoading } = useQuery({
    queryKey: ["collection", collectionId],
    queryFn: () => collectionsApi.get(collectionId).then((r) => r.data),
  });

  // 获取集合资产
  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ["collectionAssets", collectionId],
    queryFn: () => collectionsApi.getAssets(collectionId).then((r) => r.data),
  });

  // 删除集合
  const deleteMutation = useMutation({
    mutationFn: () => collectionsApi.delete(collectionId),
    onSuccess: () => {
      toast.success("集合已删除");
      router.push("/collections");
    },
    onError: () => {
      toast.error("删除失败");
    },
  });

  // 移除资产
  const removeAssetMutation = useMutation({
    mutationFn: (assetId: number) => collectionsApi.removeAsset(collectionId, assetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collectionAssets", collectionId] });
      queryClient.invalidateQueries({ queryKey: ["collection", collectionId] });
      toast.success("已从集合移除");
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

  if (!collection) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--muted-foreground)]">集合不存在</p>
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
                onClick={() => router.push("/collections")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <div className="flex-1">
                <h1 className="text-xl font-semibold">{collection.name}</h1>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">
                  {collection.asset_count} 个资产 · 更新于 {formatDate(collection.updated_at, "relative")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => {
                  collectionsApi.download(collectionId).then((response: any) => {
                    const url = window.URL.createObjectURL(new Blob([response.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `${collection.name}.zip`);
                    document.body.appendChild(link);
                    link.click();
                    toast.success("开始打包下载");
                  }).catch(() => toast.error("下载失败"));
                }}>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  下载
                </Button>
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
                    编辑集合
                  </DropdownItem>
                  <DropdownSeparator />
                  <DropdownItem
                    icon={<Trash2 className="h-4 w-4" />}
                    onClick={() => setShowDelete(true)}
                    destructive
                  >
                    删除集合
                  </DropdownItem>
                </Dropdown>
              </div>
            </div>

            {collection.description && (
              <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                {collection.description}
              </p>
            )}

            {/* 协作备注 */}
            {collection.notes && (
              <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 mb-1">
                  <StickyNote className="h-4 w-4" />
                  <span className="text-sm font-medium">协作备注</span>
                </div>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  {collection.notes}
                </p>
              </div>
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
        title="删除集合"
        description={`确定要删除集合 "${collection.name}" 吗？集合中的资产不会被删除。`}
        confirmText="删除"
        variant="destructive"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

export default function CollectionDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">加载中...</div>}>
      <CollectionDetailContent />
    </Suspense>
  );
}
