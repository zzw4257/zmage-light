"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, RotateCcw, Save, Palette, Sliders, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Asset } from "@/lib/api";
import { getStorageUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface FilterPanelProps {
    asset: Asset;
    open: boolean;
    onClose: () => void;
}

interface FilterPreset {
    id: string;
    name: string;
    filter: string;
}

const PRESETS: FilterPreset[] = [
    { id: "original", name: "原图", filter: "none" },
    { id: "grayscale", name: "黑白", filter: "grayscale(100%)" },
    { id: "sepia", name: "复古", filter: "sepia(100%)" },
    { id: "vibrant", name: "鲜艳", filter: "saturate(200%)" },
    { id: "cold", name: "冷色", filter: "hue-rotate(180deg) saturate(150%)" },
    { id: "warm", name: "暖色", filter: "sepia(30%) saturate(150%) hue-rotate(-30deg)" },
    { id: "noir", name: "经典", filter: "grayscale(100%) contrast(150%) brightness(80%)" },
    { id: "dramatic", name: "戏剧", filter: "contrast(150%) saturate(50%)" },
    { id: "fade", name: "淡雅", filter: "brightness(110%) saturate(70%) contrast(90%)" },
];

export function FilterPanel({ asset, open, onClose }: FilterPanelProps) {
    const [selectedPreset, setSelectedPreset] = useState("original");
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [saturation, setSaturation] = useState(100);
    const [blur, setBlur] = useState(0);
    const [hueRotate, setHueRotate] = useState(0);

    const filterStyle = useMemo(() => {
        const preset = PRESETS.find(p => p.id === selectedPreset);
        let style = preset?.filter === "none" ? "" : preset?.filter || "";

        // Add manual adjustments
        if (brightness !== 100) style += ` brightness(${brightness}%)`;
        if (contrast !== 100) style += ` contrast(${contrast}%)`;
        if (saturation !== 100) style += ` saturate(${saturation}%)`;
        if (blur !== 0) style += ` blur(${blur}px)`;
        if (hueRotate !== 0) style += ` hue-rotate(${hueRotate}deg)`;

        return style || "none";
    }, [selectedPreset, brightness, contrast, saturation, blur, hueRotate]);

    const handleReset = () => {
        setSelectedPreset("original");
        setBrightness(100);
        setContrast(100);
        setSaturation(100);
        setBlur(0);
        setHueRotate(0);
        toast.success("已重置参数");
    };

    const handleSave = () => {
        // In a real app, this would send parameters to backend to process the image
        toast.loading("正在处理并应用滤镜...", { duration: 2000 });
        setTimeout(() => {
            toast.success("滤镜应用成功 (模拟)");
            onClose();
        }, 2000);
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", damping: 30, stiffness: 300 }}
                    className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-[var(--background)] shadow-2xl z-[60] flex flex-col border-l border-[var(--border)]"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md sticky top-0 z-10">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <Palette className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">滤镜实验室</h3>
                                <p className="text-xs text-[var(--muted-foreground)]">实时预览 CSS 滤镜效果</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* Preview Image */}
                        <div className="relative aspect-square rounded-2xl overflow-hidden bg-[var(--muted)] border border-[var(--border)] shadow-inner">
                            <img
                                src={getStorageUrl(asset.file_path)}
                                alt="Preview"
                                className="w-full h-full object-contain transition-all duration-300"
                                style={{ filter: filterStyle }}
                            />
                            <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/50 backdrop-blur-md rounded text-[10px] text-white/80 font-mono">
                                预览模式
                            </div>
                        </div>

                        {/* Presets */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4" />
                                    预设滤镜
                                </h4>
                                <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">Presets</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {PRESETS.map((preset) => (
                                    <button
                                        key={preset.id}
                                        onClick={() => setSelectedPreset(preset.id)}
                                        className={cn(
                                            "group relative flex flex-col items-center gap-2 p-2 rounded-xl transition-all border",
                                            selectedPreset === preset.id
                                                ? "bg-blue-500/10 border-blue-500 shadow-sm"
                                                : "bg-[var(--muted)]/30 border-transparent hover:bg-[var(--muted)]/50 hover:border-[var(--border)]"
                                        )}
                                    >
                                        <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-black/10">
                                            <img
                                                src={getStorageUrl(asset.file_path)}
                                                alt={preset.name}
                                                className="w-full h-full object-cover"
                                                style={{ filter: preset.filter }}
                                            />
                                            {selectedPreset === preset.id && (
                                                <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                                    <Check className="w-6 h-6 text-white drop-shadow-md" />
                                                </div>
                                            )}
                                        </div>
                                        <span className={cn(
                                            "text-xs font-medium transition-colors",
                                            selectedPreset === preset.id ? "text-blue-500" : "text-[var(--muted-foreground)]"
                                        )}>
                                            {preset.name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Manual Adjustments */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between pt-2">
                                <h4 className="text-sm font-medium flex items-center gap-2">
                                    <Sliders className="w-4 h-4" />
                                    参数微调
                                </h4>
                                <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 text-[10px] gap-1 px-2">
                                    <RotateCcw className="w-3 h-3" />
                                    重置
                                </Button>
                            </div>

                            <div className="space-y-5 px-1">
                                <ControlGroup label="亮度" value={brightness} min={0} max={200} onChange={setBrightness} unit="%" />
                                <ControlGroup label="对比度" value={contrast} min={0} max={200} onChange={setContrast} unit="%" />
                                <ControlGroup label="饱和度" value={saturation} min={0} max={200} onChange={setSaturation} unit="%" />
                                <ControlGroup label="色相" value={hueRotate} min={0} max={360} onChange={setHueRotate} unit="°" />
                                <ControlGroup label="模糊" value={blur} min={0} max={20} onChange={setBlur} unit="px" />
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md grid grid-cols-2 gap-4">
                        <Button variant="outline" onClick={onClose} className="rounded-xl">
                            取消
                        </Button>
                        <Button onClick={handleSave} className="rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20">
                            <Save className="w-4 h-4 mr-2" />
                            保存为副本
                        </Button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function ControlGroup({ label, value, min, max, unit, onChange }: {
    label: string,
    value: number,
    min: number,
    max: number,
    unit: string,
    onChange: (v: number) => void
}) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-xs">
                <span className="text-[var(--muted-foreground)]">{label}</span>
                <span className="font-mono">{value}{unit}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                className="w-full h-1.5 bg-[var(--muted)] rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
        </div>
    );
}
