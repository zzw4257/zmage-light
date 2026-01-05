"use client";

import { useState, useRef, useEffect } from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
    X,
    RotateCw,
    Crop as CropIcon,
    Sliders,
    Wand2,
    Check,
    Save,
    RotateCcw,
    Eye,
    ArrowBigRightDash,
    Sparkles,
    Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { type Asset, getStorageUrl, assetsApi, type AssetAIEdit } from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface AssetEditorProps {
    asset: Asset;
    onClose: () => void;
    onSuccess: (updatedAsset: Asset) => void;
}

const FILTERS = [
    { name: "原图", filter: "none" },
    { name: "极简黑白", filter: "grayscale(100%) contrast(120%)" },
    { name: "胶片复古", filter: "sepia(50%) contrast(110%) saturate(80%)" },
    { name: "鲜明冷调", filter: "hue-rotate(180deg) saturate(150%) brightness(110%)" },
    { name: "高雅暖调", filter: "sepia(30%) saturate(140%) contrast(110%)" },
    { name: "赛博朋克", filter: "hue-rotate(280deg) contrast(130%) saturate(200%)" },
    { name: "柔和", filter: "brightness(110%) contrast(90%) saturate(110%) blur(0.5px)" },
];

const AI_STYLES = [
    { id: "none", name: "原图增强", icon: Sparkles, desc: "保持原意，画质增强" },
    { id: "anime", name: "二次元", icon: Sparkles, desc: "精美动漫番剧风格" },
    { id: "cinema", name: "电影感", icon: Sparkles, desc: "写实电影大片质感" },
    { id: "oil", name: "油画", icon: Sparkles, desc: "古典厚重油画艺术" },
    { id: "sketch", name: "素描", icon: Sparkles, desc: "细致铅笔素描线条" },
    { id: "pixel", name: "像素风", icon: Sparkles, desc: "怀旧复古 8-bit 像素" },
];

export function AssetEditor({ asset, onClose, onSuccess }: AssetEditorProps) {
    const [activeTab, setActiveTab] = useState<"adjust" | "crop" | "filter" | "ai">("adjust");
    const [isProcessing, setIsProcessing] = useState(false);
    const [showOriginal, setShowOriginal] = useState(false);

    // Edit States
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);

    const [adjustments, setAdjustments] = useState({
        brightness: 100,
        contrast: 100,
        saturation: 100,
        sharpness: 0,
        blur: 0,
    });

    const [rotation, setRotation] = useState(0); // 90 steps
    const [fineRotation, setFineRotation] = useState(0); // Fine -45 to 45
    const [activeFilter, setActiveFilter] = useState("none");

    // AI States
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiStyle, setAiStyle] = useState("none");
    const [aiAspectRatio, setAiAspectRatio] = useState("SQUARE");

    const imgRef = useRef<HTMLImageElement>(null);
    const imageUrl = asset.url || getStorageUrl(asset.file_path);

    // Helper: Reset all edits
    const handleReset = () => {
        setCrop(undefined);
        setCompletedCrop(null);
        setRotation(0);
        setFineRotation(0);
        setAdjustments({
            brightness: 100,
            contrast: 100,
            saturation: 100,
            sharpness: 0,
            blur: 0,
        });
        setActiveFilter("none");
        setAiPrompt("");
        setAiStyle("none");
    };

    // Helper: AI Save
    const handleAIEdit = async () => {
        try {
            setIsProcessing(true);
            const data: AssetAIEdit = {
                prompt: aiPrompt,
                style: aiStyle,
                aspect_ratio: aiAspectRatio,
                save_as_new: true, // AI 生成倾向于保存副本
            };

            const response = await assetsApi.aiEdit(asset.id, data);
            toast.success("AI 生成成功（已保存为副本）");
            onSuccess(response.data);
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "AI 处理失败");
        } finally {
            setIsProcessing(false);
        }
    };

    // Helper: Save
    const handleSave = async (saveAsNew: boolean = false) => {
        try {
            setIsProcessing(true);
            const ops: any[] = [];
            const totalRotation = rotation + fineRotation;

            // 1. Rotate
            if (totalRotation !== 0) {
                ops.push({ type: "rotate", params: { degree: totalRotation } });
            }

            // 2. Crop
            if (completedCrop && imgRef.current) {
                const img = imgRef.current;
                const scaleX = img.naturalWidth / img.width;
                const scaleY = img.naturalHeight / img.height;

                // 如果有旋转，这里可能需要更复杂的计算。
                // 为保证鲁棒性，如果有 Fine Rotation，建议先旋转后裁剪，或者 UI 上限制
                // 目前简化为：坐标映射 + 后端自动 Resize/Bound Check

                const cropOp = {
                    type: "crop",
                    params: {
                        x: Math.round(completedCrop.x * scaleX),
                        y: Math.round(completedCrop.y * scaleY),
                        width: Math.round(completedCrop.width * scaleX),
                        height: Math.round(completedCrop.height * scaleY),
                    }
                };
                ops.push(cropOp);
            }

            // 3. Adjustments
            const adjustParams: any = {};
            if (adjustments.brightness !== 100) adjustParams.brightness = adjustments.brightness / 100;
            if (adjustments.contrast !== 100) adjustParams.contrast = adjustments.contrast / 100;
            if (adjustments.saturation !== 100) adjustParams.saturation = adjustments.saturation / 100;
            if (adjustments.sharpness !== 0) adjustParams.sharpness = 1 + (adjustments.sharpness / 100);

            if (Object.keys(adjustParams).length > 0) {
                ops.push({ type: "adjust", params: adjustParams });
            }

            // 4. Filters (Simplified)
            // 如果 activeFilter 不是 none，我们目前无法在后端精确复现复杂 CSS filter
            // TODO: 将 filter string 解析为 adjustments 或者后端支持 lookup table
            if (activeFilter !== 'none') {
                // 这是一个 limitation warning
                console.warn("Complex CSS filters are preview-only for now unless backend supports them.");
                // Workaround: Map some basic filters to adjustments if possible
                if (activeFilter.includes("grayscale")) adjustParams.saturation = 0;
                if (activeFilter.includes("sepia")) {
                    // Sepia generally implies some color matrix, backend needs generic ColorMatrix support in Pillow
                    // For robustness, we skip complex filters in backend or user accepts it's 'preview only' unless we add backend code
                }
            }

            const response = await assetsApi.edit(asset.id, {
                history: ops,
                save_as_new: saveAsNew,
            });

            toast.success(saveAsNew ? "已另存为新图片" : "编辑已保存");
            onSuccess(response.data);
            onClose();
        } catch (error) {
            toast.error("保存失败");
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    const totalRotation = rotation + fineRotation;

    // Preview Style
    const previewStyle = showOriginal ? {
        maxHeight: "80vh",
        maxWidth: "100%",
    } : {
        filter: `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%) blur(${adjustments.blur}px) ${activeFilter !== 'none' ? activeFilter : ''}`,
        transform: `rotate(${totalRotation}deg)`,
        transition: "transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), filter 0.2s ease",
        maxHeight: "80vh",
        maxWidth: "100%",
    };

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-[#09090b] text-white">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#09090b]">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-white/10 text-white/70 hover:text-white">
                        <X className="h-5 w-5" />
                    </Button>
                    <div>
                        <h2 className="text-sm font-medium">{asset.original_filename}</h2>
                        <div className="flex items-center gap-2 text-xs text-white/50">
                            <span className="bg-white/10 px-1.5 rounded">{asset.mime_type?.split('/')[1]?.toUpperCase() || 'JPG'}</span>
                            <span>{asset.width} x {asset.height}</span>
                        </div>
                    </div>
                </div>

                {/* Top Toolbar */}
                <div className="flex items-center gap-4">
                    {/* Compare Button */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn("text-white/70 hover:text-white select-none transition-all active:scale-95", showOriginal && "text-blue-400 bg-blue-400/10")}
                        onPointerDown={() => setShowOriginal(true)}
                        onPointerUp={() => setShowOriginal(false)}
                        onPointerLeave={() => setShowOriginal(false)}
                    >
                        <Eye className="h-4 w-4 mr-2" />
                        对比原图
                    </Button>

                    <div className="h-4 w-[1px] bg-white/20" />

                    <Button variant="ghost" size="sm" onClick={handleReset} className="text-white/70 hover:text-white">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        重置
                    </Button>

                    <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSave(true)}
                            loading={isProcessing}
                            className="hover:bg-white/10 text-white/90 h-8"
                        >
                            另存为
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => handleSave(false)}
                            loading={isProcessing}
                            className="bg-white text-black hover:bg-white/90 h-8 shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                        >
                            <Save className="h-3.5 w-3.5 mr-2" />
                            保存
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Canvas */}
                <div className="flex-1 bg-[#020202] flex items-center justify-center p-8 overflow-hidden relative group">
                    {/* Grid Pattern Background */}
                    <div className="absolute inset-0 opacity-[0.03]"
                        style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                    </div>

                    {/* ReactCrop handles cropping UI */}
                    <ReactCrop
                        crop={crop}
                        onChange={(c) => setCrop(c)}
                        onComplete={(c) => setCompletedCrop(c)}
                        className={cn("max-h-full max-w-full transition-opacity duration-200", isProcessing && "opacity-50")}
                    >
                        <img
                            ref={imgRef}
                            src={imageUrl}
                            alt="Editor Preview"
                            style={previewStyle}
                            className="max-h-[80vh] w-auto object-contain shadow-2xl"
                        />
                    </ReactCrop>

                    {showOriginal && (
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-3 py-1 rounded-full pointer-events-none backdrop-blur-md border border-white/10">
                            原图预览
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="w-80 bg-[#09090b] border-l border-white/10 flex flex-col shadow-xl z-10">
                    {/* Tabs */}
                    <div className="flex border-b border-white/10">
                        {[
                            { id: "adjust", icon: Sliders, label: "调节" },
                            { id: "crop", icon: CropIcon, label: "裁剪" },
                            { id: "filter", icon: Palette, label: "滤镜" },
                            { id: "ai", icon: Sparkles, label: "AI 魔法" },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={cn(
                                    "flex-1 py-4 flex flex-col items-center gap-1.5 text-[10px] transition-all relative outline-none",
                                    activeTab === tab.id
                                        ? "text-white bg-white/5 font-medium"
                                        : "text-white/40 hover:bg-white/5 hover:text-white/70"
                                )}
                            >
                                <tab.icon className={cn("h-4 w-4 transition-transform", activeTab === tab.id && "scale-110")} />
                                {tab.label}
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-500 shadow-[0_-2px_8px_rgba(59,130,246,0.5)]" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Tools Content */}
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        {activeTab === "adjust" && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                {[
                                    { label: "亮度", key: "brightness", min: 0, max: 200 },
                                    { label: "对比度", key: "contrast", min: 0, max: 200 },
                                    { label: "饱和度", key: "saturation", min: 0, max: 200 },
                                    { label: "锐化", key: "sharpness", min: 0, max: 100 },
                                ].map((item) => (
                                    <div key={item.key} className="space-y-4 group">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-white/70 group-hover:text-white transition-colors">{item.label}</span>
                                            <span className="font-mono text-white/40 bg-white/5 px-2 py-0.5 rounded text-[10px]">
                                                {adjustments[item.key as keyof typeof adjustments]}%
                                            </span>
                                        </div>
                                        <Slider
                                            value={[adjustments[item.key as keyof typeof adjustments]]}
                                            min={item.min} max={item.max} step={1}
                                            onValueChange={([v]) => setAdjustments(p => ({ ...p, [item.key]: v }))}
                                            className="py-1"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === "crop" && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                <div className="space-y-4">
                                    <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider flex items-center gap-2">
                                        <RotateCw className="h-3 w-3" /> 标准旋转
                                    </h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="bg-transparent border-white/10 text-white/80 hover:bg-white/10 hover:border-white/30"
                                            onClick={() => setRotation(r => (r - 90) % 360)}
                                        >
                                            <RotateCw className="h-4 w-4 mr-2 -scale-x-100" />
                                            -90°
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="bg-transparent border-white/10 text-white/80 hover:bg-white/10 hover:border-white/30"
                                            onClick={() => setRotation(r => (r + 90) % 360)}
                                        >
                                            <RotateCw className="h-4 w-4 mr-2" />
                                            +90°
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-4 border-t border-white/10 pt-6">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">微调旋转</h3>
                                        <span className="text-xs font-mono text-white/40">{fineRotation}°</span>
                                    </div>
                                    <Slider
                                        value={[fineRotation]}
                                        min={-45} max={45} step={1}
                                        onValueChange={([v]) => setFineRotation(v)}
                                    />
                                    <div className="flex justify-between text-[10px] text-white/20 font-mono">
                                        <span>-45°</span>
                                        <span className="text-white/40">0°</span>
                                        <span>45°</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "filter" && (
                            <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-right-4 duration-300">
                                {FILTERS.map(f => (
                                    <button
                                        key={f.name}
                                        onClick={() => setActiveFilter(f.filter)}
                                        className={cn(
                                            "aspect-square rounded-xl overflow-hidden relative border-2 transition-all group duration-300",
                                            activeFilter === f.filter ? "border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-[1.02]" : "border-transparent hover:border-white/30"
                                        )}
                                    >
                                        <img
                                            src={asset.thumbnail_url || asset.url || ""}
                                            className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700"
                                            style={{ filter: f.filter }}
                                            alt={f.name}
                                        />
                                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-6 text-[10px] font-medium text-left">
                                            {f.name}
                                        </div>
                                        {activeFilter === f.filter && (
                                            <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-0.5">
                                                <Check className="h-2 w-2 text-white" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {activeTab === "ai" && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                <div className="space-y-3">
                                    <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">AI 风格</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {AI_STYLES.map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => setAiStyle(s.id)}
                                                className={cn(
                                                    "p-3 rounded-lg border text-left transition-all",
                                                    aiStyle === s.id
                                                        ? "border-blue-500 bg-blue-500/10 text-white"
                                                        : "border-white/10 hover:border-white/30 text-white/60"
                                                )}
                                            >
                                                <div className="text-[10px] font-medium mb-1">{s.name}</div>
                                                <div className="text-[8px] opacity-40 line-clamp-1">{s.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3 border-t border-white/10 pt-6">
                                    <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">画面比例</h3>
                                    <div className="flex gap-2">
                                        {["SQUARE", "PORTRAIT", "LANDSCAPE"].map(r => (
                                            <button
                                                key={r}
                                                onClick={() => setAiAspectRatio(r)}
                                                className={cn(
                                                    "flex-1 py-1.5 rounded-md border text-[10px] transition-all",
                                                    aiAspectRatio === r
                                                        ? "border-blue-500 bg-blue-500/10 text-white"
                                                        : "border-white/10 hover:border-white/30 text-white/60"
                                                )}
                                            >
                                                {r === "SQUARE" && "1:1"}
                                                {r === "PORTRAIT" && "3:4"}
                                                {r === "LANDSCAPE" && "16:9"}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3 border-t border-white/10 pt-6">
                                    <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">智能指令 (可选)</h3>
                                    <textarea
                                        value={aiPrompt}
                                        onChange={(e) => setAiPrompt(e.target.value)}
                                        placeholder="例如：把背景变成落日余晖，增加动漫感"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-xs min-h-[80px] focus:outline-none focus:border-blue-500 transition-colors resize-none placeholder:text-white/20"
                                    />
                                </div>

                                <Button
                                    onClick={handleAIEdit}
                                    loading={isProcessing}
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20"
                                >
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    开始魔法生成
                                </Button>

                                <p className="text-[9px] text-white/30 text-center px-2">
                                    * AI 生成大约需要 10-30 秒，结果将作为副本保存到您的库中
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
