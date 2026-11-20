"use client";

import { useEffect, useMemo } from "react";
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
import { RoomEvent } from "livekit-client";
import { toast } from "react-toastify";
import "@livekit/components-styles";

if (typeof window !== "undefined" && typeof console !== "undefined") {
    const win = window as unknown as { __kimbukiConsolePatched?: boolean };
    if (!win.__kimbukiConsolePatched) {
        win.__kimbukiConsolePatched = true;
        const originalError = console.error;
        console.error = (...args) => {
            if (typeof args[0] === "string" && (args[0].includes("Failed to set sink id") || args[0].includes("setSinkId error"))) {
                return;
            }
            originalError(...args);
        };
    }
}

function LiveKitSpeakerSync() {
    const room = useRoomContext();
    useEffect(() => {
        if (!room) return;

        const applySpeaker = (outputId?: string | null) => {
            const targetSpeaker = outputId ?? (typeof window !== "undefined" ? localStorage.getItem("preferredSpeaker") : null);
            if (targetSpeaker && room.state === "connected") {
                room.switchActiveDevice("audiooutput", targetSpeaker).catch((e) => console.error("setSinkId error", e));
            }
        };

        const applyMicDevice = (inputId?: string | null) => {
            const targetMic = inputId ?? (typeof window !== "undefined" ? localStorage.getItem("preferredMic") : null);
            if (targetMic && room.state === "connected") {
                room.switchActiveDevice("audioinput", targetMic).catch((e) => console.error("Mic device switch error", e));
            }
        };

        const handleConnected = () => {
            applySpeaker();
            applyMicDevice();
        };

        const handleDeviceChangeEvent = (ev: Event) => {
            const detail = (ev as CustomEvent<{ inputId?: string; outputId?: string }>).detail;
            if (detail?.inputId) applyMicDevice(detail.inputId);
            if (detail?.outputId) applySpeaker(detail.outputId);
        };

        if (room.state === "connected") {
            applySpeaker();
        }
        room.on(RoomEvent.Connected, handleConnected);
        window.addEventListener("kimbuki:audio-device-changed", handleDeviceChangeEvent);

        return () => {
            room.off(RoomEvent.Connected, handleConnected);
            window.removeEventListener("kimbuki:audio-device-changed", handleDeviceChangeEvent);
        };
    }, [room]);
    return null;
}

function LiveKitMicSync({ isVoiceEnabled }: { isVoiceEnabled: boolean }) {
    const { localParticipant } = useLocalParticipant();
    const room = useRoomContext();

    useEffect(() => {
        if (!room || !localParticipant) return;

        const syncMic = () => {
            if (room.state === "connected") {
                localParticipant.setMicrophoneEnabled(isVoiceEnabled).catch((e) => console.error("Mic sync error", e));
            }
        };

        syncMic();
        room.on(RoomEvent.Connected, syncMic);
        return () => {
            room.off(RoomEvent.Connected, syncMic);
        };
    }, [isVoiceEnabled, localParticipant, room]);

    return null;
}

export default function GamePage() {
    const { code } = useParams();
    const notepad = useNotepad(code);
    const game = useGameSocket(code, {
        onClearNotepad: notepad.clearNotepad,
    });
    const livekit = useLiveKit(code, game.isJoined && Boolean(game.me));

    useEffect(() => {
        if (livekit.error) {
            toast.warning(`Sesli sohbet: ${livekit.error}`, { toastId: "livekit-error" });
        }
    }, [livekit.error]);

    const roomOptions = useMemo(() => ({
        audioCaptureDefaults: {
            deviceId: typeof window !== "undefined" ? localStorage.getItem("preferredMic") || undefined : undefined,
            echoCancellation: true,
            autoGainControl: true,
            noiseSuppression: true,
        },
    }), []);

    const currentTurnUser = useMemo(
        () => game.gameState?.users.find((u: User) => u.id === game.gameState?.currentTurnUserId),
        [game.gameState]
    );

    const gameContextValue = useMemo<GameContextValue | null>(() => {
        if (!game.gameState || !game.me) return null;
        return {
            gameState: game.gameState,
            me: game.me,
            myId: game.myId!,
            isMyTurn: game.gameState.currentTurnUserId === game.myId,
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
            headRotationsRef: game.headRotationsRef,
            taunts: game.taunts,
            visualEffects: game.visualEffects,
            isSubmitting: game.isSubmitting,
            isConnected: game.isConnected,
            isReconnecting: game.isReconnecting,
            pingMs: game.pingMs,
            timeOffset: game.timeOffset,
            connectionError: game.connectionError,
        };
    }, [
        game.gameState,
        game.me,
        game.myId,
        currentTurnUser,
        game.actions,
        notepad.notepad,
        notepad.setNotepad,
        game.chatInput,
        game.setChatInput,
        game.guessInput,
        game.setGuessInput,
        game.guessDialogOpen,
        game.setGuessDialogOpen,
        game.headRotations,
        game.headRotationsRef,
        game.taunts,
        game.visualEffects,
        game.isSubmitting,
        game.isConnected,
        game.isReconnecting,
        game.pingMs,
        game.timeOffset,
        game.connectionError,
    ]);

    if (game.checkingAuth || !game.isJoined) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-[#111318] text-[#F6F5F2]">
                <div className="swiss-panel w-full max-w-sm p-8">
                    <span className="inline-block w-3 h-3 bg-[#FFBE0B] animate-pulse mb-3" />
                    <h2 className="font-display text-2xl font-bold uppercase tracking-wider text-[#F6F5F2]">
                        ODAYA BAĞLANILIYOR
                    </h2>
                    <p className="font-mono text-xs uppercase tracking-wider text-[#A0A8B8] mt-2">
                        OTURUM DOĞRULANIYOR, LÜTFEN BEKLEYİN...
                    </p>
                </div>
            </main>
        );
    }

    if (!game.gameState || !game.me || !gameContextValue) {
        return (
            <div className="min-h-screen bg-[#111318] flex items-center justify-center text-[#F6F5F2] font-display text-xl uppercase tracking-wider">
                SAHNE YÜKLENİYOR...
            </div>
        );
    }

    const { gameState, me, myId } = game;

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
            return <BettingPhase gameState={gameState} me={me} onPlaceBet={game.handlePlaceBet} timeOffset={game.timeOffset} />;
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
            return <JokerDraft gameState={gameState} me={me} onSelectJoker={game.handleSelectJoker} timeOffset={game.timeOffset} />;
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
                            theme: gameState.theme || "day",
                            map: gameState.map || "floating_island__low_poly_vr.glb",
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
