"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FolderPlus, Layers } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { albumsApi, collectionsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface AddToModalProps {
  open: boolean;
  onClose: () => void;
  assetIds: number[];
  type: "album" | "collection";
}

type ListItem = { id: number; name: string; asset_count: number };

export function AddToModal({ open, onClose, assetIds, type }: AddToModalProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  const isAlbum = type === "album";
  const title = isAlbum ? "添加到相册" : "添加到集合";
  const Icon = isAlbum ? FolderPlus : Layers;

  // 获取相册列表
  const { data: albums, isLoading: albumsLoading } = useQuery({
    queryKey: ["albums", "manual"],
    queryFn: () => albumsApi.list({ album_type: "manual" }).then((r) => r.data),
    enabled: open && isAlbum,
  });

  // 获取集合列表
  const { data: collections, isLoading: collectionsLoading } = useQuery({
    queryKey: ["collections"],
    queryFn: () => collectionsApi.list().then((r) => r.data),
    enabled: open && !isAlbum,
  });

  const items: ListItem[] | undefined = isAlbum
    ? albums?.map((a) => ({ id: a.id, name: a.name, asset_count: a.asset_count }))
    : collections?.map((c) => ({ id: c.id, name: c.name, asset_count: c.asset_count }));
  
  const isLoading = isAlbum ? albumsLoading : collectionsLoading;

  // 添加到相册
  const addToAlbumMutation = useMutation({
    mutationFn: (id: number) => albumsApi.addAssets(id, assetIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["albums"] });
      toast.success("已添加到相册");
      handleClose();
    },
    onError: () => {
      toast.error("添加失败");
    },
  });

  // 添加到集合
  const addToCollectionMutation = useMutation({
    mutationFn: (id: number) => collectionsApi.addAssets(id, assetIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast.success("已添加到集合");
      handleClose();
    },
    onError: () => {
      toast.error("添加失败");
    },
  });

  // 创建相册
  const createAlbumMutation = useMutation({
    mutationFn: (name: string) => albumsApi.create({ name, asset_ids: assetIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["albums"] });
      toast.success("相册创建成功");
      handleClose();
    },
    onError: () => {
      toast.error("创建失败");
    },
  });

  // 创建集合
  const createCollectionMutation = useMutation({
    mutationFn: (name: string) => collectionsApi.create({ name, asset_ids: assetIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast.success("集合创建成功");
      handleClose();
    },
    onError: () => {
      toast.error("创建失败");
    },
  });

  const handleClose = () => {
    setSearch("");
    setShowCreate(false);
    setNewName("");
    onClose();
  };

  const handleAdd = (id: number) => {
    if (isAlbum) {
      addToAlbumMutation.mutate(id);
    } else {
      addToCollectionMutation.mutate(id);
    }
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    if (isAlbum) {
      createAlbumMutation.mutate(newName);
    } else {
      createCollectionMutation.mutate(newName);
    }
  };

  const isPending = isAlbum
    ? addToAlbumMutation.isPending || createAlbumMutation.isPending
    : addToCollectionMutation.isPending || createCollectionMutation.isPending;

  const filteredItems = items?.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal open={open} onClose={handleClose} title={title} size="md">
      <div className="space-y-4">
        {/* 搜索 */}
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`搜索${isAlbum ? "相册" : "集合"}...`}
        />

        {/* 列表 */}
        <div className="max-h-64 overflow-y-auto space-y-2">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))
          ) : filteredItems && filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleAdd(item.id)}
                disabled={isPending}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors",
                  "bg-[var(--muted)] hover:bg-[var(--accent)]",
                  isPending && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {item.asset_count} 个资产
                  </p>
                </div>
              </button>
            ))
          ) : (
            <p className="text-center text-[var(--muted-foreground)] py-4">
              {search ? "未找到匹配项" : `暂无${isAlbum ? "相册" : "集合"}`}
            </p>
          )}
        </div>

        {/* 创建新的 */}
        {showCreate ? (
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={`新${isAlbum ? "相册" : "集合"}名称`}
              autoFocus
            />
            <Button
              onClick={handleCreate}
              disabled={!newName.trim()}
              loading={isPending}
            >
              创建
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            创建新{isAlbum ? "相册" : "集合"}
          </Button>
        )}

        {/* 提示 */}
        <p className="text-xs text-[var(--muted-foreground)] text-center">
          将 {assetIds.length} 个资产添加到{isAlbum ? "相册" : "集合"}
        </p>
      </div>
    </Modal>
  );
}
