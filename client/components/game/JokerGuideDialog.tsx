import React, { useState, useMemo } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Chip } from '@mui/material';
import { JOKERS } from './types';

interface JokerGuideDialogProps {
    open: boolean;
    onClose: () => void;
}

export default function JokerGuideDialog({ open, onClose }: JokerGuideDialogProps) {
    const [filter, setFilter] = useState<string>('all');

    const getRarityStyle = (rarity: string) => {
        switch (rarity) {
            case 'silver': return 'border-slate-300/80 bg-gradient-to-br from-slate-50 to-slate-200 text-slate-800 shadow-[0_4px_15px_-3px_rgba(148,163,184,0.4)]';
            case 'gold': return 'border-yellow-400/80 bg-gradient-to-br from-yellow-50 to-yellow-200/60 text-yellow-900 shadow-[0_4px_15px_-3px_rgba(234,179,8,0.4)]';
            case 'prismatic': return 'border-fuchsia-400/80 bg-gradient-to-br from-fuchsia-50 to-purple-200/60 text-fuchsia-900 shadow-[0_4px_15px_-3px_rgba(217,70,239,0.4)]';
            default: return 'border-gray-300 bg-gray-50 text-gray-700';
        }
    };

    const getRarityLabel = (rarity: string) => {
        switch (rarity) {
            case 'silver': return '⚪ Gümüş';
            case 'gold': return '🟡 Altın';
            case 'prismatic': return '✨ Prizmatik';
            default: return 'Normal';
        }
    };

    const filteredJokers = useMemo(() => {
        const rarityOrder: Record<string, number> = { 'silver': 1, 'gold': 2, 'prismatic': 3 };
        const sorted = [...JOKERS].sort((a, b) => rarityOrder[a.rarity] - rarityOrder[b.rarity]);
        return filter === 'all' ? sorted : sorted.filter(j => j.rarity === filter);
    }, [filter]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { className: "!bg-slate-50 !text-slate-900 !rounded-3xl" } }}>
            <DialogTitle className="text-center font-black text-2xl border-b pb-4 text-slate-800 pt-6">
                🃏 Joker Rehberi
            </DialogTitle>
            <DialogContent className="p-4 md:p-6 custom-scrollbar">
                <p className="text-slate-500 text-sm mb-6 text-center font-medium">
                    Oyunda kullanabileceğiniz tüm jokerlerin özellikleri ve nadirlik seviyeleri aşağıda listelenmiştir.
                </p>

                <div className="flex justify-center gap-2 mb-6 flex-wrap">
                    <button onClick={() => setFilter('all')} className={`px-4 py-1.5 rounded-full text-sm font-bold border-2 transition-all shadow-sm ${filter === 'all' ? 'bg-slate-800 border-slate-800 text-white shadow-md scale-105' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}>Tümü</button>
                    <button onClick={() => setFilter('silver')} className={`px-4 py-1.5 rounded-full text-sm font-bold border-2 transition-all shadow-sm ${filter === 'silver' ? 'bg-slate-500 border-slate-500 text-white shadow-md scale-105' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}>Gümüş</button>
                    <button onClick={() => setFilter('gold')} className={`px-4 py-1.5 rounded-full text-sm font-bold border-2 transition-all shadow-sm ${filter === 'gold' ? 'bg-yellow-500 border-yellow-500 text-white shadow-md scale-105' : 'bg-white border-yellow-200 text-yellow-600 hover:border-yellow-300 hover:bg-yellow-50'}`}>Altın</button>
                    <button onClick={() => setFilter('prismatic')} className={`px-4 py-1.5 rounded-full text-sm font-bold border-2 transition-all shadow-sm ${filter === 'prismatic' ? 'bg-fuchsia-500 border-fuchsia-500 text-white shadow-md scale-105' : 'bg-white border-fuchsia-200 text-fuchsia-600 hover:border-fuchsia-300 hover:bg-fuchsia-50'}`}>Prizmatik</button>
                </div>

                <div className="flex flex-col gap-4">
                    {filteredJokers.map(joker => (
                        <div key={joker.id} className={`p-5 rounded-2xl border-2 flex flex-col gap-3 transition-all duration-300 hover:scale-[1.02] ${getRarityStyle(joker.rarity)} relative overflow-hidden`}>
                            {/* Parlama Efekti */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none"></div>
                            
                            <div className="flex justify-between items-center gap-2 flex-wrap relative z-10">
                                <h4 className="font-black text-lg tracking-tight">{joker.name}</h4>
                                <Chip 
                                    label={getRarityLabel(joker.rarity)} 
                                    size="small" 
                                    className={`font-bold shadow-sm ${
                                        joker.rarity === 'silver' ? '!bg-white/80 !text-slate-700 !border-slate-300 border' : 
                                        joker.rarity === 'gold' ? '!bg-yellow-500 !text-white !border-yellow-600 border' : 
                                        '!bg-fuchsia-500 !text-white !border-fuchsia-600 border'
                                    }`} 
                                />
                            </div>
                            <p className="text-sm font-semibold opacity-80 leading-relaxed relative z-10">
                                {joker.desc}
                            </p>
                            <div className="flex gap-2 mt-1 relative z-10">
                                {joker.requiresTarget && <span className="text-[10px] uppercase font-black tracking-wider bg-black/5 text-inherit border border-black/10 px-2 py-0.5 rounded-md shadow-sm">🎯 Hedef Seçilir</span>}
                                {joker.requiresWord && <span className="text-[10px] uppercase font-black tracking-wider bg-black/5 text-inherit border border-black/10 px-2 py-0.5 rounded-md shadow-sm">📝 Kelime Yazılır</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
            <DialogActions className="p-4 md:p-6 border-t bg-slate-100/50">
                <Button onClick={onClose} variant="contained" className="!rounded-xl font-black px-8 py-2.5 !bg-slate-800 hover:!bg-slate-900 shadow-lg w-full md:w-auto">
                    Kapat
                </Button>
            </DialogActions>
        </Dialog>
    );
}
