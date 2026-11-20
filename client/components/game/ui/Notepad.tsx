import React from "react";
import { User, GameState, JOKERS, ResolvedQuestion } from "../types";
import { useGameNotepad } from "@/context/GameContext";

interface NotepadProps {
    notepad?: string;
    setNotepad?: (val: string) => void;
    isNotepadOpen: boolean;
    onToggle: () => void;
    me?: User;
    gameState?: GameState;
}

export default function Notepad(props: NotepadProps) {
    const ctx = useGameNotepad();
    const notepad = props.notepad ?? ctx.notepad;
    const setNotepad = props.setNotepad ?? ctx.setNotepad;
    const me = props.me ?? ctx.me;
    const gameState = props.gameState ?? ctx.gameState;
    const { isNotepadOpen, onToggle } = props;

    const myJokerMeta = JOKERS.find(j => j.id === me?.joker);

    return (
        <div className="order-2 md:order-1 w-full md:w-1/4 md:max-w-[380px] md:self-start swiss-panel p-3.5 flex flex-col pointer-events-auto transition-all duration-150 h-auto max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div 
                onClick={onToggle} 
                className="flex items-center justify-between gap-2 pb-2.5 border-b-2 border-[#2D3342] cursor-pointer select-none group"
            >
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-[#FFBE0B] inline-block" />
                    <span className="font-display font-bold text-sm uppercase tracking-wider text-[#F6F5F2] group-hover:text-[#FFBE0B] transition-colors">
                        DEDEKTİF NOT DEFTERİ
                    </span>
                </div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider bg-[#222630] border border-[#3E4659] px-2 py-0.5 rounded-[4px] text-[#A0A8B8]">
                    {isNotepadOpen ? 'GİZLE' : 'AÇ'}
                </span>
            </div>

            {isNotepadOpen && (
                <div className="mt-3 relative">
                    {/* Physical Yellow Legal Pad / Post-it Surface */}
                    <div className="bg-[#F4F1EA] border-2 border-[#090A0D] rounded-[4px] shadow-[3px_3px_0px_#090A0D] overflow-hidden">
                        <div className="bg-[#FFBE0B] border-b-2 border-[#090A0D] px-3 py-1 flex justify-between items-center">
                            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#111318]">
                                İPUÇLARI & ELEMELER
                            </span>
                            <span className="font-mono text-[10px] font-bold text-[#111318]">
                                #01
                            </span>
                        </div>
                        <textarea
                            placeholder="Örn: Gerçek bir insan mı? Yaşıyor mu? Sporcu değil..."
                            value={notepad}
                            onChange={e => setNotepad(e.target.value)}
                            spellCheck="false"
                            className="w-full bg-[#F4F1EA] text-[#111318] placeholder-[#687082] font-mono text-xs leading-relaxed p-3 outline-none resize-none h-[140px] md:h-[210px] custom-scrollbar shrink-0"
                            style={{
                                backgroundImage: ' repeating-linear-gradient(transparent, transparent 23px, #DED9CE 23px, #DED9CE 24px)',
                                lineHeight: '24px',
                                paddingTop: '4px'
                            }}
                        />
                    </div>
                </div>
            )}

            {myJokerMeta && (
                <div className={`mt-3.5 p-3 rounded-[4px] border-2 shadow-[3px_3px_0px_#090A0D] ${
                    me.hasUsedJoker 
                        ? 'bg-[#15181F] border-[#2D3342] opacity-60' 
                        : myJokerMeta.rarity === 'prismatic' 
                            ? 'bg-[#222630] border-[#FF5938]' 
                            : myJokerMeta.rarity === 'gold' 
                                ? 'bg-[#222630] border-[#FFBE0B]' 
                                : 'bg-[#222630] border-[#A0A8B8]'
                }`}>
                    <div className="flex items-center justify-between mb-1">
                        <span className={`font-display font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${
                            me.hasUsedJoker 
                                ? 'text-[#687082] line-through' 
                                : myJokerMeta.rarity === 'prismatic' 
                                    ? 'text-[#FF5938]' 
                                    : myJokerMeta.rarity === 'gold' 
                                        ? 'text-[#FFBE0B]' 
                                        : 'text-[#F6F5F2]'
                        }`}>
                            <span>🃏</span> {myJokerMeta.name}
                        </span>
                        <span className="font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-[2px] bg-[#111318] border border-[#2D3342] text-[#A0A8B8]">
                            {me.hasUsedJoker ? 'KULLANILDI' : myJokerMeta.rarity}
                        </span>
                    </div>
                    <p className="text-xs text-[#A0A8B8] leading-snug">{myJokerMeta.desc}</p>

                    {(me.shieldActive || (me.mirrorRoundsLeft ?? 0) > 0) && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5 pt-2 border-t border-[#2D3342]">
                            {me.shieldActive && (
                                <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 bg-[#00E5A3] text-[#111318] rounded-[2px] border border-[#090A0D]">
                                    🛡️ KALKAN AKTİF
                                </span>
                            )}
                            {(me.mirrorRoundsLeft ?? 0) > 0 ? (
                                <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 bg-[#FFBE0B] text-[#111318] rounded-[2px] border border-[#090A0D]">
                                    🪞 AYNA ({me.mirrorRoundsLeft} TUR)
                                </span>
                            ) : null}
                        </div>
                    )}
                </div>
            )}

            {me?.lastQuestions && me.lastQuestions.length > 0 && (
                <div className="mt-3.5 flex flex-col gap-2.5 overflow-y-auto custom-scrollbar max-h-[260px] pr-1">
                    <div className="swiss-label">SORU KAYITLARI</div>
                    {me.lastQuestions.map((q: ResolvedQuestion, i: number) => (
                        <div key={i} className="p-3 rounded-[4px] border-2 border-[#2D3342] bg-[#222630]">
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#FFBE0B]">
                                    SORU #{i + 1}
                                </span>
                            </div>
                            <p className="text-xs font-bold text-[#F6F5F2] mb-2.5 break-words">&ldquo;{q.question}&rdquo;</p>
                            <div className="flex gap-1.5 text-[11px] flex-wrap">
                                {Object.entries(q.votes).map(([voterId, vote]) => {
                                    const voter = gameState.users.find((u: User) => u.id === voterId);
                                    if (!voter) return null;
                                    const voteBadge = vote === 'yes' 
                                        ? 'bg-[#00E5A3]/15 border-[#00E5A3] text-[#00E5A3]' 
                                        : vote === 'no' 
                                            ? 'bg-[#FF334B]/15 border-[#FF334B] text-[#FF334B]' 
                                            : 'bg-[#FFBE0B]/15 border-[#FFBE0B] text-[#FFBE0B]';
                                    const voteText = vote === 'yes' ? 'EVET' : vote === 'no' ? 'HAYIR' : 'BAZEN';
                                    return (
                                        <div key={voterId} className={`px-2 py-0.5 rounded-[2px] border font-mono text-[10px] ${voteBadge}`}>
                                            <span className="text-[#F6F5F2] mr-1">{voter.name}:</span>
                                            <span className="font-bold">{voteText}</span>
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
