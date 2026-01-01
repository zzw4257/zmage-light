"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Check, Play, FileText, MoreHorizontal, Download, Share2, Trash2, Edit, Lock } from "lucide-react";
import { Dropdown, DropdownItem, DropdownSeparator } from "@/components/ui/dropdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Asset } from "@/lib/api";
import { getStorageUrl, downloadsApi } from "@/lib/api";
import { useAppStore } from "@/store";
import { cn, formatFileSize, formatDuration, getStatusLabel, getStatusColor } from "@/lib/utils";

interface AssetCardProps {
  asset: Asset;
  selected?: boolean;
  onSelect?: () => void;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onMoveToVault?: () => void;
  actionRenderer?: (asset: Asset) => React.ReactNode;
}

export function AssetCard({
  asset,
  selected,
  onSelect,
  onClick,
  onEdit,
  onDelete,
  onShare,
  onMoveToVault,
  actionRenderer,
}: AssetCardProps) {
  const { batchMode } = useAppStore();
  const [imageError, setImageError] = useState(false);

  const thumbnailUrl = asset.thumbnail_url || getStorageUrl(asset.thumbnail_path);
  const isImage = asset.asset_type === "image";
  const isVideo = asset.asset_type === "video";
  const isReady = asset.status === "ready";

  const handleClick = () => {
    if (batchMode && onSelect) {
      onSelect();
    } else if (onClick) {
      onClick();
    }
  };

  const handleDownload = () => {
    downloadsApi.downloadAsset(asset.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{
        scale: 1.02,
        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
      }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "asset-card group relative glass rounded-2xl overflow-hidden cursor-pointer transition-shadow",
        selected && "ring-2 ring-[var(--primary)] shadow-lg"
      )}
      onClick={handleClick}
    >
      {/* 缩略图 */}
      <div className="relative aspect-square bg-[var(--muted)]">
        {isReady && thumbnailUrl && !imageError ? (
          <Image
            src={thumbnailUrl}
            alt={asset.title || asset.original_filename}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {isVideo ? (
              <Play className="h-12 w-12 text-[var(--muted-foreground)]" />
            ) : (
              <FileText className="h-12 w-12 text-[var(--muted-foreground)]" />
            )}
          </div>
        )}

        {/* 视频时长 */}
        {isVideo && asset.duration && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-xs">
            {formatDuration(asset.duration)}
          </div>
        )}

        {/* 选择框 */}
        {(batchMode || selected) && (
          <div
            className={cn(
              "absolute top-2 left-2 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors",
              selected
                ? "bg-[var(--primary)] border-[var(--primary)]"
                : "bg-white/80 border-[var(--border)]"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.();
            }}
          >
            {selected && <Check className="h-4 w-4 text-white" />}
          </div>
        )}

        {/* 状态标签 */}
        {!isReady && (
          <div className="absolute top-2 right-2">
            <Badge
              variant={asset.status === "failed" ? "error" : "warning"}
              size="sm"
            >
              {getStatusLabel(asset.status)}
            </Badge>
          </div>
        )}

        {/* 悬停操作 */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
          {actionRenderer ? (
            actionRenderer(asset)
          ) : (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Dropdown
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-white/80 hover:bg-white"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                }
                align="right"
              >
                <DropdownItem
                  icon={<Download className="h-4 w-4" />}
                  onClick={handleDownload}
                >
                  下载
                </DropdownItem>
                <DropdownItem
                  icon={<Share2 className="h-4 w-4" />}
                  onClick={onShare}
                >
                  分享
                </DropdownItem>
                <DropdownItem
                  icon={<Edit className="h-4 w-4" />}
                  onClick={onEdit}
                >
                  编辑
                </DropdownItem>
                {onMoveToVault && (
                  <DropdownItem
                    icon={<Lock className="h-4 w-4" />}
                    onClick={onMoveToVault}
                  >
                    移入保险库
                  </DropdownItem>
                )}
                <DropdownSeparator />
                <DropdownItem
                  icon={<Trash2 className="h-4 w-4" />}
                  onClick={onDelete}
                  destructive
                >
                  移至回收站
                </DropdownItem>
              </Dropdown>
            </div>
          )}
        </div>
      </div>

      {/* 信息 */}
      <div className="p-3">
        <h3 className="font-medium text-sm truncate">
          {asset.title || asset.original_filename}
        </h3>
        <div className="flex items-center gap-2 mt-1 text-xs text-[var(--muted-foreground)]">
          <span>{formatFileSize(asset.file_size)}</span>
          {asset.width && asset.height && (
            <>
              <span>•</span>
              <span>
                {asset.width}×{asset.height}
              </span>
            </>
          )}
        </div>
        {asset.tags && asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {asset.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" size="sm">
                {tag}
              </Badge>
            ))}
            {asset.tags.length > 3 && (
              <Badge variant="secondary" size="sm">
                +{asset.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
