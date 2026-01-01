"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { albumsApi } from "@/lib/api";
import toast from "react-hot-toast";

interface AddToAlbumModalProps {
    open: boolean;
    onClose: () => void;
    assetIds: number[];
}

export function AddToAlbumModal({ open, onClose, assetIds }: AddToAlbumModalProps) {
    const [newAlbumName, setNewAlbumName] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const queryClient = useQueryClient();

    const { data: albums } = useQuery({
        queryKey: ["albums", "accepted"],
        queryFn: () => albumsApi.list({ status: "accepted" }).then(r => r.data),
        enabled: open,
    });

    const createAlbumMutation = useMutation({
        mutationFn: async (name: string) => {
            const album = await albumsApi.create({ name, description: "" });
            // Add assets to the new album
            await albumsApi.addAssets(album.data.id, assetIds);
            return album;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["albums"] });
            toast.success("已创建相册并添加资产");
            onClose();
        },
        onError: () => {
            toast.error("创建相册失败");
        },
    });

    const addToExistingMutation = useMutation({
        mutationFn: async (albumId: number) => {
            await albumsApi.addAssets(albumId, assetIds);
        },
        onSuccess: () => {
            toast.success("已添加到相册");
            onClose();
        },
        onError: () => {
            toast.error("添加失败");
        },
    });

    const filteredAlbums = albums?.filter(album =>
        album.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!open) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-md bg-[var(--background)] rounded-2xl shadow-2xl border border-[var(--border)] overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-[var(--border)]">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold">加入相册</h2>
                            <Button variant="ghost" size="icon" onClick={onClose}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        <p className="text-sm text-[var(--muted-foreground)] mt-1">
                            将 {assetIds.length} 个资产添加到相册
                        </p>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                        {/* Create New Album */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">创建新相册</label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="相册名称..."
                                    value={newAlbumName}
                                    onChange={(e) => setNewAlbumName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && newAlbumName.trim()) {
                                            createAlbumMutation.mutate(newAlbumName);
                                        }
                                    }}
                                />
                                <Button
                                    onClick={() => createAlbumMutation.mutate(newAlbumName)}
                                    disabled={!newAlbumName.trim() || createAlbumMutation.isPending}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    创建
                                </Button>
                            </div>
                        </div>

                        {/* Search Existing Albums */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">添加到已有相册</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                                <Input
                                    placeholder="搜索相册..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        {/* Album List */}
                        <div className="space-y-2">
                            {filteredAlbums && filteredAlbums.length > 0 ? (
                                filteredAlbums.map((album) => (
                                    <button
                                        key={album.id}
                                        onClick={() => addToExistingMutation.mutate(album.id)}
                                        disabled={addToExistingMutation.isPending}
                                        className="w-full p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--accent)] transition-colors text-left"
                                    >
                                        <div className="font-medium">{album.name}</div>
                                        {album.description && (
                                            <div className="text-sm text-[var(--muted-foreground)] mt-1">
                                                {album.description}
                                            </div>
                                        )}
                                    </button>
                                ))
                            ) : (
                                <div className="text-center py-8 text-[var(--muted-foreground)]">
                                    {searchQuery ? "未找到相册" : "暂无相册"}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
