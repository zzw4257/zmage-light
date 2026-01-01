"use client";

import MapView from "@/components/asset/map-view";
import { Sidebar } from "@/components/layout/sidebar";
import { motion } from "framer-motion";

export default function MapPage() {
    return (
        <div className="flex h-screen bg-[var(--background)] overflow-hidden">
            <Sidebar />
            <main className="flex-1 relative flex flex-col p-6 overflow-hidden">
                <header className="mb-6 animate-in slide-in-from-top duration-700">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">足迹地图</h1>
                            <p className="text-[var(--muted-foreground)]">回顾您在世界各地留下的精彩瞬间</p>
                        </div>
                    </div>
                </header>

                <section className="flex-1 relative">
                    <MapView />
                </section>
            </main>
        </div>
    );
}
