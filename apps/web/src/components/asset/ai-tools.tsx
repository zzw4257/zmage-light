"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Wand2, RefreshCw, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aiApi, assetsApi, type Asset } from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface AIToolsProps {
    asset?: Asset; // Optional for Generate, required for Edit
    onClose: () => void;
    onSuccess?: (newAsset: Asset) => void;
}

export function AITools({ asset, onClose, onSuccess }: AIToolsProps) {
    const [activeTab, setActiveTab] = useState<"generate" | "edit">("generate");
    const [prompt, setPrompt] = useState("");
    const [negativePrompt, setNegativePrompt] = useState("");
    const [aspectRatio, setAspectRatio] = useState("SQUARE");
    const [model, setModel] = useState("gemini-2.5-flash-image");
    const [isLoading, setIsLoading] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);

    // For saving
    const [isSaving, setIsSaving] = useState(false);

    const handleGenerate = async () => {
        if (!prompt) return toast.error("请输入提示词");

        setIsLoading(true);
        setGeneratedImages([]);

        try {
            const { data } = await aiApi.generate({
                prompt,
                negative_prompt: negativePrompt,
                model,
                aspect_ratio: aspectRatio,
                number_of_images: 1, // API usually returns 1
            });

            if (data.images && data.images.length > 0) {
                setGeneratedImages(data.images.map(b64 => `data:image/jpeg;base64,${b64}`));
                toast.success("生成成功");
            } else {
                toast.error("未生成图片");
            }
        } catch (error: unknown) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error(error);
            toast.error((error as any).response?.data?.detail || "生成失败");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = async () => {
        if (!asset) return toast.error("需要参考图片");
        if (!prompt) return toast.error("请输入提示词");

        setIsLoading(true);
        setGeneratedImages([]);

        try {
            const { data } = await aiApi.edit({
                prompt,
                reference_asset_id: asset.id,
                negative_prompt: negativePrompt,
                model: "gemini-3-pro-image-preview", // Edit usually uses Pro
            });

            if (data.images && data.images.length > 0) {
                setGeneratedImages(data.images.map(b64 => `data:image/jpeg;base64,${b64}`));
                toast.success("编辑成功");
            } else {
                toast.error("未生成图片");
            }
        } catch (error: unknown) {
            console.error(error);
            toast.error((error as any).response?.data?.detail || "编辑失败");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (imgDataUrl: string) => {
        setIsSaving(true);
        try {
            // Convert Data URL to File
            const res = await fetch(imgDataUrl);
            const blob = await res.blob();
            const file = new File([blob], `ai-generated-${Date.now()}.jpg`, { type: "image/jpeg" });

            // Upload
            const uploadRes = await assetsApi.upload(file);

            toast.success("保存成功");
            // Re-fetch or notify? 
            // Since upload returns simplified info, we might need to fetch full asset or just notify parent
            // Here we just notify success
            onClose();
            window.location.reload(); // Simple reload to refresh grid for now
        } catch (e) {
            console.error(e);
            toast.error("保存失败");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
            <div className="w-full max-w-6xl h-[85vh] bg-[#09090b] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative group">

                {/* Ambient Background Glow */}
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-500/20 blur-[150px] rounded-full pointer-events-none" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/20 blur-[150px] rounded-full pointer-events-none" />

                {/* Controls Panel */}
                <div className="w-full md:w-[360px] flex flex-col border-b md:border-b-0 md:border-r border-white/10 bg-black/40 backdrop-blur-xl relative z-10">
                    {/* Header */}
                    <div className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-lg shadow-lg shadow-purple-500/20">
                                <Sparkles className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h2 className="font-bold text-lg text-white tracking-tight">AI 创作</h2>
                                <p className="text-xs text-zinc-400">Gemini 驱动</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10 text-zinc-400 hover:text-white">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Tabs */}
                    <div className="px-6 pb-2">
                        <div className="flex p-1 bg-white/5 rounded-xl border border-white/5 relative">
                            <button
                                className={cn("flex-1 py-2 text-sm font-medium rounded-lg transition-all relative z-10", activeTab === "generate" ? "text-white" : "text-zinc-500 hover:text-zinc-300")}
                                onClick={() => setActiveTab("generate")}
                            >
                                文生图
                                {activeTab === "generate" && (
                                    <motion.div layoutId="activeTab" className="absolute inset-0 bg-white/10 rounded-lg -z-10 border border-white/5 shadow-sm" />
                                )}
                            </button>
                            <button
                                className={cn("flex-1 py-2 text-sm font-medium rounded-lg transition-all relative z-10", activeTab === "edit" ? "text-white" : "text-zinc-500 hover:text-zinc-300")}
                                onClick={() => setActiveTab("edit")}
                                disabled={!asset}
                            >
                                图生图
                                {activeTab === "edit" && (
                                    <motion.div layoutId="activeTab" className="absolute inset-0 bg-white/10 rounded-lg -z-10 border border-white/5 shadow-sm" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Form */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">创意描述 / Prompt</label>
                            <textarea
                                className="w-full h-32 p-4 rounded-xl bg-black/50 border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all resize-none shadow-inner"
                                placeholder={activeTab === "generate" ? "一只在太空漫步的猫，赛博朋克风格..." : "将画面变成梵高星空风格..."}
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">负向描述 / Negative</label>
                            <Input
                                className="bg-black/50 border-white/10 text-white placeholder:text-zinc-600 focus:ring-purple-500/50 rounded-xl"
                                value={negativePrompt}
                                onChange={e => setNegativePrompt(e.target.value)}
                                placeholder="模糊，低质量，变形..."
                            />
                        </div>

                        {activeTab === "generate" && (
                            <div className="space-y-3">
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">画布比例 / Ratio</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {["SQUARE", "PORTRAIT", "LANDSCAPE"].map(r => (
                                        <button
                                            key={r}
                                            className={cn(
                                                "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all",
                                                aspectRatio === r
                                                    ? "bg-purple-500/20 border-purple-500/50 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                                                    : "bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10 hover:text-zinc-300"
                                            )}
                                            onClick={() => setAspectRatio(r)}
                                        >
                                            <div className={cn(
                                                "border-2 rounded-sm opacity-50",
                                                r === "SQUARE" ? "w-6 h-6" : r === "PORTRAIT" ? "w-4 h-6" : "w-6 h-4",
                                                aspectRatio === r ? "border-purple-200" : "border-zinc-500"
                                            )} />
                                            <span className="text-[10px] font-medium">{r === "SQUARE" ? "1:1" : r === "PORTRAIT" ? "3:4" : "4:3"}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">模型 / Model</label>
                            <div className="relative">
                                <select
                                    className="w-full p-3 pl-4 pr-10 rounded-xl bg-black/50 border border-white/10 text-sm text-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    value={model}
                                    onChange={e => setModel(e.target.value)}
                                >
                                    <option value="gemini-2.5-flash-image">Gemini 2.5 Flash</option>
                                    <option value="gemini-3-pro-image-preview">Gemini 3 Pro (Preview)</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="p-6 border-t border-white/10 bg-black/20">
                        <Button
                            className={cn(
                                "w-full h-12 rounded-xl text-base font-semibold shadow-lg transition-all",
                                "bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-[length:200%_100%]",
                                isLoading ? "animate-pulse cursor-not-allowed opacity-80" : "hover:shadow-purple-500/25 hover:bg-[100%_0] animate-shimmer"
                            )}
                            onClick={activeTab === "generate" ? handleGenerate : handleEdit}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <RefreshCw className="h-5 w-5 animate-spin" />
                                    <span>正在施展魔法...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Wand2 className="h-5 w-5" />
                                    <span>{activeTab === "generate" ? "立即生成" : "执行编辑"}</span>
                                </div>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Preview Area */}
                <div className="flex-1 bg-[#09090b] relative flex items-center justify-center p-8 overflow-hidden">
                    {/* Grid Pattern Background */}
                    <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10 pointer-events-none" />

                    <AnimatePresence mode="wait">
                        {generatedImages.length > 0 ? (
                            <motion.div
                                key="result"
                                initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="relative max-w-full max-h-full group/image"
                            >
                                <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10">
                                    <Image
                                        src={generatedImages[0]}
                                        alt="Generated"
                                        width={1024}
                                        height={1024}
                                        className="max-h-[75vh] w-auto bg-zinc-900"
                                        unoptimized
                                    />
                                    {/* Overlay Actions */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity flex flex-col justify-end p-6">
                                        <div className="flex gap-3 justify-center">
                                            <Button
                                                onClick={() => handleSave(generatedImages[0])}
                                                disabled={isSaving}
                                                className="bg-white text-black hover:bg-zinc-200 font-semibold shadow-xl"
                                            >
                                                <Download className="mr-2 h-4 w-4" />
                                                保存到图库
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center md:max-w-md p-8 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-sm"
                            >
                                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-white/10 shadow-inner">
                                    <Sparkles className="h-10 w-10 text-white/50" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{activeTab === "generate" ? "开始您的想象" : "即刻重塑画面"}</h3>
                                <p className="text-zinc-400 mb-8 leading-relaxed">
                                    {activeTab === "generate"
                                        ? "输入一段描述，Gemini 将为您将其转化为令人惊叹的视觉作品。"
                                        : "选择一张参考图并输入修改指令，让 AI 为您完成润色与重绘。"}
                                </p>

                                {!isLoading && (
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {["赛博朋克城市", "油画风格的向日葵", "3D渲染的可爱小狗"].map(suggestion => (
                                            <button
                                                key={suggestion}
                                                onClick={() => setPrompt(suggestion)}
                                                className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}
