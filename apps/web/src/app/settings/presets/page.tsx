"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Star, Edit } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, ConfirmModal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadsApi, type DownloadPreset } from "@/lib/api";
import toast from "react-hot-toast";

export default function PresetsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editPreset, setEditPreset] = useState<DownloadPreset | null>(null);
  const [deletePreset, setDeletePreset] = useState<DownloadPreset | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    width: "",
    height: "",
    format: "original",
    quality: "90",
  });

  // 获取预设列表
  const { data: presets, isLoading } = useQuery({
    queryKey: ["presets"],
    queryFn: () => downloadsApi.getPresets().then((r) => r.data),
  });

  // 创建预设
  const createMutation = useMutation({
    mutationFn: (data: Partial<DownloadPreset>) =>
      downloadsApi.createPreset(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["presets"] });
      toast.success("预设创建成功");
      setShowCreate(false);
      resetForm();
    },
    onError: () => {
      toast.error("创建失败");
    },
  });

  // 删除预设
  const deleteMutation = useMutation({
    mutationFn: (id: number) => downloadsApi.deletePreset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["presets"] });
      toast.success("删除成功");
      setDeletePreset(null);
    },
    onError: () => {
      toast.error("删除失败");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      width: "",
      height: "",
      format: "original",
      quality: "90",
    });
  };

  const handleCreate = () => {
    if (!formData.name.trim()) return;
    createMutation.mutate({
      name: formData.name,
      description: formData.description || undefined,
      width: formData.width ? parseInt(formData.width) : undefined,
      height: formData.height ? parseInt(formData.height) : undefined,
      format: formData.format,
      quality: parseInt(formData.quality),
    });
  };

  const openEdit = (preset: DownloadPreset) => {
    setFormData({
      name: preset.name,
      description: preset.description || "",
      width: preset.width?.toString() || "",
      height: preset.height?.toString() || "",
      format: preset.format,
      quality: preset.quality.toString(),
    });
    setEditPreset(preset);
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
                <h1 className="text-xl font-semibold">下载预设</h1>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">
                  管理图片下载的格式和尺寸预设
                </p>
              </div>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                创建预设
              </Button>
            </div>
          </div>

          {/* 预设列表 */}
          <div className="p-6 max-w-4xl">
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
            ) : presets && presets.length > 0 ? (
              <div className="space-y-4">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="glass rounded-2xl p-4"
                  >
                    <div className="flex items-center gap-4">
                      {/* 图标 */}
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">
                          {preset.format.toUpperCase().slice(0, 3)}
                        </span>
                      </div>

                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{preset.name}</h3>
                          {preset.is_default && (
                            <Badge variant="warning" size="sm">
                              <Star className="h-3 w-3 mr-1" />
                              默认
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-[var(--muted-foreground)]">
                          {preset.width && preset.height && (
                            <span>{preset.width}×{preset.height}</span>
                          )}
                          {preset.width && !preset.height && (
                            <span>宽度 {preset.width}px</span>
                          )}
                          {!preset.width && preset.height && (
                            <span>高度 {preset.height}px</span>
                          )}
                          {!preset.width && !preset.height && (
                            <span>原始尺寸</span>
                          )}
                          <span>·</span>
                          <span>{preset.format.toUpperCase()}</span>
                          <span>·</span>
                          <span>质量 {preset.quality}%</span>
                        </div>
                        {preset.description && (
                          <p className="text-sm text-[var(--muted-foreground)] mt-1">
                            {preset.description}
                          </p>
                        )}
                      </div>

                      {/* 操作 */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(preset)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!preset.is_default && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletePreset(preset)}
                            className="text-[var(--destructive)]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <h3 className="text-lg font-medium mb-1">暂无预设</h3>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">
                  创建下载预设以快速导出特定格式的图片
                </p>
                <Button onClick={() => setShowCreate(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  创建预设
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 创建预设弹窗 */}
      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          resetForm();
        }}
        title="创建下载预设"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">预设名称</label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="例如：微信朋友圈"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">描述（可选）</label>
            <Input
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="预设用途说明"
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">宽度（可选）</label>
              <Input
                type="number"
                value={formData.width}
                onChange={(e) =>
                  setFormData({ ...formData, width: e.target.value })
                }
                placeholder="像素"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">高度（可选）</label>
              <Input
                type="number"
                value={formData.height}
                onChange={(e) =>
                  setFormData({ ...formData, height: e.target.value })
                }
                placeholder="像素"
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">格式</label>
              <select
                value={formData.format}
                onChange={(e) =>
                  setFormData({ ...formData, format: e.target.value })
                }
                className="mt-1 w-full h-10 px-3 rounded-xl border border-[var(--input)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                <option value="original">保持原格式</option>
                <option value="jpeg">JPEG</option>
                <option value="png">PNG</option>
                <option value="webp">WebP</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">质量</label>
              <Input
                type="number"
                min="1"
                max="100"
                value={formData.quality}
                onChange={(e) =>
                  setFormData({ ...formData, quality: e.target.value })
                }
                className="mt-1"
              />
            </div>
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
              disabled={!formData.name.trim()}
              loading={createMutation.isPending}
            >
              创建
            </Button>
          </div>
        </div>
      </Modal>

      {/* 删除确认 */}
      <ConfirmModal
        open={!!deletePreset}
        onClose={() => setDeletePreset(null)}
        onConfirm={() =>
          deletePreset && deleteMutation.mutate(deletePreset.id)
        }
        title="删除预设"
        description={`确定要删除预设 "${deletePreset?.name}" 吗？`}
        confirmText="删除"
        variant="destructive"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
