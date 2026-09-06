"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { Button, TextField } from "@mui/material";
import { toast } from "react-toastify";

import { User, GameState } from "@/components/game/types";
import Lobby from "@/components/game/Lobby";
import WordSelection from "@/components/game/WordSelection";
import GameScene from "@/components/game/GameScene";
import GameOver from "@/components/game/GameOver";
import { useWebRTC } from "@/components/game/useWebRTC";

export default function GamePage() {
    const { code } = useParams();
    const router = useRouter();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [inviteUrl, setInviteUrl] = useState<string>("");

    const [nameInput, setNameInput] = useState("");
    const [isJoined, setIsJoined] = useState(false);

    const [wordInput, setWordInput] = useState("");

    const [chatInput, setChatInput] = useState("");
    const [notepad, setNotepad] = useState("");
    const [guessDialogOpen, setGuessDialogOpen] = useState(false);
    const [guessInput, setGuessInput] = useState("");

    const myId = socket?.id || "";
    const me = gameState?.users.find((u: User) => u.id === myId);
    const { remoteStreams } = useWebRTC(socket, myId, me?.isVoiceEnabled || false, gameState?.users || []);

    const [checkingAuth, setCheckingAuth] = useState(true);

    useEffect(() => {
        if (code && typeof window !== 'undefined') {
            setInviteUrl(`${window.location.origin}/game/${code}`);
        }
    }, [code]);

    useEffect(() => {
        const token = localStorage.getItem("gameToken");
        if (!token) {
            router.push(`/?invite=${code}`);
            return;
        }

        fetch("http://localhost:4000/api/auth/me", {
            headers: { "Authorization": `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data.username) {
                connectToRoom(data.username);
            } else {
                localStorage.removeItem("gameToken");
                router.push(`/?invite=${code}`);
            }
        })
        .catch(() => {
            router.push(`/?invite=${code}`);
        });
    }, [code]);

    const connectToRoom = (username: string) => {
        const s = io("http://localhost:4000");
        setSocket(s);

        s.emit("room:join", { roomCode: code, name: username }, (res: any) => {
            if (!res.ok) {
                toast.error("Hata: " + res.error);
                router.push("/");
            } else {
                setIsJoined(true);
                setCheckingAuth(false);
            }
        });

        s.on("game:state", (state: GameState) => setGameState(state));
        s.on("game:hint_result", ({ hint }: { hint: string }) => {
            toast.info(`💡 İPUCU: ${hint}`);
        });
        s.on("game:closed", () => {
            toast.error("Oda host tarafından kapatıldı!");
            if (s) s.disconnect();
            router.push("/");
        });
    };

    useEffect(() => {
        return () => {
            if (socket) socket.disconnect();
        };
    }, [socket]);

    if (checkingAuth || !isJoined) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-slate-900 text-white">
                <div className="glass w-full max-w-sm p-8 rounded-3xl shadow-2xl animate-pulse border border-slate-700">
                    <h2 className="text-2xl font-bold text-cyan-400">Odaya Bağlanılıyor...</h2>
                    <p className="text-slate-400 mt-2">Lütfen bekleyin.</p>
                </div>
            </main>
        );
    }

    if (!gameState) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-2xl animate-pulse">Odaya bağlanıyor...</div>;

    const handleStart = (category?: string) => socket?.emit("game:start", { category });
    
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

    const handleUseHint = () => {
        socket?.emit("game:use_hint");
    };

    const toggleVoice = (enabled: boolean) => {
        socket?.emit("game:toggle_voice", { enabled });
    };

    const copyLink = () => {
        navigator.clipboard.writeText(inviteUrl);
        toast.success("Davet linki kopyalandı!");
    };

    const handleLeaveRoom = () => {
        if (socket) socket.disconnect();
        sessionStorage.removeItem("username");
        router.push("/");
    };

    const handleSelectAvatar = (id: number) => {
        socket?.emit("game:set_avatar", { avatarId: id });
    };

    const handleCloseRoom = () => {
        toast(
            ({ closeToast }) => (
                <div className="flex flex-col gap-3">
                    <p className="font-bold">Odayı kapatmak istediğine emin misin?</p>
                    <p className="text-sm">Odada bulunan herkes atılacak.</p>
                    <div className="flex gap-2 justify-end mt-2">
                        <Button 
                            size="small" 
                            variant="outlined" 
                            color="inherit" 
                            onClick={closeToast}
                        >
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
            { 
                autoClose: false, 
                closeOnClick: false, 
                draggable: false, 
                position: "top-center" 
            }
        );
    };

    const renderGameState = () => {
        if (gameState.gameState === "LOBBY") {
            return <Lobby 
                gameState={gameState} me={me!} code={code as string} inviteUrl={inviteUrl} myId={myId!} 
                onStart={handleStart} onCloseRoom={handleCloseRoom} onLeaveRoom={handleLeaveRoom} onCopyLink={copyLink} 
                onSelectAvatar={handleSelectAvatar} onToggleVoice={toggleVoice}
            />;
        }
        if (gameState.gameState === "WORD_SELECTION") {
            return <WordSelection 
                gameState={gameState} me={me!} wordInput={wordInput} setWordInput={setWordInput} 
                onSetWord={handleSetWord} onLeaveRoom={handleLeaveRoom} 
            />;
        }
        if (gameState.gameState === "PLAYING") {
            return <GameScene 
                gameState={gameState} me={me!} myId={myId!} 
                chatInput={chatInput} setChatInput={setChatInput} handleChat={handleChat}
                notepad={notepad} setNotepad={setNotepad}
                handleSkip={handleSkip}
                guessInput={guessInput} setGuessInput={setGuessInput} handleGuess={handleGuess}
                guessDialogOpen={guessDialogOpen} setGuessDialogOpen={setGuessDialogOpen}
                onLeaveRoom={handleLeaveRoom}
                onUseHint={handleUseHint}
                onAskQuestion={handleAskQuestion}
                onSubmitVote={handleSubmitVote}
            />;
        }
        if (gameState.gameState === "ROUND_END") {
            return <GameOver 
                gameState={gameState} me={me!} onStart={handleStart} onLeaveRoom={handleLeaveRoom} 
            />;
        }
        return null;
    };

    return (
        <>
            {renderGameState()}
            {Object.entries(remoteStreams).map(([id, stream]) => (
                <audio key={id} autoPlay ref={el => { if (el) el.srcObject = stream as any; }} />
            ))}
        </>
    );
}
