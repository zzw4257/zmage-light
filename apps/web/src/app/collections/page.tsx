"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { Plus, MoreHorizontal, Edit, Trash2, FolderHeart, Share2 } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, ConfirmModal } from "@/components/ui/modal";
import { Dropdown, DropdownItem, DropdownSeparator } from "@/components/ui/dropdown";
import { Skeleton } from "@/components/ui/skeleton";
import { collectionsApi, type Collection } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

export default function CollectionsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editCollection, setEditCollection] = useState<Collection | null>(null);
  const [deleteCollection, setDeleteCollection] = useState<Collection | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", notes: "" });

  // 获取集合列表
  const { data: collections, isLoading } = useQuery({
    queryKey: ["collections"],
    queryFn: () => collectionsApi.list().then((r) => r.data),
  });

  // 创建集合
  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; notes?: string }) =>
      collectionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast.success("集合创建成功");
      setShowCreate(false);
      setFormData({ name: "", description: "", notes: "" });
    },
    onError: () => {
      toast.error("创建失败");
    },
  });

  // 更新集合
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Collection> }) =>
      collectionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast.success("更新成功");
      setEditCollection(null);
    },
    onError: () => {
      toast.error("更新失败");
    },
  });

  // 删除集合
  const deleteMutation = useMutation({
    mutationFn: (id: number) => collectionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast.success("删除成功");
      setDeleteCollection(null);
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
      notes: formData.notes || undefined,
    });
  };

  const handleUpdate = () => {
    if (!editCollection || !formData.name.trim()) return;
    updateMutation.mutate({
      id: editCollection.id,
      data: {
        name: formData.name,
        description: formData.description || undefined,
        notes: formData.notes || undefined,
      },
    });
  };

  const openEdit = (collection: Collection) => {
    setFormData({
      name: collection.name,
      description: collection.description || "",
      notes: collection.notes || "",
    });
    setEditCollection(collection);
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
                <h1 className="text-xl font-semibold">集合</h1>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">
                  {collections?.length ?? 0} 个集合
                </p>
              </div>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                创建集合
              </Button>
            </div>
          </div>

          {/* 集合列表 */}
          <div className="p-6">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="glass rounded-2xl p-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="w-12 h-12 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-1/4" />
                        <Skeleton className="h-4 w-1/3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : collections && collections.length > 0 ? (
              <div className="space-y-4">
                {collections.map((collection) => (
                  <div
                    key={collection.id}
                    className="group glass rounded-2xl p-4 cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => router.push(`/collections/${collection.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      {/* 图标 */}
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center flex-shrink-0">
                        <FolderHeart className="h-6 w-6 text-white" />
                      </div>

                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{collection.name}</h3>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          {collection.asset_count} 个资产 · {formatDate(collection.updated_at, "relative")}
                        </p>
                        {collection.description && (
                          <p className="text-sm text-[var(--muted-foreground)] truncate mt-1">
                            {collection.description}
                          </p>
                        )}
                      </div>

                      {/* 操作 */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Dropdown
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          }
                          align="right"
                        >
                          <DropdownItem
                            icon={<Share2 className="h-4 w-4" />}
                            onClick={() => toast.success("分享功能开发中")}
                          >
                            分享
                          </DropdownItem>
                          <DropdownItem
                            icon={<Edit className="h-4 w-4" />}
                            onClick={() => openEdit(collection)}
                          >
                            编辑
                          </DropdownItem>
                          <DropdownSeparator />
                          <DropdownItem
                            icon={<Trash2 className="h-4 w-4" />}
                            onClick={() => setDeleteCollection(collection)}
                            destructive
                          >
                            删除
                          </DropdownItem>
                        </Dropdown>
                      </div>
                    </div>

                    {/* 备注 */}
                    {collection.notes && (
                      <div className="mt-3 p-3 rounded-xl bg-[var(--muted)] text-sm">
                        {collection.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--muted)] flex items-center justify-center mb-4">
                  <FolderHeart className="w-8 h-8 text-[var(--muted-foreground)]" />
                </div>
                <h3 className="text-lg font-medium mb-1">暂无集合</h3>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">
                  创建集合来跨文件夹聚合资产
                </p>
                <Button onClick={() => setShowCreate(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  创建集合
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 创建集合弹窗 */}
      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          setFormData({ name: "", description: "", notes: "" });
        }}
        title="创建集合"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">集合名称</label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="输入集合名称"
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
              placeholder="输入集合描述"
              className="mt-1 w-full h-20 px-3 py-2 text-sm rounded-xl border border-[var(--input)] bg-[var(--background)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
          <div>
            <label className="text-sm font-medium">协作备注（可选）</label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="添加备注供协作者查看"
              className="mt-1 w-full h-20 px-3 py-2 text-sm rounded-xl border border-[var(--input)] bg-[var(--background)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreate(false);
                setFormData({ name: "", description: "", notes: "" });
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

      {/* 编辑集合弹窗 */}
      <Modal
        open={!!editCollection}
        onClose={() => {
          setEditCollection(null);
          setFormData({ name: "", description: "", notes: "" });
        }}
        title="编辑集合"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">集合名称</label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="输入集合名称"
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
              placeholder="输入集合描述"
              className="mt-1 w-full h-20 px-3 py-2 text-sm rounded-xl border border-[var(--input)] bg-[var(--background)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
          <div>
            <label className="text-sm font-medium">协作备注（可选）</label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="添加备注供协作者查看"
              className="mt-1 w-full h-20 px-3 py-2 text-sm rounded-xl border border-[var(--input)] bg-[var(--background)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditCollection(null);
                setFormData({ name: "", description: "", notes: "" });
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
        open={!!deleteCollection}
        onClose={() => setDeleteCollection(null)}
        onConfirm={() =>
          deleteCollection && deleteMutation.mutate(deleteCollection.id)
        }
        title="删除集合"
        description={`确定要删除集合 "${deleteCollection?.name}" 吗？集合中的资产不会被删除。`}
        confirmText="删除"
        variant="destructive"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
