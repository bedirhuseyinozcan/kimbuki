"use client";

import { Button, Dialog, DialogContent, DialogTitle, TextField } from "@mui/material";
import { AVATARS, NAME_COLORS, PEDESTALS, TITLES, getRankInfo } from "@/components/game/types";
import { HomeUser, inputFieldSx } from "./types";

interface ProfileDialogProps {
    open: boolean;
    onClose: () => void;
    user: HomeUser | null;
    loginName: string;
    setLoginName: (val: string) => void;
    selectedAvatar: string;
    setSelectedAvatar: (val: string) => void;
    selectedPedestal: string;
    setSelectedPedestal: (val: string) => void;
    selectedNameColor: string;
    setSelectedNameColor: (val: string) => void;
    selectedTitle: string;
    setSelectedTitle: (val: string) => void;
    onSave: () => void;
    onLogout: () => void;
}

export default function ProfileDialog({
    open,
    onClose,
    user,
    loginName,
    setLoginName,
    selectedAvatar,
    setSelectedAvatar,
    selectedPedestal,
    setSelectedPedestal,
    selectedNameColor,
    setSelectedNameColor,
    selectedTitle,
    setSelectedTitle,
    onSave,
    onLogout
}: ProfileDialogProps) {
    const rank = getRankInfo(user?.rankInfo?.reputation || 0);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            slotProps={{
                paper: {
                    className: "!bg-[#1A1D24] !text-[#F6F5F2] !rounded-[6px] !border-2 !border-[#3E4659] !shadow-[8px_8px_0px_#090A0D] min-w-[320px] sm:min-w-[460px]"
                }
            }}
        >
            <DialogTitle className="font-display font-bold uppercase tracking-wider text-xl border-b-2 border-[#2D3342] py-4 px-6 flex items-center justify-between">
                <span>OYUNCU KİMLİĞİ & ENVANTER</span>
                <span className="font-mono text-xs text-[#FFBE0B]">PROFİL</span>
            </DialogTitle>
            <DialogContent className="p-6 space-y-5 custom-scrollbar">
                <div className="bg-[#111318] border-2 border-[#2D3342] p-4 rounded-[4px] flex flex-col items-center mt-2">
                    <span className="swiss-label mb-1">MEVCUT İTİBAR KADEMESİ</span>
                    <span className={`font-display text-2xl font-bold uppercase mb-3 flex items-center gap-2 ${rank.color}`}>
                        <span className="text-3xl">{rank.icon}</span>
                        {rank.title}
                    </span>
                    <div className="w-full flex flex-col items-center">
                        <div className="flex justify-between w-full font-mono text-[10px] font-bold uppercase text-[#A0A8B8] mb-1">
                            <span>İTİBAR PUANI</span>
                            <span className="tnum">{user?.rankInfo?.reputation || 0} / {user?.rankInfo?.nextThreshold || 'MAX'} RP</span>
                        </div>
                        <div className="w-full h-2.5 bg-[#1A1D24] rounded-[2px] overflow-hidden border border-[#2D3342]">
                            <div
                                className="h-full bg-[#FFBE0B]"
                                style={{ width: `${user?.rankInfo?.nextThreshold ? Math.min(100, ((user.rankInfo.reputation || 0) / user.rankInfo.nextThreshold) * 100) : 100}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="swiss-label block mb-2">KULLANICI ADI</label>
                    <TextField
                        size="small"
                        value={loginName}
                        onChange={(e) => setLoginName(e.target.value)}
                        sx={inputFieldSx}
                        fullWidth
                    />
                </div>

                <div>
                    <p className="swiss-label mb-2.5">3D KARAKTER SEÇİMİ:</p>
                    <div className="flex flex-wrap gap-2.5 max-h-[140px] overflow-y-auto custom-scrollbar p-1">
                        {user?.unlockedAvatars?.map(avId => {
                            const av = AVATARS.find(a => a.id === avId);
                            if (!av) return null;
                            const isSelected = selectedAvatar === av.id;
                            return (
                                <div
                                    key={av.id}
                                    onClick={() => setSelectedAvatar(av.id)}
                                    className={`w-12 h-12 rounded-[4px] border-2 cursor-pointer flex justify-center items-center transition-all ${av.color} ${
                                        isSelected
                                            ? 'border-[#FFBE0B] shadow-[3px_3px_0px_#FFBE0B] -translate-y-0.5'
                                            : 'border-[#090A0D] opacity-60 hover:opacity-100'
                                    }`}
                                    title={av.label}
                                >
                                    {av.icon ? (
                                        <span className="text-2xl flex items-center justify-center w-full h-full">{av.icon}</span>
                                    ) : (
                                        <span className="text-xl font-bold">{user.username.charAt(0).toUpperCase()}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <p className="swiss-label mb-2.5">PLATFORM (KAİDE) SEÇİMİ:</p>
                    <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto custom-scrollbar p-1">
                        {user?.unlockedPedestals?.map(pedId => {
                            const ped = PEDESTALS.find(p => p.id === pedId);
                            if (!ped) return null;
                            const isSelected = selectedPedestal === ped.id;
                            return (
                                <button
                                    key={ped.id}
                                    onClick={() => setSelectedPedestal(ped.id)}
                                    className={`px-3.5 py-2 rounded-[4px] border-2 font-mono text-xs font-bold uppercase cursor-pointer transition-all ${
                                        isSelected
                                            ? 'bg-[#FFBE0B] text-[#111318] border-[#090A0D] shadow-[2px_2px_0px_#090A0D]'
                                            : 'bg-[#111318] text-[#A0A8B8] border-[#2D3342] hover:border-[#3E4659]'
                                    }`}
                                >
                                    {ped.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <p className="swiss-label mb-2.5">İSİM RENGİ:</p>
                    <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto custom-scrollbar p-1">
                        {user?.unlockedNameColors?.map(colorId => {
                            const c = NAME_COLORS.find(x => x.id === colorId);
                            if (!c) return null;
                            const isSelected = selectedNameColor === c.id;
                            return (
                                <button
                                    key={c.id}
                                    onClick={() => setSelectedNameColor(c.id)}
                                    className={`px-3.5 py-2 rounded-[4px] border-2 font-mono text-xs font-bold uppercase cursor-pointer transition-all bg-[#111318] ${
                                        isSelected
                                            ? 'border-[#FFBE0B] shadow-[2px_2px_0px_#FFBE0B]'
                                            : 'border-[#2D3342] opacity-70 hover:opacity-100'
                                    }`}
                                >
                                    <span className={c.className}>{c.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <p className="swiss-label mb-2.5">ÖZEL ÜNVAN:</p>
                    <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto custom-scrollbar p-1">
                        {['', ...(user?.unlockedTitles || [])].map(titleId => {
                            const t = TITLES.find(x => x.id === titleId);
                            if (!t) return null;
                            const isSelected = selectedTitle === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setSelectedTitle(t.id)}
                                    className={`px-3.5 py-2 rounded-[4px] border-2 font-mono text-xs font-bold uppercase cursor-pointer transition-all ${
                                        isSelected
                                            ? 'bg-[#00E5A3] text-[#111318] border-[#090A0D] shadow-[2px_2px_0px_#090A0D]'
                                            : 'bg-[#111318] text-[#A0A8B8] border-[#2D3342] hover:border-[#3E4659]'
                                    }`}
                                >
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="pt-2 flex flex-col gap-2.5">
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={onSave}
                        className="swiss-btn-primary !py-3"
                    >
                        DEĞİŞİKLİKLERİ KAYDET
                    </Button>
                    <Button
                        variant="outlined"
                        fullWidth
                        onClick={onLogout}
                        className="!border-2 !border-[#FF334B] !text-[#FF334B] hover:!bg-[#FF334B] hover:!text-white !rounded-[4px] !font-mono !font-bold !py-2.5"
                    >
                        OTURUMU KAPAT
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
