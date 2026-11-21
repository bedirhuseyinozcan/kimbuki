"use client";

import { Button, Dialog, DialogContent, DialogTitle } from "@mui/material";
import { HomeUser } from "./types";

interface DailyRewardDialogProps {
    open: boolean;
    onClose: () => void;
    user: HomeUser | null;
    onClaimDaily: () => Promise<void>;
}

const DAILY_AMOUNTS = [50, 100, 150, 200, 250, 300, 500];

export default function DailyRewardDialog({ open, onClose, user, onClaimDaily }: DailyRewardDialogProps) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            slotProps={{
                paper: {
                    className: "!bg-[#1A1D24] !text-[#F6F5F2] !rounded-[6px] !border-2 !border-[#00E5A3] !shadow-[8px_8px_0px_#090A0D]"
                }
            }}
        >
            <DialogTitle className="font-display font-bold uppercase tracking-wider text-xl border-b-2 border-[#2D3342] py-4 px-6 flex items-center justify-between">
                <span>🎁 7 GÜNLÜK GİRİŞ SERİSİ</span>
                <span className="font-mono text-xs text-[#00E5A3] tnum">SERİ: {user?.loginStreak || 0} GÜN</span>
            </DialogTitle>
            <DialogContent className="p-6">
                <p className="text-[#A0A8B8] text-sm mb-6 mt-1">
                    Her gün oyuna girerek giriş serini koru ve artan altın ödüllerini topla!
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5">
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                        const amount = DAILY_AMOUNTS[day - 1];
                        const streak = user?.loginStreak || 0;
                        const effectiveStreak = user?.canClaimDaily && streak >= 7 ? 0 : streak;

                        let status = 'locked';
                        if (user?.canClaimDaily) {
                            if (day <= effectiveStreak) status = 'claimed';
                            else if (day === effectiveStreak + 1) status = 'current';
                        } else {
                            if (day <= streak) status = 'claimed';
                        }

                        let cardStyle = 'bg-[#111318] border-[#2D3342] text-[#687082]';
                        if (status === 'claimed') cardStyle = 'bg-[#00E5A3]/15 border-[#00E5A3] text-[#00E5A3]';
                        if (status === 'current') cardStyle = 'bg-[#FFBE0B] border-[#090A0D] text-[#111318] shadow-[3px_3px_0px_#090A0D] -translate-y-1';

                        return (
                            <div key={day} className={`flex flex-col items-center justify-between p-3 rounded-[4px] border-2 ${cardStyle} transition-all`}>
                                <span className="font-mono text-[10px] font-bold uppercase">{day}. GÜN</span>
                                <span className="text-xl my-2">
                                    {status === 'claimed' ? '✓' : status === 'locked' ? '🔒' : '🎁'}
                                </span>
                                <span className="font-mono text-xs font-bold tnum">{amount}G</span>
                            </div>
                        );
                    })}
                </div>

                <Button
                    variant="contained"
                    fullWidth
                    disabled={!user?.canClaimDaily}
                    onClick={async () => {
                        await onClaimDaily();
                        onClose();
                    }}
                    className={`!py-3.5 !mt-6 ${user?.canClaimDaily ? 'swiss-btn-mint' : '!bg-[#111318] !text-[#687082] !border-2 !border-[#2D3342] !font-mono !font-bold'}`}
                >
                    {user?.canClaimDaily ? 'GÜNLÜK ÖDÜLÜ TOPLA' : 'BUGÜNÜN ÖDÜLÜ ALINDI'}
                </Button>
            </DialogContent>
        </Dialog>
    );
}
