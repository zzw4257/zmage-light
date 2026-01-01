"use client";

import { useState, useRef, useEffect } from "react";
import ReactCrop, { type Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { X, Check, RotateCcw, Scissors, Sun, Contrast, Droplets, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Asset, getStorageUrl, assetsApi } from "@/lib/api";
import toast from "react-hot-toast";

interface AssetEditorProps {
    asset: Asset;
    onClose: () => void;
    onSuccess: (updatedAsset: Asset) => void;
}

export function AssetEditor({ asset, onClose, onSuccess }: AssetEditorProps) {
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [saturation, setSaturation] = useState(100);
    const [sharpness, setSharpness] = useState(100);
    const [isProcessing, setIsProcessing] = useState(false);

    const imgRef = useRef<HTMLImageElement>(null);
    const imageUrl = asset.url || getStorageUrl(asset.file_path);

    const handleSave = async () => {
        setIsProcessing(true);
        try {
            const response = await assetsApi.edit(asset.id, {
                crop: completedCrop ? {
                    x: Math.round(completedCrop.x),
                    y: Math.round(completedCrop.y),
                    width: Math.round(completedCrop.width),
                    height: Math.round(completedCrop.height),
                } : undefined,
                brightness: brightness / 100,
                contrast: contrast / 100,
                saturation: saturation / 100,
                sharpness: sharpness / 100,
            });
            toast.success("编辑成功，正在重新分析...");
            onSuccess(response.data);
            onClose();
        } catch (error) {
            toast.error("编辑失败");
        } finally {
            setIsProcessing(false);
        }
    };

    const reset = () => {
        setCrop(undefined);
        setCompletedCrop(null);
        setBrightness(100);
        setContrast(100);
        setSaturation(100);
        setSharpness(100);
    };

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black/95 text-white">
            {/* 头部 */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                    <h2 className="font-semibold">图片编辑</h2>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={reset}>
                        <RotateCcw className="h-4 w-4 mr-1" />
                        重置
                    </Button>
                    <Button size="sm" onClick={handleSave} loading={isProcessing}>
                        <Check className="h-4 w-4 mr-1" />
                        应用并保存
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* 编辑预览区 */}
                <div className="flex-1 flex items-center justify-center p-8 overflow-auto bg-black/50">
                    <ReactCrop
                        crop={crop}
                        onChange={(c) => setCrop(c)}
                        onComplete={(c) => setCompletedCrop(c)}
                        className="max-h-full"
                    >
                        <img
                            ref={imgRef}
                            src={imageUrl}
                            alt="Preview"
                            style={{
                                filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
                                maxHeight: "80vh",
                            }}
                        />
                    </ReactCrop>
                </div>

                {/* 控制面板 */}
                <div className="w-80 border-l border-white/10 p-6 space-y-8 bg-[var(--card)] text-[var(--foreground)] overflow-y-auto">
                    <div>
                        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                            <Scissors className="h-4 w-4" />
                            裁剪工具
                        </h3>
                        <p className="text-xs text-[var(--muted-foreground)] mb-4">
                            拖动图片上的控制框进行裁剪。如果不选择，将保持原比例。
                        </p>
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-sm font-medium flex items-center gap-2 text-[var(--foreground)]">
                            <Zap className="h-4 w-4" />
                            色调调节
                        </h3>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-xs flex items-center gap-2">
                                    <Sun className="h-3 w-3" /> 亮度
                                </label>
                                <span className="text-xs font-mono">{brightness}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="200"
                                value={brightness}
                                onChange={(e) => setBrightness(parseInt(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-xs flex items-center gap-2">
                                    <Contrast className="h-3 w-3" /> 对比度
                                </label>
                                <span className="text-xs font-mono">{contrast}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="200"
                                value={contrast}
                                onChange={(e) => setContrast(parseInt(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-xs flex items-center gap-2">
                                    <Droplets className="h-3 w-3" /> 饱和度
                                </label>
                                <span className="text-xs font-mono">{saturation}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="200"
                                value={saturation}
                                onChange={(e) => setSaturation(parseInt(e.target.value))}
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
