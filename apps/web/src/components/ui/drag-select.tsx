"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface DragSelectProps {
    children: React.ReactNode;
    onSelectionChange?: (selectedIndices: number[]) => void;
    className?: string;
    itemSelector?: string;
    enabled?: boolean;
}

export function DragSelect({
    children,
    onSelectionChange,
    className,
    itemSelector = ".asset-card",
    enabled = true,
}: DragSelectProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const selectionRef = useRef<Set<number>>(new Set());

    const calculateSelection = useCallback(
        (x1: number, y1: number, x2: number, y2: number) => {
            if (!containerRef.current) return;

            const left = Math.min(x1, x2);
            const top = Math.min(y1, y2);
            const width = Math.abs(x1 - x2);
            const height = Math.abs(y1 - y2);

            const parentRect = containerRef.current.getBoundingClientRect();
            const selectionRect = {
                left: left,
                top: top,
                right: left + width,
                bottom: top + height,
            };

            const newSelectedIndices: number[] = [];
            const items = containerRef.current.querySelectorAll(itemSelector);

            items.forEach((item, index) => {
                const itemRect = item.getBoundingClientRect();

                // Check intersection
                if (
                    itemRect.left < selectionRect.right &&
                    itemRect.right > selectionRect.left &&
                    itemRect.top < selectionRect.bottom &&
                    itemRect.bottom > selectionRect.top
                ) {
                    newSelectedIndices.push(index);
                }
            });

            return newSelectedIndices;
        },
        [itemSelector]
    );

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            setCurrentPos({ x: e.clientX, y: e.clientY });
            const indices = calculateSelection(startPos.x, startPos.y, e.clientX, e.clientY);
            if (indices) {
                onSelectionChange?.(indices);
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, startPos, calculateSelection, onSelectionChange]);

    const handleMouseDown = (e: React.MouseEvent) => {
        // Only start drag if it's the left mouse button and not on a button or interactive element
        if (e.button !== 0 || !enabled) return;

        // Don't start drag if clicking directly on a button or menu
        const target = e.target as HTMLElement;
        if (target.closest("button") || target.closest("a") || target.closest(".dropdown-content")) {
            return;
        }

        setIsDragging(true);
        setStartPos({ x: e.clientX, y: e.clientY });
        setCurrentPos({ x: e.clientX, y: e.clientY });

        // Clear initial selection if not holding shift/cmd (advanced feature, but keeping it simple for now)
        // onSelectionChange?.([]);
    };

    const selectionBoxStyle: React.CSSProperties = {
        left: Math.min(startPos.x, currentPos.x),
        top: Math.min(startPos.y, currentPos.y),
        width: Math.abs(startPos.x - currentPos.x),
        height: Math.abs(startPos.y - currentPos.y),
        position: "fixed",
        zIndex: 9999,
        pointerEvents: "none",
    };

    return (
        <div
            ref={containerRef}
            className={cn("relative select-none", className)}
            onMouseDown={handleMouseDown}
        >
            {children}
            {isDragging && (
                <div
                    className="bg-primary/20 border border-primary ring-1 ring-primary/30 rounded-sm"
                    style={selectionBoxStyle}
                />
            )}
        </div>
    );
}
