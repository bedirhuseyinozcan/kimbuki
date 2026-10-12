import React from "react";
import { Button, CircularProgress } from "@mui/material";
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import { motion } from "framer-motion";
import { useGameContext } from "@/context/GameContext";

interface ActionMenuProps {
    isActionsOpen: boolean;
    onToggle: () => void;
    onOpenQuestionDialog: () => void;
    onOpenGuessDialog: () => void;
    onOpenJokerDialog: () => void;
    isMyTurn?: boolean;
    currentRound?: number;
    isRussianRoulette?: boolean;
    hasActiveQuestion?: boolean;
    questionsAskedThisTurn?: number;
    extraQuestions?: number;
    hasJoker?: boolean;
    hasUsedJoker?: boolean;
    hasObjectionUsed?: boolean;
    onSkip?: () => void;
    onStartObjection?: () => void;
}

export default function ActionMenu(props: ActionMenuProps) {
    const ctx = useGameContext();

    const isMyTurn = props.isMyTurn ?? ctx.isMyTurn;
    const currentRound = props.currentRound ?? (ctx.gameState?.roundCount || 1);
    const isRussianRoulette = props.isRussianRoulette ?? !!ctx.me?.russianRouletteActive;
    const hasActiveQuestion = props.hasActiveQuestion ?? !!ctx.gameState?.activeQuestion;
    const questionsAskedThisTurn = props.questionsAskedThisTurn ?? (ctx.me?.questionsAskedThisTurn ?? 0);
    const extraQuestions = props.extraQuestions ?? (ctx.me?.extraQuestions ?? 0);
    const hasJoker = props.hasJoker ?? (ctx.me?.joker !== undefined && ctx.me?.joker !== null);
    const hasUsedJoker = props.hasUsedJoker ?? !!ctx.me?.hasUsedJoker;
    const hasObjectionUsed = props.hasObjectionUsed ?? !!ctx.gameState?.hasObjectionUsed;
    const onSkip = props.onSkip ?? ctx.actions.skip;
    const onStartObjection = props.onStartObjection ?? ctx.actions.startObjection;
    const isSubmitting = ctx.isSubmitting;

    const {
        isActionsOpen,
        onToggle,
        onOpenQuestionDialog,
        onOpenGuessDialog,
        onOpenJokerDialog
    } = props;

    return (
        <div className="order-1 md:order-3 w-full md:w-1/4 md:max-w-[400px] flex flex-col gap-3 pointer-events-auto z-40">
            <div className="glass rounded-2xl flex flex-col border border-slate-700/50 shadow-xl bg-slate-900/60 backdrop-blur-lg overflow-hidden transition-all duration-300">
                <div onClick={onToggle} className="p-3 md:hidden flex justify-between items-center cursor-pointer border-b border-slate-700/50 bg-slate-800/80">
                    <span className="font-bold text-sm text-green-400 flex items-center gap-2">⚡ Aksiyonlar</span>
                    <span className="text-xs bg-slate-700 px-2 py-1 rounded-lg text-slate-300">{isActionsOpen ? '▼ Gizle' : '▲ Aç'}</span>
                </div>

                <div className={`p-4 flex-col justify-center items-center gap-3 ${isActionsOpen ? 'flex' : 'hidden md:flex'}`}>
                    <motion.div whileHover={{ scale: isMyTurn && !isSubmitting ? 1.05 : 1 }} whileTap={{ scale: isMyTurn && !isSubmitting ? 0.95 : 1 }} className="w-full">
                        <Button 
                            variant="contained" 
                            color="info" 
                            size="medium" 
                            fullWidth 
                            startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <QuestionAnswerIcon />} 
                            onClick={onOpenQuestionDialog} 
                            disabled={!isMyTurn || (questionsAskedThisTurn >= 1 && extraQuestions <= 0) || hasActiveQuestion || isRussianRoulette || isSubmitting} 
                            className={`py-3 rounded-xl border-2 font-bold ${isMyTurn && !hasActiveQuestion && !isRussianRoulette && !isSubmitting ? 'bg-cyan-600 shadow-lg shadow-cyan-500/30' : 'opacity-50'}`}
                        >
                            Soru Sor & Oylat
                        </Button>
                    </motion.div>

                    <div className="w-full h-px bg-slate-700 my-2"></div>

                    <motion.div whileHover={{ scale: isMyTurn && !isSubmitting ? 1.05 : 1 }} whileTap={{ scale: isMyTurn && !isSubmitting ? 0.95 : 1 }} className="w-full">
                        <Button 
                            variant="contained" 
                            color="success" 
                            size="medium" 
                            fullWidth 
                            startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : undefined}
                            onClick={onOpenGuessDialog} 
                            disabled={!isMyTurn || isSubmitting} 
                            className={`py-3 rounded-xl text-lg font-bold shadow-lg shadow-green-500/20 ${!isMyTurn || isSubmitting ? 'opacity-50' : ''}`}
                        >
                            TAHMİN ET
                        </Button>
                    </motion.div>

                    <motion.div whileHover={{ scale: isMyTurn && !isSubmitting ? 1.05 : 1 }} whileTap={{ scale: isMyTurn && !isSubmitting ? 0.95 : 1 }} className="w-full">
                        <Button 
                            variant="outlined" 
                            color="warning" 
                            size="medium" 
                            fullWidth 
                            startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <SkipNextIcon />} 
                            onClick={onSkip} 
                            disabled={!isMyTurn || isRussianRoulette || isSubmitting} 
                            className={`py-3 rounded-xl border-2 ${isMyTurn && !isRussianRoulette && !isSubmitting ? 'hover:bg-warning-main/10' : 'opacity-50'}`}
                        >
                            Turu Geç
                        </Button>
                    </motion.div>

                    {hasJoker && !hasUsedJoker && (
                        <motion.div whileHover={{ scale: isMyTurn && !isSubmitting ? 1.05 : 1 }} whileTap={{ scale: isMyTurn && !isSubmitting ? 0.95 : 1 }} className="w-full mt-2">
                            <Button 
                                variant="contained" 
                                color="secondary" 
                                size="medium" 
                                fullWidth 
                                startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : undefined}
                                onClick={onOpenJokerDialog} 
                                disabled={currentRound < 3 || isRussianRoulette || !isMyTurn || isSubmitting} 
                                className={`py-3 rounded-xl border-2 font-bold ${currentRound >= 3 && !isRussianRoulette && isMyTurn && !isSubmitting ? 'bg-fuchsia-600 shadow-[0_0_15px_rgba(192,38,211,0.5)]' : 'opacity-50'}`}
                            >
                                {currentRound < 3 ? '🃏 Joker (3. Turda Açılır)' : '🃏 Joker Kullan'}
                            </Button>
                        </motion.div>
                    )}

                    <motion.div whileHover={{ scale: !hasObjectionUsed && !isSubmitting ? 1.05 : 1 }} whileTap={{ scale: !hasObjectionUsed && !isSubmitting ? 0.95 : 1 }} className="w-full mt-4">
                        <Button 
                            variant="outlined" 
                            color="error" 
                            size="medium" 
                            fullWidth 
                            startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : undefined}
                            onClick={onStartObjection} 
                            disabled={hasObjectionUsed || isRussianRoulette || isSubmitting} 
                            className={`py-2 rounded-xl border-2 font-bold ${!hasObjectionUsed && !isRussianRoulette && !isSubmitting ? 'border-red-500/80 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:bg-red-500/20' : 'opacity-50'}`}
                        >
                            🚨 ŞİKEYE İTİRAZ ET {hasObjectionUsed && '(Kullanıldı)'}
                        </Button>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
