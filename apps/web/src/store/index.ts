/**
 * 全局状态管理
 */
import { create } from "zustand";
import type { Asset, Folder } from "@/lib/api";

interface AppState {
  // 选中的资产
  selectedAssets: number[];
  setSelectedAssets: (ids: number[]) => void;
  toggleAssetSelection: (id: number) => void;
  clearSelection: () => void;
  selectAll: (ids: number[]) => void;

  // 搜索状态
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  aiSearchEnabled: boolean;
  setAiSearchEnabled: (enabled: boolean) => void;

  // 视图模式
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;

  // 当前文件夹
  currentFolderId: number | null;
  setCurrentFolderId: (id: number | null) => void;

  // 侧边栏
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // 上传状态
  uploadProgress: Record<string, number>;
  setUploadProgress: (fileId: string, progress: number) => void;
  clearUploadProgress: (fileId: string) => void;

  // 详情面板
  detailAssetId: number | null;
  setDetailAssetId: (id: number | null) => void;

  // 批量操作
  batchMode: boolean;
  setBatchMode: (mode: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // 选中的资产
  selectedAssets: [],
  setSelectedAssets: (ids) => set({ selectedAssets: ids }),
  toggleAssetSelection: (id) => {
    const { selectedAssets } = get();
    if (selectedAssets.includes(id)) {
      set({ selectedAssets: selectedAssets.filter((i) => i !== id) });
    } else {
      set({ selectedAssets: [...selectedAssets, id] });
    }
  },
  clearSelection: () => set({ selectedAssets: [], batchMode: false }),
  selectAll: (ids) => set({ selectedAssets: ids }),

  // 搜索状态
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),
  aiSearchEnabled: false,
  setAiSearchEnabled: (enabled) => set({ aiSearchEnabled: enabled }),

  // 视图模式
  viewMode: "grid",
  setViewMode: (mode) => set({ viewMode: mode }),

  // 当前文件夹
  currentFolderId: null,
  setCurrentFolderId: (id) => set({ currentFolderId: id }),

  // 侧边栏
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // 上传状态
  uploadProgress: {},
  setUploadProgress: (fileId, progress) =>
    set((state) => ({
      uploadProgress: { ...state.uploadProgress, [fileId]: progress },
    })),
  clearUploadProgress: (fileId) =>
    set((state) => {
      const { [fileId]: _, ...rest } = state.uploadProgress;
      return { uploadProgress: rest };
    }),

  // 详情面板
  detailAssetId: null,
  setDetailAssetId: (id) => set({ detailAssetId: id }),

  // 批量操作
  batchMode: false,
  setBatchMode: (mode) => set({ batchMode: mode }),
}));

// 选择器 hooks
export const useSelectedAssets = () => useAppStore((state) => state.selectedAssets);
export const useSearchQuery = () => useAppStore((state) => state.searchQuery);
export const useAiSearchEnabled = () => useAppStore((state) => state.aiSearchEnabled);
export const useViewMode = () => useAppStore((state) => state.viewMode);
export const useSidebarOpen = () => useAppStore((state) => state.sidebarOpen);
export const useDetailAssetId = () => useAppStore((state) => state.detailAssetId);
export const useBatchMode = () => useAppStore((state) => state.batchMode);
