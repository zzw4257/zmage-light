"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { assetsApi } from "@/lib/api";
import { Loader2, Map as MapIcon, Compass, Layers, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStorageUrl } from "@/lib/api";
import Script from "next/script";

// 由于 npm install 受限，我们使用 CDN 版本的 Leaflet
export default function MapView() {
    const mapRef = useRef<HTMLDivElement>(null);
    const leafletMap = useRef<any>(null);
    const markersLayer = useRef<any>(null);
    const [leafletLoaded, setLeafletLoaded] = useState(false);

    const { data: mapAssets, isLoading } = useQuery({
        queryKey: ["map-assets"],
        queryFn: () => assetsApi.getMapAssets().then((r) => r.data),
    });

    const initMap = () => {
        if (!mapRef.current || !window.L || leafletMap.current) return;

        const L = window.L;

        // 初始化地图
        leafletMap.current = L.map(mapRef.current, {
            center: [30, 110],
            zoom: 5,
            zoomControl: false,
        });

        // 添加底图
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(leafletMap.current);

        // 添加缩放控制
        L.control.zoom({ position: "bottomright" }).addTo(leafletMap.current);

        // 初始化标记层 (暂不使用聚类插件，因为 CDN 导入较复杂，先实现基础版)
        markersLayer.current = L.layerGroup().addTo(leafletMap.current);

        setLeafletLoaded(true);
    };

    useEffect(() => {
        if (leafletLoaded && mapAssets) {
            updateMarkers();
        }
    }, [leafletLoaded, mapAssets]);

    const updateMarkers = () => {
        if (!leafletMap.current || !markersLayer.current || !mapAssets || !window.L) return;

        const L = window.L;
        markersLayer.current.clearLayers();

        mapAssets.forEach((asset) => {
            if (asset.latitude && asset.longitude) {
                const imageUrl = asset.thumbnail_url || asset.url || getStorageUrl(asset.file_path);

                const icon = L.divIcon({
                    html: `
            <div class="relative group">
              <div class="w-10 h-10 rounded-full border-2 border-white shadow-lg overflow-hidden transition-transform hover:scale-110 hover:z-10 bg-white">
                <img src="${imageUrl}" class="w-full h-full object-cover" />
              </div>
              <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-b border-r border-black/10"></div>
            </div>
          `,
                    className: "custom-div-icon",
                    iconSize: [40, 40],
                    iconAnchor: [20, 40],
                });

                const marker = L.marker([asset.latitude, asset.longitude], { icon });

                const popupContent = `
          <div class="p-1 min-w-[200px] font-sans">
            <div class="aspect-video rounded-lg overflow-hidden mb-2 shadow-sm bg-gray-100">
              <img src="${getStorageUrl(asset.file_path)}" class="w-full h-full object-cover" />
            </div>
            <h4 class="font-bold text-sm mb-1 truncate">${asset.title || asset.original_filename}</h4>
            <div class="text-[10px] text-gray-500 mb-2">${asset.location || "未知位置"}</div>
            <a href="/assets/${asset.id}" class="text-blue-500 text-xs font-medium hover:underline">查看详情</a>
          </div>
        `;

                marker.bindPopup(popupContent, {
                    className: "custom-leaflet-popup",
                    maxWidth: 300
                });

                marker.addTo(markersLayer.current);
            }
        });

        // 如果有资产，自动调整视野
        if (mapAssets.length > 0) {
            const coords = mapAssets
                .filter(a => a.latitude && a.longitude)
                .map(a => [a.latitude, a.longitude] as [number, number]);
            if (coords.length > 0) {
                leafletMap.current.fitBounds(L.latLngBounds(coords), { padding: [50, 50] });
            }
        }
    };

    return (
        <div className="relative w-full h-[calc(100vh-140px)] rounded-3xl overflow-hidden border border-[var(--border)] shadow-2xl animate-in zoom-in-95 duration-700">
            <link
                rel="stylesheet"
                href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
            />
            <Script
                src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
                onLoad={initMap}
            />

            {(isLoading || !leafletLoaded) && (
                <div className="absolute inset-0 z-[2000] bg-[var(--background)]/80 backdrop-blur-md flex flex-col items-center justify-center gap-4">
                    <div className="relative">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                        <Compass className="absolute inset-0 m-auto w-5 h-5 text-blue-400 opacity-50" />
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-medium text-[var(--foreground)]">正在载入足迹地图...</p>
                        <p className="text-sm text-[var(--muted-foreground)]">解析地理空间数据中</p>
                    </div>
                </div>
            )}

            <div ref={mapRef} className="w-full h-full z-0" />

            {/* 顶部控制栏 */}
            <div className="absolute top-6 left-6 z-[1000] flex gap-2">
                <div className="bg-white/80 dark:bg-black/80 backdrop-blur-xl p-1.5 rounded-2xl border border-[var(--border)] flex gap-1 shadow-lg">
                    <Button variant="ghost" size="sm" className="rounded-xl h-9 px-3 gap-2">
                        <Layers className="w-4 h-4" />
                        图层
                    </Button>
                    <Button variant="ghost" size="sm" className="rounded-xl h-9 px-3 gap-2">
                        <Maximize2 className="w-4 h-4" />
                        全屏
                    </Button>
                </div>
            </div>

            {/* 右侧统计面板 */}
            <div className="absolute top-6 right-6 z-[1000] w-64 animate-in slide-in-from-right duration-500">
                <div className="bg-white/80 dark:bg-black/80 backdrop-blur-xl p-5 rounded-3xl border border-[var(--border)] shadow-xl space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-2xl bg-blue-500/20 text-blue-600">
                            <MapIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">足迹统计</h3>
                            <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">Footprint Stats</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-2xl bg-[var(--muted)]/50 border border-[var(--border)]">
                            <span className="text-xs text-[var(--muted-foreground)] block mb-1">足迹点</span>
                            <span className="text-xl font-bold">{mapAssets?.length || 0}</span>
                        </div>
                        <div className="p-3 rounded-2xl bg-[var(--muted)]/50 border border-[var(--border)]">
                            <span className="text-xs text-[var(--muted-foreground)] block mb-1">活跃区域</span>
                            <span className="text-xl font-bold">亚洲</span>
                        </div>
                    </div>

                    <p className="text-xs text-[var(--muted-foreground)] leading-relaxed p-2 bg-blue-500/5 rounded-xl border border-blue-500/10">
                        地图上展示了所有包含地理信息的照片和视频。点击标记可以查看预览。
                    </p>
                </div>
            </div>

            <style jsx global>{`
        .leaflet-container {
          background: #f8fafc !important;
          font-family: inherit;
        }
        .custom-leaflet-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          padding: 0;
          overflow: hidden;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }
        .custom-leaflet-popup .leaflet-popup-content {
          margin: 0;
          padding: 8px;
        }
        .custom-div-icon {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
        </div>
    );
}

declare global {
    interface Window {
        L: any;
    }
}
