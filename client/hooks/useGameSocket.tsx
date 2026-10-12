"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { toast } from "react-toastify";
import { Button } from "@mui/material";
import { User, GameState } from "@/components/game/types";

export function useGameSocket(code: string | string[] | undefined) {
    const router = useRouter();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [inviteUrl, setInviteUrl] = useState<string>("");

    const [isJoined, setIsJoined] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);

    const [wordInput, setWordInput] = useState("");
    const [chatInput, setChatInput] = useState("");
    const [notepad, setNotepad] = useState("");
    const [isNotepadLoaded, setIsNotepadLoaded] = useState(false);
    const [guessDialogOpen, setGuessDialogOpen] = useState(false);
    const [guessInput, setGuessInput] = useState("");

    const [headRotations, setHeadRotations] = useState<{ [key: string]: { pitch: number; yaw: number } }>({});
    const [taunts, setTaunts] = useState<{ [key: string]: { type: string; id: number } }>({});
    const [visualEffects, setVisualEffects] = useState<any[]>([]);
    const [token, setToken] = useState("");

    useEffect(() => {
        if (code && typeof window !== "undefined") {
            const saved = localStorage.getItem(`kimbuki_notepad_${code}`);
            if (saved) setNotepad(saved);
            setIsNotepadLoaded(true);
        }
    }, [code]);

    useEffect(() => {
        if (isNotepadLoaded && code && typeof window !== "undefined") {
            localStorage.setItem(`kimbuki_notepad_${code}`, notepad);
        }
    }, [notepad, code, isNotepadLoaded]);

    const myId = socket?.id || "";
    const me = gameState?.users.find((u: User) => u.id === myId);

    useEffect(() => {
        if (!me?.id || !code) return;
        (async () => {
            try {
                const livekitIdentity = me.dbId || me.id;
                const gameToken = localStorage.getItem("gameToken");
                const resp = await fetch(`/api/livekit?room=${code}&username=${encodeURIComponent(livekitIdentity)}`, {
                    headers: gameToken ? { Authorization: `Bearer ${gameToken}` } : {},
                });
                const data = await resp.json();
                if (data.token) {
                    setToken(data.token);
                }
            } catch (e) {
                console.error("LiveKit token fetch error", e);
            }
        })();
    }, [me?.id, me?.dbId, code]);

    useEffect(() => {
        if (code && typeof window !== "undefined") {
            setInviteUrl(`${window.location.origin}/game/${code}`);
        }
    }, [code]);

    const connectToRoom = useCallback((user: any) => {
        const token = localStorage.getItem("gameToken");
        const s = io(process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000", {
            auth: { token },
        });
        setSocket(s);

        s.emit(
            "room:join",
            {
                roomCode: code,
                name: user.username,
                avatar: user.avatar,
                pedestal: user.pedestal,
                nameColor: user.nameColor,
                title: user.title,
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

        s.on("game:state", (state: GameState) => setGameState(state));

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
            toast.error(message);
        });

        s.on("game:closed", () => {
            toast.error("Oda host tarafından kapatıldı!");
            s.disconnect();
            router.push("/");
        });

        s.on("game:clear_notepad", () => {
            setNotepad("");
            if (typeof window !== "undefined") {
                localStorage.removeItem(`kimbuki_notepad_${code}`);
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

    useEffect(() => {
        return () => {
            if (socket) socket.disconnect();
        };
    }, [socket]);

    // Game Actions
    const handleStart = (settings: {
        category?: string;
        bettingEnabled?: boolean;
        jokersEnabled?: boolean;
        betAmount?: number;
        theme?: "day" | "night";
        map?: string;
    }) => socket?.emit("game:start", settings);

    const handleSetWord = () => {
        if (!wordInput.trim()) return;
        socket?.emit("game:set_word", { word: wordInput });
    };

    const handleChat = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!chatInput.trim()) return;
        socket?.emit("game:chat", { message: chatInput });
        setChatInput("");
    };

    const handleSkip = () => {
        socket?.emit("game:skip_turn");
    };

    const handleAskQuestion = (question: string) => {
        socket?.emit("game:ask_question", { question });
    };

    const handleSubmitVote = (vote: string) => {
        socket?.emit("game:submit_vote", { vote });
    };

    const handleGuess = () => {
        if (!guessInput.trim()) return;
        socket?.emit("game:guess", { guess: guessInput });
        setGuessInput("");
        setGuessDialogOpen(false);
    };

    const handleUseJoker = (payload: any) => {
        socket?.emit("game:use_joker", payload);
    };

    const toggleVoice = async (enabled: boolean) => {
        socket?.emit("game:toggle_voice", { enabled });
    };

    const copyLink = () => {
        navigator.clipboard.writeText(inviteUrl);
        toast.success("Davet linki kopyalandı!");
    };

    const handleLeaveRoom = () => {
        socket?.emit("game:leave");
        if (socket) socket.disconnect();
        sessionStorage.removeItem("username");
        router.push("/");
    };

    const handleSelectAvatar = (id: number) => {
        socket?.emit("game:set_avatar", { avatarId: id });
    };

    const handlePlaceBet = (targetId: string) => {
        socket?.emit("game:place_bet", { targetId });
    };

    const handleEditWord = () => {
        socket?.emit("game:edit_word");
    };

    const handleShuffleTargets = () => {
        socket?.emit("game:shuffle_targets");
    };

    const handleSelectJoker = (jokerId: number) => {
        socket?.emit("game:select_joker", { jokerId });
    };

    const handleStartObjection = () => {
        socket?.emit("game:start_objection");
    };

    const handleVoteObjection = (vote: boolean) => {
        socket?.emit("game:vote_objection", { vote });
    };

    const handleHeadRotation = (pitch: number, yaw: number) => {
        socket?.emit("game:head_rotation", { pitch, yaw });
    };

    const handleTaunt = (type: string) => {
        socket?.emit("game:taunt", { type });
    };

    const handleCloseRoom = () => {
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
    };

    return {
        socket,
        gameState,
        inviteUrl,
        isJoined,
        checkingAuth,
        token,
        myId,
        me,
        headRotations,
        taunts,
        visualEffects,
        notepad,
        setNotepad,
        wordInput,
        setWordInput,
        chatInput,
        setChatInput,
        guessDialogOpen,
        setGuessDialogOpen,
        guessInput,
        setGuessInput,
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
