"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Lightbulb, Keyboard, Mouse } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingStep {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    tip?: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
    {
        id: "welcome",
        title: "欢迎来到 Zmage",
        description: "您的 AI 智能资产管理空间。让我们花一分钟了解如何高效管理您的媒体库。",
        icon: <Lightbulb className="h-6 w-6" />,
    },
    {
        id: "select",
        title: "批量选择",
        description: "点击资产卡片左上角的复选框即可开启批量模式。您也可以长按卡片触发。",
        icon: <Mouse className="h-6 w-6" />,
        tip: "💡 在触摸屏上，长按 0.6 秒即可激活批量模式",
    },
    {
        id: "shortcuts",
        title: "键盘高手",
        description: "按下 Ctrl+A (或 ⌘+A) 全选当前所有资源。使用 Shift+点击 进行范围选择。按 Esc 清除选择。",
        icon: <Keyboard className="h-6 w-6" />,
        tip: "⌨️ 这些快捷键在任何页面都有效",
    },
];

const STORAGE_KEY = "zmage_onboarding_completed";

interface OnboardingContextValue {
    showOnboarding: () => void;
    isFirstVisit: boolean;
}

const OnboardingContext = createContext<OnboardingContextValue>({
    showOnboarding: () => { },
    isFirstVisit: false,
});

export const useOnboarding = () => useContext(OnboardingContext);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [isFirstVisit, setIsFirstVisit] = useState(false);

    useEffect(() => {
        const completed = localStorage.getItem(STORAGE_KEY);
        if (!completed) {
            setIsFirstVisit(true);
            // Delay showing the onboarding slightly for a smoother experience
            const timer = setTimeout(() => setIsOpen(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleComplete = () => {
        localStorage.setItem(STORAGE_KEY, "true");
        setIsOpen(false);
    };

    const handleNext = () => {
        if (currentStep < ONBOARDING_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const step = ONBOARDING_STEPS[currentStep];

    return (
        <OnboardingContext.Provider value={{ showOnboarding: () => setIsOpen(true), isFirstVisit }}>
            {children}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 50, scale: 0.9 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-lg mx-4 bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
                        >
                            {/* Progress Bar */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${((currentStep + 1) / ONBOARDING_STEPS.length) * 100}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>

                            {/* Close Button */}
                            <button
                                onClick={handleComplete}
                                className="absolute top-4 right-4 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            {/* Content */}
                            <div className="p-8 pt-12">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={step.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-6"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-400">
                                                {step.icon}
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-white">{step.title}</h2>
                                                <p className="text-sm text-white/40">第 {currentStep + 1} 步，共 {ONBOARDING_STEPS.length} 步</p>
                                            </div>
                                        </div>

                                        <p className="text-white/70 leading-relaxed">{step.description}</p>

                                        {step.tip && (
                                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white/50">
                                                {step.tip}
                                            </div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Footer */}
                            <div className="p-6 pt-0 flex items-center justify-between">
                                <Button
                                    variant="ghost"
                                    onClick={handlePrev}
                                    disabled={currentStep === 0}
                                    className="text-white/50 hover:text-white disabled:opacity-30"
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    上一步
                                </Button>

                                <div className="flex gap-1.5">
                                    {ONBOARDING_STEPS.map((_, i) => (
                                        <div
                                            key={i}
                                            className={`w-2 h-2 rounded-full transition-all ${i === currentStep ? "bg-purple-500 w-6" : "bg-white/20"
                                                }`}
                                        />
                                    ))}
                                </div>

                                <Button
                                    onClick={handleNext}
                                    className="bg-white text-black hover:bg-white/90"
                                >
                                    {currentStep === ONBOARDING_STEPS.length - 1 ? "开始使用" : "下一步"}
                                    {currentStep < ONBOARDING_STEPS.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </OnboardingContext.Provider>
    );
}
