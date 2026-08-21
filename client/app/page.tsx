"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TextField, Button } from "@mui/material";

export default function Home() {
  const [roomCode, setRoomCode] = useState("");
  const router = useRouter();

  const handleCreate = () => {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    router.push(`/game/${code}`);
  };

  const handleJoin = () => {
    if (!roomCode.trim()) return alert("Lütfen oda kodunu gir!");
    router.push(`/game/${roomCode.toUpperCase()}`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-slate-900 text-white">
      <div className="glass w-full max-w-sm p-8 rounded-3xl shadow-2xl space-y-8 animate-fade-in-up border border-slate-700">

        {/* Header / Logo */}
        <div className="space-y-2">
          <div className="text-6xl mb-2">⚽</div>
          <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-cyan-400">
            Ben Kimim?
          </h1>
          <p className="text-slate-400 text-lg">Futbol Efsaneleri</p>
        </div>

        <div className="grid gap-4 mt-8">
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreate}
            size="large"
            className="w-full text-lg shadow-violet-500/20 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 font-bold"
          >
            Yeni Oda Kur
          </Button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-700"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-3 text-slate-500 font-bold">veya</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <TextField
              size="small"
              placeholder="ODA KODU"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              slotProps={{ input: { className: "text-center uppercase tracking-widest font-mono text-white bg-slate-800 rounded-xl" } }}
              fullWidth
            />
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleJoin}
              size="large"
              className="w-full text-lg py-2 rounded-xl font-bold"
            >
              Katıl 🚀
            </Button>
          </div>
        </div>

      </div>
    </main>
  );
}
