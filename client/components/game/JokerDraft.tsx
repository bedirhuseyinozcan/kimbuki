import React, { useState, useEffect } from 'react';
import { User, GameState, JOKERS } from './types';
import { motion } from 'framer-motion';
import { Button } from '@mui/material';

interface JokerDraftProps {
    gameState: GameState;
    me: User;
    onSelectJoker: (jokerId: number) => void;
}

export default function JokerDraft({ gameState, me, onSelectJoker }: JokerDraftProps) {
    const [timeLeft, setTimeLeft] = useState(15);
    const [selected, setSelected] = useState<number | null>(null);

    useEffect(() => {
        if (!gameState.jokerDraftEndTime) return;
        const interval = setInterval(() => {
            const left = Math.max(0, Math.floor(((gameState.jokerDraftEndTime || 0) - Date.now()) / 1000));
            setTimeLeft(left);
            if (left <= 0) clearInterval(interval);
        }, 1000);
        return () => clearInterval(interval);
    }, [gameState.jokerDraftEndTime]);

    const handleSelect = (jokerId: number) => {
        if (selected !== null || me.hasDrafted) return;
        setSelected(jokerId);
        onSelectJoker(jokerId);
    };

    if (me.hasDrafted || selected !== null) {
        return (
            <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
                <div className="glass p-8 rounded-3xl text-center shadow-2xl animate-pulse">
                    <h2 className="text-3xl font-bold text-cyan-400 mb-4">Seçim Yapıldı!</h2>
                    <p className="text-slate-300">Diğer oyuncuların seçimi tamamlaması bekleniyor... ({timeLeft}s)</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <div className="text-center mb-8 z-10">
                <h1 className="text-5xl font-black text-cyan-400 mb-2 drop-shadow-lg">KADERİNİ SEÇ</h1>
                <p className="text-xl text-slate-300">Oyun boyunca kullanacağın özel yeteneğini belirle.</p>
                <div className="text-4xl font-black text-amber-400 mt-4 animate-pulse">{timeLeft} sn</div>
            </div>

            <div className="flex flex-col md:flex-row gap-8 z-10">
                {me?.jokerChoices?.map((jokerId, index) => {
                    const jMeta = JOKERS.find(j => j.id === jokerId);
                    if (!jMeta) return null;

                    let borderGlow = "border-slate-400 shadow-[0_0_15px_rgba(148,163,184,0.5)]";
                    let titleColor = "text-slate-200";
                    if (jMeta.rarity === 'gold') {
                        borderGlow = "border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.6)]";
                        titleColor = "text-amber-400";
                    } else if (jMeta.rarity === 'prismatic') {
                        borderGlow = "border-fuchsia-500 shadow-[0_0_40px_rgba(217,70,239,0.8)] animate-pulse";
                        titleColor = "text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400";
                    }

                    return (
                        <motion.div 
                            key={index}
                            initial={{ rotateY: 180, opacity: 0, scale: 0.5 }}
                            animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8, delay: index * 0.2, type: "spring" }}
                            whileHover={{ scale: 1.05, translateY: -10 }}
                            onClick={() => handleSelect(jokerId)}
                            className={`w-72 h-96 bg-slate-800/90 backdrop-blur-xl rounded-2xl border-4 ${borderGlow} flex flex-col items-center justify-between p-6 cursor-pointer relative overflow-hidden group`}
                        >
                            <div className="absolute top-2 right-2 text-xs font-black uppercase tracking-widest text-slate-500 opacity-50">{jMeta.rarity}</div>
                            <div className="flex-1 flex flex-col items-center justify-center text-center">
                                <h3 className={`text-3xl font-black mb-4 ${titleColor}`}>{jMeta.name}</h3>
                                <p className="text-slate-300 text-lg leading-relaxed">{jMeta.desc}</p>
                            </div>
                            <Button variant="contained" className={`w-full font-bold py-3 ${jMeta.rarity === 'prismatic' ? 'bg-fuchsia-600 hover:bg-fuchsia-500' : jMeta.rarity === 'gold' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-slate-600 hover:bg-slate-500'}`}>
                                BU YETENEĞİ SEÇ
                            </Button>
                        </motion.div>
                    );
                })}
            </div>
        </main>
    );
}
