import React from "react";
import { Button } from "@mui/material";
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import { motion } from "framer-motion";

interface ActionMenuProps {
    isMyTurn: boolean;
    currentRound: number;
    isRussianRoulette: boolean;
    hasActiveQuestion: boolean;
    questionsAskedThisTurn: number;
    extraQuestions: number;
    hasJoker: boolean;
    hasUsedJoker: boolean;
    hasObjectionUsed: boolean;
    isActionsOpen: boolean;
    onToggle: () => void;
    onOpenQuestionDialog: () => void;
    onOpenGuessDialog: () => void;
    onSkip: () => void;
    onOpenJokerDialog: () => void;
    onStartObjection: () => void;
}

export default function ActionMenu({
    isMyTurn,
    currentRound,
    isRussianRoulette,
    hasActiveQuestion,
    questionsAskedThisTurn,
    extraQuestions,
    hasJoker,
    hasUsedJoker,
    hasObjectionUsed,
    isActionsOpen,
    onToggle,
    onOpenQuestionDialog,
    onOpenGuessDialog,
    onSkip,
    onOpenJokerDialog,
    onStartObjection
}: ActionMenuProps) {
    return (
        <div className="order-1 md:order-3 w-full md:w-1/4 md:max-w-[400px] flex flex-col gap-3 pointer-events-auto z-40">
            <div className="glass rounded-2xl flex flex-col border border-slate-700/50 shadow-xl bg-slate-900/60 backdrop-blur-lg overflow-hidden transition-all duration-300">
                <div onClick={onToggle} className="p-3 md:hidden flex justify-between items-center cursor-pointer border-b border-slate-700/50 bg-slate-800/80">
                    <span className="font-bold text-sm text-green-400 flex items-center gap-2">⚡ Aksiyonlar</span>
                    <span className="text-xs bg-slate-700 px-2 py-1 rounded-lg text-slate-300">{isActionsOpen ? '▼ Gizle' : '▲ Aç'}</span>
                </div>

                <div className={`p-4 flex-col justify-center items-center gap-3 ${isActionsOpen ? 'flex' : 'hidden md:flex'}`}>
                    <motion.div whileHover={{ scale: isMyTurn ? 1.05 : 1 }} whileTap={{ scale: isMyTurn ? 0.95 : 1 }} className="w-full">
                        <Button 
                            variant="contained" 
                            color="info" 
                            size="medium" 
                            fullWidth 
                            startIcon={<QuestionAnswerIcon />} 
                            onClick={onOpenQuestionDialog} 
                            disabled={!isMyTurn || (questionsAskedThisTurn >= 1 && extraQuestions <= 0) || hasActiveQuestion || isRussianRoulette} 
                            className={`py-3 rounded-xl border-2 font-bold ${isMyTurn && !hasActiveQuestion && !isRussianRoulette ? 'bg-cyan-600 shadow-lg shadow-cyan-500/30' : 'opacity-50'}`}
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
                            onClick={onOpenGuessDialog} 
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
                            onClick={onSkip} 
                            disabled={!isMyTurn || isRussianRoulette} 
                            className={`py-3 rounded-xl border-2 ${isMyTurn && !isRussianRoulette ? 'hover:bg-warning-main/10' : 'opacity-50'}`}
                        >
                            Turu Geç
                        </Button>
                    </motion.div>

                    {hasJoker && !hasUsedJoker && (
                        <motion.div whileHover={{ scale: isMyTurn ? 1.05 : 1 }} whileTap={{ scale: isMyTurn ? 0.95 : 1 }} className="w-full mt-2">
                            <Button 
                                variant="contained" 
                                color="secondary" 
                                size="medium" 
                                fullWidth 
                                onClick={onOpenJokerDialog} 
                                disabled={currentRound < 3 || isRussianRoulette || !isMyTurn} 
                                className={`py-3 rounded-xl border-2 font-bold ${currentRound >= 3 && !isRussianRoulette && isMyTurn ? 'bg-fuchsia-600 shadow-[0_0_15px_rgba(192,38,211,0.5)]' : 'opacity-50'}`}
                            >
                                {currentRound < 3 ? '🃏 Joker (3. Turda Açılır)' : '🃏 Joker Kullan'}
                            </Button>
                        </motion.div>
                    )}

                    <motion.div whileHover={{ scale: !hasObjectionUsed ? 1.05 : 1 }} whileTap={{ scale: !hasObjectionUsed ? 0.95 : 1 }} className="w-full mt-4">
                        <Button 
                            variant="outlined" 
                            color="error" 
                            size="medium" 
                            fullWidth 
                            onClick={onStartObjection} 
                            disabled={hasObjectionUsed || isRussianRoulette} 
                            className={`py-2 rounded-xl border-2 font-bold ${!hasObjectionUsed && !isRussianRoulette ? 'border-red-500/80 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:bg-red-500/20' : 'opacity-50'}`}
                        >
                            🚨 ŞİKEYE İTİRAZ ET {hasObjectionUsed && '(Kullanıldı)'}
                        </Button>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
