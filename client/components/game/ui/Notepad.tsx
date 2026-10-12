import React from "react";
import { Chip } from "@mui/material";
import { User, GameState, JOKERS } from "../types";

interface NotepadProps {
    notepad: string;
    setNotepad: (val: string) => void;
    isNotepadOpen: boolean;
    onToggle: () => void;
    me: User;
    gameState: GameState;
}

export default function Notepad({
    notepad,
    setNotepad,
    isNotepadOpen,
    onToggle,
    me,
    gameState
}: NotepadProps) {
    const myJokerMeta = JOKERS.find(j => j.id === me?.joker);

    return (
        <div className="order-2 md:order-1 w-full md:w-1/4 md:max-w-[400px] md:self-start glass p-3 rounded-2xl flex flex-col border border-slate-700/50 pointer-events-auto shadow-2xl bg-slate-900/60 backdrop-blur-lg transition-all duration-300 h-auto max-h-[85vh] overflow-y-auto custom-scrollbar">
            <h3 onClick={onToggle} className="font-bold text-lg flex items-center justify-between gap-2 text-yellow-400 cursor-pointer select-none hover:text-yellow-300">
                <span className="flex items-center gap-2">📝 Not Defterim</span>
                <span className="text-sm bg-slate-800/80 px-2 py-1 rounded-lg">{isNotepadOpen ? '▲ Gizle' : '▼ Aç'}</span>
            </h3>
            {isNotepadOpen && (
                <textarea
                    placeholder="Örn: Gerçek bir insan mı? Yaşıyor mu?..."
                    value={notepad}
                    onChange={e => setNotepad(e.target.value)}
                    spellCheck="false"
                    className="w-full bg-yellow-900/20 rounded-xl text-slate-200 p-3 mt-2 border border-yellow-500/30 focus:border-yellow-500/60 outline-none resize-none h-[150px] md:h-[250px] custom-scrollbar shrink-0"
                />
            )}

            {myJokerMeta && (
                <div className={`mt-4 p-3 rounded-xl border ${me.hasUsedJoker ? 'bg-slate-800/50 border-slate-700/50 opacity-60' : (myJokerMeta.rarity === 'prismatic' ? 'bg-fuchsia-900/30 border-fuchsia-500/30' : myJokerMeta.rarity === 'gold' ? 'bg-amber-900/30 border-amber-500/30' : 'bg-slate-700/30 border-slate-400/30')}`}>
                    <h4 className={`font-bold text-sm flex items-center gap-1 mb-1 ${me.hasUsedJoker ? 'text-slate-400' : (myJokerMeta.rarity === 'prismatic' ? 'text-fuchsia-400' : myJokerMeta.rarity === 'gold' ? 'text-amber-400' : 'text-slate-200')}`}>
                        🃏 {myJokerMeta.name} {me.hasUsedJoker && <span className="text-red-400 text-xs ml-auto">(Kullanıldı)</span>}
                    </h4>
                    <p className="text-xs text-slate-300">{myJokerMeta.desc}</p>

                    {(me.shieldActive || (me.mirrorRoundsLeft ?? 0) > 0) && (
                        <div className="mt-2 flex flex-wrap gap-1.5 pt-2 border-t border-slate-700/50">
                            {me.shieldActive && (
                                <Chip size="small" label="🛡️ Gizli Kalkan Aktif" color="info" className="font-bold text-xs" />
                            )}
                            {(me.mirrorRoundsLeft ?? 0) > 0 ? (
                                <Chip size="small" label={`🪞 Ayna (${me.mirrorRoundsLeft} Tur)`} color="secondary" className="font-bold text-xs" />
                            ) : null}
                        </div>
                    )}
                </div>
            )}

            {me?.lastQuestions && me.lastQuestions.length > 0 && (
                <div className="mt-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar max-h-[300px] pr-2">
                    {me.lastQuestions.map((q: any, i: number) => (
                        <div key={i} className="p-3 rounded-xl border bg-cyan-900/30 border-cyan-500/30">
                            <h4 className="font-bold text-sm text-cyan-400 mb-1">{me.lastQuestions!.length > 1 ? `${i + 1}. Sorum` : 'Son Sorduğum Soru'}</h4>
                            <p className="text-sm font-bold text-slate-200 mb-2 break-words break-all">"{q.question}"</p>
                            <div className="flex gap-2 text-xs flex-wrap">
                                {Object.entries(q.votes).map(([voterId, vote]) => {
                                    const voter = gameState.users.find((u: any) => u.id === voterId);
                                    if (!voter) return null;
                                    const voteColor = vote === 'yes' ? 'text-green-400' : vote === 'no' ? 'text-red-400' : 'text-yellow-400';
                                    const voteText = vote === 'yes' ? 'Evet' : vote === 'no' ? 'Hayır' : 'Bazen';
                                    return (
                                        <div key={voterId} className="bg-slate-800/80 px-2 py-1 rounded border border-slate-700">
                                            <span className="text-slate-400 mr-1">{voter.name}:</span>
                                            <span className={`font-bold ${voteColor}`}>{voteText}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
