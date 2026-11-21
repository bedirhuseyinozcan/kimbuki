"use client";

import React from "react";
import { AVATARS, GameState, NAME_COLORS, TITLES, getRankInfo } from "./types";

interface Scene2DProps {
    gameState: GameState;
    myId: string;
    activeBubbles: { [userId: string]: { text: string; id: string } };
    speakingNames?: string[];
    taunts?: { [userId: string]: { type: string; id: number } };
}

const TAUNT_EMOJIS: Record<string, string> = {
    fire: "🔥",
    party: "🎉",
    laugh: "😂",
    cry: "😭"
};

function Scene2DComponent({
    gameState,
    myId,
    activeBubbles,
    speakingNames = [],
    taunts = {}
}: Scene2DProps) {
    const isDay = gameState?.theme !== "night";
    const users = gameState?.users || [];

    return (
        <div
            className={`absolute inset-0 w-full h-full z-0 flex items-center justify-center overflow-y-auto pl-14 pr-4 pt-36 pb-28 md:pl-[calc(25%+6.5rem)] md:pr-[240px] md:pt-44 md:pb-56 xl:pl-[490px] xl:pr-[260px] ${
                isDay ? "bg-[#151B26]" : "bg-[#0B0E14]"
            }`}
            style={{
                backgroundImage:
                    "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
                backgroundSize: "24px 24px"
            }}
        >
            <div className="w-full max-w-4xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-3.5 md:gap-4">
                    {users.map((u) => {
                        const isMe = u.id === myId;
                        const isCurrentTurn = u.id === gameState.currentTurnUserId;
                        const isSpeaking = speakingNames.includes(u.name);
                        const isWinner = gameState.winners.includes(u.id);
                        const isEliminated = u.status === "spectator" && !isWinner;
                        const avMeta = AVATARS.find((a) => a.id === u.avatar);
                        const rankObj = getRankInfo(u.reputation || 0);
                        const nameColorClass =
                            NAME_COLORS.find((c) => c.id === u.nameColor)?.className ||
                            "text-[#F6F5F2]";
                        const titleLabel = u.title
                            ? TITLES.find((t) => t.id === u.title)?.label || u.title
                            : null;
                        const bubbleText = activeBubbles[u.id]?.text;
                        const tauntType = taunts[u.id]?.type;

                        const showWord =
                            gameState.gameState === "ROUND_END" || !isMe
                                ? u.assignedWord || "—"
                                : "??? (SENİN KELİMEN)";

                        return (
                            <div
                                key={u.id}
                                className={`relative p-4 rounded-[6px] border-2 transition-colors ${
                                    isCurrentTurn
                                        ? "bg-[#1F2430] border-[#FFBE0B] shadow-[4px_4px_0px_#FFBE0B]"
                                        : isSpeaking
                                            ? "bg-[#1A1D24] border-[#00E5A3] shadow-[4px_4px_0px_#00E5A3]"
                                            : isWinner
                                                ? "bg-[#1A1D24] border-[#00E5A3]"
                                                : "bg-[#1A1D24] border-[#2D3342] shadow-[4px_4px_0px_#090A0D]"
                                } ${u.disconnected || isEliminated ? "opacity-60" : ""}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div
                                            className={`w-11 h-11 shrink-0 rounded-[4px] border-2 border-[#090A0D] flex items-center justify-center text-xl ${
                                                avMeta?.color || "bg-[#3B82F6] text-white"
                                            }`}
                                        >
                                            {avMeta?.icon || u.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <div className={`font-mono text-[10px] font-bold uppercase flex items-center gap-1 ${rankObj.color}`}>
                                                <span>{rankObj.icon}</span>
                                                <span className="truncate">{rankObj.title}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {titleLabel && (
                                                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] bg-[#111318] border border-[#3E4659] text-[#F6F5F2]">
                                                        {titleLabel}
                                                    </span>
                                                )}
                                                <span className={`font-display font-bold text-base truncate ${nameColorClass}`}>
                                                    {u.name}
                                                </span>
                                                {isMe && (
                                                    <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-[2px] bg-[#FFBE0B] text-[#111318]">
                                                        SEN
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <div className="font-mono text-xs font-bold text-[#FF334B] tnum">
                                            {u.lives > 0 ? "❤️".repeat(Math.min(u.lives, 5)) : "💀"}
                                        </div>
                                        {isSpeaking && (
                                            <span className="font-mono text-[10px] font-bold text-[#00E5A3]">
                                                🎙️ KONUŞUYOR
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-3 p-2.5 rounded-[4px] bg-[#111318] border-2 border-[#2D3342] text-center">
                                    <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-[#8B94A7]">
                                        ALNINDAKİ KELİME
                                    </span>
                                    <span
                                        className={`font-display font-bold text-base uppercase tracking-wide ${
                                            isMe && gameState.gameState !== "ROUND_END"
                                                ? "text-[#8B94A7]"
                                                : "text-[#FFBE0B]"
                                        }`}
                                    >
                                        {showWord}
                                    </span>
                                </div>

                                <div className="mt-2.5 flex flex-wrap gap-1.5">
                                    {isCurrentTurn && (
                                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-[2px] bg-[#FFBE0B] text-[#111318]">
                                            ⭐ SIRA ONDA
                                        </span>
                                    )}
                                    {isWinner && (
                                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-[2px] bg-[#00E5A3] text-[#111318]">
                                            🏆 KAZANDI
                                        </span>
                                    )}
                                    {u.disconnected && (
                                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-[2px] bg-[#FF334B]/20 border border-[#FF334B] text-[#FF334B]">
                                            BAĞLANTI KOPTU
                                        </span>
                                    )}
                                    {(u.silencedTurns ?? 0) > 0 && (
                                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-[2px] bg-[#FF5938]/20 border border-[#FF5938] text-[#FF5938]">
                                            🤐 SUSTURULDU ({u.silencedTurns})
                                        </span>
                                    )}
                                    {u.timeBomb && (
                                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-[2px] bg-[#FF334B]/20 border border-[#FF334B] text-[#FF334B]">
                                            💣 BOMBA ({u.timeBomb.roundsLeft})
                                        </span>
                                    )}
                                    {u.russianRouletteActive && (
                                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-[2px] bg-[#FF334B] text-white">
                                            🔫 RUS RULETİ
                                        </span>
                                    )}
                                    {u.bloodTieTarget && (
                                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-[2px] bg-[#A855F7]/20 border border-[#A855F7] text-[#E9D5FF]">
                                            🩸 KAN BAĞI
                                        </span>
                                    )}
                                </div>

                                {bubbleText && (
                                    <div className="mt-2.5 p-2 rounded-[4px] bg-[#F4F1EA] text-[#111318] border-2 border-[#090A0D] font-sans text-xs font-bold">
                                        💬 {bubbleText}
                                    </div>
                                )}

                                {tauntType && (
                                    <div className="absolute -top-3 -right-2 px-2 py-0.5 rounded-[4px] bg-[#FFBE0B] border-2 border-[#090A0D] text-base shadow-[2px_2px_0px_#090A0D]">
                                        {TAUNT_EMOJIS[tauntType] || "🔥"}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

const Scene2D = React.memo(Scene2DComponent);
export default Scene2D;
