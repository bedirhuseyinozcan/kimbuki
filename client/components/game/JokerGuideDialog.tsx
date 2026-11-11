import React, { useState, useMemo } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { JOKERS } from './types';

interface JokerGuideDialogProps {
    open: boolean;
    onClose: () => void;
}

export default function JokerGuideDialog({ open, onClose }: JokerGuideDialogProps) {
    const [filter, setFilter] = useState<string>('all');

    const getRarityStyle = (rarity: string) => {
        switch (rarity) {
            case 'silver': return 'border-[#A0A8B8] bg-[#222630]';
            case 'gold': return 'border-[#FFBE0B] bg-[#222630]';
            case 'prismatic': return 'border-[#FF5938] bg-[#222630]';
            default: return 'border-[#2D3342] bg-[#1A1D24]';
        }
    };

    const getRarityBadge = (rarity: string) => {
        switch (rarity) {
            case 'silver': return { label: 'GÜMÜŞ', classes: 'bg-[#A0A8B8] text-[#111318]' };
            case 'gold': return { label: 'ALTIN', classes: 'bg-[#FFBE0B] text-[#111318]' };
            case 'prismatic': return { label: 'PRİZMATİK', classes: 'bg-[#FF5938] text-white' };
            default: return { label: 'STANDART', classes: 'bg-[#2D3342] text-white' };
        }
    };

    const filteredJokers = useMemo(() => {
        const rarityOrder: Record<string, number> = { 'silver': 1, 'gold': 2, 'prismatic': 3 };
        const sorted = [...JOKERS].sort((a, b) => rarityOrder[a.rarity] - rarityOrder[b.rarity]);
        return filter === 'all' ? sorted : sorted.filter(j => j.rarity === filter);
    }, [filter]);

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            maxWidth="sm" 
            fullWidth 
            slotProps={{ 
                paper: { 
                    className: "!bg-[#1A1D24] !text-[#F6F5F2] !rounded-[6px] !border-2 !border-[#3E4659] !shadow-[8px_8px_0px_#090A0D]" 
                } 
            }}
        >
            <DialogTitle className="font-display font-bold uppercase tracking-wider text-xl border-b-2 border-[#2D3342] py-4 px-6 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 bg-[#FF5938] inline-block" />
                    <span>TAKTİKSEL JOKER KATALOĞU</span>
                </div>
                <span className="font-mono text-xs text-[#A0A8B8] tnum">{filteredJokers.length} KART</span>
            </DialogTitle>
            <DialogContent className="p-5 md:p-6 custom-scrollbar bg-[#111318]">
                <p className="text-[#A0A8B8] text-xs font-mono uppercase tracking-wider mb-5">
                    Masadaki dengeleri değiştiren özel yetenek kartları ve nadirlik sınıfları:
                </p>

                <div className="grid grid-cols-4 gap-2 mb-6">
                    {[
                        { id: 'all', label: 'TÜMÜ', activeBg: 'bg-[#F6F5F2] text-[#111318] border-[#090A0D]' },
                        { id: 'silver', label: 'GÜMÜŞ', activeBg: 'bg-[#A0A8B8] text-[#111318] border-[#090A0D]' },
                        { id: 'gold', label: 'ALTIN', activeBg: 'bg-[#FFBE0B] text-[#111318] border-[#090A0D]' },
                        { id: 'prismatic', label: 'PRİZMATİK', activeBg: 'bg-[#FF5938] text-white border-[#090A0D]' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilter(tab.id)}
                            className={`py-2 px-3 rounded-[4px] font-mono text-xs font-bold uppercase tracking-wider border-2 transition-all cursor-pointer ${
                                filter === tab.id 
                                    ? `${tab.activeBg} shadow-[2px_2px_0px_#090A0D]` 
                                    : 'bg-[#1A1D24] border-[#2D3342] text-[#A0A8B8] hover:border-[#3E4659] hover:text-[#F6F5F2]'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col gap-3.5">
                    {filteredJokers.map(joker => {
                        const badge = getRarityBadge(joker.rarity);
                        return (
                            <div 
                                key={joker.id} 
                                className={`p-4 rounded-[4px] border-2 flex flex-col gap-2 shadow-[4px_4px_0px_#090A0D] ${getRarityStyle(joker.rarity)}`}
                            >
                                <div className="flex justify-between items-center gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-bold text-[#687082] tnum">
                                            #{String(joker.id + 1).padStart(2, '0')}
                                        </span>
                                        <h4 className="font-display font-bold text-base uppercase tracking-wide text-[#F6F5F2]">
                                            {joker.name}
                                        </h4>
                                    </div>
                                    <span className={`font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-[2px] border border-[#090A0D] ${badge.classes}`}>
                                        {badge.label}
                                    </span>
                                </div>
                                <p className="text-sm text-[#A0A8B8] leading-relaxed">
                                    {joker.desc}
                                </p>
                                {(joker.requiresTarget || joker.requiresWord) && (
                                    <div className="flex gap-2 mt-1 pt-2 border-t border-[#2D3342]">
                                        {joker.requiresTarget && (
                                            <span className="font-mono text-[10px] uppercase font-bold tracking-wider bg-[#111318] text-[#FFBE0B] border border-[#2D3342] px-2 py-0.5 rounded-[2px]">
                                                🎯 HEDEF OYUNCU SEÇİLİR
                                            </span>
                                        )}
                                        {joker.requiresWord && (
                                            <span className="font-mono text-[10px] uppercase font-bold tracking-wider bg-[#111318] text-[#00E5A3] border border-[#2D3342] px-2 py-0.5 rounded-[2px]">
                                                📝 KELİME / HARF GİRİLİR
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </DialogContent>
            <DialogActions className="p-4 px-6 border-t-2 border-[#2D3342] bg-[#1A1D24]">
                <Button onClick={onClose} className="swiss-btn-primary w-full md:w-auto !px-8 !py-2">
                    REHBERİ KAPAT
                </Button>
            </DialogActions>
        </Dialog>
    );
}
