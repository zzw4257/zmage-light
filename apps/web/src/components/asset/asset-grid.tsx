"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AssetCard } from "./asset-card";
import { DragSelect } from "@/components/ui/drag-select";
import { AssetGridSkeleton } from "@/components/ui/skeleton";
import type { Asset } from "@/lib/api";
import { useAppStore } from "@/store";

interface AssetGridProps {
  assets: Asset[];
  loading?: boolean;
  onAssetClick?: (asset: Asset) => void;
  onAssetEdit?: (asset: Asset) => void;
  onAssetDelete?: (asset: Asset) => void;
  onAssetShare?: (asset: Asset) => void;
  onAssetMoveToVault?: (asset: Asset) => void;
  actionRenderer?: (asset: Asset) => React.ReactNode;
}

export function AssetGrid({
  assets,
  loading,
  onAssetClick,
  onAssetEdit,
  onAssetDelete,
  onAssetShare,
  onAssetMoveToVault,
  actionRenderer,
}: AssetGridProps) {
  const { selectedAssets, toggleAssetSelection, setSelectedAssets, setBatchMode, batchMode } = useAppStore();

  const handleDragSelection = (indices: number[]) => {
    const selectedIds = indices.map(index => assets[index].id);
    if (selectedIds.length > 0 && !batchMode) {
      setBatchMode(true);
    }
    setSelectedAssets(selectedIds);
  };

  if (loading) {
    return <AssetGridSkeleton count={12} />;
  }

  if (assets.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[var(--primary)]/10 to-[var(--accent)] flex items-center justify-center mb-6 shadow-sm">
          <svg
            className="w-10 h-10 text-[var(--primary)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold mb-2 text-[var(--foreground)]">媒体库空空如也</h3>
        <p className="text-[var(--muted-foreground)] max-w-xs mx-auto">
          开始上传您的第一张照片或视频，AI 将为您自动整理和排版。
        </p>
      </motion.div>
    );
  }

  return (
    <DragSelect onSelectionChange={handleDragSelection} className="asset-grid">
      <AnimatePresence mode="popLayout">
        {assets.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            selected={selectedAssets.includes(asset.id)}
            onSelect={() => {
              if (!batchMode) setBatchMode(true);
              toggleAssetSelection(asset.id);
            }}
            onClick={() => onAssetClick?.(asset)}
            onEdit={() => onAssetEdit?.(asset)}
            onDelete={() => onAssetDelete?.(asset)}
            onShare={() => onAssetShare?.(asset)}
            onMoveToVault={() => onAssetMoveToVault?.(asset)}
            actionRenderer={actionRenderer}
          />
        ))}
      </AnimatePresence>
    </DragSelect>
  );
}
