"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    private handleRetry = () => {
        this.setState({ hasError: false });
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center glass rounded-2xl m-4 border-red-100 dark:border-red-900/30">
                    <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-6">
                        <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2 text-[var(--foreground)]">出错了</h2>
                    <p className="text-[var(--muted-foreground)] max-w-md mb-8">
                        系统发生了一些意外，我们已记录此问题。请尝试刷新页面。
                    </p>
                    <div className="flex gap-4">
                        <Button onClick={this.handleRetry} className="bg-red-600 hover:bg-red-700 text-white">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            重试
                        </Button>
                        <Button variant="ghost" onClick={() => (window.location.href = "/")}>
                            回到首页
                        </Button>
                    </div>
                    {process.env.NODE_ENV === "development" && this.state.error && (
                        <pre className="mt-8 p-4 bg-black/5 dark:bg-white/5 rounded-lg text-left text-xs overflow-auto max-w-full font-mono text-red-500">
                            {this.state.error.stack}
                        </pre>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
