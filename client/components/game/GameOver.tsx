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
        <main className="min-h-screen text-[#F6F5F2] flex flex-col items-center justify-center p-4 relative">
            <div className="fixed inset-0 z-50 bg-[#090A0D]/85 flex items-center justify-center p-4">
                <div className="swiss-panel max-w-lg w-full p-6 md:p-8">
                    <div className="border-b-2 border-[#2D3342] pb-4 mb-6 flex items-center justify-between">
                        <div>
                            <span className="swiss-label block mb-1">MAÇ SONU RAPORU</span>
                            <h1 className="font-display text-3xl md:text-4xl font-bold uppercase tracking-tight text-[#FFBE0B]">
                                OYUN BİTTİ
                            </h1>
                        </div>
                        <span className="text-4xl">🏁</span>
                    </div>

                    <div className="space-y-2.5 mb-6">
                        <div className="swiss-label mb-2">KİMLİK TABLOSU</div>
                        {gameState.users.map((u: User, i: number) => {
                            const isWinner = gameState.winners.includes(u.id);
                            return (
                                <div 
                                    key={u.id} 
                                    className={`flex justify-between items-center p-3 rounded-[4px] border-2 ${
                                        isWinner 
                                            ? 'bg-[#00E5A3]/10 border-[#00E5A3]' 
                                            : 'bg-[#111318] border-[#2D3342]'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-xs font-bold text-[#687082] tnum">
                                            #{String(i + 1).padStart(2, '0')}
                                        </span>
                                        <span className="font-display font-bold text-base text-[#F6F5F2]">
                                            {u.name}
                                        </span>
                                    </div>
                                    {isWinner ? (
                                        <span className="font-mono text-xs font-bold uppercase px-2.5 py-1 bg-[#00E5A3] text-[#111318] rounded-[2px] border border-[#090A0D]">
                                            ✓ BİLDİ: {u.assignedWord}
                                        </span>
                                    ) : (
                                        <span className="font-mono text-xs font-bold uppercase px-2.5 py-1 bg-[#FF334B]/15 text-[#FF334B] border border-[#FF334B] rounded-[2px]">
                                            ✗ {u.assignedWord}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {gameState.roundLogs && gameState.roundLogs.length > 0 && (
                        <div className="bg-[#111318] rounded-[4px] p-4 mb-6 text-left border-2 border-[#2D3342]">
                            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#FFBE0B] mb-2.5">
                                💸 KASA & BAHİS DAĞILIMI
                            </h3>
                            <ul className="space-y-1.5 text-xs font-mono text-[#A0A8B8]">
                                {gameState.roundLogs.map((log, idx) => (
                                    <li key={idx} className="leading-relaxed">• {log}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {!me?.dbId && (
                        <div className="mb-6 p-3.5 bg-[#FFBE0B]/10 border-2 border-[#FFBE0B] rounded-[4px] flex flex-col sm:flex-row items-center justify-between gap-3">
                            <span className="font-mono text-xs text-[#FFBE0B] font-bold">
                                ⚡ Misafir olarak oynuyorsun — altın ve itibar kazanmak için ücretsiz hesap aç!
                            </span>
                            <Button
                                size="small"
                                variant="contained"
                                onClick={onLeaveRoom}
                                className="swiss-btn-primary !px-3 !py-1.5 !text-xs shrink-0"
                            >
                                HESAP AÇ
                            </Button>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                        {me?.isHost && (
                            <Button 
                                variant="contained" 
                                fullWidth 
                                size="large" 
                                onClick={onStart} 
                                className="swiss-btn-primary !py-3"
                            >
                                🔄 YENİ EL BAŞLAT
                            </Button>
                        )}
                        <Button 
                            variant="outlined" 
                            fullWidth 
                            onClick={onLeaveRoom} 
                            className="swiss-btn-secondary !py-3"
                        >
                            LOBİDEN AYRIL
                        </Button>
                    </div>
                </div>
            </div>
        </main>
    );
}
