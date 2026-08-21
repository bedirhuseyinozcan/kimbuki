"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { 
    Button, Dialog, DialogTitle, DialogContent, DialogActions, 
    TextField, Avatar, IconButton, Chip 
} from "@mui/material";
import SendIcon from '@mui/icons-material/Send';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import HelpIcon from '@mui/icons-material/Help';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import CancelIcon from '@mui/icons-material/Cancel';

type User = {
    id: string;
    name: string;
    isHost: boolean;
    avatar: number;
    status: string;
    targetId: string | null;
    hasSubmittedWord: boolean;
    assignedWord: string | null;
};

export default function GamePage() {
    const { code } = useParams();
    const router = useRouter();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [gameState, setGameState] = useState<any>(null);
    const [inviteUrl, setInviteUrl] = useState<string>("");

    const [nameInput, setNameInput] = useState("");
    const [isJoined, setIsJoined] = useState(false);

    const [wordInput, setWordInput] = useState("");

    const [chatInput, setChatInput] = useState("");
    const [notepad, setNotepad] = useState("");
    const [guessDialogOpen, setGuessDialogOpen] = useState(false);
    const [guessInput, setGuessInput] = useState("");

    const chatEndRef = useRef<HTMLDivElement>(null);

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

        s.on("game:state", (state) => setGameState(state));
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
        if (gameState?.chatHistory) {
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [gameState?.chatHistory]);

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
                            placeholder="Nicknamem..."
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
    const isMyTurn = gameState.currentTurnUserId === myId;
    const currentTurnUser = gameState.users.find((u: User) => u.id === gameState.currentTurnUserId);

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
        if (!isMyTurn) return;
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
        return (
            <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 relative">
                
                <div className="absolute top-4 right-4 flex gap-2">
                    {me?.isHost && (
                        <Button variant="outlined" color="error" size="small" onClick={handleCloseRoom} startIcon={<CancelIcon />}>
                            Odayı Kapat
                        </Button>
                    )}
                    <Button variant="contained" color="error" size="small" onClick={handleLeaveRoom} startIcon={<LogoutIcon />} className="bg-red-500/20 text-red-400 border-red-500/50">
                        Çıkış Yap
                    </Button>
                </div>

                <div className="glass max-w-xl w-full p-8 rounded-3xl text-center shadow-2xl">
                    <h1 className="text-4xl font-black mb-2 bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-cyan-400">
                        Lobi
                    </h1>
                    <div className="text-5xl font-mono font-black text-slate-800 bg-slate-200 rounded-xl p-4 mb-6 tracking-[0.2em] select-all">
                        {code}
                    </div>

                    <div className="mb-8 flex items-center justify-center gap-2">
                        <TextField 
                            value={inviteUrl} 
                            slotProps={{ input: { readOnly: true, className: "text-slate-300 text-sm" } }}
                            size="small" 
                            className="bg-slate-800 rounded-lg"
                            fullWidth
                        />
                        <IconButton onClick={copyLink} color="primary" className="bg-slate-800 hover:bg-slate-700">
                            <ContentCopyIcon />
                        </IconButton>
                    </div>

                    <div className="text-left space-y-3 mb-8">
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-sm border-b border-slate-700 pb-2">Oyuncular ({gameState.users.length})</p>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                            {gameState.users.map((u: User) => (
                                <div key={u.id} className="flex justify-between items-center bg-slate-800/80 p-3 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="bg-violet-600">{u.name.charAt(0).toUpperCase()}</Avatar>
                                        <span className="font-bold text-lg">{u.name} {u.id === myId ? '(Sen)' : ''}</span>
                                    </div>
                                    {u.isHost && <Chip label="HOST" size="small" color="warning" variant="outlined" />}
                                </div>
                            ))}
                        </div>
                    </div>

                    {gameState.users.length < 2 ? (
                        <p className="text-red-400 animate-pulse font-medium">Oynamak için en az 2 kişi gerekli!</p>
                    ) : (
                        me?.isHost ? (
                            <Button variant="contained" color="secondary" size="large" fullWidth onClick={handleStart} className="py-3 text-lg font-bold rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600">
                                OYUNU BAŞLAT
                            </Button>
                        ) : (
                            <p className="text-slate-500 italic">Host'un başlatması bekleniyor...</p>
                        )
                    )}
                </div>
            </main>
        );
    }

    if (gameState.gameState === "WORD_SELECTION") {
        const targetUser = gameState.users.find((u: User) => u.id === me?.targetId);
        
        return (
            <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 relative">
                <Button variant="outlined" color="inherit" size="small" onClick={handleLeaveRoom} className="absolute top-4 right-4 border-slate-700 text-slate-400">
                    Odadan Ayrıl
                </Button>

                <div className="glass max-w-lg w-full p-8 rounded-3xl text-center shadow-2xl">
                    <h2 className="text-3xl font-bold mb-6 text-cyan-400">Kelime Seçimi</h2>
                    {me?.hasSubmittedWord ? (
                        <div className="py-8">
                            <p className="text-xl mb-4">Kelimeyi gönderdin!</p>
                            <p className="text-slate-400 animate-pulse">Diğer oyuncuların kelimelerini seçmesi bekleniyor...</p>
                        </div>
                    ) : (
                        <div className="space-y-6 text-left">
                            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                <p className="text-slate-400 text-sm mb-1">Şu oyuncu için bir kelime/futbolcu belirle:</p>
                                <p className="text-2xl font-bold text-white">{targetUser?.name}</p>
                            </div>
                            <TextField 
                                fullWidth
                                label="Kafasında ne yazsın?"
                                variant="outlined"
                                value={wordInput}
                                onChange={(e) => setWordInput(e.target.value)}
                                slotProps={{ 
                                    input: { className: "text-white text-lg bg-slate-800" },
                                    inputLabel: { className: "text-slate-400" }
                                }}
                            />
                            <Button variant="contained" color="primary" fullWidth size="large" onClick={handleSetWord} className="py-3">
                                Onayla
                            </Button>
                        </div>
                    )}

                    <div className="mt-8 pt-4 border-t border-slate-700 text-left">
                        <p className="text-sm text-slate-400 mb-2">Durum:</p>
                        <div className="flex flex-wrap gap-2">
                            {gameState.users.map((u: User) => (
                                <Chip key={u.id} label={u.name} color={u.hasSubmittedWord ? "success" : "default"} variant="outlined" />
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-b from-sky-900 to-slate-900 text-white p-4 flex flex-col overflow-hidden relative">
            
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
            
            <div className="absolute top-2 right-4 z-20">
                <Button variant="outlined" color="inherit" size="small" onClick={handleLeaveRoom} className="border-slate-700 text-slate-400 text-xs py-1">
                    Odadan Ayrıl
                </Button>
            </div>

            <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col md:flex-row gap-6 relative z-10 mt-6 md:mt-4">
              
                <div className="w-full md:w-1/4 glass p-4 rounded-3xl flex flex-col border border-slate-700/50 h-[300px] md:h-auto">
                
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2 text-yellow-400">
                        <span>📝 Not Defterim</span>
                    </h3>
                    <TextField
                        multiline
                        fullWidth
                        placeholder="Örn: İspanya'da oynadı. Forvet değil..."
                        value={notepad}
                        onChange={e => setNotepad(e.target.value)}
                        variant="outlined"
                        className="flex-1 bg-yellow-900/10 rounded-xl"
                        slotProps={{
                            input: { className: "text-slate-300 h-full items-start p-3", style: { height: '100%' } }
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': { borderColor: 'rgba(234, 179, 8, 0.2)' },
                                '&:hover fieldset': { borderColor: 'rgba(234, 179, 8, 0.4)' },
                            }
                        }}
                    />
                </div>

                <div className="flex-1 glass rounded-3xl p-6 flex flex-col border border-slate-700/50">
                    
                    <div className="flex justify-between items-center mb-6 bg-slate-800/50 p-4 rounded-2xl">
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-widest">Sıra Kimde</p>
                            <p className={`text-xl font-bold ${isMyTurn ? 'text-green-400 animate-pulse' : 'text-white'}`}>
                                {isMyTurn ? "SENİN SIRAN!" : `${currentTurnUser?.name} soruyor...`}
                            </p>
                        </div>
                        <div className={`text-3xl font-black rounded-xl px-4 py-2 border-2 ${isMyTurn ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-slate-600 text-slate-300'}`}>
                            {gameState.turnTimeLeft}s
                        </div>
                    </div>

                    <div className="flex-1 flex flex-wrap justify-center items-center gap-8 md:gap-12 py-8 overflow-y-auto">
                        {gameState.users.map((u: User) => {
                            const isMe = u.id === myId;
                            const isWinner = gameState.winners.includes(u.id);
                            
                            return (
                                <div key={u.id} className={`flex flex-col items-center transition-all ${u.id === gameState.currentTurnUserId ? 'scale-110' : 'opacity-80'}`}>
                                    {!isWinner && (
                                        <div className={`mb-3 px-4 py-2 rounded-lg border shadow-lg font-bold text-center max-w-[120px] break-words
                                            ${isMe ? 'bg-slate-800 border-slate-600 text-slate-400' : 'bg-yellow-100 border-yellow-400 text-black transform -rotate-2'}`}>
                                            {isMe && gameState.gameState !== "ROUND_END" ? (
                                                <span className="flex items-center justify-center gap-1"><HelpIcon fontSize="small" /> KİMİM BEN?</span>
                                            ) : (
                                                u.assignedWord
                                            )}
                                        </div>
                                    )}
                                    {isWinner && (
                                        <div className="mb-3 px-3 py-1 rounded-full bg-green-500/20 border border-green-500 text-green-400 text-xs font-bold shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                                            BİLDİ!
                                        </div>
                                    )}

                                    <div className={`relative ${u.id === gameState.currentTurnUserId ? 'ring-4 ring-green-400 ring-offset-4 ring-offset-slate-900 rounded-full' : ''}`}>
                                        <Avatar className={`w-20 h-20 md:w-24 md:h-24 border-2 ${isWinner ? 'border-green-500 opacity-50' : 'border-slate-400'}`}>
                                            <PersonIcon fontSize="large" />
                                        </Avatar>
                                    </div>
                                    <span className="mt-2 font-bold text-sm bg-black/50 px-3 py-1 rounded-full">{u.name}</span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-4 bg-slate-900/50 rounded-2xl h-40 flex flex-col">
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            {gameState.chatHistory.map((msg: any, i: number) => (
                                <div key={i} className={`text-sm ${msg.system ? 'text-cyan-400 text-center italic my-2' : ''}`}>
                                    {!msg.system && <strong className="text-violet-400">{msg.name}: </strong>}
                                    <span className={msg.system ? 'font-bold' : 'text-slate-200'}>{msg.message}</span>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>
                        <form onSubmit={handleChat} className="p-2 border-t border-slate-700 flex gap-2">
                            <TextField 
                                fullWidth 
                                size="small"
                                placeholder={me?.status === 'playing' ? "Soru sor veya cevapla..." : "İzleyici sohbeti..."}
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                slotProps={{ input: { className: "text-white bg-slate-800" } }}
                            />
                            <IconButton type="submit" color="primary" className="bg-violet-600 hover:bg-violet-500 text-white rounded-lg px-4">
                                <SendIcon />
                            </IconButton>
                        </form>
                    </div>

                </div>

                <div className="w-full md:w-1/4 flex flex-col gap-4">
                    {me?.status === 'playing' && gameState.gameState === "PLAYING" && (
                        <div className="glass p-6 rounded-3xl flex flex-col justify-center items-center gap-6 border border-slate-700/50">
                            <Button 
                                variant="outlined" 
                                color="warning" 
                                size="large" 
                                fullWidth 
                                startIcon={<SkipNextIcon />}
                                onClick={handleSkip}
                                disabled={!isMyTurn}
                                className={`py-4 rounded-xl border-2 ${isMyTurn ? 'hover:bg-warning-main/10' : 'opacity-50'}`}
                            >
                                Turu Geç
                            </Button>
                            
                            <Button 
                                variant="contained" 
                                color="success" 
                                size="large" 
                                fullWidth 
                                onClick={() => setGuessDialogOpen(true)}
                                className="py-4 rounded-xl text-lg font-bold shadow-lg shadow-green-500/20"
                            >
                                TAHMİN ET
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={guessDialogOpen} onClose={() => setGuessDialogOpen(false)} PaperProps={{ className: "bg-slate-800 text-white rounded-2xl min-w-[300px]" }}>
                <DialogTitle className="text-center font-bold">Ben Kimim?</DialogTitle>
                <DialogContent>
                    <p className="text-slate-400 mb-4 text-sm text-center">Eğer yanlış bilirsen turunu kaybedersin!</p>
                    <TextField 
                        autoFocus
                        fullWidth
                        label="Tahminin"
                        variant="outlined"
                        value={guessInput}
                        onChange={e => setGuessInput(e.target.value)}
                        slotProps={{ 
                            input: { className: "text-white" },
                            inputLabel: { className: "text-slate-400" }
                        }}
                    />
                </DialogContent>
                <DialogActions className="p-4 pt-0">
                    <Button onClick={() => setGuessDialogOpen(false)} color="inherit">İptal</Button>
                    <Button onClick={handleGuess} variant="contained" color="success" className="px-6 font-bold">Dene</Button>
                </DialogActions>
            </Dialog>

            {gameState.gameState === "ROUND_END" && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="glass max-w-md w-full p-8 rounded-3xl text-center border-2 border-slate-600 animate-fade-in-up">
                        <h1 className="text-5xl font-black mb-4 text-cyan-400">OYUN BİTTİ!</h1>
                        <div className="space-y-4 mb-8">
                            <p className="text-xl text-slate-300 border-b border-slate-700 pb-2">Sonuçlar</p>
                            {gameState.users.map((u: User, i: number) => (
                                <div key={u.id} className="flex justify-between items-center text-lg">
                                    <span className="font-bold">{i + 1}. {u.name}</span>
                                    {gameState.winners.includes(u.id) ? (
                                        <span className="text-green-400 font-bold">Bildin: {u.assignedWord}</span>
                                    ) : (
                                        <span className="text-red-400">Bilemedin: {u.assignedWord}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                        {me?.isHost && (
                            <Button variant="contained" color="primary" fullWidth size="large" onClick={handleStart} className="py-3 rounded-xl">
                                Yeniden Başlat
                            </Button>
                        )}
                        <Button variant="outlined" color="inherit" fullWidth onClick={handleLeaveRoom} className="mt-4 border-slate-600 text-slate-300">
                            Lobiden Ayrıl
                        </Button>
                    </div>
                </div>
            )}
        </main>
    );
}
