"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
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
    let pingColor = "text-[#00E5A3] border-[#00E5A3]/60 bg-[#1A1D24]";
    let pingDot = "bg-[#00E5A3]";
    if (!isConnected) {
        pingColor = "text-[#FF334B] border-[#FF334B] bg-[#1A1D24]";
        pingDot = "bg-[#FF334B]";
    } else if (pingMs !== null) {
        if (pingMs > 180) {
            pingColor = "text-[#FF334B] border-[#FF334B] bg-[#1A1D24]";
            pingDot = "bg-[#FF334B]";
        } else if (pingMs > 90) {
            pingColor = "text-[#FFBE0B] border-[#FFBE0B] bg-[#1A1D24]";
            pingDot = "bg-[#FFBE0B]";
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
                        transition={{ duration: 0.15 }}
                        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
                    >
                        <div className="flex items-center gap-3 px-5 py-2.5 rounded-[4px] bg-[#FF334B] text-white border-2 border-[#090A0D] shadow-[4px_4px_0px_#090A0D] text-xs font-mono font-bold uppercase tracking-wider">
                            <WifiOffIcon className="w-4 h-4 animate-spin" />
                            <span>BAĞLANTI KESİLDİ — SUNUCUYA BAĞLANILIYOR...</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="fixed top-14 right-2 md:top-auto md:right-auto md:bottom-3 md:left-3 z-40 flex items-center gap-2 pointer-events-auto select-none">
                <div
                    className={`flex items-center gap-2 px-2.5 py-1 rounded-[4px] text-[11px] font-mono font-bold uppercase tracking-wider border-2 shadow-[2px_2px_0px_#090A0D] ${
                        isReconnecting
                            ? "text-[#FF334B] border-[#FF334B] bg-[#1A1D24]"
                            : pingColor
                    }`}
                    title={
                        isReconnecting
                            ? connectionError || "Yeniden bağlanılıyor..."
                            : `Ağ Gecikmesi: ${pingMs !== null ? pingMs + "ms" : "Hesaplanıyor..."}`
                    }
                >
                    <span
                        className={`w-2 h-2 rounded-none ${
                            isReconnecting ? "bg-[#FF334B] animate-ping" : pingDot
                        }`}
                    />
                    {isReconnecting ? (
                        <span>BAĞLANIYOR</span>
                    ) : !isConnected ? (
                        <span>KOPTU</span>
                    ) : (
                        <span className="tnum">{pingMs !== null ? `${pingMs} MS` : "BAĞLI"}</span>
                    )}
                </div>
            </div>
        </>
    );
}
