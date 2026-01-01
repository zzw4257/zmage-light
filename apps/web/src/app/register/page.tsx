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

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        full_name: "",
    });

    const registerMutation = useMutation({
        mutationFn: () => authApi.register(formData),
        onSuccess: () => {
            toast.success("注册成功，请登录");
            router.push("/login");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || "注册失败");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password.length < 6) {
            toast.error("密码长度至少为 6 位");
            return;
        }
        registerMutation.mutate();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold">创建账号</CardTitle>
                    <p className="text-[var(--muted-foreground)]">开始您的智能资产管理之旅</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">用户名</label>
                            <Input
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">邮箱</label>
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">全名 (可选)</label>
                            <Input
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">密码 (≥6位)</label>
                            <Input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" loading={registerMutation.isPending}>
                            注册
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-2 text-center text-sm text-[var(--muted-foreground)]">
                    <p>
                        已有账号？{" "}
                        <Link href="/login" className="text-[var(--primary)] hover:underline">
                            立即登录
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
