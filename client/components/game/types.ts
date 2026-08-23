export type User = {
    id: string;
    name: string;
    isHost: boolean;
    avatar: number;
    status: string;
    targetId: string | null;
    hasSubmittedWord: boolean;
    hasUsedHint: boolean;
    isVoiceEnabled: boolean;
    assignedWord: string | null;
};

export type GameState = {
    gameState: "LOBBY" | "WORD_SELECTION" | "PLAYING" | "ROUND_END";
    users: User[];
    currentTurnUserId: string | null;
    turnEndsAt: number | null;
    chatHistory: any[];
    winners: string[];
};

export const AVATARS = [
    { id: 1, color: "bg-violet-600" },
    { id: 2, color: "bg-red-500" },
    { id: 3, color: "bg-blue-500" },
    { id: 4, color: "bg-green-500" },
    { id: 5, color: "bg-yellow-500" },
    { id: 6, color: "bg-pink-500" },
];
