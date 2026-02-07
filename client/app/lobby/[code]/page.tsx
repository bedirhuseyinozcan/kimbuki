"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function LobbyPage() {
    const { code } = useParams();
    const router = useRouter();
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        
        if (code === "new") {
            router.push("/");
            return;
        }

        const savedName = localStorage.getItem("username");
        if (savedName) {
            setName(savedName);
        }
        setIsLoading(false);
    }, [code, router]);

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        localStorage.setItem("username", name);
        router.push(`/game/${code}`);
    };

    if (isLoading) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
                <div className="animate-pulse">Yükleniyor...</div>
            </main>
        );
    }

    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="glass max-w-md w-full p-8 rounded-3xl animate-fade-in text-center relative">
                <button
                    onClick={() => router.push("/")}
                    className="absolute left-4 top-4 text-slate-400 hover:text-white"
                >
                    ← Çık
                </button>

                <h1 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
                    Odaya Katıl
                </h1>

                <div className="mb-6">
                    <p className="text-slate-400 text-sm mb-1">ODA KODU</p>
                    <p className="text-2xl font-mono font-bold tracking-widest text-cyan-400">
                        {code}
                    </p>
                </div>

                <form onSubmit={handleJoin} className="space-y-4">
                    <div>
                        <label className="block text-left text-sm text-slate-400 mb-1">Takma Adın</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="input-field w-full"
                            placeholder="Adını gir..."
                            maxLength={12}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary w-full py-3 text-lg"
                    >
                        Oyuna Gir
                    </button>
                </form>
            </div>
        </main>
    );
}
