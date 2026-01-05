"use client";

import React from "react";
import {
    BarChart3,
    PieChart,
    TrendingUp,
    Database,
    Image as ImageIcon,
    FileVideo,
    Tag
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function StatsDashboard() {
    const { data: stats, isLoading, error } = useQuery({
        queryKey: ["dashboard-stats"],
        queryFn: async () => {
            const res = await api.get("/stats/dashboard");
            return res.data;
        },
    });

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 bg-gray-100 rounded-2xl"></div>
                ))}
            </div>
        );
    }

    if (error || !stats) return null;

    const summaryItems = [
        { label: "资产总数", value: stats.summary.total_assets, icon: ImageIcon, color: "text-blue-500", bg: "bg-blue-50" },
        { label: "相册数量", value: stats.summary.total_albums, icon: FileVideo, color: "text-purple-500", bg: "bg-purple-50" },
        { label: "存储消耗", value: `${stats.summary.usage_gb} GB`, icon: Database, color: "text-emerald-500", bg: "bg-emerald-50" },
        { label: "活跃标签", value: stats.top_tags.length, icon: Tag, color: "text-amber-500", bg: "bg-amber-50" },
    ];

    return (
        <div className="space-y-6">
            {/* 顶栏概览 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {summaryItems.map((item, idx) => (
                    <motion.div
                        key={item.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="glass rounded-2xl p-6 flex items-center gap-4 hover:shadow-lg transition-all border border-white/20"
                    >
                        <div className={`p-3 rounded-xl ${item.bg} ${item.color}`}>
                            <item.icon className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">{item.label}</p>
                            <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* 图表区域 (简易版) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 7天趋势 */}
                <div className="glass rounded-2xl p-6 border border-white/20">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-blue-500" />
                            最近 7 天上传趋势
                        </h3>
                    </div>
                    <div className="h-48 flex items-end justify-between gap-2 px-2">
                        {stats.trends.last_7_days.map((d: any, idx: number) => {
                            const maxCount = Math.max(...stats.trends.last_7_days.map((t: any) => t.count), 1);
                            const height = (d.count / maxCount) * 100;
                            return (
                                <div key={d.date} className="flex-1 flex flex-col items-center gap-2 group">
                                    <div className="relative w-full">
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${height}%` }}
                                            className="w-full bg-blue-500/80 rounded-t-lg group-hover:bg-blue-600 transition-colors"
                                        />
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs px-2 py-1 rounded">
                                            {d.count}
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-gray-400 rotate-45 transform origin-top-left whitespace-nowrap">
                                        {d.date.split('-').slice(1).join('/')}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 热门标签 */}
                <div className="glass rounded-2xl p-6 border border-white/20">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-amber-500" />
                            热门标签
                        </h3>
                    </div>
                    <div className="space-y-4">
                        {stats.top_tags.map((tag: any, idx: number) => {
                            const maxCount = stats.top_tags[0].count;
                            const width = (tag.count / maxCount) * 100;
                            return (
                                <div key={tag.tag} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-gray-700">{tag.tag}</span>
                                        <span className="text-gray-400">{tag.count}</span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${width}%` }}
                                            className="h-full bg-amber-400/80 rounded-full"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                        {stats.top_tags.length === 0 && (
                            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
                                暂无标签统计
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
