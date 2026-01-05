"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { motion } from "framer-motion";
import { EntryBackground } from "@/components/onboarding/entry-background";
import toast from "react-hot-toast";

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const loginMutation = useMutation({
        mutationFn: async () => {
            const params = new URLSearchParams();
            params.append("username", username);
            params.append("password", password);
            return authApi.login(params);
        },
        onSuccess: (response) => {
            localStorage.setItem("zmage_token", response.data.access_token);
            toast.success("登录成功");
            router.push("/");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || "登录失败");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        loginMutation.mutate();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#050505] p-4 relative overflow-hidden">
            <EntryBackground />

            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full max-w-md z-10"
            >
                <Card className="glass border-white/10 shadow-2xl">
                    <CardHeader className="space-y-1 text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <img src="/logo-icon.png" alt="Zmage Logo" className="w-16 h-16 mx-auto mb-4 rounded-2xl shadow-2xl" />
                            <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/50">
                                Zmage
                            </CardTitle>
                            <p className="text-white/50 text-sm mt-2">赋予资源以智慧与秩序</p>
                        </motion.div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-white/50 uppercase tracking-widest">用户名或邮箱</label>
                                <Input
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    className="bg-white/5 border-white/10 focus:border-[var(--primary)] h-11 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-white/50 uppercase tracking-widest">密码</label>
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="bg-white/5 border-white/10 focus:border-[var(--primary)] h-11 transition-all"
                                />
                            </div>
                            <Button type="submit" className="w-full h-12 text-base font-semibold bg-white text-black hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all active:scale-[0.98]" loading={loginMutation.isPending}>
                                进入空间
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4 text-center text-sm">
                        <p className="text-white/30">
                            还没有账号？{" "}
                            <Link href="/register" className="text-white hover:underline transition-all">
                                开启旅程
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
}
