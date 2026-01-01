"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Edit, ExternalLink, Copy, Upload } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, ConfirmModal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { portalsApi, collectionsApi } from "@/lib/api";
import { copyToClipboard } from "@/lib/utils";
import toast from "react-hot-toast";

interface Portal {
  id: number;
  name: string;
  slug: string;
  collection_id: number;
  welcome_message?: string;
  is_active: boolean;
  upload_count: number;
  created_at: string;
}

export default function PortalsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [deletePortal, setDeletePortal] = useState<Portal | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    collection_id: "",
    welcome_message: "",
  });

  // 获取 Portal 列表
  const { data: portals, isLoading } = useQuery({
    queryKey: ["portals"],
    queryFn: () => portalsApi.list().then((r) => r.data),
  });

  // 获取集合列表（用于选择）
  const { data: collections } = useQuery({
    queryKey: ["collections"],
    queryFn: () => collectionsApi.list().then((r) => r.data),
  });

  // 创建 Portal
  const createMutation = useMutation({
    mutationFn: (data: {
      name: string;
      slug: string;
      collection_id: number;
      welcome_message?: string;
    }) => portalsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portals"] });
      toast.success("Portal 创建成功");
      setShowCreate(false);
      resetForm();
    },
    onError: () => {
      toast.error("创建失败");
    },
  });

  // 删除 Portal
  const deleteMutation = useMutation({
    mutationFn: (id: number) => portalsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portals"] });
      toast.success("删除成功");
      setDeletePortal(null);
    },
    onError: () => {
      toast.error("删除失败");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      collection_id: "",
      welcome_message: "",
    });
  };

  const handleCreate = () => {
    if (!formData.name.trim() || !formData.slug.trim() || !formData.collection_id) return;
    createMutation.mutate({
      name: formData.name,
      slug: formData.slug,
      collection_id: parseInt(formData.collection_id),
      welcome_message: formData.welcome_message || undefined,
    });
  };

  const handleCopyLink = async (slug: string) => {
    const url = `${window.location.origin}/portal/${slug}`;
    const success = await copyToClipboard(url);
    if (success) {
      toast.success("链接已复制");
    } else {
      toast.error("复制失败");
    }
  };

  const handleOpenLink = (slug: string) => {
    window.open(`/portal/${slug}`, "_blank");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex-1 flex">
        <Sidebar />

        <main className="flex-1 overflow-y-auto">
          {/* 页面头部 */}
          <div className="sticky top-0 z-10 glass border-b border-[var(--border)] px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/settings")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-xl font-semibold">Portal 管理</h1>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">
                  创建公开上传入口，允许外部用户上传文件
                </p>
              </div>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                创建 Portal
              </Button>
            </div>
          </div>

          {/* Portal 列表 */}
          <div className="p-6 max-w-4xl">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
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
            ) : portals && portals.length > 0 ? (
              <div className="space-y-4">
                {portals.map((portal: Portal) => (
                  <div
                    key={portal.id}
                    className="glass rounded-2xl p-4"
                  >
                    <div className="flex items-center gap-4">
                      {/* 图标 */}
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                        <Upload className="h-6 w-6 text-white" />
                      </div>

                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{portal.name}</h3>
                          <Badge
                            variant={portal.is_active ? "success" : "secondary"}
                            size="sm"
                          >
                            {portal.is_active ? "活跃" : "已停用"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-[var(--muted-foreground)]">
                          <code className="bg-[var(--muted)] px-2 py-0.5 rounded">
                            /portal/{portal.slug}
                          </code>
                          <span>·</span>
                          <span>{portal.upload_count} 次上传</span>
                        </div>
                      </div>

                      {/* 操作 */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyLink(portal.slug)}
                          title="复制链接"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenLink(portal.slug)}
                          title="打开链接"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletePortal(portal)}
                          className="text-[var(--destructive)]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--muted)] flex items-center justify-center mb-4">
                  <Upload className="w-8 h-8 text-[var(--muted-foreground)]" />
                </div>
                <h3 className="text-lg font-medium mb-1">暂无 Portal</h3>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">
                  创建 Portal 允许外部用户上传文件到指定集合
                </p>
                <Button onClick={() => setShowCreate(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  创建 Portal
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 创建 Portal 弹窗 */}
      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          resetForm();
        }}
        title="创建 Portal"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Portal 名称</label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="例如：客户资料收集"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">URL 标识</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-[var(--muted-foreground)]">/portal/</span>
              <Input
                value={formData.slug}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                  })
                }
                placeholder="my-portal"
                className="flex-1"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">目标集合</label>
            <select
              value={formData.collection_id}
              onChange={(e) =>
                setFormData({ ...formData, collection_id: e.target.value })
              }
              className="mt-1 w-full h-10 px-3 rounded-xl border border-[var(--input)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              <option value="">选择集合</option>
              {collections?.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">欢迎消息（可选）</label>
            <textarea
              value={formData.welcome_message}
              onChange={(e) =>
                setFormData({ ...formData, welcome_message: e.target.value })
              }
              placeholder="显示在上传页面的说明文字"
              className="mt-1 w-full h-20 px-3 py-2 text-sm rounded-xl border border-[var(--input)] bg-[var(--background)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreate(false);
                resetForm();
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.name.trim() || !formData.slug.trim() || !formData.collection_id}
              loading={createMutation.isPending}
            >
              创建
            </Button>
          </div>
        </div>
      </Modal>

      {/* 删除确认 */}
      <ConfirmModal
        open={!!deletePortal}
        onClose={() => setDeletePortal(null)}
        onConfirm={() =>
          deletePortal && deleteMutation.mutate(deletePortal.id)
        }
        title="删除 Portal"
        description={`确定要删除 Portal "${deletePortal?.name}" 吗？删除后链接将无法访问。`}
        confirmText="删除"
        variant="destructive"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
