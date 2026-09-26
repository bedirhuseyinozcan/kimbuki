import React, { useEffect, useState, useRef } from "react";
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Avatar, IconButton, Chip, MenuItem } from "@mui/material";
import SendIcon from '@mui/icons-material/Send';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import HelpIcon from '@mui/icons-material/Help';
import PersonIcon from '@mui/icons-material/Person';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import MicIcon from '@mui/icons-material/Mic';
import SettingsIcon from '@mui/icons-material/Settings';
import AudioSettingsDialog from './AudioSettingsDialog';
import MicOffIcon from '@mui/icons-material/MicOff';
import { User, GameState, AVATARS } from "./types";
import { playTurnSound, playWinSound } from "@/utils/audio";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import Scene3D from "./Scene3D";

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
    onAskQuestion: (q: string) => void;
    onSubmitVote: (v: string) => void;
    onUseJoker: (payload: any) => void;
    onToggleVoice: (enabled: boolean) => void;
    onStartObjection: () => void;
    onVoteObjection: (vote: boolean) => void;
    headRotations: { [key: string]: { pitch: number, yaw: number } };
    onHeadRotation: (pitch: number, yaw: number) => void;
}

export default function GameScene({
    gameState, me, myId,
    chatInput, setChatInput, handleChat,
    notepad, setNotepad,
    handleSkip,
    guessInput, setGuessInput, handleGuess,
    guessDialogOpen, setGuessDialogOpen,
    onLeaveRoom,
    onAskQuestion, onSubmitVote,
    onUseJoker, onToggleVoice,
    onStartObjection, onVoteObjection,
    headRotations, onHeadRotation
}: GameSceneProps) {
    const isMyTurn = gameState.currentTurnUserId === myId;
    const currentTurnUser = gameState.users.find((u: User) => u.id === gameState.currentTurnUserId);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const [timeLeft, setTimeLeft] = useState(0);
    const [questionTimeLeft, setQuestionTimeLeft] = useState(0);
    const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
    const [questionInput, setQuestionInput] = useState("");
    const [activeBubbles, setActiveBubbles] = useState<{[key:string]: string}>({});

    const [jokerDialogOpen, setJokerDialogOpen] = useState(false);
    const [jokerTarget, setJokerTarget] = useState("");
    const [jokerWord, setJokerWord] = useState("");
    const [isNotepadOpen, setIsNotepadOpen] = useState(true);
    const [audioSettingsOpen, setAudioSettingsOpen] = useState(false);

    const handleUseJokerSubmit = () => {
        onUseJoker({ targetId: jokerTarget, newWord: jokerWord });
        setJokerDialogOpen(false);
        setJokerTarget("");
        setJokerWord("");
    };

    useEffect(() => {
        if (!gameState.turnEndsAt) {
            setTimeLeft(0);
            return;
        }
        
        if (gameState.activeQuestion) {
            const remaining = Math.max(0, Math.floor((gameState.turnEndsAt - Date.now()) / 1000));
            setTimeLeft(remaining);
            return; 
        }

        const updateTimer = () => {
            const remaining = Math.max(0, Math.floor((gameState.turnEndsAt! - Date.now()) / 1000));
            setTimeLeft(remaining);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 500);
        return () => clearInterval(interval);
    }, [gameState.turnEndsAt, gameState.activeQuestion]);

    useEffect(() => {
        if (!gameState.activeQuestion?.endTime) {
            setQuestionTimeLeft(0);
            return;
        }
        
        const updateQTimer = () => {
            const remaining = Math.max(0, Math.floor((gameState.activeQuestion!.endTime! - Date.now()) / 1000));
            setQuestionTimeLeft(remaining);
        };

        updateQTimer();
        const interval = setInterval(updateQTimer, 500);
        return () => clearInterval(interval);
    }, [gameState.activeQuestion?.endTime]);

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
            
            if (gameState.chatHistory.length > 0) {
                const lastMsg = gameState.chatHistory[gameState.chatHistory.length - 1];
                if (!lastMsg.system && lastMsg.userId) {
                    setActiveBubbles(prev => ({ ...prev, [lastMsg.userId]: lastMsg.message }));
                    setTimeout(() => {
                        setActiveBubbles(prev => {
                            const next = { ...prev };
                            if (next[lastMsg.userId] === lastMsg.message) {
                                delete next[lastMsg.userId];
                            }
                            return next;
                        });
                    }, 4000);
                }
            }
        }
    }, [gameState?.chatHistory]);

    const handleAsk = () => {
        if (!questionInput.trim()) return;
        onAskQuestion(questionInput);
        setQuestionInput("");
        setQuestionDialogOpen(false);
    };

    return (
        <main className="min-h-screen text-white p-4 flex flex-col overflow-hidden relative">
            
            <div className="fixed inset-0 z-0 pointer-events-auto bg-slate-900">
                <Scene3D 
                    gameState={gameState} 
                    myId={myId} 
                    activeBubbles={activeBubbles} 
                    headRotations={headRotations}
                    onHeadRotation={onHeadRotation}
                />
            </div>
            
            <div className="absolute bottom-6 right-6 z-20 pointer-events-none flex flex-col items-end">
                <div className="flex gap-1 bg-black/60 px-4 py-2 rounded-full border border-slate-700/50">
                    {[...Array(3)].map((_, i) => (
                        <span key={i} className='drop-shadow-md text-lg'>{i < (me?.lives ?? 3) ? '❤️' : '🖤'}</span>
                    ))}
                </div>
            </div>

            <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 pointer-events-auto">
                <div className="flex gap-2">
                    {gameState.category && (
                        <Chip label={`Kategori: ${gameState.category}`} color="secondary" className="font-bold border border-slate-700 bg-slate-800/80 backdrop-blur-md" />
                    )}
                    {gameState.isBettingEnabled && (
                        <Chip label={`💰 BAHİSLİ OYUN: Kazanana ${(gameState.betAmount || 50) * 2} Altın`} className="font-bold border border-yellow-500/50 bg-yellow-900/80 text-yellow-400 backdrop-blur-md" />
                    )}
                </div>

            </div>

            <div className="absolute top-4 right-4 z-20 pointer-events-auto flex gap-3 items-center">
                <button 
                    onClick={() => onToggleVoice(!me?.isVoiceEnabled)}
                    className={`flex items-center justify-center p-1.5 rounded-full border backdrop-blur-md transition-colors ${me?.isVoiceEnabled ? 'border-green-500/80 bg-green-500/40 text-white hover:bg-green-500/60' : 'border-red-500/80 bg-red-500/40 text-white hover:bg-red-500/60'}`}
                >
                    {me?.isVoiceEnabled ? <MicIcon fontSize="small" /> : <MicOffIcon fontSize="small" />}
                </button>
                <button onClick={() => setAudioSettingsOpen(true)} className="flex items-center justify-center p-1.5 rounded-full border border-slate-600/80 bg-slate-700/40 text-slate-300 hover:bg-slate-600/60 backdrop-blur-md transition-colors"><SettingsIcon fontSize="small" /></button>
                <Button variant="outlined" color="inherit" size="small" onClick={onLeaveRoom} className="border-slate-700 text-slate-400 bg-slate-800/80 backdrop-blur-md text-xs py-1 hover:bg-red-500/20 hover:text-red-400">
                    Odadan Ayrıl
                </Button>
            </div>

            <div className="w-full h-full flex-1 flex flex-col md:flex-row gap-6 relative z-10 mt-12 md:mt-10 px-2 md:px-6 pointer-events-none">
                
                <div className={`w-full md:w-1/4 self-start glass p-3 rounded-2xl flex flex-col border border-slate-700/50 pointer-events-auto shadow-2xl bg-slate-900/60 backdrop-blur-lg transition-all duration-300 ${isNotepadOpen ? 'h-[250px] md:h-[400px]' : 'h-auto'}`}>
                    <h3 
                        className="font-bold text-lg flex items-center justify-between gap-2 text-yellow-400 cursor-pointer select-none hover:text-yellow-300"
                        onClick={() => setIsNotepadOpen(!isNotepadOpen)}
                    >
                        <span className="flex items-center gap-2">📝 Not Defterim</span>
                        <span className="text-sm bg-slate-800/80 px-2 py-1 rounded-lg">{isNotepadOpen ? '▲ Gizle' : '▼ Aç'}</span>
                    </h3>
                    {isNotepadOpen && (
                        <textarea
                            placeholder="Örn: Gerçek bir insan mı? Yaşıyor mu?..."
                            value={notepad}
                            onChange={e => setNotepad(e.target.value)}
                            spellCheck="false"
                            className="flex-1 w-full bg-yellow-900/20 rounded-xl text-slate-200 p-3 mt-2 border border-yellow-500/30 focus:border-yellow-500/60 outline-none resize-none min-h-0 custom-scrollbar"
                        />
                    )}
                    
                    {me?.joker !== undefined && me?.joker !== null && (
                        <div className={`mt-4 p-3 rounded-xl border ${me.hasUsedJoker ? 'bg-slate-800/50 border-slate-700/50 opacity-60' : 'bg-fuchsia-900/30 border-fuchsia-500/30'}`}>
                            <h4 className={`font-bold text-sm flex items-center gap-1 mb-1 ${me.hasUsedJoker ? 'text-slate-400' : 'text-fuchsia-400'}`}>
                                🃏 Senin Jokerin {me.hasUsedJoker && <span className="text-red-400 text-xs ml-auto">(Kullanıldı)</span>}
                            </h4>
                            <p className="text-xs text-slate-300">
                                {me.joker === 0 && "Sıra sendeyken sürene +1 Dakika ekler."}
                                {me.joker === 1 && "Seçtiğin bir oyuncunun kelimesini değiştirir."}
                                {me.joker === 2 && "Sana ekstra 3 soru sorma hakkı verir."}
                                {me.joker === 3 && "Kendi kelimenden rastgele 1 harfi açar."}
                                {me.joker === 4 && "Seçtiğin bir oyuncuyu 2 tur susturur."}
                            </p>
                        </div>
                    )}

                    {gameState.resolvedQuestionsThisTurn && gameState.resolvedQuestionsThisTurn.length > 0 && (
                        <div className="mt-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar max-h-[200px] pr-2">
                            {gameState.resolvedQuestionsThisTurn.map((q, index) => (
                                <div key={index} className="p-3 rounded-xl border bg-cyan-900/30 border-cyan-500/30">
                                    <h4 className="font-bold text-sm text-cyan-400 mb-1">
                                        {index + 1}. Soru
                                    </h4>
                                    <p className="text-sm font-bold text-slate-200 mb-2 break-words break-all">"{q.question}"</p>
                                    <div className="flex gap-2 text-xs flex-wrap">
                                        {Object.entries(q.votes).map(([voterId, vote]) => {
                                            const voter = gameState.users.find(u => u.id === voterId);
                                            if (!voter) return null;
                                            const voteColor = vote === 'yes' ? 'text-green-400' : vote === 'no' ? 'text-red-400' : 'text-yellow-400';
                                            const voteText = vote === 'yes' ? 'Evet' : vote === 'no' ? 'Hayır' : 'Bazen';
                                            return (
                                                <div key={voterId} className="bg-slate-800/80 px-2 py-1 rounded border border-slate-700">
                                                    <span className="text-slate-400 mr-1">{voter.name}:</span>
                                                    <span className={`font-bold ${voteColor}`}>{voteText}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex-1 flex flex-col relative justify-between">
                    
                    <AnimatePresence>
                        {gameState.activeQuestion && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.8, y: "-50%", x: "-50%" }}
                                animate={{ opacity: 1, scale: 1, y: "-50%", x: "-50%" }}
                                exit={{ opacity: 0, scale: 0.8, y: "-50%", x: "-50%" }}
                                className="absolute top-1/2 left-1/2 z-50 glass p-6 rounded-3xl border border-slate-600 shadow-[0_0_50px_rgba(0,0,0,0.8)] text-center w-[95%] max-w-lg backdrop-blur-2xl bg-slate-900/90 pointer-events-auto"
                            >
                                <div className="absolute -top-4 -right-4 bg-red-500 text-white font-black rounded-full w-12 h-12 flex items-center justify-center border-4 border-slate-900 shadow-xl animate-pulse">
                                    {questionTimeLeft}s
                                </div>
                                <h4 className="text-lg font-bold mb-2 text-cyan-400">
                                    {gameState.users.find((u:User) => u.id === gameState.activeQuestion!.askerId)?.name} soruyor:
                                </h4>
                                <p className="text-3xl font-black mb-8 leading-tight break-words break-all">"{gameState.activeQuestion.question}"</p>
                                
                                {gameState.activeQuestion.askerId !== myId && me?.status === 'playing' ? (
                                    <div className="flex justify-center gap-4">
                                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                            <Button variant={gameState.activeQuestion.votes[myId] === 'yes' ? 'contained' : (gameState.activeQuestion.votes[myId] ? 'outlined' : 'contained')} color="success" size="medium" onClick={() => onSubmitVote("yes")} className="text-xl py-3 px-6 rounded-xl font-black">Evet 👍</Button>
                                        </motion.div>
                                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                            <Button variant={gameState.activeQuestion.votes[myId] === 'no' ? 'contained' : (gameState.activeQuestion.votes[myId] ? 'outlined' : 'contained')} color="error" size="medium" onClick={() => onSubmitVote("no")} className="text-xl py-3 px-6 rounded-xl font-black">Hayır 👎</Button>
                                        </motion.div>
                                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                            <Button variant={gameState.activeQuestion.votes[myId] === 'sometimes' ? 'contained' : (gameState.activeQuestion.votes[myId] ? 'outlined' : 'contained')} color="warning" size="medium" onClick={() => onSubmitVote("sometimes")} className="text-xl py-3 px-6 rounded-xl font-black">Bazen 🤔</Button>
                                        </motion.div>
                                    </div>
                                ) : (
                                    <p className="text-slate-400 animate-pulse text-lg mb-4">Diğer oyuncuların oylaması bekleniyor...</p>
                                )}
                                
                                <div className="mt-6 pt-4 border-t border-slate-700 flex flex-wrap justify-center gap-3">
                                    <AnimatePresence>
                                        {Object.entries(gameState.activeQuestion.votes).map(([voterId, vote]) => (
                                            <motion.div
                                                key={voterId}
                                                initial={{ opacity: 0, y: 20, scale: 0 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                            >
                                                <Chip 
                                                    label={`${gameState.users.find((u:User) => u.id === voterId)?.name}: ${vote === 'yes' ? '👍' : vote === 'no' ? '👎' : '🤔'}`} 
                                                    color={vote === 'yes' ? "success" : vote === 'no' ? "error" : "warning"}
                                                    variant="outlined"
                                                    className="font-bold bg-slate-900"
                                                />
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex justify-between items-center bg-slate-900/70 backdrop-blur-md border border-slate-700/50 p-4 rounded-2xl relative z-10 pointer-events-auto shadow-2xl">
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

                   
                    <div className="flex-1" />

                 
                    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl h-40 focus-within:h-72 transition-all duration-300 flex flex-col z-10 relative pointer-events-auto shadow-2xl">
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar pointer-events-auto">
                            {gameState.chatHistory.map((msg: any, i: number) => (
                                <div key={i} className={`text-sm ${msg.system ? 'text-cyan-400 text-center italic my-2' : ''}`}>
                                    {!msg.system && <strong className="text-violet-400">{msg.name}: </strong>}
                                    <span className={`break-words break-all ${msg.system ? 'font-bold' : 'text-slate-200'}`}>{msg.message}</span>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>
                        <form onSubmit={handleChat} className="p-2 border-t border-slate-700 flex gap-2 pointer-events-auto">
                            <TextField 
                                fullWidth 
                                size="small"
                                slotProps={{ htmlInput: { maxLength: 120 } }}
                                placeholder={me?.status === 'playing' ? "Soru sor veya cevapla..." : "İzleyici sohbeti..."}
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                sx={{
                                    input: { color: 'white' },
                                    '& .MuiOutlinedInput-root': {
                                        '& fieldset': { borderColor: '#475569' },
                                        '&:hover fieldset': { borderColor: '#94a3b8' },
                                        '&.Mui-focused fieldset': { borderColor: '#06b6d4' }
                                    }
                                }}
                            />
                            <IconButton type="submit" color="primary" className="bg-violet-600 hover:bg-violet-500 text-white rounded-lg px-4">
                                <SendIcon />
                            </IconButton>
                        </form>
                    </div>

                </div>

                <div className="w-full md:w-1/4 flex flex-col gap-3">
                    {me?.status === 'playing' && gameState.gameState === "PLAYING" && (
                        <div className="glass p-4 rounded-2xl flex flex-col justify-center items-center gap-3 border border-slate-700/50 pointer-events-auto shadow-xl bg-slate-900/60 backdrop-blur-lg">
                            
                            {me?.hintStr && (
                                <div className="w-full bg-slate-800/80 rounded-xl p-3 text-center border border-slate-600 mb-2 shadow-inner">
                                    <p className="text-xs text-slate-400 uppercase font-bold mb-1">KELİMEN</p>
                                    <p className="text-2xl font-black tracking-[0.3em] text-cyan-400 drop-shadow-md whitespace-pre-wrap">
                                        {me.hintStr.split('').map(c => c === ' ' ? '   ' : c).join(' ')}
                                    </p>
                                </div>
                            )}

                            <motion.div whileHover={{ scale: isMyTurn ? 1.05 : 1 }} whileTap={{ scale: isMyTurn ? 0.95 : 1 }} className="w-full">
                                <Button 
                                    variant="contained" 
                                    color="info" 
                                    size="medium" 
                                    fullWidth 
                                    startIcon={<QuestionAnswerIcon />}
                                    onClick={() => setQuestionDialogOpen(true)}
                                    disabled={!isMyTurn || ((me?.questionsAskedThisTurn ?? 0) >= 1 && (me?.extraQuestions ?? 0) <= 0) || !!gameState.activeQuestion}
                                    className={`py-3 rounded-xl border-2 font-bold ${isMyTurn && !gameState.activeQuestion ? 'bg-cyan-600 shadow-lg shadow-cyan-500/30' : 'opacity-50'}`}
                                >
                                    Soru Sor & Oylat
                                </Button>
                            </motion.div>

                            <div className="w-full h-px bg-slate-700 my-2"></div>

                            <motion.div whileHover={{ scale: isMyTurn ? 1.05 : 1 }} whileTap={{ scale: isMyTurn ? 0.95 : 1 }} className="w-full">
                                <Button 
                                    variant="contained" 
                                    color="success" 
                                    size="medium" 
                                    fullWidth 
                                    onClick={() => setGuessDialogOpen(true)}
                                    disabled={!isMyTurn}
                                    className={`py-3 rounded-xl text-lg font-bold shadow-lg shadow-green-500/20 ${!isMyTurn ? 'opacity-50' : ''}`}
                                >
                                    TAHMİN ET
                                </Button>
                            </motion.div>

                            <motion.div whileHover={{ scale: isMyTurn ? 1.05 : 1 }} whileTap={{ scale: isMyTurn ? 0.95 : 1 }} className="w-full">
                                <Button 
                                    variant="outlined" 
                                    color="warning" 
                                    size="medium" 
                                    fullWidth 
                                    startIcon={<SkipNextIcon />}
                                    onClick={handleSkip}
                                    disabled={!isMyTurn}
                                    className={`py-3 rounded-xl border-2 ${isMyTurn ? 'hover:bg-warning-main/10' : 'opacity-50'}`}
                                >
                                    Turu Geç
                                </Button>
                            </motion.div>

                            {me?.joker !== undefined && me?.joker !== null && !me?.hasUsedJoker && (
                                <motion.div whileHover={{ scale: isMyTurn ? 1.05 : 1 }} whileTap={{ scale: isMyTurn ? 0.95 : 1 }} className="w-full mt-2">
                                    <Button 
                                        variant="contained" 
                                        color="secondary" 
                                        size="medium" 
                                        fullWidth 
                                        onClick={() => setJokerDialogOpen(true)}
                                        disabled={!isMyTurn}
                                        className={`py-3 rounded-xl border-2 font-bold ${isMyTurn ? 'bg-fuchsia-600 shadow-[0_0_15px_rgba(192,38,211,0.5)]' : 'opacity-50'}`}
                                    >
                                        🃏 Joker Kullan
                                    </Button>
                                </motion.div>
                            )}

                            {gameState.isBettingEnabled && (
                                <motion.div whileHover={{ scale: !gameState.hasObjectionUsed ? 1.05 : 1 }} whileTap={{ scale: !gameState.hasObjectionUsed ? 0.95 : 1 }} className="w-full mt-4">
                                    <Button 
                                        variant="outlined" 
                                        color="error" 
                                        size="medium" 
                                        fullWidth 
                                        onClick={onStartObjection}
                                        disabled={gameState.hasObjectionUsed}
                                        className={`py-2 rounded-xl border-2 font-bold ${!gameState.hasObjectionUsed ? 'border-red-500/80 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:bg-red-500/20' : 'opacity-50'}`}
                                    >
                                        🚨 ŞİKEYE İTİRAZ ET {gameState.hasObjectionUsed && '(Kullanıldı)'}
                                    </Button>
                                </motion.div>
                            )}

                        </div>
                    )}
                </div>
            </div>

            <Dialog 
                open={jokerDialogOpen} 
                onClose={() => setJokerDialogOpen(false)} 
                slotProps={{ paper: { className: "!bg-white !text-slate-900 !rounded-2xl min-w-[300px]" } }}
            >
                <DialogTitle className="text-center font-bold text-fuchsia-600">🃏 Özel Yetenek Jokerin</DialogTitle>
                <DialogContent>
                    {me?.joker === 0 && <p className="text-center text-slate-600 mt-2">Şu anki sıranda sürene <strong>1 Dakika</strong> eklersin.</p>}
                    {me?.joker === 1 && (
                        <div className="flex flex-col gap-4 mt-4">
                            <p className="text-sm text-center text-slate-600">Bir oyuncunun kelimesini değiştir.</p>
                            <TextField 
                                select 
                                label="Oyuncu Seç"
                                value={jokerTarget} 
                                onChange={e => setJokerTarget(e.target.value)} 
                            >
                                {gameState.users.filter((u:User) => u.id !== myId).map((u:User) => (
                                    <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                                ))}
                            </TextField>
                            <TextField 
                                label="Yeni Kelime" 
                                value={jokerWord} 
                                onChange={e => setJokerWord(e.target.value)} 
                            />
                        </div>
                    )}
                    {me?.joker === 2 && <p className="text-center text-slate-600 mt-2">Bunu kullandığında <strong>3 ekstra soru</strong> sorma hakkı kazanırsın.</p>}
                    {me?.joker === 3 && <p className="text-center text-slate-600 mt-2">Kendi kelimenin içinden rastgele <strong>1 harfi</strong> açarsın.</p>}
                    {me?.joker === 4 && (
                        <div className="flex flex-col gap-4 mt-4">
                            <p className="text-sm text-center text-slate-600">Bir oyuncuyu 2 tur boyunca sustur.</p>
                            <TextField 
                                select 
                                label="Oyuncu Seç"
                                value={jokerTarget} 
                                onChange={e => setJokerTarget(e.target.value)} 
                            >
                                {gameState.users.filter((u:User) => u.id !== myId).map((u:User) => (
                                    <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                                ))}
                            </TextField>
                        </div>
                    )}
                </DialogContent>
                <DialogActions className="p-4 pt-0 justify-between">
                    <Button onClick={() => setJokerDialogOpen(false)} className="!text-slate-500">İptal</Button>
                    <Button 
                        onClick={handleUseJokerSubmit} 
                        variant="contained" 
                        color="secondary" 
                        className="px-6 font-bold" 
                        disabled={(me?.joker === 1 && (!jokerTarget || !jokerWord)) || (me?.joker === 4 && !jokerTarget) || (me?.joker === 0 && !isMyTurn)}
                    >
                        Kullan
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={guessDialogOpen} onClose={() => setGuessDialogOpen(false)} slotProps={{ paper: { className: "!bg-white !text-slate-900 !rounded-2xl min-w-[300px]" } }}>
                <DialogTitle className="text-center font-bold">Kimin Nesin Sen?</DialogTitle>
                <DialogContent>
                    <p className="text-slate-600 mb-4 text-sm text-center">Yanlış bilirsen 1 canın (❤️) gider. 3 yanlışta elenirsin!</p>
                    <TextField 
                        autoFocus
                        fullWidth
                        label="Tahminin"
                        variant="outlined"
                        value={guessInput}
                        onChange={e => setGuessInput(e.target.value)}
                        onKeyDown={e => { if(e.key === 'Enter') handleGuess(); }}
                    />
                </DialogContent>
                <DialogActions className="p-4 pt-0">
                    <Button onClick={() => setGuessDialogOpen(false)} className="!text-slate-500">İptal</Button>
                    <Button onClick={handleGuess} variant="contained" color="success" className="px-6 font-bold">Dene</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={questionDialogOpen} onClose={() => setQuestionDialogOpen(false)} slotProps={{ paper: { className: "!bg-white !text-slate-900 !rounded-2xl min-w-[300px]" } }}>
                <DialogTitle className="text-center font-bold">Herkes İçin Soru Sor</DialogTitle>
                <DialogContent>
                    <p className="text-slate-600 mb-4 text-sm text-center">Diğer oyuncular bu soruya Evet, Hayır veya Bazen oyu verecek.</p>
                    <TextField 
                        autoFocus
                        fullWidth
                        label="Sorunuz" slotProps={{ htmlInput: { maxLength: 120 } }} placeholder="Örn: Gerçek bir insan mıyım?"
                        variant="outlined"
                        value={questionInput}
                        onChange={e => setQuestionInput(e.target.value)}
                        onKeyDown={e => { 
                            if(e.key === 'Enter') { 
                                e.preventDefault();
                                if (!questionInput.trim()) return;
                                onAskQuestion(questionInput); 
                                setQuestionDialogOpen(false); 
                                setQuestionInput(""); 
                            } 
                        }}
                    />
                </DialogContent>
                <DialogActions className="p-4 pt-0">
                    <Button onClick={() => setQuestionDialogOpen(false)} className="!text-slate-500">İptal</Button>
                    <Button onClick={() => { onAskQuestion(questionInput); setQuestionDialogOpen(false); setQuestionInput(""); }} variant="contained" color="primary" className="px-6 font-bold">Sor</Button>
                </DialogActions>
            </Dialog>
            {gameState.objection && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto">
                    <div className="bg-slate-900 border-2 border-red-500 rounded-3xl p-8 max-w-md w-full text-center shadow-[0_0_50px_rgba(239,68,68,0.3)]">
                        <h2 className="text-3xl font-black text-red-500 mb-2">🚨 ŞİKE İTİRAZI!</h2>
                        <p className="text-xl text-white mb-6">
                            <strong className="text-yellow-400">{gameState.objection.initiator}</strong> oyunda şike yapıldığını düşünüyor! Sence şike var mı?
                        </p>
                        
                        {gameState.objection.votes[myId] !== undefined ? (
                            <p className="text-green-400 font-bold text-xl animate-pulse">Oy verdin, diğerleri bekleniyor...</p>
                        ) : (
                            <div className="flex gap-4 justify-center">
                                <Button variant="contained" color="error" size="medium" onClick={() => onVoteObjection(true)} className="flex-1 py-3 font-bold text-lg">
                                    EVET, ŞİKE VAR!
                                </Button>
                                <Button variant="outlined" color="inherit" size="medium" onClick={() => onVoteObjection(false)} className="flex-1 py-3 font-bold text-lg border-slate-600 text-slate-300">
                                    HAYIR, TEMİZ
                                </Button>
                            </div>
                        )}
                        
                        <div className="mt-6 text-slate-400">
                            İtiraz oylaması devam ediyor... ({Object.keys(gameState.objection.votes).length} oy verildi)
                        </div>
                    </div>
                </div>
            )}
        <AudioSettingsDialog open={audioSettingsOpen} onClose={() => setAudioSettingsOpen(false)} />
        </main>
    );
}
