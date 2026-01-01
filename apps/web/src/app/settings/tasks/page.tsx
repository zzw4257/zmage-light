"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw, Play, AlertCircle, CheckCircle, Clock, Loader2 } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { tasksApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

export default function TasksPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // 获取任务状态
  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ["taskStatus"],
    queryFn: () => tasksApi.getStatus().then((r) => r.data),
    refetchInterval: 5000, // 每 5 秒刷新
  });

  // 触发任务
  const triggerMutation = useMutation({
    mutationFn: (taskType: string) => tasksApi.trigger(taskType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taskStatus"] });
      toast.success("任务已启动");
    },
    onError: () => {
      toast.error("启动失败");
    },
  });

  // 重试任务
  const retryMutation = useMutation({
    mutationFn: (id: number) => tasksApi.retry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taskStatus"] });
      toast.success("任务已重试");
    },
    onError: () => {
      toast.error("重试失败");
    },
  });

  const getStatusIcon = (taskStatus: string) => {
    switch (taskStatus) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "running":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (taskStatus: string) => {
    switch (taskStatus) {
      case "completed":
        return <Badge variant="success" size="sm">已完成</Badge>;
      case "failed":
        return <Badge variant="error" size="sm">失败</Badge>;
      case "running":
        return <Badge variant="warning" size="sm">运行中</Badge>;
      default:
        return <Badge variant="secondary" size="sm">等待中</Badge>;
    }
  };

  const taskTypes = [
    {
      type: "album_suggestion",
      name: "AI 相册建议",
      description: "分析资产并生成智能相册建议",
    },
    {
      type: "asset_processing",
      name: "资产处理",
      description: "处理待处理的资产（缩略图、AI 分析等）",
    },
    {
      type: "duplicate_detection",
      name: "重复检测",
      description: "扫描并标记重复的资产",
    },
  ];

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
                <h1 className="text-xl font-semibold">后台任务</h1>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">
                  管理和监控后台处理任务
                </p>
              </div>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                刷新
              </Button>
            </div>
          </div>

          <div className="p-6 max-w-4xl space-y-6">
            {/* 队列状态 */}
            <Card>
              <CardHeader>
                <CardTitle>队列状态</CardTitle>
                <CardDescription>当前任务队列概览</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="grid grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-[var(--muted)]">
                      <p className="text-sm text-[var(--muted-foreground)]">队列长度</p>
                      <p className="text-2xl font-semibold mt-1">
                        {status?.queue_length ?? 0}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-[var(--muted)]">
                      <p className="text-sm text-[var(--muted-foreground)]">等待中</p>
                      <p className="text-2xl font-semibold mt-1">
                        {status?.pending_tasks ?? 0}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                      <p className="text-sm text-blue-600 dark:text-blue-400">运行中</p>
                      <p className="text-2xl font-semibold mt-1 text-blue-700 dark:text-blue-300">
                        {status?.running_tasks ?? 0}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20">
                      <p className="text-sm text-red-600 dark:text-red-400">失败</p>
                      <p className="text-2xl font-semibold mt-1 text-red-700 dark:text-red-300">
                        {status?.failed_tasks ?? 0}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 手动触发 */}
            <Card>
              <CardHeader>
                <CardTitle>手动触发</CardTitle>
                <CardDescription>手动启动后台任务</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {taskTypes.map((task) => (
                    <div
                      key={task.type}
                      className="flex items-center justify-between p-4 rounded-xl bg-[var(--muted)]"
                    >
                      <div>
                        <h4 className="font-medium">{task.name}</h4>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          {task.description}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => triggerMutation.mutate(task.type)}
                        loading={triggerMutation.isPending}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        启动
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 最近任务 */}
            <Card>
              <CardHeader>
                <CardTitle>最近任务</CardTitle>
                <CardDescription>
                  上次扫描: {status?.last_scan_time ? formatDate(status.last_scan_time, "long") : "从未"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 rounded-xl" />
                    ))}
                  </div>
                ) : status?.recent_tasks && status.recent_tasks.length > 0 ? (
                  <div className="space-y-2">
                    {status.recent_tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-4 p-3 rounded-xl bg-[var(--muted)]"
                      >
                        {getStatusIcon(task.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{task.task_type}</span>
                            <span className="text-xs text-[var(--muted-foreground)]">
                              #{task.id}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            {formatDate(task.created_at, "long")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {task.status === "running" && task.progress > 0 && (
                            <span className="text-sm text-[var(--muted-foreground)]">
                              {task.progress}%
                            </span>
                          )}
                          {getStatusBadge(task.status)}
                          {task.status === "failed" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => retryMutation.mutate(task.id)}
                              loading={retryMutation.isPending}
                            >
                              重试
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-[var(--muted-foreground)] py-8">
                    暂无任务记录
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
