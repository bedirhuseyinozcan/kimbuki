"use client";

import { Button, Dialog, DialogContent, DialogTitle, InputAdornment, Link as MuiLink, Tab, Tabs, TextField } from "@mui/material";
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import { HomeUser, inputFieldSx } from "./types";

interface PlayAuthDialogProps {
    open: boolean;
    onClose: () => void;
    user: HomeUser | null;
    authTab: number;
    setAuthTab: (tab: number) => void;
    guestName: string;
    setGuestName: (val: string) => void;
    loginEmail: string;
    setLoginEmail: (val: string) => void;
    loginName: string;
    setLoginName: (val: string) => void;
    loginPassword: string;
    setLoginPassword: (val: string) => void;
    loginLoading: boolean;
    roomCode: string;
    setRoomCode: (val: string) => void;
    onGuestLogin: () => void;
    onAuth: () => void;
    onForgotPassword: () => void;
    onOpenProfile: () => void;
    onCreateRoom: () => void;
    onJoinRoom: () => void;
}

export default function PlayAuthDialog({
    open,
    onClose,
    user,
    authTab,
    setAuthTab,
    guestName,
    setGuestName,
    loginEmail,
    setLoginEmail,
    loginName,
    setLoginName,
    loginPassword,
    setLoginPassword,
    loginLoading,
    roomCode,
    setRoomCode,
    onGuestLogin,
    onAuth,
    onForgotPassword,
    onOpenProfile,
    onCreateRoom,
    onJoinRoom
}: PlayAuthDialogProps) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            slotProps={{
                paper: {
                    className: "!bg-[#1A1D24] !text-[#F6F5F2] !rounded-[6px] !border-2 !border-[#3E4659] !shadow-[8px_8px_0px_#090A0D] min-w-[320px] sm:min-w-[420px]"
                }
            }}
        >
            <DialogTitle className="font-display font-bold uppercase tracking-wider text-xl border-b-2 border-[#2D3342] py-4 px-6 flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[#FFBE0B] inline-block" />
                {user ? "MASAYA KATIL VEYA ODA KUR" : "OYUNCU GİRİŞİ"}
            </DialogTitle>
            <DialogContent className="p-6">
                {!user ? (
                    <div className="space-y-4 mt-2">
                        <Tabs
                            value={authTab}
                            onChange={(_, v) => setAuthTab(v)}
                            variant="fullWidth"
                            textColor="inherit"
                            slotProps={{ indicator: { style: { backgroundColor: '#FFBE0B', height: '3px' } } }}
                            className="mb-4 border-b-2 border-[#2D3342]"
                        >
                            <Tab label="GİRİŞ YAP" className="!font-display !font-bold !text-xs sm:!text-sm" />
                            <Tab label="KAYIT OL" className="!font-display !font-bold !text-xs sm:!text-sm" />
                            <Tab label="⚡ MİSAFİR" className="!font-display !font-bold !text-xs sm:!text-sm !text-[#00E5A3]" />
                        </Tabs>

                        {authTab === 2 ? (
                            <div className="space-y-4">
                                <div className="p-3 bg-[#00E5A3]/10 border-l-4 border-[#00E5A3] rounded-[4px] font-mono text-xs text-[#A0A8B8]">
                                    Kayıt olmadan 3 saniyede masaya otur ve sesli sohbete katıl. (Altın bahis ve mağaza için hesap gerekir.)
                                </div>
                                <TextField
                                    placeholder="Takma Adın (3-20 karakter)"
                                    size="small"
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") onGuestLogin();
                                    }}
                                    sx={inputFieldSx}
                                    slotProps={{
                                        input: {
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <PersonOutlineIcon sx={{ color: '#00E5A3', fontSize: 20 }} />
                                                </InputAdornment>
                                            )
                                        }
                                    }}
                                    fullWidth
                                />
                                <Button
                                    variant="contained"
                                    fullWidth
                                    size="large"
                                    disabled={loginLoading || guestName.trim().length < 3}
                                    onClick={onGuestLogin}
                                    className="swiss-btn-mint !py-3.5"
                                >
                                    {loginLoading ? "BAĞLANILIYOR..." : (roomCode.trim() ? `⚡ ${roomCode.trim().toUpperCase()} ODASINA KATIL` : "⚡ MİSAFİR OLARAK BAŞLA")}
                                </Button>
                            </div>
                        ) : (
                            <>
                                <TextField
                                    placeholder="E-posta adresiniz"
                                    type="email"
                                    size="small"
                                    value={loginEmail}
                                    onChange={(e) => setLoginEmail(e.target.value)}
                                    sx={inputFieldSx}
                                    slotProps={{
                                        input: {
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <EmailOutlinedIcon sx={{ color: '#A0A8B8', fontSize: 20 }} />
                                                </InputAdornment>
                                            )
                                        }
                                    }}
                                    fullWidth
                                />

                                {authTab === 1 && (
                                    <TextField
                                        placeholder="Kullanıcı Adı (Nick)"
                                        size="small"
                                        value={loginName}
                                        onChange={(e) => setLoginName(e.target.value)}
                                        sx={inputFieldSx}
                                        slotProps={{
                                            input: {
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <PersonOutlineIcon sx={{ color: '#A0A8B8', fontSize: 20 }} />
                                                    </InputAdornment>
                                                )
                                            }
                                        }}
                                        fullWidth
                                    />
                                )}

                                <div>
                                    <TextField
                                        placeholder="Şifre"
                                        type="password"
                                        size="small"
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") onAuth();
                                        }}
                                        sx={inputFieldSx}
                                        slotProps={{
                                            input: {
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <LockOutlinedIcon sx={{ color: '#A0A8B8', fontSize: 20 }} />
                                                    </InputAdornment>
                                                )
                                            }
                                        }}
                                        fullWidth
                                    />
                                    {authTab === 0 && (
                                        <div className="text-right mt-2">
                                            <MuiLink
                                                component="button"
                                                variant="body2"
                                                onClick={onForgotPassword}
                                                className="!font-mono !text-xs !text-[#A0A8B8] hover:!text-[#FFBE0B]"
                                                underline="hover"
                                            >
                                                Şifremi Unuttum?
                                            </MuiLink>
                                        </div>
                                    )}
                                </div>

                                <Button
                                    variant="contained"
                                    fullWidth
                                    size="large"
                                    disabled={loginLoading}
                                    onClick={onAuth}
                                    className="swiss-btn-primary !py-3.5 !mt-2"
                                >
                                    {loginLoading ? "İŞLENİYOR..." : (authTab === 0 ? "GİRİŞ YAP" : "HESAP OLUŞTUR")}
                                </Button>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6 mt-2">
                        <div className="bg-[#111318] p-4 rounded-[4px] border-2 border-[#2D3342] flex items-center justify-between">
                            <div>
                                <span className="swiss-label block">AKTİF OYUNCU</span>
                                <p className="font-display text-xl font-bold text-[#FFBE0B] uppercase">{user.username}</p>
                            </div>
                            <Button size="small" className="swiss-btn-secondary !px-3 !py-1 !text-xs" onClick={onOpenProfile}>
                                PROFİL
                            </Button>
                        </div>

                        <Button
                            variant="contained"
                            fullWidth
                            size="large"
                            onClick={onCreateRoom}
                            className="swiss-btn-primary !py-4 !text-base"
                        >
                            + YENİ MASA KUR
                        </Button>

                        <div className="relative flex items-center py-1">
                            <div className="flex-grow border-t-2 border-[#2D3342]"></div>
                            <span className="flex-shrink-0 mx-4 font-mono text-xs font-bold uppercase text-[#687082]">
                                VEYA KOD İLE KATIL
                            </span>
                            <div className="flex-grow border-t-2 border-[#2D3342]"></div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <TextField
                                placeholder="ODA KODU (ÖRN: A7B9K2)"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") onJoinRoom();
                                }}
                                sx={{
                                    input: {
                                        color: '#111318',
                                        backgroundColor: '#F4F1EA',
                                        textAlign: 'center',
                                        fontFamily: 'var(--font-mono)',
                                        fontWeight: 700,
                                        letterSpacing: '0.15em',
                                        textTransform: 'uppercase'
                                    },
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '4px',
                                        '& fieldset': { borderColor: '#090A0D', borderWidth: '2px' }
                                    }
                                }}
                                fullWidth
                            />
                            <Button
                                variant="outlined"
                                fullWidth
                                size="large"
                                onClick={onJoinRoom}
                                className="swiss-btn-mint !py-3.5"
                            >
                                ODAYA KATIL 🚀
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
