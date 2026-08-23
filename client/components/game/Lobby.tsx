import { Button, TextField, IconButton, Avatar, Chip, FormControlLabel, Switch } from "@mui/material";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CancelIcon from '@mui/icons-material/Cancel';
import LogoutIcon from '@mui/icons-material/Logout';
import { User, GameState, AVATARS } from "./types";

interface LobbyProps {
    gameState: GameState;
    me: User;
    code: string;
    inviteUrl: string;
    myId: string;
    onStart: () => void;
    onCloseRoom: () => void;
    onLeaveRoom: () => void;
    onCopyLink: () => void;
}

export default function Lobby({
    gameState, me, code, inviteUrl, myId, onStart, onCloseRoom, onLeaveRoom, onCopyLink, onSelectAvatar, onToggleVoice
}: LobbyProps & { onSelectAvatar: (id: number) => void, onToggleVoice: (enabled: boolean) => void }) {
    return (
        <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 relative">
            <div className="absolute top-4 right-4 flex gap-2">
                {me?.isHost && (
                    <Button variant="outlined" color="error" size="small" onClick={onCloseRoom} startIcon={<CancelIcon />}>
                        Odayı Kapat
                    </Button>
                )}
                <Button variant="contained" color="error" size="small" onClick={onLeaveRoom} startIcon={<LogoutIcon />} className="bg-red-500/20 text-red-400 border-red-500/50">
                    Çıkış Yap
                </Button>
            </div>

            <div className="glass max-w-xl w-full p-8 rounded-3xl text-center shadow-2xl">
                <h1 className="text-4xl font-black mb-2 bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-cyan-400">
                    Lobi
                </h1>
                <div className="text-5xl font-mono font-black text-slate-800 bg-slate-200 rounded-xl p-4 mb-6 tracking-[0.2em] select-all">
                    {code}
                </div>

                <div className="mb-8 flex items-center justify-center gap-2">
                    <TextField 
                        value={inviteUrl} 
                        slotProps={{ input: { readOnly: true, className: "text-slate-300 text-sm" } }}
                        size="small" 
                        className="bg-slate-800 rounded-lg"
                        fullWidth
                    />
                    <IconButton onClick={onCopyLink} color="primary" className="bg-slate-800 hover:bg-slate-700">
                        <ContentCopyIcon />
                    </IconButton>
                </div>
                <div className="mb-6 border-b border-slate-700 pb-6">
                    <p className="text-slate-400 text-sm mb-3">Rengini Seç:</p>
                    <div className="flex justify-center gap-3">
                        {AVATARS.map(av => (
                            <div 
                                key={av.id} 
                                onClick={() => onSelectAvatar(av.id)}
                                className={`w-10 h-10 rounded-full cursor-pointer transition-all ${av.color} 
                                    ${me?.avatar === av.id ? 'ring-4 ring-white scale-110 shadow-lg' : 'opacity-50 hover:opacity-100'}`}
                            />
                        ))}
                    </div>
                </div>

                <div className="mb-6 bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col items-center">
                    <FormControlLabel 
                        control={<Switch checked={me?.isVoiceEnabled || false} onChange={(e) => onToggleVoice(e.target.checked)} color="success" />} 
                        label="🎙️ Oyun İçi Sesli Sohbet (Mikrofon İzni Gerekir)" 
                        className="text-slate-200"
                    />
                    {me?.isVoiceEnabled && <p className="text-xs text-green-400 mt-1">Sesli sohbet açık! Kulaklık takmanız tavsiye edilir.</p>}
                </div>

                <div className="text-left space-y-3 mb-8">
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-sm border-b border-slate-700 pb-2">Oyuncular ({gameState.users.length})</p>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                        {gameState.users.map((u: User) => {
                            const userAvatar = AVATARS.find(a => a.id === u.avatar) || AVATARS[0];
                            return (
                                <div key={u.id} className="flex justify-between items-center bg-slate-800/80 p-3 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <Avatar className={userAvatar.color}>{u.name.charAt(0).toUpperCase()}</Avatar>
                                        <span className="font-bold text-lg">{u.name} {u.id === myId ? '(Sen)' : ''}</span>
                                        {u.isVoiceEnabled && <span title="Sesli Sohbet Açık" className="text-xl animate-pulse">🎤</span>}
                                    </div>
                                    {u.isHost && <Chip label="HOST" size="small" color="warning" variant="outlined" />}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {gameState.users.length < 2 ? (
                    <p className="text-red-400 animate-pulse font-medium">Oynamak için en az 2 kişi gerekli!</p>
                ) : (
                    me?.isHost ? (
                        <Button variant="contained" color="secondary" size="large" fullWidth onClick={onStart} className="py-3 text-lg font-bold rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600">
                            OYUNU BAŞLAT
                        </Button>
                    ) : (
                        <p className="text-slate-500 italic">Host'un başlatması bekleniyor...</p>
                    )
                )}
            </div>
        </main>
    );
}
