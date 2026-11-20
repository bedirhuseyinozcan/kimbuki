import { Avatar } from "@mui/material";
import { User, GameState, AVATARS } from "./types";
import { useState, useEffect } from "react";

interface BettingPhaseProps {
    gameState: GameState;
    me: User;
    onPlaceBet: (targetId: string) => void;
    timeOffset?: number;
}

export default function BettingPhase({
    gameState, me, onPlaceBet, timeOffset = 0
}: BettingPhaseProps) {
    const [timeLeft, setTimeLeft] = useState(10);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        if (!selectedId) return;
        const timer = setTimeout(() => {
            if (!me?.hasPlacedBet) {
                setSelectedId(null);
            }
        }, 2500);
        return () => clearTimeout(timer);
    }, [selectedId, me?.hasPlacedBet]);

    useEffect(() => {
        if (!gameState.bettingEndTime) return;
        const updateTimer = () => {
            const serverTimeNow = Date.now() + timeOffset;
            const left = Math.max(0, Math.floor(((gameState.bettingEndTime || 0) - serverTimeNow) / 1000));
            setTimeLeft(left);
        };
        updateTimer();
        const interval = setInterval(updateTimer, 500);
        return () => clearInterval(interval);
    }, [gameState.bettingEndTime, timeOffset]);

    const handleBet = (id: string) => {
        if (selectedId || me?.hasPlacedBet) return;
        setSelectedId(id);
        onPlaceBet(id);
    };

    return (
        <main className="min-h-screen text-[#F6F5F2] flex flex-col items-center justify-center p-4 md:p-8 relative">
            <div className="swiss-panel max-w-4xl w-full p-6 md:p-10 relative overflow-hidden">
                {/* Top Scoreboard Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b-2 border-[#2D3342] mb-8">
                    <div className="text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FFBE0B] text-[#111318] border-2 border-[#090A0D] rounded-[4px] font-mono text-xs font-bold uppercase tracking-wider mb-3 shadow-[2px_2px_0px_#090A0D]">
                            💰 -{gameState.betAmount || 50} ALTIN MASA GİRİŞİ KESİLDİ
                        </div>
                        <h2 className="font-display text-3xl md:text-5xl font-bold uppercase tracking-tight text-[#F6F5F2]">
                            BAHİS FAZI
                        </h2>
                        <p className="text-sm md:text-base text-[#A0A8B8] mt-1">
                            Bu eli ilk kim çözecek? Favori oyuncunu seç (kendi üzerine de oynayabilirsin).
                        </p>
                    </div>

                    {/* Oversized Tabular Flip-Clock Timer */}
                    <div className="bg-[#111318] border-2 border-[#3E4659] rounded-[4px] px-6 py-3 text-center shrink-0 shadow-[4px_4px_0px_#090A0D]">
                        <span className="swiss-label block">KALAN SÜRE</span>
                        <span className={`font-mono text-4xl md:text-5xl font-bold tnum ${timeLeft <= 3 ? 'text-[#FF334B]' : 'text-[#FFBE0B]'}`}>
                            {String(timeLeft).padStart(2, '0')}s
                        </span>
                    </div>
                </div>

                {/* Contender Tiles Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
                    {gameState.users.map((u: User) => {
                        const userAvatar = AVATARS.find(a => a.id === u.avatar) || AVATARS[0];
                        const isSelected = selectedId === u.id;
                        return (
                            <div 
                                key={u.id} 
                                onClick={() => handleBet(u.id)}
                                className={`flex flex-col items-center justify-between p-5 rounded-[4px] border-2 cursor-pointer transition-all ${
                                    isSelected 
                                        ? 'bg-[#FFBE0B] text-[#111318] border-[#090A0D] shadow-[6px_6px_0px_#090A0D] -translate-y-1' 
                                        : selectedId 
                                            ? 'bg-[#111318] border-[#2D3342] opacity-40 cursor-not-allowed' 
                                            : 'bg-[#222630] border-[#3E4659] hover:border-[#FFBE0B] hover:-translate-y-1 shadow-[4px_4px_0px_#090A0D]'
                                }`}
                            >
                                <Avatar className={`!w-20 !h-20 !rounded-[4px] !border-2 !border-[#090A0D] !shadow-[3px_3px_0px_#090A0D] mb-3 ${userAvatar.color}`}>
                                    {userAvatar.icon ? <div className="text-[2.5rem]">{userAvatar.icon}</div> : u.name.charAt(0).toUpperCase()}
                                </Avatar>
                                <span className={`font-display font-bold text-base uppercase tracking-wide text-center truncate w-full ${isSelected ? 'text-[#111318]' : 'text-[#F6F5F2]'}`}>
                                    {u.name} {u.id === me?.id && '(SEN)'}
                                </span>
                                <div className={`mt-2 font-mono text-xs font-bold uppercase px-2.5 py-1 rounded-[2px] border tnum ${
                                    isSelected 
                                        ? 'bg-[#111318] text-[#FFBE0B] border-[#090A0D]' 
                                        : 'bg-[#111318] text-[#A0A8B8] border-[#2D3342]'
                                }`}>
                                    {isSelected ? `SEÇİLDİ • ${(gameState.betAmount || 50) * 2}G` : `KAZANÇ: ${(gameState.betAmount || 50) * 2}G`}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {selectedId && (
                    <div className="p-4 bg-[#00E5A3]/15 border-2 border-[#00E5A3] rounded-[4px] text-center">
                        <span className="font-mono text-sm font-bold uppercase tracking-wider text-[#00E5A3]">
                            ✓ BAHSİNİZ KAYDEDİLDİ — DİĞER OYUNCULAR BEKLENİYOR...
                        </span>
                    </div>
                )}
            </div>
        </main>
    );
}
