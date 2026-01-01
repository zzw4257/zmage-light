"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Link, Copy, ExternalLink, Trash2, Eye, Download, Lock, Clock } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmModal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { sharesApi, type Share } from "@/lib/api";
import { formatDate, copyToClipboard } from "@/lib/utils";
import toast from "react-hot-toast";

export default function SharesPage() {
  const queryClient = useQueryClient();
  const [deleteShare, setDeleteShare] = useState<Share | null>(null);

  // 获取分享列表
  const { data: shares, isLoading } = useQuery({
    queryKey: ["shares"],
    queryFn: () => sharesApi.list().then((r) => r.data),
  });

  // 删除分享
  const deleteMutation = useMutation({
    mutationFn: (id: number) => sharesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares"] });
      toast.success("删除成功");
      setDeleteShare(null);
    },
    onError: () => {
      toast.error("删除失败");
    },
  });

  // 停用分享
  const deactivateMutation = useMutation({
    mutationFn: (id: number) => sharesApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares"] });
      toast.success("已停用");
    },
    onError: () => {
      toast.error("操作失败");
    },
  });

  const handleCopyLink = async (share: Share) => {
    const url = `${window.location.origin}${share.share_url}`;
    const success = await copyToClipboard(url);
    if (success) {
      toast.success("链接已复制");
    } else {
      toast.error("复制失败");
    }
  };

  const handleOpenLink = (share: Share) => {
    window.open(share.share_url, "_blank");
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
                <h1 className="text-xl font-semibold">分享管理</h1>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">
                  {shares?.length ?? 0} 个分享链接
                </p>
              </div>
            </div>
          </div>

          {/* 分享列表 */}
          <div className="p-6">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="glass rounded-2xl p-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="w-10 h-10 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-1/3" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : shares && shares.length > 0 ? (
              <div className="space-y-4">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="glass rounded-2xl p-4"
                  >
                    <div className="flex items-center gap-4">
                      {/* 图标 */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        share.is_active
                          ? "bg-green-100 dark:bg-green-900/30"
                          : "bg-gray-100 dark:bg-gray-800"
                      }`}>
                        <Link className={`h-5 w-5 ${
                          share.is_active
                            ? "text-green-600 dark:text-green-400"
                            : "text-gray-400"
                        }`} />
                      </div>

                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono bg-[var(--muted)] px-2 py-0.5 rounded">
                            {share.share_code}
                          </code>
                          {!share.is_active && (
                            <Badge variant="secondary" size="sm">已停用</Badge>
                          )}
                          {share.has_password && (
                            <Badge variant="warning" size="sm">
                              <Lock className="h-3 w-3 mr-1" />
                              密码保护
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-[var(--muted-foreground)]">
                          <span>
                            {share.asset_id ? "单个资产" : "集合"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {share.view_count} 次查看
                          </span>
                          {share.permission === "download" && (
                            <span className="flex items-center gap-1">
                              <Download className="h-3 w-3" />
                              {share.download_count} 次下载
                            </span>
                          )}
                          {share.expires_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(share.expires_at) > new Date()
                                ? `${formatDate(share.expires_at)} 过期`
                                : "已过期"}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">
                          创建于 {formatDate(share.created_at, "long")}
                        </p>
                      </div>

                      {/* 操作 */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyLink(share)}
                          title="复制链接"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenLink(share)}
                          title="打开链接"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        {share.is_active && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deactivateMutation.mutate(share.id)}
                            loading={deactivateMutation.isPending}
                          >
                            停用
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteShare(share)}
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
                  <Link className="w-8 h-8 text-[var(--muted-foreground)]" />
                </div>
                <h3 className="text-lg font-medium mb-1">暂无分享</h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  在资产或集合上点击分享按钮创建分享链接
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 删除确认 */}
      <ConfirmModal
        open={!!deleteShare}
        onClose={() => setDeleteShare(null)}
        onConfirm={() => deleteShare && deleteMutation.mutate(deleteShare.id)}
        title="删除分享"
        description="确定要删除此分享链接吗？删除后链接将无法访问。"
        confirmText="删除"
        variant="destructive"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
