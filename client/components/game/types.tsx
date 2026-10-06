import React from 'react';
import { GiBroadsword, GiWizardStaff, GiDaggers, GiBowArrow, GiHighKick, GiHolySymbol, GiFootprint, GiEyeTarget, GiMagnifyingGlass, GiCrystalBall, GiCrown } from 'react-icons/gi';

export type User = {
    id: string;
    dbId: string;
    name: string;
    isHost: boolean;
    avatar: string;
    pedestal?: string;
    reputation?: number;
    status: string;
    targetId: string | null;
    hasSubmittedWord: boolean;
    hasPlacedBet?: boolean;
    isVoiceEnabled: boolean;
    joker?: number | null;
    hasUsedJoker?: boolean;
    silencedTurns?: number;
    extraQuestions?: number;
    questionsAskedThisTurn?: number;
    assignedWord: string | null;
    hintStr?: string | null;
    lives: number;
    disconnected?: boolean;
};

export type GameState = {
    gameState: "LOBBY" | "BETTING" | "WORD_SELECTION" | "PLAYING" | "ROUND_END";
    bettingEndTime?: number;
    objection?: {
        initiator: string;
        votes: { [userId: string]: boolean };
        endTime: number;
    } | null;
    roundLogs?: string[];
    category?: string;
    isBettingEnabled?: boolean;
    betAmount?: number;
    isJokersEnabled?: boolean;
    theme?: "day" | "night";
    map?: string;
    activeQuestion?: {
        askerId: string;
        question: string;
        votes: { [userId: string]: string };
        endTime?: number;
    } | null;
    resolvedQuestionsThisTurn?: { askerId: string; question: string; votes: { [userId: string]: string }; }[];
    users: User[];
    currentTurnUserId: string | null;
    turnEndsAt: number | null;
    chatHistory: any[];
    winners: string[];
    hasObjectionUsed?: boolean;
};

export const AVATARS = [
    { id: 'default-violet', color: "bg-violet-600" },
    { id: 'default-red', color: "bg-red-500" },
    { id: 'default-blue', color: "bg-blue-500" },
    { id: 'default-green', color: "bg-green-500" },
    { id: 'default-yellow', color: "bg-yellow-500" },
    { id: 'default-pink', color: "bg-pink-500" },
    { id: 'Warrior', color: "bg-red-600", icon: <GiBroadsword />, label: "Savaşçı", model: "Warrior.gltf" },
    { id: 'Wizard', color: "bg-blue-600", icon: <GiWizardStaff />, label: "Büyücü", model: "Wizard.gltf" },
    { id: 'Rogue', color: "bg-purple-600", icon: <GiDaggers />, label: "Suikastçi", model: "Rogue.gltf" },
    { id: 'Ranger', color: "bg-green-600", icon: <GiBowArrow />, label: "Okçu", model: "Ranger.gltf" },
    { id: 'Monk', color: "bg-orange-600", icon: <GiHighKick />, label: "Keşiş", model: "Monk.gltf" },
    { id: 'Cleric', color: "bg-yellow-500", icon: <GiHolySymbol />, label: "Şifacı", model: "Cleric.gltf" }
];

export const getRankInfo = (reputation: number) => {
    let title = "Çaylak";
    let color = "text-amber-600";
    let icon = <GiFootprint />;
    if (reputation >= 5000) { title = "Kimbuki Üstadı"; color = "text-yellow-400 font-black drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"; icon = <GiCrown />; }
    else if (reputation >= 2500) { title = "Zihin Okuyucu"; color = "text-cyan-300"; icon = <GiCrystalBall />; }
    else if (reputation >= 1000) { title = "Dedektif"; color = "text-yellow-500"; icon = <GiMagnifyingGlass />; }
    else if (reputation >= 400) { title = "Gözlemci"; color = "text-slate-300"; icon = <GiEyeTarget />; }
    return { title, color, icon };
};

export const PEDESTALS = [
    { id: 'default_stone', label: 'Taş Zemin' },
    { id: 'gold_pedestal', label: 'Altın Kaide' },
    { id: 'lava_ring', label: 'Lav Halkası' },
    { id: 'ice_block', label: 'Buz Kütlesi' },
    { id: 'cloud_base', label: 'Uçan Bulut' },
];
