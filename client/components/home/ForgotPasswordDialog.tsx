"use client";

import { Button, Dialog, DialogContent, DialogTitle, TextField } from "@mui/material";
import { inputFieldSx } from "./types";

interface ForgotPasswordDialogProps {
    open: boolean;
    onClose: () => void;
}

export default function ForgotPasswordDialog({ open, onClose }: ForgotPasswordDialogProps) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            slotProps={{
                paper: {
                    className: "!bg-[#1A1D24] !text-[#F6F5F2] !rounded-[6px] !border-2 !border-[#3E4659] !shadow-[8px_8px_0px_#090A0D] min-w-[320px] max-w-md"
                }
            }}
        >
            <DialogTitle className="font-display font-bold uppercase tracking-wider text-lg border-b-2 border-[#2D3342] py-4 px-6">
                ŞİFREMİ UNUTTUM
            </DialogTitle>
            <DialogContent className="p-6 space-y-4">
                <p className="text-[#A0A8B8] text-sm mt-2">
                    Kayıt olduğunuz e-posta adresinizi girin. Size bir şifre sıfırlama bağlantısı göndereceğiz.
                </p>
                <TextField
                    placeholder="E-posta adresiniz"
                    type="email"
                    size="small"
                    disabled
                    sx={inputFieldSx}
                    fullWidth
                />
                <div className="bg-[#FFBE0B]/10 border-l-4 border-[#FFBE0B] p-3 text-[#FFBE0B] font-mono text-xs">
                    ⚠️ BİLGİLENDİRME: Otomatik e-posta ile şifre sıfırlama servisi şu anda bakım aşamasındadır. Lütfen yönetici ile iletişime geçin.
                </div>
                <Button
                    variant="contained"
                    fullWidth
                    disabled
                    className="!py-3 !mt-2 !rounded-[4px] !bg-[#222630] !text-[#687082] !font-mono !font-bold"
                >
                    GEÇİCİ OLARAK DEVRE DIŞI
                </Button>
            </DialogContent>
        </Dialog>
    );
}
