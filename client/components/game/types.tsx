import React from 'react';
import { GiBroadsword, GiWizardStaff, GiDaggers, GiBowArrow, GiHighKick, GiHolySymbol } from 'react-icons/gi';

export type User = {
    id: string;
    dbId: string;
    name: string;
    isHost: boolean;
    avatar: string;
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
    activeQuestion?: {
        askerId: string;
        question: string;
        votes: { [userId: string]: string };
        endTime?: number;
    } | null;
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
