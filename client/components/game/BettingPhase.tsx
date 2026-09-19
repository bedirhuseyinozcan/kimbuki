import { Avatar } from "@mui/material";
import { User, GameState } from "./types";
import { AVATARS } from "./types";
import { useState, useEffect } from "react";

interface BettingPhaseProps {
    gameState: GameState;
    me: User;
    onPlaceBet: (targetId: string) => void;
}

export default function BettingPhase({
    gameState, me, onPlaceBet
}: BettingPhaseProps) {
    const [timeLeft, setTimeLeft] = useState(10);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        if (!gameState.bettingEndTime) return;
        const interval = setInterval(() => {
            const left = Math.max(0, Math.floor(((gameState.bettingEndTime || 0) - Date.now()) / 1000));
            setTimeLeft(left);
            if (left <= 0) clearInterval(interval);
        }, 1000);
        return () => clearInterval(interval);
    }, [gameState.bettingEndTime]);

    const handleBet = (id: string) => {
        if (selectedId) return;
        setSelectedId(id);
        onPlaceBet(id);
    };

    return (
        <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 relative">
            <div className="absolute top-4 left-4 z-20 flex gap-2 pointer-events-auto">
                <div className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 font-bold px-4 py-2 rounded-full backdrop-blur-md">
                    💰 -50 ALTIN GİRİŞ ÜCRETİ KESİLDİ
                </div>
            </div>

            <div className="glass max-w-3xl w-full p-8 rounded-3xl text-center shadow-2xl relative overflow-hidden">
                <h2 className="text-4xl font-bold mb-4 text-cyan-400">BAHİS ZAMANI!</h2>
                <p className="text-xl text-slate-300 mb-8">Sence bu eli KİM KAZANACAK? (Kendi üzerine de oynayabilirsin)</p>

                <div className="flex flex-wrap justify-center gap-6 mb-8">
                    {gameState.users.map((u: User) => {
                        const avatarIndex = typeof u.avatar === 'string' ? parseInt(u.avatar) : (u.avatar as number);
                        const userAvatar = AVATARS[avatarIndex] || AVATARS[0];
                        return (
                        <div 
                            key={u.id} 
                            onClick={() => handleBet(u.id)}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl cursor-pointer transition-all ${
                                selectedId === u.id ? 'bg-yellow-500/30 border-2 border-yellow-500 scale-110 shadow-[0_0_20px_rgba(234,179,8,0.5)]' : 
                                selectedId ? 'bg-slate-800/50 opacity-50 border-2 border-transparent' : 
                                'bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 hover:border-slate-500 hover:scale-105'
                            }`}
                        >
                            <Avatar className={`w-24 h-24 shadow-lg border-2 border-slate-700 text-4xl ${userAvatar.color}`}>
                                {userAvatar.icon ? <div className="text-[3rem]">{userAvatar.icon}</div> : u.name.charAt(0).toUpperCase()}
                            </Avatar>
                            <span className="font-bold text-lg text-white">{u.name} {u.id === me.id && '(Sen)'}</span>
                            {selectedId === u.id && <span className="text-yellow-400 font-black">💰 {(gameState.betAmount || 50) * 2} Altın</span>}
                        </div>
                    )})}
                </div>

                <div className="text-4xl font-black text-white/50 mb-4 animate-pulse">
                    {timeLeft} sn
                </div>
                {selectedId && (
                    <p className="text-green-400 font-bold text-xl animate-fade-in-up">Bahsiniz onaylandı! Diğer oyuncular bekleniyor...</p>
                )}
            </div>
        </main>
    );
}
