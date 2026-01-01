"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Calendar, HardDrive, Image as ImageIcon, MapPin } from "lucide-react";
import { type Asset, getStorageUrl } from "@/lib/api";
import { formatFileSize, formatDate } from "@/lib/utils";

interface AssetListViewProps {
    assets: Asset[];
    onAssetClick: (asset: Asset) => void;
}

export function AssetListView({ assets, onAssetClick }: AssetListViewProps) {
    return (
        <div className="space-y-2">
            {assets.map((asset, index) => (
                <motion.div
                    key={asset.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onAssetClick(asset)}
                    className="glass rounded-xl p-4 hover:bg-[var(--accent)] transition-colors cursor-pointer group"
                >
                    <div className="flex gap-4">
                        {/* 缩略图 */}
                        <div className="relative w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-[var(--muted)]">
                            <Image
                                src={getStorageUrl(asset.thumbnail_path)}
                                alt={asset.title || asset.filename}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                        </div>

                        {/* 信息 */}
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg mb-1 truncate">
                                {asset.title || asset.original_filename}
                            </h3>
                            <p className="text-sm text-[var(--muted-foreground)] mb-3 line-clamp-2">
                                {asset.description || "暂无描述"}
                            </p>

                            <div className="flex flex-wrap gap-4 text-xs text-[var(--muted-foreground)]">
                                <div className="flex items-center gap-1">
                                    <ImageIcon className="h-3 w-3" />
                                    <span>{asset.width} × {asset.height}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <HardDrive className="h-3 w-3" />
                                    <span>{formatFileSize(asset.file_size)}</span>
                                </div>
                                {asset.taken_at && (
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>{formatDate(asset.taken_at)}</span>
                                    </div>
                                )}
                                {asset.location && (
                                    <div className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        <span>有位置信息</span>
                                    </div>
                                )}
                            </div>

                            {/* 标签 */}
                            {asset.tags && asset.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {asset.tags.slice(0, 5).map((tag) => (
                                        <span
                                            key={tag}
                                            className="px-2 py-0.5 text-xs rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                    {asset.tags.length > 5 && (
                                        <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
                                            +{asset.tags.length - 5}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
