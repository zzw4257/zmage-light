"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Lock, Settings, LogOut, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function AccountPage() {
    const { sidebarOpen } = useAppStore();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [username, setUsername] = useState("用户");
    const [email, setEmail] = useState("user@example.com");

    const handleUpdateProfile = () => {
        // TODO: Implement profile update API
        toast.success("个人信息已更新");
    };

    const handleChangePassword = () => {
        if (newPassword !== confirmPassword) {
            toast.error("两次输入的密码不一致");
            return;
        }
        if (newPassword.length < 6) {
            toast.error("密码长度至少为 6 位");
            return;
        }
        // TODO: Implement password change API
        toast.success("密码已更新");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
    };

    const handleLogout = () => {
        // TODO: Implement logout
        localStorage.removeItem("zmage_token");
        toast.success("已退出登录");
        window.location.href = "/login";
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <div className="flex-1 flex overflow-hidden">
                <Sidebar mobile onClose={useAppStore.getState().toggleSidebar} />
                <Sidebar />

                <main className={cn("flex-1 overflow-y-auto", sidebarOpen && "md:ml-0")}>
                    <div className="max-w-4xl mx-auto p-6 space-y-6">
                        {/* 页面标题 */}
                        <div>
                            <h1 className="text-3xl font-bold">账号设置</h1>
                            <p className="text-[var(--muted-foreground)] mt-1">
                                管理您的个人信息和偏好设置
                            </p>
                        </div>

                        {/* 个人信息 */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass rounded-2xl p-6 space-y-4"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center">
                                    <User className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold">个人信息</h2>
                                    <p className="text-sm text-[var(--muted-foreground)]">
                                        更新您的个人资料
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        用户名
                                    </label>
                                    <Input
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="输入用户名"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        邮箱
                                    </label>
                                    <Input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="输入邮箱"
                                    />
                                </div>

                                <Button onClick={handleUpdateProfile} className="w-full sm:w-auto">
                                    <Save className="h-4 w-4 mr-2" />
                                    保存更改
                                </Button>
                            </div>
                        </motion.div>

                        {/* 修改密码 */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="glass rounded-2xl p-6 space-y-4"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center">
                                    <Lock className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold">修改密码</h2>
                                    <p className="text-sm text-[var(--muted-foreground)]">
                                        确保您的账号安全
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        当前密码
                                    </label>
                                    <Input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="输入当前密码"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        新密码
                                    </label>
                                    <Input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="输入新密码（至少 6 位）"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        确认新密码
                                    </label>
                                    <Input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="再次输入新密码"
                                    />
                                </div>

                                <Button onClick={handleChangePassword} className="w-full sm:w-auto">
                                    <Lock className="h-4 w-4 mr-2" />
                                    更新密码
                                </Button>
                            </div>
                        </motion.div>

                        {/* 偏好设置 */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="glass rounded-2xl p-6 space-y-4"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-green-500 to-emerald-500 flex items-center justify-center">
                                    <Settings className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold">偏好设置</h2>
                                    <p className="text-sm text-[var(--muted-foreground)]">
                                        自定义您的使用体验
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-lg border border-[var(--border)]">
                                    <div>
                                        <div className="font-medium">默认视图模式</div>
                                        <div className="text-sm text-[var(--muted-foreground)]">
                                            选择资产列表的默认显示方式
                                        </div>
                                    </div>
                                    <select className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)]">
                                        <option value="grid">网格</option>
                                        <option value="list">列表</option>
                                        <option value="waterfall">瀑布流</option>
                                    </select>
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-lg border border-[var(--border)]">
                                    <div>
                                        <div className="font-medium">AI 语义搜索</div>
                                        <div className="text-sm text-[var(--muted-foreground)]">
                                            默认启用 AI 增强搜索
                                        </div>
                                    </div>
                                    <input type="checkbox" className="w-5 h-5" defaultChecked />
                                </div>
                            </div>
                        </motion.div>

                        {/* 退出登录 */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="glass rounded-2xl p-6"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold">退出登录</h3>
                                    <p className="text-sm text-[var(--muted-foreground)] mt-1">
                                        退出当前账号
                                    </p>
                                </div>
                                <Button variant="destructive" onClick={handleLogout}>
                                    <LogOut className="h-4 w-4 mr-2" />
                                    退出
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                </main>
            </div>
        </div>
    );
}
