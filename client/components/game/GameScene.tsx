import React, { useEffect, useState, useRef } from "react";
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, MenuItem, CircularProgress } from "@mui/material";
import MicIcon from '@mui/icons-material/Mic';
import SettingsIcon from '@mui/icons-material/Settings';
import InfoIcon from '@mui/icons-material/Info';
import AudioSettingsDialog from './AudioSettingsDialog';
import MicOffIcon from '@mui/icons-material/MicOff';
import { User, GameState, JOKERS } from "./types";
import { playTurnSound, playWinSound } from "@/utils/audio";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import Notepad from "./ui/Notepad";
import ChatPanel from "./ui/ChatPanel";
import ActionMenu from "./ui/ActionMenu";
import JokerGuideDialog from './JokerGuideDialog';
import { useGameContext } from "@/context/GameContext";

const Scene3D = dynamic(() => import("./Scene3D"), {
    ssr: false,
    loading: () => (
        <div className="absolute inset-0 w-full h-full z-0 flex items-center justify-center bg-[#111318] text-[#A0A8B8] font-mono text-xs uppercase tracking-wider">
            3D SAHNE YÜKLENİYOR...
        </div>
    ),
});

export interface GameSceneProps {
    gameState?: GameState;
    me?: User;
    myId?: string;
    chatInput?: string;
    setChatInput?: (val: string) => void;
    handleChat?: (e?: React.FormEvent) => void;
    notepad?: string;
    setNotepad?: (val: string) => void;
    handleSkip?: () => void;
    guessInput?: string;
    setGuessInput?: (val: string) => void;
    handleGuess?: () => void;
    guessDialogOpen?: boolean;
    setGuessDialogOpen?: (val: boolean) => void;
    onLeaveRoom?: () => void;
    onAskQuestion?: (q: string) => void;
    onSubmitVote?: (v: string) => void;
    onUseJoker?: (payload: any) => void;
    onToggleVoice?: (enabled: boolean) => void;
    onStartObjection?: () => void;
    onVoteObjection?: (vote: boolean) => void;
    headRotations?: { [key: string]: { pitch: number, yaw: number } };
    onHeadRotation?: (pitch: number, yaw: number) => void;
    taunts?: { [key: string]: { type: string, id: number } };
    onTaunt?: (type: string) => void;
    visualEffects?: any[];
}

export default function GameScene(props: GameSceneProps = {}) {
    const ctx = useGameContext();
    const gameState = props.gameState ?? ctx.gameState;
    const me = props.me ?? ctx.me;
    const myId = props.myId ?? ctx.myId;
    const isMyTurn = ctx.isMyTurn;
    const currentTurnUser = ctx.currentTurnUser;
    const actions = ctx.actions;
    const isSubmitting = ctx.isSubmitting;
    const timeOffset = ctx.timeOffset ?? 0;

    const chatInput = props.chatInput ?? ctx.chatInput;
    const setChatInput = props.setChatInput ?? ctx.setChatInput;
    const handleChat = props.handleChat ?? actions.chat;
    const notepad = props.notepad ?? ctx.notepad;
    const setNotepad = props.setNotepad ?? ctx.setNotepad;
    const handleSkip = props.handleSkip ?? actions.skip;
    const guessInput = props.guessInput ?? ctx.guessInput;
    const setGuessInput = props.setGuessInput ?? ctx.setGuessInput;
    const handleGuess = props.handleGuess ?? actions.guess;
    const guessDialogOpen = props.guessDialogOpen ?? ctx.guessDialogOpen;
    const setGuessDialogOpen = props.setGuessDialogOpen ?? ctx.setGuessDialogOpen;
    const onLeaveRoom = props.onLeaveRoom ?? actions.leaveRoom;
    const onAskQuestion = props.onAskQuestion ?? actions.askQuestion;
    const onSubmitVote = props.onSubmitVote ?? actions.submitVote;
    const onUseJoker = props.onUseJoker ?? actions.useJoker;
    const onToggleVoice = props.onToggleVoice ?? actions.toggleVoice;
    const onStartObjection = props.onStartObjection ?? actions.startObjection;
    const onVoteObjection = props.onVoteObjection ?? actions.voteObjection;
    const headRotations = props.headRotations ?? ctx.headRotations;
    const onHeadRotation = props.onHeadRotation ?? actions.headRotation;
    const taunts = props.taunts ?? ctx.taunts;
    const onTaunt = props.onTaunt ?? actions.taunt;
    const visualEffects = props.visualEffects ?? ctx.visualEffects;
    const chatEndRef = useRef<HTMLDivElement>(null);

    const [timeLeft, setTimeLeft] = useState(0);
    const [questionTimeLeft, setQuestionTimeLeft] = useState(0);
    const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
    const [questionInput, setQuestionInput] = useState("");
    const [activeBubbles, setActiveBubbles] = useState<{[key:string]: { text: string, id: string }}>({});
    const [jokerGuideOpen, setJokerGuideOpen] = useState(false);

    const [jokerDialogOpen, setJokerDialogOpen] = useState(false);
    const [jokerTarget, setJokerTarget] = useState("");
    const [jokerWord, setJokerWord] = useState("");
    const [isNotepadOpen, setIsNotepadOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isActionsOpen, setIsActionsOpen] = useState(false);
    const [audioSettingsOpen, setAudioSettingsOpen] = useState(false);
    const [tauntCooldown, setTauntCooldown] = useState(false);

    const myJokerMeta = JOKERS.find(j => j.id === me?.joker);
    const currentRound = gameState.roundCount || 1;
    const isRussianRoulette = me?.russianRouletteActive;

    const handleTauntClick = (type: string) => {
        if (tauntCooldown) return;
        onTaunt(type);
        setTauntCooldown(true);
        setTimeout(() => setTauntCooldown(false), 2000);
    };

    useEffect(() => {
        if (typeof window !== "undefined" && window.innerWidth > 768) {
            setIsNotepadOpen(true); setIsChatOpen(true); setIsActionsOpen(true);
        }
    }, []);

    const handleToggle = (panel: 'notepad' | 'chat' | 'actions') => {
        const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
        if (panel === 'notepad') {
            setIsNotepadOpen(prev => !prev);
            if (isMobile && !isNotepadOpen) { setIsChatOpen(false); setIsActionsOpen(false); }
        } else if (panel === 'chat') {
            setIsChatOpen(prev => !prev);
            if (isMobile && !isChatOpen) { setIsNotepadOpen(false); setIsActionsOpen(false); }
        } else if (panel === 'actions') {
            setIsActionsOpen(prev => !prev);
            if (isMobile && !isActionsOpen) { setIsNotepadOpen(false); setIsChatOpen(false); }
        }
    };

    const handleUseJokerSubmit = () => {
        const payload: { targetId?: string; newWord?: string } = {};
        if (myJokerMeta?.requiresTarget && jokerTarget) {
            payload.targetId = jokerTarget;
        }
        if (myJokerMeta?.requiresWord && jokerWord.trim()) {
            payload.newWord = jokerWord.trim();
        }
        onUseJoker(payload);
        setJokerDialogOpen(false);
        setJokerTarget("");
        setJokerWord("");
    };

    useEffect(() => {
        if (isRussianRoulette) {
            setGuessDialogOpen(true);
        }
    }, [isRussianRoulette]);

    useEffect(() => {
        if (gameState.activeQuestion) {
            setQuestionDialogOpen(false);
        }
    }, [gameState.activeQuestion]);

    useEffect(() => {
        if (!gameState.turnEndsAt) { setTimeLeft(0); return; }
        const updateTimer = () => {
            const serverTimeNow = Date.now() + timeOffset;
            const remaining = Math.max(0, Math.floor((gameState.turnEndsAt! - serverTimeNow) / 1000));
            setTimeLeft(remaining);
        };
        updateTimer();
        if (gameState.activeQuestion) {
            return; 
        }
        const interval = setInterval(updateTimer, 500);
        return () => clearInterval(interval);
    }, [gameState.turnEndsAt, gameState.activeQuestion, timeOffset]);

    useEffect(() => {
        if (!gameState.activeQuestion?.endTime) { setQuestionTimeLeft(0); return; }
        const updateQTimer = () => {
            const serverTimeNow = Date.now() + timeOffset;
            const remaining = Math.max(0, Math.floor((gameState.activeQuestion!.endTime! - serverTimeNow) / 1000));
            setQuestionTimeLeft(remaining);
        };
        updateQTimer();
        const interval = setInterval(updateQTimer, 500);
        return () => clearInterval(interval);
    }, [gameState.activeQuestion?.endTime, timeOffset]);

    const previousTurnRef = useRef<string | null>(null);
    const previousWinnersRef = useRef<number>(0);

    useEffect(() => {
        if (gameState.currentTurnUserId && gameState.currentTurnUserId !== previousTurnRef.current) {
            if (gameState.currentTurnUserId === myId) playTurnSound();
            previousTurnRef.current = gameState.currentTurnUserId;
        }

        if (gameState.winners.length > previousWinnersRef.current) {
            playWinSound();
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#00E5A3', '#FFBE0B', '#FF5938'] });
            previousWinnersRef.current = gameState.winners.length;
        }
    }, [gameState.currentTurnUserId, gameState.winners, myId]);

    useEffect(() => {
        if (gameState?.chatHistory) {
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
            if (gameState.chatHistory.length > 0) {
                const lastMsg = gameState.chatHistory[gameState.chatHistory.length - 1];
                if (!lastMsg.system && lastMsg.userId) {
                    const bubbleId = Date.now().toString() + Math.random().toString();
                    setActiveBubbles(prev => ({ ...prev, [lastMsg.userId]: { text: lastMsg.message, id: bubbleId } }));
                    setTimeout(() => {
                        setActiveBubbles(prev => {
                            if (prev[lastMsg.userId]?.id === bubbleId) {
                                const next = { ...prev };
                                delete next[lastMsg.userId];
                                return next;
                            }
                            return prev;
                        });
                    }, 4000);
                }
            }
        }
    }, [gameState?.chatHistory]);

    return (
        <main className="min-h-[100dvh] h-[100dvh] text-[#F6F5F2] p-3 md:p-4 flex flex-col overflow-hidden relative">
            
            <div className="fixed inset-0 z-0 pointer-events-auto bg-[#111318]">
                <Scene3D 
                    gameState={gameState} myId={myId} activeBubbles={activeBubbles} 
                    headRotationsRef={ctx.headRotationsRef} onHeadRotation={onHeadRotation} taunts={taunts}
                    visualEffects={visualEffects}
                />
            </div>
            
            {/* Tactile Taunt Keypad (Teenage Engineering OP-1 style buttons) */}
            <div className="absolute left-2 md:left-[calc(25%+2rem)] xl:left-[415px] top-[35%] md:top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 pointer-events-auto">
                {[
                    { type: 'fire', emoji: '🔥', title: 'Sinirli (Alev)', border: 'hover:border-[#FF5938]' },
                    { type: 'party', emoji: '🎉', title: 'Kutlama', border: 'hover:border-[#00E5A3]' },
                    { type: 'laugh', emoji: '😂', title: 'Kahkaha', border: 'hover:border-[#FFBE0B]' },
                    { type: 'cry', emoji: '😭', title: 'Gözyaşı', border: 'hover:border-[#38BDF8]' }
                ].map(t => (
                    <IconButton 
                        key={t.type}
                        onClick={() => handleTauntClick(t.type)} 
                        disabled={tauntCooldown} 
                        title={t.title}
                        className={`!bg-[#1A1D24] !border-2 !border-[#3E4659] ${t.border} !rounded-[4px] !shadow-[3px_3px_0px_#090A0D] !p-2 md:!p-2.5 transition-transform active:translate-y-0.5 ${tauntCooldown ? 'opacity-40' : 'hover:-translate-y-0.5'}`}
                    >
                        <span className="text-2xl md:text-3xl leading-none">{t.emoji}</span>
                    </IconButton>
                ))}
            </div>
            
            {/* Bottom-Right Lives Counter Badge */}
            <div className="absolute bottom-4 right-4 z-20 pointer-events-none flex flex-col items-end">
                <div className="flex items-center gap-2 bg-[#1A1D24] px-3.5 py-1.5 rounded-[4px] border-2 border-[#3E4659] shadow-[3px_3px_0px_#090A0D]">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#A0A8B8]">CAN</span>
                    <div className="flex gap-1">
                        {[...Array(3)].map((_, i) => (
                            <span key={i} className="text-sm">{i < (me?.lives ?? 3) ? '❤️' : '🖤'}</span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top HUD Header Bar */}
            <div className="absolute top-3 inset-x-2 md:inset-x-4 z-20 pointer-events-none flex justify-between items-start gap-2">
                <div className="flex flex-col gap-2 pointer-events-auto items-start shrink min-w-0">
                    {/* Mobile Turn HUD */}
                    <div className="md:hidden flex items-center gap-2.5 bg-[#1A1D24] border-2 border-[#3E4659] rounded-[4px] pr-3.5 p-1 shadow-[3px_3px_0px_#090A0D] max-w-full">
                        <div className={`shrink-0 w-9 h-9 rounded-[2px] flex items-center justify-center font-mono text-sm font-bold border border-[#090A0D] tnum ${
                            isMyTurn ? 'bg-[#00E5A3] text-[#111318]' : 'bg-[#111318] text-[#FFBE0B]'
                        }`}>
                            {timeLeft}s
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="font-mono text-[9px] text-[#A0A8B8] font-bold uppercase tracking-widest leading-none">
                                SIRA KİMDE
                            </span>
                            <span className={`font-display text-xs font-bold uppercase leading-tight truncate mt-0.5 ${
                                isMyTurn ? 'text-[#00E5A3]' : 'text-[#F6F5F2]'
                            }`}>
                                {isMyTurn ? "SENİN SIRAN!" : `${currentTurnUser?.name}`}
                            </span>
                        </div>
                    </div>

                    {/* Match Telemetry Badges */}
                    <div className="flex flex-wrap gap-1.5">
                        <span className="swiss-badge !bg-[#1A1D24] !border-[#3E4659] !text-[#F6F5F2] shadow-[2px_2px_0px_#090A0D] tnum">
                            TUR #{currentRound}
                        </span>
                        {gameState.category && (
                            <span className="swiss-badge !bg-[#1A1D24] !border-[#FFBE0B] !text-[#FFBE0B] shadow-[2px_2px_0px_#090A0D]">
                                {gameState.category}
                            </span>
                        )}
                        {gameState.isBettingEnabled && (
                            <span className="swiss-badge !bg-[#FFBE0B] !border-[#090A0D] !text-[#111318] shadow-[2px_2px_0px_#090A0D]">
                                💰 BAHİSLİ
                            </span>
                        )}
                    </div>
                </div>

                {/* Top-Right Hardware Controls */}
                <div className="flex gap-1.5 md:gap-2 items-center pointer-events-auto shrink-0">
                    <button 
                        onClick={() => setJokerGuideOpen(true)} 
                        title="Joker Rehberi"
                        className="flex items-center justify-center w-9 h-9 rounded-[4px] border-2 border-[#090A0D] bg-[#FF5938] text-white hover:bg-[#FF7457] shadow-[2px_2px_0px_#090A0D] transition-colors cursor-pointer"
                    >
                        <InfoIcon fontSize="small" />
                    </button>
                    <button 
                        onClick={() => onToggleVoice(!me?.isVoiceEnabled)} 
                        title={me?.isVoiceEnabled ? "Mikrofonu Kapat" : "Mikrofonu Aç"}
                        className={`flex items-center justify-center w-9 h-9 rounded-[4px] border-2 border-[#090A0D] shadow-[2px_2px_0px_#090A0D] transition-colors cursor-pointer ${
                            me?.isVoiceEnabled 
                                ? 'bg-[#00E5A3] text-[#111318]' 
                                : 'bg-[#222630] border-[#3E4659] text-[#FF334B]'
                        }`}
                    >
                        {me?.isVoiceEnabled ? <MicIcon fontSize="small" /> : <MicOffIcon fontSize="small" />}
                    </button>
                    <button 
                        onClick={() => setAudioSettingsOpen(true)} 
                        title="Ses Ayarları"
                        className="flex items-center justify-center w-9 h-9 rounded-[4px] border-2 border-[#3E4659] bg-[#1A1D24] text-[#F6F5F2] hover:border-[#FFBE0B] shadow-[2px_2px_0px_#090A0D] transition-colors cursor-pointer"
                    >
                        <SettingsIcon fontSize="small" />
                    </button>
                    <Button 
                        variant="outlined" 
                        size="small" 
                        onClick={onLeaveRoom} 
                        className="swiss-btn-secondary !py-1.5 !px-3 !text-xs !min-w-0 !h-9"
                    >
                        <span className="hidden md:inline">ODADAN AYRIL</span>
                        <span className="md:hidden">AYRIL</span>
                    </Button>
                </div>
            </div>

            {/* 3-Column Swiss HUD Workspace */}
            <div className="w-full h-full flex-1 relative z-10 mt-14 md:mt-12 px-1 pb-2 md:px-4 md:pb-0 pointer-events-none flex flex-col justify-end gap-2.5 md:flex-row md:gap-5">
                
                <Notepad
                    isNotepadOpen={isNotepadOpen}
                    onToggle={() => handleToggle('notepad')}
                />

                <div className="order-3 md:order-2 w-full md:flex-1 md:w-auto flex flex-col pointer-events-none z-20 md:justify-between">
                    {/* Desktop Center Scoreboard Header */}
                    <div className="hidden md:flex justify-between items-center swiss-panel px-5 py-3.5 relative z-10 pointer-events-auto">
                        <div className="flex items-center gap-3">
                            <span className={`w-3 h-3 rounded-none ${isMyTurn ? 'bg-[#00E5A3] animate-pulse' : 'bg-[#FFBE0B]'}`} />
                            <div>
                                <p className="swiss-label">AKTİF SORGULAMA SIRASI</p>
                                <p className={`font-display text-xl font-bold uppercase tracking-wide ${isMyTurn ? 'text-[#00E5A3]' : 'text-[#F6F5F2]'}`}>
                                    {isMyTurn ? "SENİN SIRAN — HAMLE YAP!" : `${currentTurnUser?.name} SORUYOR...`}
                                </p>
                            </div>
                        </div>
                        <div className={`font-mono text-2xl font-bold rounded-[4px] px-4 py-1.5 border-2 tnum ${
                            isMyTurn 
                                ? 'border-[#090A0D] bg-[#00E5A3] text-[#111318] shadow-[2px_2px_0px_#090A0D]' 
                                : 'border-[#3E4659] bg-[#111318] text-[#FFBE0B]'
                        }`}>
                            {String(timeLeft).padStart(2, '0')}s
                        </div>
                    </div>
                   
                    <div className="hidden md:block flex-1" />
                 
                    <ChatPanel
                        isChatOpen={isChatOpen}
                        onToggle={() => handleToggle('chat')}
                    />
                </div>

                {me?.status === 'playing' && gameState.gameState === "PLAYING" && (
                    <ActionMenu
                        isActionsOpen={isActionsOpen}
                        onToggle={() => handleToggle('actions')}
                        onOpenQuestionDialog={() => setQuestionDialogOpen(true)}
                        onOpenGuessDialog={() => setGuessDialogOpen(true)}
                        onOpenJokerDialog={() => setJokerDialogOpen(true)}
                    />
                )}
            </div>

            {/* Joker Usage Modal */}
            <Dialog 
                open={jokerDialogOpen} 
                onClose={() => { if (!isSubmitting) { setJokerDialogOpen(false); setJokerTarget(""); setJokerWord(""); } }} 
                slotProps={{ 
                    paper: { 
                        className: "!bg-[#1A1D24] !text-[#F6F5F2] !rounded-[6px] !border-2 !border-[#FF5938] !shadow-[8px_8px_0px_#090A0D] min-w-[320px] sm:min-w-[400px]" 
                    } 
                }}
            >
                <DialogTitle className="font-display font-bold uppercase tracking-wider text-xl text-[#FF5938] border-b-2 border-[#2D3342] py-4 px-6">
                    🃏 {myJokerMeta?.name || 'JOKER KULLAN'}
                </DialogTitle>
                <DialogContent className="p-6">
                    <p className="text-[#A0A8B8] text-sm mt-2 leading-relaxed">{myJokerMeta?.desc}</p>
                    
                    <div className="flex flex-col gap-4 mt-6">
                        {myJokerMeta?.requiresTarget && (
                            <div>
                                <label className="swiss-label block mb-2">HEDEF OYUNCU SEÇ</label>
                                <TextField 
                                    select 
                                    fullWidth
                                    size="small"
                                    value={jokerTarget} 
                                    onChange={e => setJokerTarget(e.target.value)} 
                                    disabled={isSubmitting}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            backgroundColor: '#111318',
                                            color: '#F6F5F2',
                                            borderRadius: '4px',
                                            '& fieldset': { borderColor: '#2D3342', borderWidth: '2px' },
                                        },
                                        '.MuiSvgIcon-root': { fill: '#F6F5F2' }
                                    }}
                                >
                                    {gameState.users.filter((u:User) => u.id !== myId && u.status === 'playing').map((u:User) => (
                                        <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                                    ))}
                                </TextField>
                            </div>
                        )}
                        {myJokerMeta?.requiresWord && (
                            <div>
                                <label className="swiss-label block mb-2">
                                    {myJokerMeta.id === 14 ? "SORGULANACAK HARF" : "YENİ KELİME"}
                                </label>
                                <TextField 
                                    fullWidth
                                    size="small"
                                    placeholder={myJokerMeta.id === 14 ? "Tek bir harf girin..." : "Yeni kelimeyi yazın..."} 
                                    value={jokerWord} 
                                    disabled={isSubmitting}
                                    onChange={e => {
                                        if (myJokerMeta.id === 14) {
                                            setJokerWord(e.target.value.substring(0, 1));
                                        } else {
                                            setJokerWord(e.target.value);
                                        }
                                    }}
                                    sx={{
                                        input: { color: '#F6F5F2', fontWeight: 700 },
                                        '& .MuiOutlinedInput-root': {
                                            backgroundColor: '#111318',
                                            borderRadius: '4px',
                                            '& fieldset': { borderColor: '#2D3342', borderWidth: '2px' },
                                        }
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </DialogContent>
                <DialogActions className="px-6 py-4 border-t-2 border-[#2D3342] bg-[#111318] justify-between">
                    <Button 
                        onClick={() => { setJokerDialogOpen(false); setJokerTarget(""); setJokerWord(""); }} 
                        disabled={isSubmitting} 
                        className="swiss-btn-secondary !px-5 !py-2"
                    >
                        İPTAL
                    </Button>
                    <Button 
                        onClick={handleUseJokerSubmit} 
                        variant="contained" 
                        className="swiss-btn-coral !px-6 !py-2" 
                        disabled={isSubmitting || (Boolean(myJokerMeta?.requiresTarget) && !jokerTarget) || (Boolean(myJokerMeta?.requiresWord) && !jokerWord.trim())}
                    >
                        {isSubmitting ? (
                            <span className="flex items-center gap-2">
                                <CircularProgress size={16} color="inherit" />
                                <span>KULLANILIYOR...</span>
                            </span>
                        ) : (
                            "JOKERİ AKTİFLEŞTİR"
                        )}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Identity Guess Modal */}
            <Dialog 
                open={guessDialogOpen || !!isRussianRoulette} 
                onClose={() => !isRussianRoulette && !isSubmitting && setGuessDialogOpen(false)} 
                slotProps={{ 
                    paper: { 
                        className: "!bg-[#1A1D24] !text-[#F6F5F2] !rounded-[6px] !border-2 !border-[#00E5A3] !shadow-[8px_8px_0px_#090A0D] min-w-[320px] sm:min-w-[420px]" 
                    } 
                }}
            >
                <DialogTitle className="font-display font-bold uppercase tracking-wider text-xl border-b-2 border-[#2D3342] py-4 px-6">
                    {isRussianRoulette ? "💀 RUS RULETİ: ZORUNLU TAHMİN!" : "🎯 BEN KİMİM? — TAHMİN ET"}
                </DialogTitle>
                <DialogContent className="p-6">
                    <div className={`p-3 rounded-[4px] border-l-4 font-mono text-xs mb-5 mt-2 ${
                        isRussianRoulette 
                            ? 'bg-[#FF334B]/15 border-[#FF334B] text-[#FF334B]' 
                            : 'bg-[#FFBE0B]/15 border-[#FFBE0B] text-[#FFBE0B]'
                    }`}>
                        {isRussianRoulette 
                            ? "DİKKAT: Yanlış tahmin edersen masadan anında elenirsin!" 
                            : "BİLGİ: Yanlış tahminde 1 can (❤️) kaybedersin. 3 hatada elenirsin."}
                    </div>
                    <label className="swiss-label block mb-2">ALNINDAKİ KİMLİK / KELİME</label>
                    <TextField 
                        autoFocus 
                        fullWidth 
                        placeholder="Tahminini buraya yaz..." 
                        variant="outlined" 
                        value={guessInput} 
                        onChange={e => setGuessInput(e.target.value)}
                        disabled={isSubmitting}
                        onKeyDown={e => { if(e.key === 'Enter' && !isSubmitting) handleGuess(); }}
                        sx={{
                            input: { color: '#111318', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.125rem' },
                            '& .MuiOutlinedInput-root': {
                                backgroundColor: '#F4F1EA',
                                borderRadius: '4px',
                                '& fieldset': { borderColor: '#090A0D', borderWidth: '2px' },
                            }
                        }}
                    />
                </DialogContent>
                <DialogActions className="px-6 py-4 border-t-2 border-[#2D3342] bg-[#111318] justify-between">
                    {!isRussianRoulette && (
                        <Button onClick={() => setGuessDialogOpen(false)} disabled={isSubmitting} className="swiss-btn-secondary !px-5 !py-2">
                            İPTAL
                        </Button>
                    )}
                    <Button 
                        onClick={() => handleGuess()} 
                        variant="contained" 
                        className="swiss-btn-mint !px-6 !py-2 ml-auto"
                        disabled={isSubmitting || !guessInput.trim()}
                    >
                        {isSubmitting ? "DENENİYOR..." : "TAHMİNİ GÖNDER"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Ask Question to Table Modal */}
            <Dialog 
                open={questionDialogOpen} 
                onClose={() => !isSubmitting && setQuestionDialogOpen(false)} 
                slotProps={{ 
                    paper: { 
                        className: "!bg-[#1A1D24] !text-[#F6F5F2] !rounded-[6px] !border-2 !border-[#FFBE0B] !shadow-[8px_8px_0px_#090A0D] min-w-[320px] sm:min-w-[440px]" 
                    } 
                }}
            >
                <DialogTitle className="font-display font-bold uppercase tracking-wider text-xl border-b-2 border-[#2D3342] py-4 px-6">
                    💬 MASAYA SORU SOR
                </DialogTitle>
                <DialogContent className="p-6">
                    <p className="text-[#A0A8B8] mb-5 mt-2 text-sm">
                        Diğer oyuncular bu soruya <strong className="text-[#00E5A3]">EVET</strong>, <strong className="text-[#FF334B]">HAYIR</strong> veya <strong className="text-[#FFBE0B]">BAZEN</strong> oyu verecek.
                    </p>
                    <label className="swiss-label block mb-2">SORUNUZ (MAKS 120 KARAKTER)</label>
                    <TextField 
                        autoFocus 
                        fullWidth 
                        slotProps={{ htmlInput: { maxLength: 120 } }} 
                        placeholder="Örn: Gerçek bir insan mıyım? Türkiye'de mi yaşıyorum?" 
                        variant="outlined" 
                        value={questionInput} 
                        onChange={e => setQuestionInput(e.target.value)} 
                        disabled={isSubmitting} 
                        onKeyDown={e => { 
                            if(e.key === 'Enter' && !isSubmitting) { 
                                e.preventDefault(); 
                                if (!questionInput.trim()) return; 
                                onAskQuestion(questionInput); 
                                setQuestionInput(""); 
                            } 
                        }}
                        sx={{
                            input: { color: '#F6F5F2', fontWeight: 600 },
                            '& .MuiOutlinedInput-root': {
                                backgroundColor: '#111318',
                                borderRadius: '4px',
                                '& fieldset': { borderColor: '#2D3342', borderWidth: '2px' },
                                '&.Mui-focused fieldset': { borderColor: '#FFBE0B' }
                            }
                        }}
                    />
                </DialogContent>
                <DialogActions className="px-6 py-4 border-t-2 border-[#2D3342] bg-[#111318] justify-between">
                    <Button onClick={() => setQuestionDialogOpen(false)} disabled={isSubmitting} className="swiss-btn-secondary !px-5 !py-2">
                        İPTAL
                    </Button>
                    <Button 
                        onClick={() => { 
                            if (!questionInput.trim() || isSubmitting) return; 
                            onAskQuestion(questionInput); 
                            setQuestionInput(""); 
                        }} 
                        variant="contained" 
                        className="swiss-btn-primary !px-6 !py-2"
                        disabled={isSubmitting || !questionInput.trim()}
                    >
                        {isSubmitting ? "SORULUYOR..." : "MASAYA SOR"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Foul / Objection Tribunal Overlay */}
            {gameState.objection && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090A0D]/85 p-4 pointer-events-auto">
                    <div className="bg-[#1A1D24] border-2 border-[#FF334B] rounded-[6px] p-6 md:p-8 max-w-md w-full text-center shadow-[8px_8px_0px_#090A0D]">
                        <span className="inline-block font-mono text-xs font-bold uppercase px-3 py-1 bg-[#FF334B] text-white rounded-[2px] mb-3">
                            🚨 HAKEM KURULU OYLAMASI
                        </span>
                        <h2 className="font-display text-3xl font-bold uppercase text-[#F6F5F2] mb-2">
                            ŞİKE İTİRAZI!
                        </h2>
                        <p className="text-base text-[#A0A8B8] mb-6">
                            <strong className="text-[#FFBE0B]">{gameState.objection.initiator}</strong> masada kural dışı ipucu veya şike olduğunu iddia ediyor!
                        </p>
                        
                        {gameState.objection.votes[myId] !== undefined ? (
                            <div className="p-3 bg-[#00E5A3]/15 border-2 border-[#00E5A3] rounded-[4px] font-mono text-xs font-bold text-[#00E5A3] uppercase">
                                ✓ OYUNUZ KAYDEDİLDİ — DİĞER OYUNCULAR BEKLENİYOR...
                            </div>
                        ) : (
                            <div className="flex gap-3 justify-center">
                                <Button 
                                    variant="contained" 
                                    onClick={() => onVoteObjection(true)} 
                                    disabled={isSubmitting} 
                                    className="swiss-btn-coral flex-1 !py-3"
                                >
                                    EVET, ŞİKE VAR
                                </Button>
                                <Button 
                                    variant="outlined" 
                                    onClick={() => onVoteObjection(false)} 
                                    disabled={isSubmitting} 
                                    className="swiss-btn-secondary flex-1 !py-3"
                                >
                                    HAYIR, TEMİZ
                                </Button>
                            </div>
                        )}
                        
                        <div className="mt-5 font-mono text-xs text-[#687082] uppercase tnum">
                            TOPLAM OY: {Object.keys(gameState.objection.votes).length} / {gameState.users.length}
                        </div>
                    </div>
                </div>
            )}

            <AudioSettingsDialog open={audioSettingsOpen} onClose={() => setAudioSettingsOpen(false)} />
        
            {/* Live Question Voting Overlay Card */}
            <AnimatePresence>
                {gameState.activeQuestion && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: "-50%", x: "-50%" }} 
                        animate={{ opacity: 1, scale: 1, y: "-50%", x: "-50%" }} 
                        exit={{ opacity: 0, scale: 0.9, y: "-50%", x: "-50%" }} 
                        transition={{ duration: 0.15 }}
                        className="fixed top-1/2 left-1/2 z-[100] bg-[#1A1D24] p-6 md:p-8 rounded-[6px] border-2 border-[#FFBE0B] shadow-[10px_10px_0px_#090A0D] text-center w-[94%] max-w-lg pointer-events-auto"
                    >
                        <div className="flex justify-between items-center border-b-2 border-[#2D3342] pb-3 mb-5">
                            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#FFBE0B]">
                                💬 {gameState.users.find((u:User) => u.id === gameState.activeQuestion!.askerId)?.name} SORUYOR
                            </span>
                            <span className="font-mono text-sm font-bold px-2.5 py-1 bg-[#FF334B] text-white rounded-[2px] border border-[#090A0D] tnum">
                                {questionTimeLeft}s
                            </span>
                        </div>

                        <p className="font-display text-2xl md:text-3xl font-bold mb-6 leading-snug break-words text-[#F6F5F2]">
                            "{gameState.activeQuestion.question}"
                        </p>
                        
                        {gameState.activeQuestion.askerId !== myId && me?.status === 'playing' ? (
                            <div className="grid grid-cols-3 gap-3">
                                <Button 
                                    disabled={isSubmitting}
                                    onClick={() => onSubmitVote("yes")} 
                                    className={`!py-3 !text-sm !font-display !font-bold !rounded-[4px] !border-2 !border-[#090A0D] ${
                                        gameState.activeQuestion.votes[myId] === 'yes' 
                                            ? '!bg-[#00E5A3] !text-[#111318] !shadow-[3px_3px_0px_#090A0D]' 
                                            : '!bg-[#222630] !text-[#00E5A3] !border-[#00E5A3]'
                                    }`}
                                >
                                    👍 EVET
                                </Button>
                                <Button 
                                    disabled={isSubmitting}
                                    onClick={() => onSubmitVote("no")} 
                                    className={`!py-3 !text-sm !font-display !font-bold !rounded-[4px] !border-2 !border-[#090A0D] ${
                                        gameState.activeQuestion.votes[myId] === 'no' 
                                            ? '!bg-[#FF334B] !text-white !shadow-[3px_3px_0px_#090A0D]' 
                                            : '!bg-[#222630] !text-[#FF334B] !border-[#FF334B]'
                                    }`}
                                >
                                    👎 HAYIR
                                </Button>
                                <Button 
                                    disabled={isSubmitting}
                                    onClick={() => onSubmitVote("sometimes")} 
                                    className={`!py-3 !text-sm !font-display !font-bold !rounded-[4px] !border-2 !border-[#090A0D] ${
                                        gameState.activeQuestion.votes[myId] === 'sometimes' 
                                            ? '!bg-[#FFBE0B] !text-[#111318] !shadow-[3px_3px_0px_#090A0D]' 
                                            : '!bg-[#222630] !text-[#FFBE0B] !border-[#FFBE0B]'
                                    }`}
                                >
                                    🤔 BAZEN
                                </Button>
                            </div>
                        ) : (
                            <div className="p-3 bg-[#111318] border border-[#2D3342] rounded-[4px] font-mono text-xs uppercase text-[#A0A8B8]">
                                DİĞER OYUNCULARIN OYLAMASI BEKLENİYOR...
                            </div>
                        )}
                        
                        <div className="mt-5 pt-4 border-t-2 border-[#2D3342] flex flex-wrap justify-center gap-2">
                            <AnimatePresence>
                                {Object.entries(gameState.activeQuestion.votes).map(([voterId, vote]) => (
                                    <motion.div key={voterId} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                                        <span className={`font-mono text-xs font-bold px-2.5 py-1 rounded-[2px] border inline-flex items-center gap-1 ${
                                            vote === 'yes' 
                                                ? 'bg-[#00E5A3]/15 border-[#00E5A3] text-[#00E5A3]' 
                                                : vote === 'no' 
                                                    ? 'bg-[#FF334B]/15 border-[#FF334B] text-[#FF334B]' 
                                                    : 'bg-[#FFBE0B]/15 border-[#FFBE0B] text-[#FFBE0B]'
                                        }`}>
                                            {gameState.users.find((u:User) => u.id === voterId)?.name}: {vote === 'yes' ? 'EVET' : vote === 'no' ? 'HAYIR' : 'BAZEN'}
                                        </span>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <JokerGuideDialog open={jokerGuideOpen} onClose={() => setJokerGuideOpen(false)} />
        </main>
    );
}
