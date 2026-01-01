"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Lock, Calendar, Download, Eye, X, Check, Share2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sharesApi, type Share } from "@/lib/api";
import { copyToClipboard, cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  assetId?: number;
  collectionId?: number;
  title?: string;
}

export function ShareModal({
  open,
  onClose,
  assetId,
  collectionId,
  title,
}: ShareModalProps) {
  const queryClient = useQueryClient();
  const [permission, setPermission] = useState<"view" | "download">("view");
  const [password, setPassword] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>();
  const [createdShare, setCreatedShare] = useState<Share | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const createMutation = useMutation({
    mutationFn: () =>
      sharesApi.create({
        asset_id: assetId,
        collection_id: collectionId,
        permission,
        password: password || undefined,
        expires_in_days: expiresInDays,
      }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["shares"] });
      setCreatedShare(response.data);
      toast.success("分享链接已就绪");
    },
    onError: () => {
      toast.error("创建失败，请稍后重试");
    },
  });

  const handleCopyLink = async () => {
    if (!createdShare) return;
    const url = `${window.location.origin}${createdShare.share_url}`;
    const success = await copyToClipboard(url);
    if (success) {
      setIsCopied(true);
      toast.success("链接已复制到剪贴板");
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setCreatedShare(null);
    setPermission("view");
    setPassword("");
    setExpiresInDays(undefined);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-[#121214] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden"
          >
            {/* Ambient Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />

            <div className="p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                    <Share2 className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white leading-none mb-1">分享资源</h2>
                    <p className="text-xs text-zinc-500 truncate max-w-[200px]">{title || "未命名资产"}</p>
                  </div>
                </div>
                <button onClick={handleClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <AnimatePresence mode="wait">
                {!createdShare ? (
                  <motion.div
                    key="create"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    {/* Permissions */}
                    <div className="space-y-3">
                      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest pl-1">访问权限</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { id: "view", icon: Eye, label: "仅查看", desc: "受限预览" },
                          { id: "download", icon: Download, label: "可下载", desc: "完整权限" }
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => setPermission(opt.id as "view" | "download")}
                            className={cn(
                              "relative p-4 rounded-2xl border-2 text-left transition-all group",
                              permission === opt.id
                                ? "border-blue-500 bg-blue-500/5 ring-4 ring-blue-500/10"
                                : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
                            )}
                          >
                            <opt.icon className={cn("h-5 w-5 mb-2 transition-colors", permission === opt.id ? "text-blue-400" : "text-zinc-500 group-hover:text-zinc-300")} />
                            <p className={cn("font-bold text-sm", permission === opt.id ? "text-white" : "text-zinc-400")}>{opt.label}</p>
                            <p className="text-[10px] text-zinc-600 mt-0.5">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Password */}
                      <div className="space-y-3">
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest pl-1">访问密码</label>
                        <div className="relative group">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-blue-400 transition-colors" />
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="可选密码"
                            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all"
                          />
                        </div>
                      </div>

                      {/* Expiry */}
                      <div className="space-y-3">
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest pl-1">有效期</label>
                        <select
                          value={expiresInDays}
                          onChange={(e) => setExpiresInDays(e.target.value ? parseInt(e.target.value) : undefined)}
                          className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3 px-4 text-sm text-white appearance-none focus:outline-none focus:border-blue-500/50 transition-all"
                        >
                          <option value="">永久有效</option>
                          <option value="1">24 小时</option>
                          <option value="7">7 天</option>
                          <option value="30">30 天</option>
                        </select>
                      </div>
                    </div>

                    <Button
                      onClick={() => createMutation.mutate()}
                      loading={createMutation.isPending}
                      className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-lg shadow-xl shadow-blue-500/20 transform active:scale-[0.98] transition-all"
                    >
                      生成魔法链接
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    {/* Share Card Look */}
                    <div className="relative p-6 rounded-3xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-white/10 overflow-hidden group/card shadow-inner">
                      <div className="absolute top-0 right-0 p-3 opacity-20">
                        <QrCode className="h-20 w-20 text-blue-400" />
                      </div>

                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-green-500 uppercase tracking-tighter">链接已就绪</span>
                        </div>

                        <div className="flex items-center gap-3 bg-black/40 rounded-2xl p-4 border border-white/5 mb-4 group-hover/card:border-blue-500/30 transition-colors">
                          <code className="flex-1 text-xs text-blue-200/80 truncate font-mono">
                            {`${window.location.origin}${createdShare.share_url}`}
                          </code>
                          <button
                            onClick={handleCopyLink}
                            className={cn(
                              "p-2 rounded-xl transition-all active:scale-95",
                              isCopied ? "bg-green-500 text-white" : "bg-white/10 hover:bg-white/20 text-white"
                            )}
                          >
                            {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-2">
                            {createdShare.permission === "download" ? <Download className="h-3 w-3 text-blue-400" /> : <Eye className="h-3 w-3 text-blue-400" />}
                            <span className="text-[10px] font-bold text-zinc-400 uppercase">{createdShare.permission === "download" ? "可下载" : "仅预览"}</span>
                          </div>
                          {createdShare.has_password && (
                            <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
                              <Lock className="h-3 w-3 text-amber-500" />
                              <span className="text-[10px] font-bold text-amber-500 uppercase">{password}</span>
                            </div>
                          )}
                          {createdShare.expires_at && (
                            <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-2 text-zinc-400">
                              <Calendar className="h-3 w-3" />
                              <span className="text-[10px] font-bold uppercase">{new Date(createdShare.expires_at).toLocaleDateString()} 过期</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="ghost"
                        onClick={() => setCreatedShare(null)}
                        className="flex-1 h-12 rounded-2xl text-zinc-400 hover:text-white hover:bg-white/5"
                      >
                        重新生成
                      </Button>
                      <Button
                        onClick={handleClose}
                        className="flex-1 h-12 rounded-2xl bg-white text-black hover:bg-zinc-200 font-bold"
                      >
                        关闭
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
