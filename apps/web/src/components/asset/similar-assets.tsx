"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { assetsApi, getStorageUrl, type Asset } from "@/lib/api";
import { cn } from "@/lib/utils";

interface SimilarAssetsProps {
  assetId: number;
  onAssetClick?: (asset: Asset) => void;
  limit?: number;
}

export function SimilarAssets({
  assetId,
  onAssetClick,
  limit = 6,
}: SimilarAssetsProps) {
  const { data: similar, isLoading } = useQuery({
    queryKey: ["similarAssets", assetId],
    queryFn: () => assetsApi.getSimilar(assetId, limit).then((r) => r.data),
    enabled: !!assetId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--muted-foreground)]">
          <Sparkles className="h-4 w-4" />
          <span>相似推荐</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!similar || similar.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-[var(--muted-foreground)]">
        <Sparkles className="h-4 w-4" />
        <span>相似推荐</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {similar.map(({ asset, similarity }) => (
          <button
            key={asset.id}
            onClick={() => onAssetClick?.(asset)}
            className="group relative aspect-square rounded-lg overflow-hidden bg-[var(--muted)]"
          >
            <Image
              src={asset.thumbnail_url || getStorageUrl(asset.thumbnail_path)}
              alt={asset.title || asset.original_filename}
              fill
              className="object-cover group-hover:scale-105 transition-transform"
            />
            {/* 相似度指示 */}
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-black/60 text-white">
              {Math.round(similarity * 100)}%
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
