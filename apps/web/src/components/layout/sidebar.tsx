"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Home, Image as ImageIcon, Film, FileText,
  Album, Lightbulb, FolderHeart, Share2,
  ChevronRight, ChevronDown, X, Settings, Plus, Folder, Map,
  Lock, Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { foldersApi, tasksApi } from "@/lib/api";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

export function Sidebar({ mobile, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { sidebarOpen, setCurrentFolderId } = useAppStore();
  const [foldersExpanded, setFoldersExpanded] = useState(true);

  // 获取文件夹树
  const { data: folders } = useQuery({
    queryKey: ["folders"],
    queryFn: () => foldersApi.getTree().then((r) => r.data),
  });

  // 获取待审核建议数量
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: () => tasksApi.getStats().then((r) => r.data),
  });

  const mainNav: NavItem[] = [
    { label: "全部资产", href: "/", icon: <Home className="h-4 w-4" /> },
    { label: "足迹地图", href: "/map", icon: <Map className="h-4 w-4" /> },
    { label: "图片", href: "/?type=image", icon: <ImageIcon className="h-4 w-4" /> },
    { label: "视频", href: "/?type=video", icon: <Film className="h-4 w-4" /> },
    { label: "文档", href: "/?type=document", icon: <FileText className="h-4 w-4" /> },
  ];

  const organizeNav: NavItem[] = [
    { label: "相册", href: "/albums", icon: <Album className="h-4 w-4" /> },
    {
      label: "AI 建议",
      href: "/suggestions",
      icon: <Lightbulb className="h-4 w-4" />,
      badge: stats?.pending_suggestions,
    },
    { label: "集合", href: "/collections", icon: <FolderHeart className="h-4 w-4" /> },
    { label: "分享", href: "/shares", icon: <Share2 className="h-4 w-4" /> },
    { label: "私密保险库", href: "/vault", icon: <Lock className="h-4 w-4" /> },
    { label: "回收站", href: "/trash", icon: <Trash2 className="h-4 w-4" /> },
  ];

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

    return (
      <button
        onClick={() => {
          router.push(item.href);
          if (mobile) onClose?.();
        }}
        className={cn(
          "flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm transition-colors",
          isActive
            ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
            : "hover:bg-[var(--accent)]"
        )}
      >
        {item.icon}
        <span className="flex-1 text-left">{item.label}</span>
        {item.badge !== undefined && item.badge > 0 && (
          <Badge variant="warning" size="sm">
            {item.badge}
          </Badge>
        )}
      </button>
    );
  };

  const FolderTree = ({ items, level = 0 }: { items: any[]; level?: number }) => {
    const [expanded, setExpanded] = useState<Record<number, boolean>>({});

    if (!items) return null;

    return (
      <div className={cn(level > 0 && "ml-4")}>
        {items.map((folder) => (
          <div key={folder.id}>
            <button
              onClick={() => {
                setCurrentFolderId(folder.id);
                router.push(`/?folder=${folder.id}`);
                if (mobile) onClose?.();
              }}
              className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-sm hover:bg-[var(--accent)] transition-colors"
            >
              {folder.children && folder.children.length > 0 ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded((prev) => ({
                      ...prev,
                      [folder.id]: !prev[folder.id],
                    }));
                  }}
                  className="p-0.5"
                >
                  {expanded[folder.id] ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
              ) : (
                <span className="w-4" />
              )}
              <Folder className="h-4 w-4 text-[var(--muted-foreground)]" />
              <span className="flex-1 text-left truncate">{folder.name}</span>
              <span className="text-xs text-[var(--muted-foreground)]">
                {folder.asset_count}
              </span>
            </button>

            <AnimatePresence>
              {expanded[folder.id] && folder.children && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <FolderTree items={folder.children} level={level + 1} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    );
  };

  const sidebarContent = (
    <div className="flex-1 flex flex-col h-full">
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Logo (for mobile) */}
        {mobile && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <img src="/logo-icon.png" alt="Zmage Logo" className="w-8 h-8 rounded-lg" />
              <span className="font-semibold text-lg">Zmage</span>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* 主导航 */}
        <div className="space-y-1">
          {mainNav.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        {/* 文件夹 */}
        <div>
          <button
            onClick={() => setFoldersExpanded(!foldersExpanded)}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider"
          >
            {foldersExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            文件夹
          </button>

          <AnimatePresence>
            {foldersExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <FolderTree items={folders || []} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 组织 */}
        <div>
          <div className="px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
            组织
          </div>
          <div className="space-y-1">
            {organizeNav.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>
      </nav>

      {/* 底部统计 */}
      <div className="p-4 border-t border-[var(--border)] bg-[var(--background)]">
        {/* 账号设置 */}
        <button
          onClick={() => {
            router.push("/account");
            if (mobile) onClose?.();
          }}
          className="flex items-center gap-3 w-full px-3 py-2 mb-3 rounded-xl text-sm hover:bg-[var(--accent)] transition-colors"
        >
          <Settings className="h-4 w-4" />
          <span>账号设置</span>
        </button>

        <div className="text-xs text-[var(--muted-foreground)]">
          <div className="flex justify-between">
            <span>总资产</span>
            <span>{stats?.total_assets || 0}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>存储使用</span>
            <span>
              {stats?.storage_used
                ? `${(stats.storage_used / 1024 / 1024 / 1024).toFixed(2)} GB`
                : "0 GB"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  if (mobile) {
    return (
      <AnimatePresence>
        {sidebarOpen && (
          <div className="fixed inset-0 z-[100] md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/50"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute inset-y-0 left-0 w-72 bg-[var(--background)] shadow-2xl flex flex-col"
            >
              {sidebarContent}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    );
  }

  if (!sidebarOpen) return null;

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-[var(--border)] bg-[var(--background)]">
      {sidebarContent}
    </aside>
  );
}
