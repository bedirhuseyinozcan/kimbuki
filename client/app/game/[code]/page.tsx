"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { Button, TextField } from "@mui/material";

import { User, GameState } from "@/components/game/types";
import Lobby from "@/components/game/Lobby";
import WordSelection from "@/components/game/WordSelection";
import GameScene from "@/components/game/GameScene";
import GameOver from "@/components/game/GameOver";

export default function GamePage() {
    const { code } = useParams();
    const router = useRouter();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [inviteUrl, setInviteUrl] = useState<string>("");

    const [nameInput, setNameInput] = useState("");
    const [isJoined, setIsJoined] = useState(false);

    // Word selection
    const [wordInput, setWordInput] = useState("");

    // Playing phase
    const [chatInput, setChatInput] = useState("");
    const [notepad, setNotepad] = useState("");
    const [guessDialogOpen, setGuessDialogOpen] = useState(false);
    const [guessInput, setGuessInput] = useState("");

    useEffect(() => {
        if (code && typeof window !== 'undefined') {
            setInviteUrl(`${window.location.origin}/game/${code}`);
        }
    }, [code]);

    useEffect(() => {
        const storedName = sessionStorage.getItem("username");
        if (storedName) {
            connectToRoom(storedName);
        }
    }, [code]);

    const connectToRoom = (username: string) => {
        const s = io("http://localhost:4000");
        setSocket(s);

        s.emit("room:join", { roomCode: code, name: username }, (res: any) => {
            if (!res.ok) {
                alert("Hata: " + res.error);
                router.push("/");
            } else {
                setIsJoined(true);
            }
        });

        s.on("game:state", (state: GameState) => setGameState(state));
        s.on("game:closed", () => {
            alert("Oda host tarafından kapatıldı!");
            sessionStorage.removeItem("username");
            if (s) s.disconnect();
            router.push("/");
        });
    };

    const handleJoinSubmit = () => {
        if (!nameInput.trim()) return alert("Lütfen ismini gir!");
        sessionStorage.setItem("username", nameInput);
        connectToRoom(nameInput);
    };

    useEffect(() => {
        return () => {
            if (socket) socket.disconnect();
        };
    }, [socket]);

    if (!isJoined) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-slate-900 text-white">
                <div className="glass w-full max-w-sm p-8 rounded-3xl shadow-2xl space-y-6 animate-fade-in-up border border-slate-700">
                    <h2 className="text-3xl font-extrabold text-cyan-400">Lobiye Katıl</h2>
                    <p className="text-slate-400 font-mono text-xl tracking-widest bg-slate-800 p-2 rounded-lg">{code}</p>
                    
                    <div className="text-left space-y-2">
                        <label className="text-sm font-medium text-slate-300 ml-1">Kullanıcı Adı</label>
                        <TextField 
                            fullWidth
                            size="small"
                            placeholder="Oyuncu adınızı girin..."
                            value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
                            slotProps={{ input: { className: "text-white bg-slate-800 rounded-xl" } }}
                        />
                    </div>
                    
                    <Button 
                        variant="contained" 
                        color="primary" 
                        fullWidth 
                        size="large"
                        onClick={handleJoinSubmit}
                        className="py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 font-bold text-lg"
                    >
                        GİRİŞ YAP
                    </Button>
                    <Button onClick={() => router.push("/")} color="inherit" className="mt-2 text-slate-400">
                        Geri Dön
                    </Button>
                </div>
            </main>
        );
    }

    if (!gameState) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-2xl animate-pulse">Odaya bağlanıyor...</div>;

    const myId = socket?.id;
    const me = gameState.users.find((u: User) => u.id === myId);
    
    const handleStart = () => socket?.emit("game:start");
    
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

    const handleGuess = () => {
        if (!guessInput.trim()) return;
        socket?.emit("game:guess", { guess: guessInput });
        setGuessInput("");
        setGuessDialogOpen(false);
    };

    const copyLink = () => {
        navigator.clipboard.writeText(inviteUrl);
        alert("Davet linki kopyalandı!");
    };

    const handleLeaveRoom = () => {
        if (socket) socket.disconnect();
        sessionStorage.removeItem("username");
        router.push("/");
    };

    const handleCloseRoom = () => {
        if (confirm("Odayı tamamen kapatmak istediğine emin misin? Herkes atılacak.")) {
            socket?.emit("room:close");
            if (socket) socket.disconnect();
            sessionStorage.removeItem("username");
            router.push("/");
        }
    };

    if (gameState.gameState === "LOBBY") {
        return <Lobby 
            gameState={gameState} me={me!} code={code as string} inviteUrl={inviteUrl} myId={myId!} 
            onStart={handleStart} onCloseRoom={handleCloseRoom} onLeaveRoom={handleLeaveRoom} onCopyLink={copyLink} 
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
        />;
    }

    if (gameState.gameState === "ROUND_END") {
        return <GameOver 
            gameState={gameState} me={me!} onStart={handleStart} onLeaveRoom={handleLeaveRoom} 
        />;
    }

    return null;
}
