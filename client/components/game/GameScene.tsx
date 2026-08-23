import React, { useEffect, useState, useRef } from "react";
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Avatar, IconButton } from "@mui/material";
import SendIcon from '@mui/icons-material/Send';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import HelpIcon from '@mui/icons-material/Help';
import PersonIcon from '@mui/icons-material/Person';
import { User, GameState, AVATARS } from "./types";
import { playTurnSound, playWinSound } from "@/utils/audio";
import confetti from "canvas-confetti";

interface GameSceneProps {
    gameState: GameState;
    me: User;
    myId: string;
    chatInput: string;
    setChatInput: (val: string) => void;
    handleChat: (e?: React.FormEvent) => void;
    notepad: string;
    setNotepad: (val: string) => void;
    handleSkip: () => void;
    guessInput: string;
    setGuessInput: (val: string) => void;
    handleGuess: () => void;
    guessDialogOpen: boolean;
    setGuessDialogOpen: (val: boolean) => void;
    onLeaveRoom: () => void;
    onUseHint: () => void;
}

export default function GameScene({
    gameState, me, myId,
    chatInput, setChatInput, handleChat,
    notepad, setNotepad,
    handleSkip,
    guessInput, setGuessInput, handleGuess,
    guessDialogOpen, setGuessDialogOpen,
    onLeaveRoom, onUseHint
}: GameSceneProps) {
    const isMyTurn = gameState.currentTurnUserId === myId;
    const currentTurnUser = gameState.users.find((u: User) => u.id === gameState.currentTurnUserId);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const [timeLeft, setTimeLeft] = useState(0);

    // Client-side timer logic
    useEffect(() => {
        if (!gameState.turnEndsAt) {
            setTimeLeft(0);
            return;
        }
        
        const updateTimer = () => {
            const remaining = Math.max(0, Math.floor((gameState.turnEndsAt! - Date.now()) / 1000));
            setTimeLeft(remaining);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 500);
        return () => clearInterval(interval);
    }, [gameState.turnEndsAt]);

    const previousTurnRef = useRef<string | null>(null);
    const previousWinnersRef = useRef<number>(0);

    useEffect(() => {
        if (gameState.currentTurnUserId && gameState.currentTurnUserId !== previousTurnRef.current) {
            if (gameState.currentTurnUserId === myId) {
                playTurnSound();
            }
            previousTurnRef.current = gameState.currentTurnUserId;
        }

        if (gameState.winners.length > previousWinnersRef.current) {
            playWinSound();
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#22c55e', '#3b82f6', '#a855f7']
            });
            previousWinnersRef.current = gameState.winners.length;
        }
    }, [gameState.currentTurnUserId, gameState.winners, myId]);

    useEffect(() => {
        if (gameState?.chatHistory) {
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [gameState?.chatHistory]);

    return (
        <main className="min-h-screen bg-gradient-to-b from-sky-900 to-slate-900 text-white p-4 flex flex-col overflow-hidden relative">
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
            
            <div className="absolute top-2 right-4 z-20">
                <Button variant="outlined" color="inherit" size="small" onClick={onLeaveRoom} className="border-slate-700 text-slate-400 text-xs py-1">
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
                            {timeLeft}s
                        </div>
                    </div>

                    <div className="flex-1 flex flex-wrap justify-center items-center gap-8 md:gap-12 py-8 overflow-y-auto">
                        {gameState.users.map((u: User) => {
                            const isMe = u.id === myId;
                            const isWinner = gameState.winners.includes(u.id);
                            const userAvatar = AVATARS.find(a => a.id === u.avatar) || AVATARS[0];
                            
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
                                        <Avatar className={`w-20 h-20 md:w-24 md:h-24 border-2 ${isWinner ? 'border-green-500 opacity-50' : 'border-slate-400'} ${userAvatar.color}`}>
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

                            {!me?.hasUsedHint && (
                                <Button 
                                    variant="outlined" 
                                    color="info" 
                                    size="small" 
                                    fullWidth 
                                    onClick={onUseHint}
                                    className="py-2 rounded-xl mt-2 border-slate-600 text-cyan-400"
                                >
                                    💡 İpucu Al (1 Hakkın Var)
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={guessDialogOpen} onClose={() => setGuessDialogOpen(false)} slotProps={{ paper: { className: "bg-slate-800 text-white rounded-2xl min-w-[300px]" } }}>
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
        </main>
    );
}
