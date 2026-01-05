"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Menu,
  Upload,
  Sparkles,
  Grid3X3,
  List,
  Check,
  Settings,
  Bell,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dropdown, DropdownItem, DropdownSeparator } from "@/components/ui/dropdown";
import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";
import { User as UserIcon } from "lucide-react";

interface HeaderProps {
  onUploadClick?: () => void;
  onAIChatClick?: () => void;
}

export function Header({ onUploadClick, onAIChatClick }: HeaderProps) {
  const router = useRouter();
  const {
    searchQuery,
    setSearchQuery,
    aiSearchEnabled,
    setAiSearchEnabled,
    viewMode,
    setViewMode,
    sidebarOpen,
    toggleSidebar,
    batchMode,
    setBatchMode,
    clearSelection,
  } = useAppStore();

  const [localQuery, setLocalQuery] = useState(searchQuery);

  // 获取用户信息
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me().then(res => res.data),
    retry: false,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localQuery);
  };

  const handleLogout = () => {
    localStorage.removeItem("zmage_token");
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-40 glass border-b border-[var(--border)]">
      <div className="flex h-16 items-center gap-4 px-4 md:px-6">
        {/* 侧边栏切换 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="md:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => router.push("/")}
        >
          <img src="/logo-icon.png" alt="Zmage Logo" className="w-8 h-8 rounded-lg" />
          <span className="hidden md:block font-semibold text-lg">Zmage</span>
        </div>

        {/* 搜索框 */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
            <Input
              type="search"
              placeholder={aiSearchEnabled ? "AI 语义搜索..." : "搜索资产..."}
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              className={cn(
                "pl-10 pr-20",
                aiSearchEnabled && "border-purple-500 focus:ring-purple-500"
              )}
            />
            <button
              type="button"
              onClick={() => setAiSearchEnabled(!aiSearchEnabled)}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg text-xs font-medium transition-colors",
                aiSearchEnabled
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-100"
                  : "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--accent)]"
              )}
            >
              <Sparkles className="h-3 w-3 inline mr-1" />
              AI
            </button>
          </div>
        </form>

        {/* 右侧操作 */}
        <div className="flex items-center gap-2">
          {/* AI 对话按钮 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onAIChatClick}
            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>

          {/* 视图切换 */}
          <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-[var(--secondary)]">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 rounded-lg transition-colors",
                viewMode === "grid"
                  ? "bg-[var(--background)] shadow-sm"
                  : "hover:bg-[var(--accent)]"
              )}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 rounded-lg transition-colors",
                viewMode === "list"
                  ? "bg-[var(--background)] shadow-sm"
                  : "hover:bg-[var(--accent)]"
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <div className="h-6 w-px bg-[var(--border)] mx-1" />

          {/* 批量选择开关 - 增强可见性 + 快捷键提示 */}
          <div className="relative group">
            <Button
              variant={batchMode ? "default" : "secondary"}
              size="sm"
              onClick={() => {
                if (batchMode) {
                  clearSelection();
                } else {
                  setBatchMode(true);
                }
              }}
              className={cn(
                "gap-2 border-2",
                batchMode ? "bg-blue-500 hover:bg-blue-600 text-white shadow-lg border-blue-600" : "border-gray-200"
              )}
            >
              <Check className="h-4 w-4" />
              <span className="font-bold">{batchMode ? "取消选择" : "批量操作"}</span>
            </Button>
            {/* 快捷键提示 Tooltip */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              <div className="bg-black/90 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
                <div className="font-semibold mb-1">⌨️ 快捷键</div>
                <div className="space-y-0.5 text-white/80">
                  <div><kbd className="px-1 py-0.5 bg-white/20 rounded">Ctrl+A</kbd> 全选</div>
                  <div><kbd className="px-1 py-0.5 bg-white/20 rounded">Shift+点击</kbd> 范围选</div>
                  <div><kbd className="px-1 py-0.5 bg-white/20 rounded">Esc</kbd> 取消选择</div>
                </div>
              </div>
            </div>
          </div>

          {/* 上传按钮 */}
          <Button onClick={onUploadClick} className="hidden md:flex">
            <Upload className="h-4 w-4 mr-2" />
            上传
          </Button>
          <Button onClick={onUploadClick} size="icon" className="md:hidden">
            <Upload className="h-4 w-4" />
          </Button>

          {/* 通知 */}
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>

          {/* 用户菜单 */}
          <Dropdown
            trigger={
              <Button variant="ghost" className="relative h-10 w-auto px-2 hover:bg-[var(--secondary)] gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shrink-0">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <UserIcon className="h-4 w-4" />
                  )}
                </div>
                <div className="hidden md:flex flex-col items-start text-xs">
                  <span className="font-semibold">{user?.full_name || user?.username || "未登录"}</span>
                  <span className="text-[var(--muted-foreground)]">个人中心</span>
                </div>
              </Button>
            }
            align="right"
          >
            <DropdownItem onClick={() => router.push("/settings")}>
              系统设置
            </DropdownItem>
            <DropdownItem onClick={() => router.push("/settings/presets")}>
              下载预设
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem onClick={() => router.push("/settings/tasks")}>
              后台任务
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem onClick={handleLogout}>
              <span className="text-red-600">退出登录</span>
            </DropdownItem>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}
