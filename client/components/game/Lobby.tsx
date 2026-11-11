import { Button, TextField, IconButton, Avatar, FormControlLabel, Switch, Select, MenuItem } from "@mui/material";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CancelIcon from '@mui/icons-material/Cancel';
import LogoutIcon from '@mui/icons-material/Logout';
import { User, GameState, AVATARS, getRankInfo, NAME_COLORS, TITLES } from "./types";
import { useState } from "react";
import Logo from "@/components/Logo";

interface LobbyProps {
    gameState: GameState;
    me: User;
    code: string;
    inviteUrl: string;
    myId: string;
    onStart: (settings: { category: string, bettingEnabled: boolean, jokersEnabled: boolean, betAmount: number, theme: "day"|"night", map: string }) => void;
    onCloseRoom: () => void;
    onLeaveRoom: () => void;
    onCopyLink: () => void;
}

export default function Lobby({
    gameState, me, code, inviteUrl, myId, onStart, onCloseRoom, onLeaveRoom, onCopyLink, onSelectAvatar, onToggleVoice
}: LobbyProps & { onSelectAvatar: (id: number) => void, onToggleVoice: (enabled: boolean) => void }) {
    const [category, setCategory] = useState("Karışık");
    const [bettingEnabled, setBettingEnabled] = useState(false);
    const [betAmount, setBetAmount] = useState(50);
    const [jokersEnabled, setJokersEnabled] = useState(true); 
    const [theme, setTheme] = useState<"day" | "night">("day");
    const [map, setMap] = useState("floating_island__low_poly_vr.glb");

    return (
        <main className="min-h-screen text-[#F6F5F2] flex flex-col items-center justify-center p-4 md:p-8 relative">
            {/* Top Navigation Bar */}
            <div className="w-full max-w-5xl flex justify-between items-center mb-6 pb-4 border-b-2 border-[#2D3342]">
                <div className="flex items-center gap-3">
                    <Logo size="sm" />
                    <div>
                        <span className="font-display font-bold text-lg uppercase tracking-wider block leading-none">
                            OYUN LOBİSİ
                        </span>
                        <span className="font-mono text-[11px] text-[#A0A8B8] uppercase tracking-widest">
                            OTURUM HAZIRLIĞI
                        </span>
                    </div>
                </div>
                <div className="flex gap-2.5">
                    {me?.isHost && (
                        <Button 
                            variant="outlined" 
                            size="small" 
                            onClick={onCloseRoom} 
                            startIcon={<CancelIcon />}
                            className="!border-2 !border-[#FF334B] !text-[#FF334B] hover:!bg-[#FF334B] hover:!text-white !rounded-[4px] !font-mono !font-bold !text-xs !px-3 !py-1.5"
                        >
                            ODAYI KAPAT
                        </Button>
                    )}
                    <Button 
                        variant="contained" 
                        size="small" 
                        onClick={onLeaveRoom} 
                        startIcon={<LogoutIcon />} 
                        className="swiss-btn-secondary !px-3.5 !py-1.5 !text-xs"
                    >
                        AYRIL
                    </Button>
                </div>
            </div>

            {/* Main Swiss Grid Layout */}
            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Column: Ticket Code + Players Roster */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                    {/* Matchday Ticket Stub Card */}
                    <div className="swiss-panel p-6 relative overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b-2 border-[#2D3342]">
                            <div>
                                <span className="swiss-label block mb-1">ODA ERİŞİM KODU</span>
                                <p className="text-xs text-[#A0A8B8]">Arkadaşlarını davet etmek için kodu veya bağlantıyı paylaş.</p>
                            </div>
                            <div className="swiss-postit px-5 py-2.5 text-center select-all">
                                <span className="font-mono font-bold text-3xl tracking-[0.2em] text-[#111318] tnum">
                                    {code}
                                </span>
                            </div>
                        </div>

                        <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                            <TextField 
                                value={inviteUrl} 
                                slotProps={{ 
                                    input: { 
                                        readOnly: true, 
                                        className: "!text-[#F6F5F2] !font-mono !text-xs !bg-[#111318]" 
                                    } 
                                }}
                                size="small" 
                                fullWidth
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '4px',
                                        '& fieldset': { borderColor: '#2D3342', borderWidth: '2px' },
                                    }
                                }}
                            />
                            <Button 
                                onClick={onCopyLink} 
                                startIcon={<ContentCopyIcon fontSize="small" />}
                                className="swiss-btn-primary !px-5 !py-2 shrink-0"
                            >
                                LİNKİ KOPYALA
                            </Button>
                        </div>

                        {/* Voice Chat Switch Bar */}
                        <div className="mt-5 bg-[#111318] p-3.5 rounded-[4px] border-2 border-[#2D3342] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <FormControlLabel 
                                control={
                                    <Switch 
                                        checked={me?.isVoiceEnabled || false} 
                                        onChange={(e) => onToggleVoice(e.target.checked)} 
                                        color="success" 
                                    />
                                } 
                                label={
                                    <span className="font-display font-bold text-xs uppercase tracking-wider text-[#F6F5F2]">
                                        🎙️ OYUN İÇİ SESLİ SOHBET (WEBRTC)
                                    </span>
                                }
                            />
                            {me?.isVoiceEnabled ? (
                                <span className="font-mono text-[11px] font-bold uppercase text-[#00E5A3] bg-[#00E5A3]/10 border border-[#00E5A3] px-2.5 py-0.5 rounded-[2px]">
                                    ● MİKROFON AKTİF
                                </span>
                            ) : (
                                <span className="font-mono text-[11px] font-bold uppercase text-[#687082]">
                                    ○ MİKROFON KAPALI
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Players Roster */}
                    <div className="swiss-panel p-6">
                        <div className="flex justify-between items-center border-b-2 border-[#2D3342] pb-3 mb-4">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 bg-[#00E5A3] inline-block" />
                                <h2 className="font-display font-bold text-base uppercase tracking-wider">
                                    MASADAKİ OYUNCULAR
                                </h2>
                            </div>
                            <span className="font-mono text-xs font-bold px-2.5 py-0.5 bg-[#222630] border border-[#3E4659] rounded-[2px] tnum">
                                {gameState.users.length} OYUNCU
                            </span>
                        </div>

                        <div className="space-y-2.5 max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
                            {gameState.users.map((u: User, idx: number) => {
                                const userAvatar = AVATARS.find(a => a.id === u.avatar) || AVATARS[0];
                                const rank = getRankInfo(u.reputation || 0);
                                return (
                                    <div 
                                        key={u.id} 
                                        className={`flex justify-between items-center p-3 rounded-[4px] border-2 ${
                                            u.id === myId 
                                                ? 'bg-[#222630] border-[#FFBE0B]' 
                                                : 'bg-[#111318] border-[#2D3342]'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3.5">
                                            <span className="font-mono text-xs font-bold text-[#687082] w-5 tnum">
                                                {String(idx + 1).padStart(2, '0')}
                                            </span>
                                            <Avatar className={`!rounded-[4px] !border-2 !border-[#090A0D] !w-11 !h-11 ${userAvatar.color}`}>
                                                {userAvatar.icon ? (
                                                    <span className="text-2xl flex items-center justify-center">{userAvatar.icon}</span>
                                                ) : (
                                                    u.name.charAt(0).toUpperCase()
                                                )}
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${rank.color}`}>
                                                        {rank.icon} {rank.title}
                                                    </span>
                                                    {u.title && (
                                                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] bg-[#1A1D24] text-[#F6F5F2] border border-[#3E4659]">
                                                            {TITLES.find(t => t.id === u.title)?.label || u.title}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className={`font-display font-bold text-base leading-tight mt-0.5 ${
                                                    u.nameColor ? (NAME_COLORS.find(c => c.id === u.nameColor)?.className || 'text-[#F6F5F2]') : 'text-[#F6F5F2]'
                                                }`}>
                                                    {u.name} {u.id === myId ? '(SEN)' : ''}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {u.isVoiceEnabled && (
                                                <span title="Sesli Sohbet Açık" className="text-sm bg-[#00E5A3]/15 border border-[#00E5A3] px-2 py-0.5 rounded-[2px]">
                                                    🎤
                                                </span>
                                            )}
                                            {u.disconnected && (
                                                <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 bg-[#FF334B] text-white rounded-[2px]">
                                                    KOPTU
                                                </span>
                                            )}
                                            {u.isHost && (
                                                <span className="font-mono text-[10px] font-bold uppercase px-2.5 py-1 bg-[#FFBE0B] text-[#111318] border border-[#090A0D] rounded-[2px]">
                                                    KURUCU
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Column: Match Configuration Console */}
                <div className="lg:col-span-5 swiss-panel p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 border-b-2 border-[#2D3342] pb-3 mb-5">
                            <span className="w-2.5 h-2.5 bg-[#FF5938] inline-block" />
                            <h2 className="font-display font-bold text-base uppercase tracking-wider">
                                MAÇ KURALLARI & SAHNE
                            </h2>
                        </div>

                        {me?.isHost ? (
                            <div className="space-y-5">
                                <div>
                                    <label className="swiss-label block mb-2">KELİME KATEGORİSİ</label>
                                    <Select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        size="small"
                                        fullWidth
                                        className="!bg-[#111318] !text-[#F6F5F2] !font-display !font-bold"
                                        sx={{ 
                                            color: '#F6F5F2', 
                                            borderRadius: '4px',
                                            '.MuiOutlinedInput-notchedOutline': { borderColor: '#2D3342', borderWidth: '2px' },
                                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#3E4659' },
                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#FFBE0B' },
                                            '.MuiSvgIcon-root': { fill: '#F6F5F2' }
                                        }}
                                    >
                                        <MenuItem value="Karışık">🎲 Karışık (Standart)</MenuItem>
                                        <MenuItem value="Ünlüler">⭐ Ünlüler</MenuItem>
                                        <MenuItem value="Hayvanlar">🐾 Hayvanlar</MenuItem>
                                        <MenuItem value="Tarihi Kişiler">📜 Tarihi Kişiler</MenuItem>
                                        <MenuItem value="Filmler / Diziler">🎬 Filmler / Diziler</MenuItem>
                                    </Select>
                                </div>

                                <div className="p-3.5 bg-[#111318] rounded-[4px] border-2 border-[#2D3342] space-y-3">
                                    <div className="flex items-center justify-between">
                                        <FormControlLabel 
                                            control={<Switch checked={bettingEnabled} onChange={(e) => setBettingEnabled(e.target.checked)} color="warning" />} 
                                            label={<span className="font-display font-bold text-sm uppercase">💰 ALTIN BAHİS MODU</span>}
                                        />
                                        {bettingEnabled && (
                                            <Select
                                                value={betAmount}
                                                onChange={(e) => setBetAmount(e.target.value as number)}
                                                size="small"
                                                className="!bg-[#1A1D24] !text-[#FFBE0B] !font-mono !font-bold min-w-[125px]"
                                                sx={{
                                                    borderRadius: '4px',
                                                    '.MuiOutlinedInput-notchedOutline': { borderColor: '#FFBE0B', borderWidth: '2px' },
                                                    '.MuiSvgIcon-root': { fill: '#FFBE0B' }
                                                }}
                                            >
                                                <MenuItem value={50}>50 ALTIN</MenuItem>
                                                <MenuItem value={100}>100 ALTIN</MenuItem>
                                                <MenuItem value={250}>250 ALTIN</MenuItem>
                                                <MenuItem value={500}>500 ALTIN (VIP)</MenuItem>
                                            </Select>
                                        )}
                                    </div>
                                    <div className="border-t border-[#2D3342] pt-2">
                                        <FormControlLabel 
                                            control={<Switch checked={jokersEnabled} onChange={(e) => setJokersEnabled(e.target.checked)} color="warning" />} 
                                            label={<span className="font-display font-bold text-sm uppercase">🃏 TAKTİKSEL JOKER KARTLARI</span>}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="swiss-label block mb-2">3D HARİTA SEÇİMİ</label>
                                        <Select
                                            value={map}
                                            onChange={(e) => setMap(e.target.value)}
                                            variant="outlined"
                                            size="small"
                                            fullWidth
                                            className="!bg-[#111318] !text-[#F6F5F2] !font-bold"
                                            sx={{ 
                                                color: '#F6F5F2', 
                                                borderRadius: '4px',
                                                '.MuiOutlinedInput-notchedOutline': { borderColor: '#2D3342', borderWidth: '2px' },
                                                '.MuiSvgIcon-root': { fill: '#F6F5F2' }
                                            }}
                                        >
                                            <MenuItem value="floating_island__low_poly_vr.glb">🏝️ Uçan Ada</MenuItem>
                                            <MenuItem value="snow.glb">❄️ Karlı Zirve</MenuItem>
                                            <MenuItem value="desert.glb">🏜️ Kurak Çöl</MenuItem>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="swiss-label block mb-2">ATMOSFER SAATİ</label>
                                        <Select
                                            value={theme}
                                            onChange={(e) => setTheme(e.target.value as "day" | "night")}
                                            variant="outlined"
                                            size="small"
                                            fullWidth
                                            className="!bg-[#111318] !text-[#F6F5F2] !font-bold"
                                            sx={{ 
                                                color: '#F6F5F2', 
                                                borderRadius: '4px',
                                                '.MuiOutlinedInput-notchedOutline': { borderColor: '#2D3342', borderWidth: '2px' },
                                                '.MuiSvgIcon-root': { fill: '#F6F5F2' }
                                            }}
                                        >
                                            <MenuItem value="day">☀️ Gündüz</MenuItem>
                                            <MenuItem value="night">🌙 Gece</MenuItem>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 bg-[#111318] border-2 border-[#2D3342] rounded-[4px] text-center space-y-2 my-4">
                                <span className="font-mono text-xs uppercase tracking-widest text-[#FFBE0B] block">
                                    BEKLEME DURUMU
                                </span>
                                <p className="text-sm text-[#A0A8B8]">
                                    Oda kurucusu maç ayarlarını yapılandırıyor. Birazdan oyun başlayacak...
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 pt-5 border-t-2 border-[#2D3342]">
                        {gameState.users.length < 2 ? (
                            <div className="p-3.5 bg-[#FF334B]/15 border-2 border-[#FF334B] rounded-[4px] text-center">
                                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#FF334B]">
                                    ⚠️ MAÇI BAŞLATMAK İÇİN EN AZ 2 OYUNCU GEREKLİ
                                </span>
                            </div>
                        ) : me?.isHost ? (
                            <Button 
                                variant="contained" 
                                size="large" 
                                fullWidth 
                                onClick={() => onStart({ category, bettingEnabled, jokersEnabled, betAmount, theme, map })} 
                                className="swiss-btn-primary !py-4 !text-lg"
                            >
                                🚀 MAÇI BAŞLAT
                            </Button>
                        ) : null}
                    </div>
                </div>
            </div>
        </main>
    );
}
