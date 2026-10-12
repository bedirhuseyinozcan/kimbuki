"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useGameSocket } from "@/hooks/useGameSocket";
import { useLiveKit } from "@/hooks/useLiveKit";
import { useNotepad } from "@/hooks/useNotepad";
import Lobby from "@/components/game/Lobby";
import WordSelection from "@/components/game/WordSelection";
import JokerDraft from "@/components/game/JokerDraft";
import GameScene from "@/components/game/GameScene";
import GameOver from "@/components/game/GameOver";
import BettingPhase from "@/components/game/BettingPhase";
import ConnectionStatus from "@/components/game/ui/ConnectionStatus";
import { GameProvider, GameContextValue } from "@/context/GameContext";
import { User } from "@/components/game/types";
import { LiveKitRoom, RoomAudioRenderer, useRoomContext, useLocalParticipant } from "@livekit/components-react";
import "@livekit/components-styles";

if (typeof console !== "undefined") {
    const originalError = console.error;
    console.error = (...args) => {
        if (typeof args[0] === "string" && (args[0].includes("Failed to set sink id") || args[0].includes("setSinkId error"))) {
            return;
        }
        originalError(...args);
    };
}

function LiveKitSpeakerSync() {
    const room = useRoomContext();
    useEffect(() => {
        const savedSpeaker = typeof window !== "undefined" ? localStorage.getItem("preferredSpeaker") : null;
        if (savedSpeaker && room) {
            room.switchActiveDevice("audiooutput", savedSpeaker).catch((e) => console.error("setSinkId error", e));
        }
    }, [room]);
    return null;
}

function LiveKitMicSync({ isVoiceEnabled }: { isVoiceEnabled: boolean }) {
    const { localParticipant } = useLocalParticipant();
    const room = useRoomContext();

    useEffect(() => {
        if (localParticipant && room && room.state === "connected") {
            localParticipant.setMicrophoneEnabled(isVoiceEnabled).catch((e) => console.error("Mic sync error", e));
        }
    }, [isVoiceEnabled, localParticipant, room]);

    return null;
}

export default function GamePage() {
    const { code } = useParams();
    const notepad = useNotepad(code);
    const game = useGameSocket(code, {
        onClearNotepad: notepad.clearNotepad,
    });
    const livekit = useLiveKit(code, game.me ? (game.me.dbId || game.me.name || game.me.id) : undefined);

    if (game.checkingAuth || !game.isJoined) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-slate-900 text-white">
                <div className="glass w-full max-w-sm p-8 rounded-3xl shadow-2xl animate-pulse border border-slate-700">
                    <h2 className="text-2xl font-bold text-cyan-400">Odaya Bağlanılıyor...</h2>
                    <p className="text-slate-400 mt-2">Lütfen bekleyin.</p>
                </div>
            </main>
        );
    }

    if (!game.gameState || !game.me) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-2xl animate-pulse">
                Odaya bağlanıyor...
            </div>
        );
    }

    const { gameState, me, myId } = game;
    const isMyTurn = gameState.currentTurnUserId === myId;
    const currentTurnUser = gameState.users.find((u: User) => u.id === gameState.currentTurnUserId);

    const gameContextValue: GameContextValue = {
        gameState,
        me,
        myId: myId!,
        isMyTurn,
        currentTurnUser,
        actions: game.actions,
        notepad: notepad.notepad,
        setNotepad: notepad.setNotepad,
        chatInput: game.chatInput,
        setChatInput: game.setChatInput,
        guessInput: game.guessInput,
        setGuessInput: game.setGuessInput,
        guessDialogOpen: game.guessDialogOpen,
        setGuessDialogOpen: game.setGuessDialogOpen,
        headRotations: game.headRotations,
        taunts: game.taunts,
        visualEffects: game.visualEffects,
        isSubmitting: game.isSubmitting,
        isConnected: game.isConnected,
        isReconnecting: game.isReconnecting,
        pingMs: game.pingMs,
        connectionError: game.connectionError,
    };

    const renderGameState = () => {
        if (gameState.gameState === "LOBBY") {
            return (
                <Lobby
                    gameState={gameState}
                    me={me}
                    code={code as string}
                    inviteUrl={game.inviteUrl}
                    myId={myId!}
                    onStart={game.handleStart}
                    onCloseRoom={game.handleCloseRoom}
                    onLeaveRoom={game.handleLeaveRoom}
                    onCopyLink={game.copyLink}
                    onSelectAvatar={game.handleSelectAvatar}
                    onToggleVoice={game.toggleVoice}
                />
            );
        }
        if (gameState.gameState === "BETTING") {
            return <BettingPhase gameState={gameState} me={me} onPlaceBet={game.handlePlaceBet} />;
        }
        if (gameState.gameState === "WORD_SELECTION") {
            return (
                <WordSelection
                    gameState={gameState}
                    me={me}
                    wordInput={game.wordInput}
                    setWordInput={game.setWordInput}
                    onSetWord={game.handleSetWord}
                    onEditWord={game.handleEditWord}
                    onShuffleTargets={game.handleShuffleTargets}
                    onLeaveRoom={game.handleLeaveRoom}
                />
            );
        }
        if (gameState.gameState === "JOKER_DRAFT") {
            return <JokerDraft gameState={gameState} me={me} onSelectJoker={game.handleSelectJoker} />;
        }
        if (gameState.gameState === "PLAYING") {
            return <GameScene />;
        }
        if (gameState.gameState === "ROUND_END") {
            return (
                <GameOver
                    gameState={gameState}
                    me={me}
                    onStart={() =>
                        game.handleStart({
                            category: gameState.category || "Karışık",
                            bettingEnabled: gameState.isBettingEnabled,
                            jokersEnabled: gameState.isJokersEnabled,
                            betAmount: gameState.betAmount,
                        })
                    }
                    onLeaveRoom={game.handleLeaveRoom}
                />
            );
        }
        return null;
    };

    const roomOptions = {
        audioCaptureDefaults: {
            deviceId: typeof window !== "undefined" ? localStorage.getItem("preferredMic") || undefined : undefined,
            echoCancellation: true,
            autoGainControl: true,
            noiseSuppression: true,
        },
    };

    return (
        <GameProvider value={gameContextValue}>
            <ConnectionStatus
                isConnected={game.isConnected}
                isReconnecting={game.isReconnecting}
                pingMs={game.pingMs}
                connectionError={game.connectionError}
            />
            <LiveKitRoom
                video={false}
                audio={Boolean(livekit.token && me?.isVoiceEnabled)}
                token={livekit.token}
                serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                connect={!!livekit.token}
                options={roomOptions}
            >
                {renderGameState()}
                <RoomAudioRenderer />
                <LiveKitSpeakerSync />
                <LiveKitMicSync isVoiceEnabled={me?.isVoiceEnabled || false} />
            </LiveKitRoom>
        </GameProvider>
    );
}
