"use client";

import { LayoutGrid, List, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "grid" | "list" | "waterfall";

interface ViewModeSelectorProps {
    mode: ViewMode;
    onChange: (mode: ViewMode) => void;
}

export function ViewModeSelector({ mode, onChange }: ViewModeSelectorProps) {
    const modes: { value: ViewMode; icon: typeof LayoutGrid; label: string }[] = [
        { value: "grid", icon: LayoutGrid, label: "网格" },
        { value: "list", icon: List, label: "列表" },
        { value: "waterfall", icon: LayoutDashboard, label: "瀑布流" },
    ];

    return (
        <div className="flex items-center gap-1 p-1 bg-[var(--muted)] rounded-lg">
            {modes.map(({ value, icon: Icon, label }) => (
                <button
                    key={value}
                    onClick={() => onChange(value)}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                        mode === value
                            ? "bg-white dark:bg-zinc-800 text-[var(--foreground)] shadow-sm"
                            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    )}
                    title={label}
                >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{label}</span>
                </button>
            ))}
        </div>
    );
}
