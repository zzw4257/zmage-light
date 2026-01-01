"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { collectionsApi } from "@/lib/api";
import toast from "react-hot-toast";

interface CollectionModalProps {
  open: boolean;
  onClose: () => void;
  selectedAssetIds?: number[];
}

export function CollectionModal({
  open,
  onClose,
  selectedAssetIds = [],
}: CollectionModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  // 创建集合
  const createMutation = useMutation({
    mutationFn: () =>
      collectionsApi.create({
        name,
        description: description || undefined,
        notes: notes || undefined,
        asset_ids: selectedAssetIds.length > 0 ? selectedAssetIds : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast.success("集合创建成功");
      handleClose();
    },
    onError: () => {
      toast.error("创建失败");
    },
  });

  const handleClose = () => {
    setName("");
    setDescription("");
    setNotes("");
    onClose();
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    createMutation.mutate();
  };

  return (
    <Modal open={open} onClose={handleClose} title="创建集合" size="md">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">集合名称</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入集合名称"
            className="mt-1"
            autoFocus
          />
        </div>
        <div>
          <label className="text-sm font-medium">描述（可选）</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="添加集合描述"
            className="mt-1 w-full h-20 px-3 py-2 text-sm rounded-xl border border-[var(--input)] bg-[var(--background)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>
        <div>
          <label className="text-sm font-medium">协作备注（可选）</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="添加协作备注，用于团队沟通"
            className="mt-1 w-full h-20 px-3 py-2 text-sm rounded-xl border border-[var(--input)] bg-[var(--background)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>
        {selectedAssetIds.length > 0 && (
          <p className="text-sm text-[var(--muted-foreground)]">
            将添加 {selectedAssetIds.length} 个资产到此集合
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim()}
            loading={createMutation.isPending}
          >
            创建
          </Button>
        </div>
      </div>
    </Modal>
  );
}
