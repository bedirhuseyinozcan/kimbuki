"use client";

import { useState, useEffect, useCallback } from "react";

export interface UseNotepadResult {
    notepad: string;
    setNotepad: React.Dispatch<React.SetStateAction<string>>;
    clearNotepad: () => void;
    isLoaded: boolean;
}

export function useNotepad(code?: string | string[]): UseNotepadResult {
    const [notepad, setNotepad] = useState<string>("");
    const [isLoaded, setIsLoaded] = useState<boolean>(false);

    const roomCode = Array.isArray(code) ? code[0] : code;
    const storageKey = roomCode ? `kimbuki_notepad_${roomCode}` : null;

    useEffect(() => {
        if (!storageKey || typeof window === "undefined") return;
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved !== null) {
                setNotepad(saved);
            }
        } catch (e) {
            console.error("[useNotepad] LocalStorage okuma hatası:", e);
        } finally {
            setIsLoaded(true);
        }
    }, [storageKey]);

    useEffect(() => {
        if (!isLoaded || !storageKey || typeof window === "undefined") return;
        try {
            localStorage.setItem(storageKey, notepad);
        } catch (e) {
            console.error("[useNotepad] LocalStorage yazma hatası:", e);
        }
    }, [notepad, storageKey, isLoaded]);

    // Hafıza silindiğinde (Amnezi jokeri vb.) notları temizleme
    const clearNotepad = useCallback(() => {
        setNotepad("");
        if (storageKey && typeof window !== "undefined") {
            try {
                localStorage.removeItem(storageKey);
            } catch (e) {
                console.error("[useNotepad] LocalStorage temizleme hatası:", e);
            }
        }
    }, [storageKey]);

    return {
        notepad,
        setNotepad,
        clearNotepad,
        isLoaded,
    };
}
