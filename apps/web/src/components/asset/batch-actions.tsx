"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  Share2,
  Trash2,
  FolderPlus,
  Tag,
  Album,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store";
import { albumsApi, collectionsApi, downloadsApi } from "@/lib/api";
import toast from "react-hot-toast";

interface BatchActionsProps {
  onDelete?: () => void;
  onShare?: () => void;
}

export function BatchActions({ onDelete, onShare }: BatchActionsProps) {
  const { selectedAssets, clearSelection, setBatchMode } = useAppStore();
  const [showAddToAlbum, setShowAddToAlbum] = useState(false);
  const [showAddToCollection, setShowAddToCollection] = useState(false);
  const [albumName, setAlbumName] = useState("");
  const [collectionName, setCollectionName] = useState("");

  if (selectedAssets.length === 0) return null;

  const handleDownload = async () => {
    try {
      const response = await downloadsApi.downloadBatch(selectedAssets);
      const blob = new Blob([response.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "zmage_download.zip";
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("下载已开始");
    } catch {
      toast.error("下载失败");
    }
  };

  const handleCreateAlbum = async () => {
    if (!albumName.trim()) return;
    try {
      await albumsApi.create({
        name: albumName,
        asset_ids: selectedAssets,
      });
      toast.success("相册创建成功");
      setShowAddToAlbum(false);
      setAlbumName("");
      clearSelection();
    } catch {
      toast.error("创建失败");
    }
  };

  const handleCreateCollection = async () => {
    if (!collectionName.trim()) return;
    try {
      await collectionsApi.create({
        name: collectionName,
        asset_ids: selectedAssets,
      });
      toast.success("集合创建成功");
      setShowAddToCollection(false);
      setCollectionName("");
      clearSelection();
    } catch {
      toast.error("创建失败");
    }
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="glass rounded-2xl shadow-xl px-4 py-3 flex items-center gap-4">
            <span className="text-sm font-medium">
              已选择 {selectedAssets.length} 项
            </span>

            <div className="h-6 w-px bg-[var(--border)]" />

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" />
                下载
              </Button>
              <Button variant="ghost" size="sm" onClick={onShare}>
                <Share2 className="h-4 w-4 mr-1" />
                分享
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddToAlbum(true)}
              >
                <Album className="h-4 w-4 mr-1" />
                添加到相册
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddToCollection(true)}
              >
                <FolderPlus className="h-4 w-4 mr-1" />
                添加到集合
              </Button>
              <Button variant="ghost" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-1" />
                删除
              </Button>
            </div>

            <div className="h-6 w-px bg-[var(--border)]" />

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={clearSelection}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* 添加到相册弹窗 */}
      <Modal
        open={showAddToAlbum}
        onClose={() => setShowAddToAlbum(false)}
        title="创建相册"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            placeholder="相册名称"
            value={albumName}
            onChange={(e) => setAlbumName(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddToAlbum(false)}>
              取消
            </Button>
            <Button onClick={handleCreateAlbum} disabled={!albumName.trim()}>
              创建
            </Button>
          </div>
        </div>
      </Modal>

      {/* 添加到集合弹窗 */}
      <Modal
        open={showAddToCollection}
        onClose={() => setShowAddToCollection(false)}
        title="创建集合"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            placeholder="集合名称"
            value={collectionName}
            onChange={(e) => setCollectionName(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAddToCollection(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleCreateCollection}
              disabled={!collectionName.trim()}
            >
              创建
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
