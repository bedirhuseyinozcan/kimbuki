"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";

type User = {
    id: string;
    name: string;
    isHost: boolean;
};

export default function LobbyPage() {
    const { code } = useParams();
    const router = useRouter();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [roomCode, setRoomCode] = useState<string>("");
    const initializing = useRef(false);

    useEffect(() => {
        if (initializing.current) return;
        initializing.current = true;

        const name = localStorage.getItem("username");
        if (!name) {
            router.push("/");
            return;
        }

        const s = io("http://localhost:4000");
        setSocket(s);

        if (code === "new") {
            s.emit("room:create", { name }, (res: any) => {
                if (res.ok) {
                    setRoomCode(res.roomCode);
                    
                    window.history.replaceState(null, "", `/lobby/${res.roomCode}`);
                } else {
                    alert("Oda oluşturulamadı");
                    router.push("/");
                }
            });
        } else {
            setRoomCode(code as string);
            s.emit("room:join", { roomCode: code, name }, (res: any) => {
                if (!res.ok) {
                    alert(res.error || "Odaya katılamadı");
                    router.push("/");
                }
            });
        }

        s.on("room:users", (list: User[]) => {
            setUsers(list);
        });

        s.on("game:state", (state: any) => {
            if (state.gameState === "PLAYING") {
                router.push(`/game/${state.roomCode || (code === 'new' ? roomCode : code)}`);
                
            }
        });

        return () => {
            s.disconnect();
        };
    }, [code, router]); 

    

    const handleStart = () => {
        socket?.emit("game:start");
    };

    const copyCode = () => {
        navigator.clipboard.writeText(roomCode);
        alert("Kopyalandı!");
    };

    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="glass max-w-2xl w-full p-6 rounded-3xl animate-fade-in text-center relative">
                <button
                    onClick={() => router.push("/")}
                    className="absolute left-4 top-4 text-slate-400 hover:text-white"
                >
                    ← Çık
                </button>

                <div className="mb-8">
                    <p className="text-slate-400 mb-2">ODA KODU</p>
                    <div
                        onClick={copyCode}
                        className="text-5xl font-mono font-black tracking-widest text-cyan-400 cursor-pointer hover:scale-105 transition-transform"
                    >
                        {roomCode || "..."}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Kopyalamak için tıkla</p>
                </div>

                <div className="bg-slate-800/50 rounded-2xl p-4 mb-8 min-h-[200px]">
                    <h2 className="text-xl font-bold mb-4 flex items-center justify-center gap-2">
                        <span>Oyuncular</span>
                        <span className="bg-violet-600 text-xs px-2 py-1 rounded-full">{users.length}</span>
                    </h2>

                    <ul className="space-y-2">
                        {users.map((u) => (
                            <li key={u.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${u.isHost ? 'bg-yellow-400' : 'bg-green-400'}`}></div>
                                    <span className="font-medium">{u.name}</span>
                                </div>
                                {u.isHost && <span className="text-xs text-yellow-400 border border-yellow-400/20 px-2 py-0.5 rounded">HOST</span>}
                            </li>
                        ))}
                        {users.length === 0 && <p className="text-slate-500">Bağlanıyor...</p>}
                    </ul>
                </div>

                {users.find(u => u.id === socket?.id)?.isHost ? (
                    <button onClick={handleStart} className="btn btn-primary w-full text-xl py-4 shadow-xl shadow-violet-500/20 animate-pulse">
                        OYUNU BAŞLAT
                    </button>
                ) : (
                    <div className="text-slate-400 animate-pulse">
                        Hostun başlatması bekleniyor...
                    </div>
                )}
            </div>
        </main>
    );
}
