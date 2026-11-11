import React, { useState, useEffect } from 'react';
import { User, GameState, JOKERS } from './types';
import { motion } from 'framer-motion';
import { Button } from '@mui/material';

interface JokerDraftProps {
    gameState: GameState;
    me: User;
    onSelectJoker: (jokerId: number) => void;
    timeOffset?: number;
}

export default function JokerDraft({ gameState, me, onSelectJoker, timeOffset = 0 }: JokerDraftProps) {
    const [timeLeft, setTimeLeft] = useState(15);
    const [selected, setSelected] = useState<number | null>(null);

    useEffect(() => {
        if (!gameState.jokerDraftEndTime) return;
        const updateTimer = () => {
            const serverTimeNow = Date.now() + timeOffset;
            const left = Math.max(0, Math.floor(((gameState.jokerDraftEndTime || 0) - serverTimeNow) / 1000));
            setTimeLeft(left);
        };
        updateTimer();
        const interval = setInterval(updateTimer, 500);
        return () => clearInterval(interval);
    }, [gameState.jokerDraftEndTime, timeOffset]);

    const handleSelect = (jokerId: number) => {
        if (selected !== null || me?.hasDrafted) return;
        setSelected(jokerId);
        onSelectJoker(jokerId);
    };

    if (me?.hasDrafted || selected !== null) {
        return (
            <main className="min-h-screen text-[#F6F5F2] flex flex-col items-center justify-center p-4">
                <div className="swiss-panel p-8 max-w-md w-full text-center">
                    <span className="inline-block w-3 h-3 bg-[#00E5A3] mb-3" />
                    <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-[#F6F5F2] mb-2">
                        YETENEK SEÇİLDİ
                    </h2>
                    <p className="text-[#A0A8B8] text-sm mb-4">
                        Diğer oyuncuların taktiksel kart seçimi tamamlaması bekleniyor...
                    </p>
                    <div className="inline-block bg-[#111318] border-2 border-[#2D3342] px-5 py-2 rounded-[4px] font-mono text-2xl font-bold text-[#FFBE0B] tnum">
                        {String(timeLeft).padStart(2, '0')}s
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen text-[#F6F5F2] flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
            {/* Header Bar */}
            <div className="w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4 mb-10 pb-5 border-b-2 border-[#2D3342] z-10">
                <div className="text-center sm:text-left">
                    <span className="swiss-label block mb-1">TAKTİKSEL DESTE SEÇİMİ</span>
                    <h1 className="font-display text-4xl md:text-5xl font-bold uppercase tracking-tight text-[#F6F5F2]">
                        JOKER KARTINI SEÇ
                    </h1>
                    <p className="text-sm md:text-base text-[#A0A8B8] mt-1">
                        Oyun boyunca 3. turdan itibaren kullanabileceğin gizli kozunu belirle.
                    </p>
                </div>
                <div className="bg-[#1A1D24] border-2 border-[#3E4659] rounded-[4px] px-6 py-3 text-center shadow-[4px_4px_0px_#090A0D] shrink-0">
                    <span className="swiss-label block">SEÇİM SÜRESİ</span>
                    <span className={`font-mono text-4xl font-bold tnum ${timeLeft <= 5 ? 'text-[#FF334B]' : 'text-[#FFBE0B]'}`}>
                        {String(timeLeft).padStart(2, '0')}s
                    </span>
                </div>
            </div>

            {/* Swiss Collector Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full z-10">
                {me?.jokerChoices?.map((jokerId, index) => {
                    const jMeta = JOKERS.find(j => j.id === jokerId);
                    if (!jMeta) return null;

                    let headerBg = "bg-[#A0A8B8] text-[#111318]";
                    let borderAccent = "border-[#A0A8B8]";
                    let btnClass = "swiss-btn-secondary";
                    let rarityLabel = "GÜMÜŞ SINIF";

                    if (jMeta.rarity === 'gold') {
                        headerBg = "bg-[#FFBE0B] text-[#111318]";
                        borderAccent = "border-[#FFBE0B]";
                        btnClass = "swiss-btn-primary";
                        rarityLabel = "ALTIN SINIF";
                    } else if (jMeta.rarity === 'prismatic') {
                        headerBg = "bg-[#FF5938] text-white";
                        borderAccent = "border-[#FF5938]";
                        btnClass = "swiss-btn-coral";
                        rarityLabel = "PRİZMATİK SINIF";
                    }

                    return (
                        <motion.div 
                            key={index}
                            initial={{ y: 24, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.25, delay: index * 0.08 }}
                            whileHover={{ y: -6 }}
                            onClick={() => handleSelect(jokerId)}
                            className={`bg-[#1A1D24] rounded-[6px] border-2 ${borderAccent} shadow-[6px_6px_0px_#090A0D] flex flex-col justify-between cursor-pointer overflow-hidden transition-shadow hover:shadow-[10px_10px_0px_#090A0D]`}
                        >
                            {/* Top Collector Strip */}
                            <div className={`${headerBg} px-4 py-2 border-b-2 border-[#090A0D] flex justify-between items-center`}>
                                <span className="font-mono text-xs font-bold uppercase tracking-widest">
                                    {rarityLabel}
                                </span>
                                <span className="font-mono text-xs font-bold tnum">
                                    #{String(jMeta.id + 1).padStart(2, '0')}
                                </span>
                            </div>

                            {/* Card Body */}
                            <div className="p-6 flex-1 flex flex-col justify-between">
                                <div>
                                    <div className="w-12 h-12 rounded-[4px] bg-[#111318] border-2 border-[#2D3342] flex items-center justify-center text-2xl mb-4">
                                        🃏
                                    </div>
                                    <h3 className="font-display text-2xl font-bold uppercase tracking-tight text-[#F6F5F2] mb-3">
                                        {jMeta.name}
                                    </h3>
                                    <p className="text-sm text-[#A0A8B8] leading-relaxed">
                                        {jMeta.desc}
                                    </p>
                                </div>

                                <div className="mt-6 pt-4 border-t border-[#2D3342] flex flex-wrap gap-2">
                                    {jMeta.requiresTarget && (
                                        <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 bg-[#111318] border border-[#2D3342] text-[#FFBE0B] rounded-[2px]">
                                            🎯 HEDEF SEÇİLİR
                                        </span>
                                    )}
                                    {jMeta.requiresWord && (
                                        <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 bg-[#111318] border border-[#2D3342] text-[#00E5A3] rounded-[2px]">
                                            📝 GİRDİ GEREKTİRİR
                                        </span>
                                    )}
                                    {!jMeta.requiresTarget && !jMeta.requiresWord && (
                                        <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 bg-[#111318] border border-[#2D3342] text-[#A0A8B8] rounded-[2px]">
                                            ⚡ ANINDA ETKİ
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Action Footer */}
                            <div className="p-4 pt-0">
                                <Button variant="contained" fullWidth className={`${btnClass} !py-3`}>
                                    BU KARTI SEÇ
                                </Button>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </main>
    );
}
