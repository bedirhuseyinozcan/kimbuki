import { Button, TextField, Chip } from "@mui/material";
import { User, GameState } from "./types";

interface WordSelectionProps {
    gameState: GameState;
    me: User;
    wordInput: string;
    setWordInput: (val: string) => void;
    onSetWord: () => void;
    onLeaveRoom: () => void;
}

export default function WordSelection({
    gameState, me, wordInput, setWordInput, onSetWord, onLeaveRoom
}: WordSelectionProps) {
    const targetUser = gameState.users.find((u: User) => u.id === me?.targetId);

    return (
        <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 relative">
            <Button variant="outlined" color="inherit" size="small" onClick={onLeaveRoom} className="absolute top-4 right-4 border-slate-700 text-slate-400">
                Odadan Ayrıl
            </Button>

            <div className="glass max-w-lg w-full p-8 rounded-3xl text-center shadow-2xl">
                <h2 className="text-3xl font-bold mb-6 text-cyan-400">Kelime Seçimi</h2>
                {me?.hasSubmittedWord ? (
                    <div className="py-8">
                        <p className="text-xl mb-4">Kelimeyi gönderdin!</p>
                        <p className="text-slate-400 animate-pulse">Diğer oyuncuların kelimelerini seçmesi bekleniyor...</p>
                    </div>
                ) : (
                    <div className="space-y-6 text-left">
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <p className="text-slate-400 text-sm mb-1">Şu oyuncu için bir kelime/isim belirle:</p>
                            <p className="text-2xl font-bold text-white">{targetUser?.name}</p>
                        </div>
                        <TextField 
                            fullWidth
                            label="Kafasında ne yazsın?"
                            variant="outlined"
                            value={wordInput}
                            onChange={(e) => setWordInput(e.target.value)}
                            slotProps={{ 
                                input: { className: "text-white text-lg bg-slate-800" },
                                inputLabel: { className: "text-slate-400" }
                            }}
                        />
                        <Button variant="contained" color="primary" fullWidth size="large" onClick={onSetWord} className="py-3">
                            Onayla
                        </Button>
                    </div>
                )}

                <div className="mt-8 pt-4 border-t border-slate-700 text-left">
                    <p className="text-sm text-slate-400 mb-2">Durum:</p>
                    <div className="flex flex-wrap gap-2">
                        {gameState.users.map((u: User) => (
                            <Chip key={u.id} label={u.name} color={u.hasSubmittedWord ? "success" : "default"} variant="outlined" />
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}
