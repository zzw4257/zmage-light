"use client";

import { useState } from "react";
import { Plus, X, Tag, Calendar, MapPin, Camera, Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface SmartAlbumRules {
    tags?: {
        include?: string[];
        exclude?: string[];
    };
    date_range?: {
        start?: string;
        end?: string;
    };
    location?: {
        lat?: number;
        lon?: number;
        radius_km?: number;
    };
    camera_model?: string;
    asset_type?: "image" | "video";
}

interface SmartAlbumBuilderProps {
    rules: SmartAlbumRules;
    onChange: (rules: SmartAlbumRules) => void;
    className?: string;
}

export function SmartAlbumBuilder({ rules, onChange, className }: SmartAlbumBuilderProps) {
    const [newIncludeTag, setNewIncludeTag] = useState("");
    const [newExcludeTag, setNewExcludeTag] = useState("");

    const updateRules = (partial: Partial<SmartAlbumRules>) => {
        onChange({ ...rules, ...partial });
    };

    const addIncludeTag = () => {
        if (!newIncludeTag.trim()) return;
        const currentTags = rules.tags?.include || [];
        if (!currentTags.includes(newIncludeTag.trim())) {
            updateRules({
                tags: {
                    ...rules.tags,
                    include: [...currentTags, newIncludeTag.trim()],
                },
            });
        }
        setNewIncludeTag("");
    };

    const removeIncludeTag = (tag: string) => {
        updateRules({
            tags: {
                ...rules.tags,
                include: (rules.tags?.include || []).filter((t) => t !== tag),
            },
        });
    };

    const addExcludeTag = () => {
        if (!newExcludeTag.trim()) return;
        const currentTags = rules.tags?.exclude || [];
        if (!currentTags.includes(newExcludeTag.trim())) {
            updateRules({
                tags: {
                    ...rules.tags,
                    exclude: [...currentTags, newExcludeTag.trim()],
                },
            });
        }
        setNewExcludeTag("");
    };

    const removeExcludeTag = (tag: string) => {
        updateRules({
            tags: {
                ...rules.tags,
                exclude: (rules.tags?.exclude || []).filter((t) => t !== tag),
            },
        });
    };

    return (
        <div className={cn("space-y-4", className)}>
            {/* 标签规则 */}
            <div className="p-4 border border-[var(--border)] rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                    <Tag className="h-4 w-4 text-[var(--primary)]" />
                    <span className="font-medium text-sm">标签规则</span>
                </div>

                {/* 包含标签 */}
                <div className="mb-3">
                    <label className="text-xs text-[var(--muted-foreground)] mb-1 block">
                        包含以下任意标签
                    </label>
                    <div className="flex flex-wrap gap-1 mb-2">
                        {(rules.tags?.include || []).map((tag) => (
                            <Badge key={tag} variant="default" className="gap-1">
                                {tag}
                                <button type="button" onClick={() => removeIncludeTag(tag)}>
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <Input
                            value={newIncludeTag}
                            onChange={(e) => setNewIncludeTag(e.target.value)}
                            placeholder="输入标签..."
                            className="flex-1"
                            onKeyDown={(e) => e.key === "Enter" && addIncludeTag()}
                        />
                        <Button size="sm" variant="outline" onClick={addIncludeTag}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* 排除标签 */}
                <div>
                    <label className="text-xs text-[var(--muted-foreground)] mb-1 block">
                        排除包含以下标签
                    </label>
                    <div className="flex flex-wrap gap-1 mb-2">
                        {(rules.tags?.exclude || []).map((tag) => (
                            <Badge key={tag} variant="error" className="gap-1">
                                {tag}
                                <button type="button" onClick={() => removeExcludeTag(tag)}>
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <Input
                            value={newExcludeTag}
                            onChange={(e) => setNewExcludeTag(e.target.value)}
                            placeholder="输入要排除的标签..."
                            className="flex-1"
                            onKeyDown={(e) => e.key === "Enter" && addExcludeTag()}
                        />
                        <Button size="sm" variant="outline" onClick={addExcludeTag}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* 日期规则 */}
            <div className="p-4 border border-[var(--border)] rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-[var(--primary)]" />
                    <span className="font-medium text-sm">拍摄日期范围</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-[var(--muted-foreground)] mb-1 block">开始日期</label>
                        <Input
                            type="date"
                            value={rules.date_range?.start || ""}
                            onChange={(e) =>
                                updateRules({
                                    date_range: { ...rules.date_range, start: e.target.value || undefined },
                                })
                            }
                        />
                    </div>
                    <div>
                        <label className="text-xs text-[var(--muted-foreground)] mb-1 block">结束日期</label>
                        <Input
                            type="date"
                            value={rules.date_range?.end || ""}
                            onChange={(e) =>
                                updateRules({
                                    date_range: { ...rules.date_range, end: e.target.value || undefined },
                                })
                            }
                        />
                    </div>
                </div>
            </div>

            {/* 相机型号 */}
            <div className="p-4 border border-[var(--border)] rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                    <Camera className="h-4 w-4 text-[var(--primary)]" />
                    <span className="font-medium text-sm">相机型号</span>
                </div>
                <Input
                    value={rules.camera_model || ""}
                    onChange={(e) => updateRules({ camera_model: e.target.value || undefined })}
                    placeholder="例如: iPhone 15 Pro"
                />
            </div>

            {/* 资产类型 */}
            <div className="p-4 border border-[var(--border)] rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                    <ImageIcon className="h-4 w-4 text-[var(--primary)]" />
                    <span className="font-medium text-sm">资产类型</span>
                </div>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant={rules.asset_type === undefined ? "default" : "outline"}
                        onClick={() => updateRules({ asset_type: undefined })}
                    >
                        全部
                    </Button>
                    <Button
                        size="sm"
                        variant={rules.asset_type === "image" ? "default" : "outline"}
                        onClick={() => updateRules({ asset_type: "image" })}
                    >
                        仅图片
                    </Button>
                    <Button
                        size="sm"
                        variant={rules.asset_type === "video" ? "default" : "outline"}
                        onClick={() => updateRules({ asset_type: "video" })}
                    >
                        仅视频
                    </Button>
                </div>
            </div>
        </div>
    );
}
