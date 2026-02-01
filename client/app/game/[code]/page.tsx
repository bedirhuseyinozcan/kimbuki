"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";

type User = {
    id: string;
    name: string;
    isHost: boolean;
    score: number;
    votedFor: string | null;
};

export default function GamePage() {
    const { code } = useParams();
    const router = useRouter();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [gameState, setGameState] = useState<any>(null);
    const [imposterGuess, setImposterGuess] = useState("");

    useEffect(() => {
        const name = localStorage.getItem("username");
        if (!name) {
            router.push("/");
            return;
        }

        const s = io("http://localhost:4000");
        setSocket(s);

        s.emit("room:join", { roomCode: code, name }, (res: any) => {
            if (!res.ok) {
                alert("Hata: " + res.error);
                router.push("/");
            }
        });

        s.on("game:state", (state) => setGameState(state));

        return () => { s.disconnect(); };
    }, [code, router]);

    if (!gameState) return <div className="text-white text-center mt-20">Bağlanıyor...</div>;

    const myId = socket?.id;
    const me = gameState.users.find((u: User) => u.id === myId);
    const myRole = gameState.myRole;
    const isImposter = myRole === "imposter";

    const handleStart = () => socket?.emit("game:start");
    const handleVote = (targetId: string) => socket?.emit("game:vote", { targetId });
    const handleImposterGuess = () => {
        if (!imposterGuess.trim()) return;
        socket?.emit("game:imposter_guess", { guess: imposterGuess });
    };

    
    if (gameState.gameState === "LOBBY") {
        return (
            <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
                <div className="glass max-w-lg w-full p-8 rounded-3xl text-center">
                    <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-cyan-400">
                        Lobi
                    </h1>
                    <div className="text-6xl font-mono font-black text-slate-700 bg-slate-200 rounded-xl p-4 mb-8 tracking-widest select-all">
                        {code}
                    </div>

                    <div className="space-y-2 mb-8 text-left">
                        <p className="text-slate-400 text-sm uppercase font-bold">Oyuncular ({gameState.users.length})</p>
                        {gameState.users.map((u: User) => (
                            <div key={u.id} className="p-3 bg-slate-800 rounded-xl flex justify-between items-center">
                                <span>{u.name} {u.id === myId ? '(Sen)' : ''}</span>
                                {u.isHost && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">HOST</span>}
                            </div>
                        ))}
                    </div>

                    {gameState.users.length < 3 ? (
                        <p className="text-red-400 animate-pulse">En az 3 kişi gerekli!</p>
                    ) : (
                        me?.isHost && (
                            <button onClick={handleStart} className="btn btn-primary w-full text-xl shadow-xl hover:scale-105 transition-transform">
                                OYUNU BAŞLAT
                            </button>
                        )
                    )}
                    {!me?.isHost && <p className="text-slate-500">Host'un başlatması bekleniyor...</p>}
                </div>
            </main>
        );
    }

    
    return (
        <main className="min-h-screen bg-slate-900 text-white p-4 md:p-8 flex flex-col items-center">

            
            <div className={`w-full max-w-3xl p-6 rounded-3xl mb-8 border-2 shadow-2xl relative overflow-hidden transition-all duration-500 ${isImposter ? "border-red-500 bg-red-900/20" : "border-green-500 bg-green-900/20"
                }`}>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50"></div>

                <div className="text-center">
                    <p className="text-sm uppercase tracking-[0.2em] font-bold opacity-80 mb-2">GİZLİ KİMLİĞİN</p>
                    <h2 className={`text-4xl md:text-5xl font-black mb-4 ${isImposter ? 'text-red-500' : 'text-green-400'}`}>
                        {isImposter ? "IMPOSTER" : "HALK (CIVILIAN)"}
                    </h2>

                    {isImposter ? (
                        <div className="p-4 bg-black/30 rounded-xl">
                            <p className="text-lg">Kimliğini gizle! Diğerlerinin kimden bahsettiğini anla.</p>
                            <div className="mt-4 flex gap-2">
                                <input
                                    className="input-field bg-red-900/30 border-red-500/50 focus:border-red-400"
                                    placeholder="Futbolcuyu biliyor musun?"
                                    value={imposterGuess}
                                    onChange={e => setImposterGuess(e.target.value)}
                                />
                                <button onClick={handleImposterGuess} className="btn bg-red-600 hover:bg-red-500 text-white whitespace-nowrap">
                                    Tahmin Et & Kazan
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-black/30 rounded-xl">
                            <p className="text-sm text-slate-400 mb-1">GİZLİ FUTBOLCU</p>
                            <p className="text-3xl font-bold text-white bg-slate-800/50 inline-block px-6 py-2 rounded-lg border border-slate-700">
                                {gameState.targetPlayer?.name}
                            </p>
                            <p className="text-xs text-slate-500 mt-2">{gameState.targetPlayer?.team} • {gameState.targetPlayer?.position}</p>
                        </div>
                    )}
                </div>
            </div>

            
            <div className="w-full max-w-3xl glass p-6 rounded-3xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <span>Oylama Paneli</span>
                        <span className="text-xs font-normal text-slate-400">(Çoğunluk = Atılır)</span>
                    </h3>
                    <div className="text-slate-400 font-mono">{Math.floor(gameState.timeLeft / 60)}:{(gameState.timeLeft % 60).toString().padStart(2, '0')}</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {gameState.users.map((u: User) => (
                        <div key={u.id} className={`p-4 rounded-2xl border transition-all ${me?.votedFor === u.id ? "bg-red-500/20 border-red-500" : "bg-slate-800/50 border-slate-700"
                            } ${u.id === myId ? "opacity-50" : ""}`}>

                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-lg">
                                        {u.name[0].toUpperCase()}
                                    </div>
                                    <span className="font-bold">{u.name}</span>
                                </div>
                                {u.id !== myId && (
                                    <button
                                        onClick={() => handleVote(u.id)}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${me?.votedFor === u.id
                                                ? "bg-red-500 text-white hover:bg-red-600"
                                                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                            }`}
                                    >
                                        {me?.votedFor === u.id ? "OYUNU ÇEK" : "OY VER"}
                                    </button>
                                )}
                            </div>

                            
                            <div className="flex flex-wrap gap-1">
                                {gameState.users.filter((v: User) => v.votedFor === u.id).map((v: User) => (
                                    <span key={v.id} className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded border border-red-500/30">
                                        {v.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            
            {gameState.gameState === "ROUND_END" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
                    <div className="max-w-md w-full glass p-8 rounded-3xl text-center m-4 border-2 border-slate-600">
                        <p className="text-slate-400 uppercase tracking-widest mb-2">OYUN BİTTİ</p>
                        <h1 className={`text-5xl font-black mb-4 ${gameState.winner === 'imposter' ? "text-red-500" : "text-green-500"
                            }`}>
                            {gameState.winner === 'imposter' ? "IMPOSTER KAZANDI!" : "HALK KAZANDI!"}
                        </h1>
                        <p className="text-white text-lg mb-8">{gameState.reason}</p>

                        <div className="bg-slate-800 p-4 rounded-xl mb-6">
                            <p className="text-sm text-slate-400">Gizli Kelime</p>
                            <p className="text-2xl font-bold text-white">{gameState.targetPlayer?.name}</p>
                        </div>

                        <button onClick={() => window.location.reload()} className="btn btn-primary w-full shadow-xl">
                            Yeni Oyun
                        </button>
                    </div>
                </div>
            )}

        </main>
    );
}
