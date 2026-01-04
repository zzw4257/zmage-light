"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Image as ImageIcon } from "lucide-react";
import { albumsApi, type Album } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AlbumCoverProps {
    album: Album;
    className?: string;
}

/**
 * 相册封面组件
 * 如果有封面则显示封面，否则显示马赛克预览（最多4张缩略图）
 */
export function AlbumCover({ album, className }: AlbumCoverProps) {
    // 如果有封面，直接显示
    if (album.cover_url) {
        return (
            <div className={cn("relative w-full h-full bg-[var(--muted)]", className)}>
                <Image
                    src={album.cover_url}
                    alt={album.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                />
            </div>
        );
    }

    // 没有封面时显示马赛克预览
    return <AlbumMosaicPreview albumId={album.id} className={className} />;
}

interface AlbumMosaicPreviewProps {
    albumId: number;
    className?: string;
}

function AlbumMosaicPreview({ albumId, className }: AlbumMosaicPreviewProps) {
    const { data } = useQuery({
        queryKey: ["album", albumId, "preview"],
        queryFn: () => albumsApi.getPreview(albumId, 4).then((r) => r.data),
        staleTime: 60000, // 1分钟缓存
    });

    const previewUrls = data?.preview_urls || [];

    // 空相册
    if (previewUrls.length === 0) {
        return (
            <div className={cn("relative w-full h-full bg-[var(--muted)] flex items-center justify-center", className)}>
                <ImageIcon className="h-12 w-12 text-[var(--muted-foreground)]" />
            </div>
        );
    }

    // 马赛克布局
    if (previewUrls.length === 1) {
        return (
            <div className={cn("relative w-full h-full bg-[var(--muted)]", className)}>
                <Image
                    src={previewUrls[0]}
                    alt="Preview"
                    fill
                    className="object-cover"
                />
            </div>
        );
    }

    if (previewUrls.length === 2) {
        return (
            <div className={cn("relative w-full h-full grid grid-cols-2 gap-0.5 bg-[var(--muted)]", className)}>
                {previewUrls.map((url, i) => (
                    <div key={i} className="relative overflow-hidden">
                        <Image src={url} alt={`Preview ${i}`} fill className="object-cover" />
                    </div>
                ))}
            </div>
        );
    }

    if (previewUrls.length === 3) {
        return (
            <div className={cn("relative w-full h-full grid grid-cols-2 gap-0.5 bg-[var(--muted)]", className)}>
                <div className="relative row-span-2 overflow-hidden">
                    <Image src={previewUrls[0]} alt="Preview 0" fill className="object-cover" />
                </div>
                <div className="relative overflow-hidden">
                    <Image src={previewUrls[1]} alt="Preview 1" fill className="object-cover" />
                </div>
                <div className="relative overflow-hidden">
                    <Image src={previewUrls[2]} alt="Preview 2" fill className="object-cover" />
                </div>
            </div>
        );
    }

    // 4张图片的2x2布局
    return (
        <div className={cn("relative w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5 bg-[var(--muted)]", className)}>
            {previewUrls.slice(0, 4).map((url, i) => (
                <div key={i} className="relative overflow-hidden">
                    <Image src={url} alt={`Preview ${i}`} fill className="object-cover" />
                </div>
            ))}
        </div>
    );
}
