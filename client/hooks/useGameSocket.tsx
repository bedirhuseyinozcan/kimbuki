"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { toast } from "react-toastify";
import { Button } from "@mui/material";
import { User, GameState } from "@/components/game/types";

export interface UseGameSocketOptions {
    onClearNotepad?: () => void;
}

export interface GameStartSettings {
    category?: string;
    bettingEnabled?: boolean;
    jokersEnabled?: boolean;
    betAmount?: number;
    theme?: "day" | "night";
    map?: string;
}

export interface GameActions {
    start: (settings: GameStartSettings) => void;
    setWord: (customWord?: string) => void;
    chat: (e?: React.FormEvent, customMsg?: string) => void;
    skip: () => void;
    askQuestion: (question: string) => void;
    submitVote: (vote: string) => void;
    guess: (customGuess?: string) => void;
    useJoker: (payload: any) => void;
    toggleVoice: (enabled: boolean) => Promise<void>;
    copyLink: () => void;
    leaveRoom: () => void;
    selectAvatar: (id: number) => void;
    placeBet: (targetId: string) => void;
    editWord: () => void;
    shuffleTargets: () => void;
    selectJoker: (jokerId: number) => void;
    startObjection: () => void;
    voteObjection: (vote: boolean) => void;
    headRotation: (pitch: number, yaw: number) => void;
    taunt: (type: string) => void;
    closeRoom: () => void;
}

export function useGameSocket(
    code: string | string[] | undefined,
    options?: UseGameSocketOptions
) {
    const router = useRouter();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [inviteUrl, setInviteUrl] = useState<string>("");

    const [isJoined, setIsJoined] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);

    const [isConnected, setIsConnected] = useState(false);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [pingMs, setPingMs] = useState<number | null>(null);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const submittingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const markSubmitting = useCallback(() => {
        setIsSubmitting(true);
        if (submittingTimeoutRef.current) clearTimeout(submittingTimeoutRef.current);
        submittingTimeoutRef.current = setTimeout(() => {
            setIsSubmitting(false);
        }, 6000);
    }, []);

    const clearSubmitting = useCallback(() => {
        setIsSubmitting(false);
        if (submittingTimeoutRef.current) {
            clearTimeout(submittingTimeoutRef.current);
            submittingTimeoutRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            if (submittingTimeoutRef.current) clearTimeout(submittingTimeoutRef.current);
        };
    }, []);

    const [wordInput, setWordInput] = useState("");
    const [chatInput, setChatInput] = useState("");
    const [guessDialogOpen, setGuessDialogOpen] = useState(false);
    const [guessInput, setGuessInput] = useState("");

    const [headRotations, setHeadRotations] = useState<{ [key: string]: { pitch: number; yaw: number } }>({});
    const [taunts, setTaunts] = useState<{ [key: string]: { type: string; id: number } }>({});
    const [visualEffects, setVisualEffects] = useState<any[]>([]);

    const optionsRef = useRef(options);
    optionsRef.current = options;

    const userRef = useRef<any>(null);

    const wordInputRef = useRef(wordInput);
    wordInputRef.current = wordInput;

    const chatInputRef = useRef(chatInput);
    chatInputRef.current = chatInput;

    const guessInputRef = useRef(guessInput);
    guessInputRef.current = guessInput;

    const myId = socket?.id || "";
    const me = gameState?.users.find((u: User) => u.id === myId);

    
    useEffect(() => {
        if (code && typeof window !== "undefined") {
            const roomCode = Array.isArray(code) ? code[0] : code;
            setInviteUrl(`${window.location.origin}/game/${roomCode}`);
        }
    }, [code]);

    const connectToRoom = useCallback((user: any) => {
        userRef.current = user;
        const token = localStorage.getItem("gameToken");
        const s = io(process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000", {
            auth: { token },
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 10000,
        });
        setSocket(s);

        const roomCode = Array.isArray(code) ? code[0] : code;

        const emitJoin = () => {
            if (!userRef.current) return;
            s.emit(
                "room:join",
                {
                    roomCode,
                    name: userRef.current.username,
                    avatar: userRef.current.avatar,
                    pedestal: userRef.current.pedestal,
                    nameColor: userRef.current.nameColor,
                    title: userRef.current.title,
                },
                (res: any) => {
                    if (!res.ok) {
                        toast.error("Hata: " + res.error);
                        router.push("/");
                    } else {
                        setIsJoined(true);
                        setCheckingAuth(false);
                    }
                }
            );
        };

        s.on("connect", () => {
            setIsConnected(true);
            setIsReconnecting(false);
            setConnectionError(null);
            emitJoin();
        });

        s.on("disconnect", (reason) => {
            setIsConnected(false);
            if (reason !== "io client disconnect") {
                setIsReconnecting(true);
            }
        });

        s.on("connect_error", (err) => {
            setIsConnected(false);
            setIsReconnecting(true);
            setConnectionError(err?.message || "Sunucuya bağlanılamıyor...");
        });

        s.on("game:reconnected", (data) => {
            toast.success(data?.message || "Odaya yeniden bağlandınız!", { toastId: "reconnect-success" });
        });

        s.on("game:pong", ({ clientTimestamp }: { clientTimestamp: number }) => {
            if (clientTimestamp) {
                setPingMs(Date.now() - clientTimestamp);
            }
        });

        s.on("game:state", (state: GameState) => {
            clearSubmitting();
            setGuessDialogOpen(false);
            setGameState((prev) => {
                const isNewGameStarting = prev?.gameState === "ROUND_END" &&
                    (state.gameState === "BETTING" || state.gameState === "WORD_SELECTION" || state.gameState === "LOBBY");

                if (isNewGameStarting) {
                    optionsRef.current?.onClearNotepad?.();
                    setGuessInput("");
                    setWordInput("");
                }

                return {
                    ...state,
                    chatHistory: isNewGameStarting ? [] : (prev?.chatHistory || state.chatHistory || []),
                };
            });
        });

        s.on("game:init_chat", ({ chatHistory }: { chatHistory: any[] }) => {
            setGameState((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    chatHistory: chatHistory || [],
                };
            });
        });

        s.on("game:new_chat", (chatMsg: any) => {
            setGameState((prev) => {
                if (!prev) return prev;
                const history = prev.chatHistory || [];
                const isDuplicate = history.some(
                    (c) => c.timestamp === chatMsg.timestamp && c.message === chatMsg.message && c.userId === chatMsg.userId
                );
                if (isDuplicate) return prev;
                return {
                    ...prev,
                    chatHistory: [...history, chatMsg],
                };
            });
        });

        s.on("game:hint_result", ({ hint }: { hint: string }) => {
            toast.info(`💡 İPUCU: ${hint}`);
        });

        s.on("game:head_update", ({ userId, pitch, yaw }: any) => {
            setHeadRotations((prev) => ({ ...prev, [userId]: { pitch, yaw } }));
        });

        s.on("game:error", ({ message }: { message: string }) => {
            clearSubmitting();
            toast.error(message);
        });

        s.on("game:closed", () => {
            toast.error("Oda host tarafından kapatıldı!");
            s.disconnect();
            router.push("/");
        });

        s.on("game:reset_notepad", () => {
            if (optionsRef.current?.onClearNotepad) {
                optionsRef.current.onClearNotepad();
            }
        });

        s.on("game:clear_notepad", () => {
            if (optionsRef.current?.onClearNotepad) {
                optionsRef.current.onClearNotepad();
            }
            toast.error("🧠 AMNEZİ! Biri hafızanı sildi, tüm notların kayboldu!", { autoClose: 5000, theme: "colored" });
        });

        s.on("game:play_taunt", ({ userId, type }: any) => {
            const tauntId = Date.now();
            setTaunts((prev) => ({ ...prev, [userId]: { type, id: tauntId } }));
            setTimeout(() => {
                setTaunts((prev) => {
                    if (prev[userId]?.id === tauntId) {
                        const next = { ...prev };
                        delete next[userId];
                        return next;
                    }
                    return prev;
                });
            }, 2500);
        });

        s.on("game:visual_effect", async (payload: any) => {
            const audio = await import("@/utils/audio");
            if (payload.type === "bomb_explode") audio.playExplosionSound();
            else if (payload.type === "roulette_die") audio.playGunshotSound();
            else if (["mirror_cast", "shield_cast", "time_bend"].includes(payload.type)) audio.playMagicSound();
            else if (payload.type === "blood_tie") audio.playHeartbeatSound();
            else if (payload.type === "mind_wipe") audio.playGlitchSound();
            else if (payload.type === "silence_cast") audio.playSilenceSound();
            else if (payload.type === "extra_ammo") audio.playReloadSound();
            else if (payload.type === "letter_reveal") audio.playSparkleSound();

            const effId = Date.now() + Math.random();
            setVisualEffects((prev) => [...prev, { ...payload, id: effId }]);
            setTimeout(() => {
                setVisualEffects((prev) => prev.filter((e) => e.id !== effId));
            }, 2500);
        });
    }, [code, router]);

    useEffect(() => {
        if (!socket || !isConnected) return;
        socket.emit("game:ping", { clientTimestamp: Date.now() });

        const interval = setInterval(() => {
            socket.emit("game:ping", { clientTimestamp: Date.now() });
        }, 5000);

        return () => clearInterval(interval);
    }, [socket, isConnected]);


    useEffect(() => {
        const gameToken = localStorage.getItem("gameToken");
        if (!gameToken) {
            router.push(`/?invite=${code}`);
            return;
        }

        fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000"}/api/auth/me`, {
            headers: { Authorization: `Bearer ${gameToken}` },
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.username) {
                    connectToRoom(data);
                } else {
                    localStorage.removeItem("gameToken");
                    router.push(`/?invite=${code}`);
                }
            })
            .catch(() => {
                router.push(`/?invite=${code}`);
            });
    }, [code, router, connectToRoom]);

    // Socket temizleme
    useEffect(() => {
        return () => {
            if (socket) socket.disconnect();
        };
    }, [socket]);


    const handleStart = useCallback((settings: GameStartSettings) => {
        markSubmitting();
        socket?.emit("game:start", settings);
    }, [socket, markSubmitting]);

    const handleSetWord = useCallback((customWord?: string) => {
        const word = (typeof customWord === "string" ? customWord : wordInputRef.current).trim();
        if (!word) return;
        markSubmitting();
        socket?.emit("game:set_word", { word });
    }, [socket, markSubmitting]);

    const handleChat = useCallback((e?: React.FormEvent, customMsg?: string) => {
        e?.preventDefault();
        const msg = (typeof customMsg === "string" ? customMsg : chatInputRef.current).trim();
        if (!msg) return;
        socket?.emit("game:chat", { message: msg });
        setChatInput("");
    }, [socket]);

    const handleSkip = useCallback(() => {
        markSubmitting();
        socket?.emit("game:skip_turn");
    }, [socket, markSubmitting]);

    const handleAskQuestion = useCallback((question: string) => {
        markSubmitting();
        socket?.emit("game:ask_question", { question });
    }, [socket, markSubmitting]);

    const handleSubmitVote = useCallback((vote: string) => {
        markSubmitting();
        socket?.emit("game:submit_vote", { vote });
    }, [socket, markSubmitting]);

    const handleGuess = useCallback((customGuess?: string) => {
        const guess = (typeof customGuess === "string" ? customGuess : guessInputRef.current).trim();
        if (!guess) return;
        markSubmitting();
        socket?.emit("game:guess", { guess });
        setGuessInput("");
    }, [socket, markSubmitting]);

    const handleUseJoker = useCallback((payload: any) => {
        markSubmitting();
        socket?.emit("game:use_joker", payload);
    }, [socket, markSubmitting]);

    const toggleVoice = useCallback(async (enabled: boolean) => {
        socket?.emit("game:toggle_voice", { enabled });
    }, [socket]);

    const copyLink = useCallback(() => {
        navigator.clipboard.writeText(inviteUrl);
        toast.success("Davet linki kopyalandı!");
    }, [inviteUrl]);

    const handleLeaveRoom = useCallback(() => {
        socket?.emit("game:leave");
        if (socket) socket.disconnect();
        sessionStorage.removeItem("username");
        router.push("/");
    }, [socket, router]);

    const handleSelectAvatar = useCallback((id: number) => {
        socket?.emit("game:set_avatar", { avatarId: id });
    }, [socket]);

    const handlePlaceBet = useCallback((targetId: string) => {
        markSubmitting();
        socket?.emit("game:place_bet", { targetId });
    }, [socket, markSubmitting]);

    const handleEditWord = useCallback(() => {
        socket?.emit("game:edit_word");
    }, [socket]);

    const handleShuffleTargets = useCallback(() => {
        socket?.emit("game:shuffle_targets");
    }, [socket]);

    const handleSelectJoker = useCallback((jokerId: number) => {
        markSubmitting();
        socket?.emit("game:select_joker", { jokerId });
    }, [socket, markSubmitting]);

    const handleStartObjection = useCallback(() => {
        markSubmitting();
        socket?.emit("game:start_objection");
    }, [socket, markSubmitting]);

    const handleVoteObjection = useCallback((vote: boolean) => {
        markSubmitting();
        socket?.emit("game:vote_objection", { vote });
    }, [socket, markSubmitting]);

    const handleHeadRotation = useCallback((pitch: number, yaw: number) => {
        socket?.emit("game:head_rotation", { pitch, yaw });
    }, [socket]);

    const handleTaunt = useCallback((type: string) => {
        socket?.emit("game:taunt", { type });
    }, [socket]);

    const handleCloseRoom = useCallback(() => {
        toast(
            ({ closeToast }) => (
                <div className="flex flex-col gap-3">
                    <p className="font-bold">Odayı kapatmak istediğine emin misin?</p>
                    <p className="text-sm">Odada bulunan herkes atılacak.</p>
                    <div className="flex gap-2 justify-end mt-2">
                        <Button size="small" variant="outlined" color="inherit" onClick={closeToast}>
                            İptal
                        </Button>
                        <Button
                            size="small"
                            variant="contained"
                            color="error"
                            onClick={() => {
                                socket?.emit("room:close");
                                if (socket) socket.disconnect();
                                sessionStorage.removeItem("username");
                                router.push("/");
                                if (closeToast) closeToast();
                            }}
                        >
                            Kapat
                        </Button>
                    </div>
                </div>
            ),
            { autoClose: false, closeOnClick: false, draggable: false, position: "top-center" }
        );
    }, [socket, router]);

    const actions: GameActions = useMemo(() => ({
        start: handleStart,
        setWord: handleSetWord,
        chat: handleChat,
        skip: handleSkip,
        askQuestion: handleAskQuestion,
        submitVote: handleSubmitVote,
        guess: handleGuess,
        useJoker: handleUseJoker,
        toggleVoice,
        copyLink,
        leaveRoom: handleLeaveRoom,
        selectAvatar: handleSelectAvatar,
        placeBet: handlePlaceBet,
        editWord: handleEditWord,
        shuffleTargets: handleShuffleTargets,
        selectJoker: handleSelectJoker,
        startObjection: handleStartObjection,
        voteObjection: handleVoteObjection,
        headRotation: handleHeadRotation,
        taunt: handleTaunt,
        closeRoom: handleCloseRoom,
    }), [
        handleStart,
        handleSetWord,
        handleChat,
        handleSkip,
        handleAskQuestion,
        handleSubmitVote,
        handleGuess,
        handleUseJoker,
        toggleVoice,
        copyLink,
        handleLeaveRoom,
        handleSelectAvatar,
        handlePlaceBet,
        handleEditWord,
        handleShuffleTargets,
        handleSelectJoker,
        handleStartObjection,
        handleVoteObjection,
        handleHeadRotation,
        handleTaunt,
        handleCloseRoom,
    ]);

    return {
       
        socket,
        gameState,
        inviteUrl,
        isJoined,
        checkingAuth,
        myId,
        me,
        headRotations,
        taunts,
        visualEffects,

        isConnected,
        isReconnecting,
        pingMs,
        connectionError,
        isSubmitting,

        // Inputs
        wordInput,
        setWordInput,
        chatInput,
        setChatInput,
        guessDialogOpen,
        setGuessDialogOpen,
        guessInput,
        setGuessInput,

        actions,

        handleStart,
        handleSetWord,
        handleChat,
        handleSkip,
        handleAskQuestion,
        handleSubmitVote,
        handleGuess,
        handleUseJoker,
        toggleVoice,
        copyLink,
        handleLeaveRoom,
        handleSelectAvatar,
        handleCloseRoom,
        handlePlaceBet,
        handleEditWord,
        handleShuffleTargets,
        handleSelectJoker,
        handleStartObjection,
        handleVoteObjection,
        handleHeadRotation,
        handleTaunt,
    };
}
