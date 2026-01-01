"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { Download, Lock, Eye, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { sharesApi, downloadsApi, getStorageUrl, type Asset } from "@/lib/api";
import { formatFileSize, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

export default function SharePage() {
  const params = useParams();
  const code = params.code as string;
  const [password, setPassword] = useState("");
  const [verified, setVerified] = useState(false);

  // 获取分享信息
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["share", code, verified ? password : null],
    queryFn: async () => {
      const response = await sharesApi.getByCode(code, verified ? password : undefined);
      return response.data;
    },
    retry: false,
  });

  const handleVerify = async () => {
    if (!password) return;
    setVerified(true);
    refetch();
  };

  const handleDownload = async (asset: Asset) => {
    try {
      await downloadsApi.downloadAsset(asset.id);
      toast.success("下载已开始");
    } catch {
      toast.error("下载失败");
    }
  };

  // 加载中
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin mx-auto" />
          <p className="mt-4 text-[var(--muted-foreground)]">加载中...</p>
        </div>
      </div>
    );
  }

  // 需要密码
  if (error && (error as any).response?.status === 401) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-[var(--muted)] flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-[var(--muted-foreground)]" />
              </div>
              <h1 className="text-xl font-semibold">需要密码</h1>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                此分享链接受密码保护
              </p>
            </div>
            <div className="space-y-4">
              <Input
                type="password"
                placeholder="输入访问密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              />
              <Button className="w-full" onClick={handleVerify}>
                验证
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 错误或过期
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-xl font-semibold">无法访问</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              分享链接无效或已过期
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { share, assets } = data;
  const canDownload = share.permission === "download";

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* 头部 */}
      <header className="glass border-b border-[var(--border)] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">Z</span>
            </div>
            <span className="font-semibold">Zmage 分享</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-[var(--muted-foreground)]">
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {share.view_count} 次查看
            </span>
            {share.expires_at && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(share.expires_at)} 过期
              </span>
            )}
          </div>
        </div>
      </header>

      {/* 内容 */}
      <main className="max-w-6xl mx-auto p-6">
        {assets.length === 1 ? (
          // 单个资产
          <div className="flex flex-col items-center">
            <div className="relative max-w-4xl w-full">
              {assets[0].asset_type === "image" ? (
                <Image
                  src={assets[0].url || getStorageUrl(assets[0].file_path)}
                  alt={assets[0].title || assets[0].original_filename}
                  width={assets[0].width || 1200}
                  height={assets[0].height || 800}
                  className="w-full h-auto rounded-2xl shadow-lg"
                />
              ) : assets[0].asset_type === "video" ? (
                <video
                  src={assets[0].url || getStorageUrl(assets[0].file_path)}
                  controls
                  className="w-full rounded-2xl shadow-lg"
                />
              ) : (
                <div className="aspect-video bg-[var(--muted)] rounded-2xl flex items-center justify-center">
                  <span className="text-[var(--muted-foreground)]">
                    {assets[0].mime_type}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 text-center">
              <h1 className="text-xl font-semibold">
                {assets[0].title || assets[0].original_filename}
              </h1>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                {formatFileSize(assets[0].file_size)}
                {assets[0].width && assets[0].height && (
                  <span> · {assets[0].width}×{assets[0].height}</span>
                )}
              </p>
              {assets[0].description && (
                <p className="mt-3 text-[var(--muted-foreground)] max-w-xl">
                  {assets[0].description}
                </p>
              )}
              {canDownload && (
                <Button
                  className="mt-4"
                  onClick={() => handleDownload(assets[0])}
                >
                  <Download className="h-4 w-4 mr-2" />
                  下载原图
                </Button>
              )}
            </div>
          </div>
        ) : (
          // 多个资产
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-semibold">
                {assets.length} 个资产
              </h1>
              {canDownload && (
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  下载全部
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-[var(--muted)]"
                >
                  {asset.asset_type === "image" && (
                    <Image
                      src={asset.thumbnail_url || getStorageUrl(asset.thumbnail_path)}
                      alt={asset.title || asset.original_filename}
                      fill
                      className="object-cover"
                    />
                  )}
                  {canDownload && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white"
                        onClick={() => handleDownload(asset)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
