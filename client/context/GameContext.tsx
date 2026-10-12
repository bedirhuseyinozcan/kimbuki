"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { GameState, User } from "@/components/game/types";
import { GameActions } from "@/hooks/useGameSocket";

export interface GameContextValue {
    // Temel Oyun ve Oyuncu Durumu
    gameState: GameState;
    me: User;
    myId: string;
    isMyTurn: boolean;
    currentTurnUser?: User;

   
    actions: GameActions;

   
    notepad: string;
    setNotepad: (val: string) => void;

    
    chatInput: string;
    setChatInput: (val: string) => void;

   
    guessInput: string;
    setGuessInput: (val: string) => void;
    guessDialogOpen: boolean;
    setGuessDialogOpen: (val: boolean) => void;

    headRotations: { [key: string]: { pitch: number; yaw: number } };
    taunts: { [key: string]: { type: string; id: number } };
    visualEffects: any[];

   
    isConnected: boolean;
    isReconnecting: boolean;
    pingMs: number | null;
    connectionError: string | null;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({
    value,
    children,
}: {
    value: GameContextValue;
    children: ReactNode;
}) {
    return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGameContext(): GameContextValue {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error("useGameContext must be used within a GameProvider");
    }
    return context;
}

export function useGameActions(): GameActions {
    const { actions } = useGameContext();
    return actions;
}

export function useGameTurn() {
    const { isMyTurn, currentTurnUser, gameState } = useGameContext();
    return {
        isMyTurn,
        currentTurnUser,
        currentTurnUserId: gameState.currentTurnUserId,
        turnEndsAt: gameState.turnEndsAt,
    };
}

export function useGameNotepad() {
    const { notepad, setNotepad, me, gameState } = useGameContext();
    return { notepad, setNotepad, me, gameState };
}

export function useGameChat() {
    const { gameState, chatInput, setChatInput, actions, me } = useGameContext();
    return {
        chatHistory: gameState.chatHistory || [],
        chatInput,
        setChatInput,
        handleChat: actions.chat,
        isPlayer: me?.status === "playing",
    };
}
