import React from 'react';
import ShieldIcon from '@mui/icons-material/Shield';
import PetsIcon from '@mui/icons-material/Pets';
import CrueltyFreeIcon from '@mui/icons-material/CrueltyFree';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SportsMartialArtsIcon from '@mui/icons-material/SportsMartialArts';
import ColorizeIcon from '@mui/icons-material/Colorize';
import StarIcon from '@mui/icons-material/Star';

export type User = {
    id: string;
    dbId: string;
    name: string;
    isHost: boolean;
    avatar: string;
    status: string;
    targetId: string | null;
    hasSubmittedWord: boolean;
    hasUsedHint: boolean;
    isVoiceEnabled: boolean;
    assignedWord: string | null;
    lives: number;
    disconnected?: boolean;
};

export type GameState = {
    gameState: "LOBBY" | "WORD_SELECTION" | "PLAYING" | "ROUND_END";
    category?: string;
    activeQuestion?: {
        askerId: string;
        question: string;
        votes: { [userId: string]: string };
    } | null;
    users: User[];
    currentTurnUserId: string | null;
    turnEndsAt: number | null;
    chatHistory: any[];
    winners: string[];
};

export const AVATARS = [
    { id: 'default-violet', color: "bg-violet-600" },
    { id: 'default-red', color: "bg-red-500" },
    { id: 'default-blue', color: "bg-blue-500" },
    { id: 'default-green', color: "bg-green-500" },
    { id: 'default-yellow', color: "bg-yellow-500" },
    { id: 'default-pink', color: "bg-pink-500" },
    { id: 'Warrior', color: "bg-red-600", icon: <ShieldIcon fontSize="inherit" />, label: "Savaşçı", model: "Warrior.gltf" },
    { id: 'Wizard', color: "bg-blue-600", icon: <ColorizeIcon fontSize="inherit" />, label: "Büyücü", model: "Wizard.gltf" },
    { id: 'Rogue', color: "bg-purple-600", icon: <StarIcon fontSize="inherit" />, label: "Suikastçi", model: "Rogue.gltf" },
    { id: 'Ranger', color: "bg-green-600", icon: <CrueltyFreeIcon fontSize="inherit" />, label: "Okçu", model: "Ranger.gltf" },
    { id: 'Monk', color: "bg-orange-600", icon: <SportsMartialArtsIcon fontSize="inherit" />, label: "Keşiş", model: "Monk.gltf" },
    { id: 'Cleric', color: "bg-yellow-500", icon: <WorkspacePremiumIcon fontSize="inherit" />, label: "Şifacı", model: "Cleric.gltf" }
];
