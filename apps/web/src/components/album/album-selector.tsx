"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Search, Plus, Check, FolderHeart, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Album } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AlbumSelectorProps {
    albums: Album[];
    selectedId: number | null;
    onSelect: (id: number | null) => void;
    onCreateNew?: (name: string) => void;
    isCreating?: boolean;
}

export function AlbumSelector({
    albums,
    selectedId,
    onSelect,
    onCreateNew,
    isCreating,
}: AlbumSelectorProps) {
    const [search, setSearch] = useState("");
    const [showCreateInput, setShowCreateInput] = useState(false);
    const [newAlbumName, setNewAlbumName] = useState("");

    const filteredAlbums = useMemo(() => {
        if (!search.trim()) return albums;
        const query = search.toLowerCase();
        return albums.filter((a) => a.name.toLowerCase().includes(query));
    }, [albums, search]);

    const handleCreateNew = () => {
        if (newAlbumName.trim() && onCreateNew) {
            onCreateNew(newAlbumName.trim());
            setNewAlbumName("");
            setShowCreateInput(false);
        }
    };

    const selectedAlbum = albums.find((a) => a.id === selectedId);

    return (
        <div className="space-y-2">
            {/* 搜索栏 */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="搜索相册..."
                    className="pl-9"
                />
            </div>

            {/* 相册列表 */}
            <div className="max-h-40 overflow-y-auto space-y-1 border border-[var(--border)] rounded-xl p-2">
                {/* 默认位置 */}
                <button
                    type="button"
                    onClick={() => onSelect(null)}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                        selectedId === null
                            ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                            : "hover:bg-[var(--muted)]"
                    )}
                >
                    <FolderHeart className="h-5 w-5" />
                    <span className="flex-1 text-sm">上传到媒体库（不添加到相册）</span>
                    {selectedId === null && <Check className="h-4 w-4" />}
                </button>

                {/* 相册选项 */}
                {filteredAlbums.map((album) => (
                    <button
                        key={album.id}
                        type="button"
                        onClick={() => onSelect(album.id)}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                            selectedId === album.id
                                ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                                : "hover:bg-[var(--muted)]"
                        )}
                    >
                        {/* 小缩略图 */}
                        <div className="w-8 h-8 rounded-md bg-[var(--muted)] overflow-hidden flex-shrink-0">
                            {album.cover_url ? (
                                <Image
                                    src={album.cover_url}
                                    alt={album.name}
                                    width={32}
                                    height={32}
                                    className="object-cover w-full h-full"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <FolderHeart className="h-4 w-4 text-[var(--muted-foreground)]" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{album.name}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">
                                {album.asset_count || 0} 个资产
                            </p>
                        </div>
                        {selectedId === album.id && <Check className="h-4 w-4" />}
                    </button>
                ))}

                {filteredAlbums.length === 0 && search && (
                    <p className="text-sm text-[var(--muted-foreground)] text-center py-2">
                        未找到相册
                    </p>
                )}
            </div>

            {/* 创建新相册 */}
            {onCreateNew && (
                <div className="pt-1">
                    {showCreateInput ? (
                        <div className="flex gap-2">
                            <Input
                                value={newAlbumName}
                                onChange={(e) => setNewAlbumName(e.target.value)}
                                placeholder="输入相册名称"
                                className="flex-1"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleCreateNew();
                                    if (e.key === "Escape") setShowCreateInput(false);
                                }}
                            />
                            <Button
                                size="sm"
                                onClick={handleCreateNew}
                                disabled={!newAlbumName.trim() || isCreating}
                            >
                                {isCreating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    "创建"
                                )}
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowCreateInput(false)}
                            >
                                取消
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-1"
                            onClick={() => setShowCreateInput(true)}
                        >
                            <Plus className="h-4 w-4" />
                            创建新相册
                        </Button>
                    )}
                </div>
            )}

            {/* 当前选中提示 */}
            {selectedAlbum && (
                <p className="text-xs text-[var(--muted-foreground)]">
                    上传后资产将添加到「{selectedAlbum.name}」相册
                </p>
            )}
        </div>
    );
}
