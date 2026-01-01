"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Settings,
  Database,
  HardDrive,
  Image,
  Film,
  FileText,
  Activity,
  Download,
  Upload,
  ListTodo,
  ChevronRight,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { tasksApi } from "@/lib/api";
import { formatFileSize } from "@/lib/utils";

export default function SettingsPage() {
  // 获取系统统计
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: () => tasksApi.getStats().then((r) => r.data),
  });

  // 获取任务状态
  const { data: taskStatus } = useQuery({
    queryKey: ["taskStatus"],
    queryFn: () => tasksApi.getStatus().then((r) => r.data),
  });

  const settingsLinks = [
    {
      href: "/settings/presets",
      icon: Download,
      title: "下载预设",
      description: "管理图片下载的格式和尺寸预设",
      color: "from-blue-500 to-cyan-500",
    },
    {
      href: "/settings/portals",
      icon: Upload,
      title: "Portal 管理",
      description: "创建公开上传入口",
      color: "from-green-500 to-emerald-500",
    },
    {
      href: "/settings/tasks",
      icon: ListTodo,
      title: "后台任务",
      description: "管理和监控后台处理任务",
      color: "from-purple-500 to-pink-500",
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
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <h1 className="text-xl font-semibold">系统设置</h1>
            </div>
          </div>

          <div className="p-6 space-y-6 max-w-4xl">
            {/* 快捷入口 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {settingsLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="glass rounded-2xl p-4 hover:bg-[var(--accent)] transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${link.color} flex items-center justify-center flex-shrink-0`}
                    >
                      <link.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium">{link.title}</h3>
                      <p className="text-sm text-[var(--muted-foreground)] truncate">
                        {link.description}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-[var(--muted-foreground)] group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>

            {/* 系统概览 */}
            <Card>
              <CardHeader>
                <CardTitle>系统概览</CardTitle>
                <CardDescription>Zmage 数字资产管理系统运行状态</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-[var(--muted)]">
                    <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                      <Database className="h-4 w-4" />
                      <span className="text-sm">总资产</span>
                    </div>
                    <p className="text-2xl font-semibold mt-1">
                      {stats?.total_assets ?? 0}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--muted)]">
                    <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                      <HardDrive className="h-4 w-4" />
                      <span className="text-sm">存储使用</span>
                    </div>
                    <p className="text-2xl font-semibold mt-1">
                      {formatFileSize(stats?.storage_used ?? 0)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--muted)]">
                    <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                      <Activity className="h-4 w-4" />
                      <span className="text-sm">最近上传</span>
                    </div>
                    <p className="text-2xl font-semibold mt-1">
                      {stats?.recent_uploads ?? 0}
                      <span className="text-sm font-normal text-[var(--muted-foreground)] ml-1">
                        / 7天
                      </span>
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--muted)]">
                    <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                      <span className="text-sm">待审核建议</span>
                    </div>
                    <p className="text-2xl font-semibold mt-1">
                      {stats?.pending_suggestions ?? 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 资产分布 */}
            <Card>
              <CardHeader>
                <CardTitle>资产分布</CardTitle>
                <CardDescription>按类型统计的资产数量</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4 text-blue-500" />
                      <span>图片</span>
                    </div>
                    <Badge variant="secondary">
                      {stats?.asset_by_type?.image ?? 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Film className="h-4 w-4 text-purple-500" />
                      <span>视频</span>
                    </div>
                    <Badge variant="secondary">
                      {stats?.asset_by_type?.video ?? 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-500" />
                      <span>文档</span>
                    </div>
                    <Badge variant="secondary">
                      {stats?.asset_by_type?.document ?? 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--muted-foreground)]">其他</span>
                    </div>
                    <Badge variant="secondary">
                      {stats?.asset_by_type?.other ?? 0}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 后台任务状态 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>后台任务</CardTitle>
                    <CardDescription>定时任务和队列状态</CardDescription>
                  </div>
                  <Link
                    href="/settings/tasks"
                    className="text-sm text-[var(--primary)] hover:underline"
                  >
                    查看详情
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 rounded-xl bg-[var(--muted)] text-center">
                    <p className="text-2xl font-semibold">
                      {taskStatus?.queue_length ?? 0}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">队列长度</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--muted)] text-center">
                    <p className="text-2xl font-semibold">
                      {taskStatus?.pending_tasks ?? 0}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">等待中</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-center">
                    <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                      {taskStatus?.running_tasks ?? 0}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">运行中</p>
                  </div>
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-center">
                    <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
                      {taskStatus?.failed_tasks ?? 0}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400">失败</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 系统信息 */}
            <Card>
              <CardHeader>
                <CardTitle>系统信息</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">版本</span>
                    <span>1.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">前端</span>
                    <span>Next.js 14</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">后端</span>
                    <span>FastAPI</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">AI 引擎</span>
                    <span>Gemini</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
