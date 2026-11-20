"use client";

import { useState, useEffect } from "react";

export interface UseLiveKitResult {
    token: string;
    isLoading: boolean;
    error: string | null;
}

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

export function useLiveKit(
    room?: string | string[],
    enabled: boolean = false
): UseLiveKitResult {
    const [token, setToken] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!room || !enabled) {
            setToken("");
            setError(null);
            return;
        }

        const controller = new AbortController();
        let isCancelled = false;

        const fetchToken = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const gameToken = typeof window !== "undefined" ? localStorage.getItem("gameToken") : null;
                if (!gameToken) {
                    if (!isCancelled) {
                        setToken("");
                        setError("Sesli sohbet için giriş yapmalısınız.");
                    }
                    return;
                }

                const roomStr = (Array.isArray(room) ? room[0] : room).toUpperCase();
                const resp = await fetch(
                    `${SERVER_URL}/api/livekit/token?room=${encodeURIComponent(roomStr)}`,
                    {
                        headers: { Authorization: `Bearer ${gameToken}` },
                        signal: controller.signal,
                    }
                );

                if (!resp.ok) {
                    const errData = await resp.json().catch(() => null);
                    const errMsg = errData?.error || `Ses bağlantısı alınamadı (${resp.status})`;
                    if (!isCancelled) {
                        setToken("");
                        setError(errMsg);
                    }
                    return;
                }

                const data = await resp.json();
                if (!isCancelled && data?.token) {
                    setToken(data.token);
                }
            } catch (err: unknown) {
                if (controller.signal.aborted || isCancelled) return;
                const message = err instanceof Error ? err.message : "LiveKit token alınamadı";
                console.error("[useLiveKit] Token fetch error:", err);
                setToken("");
                setError(message);
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        fetchToken();

        return () => {
            isCancelled = true;
            controller.abort();
        };
    }, [room, enabled]);

    return { token, isLoading, error };
}
