"use client";

import { Avatar, Button, Dialog, DialogContent, DialogTitle } from "@mui/material";
import { AVATARS, NAME_COLORS, TITLES, getRankInfo } from "@/components/game/types";
import { LeaderboardEntry } from "./types";

interface LeaderboardDialogProps {
    open: boolean;
    onClose: () => void;
    leaderboard: LeaderboardEntry[];
}

export default function LeaderboardDialog({ open, onClose, leaderboard }: LeaderboardDialogProps) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            slotProps={{
                paper: {
                    className: "!bg-[#1A1D24] !text-[#F6F5F2] !rounded-[6px] !border-2 !border-[#FFBE0B] !shadow-[8px_8px_0px_#090A0D]"
                }
            }}
        >
            <DialogTitle className="font-display font-bold uppercase tracking-wider text-xl border-b-2 border-[#2D3342] py-4 px-6 flex items-center justify-between">
                <span>🏆 ŞEREF KÜRSÜSÜ (LİDERLİK)</span>
                <span className="font-mono text-xs text-[#FFBE0B]">TOP OYUNCULAR</span>
            </DialogTitle>
            <DialogContent className="p-6 custom-scrollbar">
                <div className="space-y-2.5 mt-1">
                    {leaderboard.length === 0 ? (
                        <p className="text-center font-mono text-xs uppercase text-[#687082] py-6">HENÜZ SIRALAMA VERİSİ YOK.</p>
                    ) : (
                        leaderboard.map((u, index) => {
                            const avMeta = AVATARS.find(a => a.id === u.avatar);
                            const rankObj = getRankInfo(u.reputation || 0);
                            return (
                                <div
                                    key={u._id || u.username || index}
                                    className={`flex justify-between items-center p-3.5 rounded-[4px] border-2 ${
                                        index === 0
                                            ? 'bg-[#FFBE0B]/15 border-[#FFBE0B]'
                                            : index < 3
                                                ? 'bg-[#222630] border-[#3E4659]'
                                                : 'bg-[#111318] border-[#2D3342]'
                                    }`}
                                >
                                    <div className="flex items-center gap-3.5">
                                        <span className={`font-mono font-bold text-lg w-8 text-center tnum ${
                                            index === 0 ? 'text-[#FFBE0B]' : index === 1 ? 'text-[#F6F5F2]' : index === 2 ? 'text-[#FF5938]' : 'text-[#687082]'
                                        }`}>
                                            #{index + 1}
                                        </span>
                                        <Avatar className={`!rounded-[4px] !border-2 !border-[#090A0D] ${avMeta?.color || '!bg-[#3B82F6]'}`}>
                                            {avMeta?.icon ? <span className="text-xl flex items-center justify-center h-full w-full">{avMeta.icon}</span> : u.username.charAt(0).toUpperCase()}
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${rankObj.color}`}>
                                                {rankObj.icon} {rankObj.title}
                                            </span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {u.title && (
                                                    <span className="text-[10px] font-mono font-bold bg-[#1A1D24] border border-[#3E4659] px-1.5 py-0.5 rounded-[2px] text-[#F6F5F2]">
                                                        {TITLES.find(t => t.id === u.title)?.label || u.title}
                                                    </span>
                                                )}
                                                <span className={`font-display font-bold text-base leading-tight ${NAME_COLORS.find(c => c.id === u.nameColor)?.className || 'text-[#F6F5F2]'}`}>
                                                    {u.username}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="font-mono text-xs font-bold bg-[#111318] text-[#00E5A3] px-3 py-1 rounded-[4px] border border-[#00E5A3] tnum">
                                        ★ {u.reputation || 0}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
                <Button
                    variant="outlined"
                    fullWidth
                    onClick={onClose}
                    className="swiss-btn-secondary !mt-6 !py-2.5"
                >
                    TABLOYU KAPAT
                </Button>
            </DialogContent>
        </Dialog>
    );
}
