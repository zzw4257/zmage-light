"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps {
    className?: string;
    min?: number;
    max?: number;
    step?: number;
    value?: number[];
    defaultValue?: number[];
    onValueChange?: (value: number[]) => void;
    disabled?: boolean;
}

export function Slider({
    className,
    min = 0,
    max = 100,
    step = 1,
    value,
    defaultValue,
    onValueChange,
    disabled,
    ...props
}: SliderProps) {
    const [localValue, setLocalValue] = React.useState(defaultValue ? defaultValue[0] : 0);

    const currentValue = value ? value[0] : localValue;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = Number(e.target.value);
        setLocalValue(val);
        if (onValueChange) {
            onValueChange([val]);
        }
    };

    return (
        <div className={cn("relative flex w-full touch-none select-none items-center", className)}>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={currentValue}
                onChange={handleChange}
                disabled={disabled}
                className={cn(
                    "h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary disabled:cursor-not-allowed disabled:opacity-50",
                    "accent-primary",
                    // Custom track styles could be added here if needed, but accent-color usually works well for simple cases
                )}
                style={{
                    // CSS variable for accent color usually comes from global css or tailwind
                    accentColor: "white"
                }}
                {...props}
            />
        </div>
    );
}
