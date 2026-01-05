"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { AssetGrid } from "@/components/asset/asset-grid";
import { AssetDetail } from "@/components/asset/asset-detail";
import { ViewModeSelector, type ViewMode } from "@/components/asset/view-mode-selector";
import { AssetListView } from "@/components/asset/asset-list-view";
import { AssetWaterfall } from "@/components/asset/asset-waterfall";
import { UploadModal } from "@/components/asset/upload-modal";
import { ShareModal } from "@/components/share/share-modal";
import { SelectionToolbar } from "@/components/asset/selection-toolbar";
import { AddToAlbumModal } from "@/components/asset/add-to-album-modal";
import { BatchTagModal } from "@/components/asset/batch-tag-modal";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { FeaturedCarousel } from "@/components/asset/featured-carousel";
import { AIChatDrawer } from "@/components/asset/ai-chat-drawer";
import { ProcessingStatus } from "@/components/asset/processing-status";
import { assetsApi, downloadsApi, vaultApi, type Asset } from "@/lib/api";
import { StatsDashboard } from "@/components/dashboard/stats-dashboard";
import { useAppStore } from "@/store";
import { cn, getAssetTypeLabel } from "@/lib/utils";
import toast from "react-hot-toast";

function HomeContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const {
    searchQuery,
    aiSearchEnabled,
    sidebarOpen,
    selectedAssets,
    clearSelection,
    setBatchMode,
  } = useAppStore();

  const [showUpload, setShowUpload] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [shareAsset, setShareAsset] = useState<Asset | null>(null);
  const [deleteAsset, setDeleteAsset] = useState<Asset | null>(null);
  const [showAddToAlbum, setShowAddToAlbum] = useState(false);
  const [showBatchTag, setShowBatchTag] = useState(false);
  const [page, setPage] = useState(1);

  // URL 参数
  const assetType = searchParams.get("type") || undefined;
  const folderId = searchParams.get("folder")
    ? parseInt(searchParams.get("folder")!)
    : undefined;

  // 获取资产列表 (优化: 减少初始 page_size, 增加 staleTime)
  const { data, isLoading } = useQuery({
    queryKey: ["assets", { page, assetType, folderId, searchQuery, aiSearchEnabled }],
    queryFn: async () => {
      if (searchQuery) {
        const response = await assetsApi.search({
          query: searchQuery,
          ai_search: aiSearchEnabled,
          asset_types: assetType ? [assetType] : undefined,
          folder_id: folderId,
          page,
          page_size: 24,
        });
        return response.data;
      }
      const response = await assetsApi.list({
        page,
        page_size: 24,
        asset_type: assetType,
        folder_id: folderId,
        status: "ready",
      });
      return response.data;
    },
    staleTime: 30000, // 30 秒内不重新请求
  });

  // 删除资产
  const deleteMutation = useMutation({
    mutationFn: (id: number) => assetsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast.success("删除成功");
      setDeleteAsset(null);
    },
    onError: () => {
      toast.error("删除失败");
    },
  });

  // 批量删除
  const batchDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => assetsApi.batchDelete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast.success("已移至回收站");
      clearSelection();
      setShowConfirmDelete(false);
    },
    onError: () => {
      toast.error("操作失败");
    },
  });

  // 批量恢复
  const batchRestoreMutation = useMutation({
    mutationFn: (ids: number[]) => assetsApi.batchRestore(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast.success("已恢复资产");
      clearSelection();
    },
    onError: () => {
      toast.error("操作失败");
    },
  });

  // 移入保险库
  const moveToVaultMutation = useMutation({
    mutationFn: (id: number) => vaultApi.moveIn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast.success("已移入保险库");
    },
    onError: () => toast.error("操作失败")
  });

  const batchMoveToVaultMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map(id => vaultApi.moveIn(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast.success("批量移入保险库成功");
      clearSelection();
    },
    onError: () => toast.error("操作失败")
  });

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC 关闭详情
      if (e.key === "Escape") {
        if (selectedAsset) {
          setSelectedAsset(null);
        } else if (selectedAssets.length > 0) {
          clearSelection();
        }
      }
      // Ctrl/Cmd + A 全选
      if ((e.ctrlKey || e.metaKey) && e.key === "a" && !selectedAsset) {
        e.preventDefault();
        if (data?.items) {
          useAppStore.getState().selectAll(data.items.map((a) => a.id));
          setBatchMode(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedAsset, selectedAssets, data, clearSelection, setBatchMode]);

  // 资产导航
  const currentIndex = selectedAsset
    ? data?.items.findIndex((a) => a.id === selectedAsset.id) ?? -1
    : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < (data?.items.length ?? 0) - 1;

  const handlePrev = () => {
    if (hasPrev && data?.items) {
      setSelectedAsset(data.items[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext && data?.items) {
      setSelectedAsset(data.items[currentIndex + 1]);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        onUploadClick={() => setShowUpload(true)}
        onAIChatClick={() => setShowAIChat(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar mobile onClose={useAppStore.getState().toggleSidebar} />
        <Sidebar />

        <main className={cn("flex-1 overflow-y-auto", sidebarOpen && "md:ml-0")}>
          {/* 页面头部 */}
          <div className="sticky top-0 z-10 glass border-b border-[var(--border)] px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold">
                  {searchQuery
                    ? `搜索: ${searchQuery}`
                    : assetType
                      ? getAssetTypeLabel(assetType)
                      : "全部资产"}
                </h1>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {data?.total ?? 0} 个资产
                    {aiSearchEnabled && searchQuery && (
                      <Badge variant="secondary" size="sm" className="ml-2">
                        AI 语义搜索
                      </Badge>
                    )}
                  </p>
                  <ViewModeSelector mode={viewMode} onChange={setViewMode} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedAssets.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                  >
                    取消选择 ({selectedAssets.length})
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* 批量模式提示横幅 */}
          <AnimatePresence>
            {useAppStore.getState().batchMode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border-b border-blue-200 px-6 py-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-medium text-blue-600">📌 批量选择模式已激活</span>
                    <div className="flex items-center gap-3 text-[var(--muted-foreground)]">
                      <span>点击卡片选择</span>
                      <span>•</span>
                      <span><kbd className="px-1.5 py-0.5 bg-white rounded border text-xs">Shift</kbd>+点击 范围选</span>
                      <span>•</span>
                      <span><kbd className="px-1.5 py-0.5 bg-white rounded border text-xs">Ctrl+A</kbd> 全选</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="text-blue-600 hover:bg-blue-100"
                  >
                    退出批量模式
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 资产网格 */}
          <div className="p-6">
            {!searchQuery && !folderId && !assetType && (
              <div className="mb-10">
                <StatsDashboard />
              </div>
            )}

            {!searchQuery && !folderId && !assetType && data?.items && data.items.length > 0 && (
              <FeaturedCarousel
                assets={data.items.slice(0, 5)}
                onAssetClick={setSelectedAsset}
              />
            )}


            {viewMode === "grid" && (
              <AssetGrid
                assets={data?.items ?? []}
                loading={isLoading}
                onAssetClick={setSelectedAsset}
                onAssetEdit={(asset) => setSelectedAsset(asset)}
                onAssetDelete={setDeleteAsset}
                onAssetShare={setShareAsset}
                onAssetMoveToVault={(asset) => moveToVaultMutation.mutate(asset.id)}
              />
            )}
            {viewMode === "list" && (
              <AssetListView
                assets={data?.items ?? []}
                onAssetClick={setSelectedAsset}
              />
            )}
            {viewMode === "waterfall" && (
              <AssetWaterfall
                assets={data?.items ?? []}
                onAssetClick={setSelectedAsset}
              />
            )}

            {/* 分页 */}
            {data && data.has_more && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                >
                  加载更多
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 上传弹窗 */}
      <UploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        folderPath={folderId ? undefined : undefined}
      />

      {/* 资产详情 */}
      <AnimatePresence>
        {selectedAsset && (
          <AssetDetail
            asset={selectedAsset}
            onClose={() => setSelectedAsset(null)}
            onPrev={handlePrev}
            onNext={handleNext}
            hasPrev={hasPrev}
            hasNext={hasNext}
            onDelete={() => setDeleteAsset(selectedAsset)}
            onMoveToVault={() => moveToVaultMutation.mutate(selectedAsset.id)}
          />
        )}
      </AnimatePresence>

      {/* 删除确认 */}
      <ConfirmModal
        open={!!deleteAsset}
        onClose={() => setDeleteAsset(null)}
        onConfirm={() => deleteAsset && deleteMutation.mutate(deleteAsset.id)}
        title="移至回收站"
        description={`确定要将 "${deleteAsset?.title || deleteAsset?.original_filename}" 移至回收站吗？之后您可以在回收站中找回。`}
        confirmText="移至回收站"
        variant="destructive"
        loading={deleteMutation.isPending}
      />

      {/* 分享弹窗 */}
      <ShareModal
        open={!!shareAsset}
        onClose={() => setShareAsset(null)}
        assetId={shareAsset?.id}
        title={shareAsset?.title || shareAsset?.original_filename}
      />

      {/* 批量操作确认弹窗在下方通过 SelectionToolbar 触发 */}

      {selectedAssets.length > 0 && (
        <ConfirmModal
          open={showConfirmDelete}
          onClose={() => setShowConfirmDelete(false)}
          title="批量移至回收站"
          description={`确定要将选中的 ${selectedAssets.length} 个资产移至回收站吗？`}
          onConfirm={() => batchDeleteMutation.mutate(selectedAssets)}
          loading={batchDeleteMutation.isPending}
          variant="destructive"
        />
      )}

      {/* AI 助手抽屉 */}
      <AnimatePresence>
        {showAIChat && (
          <AIChatDrawer
            onClose={() => setShowAIChat(false)}
            onAssetClick={setSelectedAsset}
          />
        )}
      </AnimatePresence>

      {/* Selection Toolbar */}
      <SelectionToolbar
        selectedCount={selectedAssets.length}
        onClearSelection={clearSelection}
        onDelete={() => {
          if (selectedAssets.length > 0) {
            setShowConfirmDelete(true);
          }
        }}
        onAddToAlbum={() => setShowAddToAlbum(true)}
        onBatchDownload={() => {
          // 触发批量下载
          downloadsApi.downloadBatch(selectedAssets).then((response: any) => {
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'assets.zip');
            document.body.appendChild(link);
            link.click();
            toast.success("开始批量下载");
          }).catch(() => toast.error("下载失败"));
        }}
        onBatchTag={() => setShowBatchTag(true)}
      />

      <BatchTagModal
        open={showBatchTag}
        onClose={() => setShowBatchTag(false)}
        assetIds={selectedAssets}
      />

      {/* Add to Album Modal */}
      <AddToAlbumModal
        open={showAddToAlbum}
        onClose={() => setShowAddToAlbum(false)}
        assetIds={selectedAssets}
      />

      {/* Processing Status Widget */}
      <ProcessingStatus />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">加载中...</div>}>
      <HomeContent />
    </Suspense>
  );
}
