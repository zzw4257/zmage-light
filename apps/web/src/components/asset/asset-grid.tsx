"use client";

import { useRef, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AssetCard } from "./asset-card";
import { DragSelect } from "@/components/ui/drag-select";
import { AssetGridSkeleton } from "@/components/ui/skeleton";
import type { Asset } from "@/lib/api";
import { useAppStore } from "@/store";
import toast from "react-hot-toast";

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
  const {
    selectedAssets,
    toggleAssetSelection,
    setSelectedAssets,
    setBatchMode,
    batchMode,
    clearSelection
  } = useAppStore();

  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  // Ctrl+A & Esc Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid triggering when user is typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl + A (or Cmd + A)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        if (assets.length > 0) {
          const allIds = assets.map(a => a.id);
          setSelectedAssets(allIds);
          setBatchMode(true);
          toast.success(`已全选 ${allIds.length} 项资源`, {
            id: 'select-all-toast', // Avoid duplicates
            icon: '✅',
          });
        }
      }

      // Esc
      if (e.key === 'Escape') {
        clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [assets, setSelectedAssets, setBatchMode, clearSelection]);

  const handleDragSelection = (indices: number[]) => {
    const selectedIds = indices.map(index => assets[index].id);
    if (selectedIds.length > 0 && !batchMode) {
      setBatchMode(true);
    }
    setSelectedAssets(selectedIds);
  };

  const handleAssetClick = (asset: Asset, index: number, e: React.MouseEvent) => {
    // Range selection with Shift
    if (e.shiftKey && lastSelectedIndex !== null && assets.length > 0) {
      e.preventDefault();
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangeIds = assets.slice(start, end + 1).map(a => a.id);

      // Calculate union of existing selection and new range
      const newSelection = Array.from(new Set([...selectedAssets, ...rangeIds]));
      setSelectedAssets(newSelection);
      if (!batchMode) setBatchMode(true);
      return;
    }

    setLastSelectedIndex(index);

    if (batchMode) {
      toggleAssetSelection(asset.id);
    } else {
      onAssetClick?.(asset);
    }
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
        {assets.map((asset, index) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            selected={selectedAssets.includes(asset.id)}
            onSelect={() => {
              if (!batchMode) setBatchMode(true);
              toggleAssetSelection(asset.id);
            }}
            onClick={(e: React.MouseEvent) => handleAssetClick(asset, index, e)}
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
