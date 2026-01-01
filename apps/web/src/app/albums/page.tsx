"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { Plus, MoreHorizontal, Edit, Trash2, Image as ImageIcon } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, ConfirmModal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Dropdown, DropdownItem, DropdownSeparator } from "@/components/ui/dropdown";
import { Skeleton } from "@/components/ui/skeleton";
import { albumsApi, getStorageUrl, type Album } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

export default function AlbumsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editAlbum, setEditAlbum] = useState<Album | null>(null);
  const [deleteAlbum, setDeleteAlbum] = useState<Album | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  // 获取相册列表
  const { data: albums, isLoading } = useQuery({
    queryKey: ["albums"],
    queryFn: () => albumsApi.list({ status: "accepted" }).then((r) => r.data),
  });

  // 创建相册
  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      albumsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["albums"] });
      toast.success("相册创建成功");
      setShowCreate(false);
      setFormData({ name: "", description: "" });
    },
    onError: () => {
      toast.error("创建失败");
    },
  });

  // 更新相册
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Album> }) =>
      albumsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["albums"] });
      toast.success("更新成功");
      setEditAlbum(null);
    },
    onError: () => {
      toast.error("更新失败");
    },
  });

  // 删除相册
  const deleteMutation = useMutation({
    mutationFn: (id: number) => albumsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["albums"] });
      toast.success("删除成功");
      setDeleteAlbum(null);
    },
    onError: () => {
      toast.error("删除失败");
    },
  });

  const handleCreate = () => {
    if (!formData.name.trim()) return;
    createMutation.mutate({
      name: formData.name,
      description: formData.description || undefined,
    });
  };

  const handleUpdate = () => {
    if (!editAlbum || !formData.name.trim()) return;
    updateMutation.mutate({
      id: editAlbum.id,
      data: {
        name: formData.name,
        description: formData.description || undefined,
      },
    });
  };

  const openEdit = (album: Album) => {
    setFormData({
      name: album.name,
      description: album.description || "",
    });
    setEditAlbum(album);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex-1 flex">
        <Sidebar />

        <main className="flex-1 overflow-y-auto">
          {/* 页面头部 */}
          <div className="sticky top-0 z-10 glass border-b border-[var(--border)] px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold">相册</h1>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">
                  {albums?.length ?? 0} 个相册
                </p>
              </div>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                创建相册
              </Button>
            </div>
          </div>

          {/* 相册网格 */}
          <div className="p-6">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="glass rounded-2xl overflow-hidden">
                    <Skeleton className="aspect-[4/3] rounded-none" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : albums && albums.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {albums.map((album) => (
                  <div
                    key={album.id}
                    className="group glass rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => router.push(`/albums/${album.id}`)}
                  >
                    {/* 封面 */}
                    <div className="relative aspect-[4/3] bg-[var(--muted)]">
                      {album.cover_url ? (
                        <Image
                          src={album.cover_url}
                          alt={album.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <ImageIcon className="h-12 w-12 text-[var(--muted-foreground)]" />
                        </div>
                      )}

                      {/* 操作菜单 */}
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
                            icon={<Edit className="h-4 w-4" />}
                            onClick={() => openEdit(album)}
                          >
                            编辑
                          </DropdownItem>
                          <DropdownSeparator />
                          <DropdownItem
                            icon={<Trash2 className="h-4 w-4" />}
                            onClick={() => setDeleteAlbum(album)}
                            destructive
                          >
                            删除
                          </DropdownItem>
                        </Dropdown>
                      </div>

                      {/* 类型标签 */}
                      {album.album_type !== "manual" && (
                        <div className="absolute bottom-2 left-2">
                          <Badge
                            variant={
                              album.album_type === "smart" ? "success" : "warning"
                            }
                            size="sm"
                          >
                            {album.album_type === "smart" ? "智能" : "AI 建议"}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* 信息 */}
                    <div className="p-4">
                      <h3 className="font-medium truncate">{album.name}</h3>
                      <p className="text-sm text-[var(--muted-foreground)] mt-1">
                        {album.asset_count} 个资产 · {formatDate(album.updated_at, "relative")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--muted)] flex items-center justify-center mb-4">
                  <ImageIcon className="w-8 h-8 text-[var(--muted-foreground)]" />
                </div>
                <h3 className="text-lg font-medium mb-1">暂无相册</h3>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">
                  创建相册来组织您的资产
                </p>
                <Button onClick={() => setShowCreate(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  创建相册
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 创建相册弹窗 */}
      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          setFormData({ name: "", description: "" });
        }}
        title="创建相册"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">相册名称</label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="输入相册名称"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">描述（可选）</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="输入相册描述"
              className="mt-1 w-full h-20 px-3 py-2 text-sm rounded-xl border border-[var(--input)] bg-[var(--background)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreate(false);
                setFormData({ name: "", description: "" });
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.name.trim()}
              loading={createMutation.isPending}
            >
              创建
            </Button>
          </div>
        </div>
      </Modal>

      {/* 编辑相册弹窗 */}
      <Modal
        open={!!editAlbum}
        onClose={() => {
          setEditAlbum(null);
          setFormData({ name: "", description: "" });
        }}
        title="编辑相册"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">相册名称</label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="输入相册名称"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">描述（可选）</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="输入相册描述"
              className="mt-1 w-full h-20 px-3 py-2 text-sm rounded-xl border border-[var(--input)] bg-[var(--background)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditAlbum(null);
                setFormData({ name: "", description: "" });
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!formData.name.trim()}
              loading={updateMutation.isPending}
            >
              保存
            </Button>
          </div>
        </div>
      </Modal>

      {/* 删除确认 */}
      <ConfirmModal
        open={!!deleteAlbum}
        onClose={() => setDeleteAlbum(null)}
        onConfirm={() => deleteAlbum && deleteMutation.mutate(deleteAlbum.id)}
        title="删除相册"
        description={`确定要删除相册 "${deleteAlbum?.name}" 吗？相册中的资产不会被删除。`}
        confirmText="删除"
        variant="destructive"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
