"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ZoomIn,
    ZoomOut,
    RotateCw,
    Maximize,
    Minimize,
    Palette,
    Pencil,
    Undo,
    Save,
    Eraser,
    X,
    ChevronLeft,
    ChevronRight,
    Sun,
    Contrast,
    Droplets,
    Play,
    Pause,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface ImmersiveViewerProps {
    src: string;
    alt: string;
    mimeType: string;
    onClose: () => void;
    onPrev?: () => void;
    onNext?: () => void;
    hasPrev?: boolean;
    hasNext?: boolean;
}

export function ImmersiveViewer({
    src,
    alt,
    mimeType,
    onClose,
    onPrev,
    onNext,
    hasPrev,
    hasNext,
}: ImmersiveViewerProps) {
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);

    // Filters
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        brightness: 100,
        contrast: 100,
        saturation: 100,
        grayscale: 0,
        sepia: 0,
        blur: 0,
    });

    // Drawing
    const [isDrawingMode, setIsDrawingMode] = useState(false);
    const [color, setColor] = useState("#f43f5e");
    const [lineWidth, setLineWidth] = useState(4);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Reset view handled by key prop in parent

    const [isPlaying, setIsPlaying] = useState(false);

    // Slideshow Effect
    // Slideshow Effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying) {
            if (hasNext && onNext) {
                interval = setInterval(() => {
                    onNext();
                }, 3000);
            } else {
                setTimeout(() => setIsPlaying(false), 0);
            }
        }
        return () => clearInterval(interval);
    }, [isPlaying, hasNext, onNext]);

    // Handle Fullscreen
    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    }, []);

    // Filter styles
    const filterStyle = {
        filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) grayscale(${filters.grayscale}%) sepia(${filters.sepia}%) blur(${filters.blur}px)`,
    };

    // Zoom logic
    const handleZoomIn = () => setScale((s) => Math.min(s * 1.2, 5));
    const handleZoomOut = () => setScale((s) => Math.max(s / 1.2, 0.1));
    const handleReset = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setRotation(0);
    };

    // Drawing Logic
    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawingMode || !canvasRef.current) return;
        setIsDrawing(true);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Get correct coordinates relative to canvas
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        // We need to account for the scale and position of the image/canvas
        // But since the canvas is overlaid on the image and transformed with it, 
        // we actually want to draw in the *original* coordinate space of the image.
        // However, capturing mouse events on a transformed element is tricky.
        // A simpler approach for "Annotation" is to have the canvas be the same size as the VIEWPORT 
        // and NOT transformed, but that means panning/zooming moves the image away from drawings.
        // Better approach: Canvas sits on top of the image and transforms WITH it.
        // BUT mapped mouse coordinates need to be inverse-transformed.

        // For simplicity in this version, "Drawing Mode" will LOCK Pan/Zoom.
        // Users draw on the visible area.

        const x = (clientX - rect.left) / scale; // Basic adjustment if we lock Zoom/Pan during draw
        const y = (clientY - rect.top) / scale;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth / scale; // Adjust line width so it looks constant
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !isDrawingMode || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const x = (clientX - rect.left) / scale;
        const y = (clientY - rect.top) / scale;

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const ctx = canvasRef.current?.getContext("2d");
        ctx?.closePath();
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative flex-1 flex items-center justify-center overflow-hidden bg-black/90",
                isFullscreen ? "h-screen w-screen" : "h-full w-full rounded-lg"
            )}
            onMouseMove={() => setShowControls(true)}
        // onMouseLeave={() => setShowControls(false)} // Optional: hide when mouse leaves
        >
            {/* Main Image Layer */}
            <motion.div
                className="relative will-change-transform"
                style={{
                    x: position.x,
                    y: position.y,
                    rotate: rotation,
                    scale: scale,
                }}
                drag={!isDrawingMode} // Disable drag when drawing
                dragConstraints={containerRef}
                dragElastic={0.1}
                onDragEnd={(e, info) => {
                    setPosition({ x: position.x + info.offset.x, y: position.y + info.offset.y });
                }}
            >
                {mimeType.startsWith("video") ? (
                    <video
                        src={src}
                        className="max-h-[80vh] max-w-[80vw] object-contain shadow-2xl"
                        controls={!isDrawingMode}
                        style={filterStyle}
                    />
                ) : (
                    <div className="relative">
                        {/* Image */}
                        <img
                            src={src}
                            alt={alt}
                            className="max-h-[80vh] max-w-[80vw] object-contain shadow-2xl pointer-events-none" // prevent img drag
                            style={filterStyle}
                        />

                        {/* Drawing Canvas Overlay */}
                        <canvas
                            ref={canvasRef}
                            className={cn(
                                "absolute inset-0 z-10 touch-none",
                                isDrawingMode ? "cursor-pencil pointer-events-auto" : "pointer-events-none"
                            )}
                            // We need to set width/height dynamically to match image? 
                            // For now, let's assume image loads and we can force full size of container or image.
                            // Ideally, we'd onLoad the image and set canvas size to match image natural size.
                            // Here we just let CSS handle it for the "Temporary" layer.
                            width={1920} // Start big? Or match image natural size?
                            height={1080}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                        />
                    </div>
                )}
            </motion.div>

            {/* Controls Overlay */}
            <AnimatePresence>
                {showControls && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center"
                    >
                        {/* Specific Toolbars */}
                        {showFilters && (
                            <div className="bg-black/80 backdrop-blur-md p-4 rounded-xl border border-white/10 mb-2 w-64 space-y-4">
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <Sun className="w-3 h-3" /> <span>亮度 {filters.brightness}%</span>
                                    </div>
                                    <Slider
                                        value={[filters.brightness]}
                                        min={0} max={200}
                                        onValueChange={([v]: number[]) => setFilters(f => ({ ...f, brightness: v }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <Contrast className="w-3 h-3" /> <span>对比度 {filters.contrast}%</span>
                                    </div>
                                    <Slider
                                        value={[filters.contrast]}
                                        min={0} max={200}
                                        onValueChange={([v]: number[]) => setFilters(f => ({ ...f, contrast: v }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <Droplets className="w-3 h-3" /> <span>饱和度 {filters.saturation}%</span>
                                    </div>
                                    <Slider
                                        value={[filters.saturation]}
                                        min={0} max={200}
                                        onValueChange={([v]: number[]) => setFilters(f => ({ ...f, saturation: v }))}
                                    />
                                </div>
                            </div>
                        )}

                        {isDrawingMode && (
                            <div className="bg-black/80 backdrop-blur-md p-2 rounded-xl border border-white/10 mb-2 flex gap-2">
                                <div
                                    className="w-6 h-6 rounded-full cursor-pointer border-2 border-white"
                                    style={{ backgroundColor: color }}
                                    onClick={() => setColor(color === "#f43f5e" ? "#3b82f6" : (color === "#3b82f6" ? "#22c55e" : "#f43f5e"))}
                                />
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-white" onClick={clearCanvas}>
                                    <Eraser className="w-4 h-4" />
                                </Button>
                            </div>
                        )}

                        {/* Main Toolbar */}
                        <div className="flex items-center gap-1 p-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 shadow-2xl">
                            {/* Nav */}
                            {hasPrev && (
                                <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 rounded-full" onClick={onPrev}>
                                    <ChevronLeft className="w-5 h-5" />
                                </Button>
                            )}

                            <div className="w-px h-6 bg-white/20 mx-1" />

                            {/* Slideshow */}
                            <Button size="icon" variant="ghost" className={cn("text-white hover:bg-white/20 rounded-full", isPlaying && "text-green-400")} onClick={() => setIsPlaying(!isPlaying)}>
                                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </Button>

                            <div className="w-px h-6 bg-white/20 mx-1" />

                            {/* View */}
                            <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 rounded-full" onClick={handleZoomOut}>
                                <ZoomOut className="w-4 h-4" />
                            </Button>
                            <span className="text-xs font-mono text-white/80 w-12 text-center">{Math.round(scale * 100)}%</span>
                            <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 rounded-full" onClick={handleZoomIn}>
                                <ZoomIn className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 rounded-full" onClick={() => setRotation(r => r + 90)}>
                                <RotateCw className="w-4 h-4" />
                            </Button>

                            <div className="w-px h-6 bg-white/20 mx-1" />

                            {/* Tools */}
                            <Button
                                size="icon"
                                variant={showFilters ? "secondary" : "ghost"}
                                className={cn("hover:bg-white/20 rounded-full", showFilters ? "bg-white text-black" : "text-white")}
                                onClick={() => { setShowFilters(!showFilters); setIsDrawingMode(false); }}
                            >
                                <Palette className="w-4 h-4" />
                            </Button>
                            <Button
                                size="icon"
                                variant={isDrawingMode ? "secondary" : "ghost"}
                                className={cn("hover:bg-white/20 rounded-full", isDrawingMode ? "bg-white text-black" : "text-white")}
                                onClick={() => { setIsDrawingMode(!isDrawingMode); setShowFilters(false); }}
                            >
                                <Pencil className="w-4 h-4" />
                            </Button>

                            <div className="w-px h-6 bg-white/20 mx-1" />

                            {/* Screen */}
                            <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 rounded-full" onClick={toggleFullscreen}>
                                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                            </Button>

                            {/* Nav */}
                            {hasNext && (
                                <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 rounded-full" onClick={onNext}>
                                    <ChevronRight className="w-5 h-5" />
                                </Button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Close Button (Independent) */}
            {!isFullscreen && (
                <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-4 right-4 text-white hover:bg-white/20 z-50 rounded-full"
                    onClick={onClose}
                >
                    <X className="w-6 h-6" />
                </Button>
            )}
        </div>
    );
}
