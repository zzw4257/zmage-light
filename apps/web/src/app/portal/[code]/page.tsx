"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Upload, CheckCircle, AlertCircle, Loader2, File, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { sharesApi, assetsApi } from "@/lib/api";
import { formatFileSize, generateId, cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface UploadFile {
  id: string;
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

export default function PortalPage() {
  const params = useParams();
  const code = params.code as string;
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // 获取 Portal 信息
  const { data: portal, isLoading, error } = useQuery({
    queryKey: ["portal", code],
    queryFn: () => sharesApi.getPortal(code).then((r) => r.data),
    retry: false,
  });

  const onDrop = (acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
      id: generateId(),
      file,
      status: "pending",
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: portal?.allowed_types
      ? Object.fromEntries(portal.allowed_types.map((t) => [t, []]))
      : undefined,
    maxSize: portal?.max_file_size || 100 * 1024 * 1024,
  });

  const uploadFile = async (uploadFile: UploadFile) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === uploadFile.id ? { ...f, status: "uploading" } : f
      )
    );

    try {
      await assetsApi.uploadToPortal(code, uploadFile.file);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, status: "success" } : f
        )
      );
    } catch (error: any) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? {
                ...f,
                status: "error",
                error: error.response?.data?.detail || "上传失败",
              }
            : f
        )
      );
    }
  };

  const handleUpload = async () => {
    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) return;

    setUploading(true);

    for (const file of pendingFiles) {
      await uploadFile(file);
    }

    setUploading(false);

    const successCount = files.filter((f) => f.status === "success").length;
    const errorCount = files.filter((f) => f.status === "error").length;

    if (errorCount === 0) {
      toast.success(`成功上传 ${successCount} 个文件`);
    } else {
      toast.error(`${successCount} 个成功，${errorCount} 个失败`);
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
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

  // 错误
  if (error || !portal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-xl font-semibold">无法访问</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Portal 链接无效或已过期
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const successCount = files.filter((f) => f.status === "success").length;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* 头部 */}
      <header className="glass border-b border-[var(--border)] px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">Z</span>
          </div>
          <span className="font-semibold">Zmage Portal</span>
        </div>
      </header>

      {/* 内容 */}
      <main className="max-w-2xl mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold">{portal.name || "文件上传"}</h1>
          {portal.description && (
            <p className="text-[var(--muted-foreground)] mt-2">
              {portal.description}
            </p>
          )}
        </div>

        {/* 上传区域 */}
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors",
            isDragActive
              ? "border-[var(--primary)] bg-[var(--primary)]/5"
              : "border-[var(--border)] hover:border-[var(--primary)]"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 mx-auto mb-4 text-[var(--muted-foreground)]" />
          {isDragActive ? (
            <p className="text-[var(--primary)]">放开以上传文件</p>
          ) : (
            <>
              <p className="font-medium">拖放文件到此处，或点击选择</p>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                {portal.allowed_types
                  ? `支持: ${portal.allowed_types.join(", ")}`
                  : "支持所有文件类型"}
                {portal.max_file_size && (
                  <span> · 最大 {formatFileSize(portal.max_file_size)}</span>
                )}
              </p>
            </>
          )}
        </div>

        {/* 文件列表 */}
        {files.length > 0 && (
          <div className="mt-6 space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-[var(--muted)]"
              >
                <File className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.file.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {formatFileSize(file.file.size)}
                    {file.error && (
                      <span className="text-[var(--destructive)] ml-2">
                        {file.error}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {file.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {file.status === "uploading" && (
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" />
                  )}
                  {file.status === "success" && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  {file.status === "error" && (
                    <AlertCircle className="h-5 w-5 text-[var(--destructive)]" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 上传按钮 */}
        {pendingCount > 0 && (
          <div className="mt-6 flex justify-center">
            <Button
              size="lg"
              onClick={handleUpload}
              disabled={uploading}
              loading={uploading}
            >
              {uploading ? "上传中..." : `上传 ${pendingCount} 个文件`}
            </Button>
          </div>
        )}

        {/* 完成提示 */}
        {successCount > 0 && pendingCount === 0 && !uploading && (
          <div className="mt-6 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 text-center">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="font-medium text-green-700 dark:text-green-300">
              上传完成
            </p>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              成功上传 {successCount} 个文件
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
