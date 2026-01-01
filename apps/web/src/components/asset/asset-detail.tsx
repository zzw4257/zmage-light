"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  Share2,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Calendar,
  Camera,
  Tag,
  FileText,
  Sparkles,
  Copy,
  ExternalLink,
  Scissors,
  Palette,
  Undo,
  Unlock,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { assetsApi, downloadsApi, getStorageUrl, type Asset } from "@/lib/api";
import { cn, formatFileSize, formatDate, copyToClipboard } from "@/lib/utils";
import { ShareModal } from "@/components/share/share-modal";
import { AssetEditor } from "./asset-editor";
import { AIEditPanel } from "./ai-edit-panel";
import { FilterPanel } from "./filter-panel";
import { AssetCard } from "./asset-card";
import { ImmersiveViewer } from "./immersive-viewer";
import toast from "react-hot-toast";

interface AssetDetailProps {
  asset: Asset;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  onRestore?: () => void;
  onMoveOut?: () => void;
  onDelete?: () => void;
  onMoveToVault?: () => void;
}

export function AssetDetail({
  asset,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onRestore,
  onMoveOut,
  onDelete,
  onMoveToVault,
}: AssetDetailProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: asset.title || "",
    description: asset.description || "",
    tags: asset.tags?.join(", ") || "",
  });
  const [assetEditorOpen, setAssetEditorOpen] = useState(false);
  const [aiEditPanelOpen, setAiEditPanelOpen] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [currentAsset, setCurrentAsset] = useState<Asset>(asset);

  useEffect(() => {
    setCurrentAsset(asset);
  }, [asset]);

  // 获取相似资产
  const { data: similarAssets } = useQuery({
    queryKey: ["similar", asset.id],
    queryFn: () => assetsApi.getSimilar(asset.id, 6).then((r) => r.data),
    enabled: asset.status === "ready",
  });

  // 更新资产
  const updateMutation = useMutation({
    mutationFn: (data: Partial<Asset>) => assetsApi.update(asset.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["asset", asset.id] });
      setEditing(false);
      toast.success("保存成功");
    },
    onError: () => {
      toast.error("保存失败");
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      title: editData.title || null,
      description: editData.description || null,
      tags: editData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
  };

  const handleDownload = () => {
    downloadsApi.downloadAsset(asset.id);
  };

  const handleCopyLink = async () => {
    const url = currentAsset.url || getStorageUrl(currentAsset.file_path);
    const success = await copyToClipboard(url);
    if (success) {
      toast.success("链接已复制");
    } else {
      toast.error("复制失败");
    }
  };

  const imageUrl = currentAsset.url || getStorageUrl(currentAsset.file_path);
  const isImage = currentAsset.asset_type === "image";
  const isVideo = currentAsset.asset_type === "video";

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* 背景 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
      />

      {/* 导航按钮 */}
      {hasPrev && (
        <button
          onClick={onPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {hasNext && (
        <button
          onClick={onNext}
          className="absolute right-[340px] top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* 预览区域 */}
      <div className="flex-1 flex items-center justify-center p-0 bg-black/90 overflow-hidden relative">
        <ImmersiveViewer
          src={imageUrl}
          alt={currentAsset.title || currentAsset.original_filename}
          mimeType={currentAsset.mime_type}
          onClose={onClose}
          onPrev={onPrev}
          onNext={onNext}
          hasPrev={hasPrev}
          hasNext={hasNext}
        />
      </div>

      {/* 信息面板 */}
      <motion.div
        initial={{ x: 320 }}
        animate={{ x: 0 }}
        exit={{ x: 320 }}
        className="relative w-80 bg-[var(--background)] border-l border-[var(--border)] overflow-y-auto"
      >
        {/* 头部 */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-[var(--background)] border-b border-[var(--border)]">
          <h2 className="font-semibold truncate">资产详情</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-6">
          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              下载
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShareModalOpen(true)}>
              <Share2 className="h-4 w-4 mr-1" />
              分享
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              <Copy className="h-4 w-4 mr-1" />
              复制链接
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(!editing)}
            >
              <Edit className="h-4 w-4 mr-1" />
              信息
            </Button>
            {isImage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAssetEditorOpen(true)}
              >
                <Scissors className="h-4 w-4 mr-1" />
                编辑图片
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAiEditPanelOpen(true)}
              className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 border-purple-500/20 text-purple-500"
            >
              <Sparkles className="h-4 w-4 mr-1" />
              AI 创作
            </Button>
            {isImage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterPanelOpen(true)}
                className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 hover:from-blue-500/20 hover:to-cyan-500/20 border-blue-500/20 text-blue-500"
              >
                <Palette className="h-4 w-4 mr-1" />
                滤镜实验室
              </Button>
            )}
            {onRestore && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRestore}
                className="bg-green-500/10 hover:bg-green-500/20 border-green-500/20 text-green-500"
              >
                <Undo className="h-4 w-4 mr-1" />
                还原资产
              </Button>
            )}
            {onMoveOut && (
              <Button
                variant="outline"
                size="sm"
                onClick={onMoveOut}
                className="bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-500"
              >
                <Unlock className="h-4 w-4 mr-1" />
                移出保险库
              </Button>
            )}
            {onMoveToVault && (
              <Button
                variant="outline"
                size="sm"
                onClick={onMoveToVault}
              >
                <Lock className="h-4 w-4 mr-1" />
                移入保险库
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                移至回收站
              </Button>
            )}
          </div>

          {/* 编辑表单 */}
          <AnimatePresence>
            {editing && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-3 overflow-hidden"
              >
                <div>
                  <label className="text-xs text-[var(--muted-foreground)]">
                    标题
                  </label>
                  <Input
                    value={editData.title}
                    onChange={(e) =>
                      setEditData({ ...editData, title: e.target.value })
                    }
                    placeholder="输入标题"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--muted-foreground)]">
                    描述
                  </label>
                  <textarea
                    value={editData.description}
                    onChange={(e) =>
                      setEditData({ ...editData, description: e.target.value })
                    }
                    placeholder="输入描述"
                    className="w-full h-20 px-3 py-2 text-sm rounded-xl border border-[var(--input)] bg-[var(--background)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--muted-foreground)]">
                    标签（逗号分隔）
                  </label>
                  <Input
                    value={editData.tags}
                    onChange={(e) =>
                      setEditData({ ...editData, tags: e.target.value })
                    }
                    placeholder="标签1, 标签2, 标签3"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSave}
                    loading={updateMutation.isPending}
                  >
                    保存
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(false)}
                  >
                    取消
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 基本信息 */}
          <div>
            <h3 className="text-sm font-medium mb-3">基本信息</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">文件名</span>
                <span className="truncate ml-2 max-w-[180px]">
                  {currentAsset.original_filename}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">大小</span>
                <span>{formatFileSize(currentAsset.file_size)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">类型</span>
                <span>{currentAsset.mime_type}</span>
              </div>
              {currentAsset.width && currentAsset.height && (
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">尺寸</span>
                  <span>
                    {currentAsset.width} × {currentAsset.height}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">上传时间</span>
                <span>{formatDate(currentAsset.created_at, "long")}</span>
              </div>
            </div>
          </div>

          {/* 位置信息 */}
          {currentAsset.location && (
            <div>
              <h3 className="text-sm font-medium mb-3">位置信息</h3>
              <div className="rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--muted)]/30">
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-[var(--primary)]" />
                    <span className="truncate">{currentAsset.location}</span>
                  </div>
                  {/* 简单的 OSM 链接 */}
                  <a
                    href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(currentAsset.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline block"
                  >
                    在 OpenStreetMap 中查看
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* 美学分析 (占位) */}
          {currentAsset.asset_type === "image" && (
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                美学分析
                <Badge variant="secondary" size="sm" className="text-[10px]">AI Beta</Badge>
              </h3>
              <div className="rounded-xl border border-[var(--border)] p-4 space-y-3 bg-[var(--muted)]/10">
                <div className="flex justify-between items-center text-sm">
                  <span>构图评分</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                      <div className="bg-green-500 h-full w-[85%]"></div>
                    </div>
                    <span className="font-mono text-xs">8.5</span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>色彩和谐度</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full w-[92%]"></div>
                    </div>
                    <span className="font-mono text-xs">9.2</span>
                  </div>
                </div>
                <p className="text-xs text-[var(--muted-foreground)] pt-2 border-t border-[var(--border)]">
                  这张照片构图平衡，色彩搭配和谐，是一张高质量的照片。
                </p>
              </div>
            </div>
          )}

          {/* AI 生成的信息 */}
          {(currentAsset.title || currentAsset.description || (currentAsset.tags && currentAsset.tags.length > 0)) && (
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-1">
                <Sparkles className="h-4 w-4 text-purple-500" />
                AI 分析
              </h3>
              {currentAsset.title && (
                <p className="font-medium mb-2">{currentAsset.title}</p>
              )}
              {currentAsset.description && (
                <p className="text-sm text-[var(--muted-foreground)] mb-3">
                  {currentAsset.description}
                </p>
              )}
              {currentAsset.tags && currentAsset.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {currentAsset.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" size="sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* EXIF 信息 */}
          {(currentAsset.taken_at || currentAsset.camera_model || currentAsset.location) && (
            <div>
              <h3 className="text-sm font-medium mb-3">拍摄信息</h3>
              <div className="space-y-2 text-sm">
                {currentAsset.taken_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[var(--muted-foreground)]" />
                    <span>{formatDate(currentAsset.taken_at, "long")}</span>
                  </div>
                )}
                {currentAsset.camera_model && (
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-[var(--muted-foreground)]" />
                    <span>{currentAsset.camera_model}</span>
                  </div>
                )}
                {currentAsset.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[var(--muted-foreground)]" />
                    <span>{currentAsset.location}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* OCR 文本 */}
          {currentAsset.ocr_text && (
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-1">
                <FileText className="h-4 w-4" />
                识别文本
              </h3>
              <p className="text-sm text-[var(--muted-foreground)] bg-[var(--muted)] p-3 rounded-xl whitespace-pre-wrap">
                {currentAsset.ocr_text}
              </p>
            </div>
          )}

          {/* 相似资产 */}
          {similarAssets && similarAssets.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3">相似资产</h3>
              <div className="grid grid-cols-3 gap-2">
                {similarAssets.map(({ asset: similarAsset, similarity }, index) => (
                  <div
                    key={`similar-${similarAsset.id}-${index}`}
                    className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <Image
                      src={
                        similarAsset.thumbnail_url ||
                        getStorageUrl(similarAsset.thumbnail_path)
                      }
                      alt={similarAsset.title || similarAsset.original_filename}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-xs text-center py-0.5">
                      {Math.round(similarity * 100)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* 图片编辑器 */}
      {assetEditorOpen && isImage && (
        <AssetEditor
          asset={currentAsset}
          onClose={() => setAssetEditorOpen(false)}
          onSuccess={(updated) => {
            setCurrentAsset(updated);
            queryClient.invalidateQueries({ queryKey: ["assets"] });
          }}
        />
      )}

      {/* AI Edit Panel */}
      <AnimatePresence>
        {aiEditPanelOpen && (
          <AIEditPanel
            asset={currentAsset}
            onClose={() => setAiEditPanelOpen(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["assets"] });
              toast.success("已保存到图库");
            }}
          />
        )}
      </AnimatePresence>

      <ShareModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        assetId={currentAsset.id}
        title={currentAsset.title || currentAsset.original_filename}
      />

      {/* Filter Panel */}
      <FilterPanel
        asset={currentAsset}
        open={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
      />
    </div>
  );
}
