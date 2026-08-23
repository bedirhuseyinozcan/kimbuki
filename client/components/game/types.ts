export type User = {
    id: string;
    name: string;
    isHost: boolean;
    avatar: number;
    status: string;
    targetId: string | null;
    hasSubmittedWord: boolean;
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
