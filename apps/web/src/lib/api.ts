/**
 * Zmage API 客户端
 */
import axios from "axios";

// 在客户端环境下，为空字符串以便利用 Next.js 的 rewrite 代理 (/api/...)
// 在服务端渲染时 (SSR)，必须使用容器内部通信地址 (http://img-lib-api:4257)
const getApiBaseUrl = () => {
  if (typeof window === "undefined") {
    // 服务端环境：优先使用内部 DNS，否则回退到 localhost
    return process.env.NEXT_PUBLIC_API_URL || "http://img-lib-api:4257";
  }
  // 客户端环境：使用相对路径，走 Next.js 代理
  return "";
};

const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 请求拦截器 (注入 Token)
api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("zmage_token") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("zmage_token");
        // 如果不是登录路径，跳转到登录页
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
      }
    }
    const message = error.response?.data?.detail || error.message || "请求失败";
    console.error("API Error:", message);
    return Promise.reject(error);
  }
);

// 类型定义
export interface Asset {
  id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  thumbnail_path: string | null;
  file_size: number;
  mime_type: string;
  asset_type: "image" | "video" | "document" | "other";
  width: number | null;
  height: number | null;
  duration: number | null;
  title: string | null;
  description: string | null;
  tags: string[];
  ocr_text: string | null;
  exif_data: Record<string, unknown> | null;
  taken_at: string | null;
  camera_model: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  custom_fields: Record<string, unknown>;
  status: "pending" | "processing" | "ready" | "failed";
  folder_id: number | null;
  created_at: string;
  updated_at: string;
  url: string | null;
  thumbnail_url: string | null;
}

export interface ProcessingAsset {
  id: number;
  filename: string;
  status: "pending" | "processing";
  processing_step: string | null;
  created_at: string | null;
}

export interface AssetListResponse {
  items: Asset[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface Album {
  id: number;
  name: string;
  description: string | null;
  cover_asset_id: number | null;
  cover_url: string | null;
  album_type: "manual" | "smart" | "suggested";
  status: "pending" | "accepted" | "ignored";
  suggestion_reason: string | null;
  suggestion_score: number | null;
  asset_count: number;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: number;
  name: string;
  description: string | null;
  notes: string | null;
  cover_asset_id: number | null;
  cover_url: string | null;
  asset_count: number;
  created_at: string;
  updated_at: string;
}

export interface Share {
  id: number;
  share_code: string;
  share_url: string;
  asset_id: number | null;
  collection_id: number | null;
  permission: "view" | "download";
  has_password: boolean;
  expires_at: string | null;
  view_count: number;
  download_count: number;
  is_active: boolean;
  created_at: string;
}

export interface Folder {
  id: number;
  name: string;
  parent_id: number | null;
  path: string;
  asset_count: number;
  created_at: string;
  children?: Folder[];
}

export interface DownloadPreset {
  id: number;
  name: string;
  description: string | null;
  width: number | null;
  height: number | null;
  aspect_ratio: string | null;
  format: string;
  quality: number;
  order: number;
  is_default: boolean;
  created_at: string;
}

export interface TaskStatus {
  last_scan_time: string | null;
  queue_length: number;
  pending_tasks: number;
  running_tasks: number;
  failed_tasks: number;
  recent_tasks: Array<{
    id: number;
    task_type: string;
    status: string;
    progress: number;
    created_at: string;
  }>;
}

export interface SystemStats {
  total_assets: number;
  total_albums: number;
  total_collections: number;
  total_shares: number;
  pending_suggestions: number;
  storage_used: number;
  asset_by_type: Record<string, number>;
  recent_uploads: number;
}

export interface BatchOperationResult {
  total: number;
  success: number;
  failed: number;
  failed_ids: number[];
  message: string;
}

export interface BatchUpdateRequest {
  asset_ids: number[];
  title?: string;
  description?: string;
  tags?: string[];
  add_tags?: string[];
  remove_tags?: string[];
  folder_id?: number;
  custom_fields?: Record<string, any>;
}

export interface BatchMoveRequest {
  asset_ids: number[];
  folder_id: number | null;
}

export interface AssetEdit {
  crop?: { x: number; y: number; width: number; height: number };
  brightness?: number;
  contrast?: number;
  saturation?: number;
  sharpness?: number;
  history?: Array<{ type: string; params: any }>;
  save_as_new?: boolean;
}

export interface AssetAIEdit {
  prompt?: string;
  negative_prompt?: string;
  style?: string;
  aspect_ratio?: string;
  save_as_new?: boolean;
}

// API 方法
export const assetsApi = {
  list: (params?: {
    page?: number;
    page_size?: number;
    asset_type?: string;
    folder_id?: number;
    status?: string;
  }) => api.get<AssetListResponse>("/assets", { params }),

  get: (id: number) => api.get<Asset>(`/assets/${id}`),

  update: (id: number, data: Partial<Asset>) =>
    api.put<Asset>(`/assets/${id}`, data),

  edit: (id: number, data: AssetEdit) => api.post<Asset>(`/assets/${id}/edit`, data),
  aiEdit: (id: number, data: AssetAIEdit) => api.post<Asset>(`/assets/${id}/ai-edit`, data),

  delete: (id: number, permanent: boolean = false) => api.delete(`/assets/${id}`, { params: { permanent } }),

  search: (params: {
    query?: string;
    ai_search?: boolean;
    asset_types?: string[];
    folder_id?: number;
    tags?: string[];
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
    sort_by?: string;
    sort_order?: string;
  }) => api.post<AssetListResponse>("/assets/search", params),

  getSimilar: (id: number, limit?: number) =>
    api.get<Array<{ asset: Asset; similarity: number }>>(
      `/assets/${id}/similar`,
      { params: { limit } }
    ),

  upload: (file: File, folderPath?: string, albumId?: number | null, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append("file", file);
    if (folderPath) {
      formData.append("folder_path", folderPath);
    }
    if (albumId) {
      formData.append("album_id", albumId.toString());
    }
    return api.post<{ asset_id: number; filename: string; status: string; message: string }>(
      "/assets/upload",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 300000, // 5 分钟
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        },
      }
    );
  },

  uploadBatch: (files: File[], folderPath?: string) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    if (folderPath) {
      formData.append("folder_path", folderPath);
    }
    return api.post("/assets/upload/batch", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 300000 // 5 分钟
    });
  },

  listProcessing: () => api.get<ProcessingAsset[]>("/assets/processing"),

  uploadToPortal: (code: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/portal/${code}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 300000,
    });
  },


  getMapAssets: () => api.get<Asset[]>("/assets/map"),

  // 批量操作
  batchDelete: (assetIds: number[]) =>
    api.post<BatchOperationResult>("/assets/batch/delete", { asset_ids: assetIds }),

  batchUpdate: (data: BatchUpdateRequest) =>
    api.post<BatchOperationResult>("/assets/batch/update", data),

  batchMove: (data: BatchMoveRequest) =>
    api.post<BatchOperationResult>("/assets/batch/move", data),

  batchRestore: (assetIds: number[]) =>
    api.post<BatchOperationResult>("/assets/batch/restore", { asset_ids: assetIds }),
};

export const foldersApi = {
  getTree: () => api.get<Folder[]>("/assets/folders/tree"),

  create: (data: { name: string; parent_id?: number }) =>
    api.post<Folder>("/assets/folders", data),
};

export const albumsApi = {
  list: (params?: { album_type?: string; status?: string }) =>
    api.get<Album[]>("/albums", { params }),

  get: (id: number) =>
    api.get<Album & { assets: Asset[] }>(`/albums/${id}`),

  getAssets: (id: number) =>
    api.get<Asset[]>(`/albums/${id}/assets`),

  create: (data: {
    name: string;
    description?: string;
    asset_ids?: number[];
    cover_asset_id?: number;
    album_type?: "manual" | "smart";
    smart_rules?: Record<string, unknown>;
  }) => api.post<Album>("/albums", data),

  update: (id: number, data: Partial<Album>) =>
    api.put<Album>(`/albums/${id}`, data),

  delete: (id: number) => api.delete(`/albums/${id}`),

  addAssets: (id: number, assetIds: number[]) =>
    api.post(`/albums/${id}/assets`, assetIds),

  removeAsset: (id: number, assetId: number) =>
    api.delete(`/albums/${id}/assets/${assetId}`),

  removeAssets: (id: number, assetIds: number[]) =>
    api.delete(`/albums/${id}/assets`, { data: assetIds }),

  getPreview: (id: number, limit: number = 4) =>
    api.get<{ album_id: number; preview_urls: string[]; assets: Asset[] }>(
      `/albums/${id}/preview`,
      { params: { limit } }
    ),

  getStats: (id: number) =>
    api.get<{
      asset_count: number;
      total_size: number;
      date_range: { start: string | null; end: string | null } | null;
    }>(`/albums/${id}/stats`),

  autoCover: (id: number) =>
    api.post<{ cover_asset_id: number; message: string }>(`/albums/${id}/auto-cover`),

  getSmartPreview: (id: number) =>
    api.get<{ album_id: number; matched_count: number; assets: Asset[] }>(
      `/albums/${id}/smart-preview`
    ),

  download: (id: number) =>
    api.get(`/albums/${id}/download`, { responseType: "blob" }),

  getSuggestions: () => api.get<Album[]>("/albums/suggestions"),

  accept: (id: number) => api.post<Album>(`/albums/${id}/accept`),

  ignore: (id: number) => api.post<Album>(`/albums/${id}/ignore`),
};

export const collectionsApi = {
  list: () => api.get<Collection[]>("/collections"),

  get: (id: number) =>
    api.get<Collection & { assets: Asset[] }>(`/collections/${id}`),

  getAssets: (id: number) =>
    api.get<Asset[]>(`/collections/${id}/assets`),

  create: (data: {
    name: string;
    description?: string;
    notes?: string;
    asset_ids?: number[];
  }) => api.post<Collection>("/collections", data),

  update: (id: number, data: Partial<Collection>) =>
    api.put<Collection>(`/collections/${id}`, data),

  delete: (id: number) => api.delete(`/collections/${id}`),

  addAssets: (id: number, assetIds: number[]) =>
    api.post(`/collections/${id}/assets`, assetIds),

  removeAsset: (id: number, assetId: number) =>
    api.delete(`/collections/${id}/assets/${assetId}`),

  removeAssets: (id: number, assetIds: number[]) =>
    api.delete(`/collections/${id}/assets`, { data: assetIds }),
};

export const sharesApi = {
  list: () => api.get<Share[]>("/shares"),

  create: (data: {
    asset_id?: number;
    collection_id?: number;
    permission?: "view" | "download";
    password?: string;
    expires_in_days?: number;
  }) => api.post<Share>("/shares", data),

  access: (shareCode: string, password?: string) =>
    api.get(`/shares/${shareCode}`, { params: { password } }),

  getByCode: (code: string, password?: string) =>
    api.get<{ share: Share; assets: Asset[] }>(`/s/${code}`, { params: { password } }),

  getPortal: (code: string) =>
    api.get<{ name?: string; description?: string; allowed_types?: string[]; max_file_size?: number }>(`/portal/${code}`),

  delete: (id: number) => api.delete(`/shares/${id}`),

  deactivate: (id: number) => api.put(`/shares/${id}/deactivate`),
};

export const portalsApi = {
  list: () => api.get("/shares/portals"),

  create: (data: {
    name: string;
    slug: string;
    collection_id: number;
    welcome_message?: string;
    primary_color?: string;
    visible_fields?: string[];
    searchable?: boolean;
    filterable?: boolean;
    allow_download?: boolean;
    password?: string;
  }) => api.post("/shares/portals", data),

  getPublic: (slug: string, password?: string) =>
    api.get(`/shares/portals/${slug}/public`, { params: { password } }),

  getAssets: (
    slug: string,
    params?: { password?: string; page?: number; page_size?: number; query?: string }
  ) => api.get(`/shares/portals/${slug}/assets`, { params }),

  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/shares/portals/${id}`, data),

  delete: (id: number) => api.delete(`/shares/portals/${id}`),
};

export const tasksApi = {
  getStatus: () => api.get<TaskStatus>("/tasks/status"),

  trigger: (scanType: string) =>
    api.post("/tasks/trigger", { scan_type: scanType }),

  getStats: () => api.get<SystemStats>("/tasks/stats"),

  retry: (id: number) => api.post(`/tasks/${id}/retry`),
};

export const downloadsApi = {
  getPresets: () => api.get<DownloadPreset[]>("/downloads/presets"),

  createPreset: (data: Partial<DownloadPreset>) =>
    api.post<DownloadPreset>("/downloads/presets", data),

  deletePreset: (id: number) => api.delete(`/downloads/presets/${id}`),

  downloadAsset: (assetId: number, params?: { preset_id?: number }) => {
    const url = new URL(`${API_BASE_URL}/api/downloads/asset/${assetId}`);
    if (params?.preset_id) {
      url.searchParams.set("preset_id", params.preset_id.toString());
    }
    window.open(url.toString(), "_blank");
  },

  downloadBatch: (assetIds: number[], presetId?: number) =>
    api.post(
      "/downloads/batch",
      assetIds,
      {
        params: { preset_id: presetId },
        responseType: "blob",
      }
    ),
};

export const customFieldsApi = {
  list: () => api.get("/assets/fields/list"),

  create: (data: {
    name: string;
    label: string;
    field_type: string;
    options?: string[];
    required?: boolean;
  }) => api.post("/assets/fields", data),
};

export const authApi = {
  login: (data: URLSearchParams) => api.post<{ access_token: string; token_type: string }>("/auth/login", data, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  }),
  register: (data: Record<string, unknown>) => api.post("/auth/register", data),
  me: () => api.get("/auth/me"),
};

export const mcpApi = {
  search: (query: string) => api.get<AssetListResponse>("/mcp/search", { params: { query } }),
};

export const aiApi = {
  generate: (data: {
    prompt: string;
    model?: string;
    negative_prompt?: string;
    aspect_ratio?: string;
    image_size?: string;
    number_of_images?: number;
  }) => api.post<{ images: string[] }>("/ai/generate", data, { timeout: 120000 }), // 2分钟超时

  edit: (data: {
    prompt: string;
    reference_asset_id: number;
    model?: string;
    negative_prompt?: string;
    aspect_ratio?: string;
    image_size?: string;
  }) => api.post<{ images: string[] }>("/ai/edit", data, { timeout: 120000 }),

  chat: (data: { messages: { role: string; content: string }[] }) =>
    api.post<{
      content: string;
      role: string;
      tool_results?: Array<{
        tool: string;
        args: any;
        result: any;
        is_error?: boolean;
      }>;
    }>("/ai/chat", data),
};

export const trashApi = {
  list: (params?: { page?: number; page_size?: number }) => api.get<AssetListResponse>("/trash", { params }),
  empty: () => api.delete("/trash/empty"),
  restore: (id: number) => api.post(`/assets/${id}/restore`),
};

export const vaultApi = {
  setup: (pin: string) => api.post("/vault/setup", { pin }),
  verify: (pin: string) => api.post<{ vault_token: string; expires_in: number }>("/vault/verify", { pin }),
  list: (token: string, params?: { page?: number; page_size?: number }) => api.get<AssetListResponse>("/vault/assets", {
    headers: { "X-Vault-Token": token },
    params
  }),
  moveOut: (id: number, token: string) => api.post(`/vault/assets/${id}/move-out`, {}, {
    headers: { "X-Vault-Token": token }
  }),
  moveIn: (id: number) => api.post(`/vault/assets/${id}/move-in`),
  status: () => api.get<{ has_pin: boolean }>("/vault/check-status"),
};

// 获取存储文件 URL
export function getStorageUrl(path: string | null): string {
  if (!path) return "";
  return `${API_BASE_URL}/api/storage/${path}`;
}
