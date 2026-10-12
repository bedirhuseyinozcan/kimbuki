"use client";

import { useState, useEffect } from "react";

export interface UseLiveKitResult {
    token: string;
    isLoading: boolean;
    error: string | null;
}

export function useLiveKit(
    room?: string | string[],
    identity?: string
): UseLiveKitResult {
    const [token, setToken] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!room || !identity) {
            setToken("");
            return;
        }

        let isCancelled = false;

        const fetchToken = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const gameToken = typeof window !== "undefined" ? localStorage.getItem("gameToken") : null;
                const roomStr = Array.isArray(room) ? room[0] : room;
                const resp = await fetch(
                    `/api/livekit?room=${encodeURIComponent(roomStr)}&username=${encodeURIComponent(identity)}`,
                    {
                        headers: gameToken ? { Authorization: `Bearer ${gameToken}` } : {},
                    }
                );

                if (!resp.ok) {
                    const errData = await resp.json().catch(() => null);
                    const errMsg = errData?.error || `LiveKit token alma hatası: ${resp.statusText}`;
                    if (!isCancelled) {
                        console.warn("[useLiveKit]", errMsg);
                        setError(errMsg);
                    }
                    return;
                }

                const data = await resp.json();
                if (!isCancelled && data.token) {
                    setToken(data.token);
                }
            } catch (err: any) {
                if (!isCancelled) {
                    console.error("[useLiveKit] Token fetch error:", err);
                    setError(err?.message || "LiveKit token alınamadı");
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        fetchToken();

        return () => {
            isCancelled = true;
        };
    }, [room, identity]);

    return { token, isLoading, error };
}
