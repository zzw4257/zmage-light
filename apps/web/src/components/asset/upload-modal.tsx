"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, File, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { AlbumSelector } from "@/components/album/album-selector";
import { assetsApi, albumsApi } from "@/lib/api";
import { cn, formatFileSize, generateId } from "@/lib/utils";
import toast from "react-hot-toast";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  folderPath?: string;
}

interface UploadFile {
  id: string;
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

export function UploadModal({ open, onClose, folderPath }: UploadModalProps) {
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null);

  const { data: albums, refetch: refetchAlbums } = useQuery({
    queryKey: ["albums", "list"],
    queryFn: () => albumsApi.list().then((r) => r.data),
  });

  // 创建新相册
  const createAlbumMutation = useMutation({
    mutationFn: (name: string) => albumsApi.create({ name }),
    onSuccess: (response) => {
      refetchAlbums();
      setSelectedAlbumId(response.data.id);
      toast.success(`相册「${response.data.name}」创建成功`);
    },
    onError: () => {
      toast.error("创建相册失败");
    },
  });

  const handleCreateAlbum = (name: string) => {
    createAlbumMutation.mutate(name);
  };

  const isCreatingAlbum = createAlbumMutation.isPending;

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
      id: generateId(),
      file,
      status: "pending",
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
      "video/*": [],
      "application/pdf": [],
    },
    maxSize: 500 * 1024 * 1024, // 500MB
  });

  const uploadFile = async (uploadFile: UploadFile) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === uploadFile.id ? { ...f, status: "uploading", progress: 0 } : f
      )
    );

    try {
      await assetsApi.upload(
        uploadFile.file,
        folderPath,
        selectedAlbumId,
        (progress) => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id ? { ...f, progress } : f
            )
          );
        }
      );
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: "success", progress: 100 }
            : f
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

    // 并发上传，最多 3 个
    const concurrency = 3;
    for (let i = 0; i < pendingFiles.length; i += concurrency) {
      const batch = pendingFiles.slice(i, i + concurrency);
      await Promise.all(batch.map(uploadFile));
    }

    setUploading(false);
    queryClient.invalidateQueries({ queryKey: ["assets"] });

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

  const clearCompleted = () => {
    setFiles((prev) => prev.filter((f) => f.status === "pending"));
  };

  const handleClose = () => {
    if (uploading) return;
    setFiles([]);
    onClose();
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const successCount = files.filter((f) => f.status === "success").length;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="上传资产"
      description="支持图片、视频、PDF 文档，单文件最大 500MB"
      size="lg"
    >
      {/* 相册选择器 - 增强版 */}
      <div className="mb-4">
        <label className="text-sm font-medium mb-2 block">上传到相册（可选）</label>
        <AlbumSelector
          albums={albums || []}
          selectedId={selectedAlbumId}
          onSelect={setSelectedAlbumId}
          onCreateNew={(name) => handleCreateAlbum(name)}
          isCreating={isCreatingAlbum}
        />
      </div>

      {/* 拖放区域 */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
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
              支持批量上传，保留文件夹结构
            </p>
          </>
        )}
      </div>

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="mt-4 max-h-64 overflow-y-auto space-y-2">
          <AnimatePresence>
            {files.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-[var(--muted)]"
              >
                <File className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-medium truncate">{file.file.name}</p>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {file.status === "uploading" && file.progress === 100
                        ? "AI 分析中..."
                        : file.status === "uploading"
                          ? `${file.progress}%`
                          : formatFileSize(file.file.size)}
                    </span>
                  </div>
                  {/* Porgress Bar */}
                  {file.status === "uploading" && (
                    <div className="h-1 w-full bg-[var(--background)] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-[var(--primary)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${file.progress}%` }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                  )}
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    {file.error && (
                      <span className="text-[var(--destructive)]">
                        {file.error}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex-shrink-0 ml-2">
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
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      {/* 操作按钮 */}
      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-[var(--muted-foreground)]">
          {files.length > 0 && (
            <>
              {pendingCount > 0 && `${pendingCount} 个待上传`}
              {successCount > 0 && ` · ${successCount} 个已完成`}
            </>
          )}
        </div>
        <div className="flex gap-2">
          {successCount > 0 && (
            <Button variant="outline" onClick={clearCompleted}>
              清除已完成
            </Button>
          )}
          <Button
            onClick={handleUpload}
            disabled={pendingCount === 0 || uploading}
            loading={uploading}
          >
            {uploading ? "上传中..." : `上传 ${pendingCount} 个文件`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
