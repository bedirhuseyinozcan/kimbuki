"use client";

import { Button, Dialog, DialogContent, DialogTitle } from "@mui/material";
import { HomeUser, QuestItem } from "./types";

interface QuestsDialogProps {
    open: boolean;
    onClose: () => void;
    user: HomeUser | null;
    onClaimQuest: (questId: string) => void;
}

export default function QuestsDialog({ open, onClose, user, onClaimQuest }: QuestsDialogProps) {
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
                <span>📜 AKTİF GÖREVLER</span>
                <span className="font-mono text-xs text-[#00E5A3]">ÖDÜL KONTRATLARI</span>
            </DialogTitle>
            <DialogContent className="p-6 custom-scrollbar">
                <div className="space-y-3.5 mt-1">
                    {user?.quests?.map((quest: QuestItem) => {
                        const isCompleted = quest.progress >= quest.target;
                        return (
                            <div
                                key={quest.id}
                                className={`p-4 rounded-[4px] border-2 flex flex-col sm:flex-row gap-4 justify-between items-center ${
                                    quest.isClaimed
                                        ? 'bg-[#111318] border-[#2D3342] opacity-55'
                                        : isCompleted
                                            ? 'bg-[#00E5A3]/10 border-[#00E5A3]'
                                            : 'bg-[#111318] border-[#2D3342]'
                                }`}
                            >
                                <div className="flex-1 w-full text-left">
                                    <p className="font-display font-bold text-base uppercase text-[#F6F5F2]">{quest.title}</p>
                                    <p className="font-mono text-xs text-[#FFBE0B] font-bold mb-2.5 mt-0.5 tnum">
                                        ÖDÜL: +{quest.rewardGold} ALTIN & +{quest.rewardRep} İTİBAR
                                    </p>
                                    <div className="w-full h-2 bg-[#1A1D24] rounded-[2px] overflow-hidden border border-[#2D3342]">
                                        <div
                                            className={`h-full ${isCompleted ? 'bg-[#00E5A3]' : 'bg-[#FFBE0B]'}`}
                                            style={{ width: `${Math.min(100, (quest.progress / quest.target) * 100)}%` }}
                                        />
                                    </div>
                                    <p className="font-mono text-[11px] text-[#A0A8B8] mt-1 text-right tnum">
                                        {Math.min(quest.progress, quest.target)} / {quest.target}
                                    </p>
                                </div>
                                <Button
                                    variant="contained"
                                    disabled={!isCompleted || quest.isClaimed}
                                    onClick={() => onClaimQuest(quest.id)}
                                    className={`!whitespace-nowrap !px-4 !py-2 ${
                                        quest.isClaimed
                                            ? '!bg-[#222630] !text-[#687082] !font-mono !text-xs'
                                            : isCompleted
                                                ? 'swiss-btn-mint !text-xs'
                                                : '!bg-[#222630] !text-[#687082] !font-mono !text-xs'
                                    }`}
                                >
                                    {quest.isClaimed ? 'ALINDI' : (isCompleted ? 'ÖDÜLÜ AL' : 'DEVAM EDİYOR')}
                                </Button>
                            </div>
                        );
                    })}
                    {!user?.quests?.length && (
                        <p className="text-center font-mono text-xs uppercase text-[#687082] py-6">GÖREVLER YÜKLENİYOR...</p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
