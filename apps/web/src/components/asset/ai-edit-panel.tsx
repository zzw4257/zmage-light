"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Wand2, RefreshCw, Download, X, Sparkles, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { aiApi, assetsApi, getStorageUrl, type Asset } from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface AIEditPanelProps {
    asset: Asset;
    onClose: () => void;
    onSuccess?: () => void;
}

export function AIEditPanel({ asset, onClose, onSuccess }: AIEditPanelProps) {
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const quickPrompts = [
        "转换为水彩画风格",
        "变成梵高星空风格",
        "转为黑白艺术照",
        "添加赛博朋克效果",
        "转为动漫风格",
        "增强色彩饱和度"
    ];

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast.error("请输入编辑指令");
            return;
        }

        setIsGenerating(true);
        setGeneratedImage(null);

        try {
            const { data } = await aiApi.edit({
                prompt,
                reference_asset_id: asset.id,
                model: "gemini-3-pro-image-preview",
            });

            if (data.images && data.images.length > 0) {
                setGeneratedImage(`data:image/jpeg;base64,${data.images[0]}`);
                toast.success("生成成功！");
            } else {
                toast.error("未生成图片");
            }
        } catch (error: unknown) {
            console.error(error);
            const errorMsg = (error as any).response?.data?.detail || "生成失败，请检查网络或 API 配置";
            toast.error(errorMsg);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!generatedImage) return;

        setIsSaving(true);
        try {
            const res = await fetch(generatedImage);
            const blob = await res.blob();
            const file = new File([blob], `ai-edited-${asset.filename}`, { type: "image/jpeg" });

            await assetsApi.upload(file);
            toast.success("已保存到图库");
            onSuccess?.();
            onClose();
        } catch (e) {
            console.error(e);
            toast.error("保存失败");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full md:w-[480px] bg-[#09090b] border-l border-white/10 shadow-2xl z-50 flex flex-col"
        >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-b from-purple-500/5 to-transparent">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-lg shadow-lg">
                        <Wand2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg text-white">AI 图片编辑</h2>
                        <p className="text-xs text-zinc-500">基于当前图片生成新版本</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10">
                    <X className="h-5 w-5" />
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Original Image */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">原始图片</label>
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/50">
                        <Image
                            src={getStorageUrl(asset.file_path)}
                            alt={asset.title || "原图"}
                            fill
                            className="object-contain"
                        />
                    </div>
                </div>

                {/* Prompt Input */}
                <div className="space-y-3">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">编辑指令</label>
                    <textarea
                        className="w-full h-24 p-4 rounded-xl bg-black/50 border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none"
                        placeholder="描述你想要的效果，例如：将画面变成梵高星空风格..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                    />
                </div>

                {/* Quick Prompts */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">快速指令</label>
                    <div className="flex flex-wrap gap-2">
                        {quickPrompts.map((p) => (
                            <button
                                key={p}
                                onClick={() => setPrompt(p)}
                                className="px-3 py-1.5 text-xs rounded-full bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 hover:border-purple-500/50 transition-all"
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Generate Button */}
                <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold shadow-lg shadow-purple-500/20"
                >
                    {isGenerating ? (
                        <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            正在施展魔法...
                        </>
                    ) : (
                        <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            开始生成
                        </>
                    )}
                </Button>

                {/* Result */}
                <AnimatePresence mode="wait">
                    {generatedImage && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-3"
                        >
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">生成结果</label>
                                <div className="flex items-center gap-1 text-xs text-green-500">
                                    <Check className="h-3 w-3" />
                                    <span>生成完成</span>
                                </div>
                            </div>
                            <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-purple-500/30 bg-black/50 shadow-xl shadow-purple-500/10">
                                <Image
                                    src={generatedImage}
                                    alt="AI 生成结果"
                                    fill
                                    className="object-contain"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex-1 h-11 rounded-xl bg-white text-black hover:bg-zinc-200 font-bold"
                                >
                                    {isSaving ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                            保存中...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="h-4 w-4 mr-2" />
                                            保存到图库
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={() => setGeneratedImage(null)}
                                    variant="ghost"
                                    className="h-11 rounded-xl hover:bg-white/10"
                                >
                                    重新生成
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer Tip */}
            <div className="p-4 border-t border-white/10 bg-black/20">
                <p className="text-xs text-zinc-500 text-center">
                    💡 提示：生成的图片会基于当前图片进行 AI 编辑
                </p>
            </div>
        </motion.div>
    );
}
