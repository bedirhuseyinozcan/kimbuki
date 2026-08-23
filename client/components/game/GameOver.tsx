import { Button } from "@mui/material";
import { User, GameState } from "./types";

interface GameOverProps {
    gameState: GameState;
    me: User;
    onStart: () => void;
    onLeaveRoom: () => void;
}

export default function GameOver({
    gameState, me, onStart, onLeaveRoom
}: GameOverProps) {
    return (
        <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 relative">
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="glass max-w-md w-full p-8 rounded-3xl text-center border-2 border-slate-600 animate-fade-in-up">
                    <h1 className="text-5xl font-black mb-4 text-cyan-400">OYUN BİTTİ!</h1>
                    <div className="space-y-4 mb-8">
                        <p className="text-xl text-slate-300 border-b border-slate-700 pb-2">Sonuçlar</p>
                        {gameState.users.map((u: User, i: number) => (
                            <div key={u.id} className="flex justify-between items-center text-lg">
                                <span className="font-bold">{i + 1}. {u.name}</span>
                                {gameState.winners.includes(u.id) ? (
                                    <span className="text-green-400 font-bold">Bildin: {u.assignedWord}</span>
                                ) : (
                                    <span className="text-red-400">Bilemedin: {u.assignedWord}</span>
                                )}
                            </div>
                        ))}
                    </div>
                    {me?.isHost && (
                        <Button variant="contained" color="primary" fullWidth size="large" onClick={onStart} className="py-3 rounded-xl">
                            Yeniden Başlat
                        </Button>
                    )}
                    <Button variant="outlined" color="inherit" fullWidth onClick={onLeaveRoom} className="mt-4 border-slate-600 text-slate-300">
                        Lobiden Ayrıl
                    </Button>
                </div>
            </div>
        </main>
    );
}
