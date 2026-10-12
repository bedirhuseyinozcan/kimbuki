"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import WifiIcon from "@mui/icons-material/Wifi";
import WifiOffIcon from "@mui/icons-material/WifiOff";

interface ConnectionStatusProps {
    isConnected: boolean;
    isReconnecting: boolean;
    pingMs: number | null;
    connectionError?: string | null;
}

export default function ConnectionStatus({
    isConnected,
    isReconnecting,
    pingMs,
    connectionError,
}: ConnectionStatusProps) {
    let pingColor = "text-emerald-400 border-emerald-500/30 bg-emerald-950/40";
    let pingDot = "bg-emerald-400";
    if (pingMs !== null) {
        if (pingMs > 180) {
            pingColor = "text-rose-400 border-rose-500/30 bg-rose-950/40";
            pingDot = "bg-rose-400";
        } else if (pingMs > 90) {
            pingColor = "text-amber-400 border-amber-500/30 bg-amber-950/40";
            pingDot = "bg-amber-400";
        }
    }

    return (
        <>
            <AnimatePresence>
                {isReconnecting && (
                    <motion.div
                        initial={{ opacity: 0, y: -40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -40 }}
                        transition={{ duration: 0.3 }}
                        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
                    >
                        <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-rose-600/95 text-white shadow-2xl backdrop-blur-md border border-rose-400/50 animate-pulse text-sm font-semibold">
                            <WifiOffIcon className="w-5 h-5 animate-spin" />
                            <span>Bağlantı kesildi, sunucuya yeniden bağlanılıyor...</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="fixed top-3 right-3 z-40 flex items-center gap-2 pointer-events-auto select-none">
                <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border backdrop-blur-md transition-all shadow-md ${
                        isReconnecting
                            ? "text-rose-300 border-rose-500/50 bg-rose-950/60 animate-pulse"
                            : pingColor
                    }`}
                    title={
                        isReconnecting
                            ? connectionError || "Yeniden bağlanılıyor..."
                            : `Ağ Gecikmesi: ${pingMs !== null ? pingMs + "ms" : "Hesaplanıyor..."}`
                    }
                >
                    <span
                        className={`w-2 h-2 rounded-full ${
                            isReconnecting ? "bg-rose-500 animate-ping" : pingDot
                        }`}
                    />
                    {isReconnecting ? (
                        <span>Yeniden Bağlanıyor</span>
                    ) : (
                        <span>{pingMs !== null ? `${pingMs}ms` : "Bağlı"}</span>
                    )}
                </div>
            </div>
        </>
    );
}
