"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { AssetGrid } from "@/components/asset/asset-grid";
import { AssetDetail } from "@/components/asset/asset-detail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { vaultApi, type Asset } from "@/lib/api";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { Lock, Unlock, LogOut } from "lucide-react";

export default function VaultPage() {
    const queryClient = useQueryClient();
    const { sidebarOpen } = useAppStore();

    const [page, setPage] = useState(1);
    const [pin, setPin] = useState("");
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [vaultToken, setVaultToken] = useState<string | null>(null);
    const [hasPin, setHasPin] = useState<boolean | null>(null);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

    // 检查是否已设置 PIN
    const { data: statusData } = useQuery({
        queryKey: ["vault-status"],
        queryFn: async () => {
            const res = await vaultApi.status();
            return res.data;
        },
    });

    useEffect(() => {
        if (statusData) {
            setHasPin(statusData.has_pin);
        }
    }, [statusData]);

    // 尝试从 SessionStorage 恢复 Token
    useEffect(() => {
        const token = sessionStorage.getItem("vault_token");
        if (token) {
            setVaultToken(token);
            setIsUnlocked(true);
        }
    }, []);

    // 验证 PIN
    const verifyMutation = useMutation({
        mutationFn: (pin: string) => vaultApi.verify(pin),
        onSuccess: (data) => {
            const token = data.data.vault_token;
            setVaultToken(token);
            setIsUnlocked(true);
            sessionStorage.setItem("vault_token", token);
            toast.success("已解锁");
            setPin("");
        },
        onError: () => toast.error("PIN 码错误"),
    });

    // 设置 PIN
    const setupMutation = useMutation({
        mutationFn: (pin: string) => vaultApi.setup(pin),
        onSuccess: () => {
            toast.success("PIN 设置成功，请登录");
            setHasPin(true);
            setPin("");
        },
        onError: () => toast.error("设置失败"),
    });

    // 获取保险库资产
    const { data: assetsData, isLoading } = useQuery({
        queryKey: ["vault-assets", { page, vaultToken }],
        queryFn: async () => {
            if (!vaultToken) return { items: [], total: 0 };
            const response = await vaultApi.list(vaultToken, { page, page_size: 50 });
            return response.data;
        },
        enabled: isUnlocked && !!vaultToken,
    });

    const handleUnlock = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.length < 4) return;
        verifyMutation.mutate(pin);
    };

    const handleSetup = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.length < 4) {
            toast.error("PIN 码至少 4 位");
            return;
        }
        setupMutation.mutate(pin);
    };

    const handleLock = () => {
        setIsUnlocked(false);
        setVaultToken(null);
        sessionStorage.removeItem("vault_token");
        toast.success("已锁定");
    };

    // 移出保险库
    const moveOutMutation = useMutation({
        mutationFn: (id: number) => {
            if (!vaultToken) throw new Error("No token");
            return vaultApi.moveOut(id, vaultToken);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["vault-assets"] });
            toast.success("已移出保险库");
        },
        onError: () => toast.error("操作失败")
    });

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <div className="flex-1 flex overflow-hidden">
                <Sidebar mobile onClose={useAppStore.getState().toggleSidebar} />
                <Sidebar />

                <main className={cn("flex-1 overflow-y-auto bg-gray-50/50 dark:bg-black/20", sidebarOpen && "md:ml-0")}>
                    <div className="sticky top-0 z-10 glass border-b border-[var(--border)] px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {isUnlocked ? <Unlock className="w-5 h-5 text-green-500" /> : <Lock className="w-5 h-5 text-[var(--muted-foreground)]" />}
                                <h1 className="text-xl font-semibold">私密保险库</h1>
                            </div>

                            {isUnlocked && (
                                <Button variant="ghost" size="sm" onClick={handleLock}>
                                    <LogOut className="w-4 h-4 mr-2" />
                                    锁定
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="p-6 h-[calc(100vh-140px)]">
                        {!isUnlocked ? (
                            <div className="h-full flex flex-col items-center justify-center max-w-sm mx-auto p-8">
                                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
                                    <Lock className="w-8 h-8 text-gray-500" />
                                </div>

                                <h2 className="text-2xl font-bold mb-2">
                                    {hasPin === false ? "设置保险库 PIN" : "输入密码解锁"}
                                </h2>
                                <p className="text-gray-500 text-sm mb-8 text-center">
                                    {hasPin === false
                                        ? "设置一个安全 PIN 码来保护您的私密照片和视频"
                                        : "查看私密内容需要验证身份"}
                                </p>

                                <form onSubmit={hasPin === false ? handleSetup : handleUnlock} className="w-full space-y-4">
                                    <Input
                                        type="password"
                                        placeholder="输入 PIN 码"
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value)}
                                        className="text-center text-lg tracking-widest h-12"
                                        maxLength={20}
                                        autoFocus
                                    />
                                    <Button type="submit" className="w-full h-12 text-lg" disabled={verifyMutation.isPending || setupMutation.isPending}>
                                        {hasPin === false ? "设置 PIN" : "解锁"}
                                    </Button>
                                </form>
                            </div>
                        ) : (
                            <AssetGrid
                                assets={assetsData?.items ?? []}
                                loading={isLoading}
                                onAssetClick={(asset) => setSelectedAsset(asset)}
                                actionRenderer={(asset) => (
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                moveOutMutation.mutate(asset.id);
                                            }}
                                        >
                                            <Unlock className="w-4 h-4 mr-1" />
                                            移出
                                        </Button>
                                    </div>
                                )}
                            />
                        )}
                    </div>
                </main>
                {selectedAsset && (
                    <div className="z-[100]">
                        <AssetDetail
                            asset={selectedAsset}
                            onClose={() => setSelectedAsset(null)}
                            onMoveOut={() => {
                                moveOutMutation.mutate(selectedAsset.id);
                                setSelectedAsset(null);
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
