"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { type Asset, getStorageUrl } from "@/lib/api";

interface AssetWaterfallProps {
    assets: Asset[];
    onAssetClick: (asset: Asset) => void;
}

export function AssetWaterfall({ assets, onAssetClick }: AssetWaterfallProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [columns, setColumns] = useState(3);

    useEffect(() => {
        const updateColumns = () => {
            if (!containerRef.current) return;
            const width = containerRef.current.offsetWidth;
            if (width < 640) setColumns(2);
            else if (width < 1024) setColumns(3);
            else setColumns(4);
        };

        updateColumns();
        window.addEventListener("resize", updateColumns);
        return () => window.removeEventListener("resize", updateColumns);
    }, []);

    // 分配资产到列
    const columnAssets: Asset[][] = Array.from({ length: columns }, () => []);
    assets.forEach((asset, index) => {
        columnAssets[index % columns].push(asset);
    });

    return (
        <div ref={containerRef} className="flex gap-4">
            {columnAssets.map((columnItems, columnIndex) => (
                <div key={columnIndex} className="flex-1 space-y-4">
                    {columnItems.map((asset, index) => (
                        <motion.div
                            key={asset.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: (columnIndex + index) * 0.05 }}
                            onClick={() => onAssetClick(asset)}
                            className="glass rounded-xl overflow-hidden cursor-pointer group hover:shadow-lg transition-all"
                        >
                            <div className="relative w-full" style={{ aspectRatio: `${asset.width}/${asset.height}` }}>
                                <Image
                                    src={getStorageUrl(asset.thumbnail_path)}
                                    alt={asset.title || asset.filename}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                            </div>
                            <div className="p-3">
                                <h3 className="font-medium text-sm truncate">
                                    {asset.title || asset.original_filename}
                                </h3>
                                {asset.tags && asset.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {asset.tags.slice(0, 3).map((tag) => (
                                            <span
                                                key={tag}
                                                className="px-1.5 py-0.5 text-xs rounded bg-[var(--muted)] text-[var(--muted-foreground)]"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            ))}
        </div>
    );
}
