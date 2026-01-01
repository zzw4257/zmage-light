"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { Lightbulb, Check, X, Sparkles, RefreshCw } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { albumsApi, tasksApi, getStorageUrl, type Album } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

export default function SuggestionsPage() {
  const queryClient = useQueryClient();

  // 获取建议列表
  const { data: suggestions, isLoading } = useQuery({
    queryKey: ["suggestions"],
    queryFn: () => albumsApi.getSuggestions().then((r) => r.data),
  });

  // 获取任务状态
  const { data: taskStatus } = useQuery({
    queryKey: ["taskStatus"],
    queryFn: () => tasksApi.getStatus().then((r) => r.data),
  });

  // 接受建议
  const acceptMutation = useMutation({
    mutationFn: (id: number) => albumsApi.accept(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["albums"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success("已接受建议");
    },
    onError: () => {
      toast.error("操作失败");
    },
  });

  // 忽略建议
  const ignoreMutation = useMutation({
    mutationFn: (id: number) => albumsApi.ignore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success("已忽略建议");
    },
    onError: () => {
      toast.error("操作失败");
    },
  });

  // 触发扫描
  const triggerMutation = useMutation({
    mutationFn: () => tasksApi.trigger("album_suggestion"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taskStatus"] });
      toast.success("扫描任务已启动");
    },
    onError: () => {
      toast.error("启动失败");
    },
  });

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
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  AI 相册建议
                </h1>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">
                  {suggestions?.length ?? 0} 个待审核建议
                  {taskStatus?.last_scan_time && (
                    <span className="ml-2">
                      · 上次扫描: {formatDate(taskStatus.last_scan_time, "relative")}
                    </span>
                  )}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => triggerMutation.mutate()}
                loading={triggerMutation.isPending}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                重新扫描
              </Button>
            </div>
          </div>

          {/* 建议列表 */}
          <div className="p-6">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="flex gap-6">
                        <div className="flex gap-2">
                          {Array.from({ length: 4 }).map((_, j) => (
                            <Skeleton key={j} className="w-20 h-20 rounded-lg" />
                          ))}
                        </div>
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-6 w-1/3" />
                          <Skeleton className="h-4 w-2/3" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : suggestions && suggestions.length > 0 ? (
              <div className="space-y-4">
                {suggestions.map((suggestion: Album & { preview_assets?: Array<{ id: number; thumbnail_url: string }> }) => (
                  <Card key={suggestion.id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row gap-6">
                        {/* 预览图片 */}
                        <div className="flex gap-2 flex-shrink-0">
                          {suggestion.preview_assets?.slice(0, 4).map((asset) => (
                            <div
                              key={asset.id}
                              className="w-20 h-20 rounded-lg overflow-hidden bg-[var(--muted)]"
                            >
                              <Image
                                src={asset.thumbnail_url || getStorageUrl(null)}
                                alt=""
                                width={80}
                                height={80}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                          {(suggestion.asset_count > 4) && (
                            <div className="w-20 h-20 rounded-lg bg-[var(--muted)] flex items-center justify-center text-sm text-[var(--muted-foreground)]">
                              +{suggestion.asset_count - 4}
                            </div>
                          )}
                        </div>

                        {/* 信息 */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-semibold">
                                {suggestion.name}
                              </h3>
                              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                                {suggestion.asset_count} 个资产
                              </p>
                            </div>
                            <Badge variant="secondary">
                              置信度: {Math.round((suggestion.suggestion_score || 0) * 100)}%
                            </Badge>
                          </div>

                          {suggestion.description && (
                            <p className="text-sm mt-2">{suggestion.description}</p>
                          )}

                          {suggestion.suggestion_reason && (
                            <div className="mt-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                              <p className="text-sm text-purple-700 dark:text-purple-300">
                                <Lightbulb className="h-4 w-4 inline mr-1" />
                                {suggestion.suggestion_reason}
                              </p>
                            </div>
                          )}

                          {/* 操作按钮 */}
                          <div className="flex gap-2 mt-4">
                            <Button
                              onClick={() => acceptMutation.mutate(suggestion.id)}
                              loading={acceptMutation.isPending}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              接受
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => ignoreMutation.mutate(suggestion.id)}
                              loading={ignoreMutation.isPending}
                            >
                              <X className="h-4 w-4 mr-1" />
                              忽略
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-purple-500" />
                </div>
                <h3 className="text-lg font-medium mb-1">暂无建议</h3>
                <p className="text-sm text-[var(--muted-foreground)] mb-4 max-w-md">
                  AI 会定期分析您的资产并生成相册建议。您也可以手动触发扫描。
                </p>
                <Button
                  variant="outline"
                  onClick={() => triggerMutation.mutate()}
                  loading={triggerMutation.isPending}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  立即扫描
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
