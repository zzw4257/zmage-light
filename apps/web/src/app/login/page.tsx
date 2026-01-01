"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold">欢迎回来</CardTitle>
                    <p className="text-[var(--muted-foreground)]">登录您的 Zmage 账号</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">用户名或邮箱</label>
                            <Input
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">密码</label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" loading={loginMutation.isPending}>
                            登录
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-2 text-center text-sm text-[var(--muted-foreground)]">
                    <p>
                        还没有账号？{" "}
                        <Link href="/register" className="text-[var(--primary)] hover:underline">
                            立即注册
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
