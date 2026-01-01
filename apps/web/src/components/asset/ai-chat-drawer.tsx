"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, X, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mcpApi, aiApi, type Asset, getStorageUrl } from "@/lib/api";
import Image from "next/image";

interface Message {
    role: "user" | "bot";
    content: string;
    assets?: Asset[];
    status?: "searching" | "updating" | "creating";
}

export function AIChatDrawer({ onClose, onAssetClick }: { onClose: () => void; onAssetClick: (asset: Asset) => void }) {
    const [messages, setMessages] = useState<Message[]>([
        { role: "bot", content: "你好！我是 Zmage AI 助手。我可以帮你搜索照片、管理相册、甚至是整理文件。试试跟我对话吧！" }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = input;
        setInput("");
        const newMessages: Message[] = [...messages, { role: "user", content: userMsg }];
        setMessages(newMessages);
        setIsLoading(true);

        try {
            // 只发送最近的 10 条消息以节省 Token
            const chatHistory = newMessages.slice(-10).map(m => ({
                role: m.role,
                content: m.content
            }));

            const response = await aiApi.chat({ messages: chatHistory });
            const botMsg = response.data;

            // 提取工具结果中的资产 (如果有 search_assets)
            let assets: Asset[] | undefined = undefined;
            if (botMsg.tool_results) {
                const searchResult = botMsg.tool_results.find(r => r.tool === "search_assets" && !r.is_error);
                if (searchResult && searchResult.result) {
                    // result 结构是 [{"type": "text", ...}, {"type": "json", "data": [...]}]
                    const jsonPart = searchResult.result.find((p: any) => p.type === "json");
                    if (jsonPart) {
                        assets = jsonPart.data;
                    }
                }
            }

            setMessages(prev => [...prev, {
                role: "bot",
                content: botMsg.content,
                assets
            }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: "bot", content: "AI 助手暂时遇到了点麻烦，请稍后再试。" }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-[var(--background)] border-l border-[var(--border)] shadow-2xl flex flex-col"
        >
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--card)]">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                        <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-sm">AI 视觉助手</h2>
                        <p className="text-[10px] text-[var(--muted-foreground)]">基于 MCP 协议的智能检索</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6">
                {messages.map((msg, i) => (
                    <div key={i} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "")}>
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                            msg.role === "user" ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                        )}>
                            {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                        </div>
                        <div className={cn("flex flex-col gap-2 max-w-[80%]", msg.role === "user" ? "items-end" : "")}>
                            <div className={cn(
                                "p-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                                msg.role === "user" ? "bg-blue-600 text-white rounded-tr-none" : "bg-[var(--secondary)] rounded-tl-none"
                            )}>
                                {msg.content}
                            </div>

                            {msg.assets && msg.assets.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                    {msg.assets.slice(0, 4).map(asset => (
                                        <div
                                            key={asset.id}
                                            className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group hover:ring-2 hover:ring-purple-500 transition-all"
                                            onClick={() => onAssetClick(asset)}
                                        >
                                            <Image
                                                src={asset.thumbnail_url || getStorageUrl(asset.thumbnail_path)}
                                                alt={asset.title || asset.original_filename}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    ))}
                                    {msg.assets.length > 4 && (
                                        <div className="flex items-center justify-center bg-[var(--muted)] text-[var(--muted-foreground)] text-[10px] rounded-lg">
                                            +{msg.assets.length - 4}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                            <Bot className="h-4 w-4 text-purple-600" />
                        </div>
                        <div className="p-3 rounded-2xl bg-[var(--secondary)] rounded-tl-none">
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-[var(--border)] bg-[var(--card)]">
                <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="像聊天一样搜索照片..."
                        className="pr-12 rounded-full border-purple-200 focus:ring-purple-500"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full h-8 w-8 bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                        disabled={!input.trim() || isLoading}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </motion.div>
    );
}

const cn = (...classes: any[]) => classes.filter(Boolean).join(" ");
