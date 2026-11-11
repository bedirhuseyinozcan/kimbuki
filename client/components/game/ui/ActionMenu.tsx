import React from "react";
import { Button, CircularProgress } from "@mui/material";
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import SkipNextIcon from '@mui/icons-material/SkipNext';
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

    const canAsk = isMyTurn && !(questionsAskedThisTurn >= 1 && extraQuestions <= 0) && !hasActiveQuestion && !isRussianRoulette && !isSubmitting;
    const canGuess = isMyTurn && !isSubmitting;
    const canSkip = isMyTurn && !isRussianRoulette && !isSubmitting;
    const canUseJoker = currentRound >= 3 && !isRussianRoulette && isMyTurn && !isSubmitting;
    const canObject = !hasObjectionUsed && !isRussianRoulette && !isSubmitting;

    return (
        <div className="order-1 md:order-3 w-full md:w-1/4 md:max-w-[360px] flex flex-col gap-3 pointer-events-auto z-40">
            <div className="swiss-panel flex flex-col overflow-hidden transition-all duration-150">
                <div 
                    onClick={onToggle} 
                    className="px-3.5 py-2.5 flex justify-between items-center cursor-pointer md:cursor-default border-b-2 border-[#2D3342] bg-[#1A1D24]"
                >
                    <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 inline-block ${isMyTurn ? 'bg-[#00E5A3] animate-pulse' : 'bg-[#FF5938]'}`} />
                        <span className="font-display font-bold text-sm uppercase tracking-wider text-[#F6F5F2]">
                            HAMLE KONSOLU
                        </span>
                    </div>
                    <span className="md:hidden font-mono text-[10px] font-bold uppercase tracking-wider bg-[#222630] border border-[#3E4659] px-2 py-0.5 rounded-[4px] text-[#A0A8B8]">
                        {isActionsOpen ? 'GİZLE' : 'AÇ'}
                    </span>
                </div>

                <div className={`p-4 flex-col justify-center items-stretch gap-3 ${isActionsOpen ? 'flex' : 'hidden md:flex'}`}>
                    {/* Ask Question Button */}
                    <Button 
                        variant="contained" 
                        fullWidth 
                        startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <QuestionAnswerIcon />} 
                        onClick={onOpenQuestionDialog} 
                        disabled={!canAsk} 
                        className={`!py-3 ${canAsk ? 'swiss-btn-primary' : '!bg-[#222630] !text-[#687082] !border-2 !border-[#2D3342] !rounded-[4px] !font-display !font-bold'}`}
                    >
                        SORU SOR & OYLAT
                    </Button>

                    {/* Guess Identity Button (Hero Action) */}
                    <Button 
                        variant="contained" 
                        fullWidth 
                        startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : undefined}
                        onClick={onOpenGuessDialog} 
                        disabled={!canGuess} 
                        className={`!py-3.5 !text-base ${canGuess ? 'swiss-btn-mint' : '!bg-[#222630] !text-[#687082] !border-2 !border-[#2D3342] !rounded-[4px] !font-display !font-bold'}`}
                    >
                        🎯 KİMLİĞİ TAHMİN ET
                    </Button>

                    {/* Skip Turn Button */}
                    <Button 
                        variant="outlined" 
                        fullWidth 
                        startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <SkipNextIcon />} 
                        onClick={onSkip} 
                        disabled={!canSkip} 
                        className={`!py-2.5 ${canSkip ? 'swiss-btn-secondary' : '!bg-[#15181F] !text-[#687082] !border-2 !border-[#2D3342] !rounded-[4px] !font-display !font-bold'}`}
                    >
                        TURU PAS GEÇ
                    </Button>

                    {/* Joker Trigger */}
                    {hasJoker && !hasUsedJoker && (
                        <Button 
                            variant="contained" 
                            fullWidth 
                            startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : undefined}
                            onClick={onOpenJokerDialog} 
                            disabled={!canUseJoker} 
                            className={`!py-3 !mt-1 ${canUseJoker ? 'swiss-btn-coral' : '!bg-[#222630] !text-[#687082] !border-2 !border-[#2D3342] !rounded-[4px] !font-display !font-bold'}`}
                        >
                            {currentRound < 3 ? '🃏 JOKER (3. TURDA AÇILIR)' : '🃏 ÖZEL JOKERİ KULLAN'}
                        </Button>
                    )}

                    <div className="w-full h-[2px] bg-[#2D3342] my-1" />

                    {/* Objection Trigger */}
                    <Button 
                        variant="outlined" 
                        fullWidth 
                        startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : undefined}
                        onClick={onStartObjection} 
                        disabled={!canObject} 
                        className={`!py-2 !text-xs !font-mono !font-bold !uppercase !tracking-wider !rounded-[4px] !border-2 ${
                            canObject 
                                ? '!border-[#FF334B] !text-[#FF334B] !bg-[#FF334B]/10 hover:!bg-[#FF334B] hover:!text-white' 
                                : '!border-[#2D3342] !text-[#687082] !bg-transparent'
                        }`}
                    >
                        🚨 ŞİKEYE İTİRAZ ET {hasObjectionUsed && '(KULLANILDI)'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
