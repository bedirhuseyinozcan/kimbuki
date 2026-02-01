"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";

// Global socket instance could be managed in a Context, 
// strictly for this rapid proto we might create it per usage or keep a singleton.
// For now, let's keep the logic simple and local or use a context if multiple pages need shared socket.
// Ideally, we move IO to a context provider. For now, we will handle connection in next pages logic.

export default function Home() {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const router = useRouter();

  const handleCreate = () => {
    if (!name.trim()) return alert("Lütfen ismini gir!");
    localStorage.setItem("username", name);

    // Create room via temp socket
    const socket = io("http://localhost:4000");
    socket.emit("room:create", { name }, (res: any) => {
      socket.disconnect();
      if (res.ok) {
        router.push(`/game/${res.roomCode}`);
      } else {
        alert("Oda oluşturulamadı!");
      }
    });
  };

  const handleJoin = () => {
    if (!name.trim()) return alert("Lütfen ismini gir!");
    if (!roomCode.trim()) return alert("Lütfen oda kodunu gir!");

    localStorage.setItem("username", name);
    // Directly go to game page, it will handle join
    router.push(`/game/${roomCode.toUpperCase()}`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="glass w-full max-w-md p-8 rounded-3xl shadow-2xl space-y-8 animate-fade-in-up">

        {/* Header / Logo */}
        <div className="space-y-2">
          <div className="text-6xl mb-2">⚽</div>
          <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-cyan-400">
            Ben Kimim?
          </h1>
          <p className="text-slate-400 text-lg">Futbol Efsaneleri</p>
        </div>

        {/* Name Input */}
        <div className="space-y-2 text-left">
          <label className="text-sm font-medium text-slate-300 ml-1">Kullanıcı Adı</label>
          <input
            className="input-field text-lg"
            placeholder="Nicknamem..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="grid gap-4">
          <button
            onClick={handleCreate}
            className="btn btn-primary w-full text-lg shadow-violet-500/20"
          >
            Yeni Oda Kur
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-700"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-2 text-slate-500">veya</span>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              className="input-field text-center uppercase tracking-widest font-mono"
              placeholder="ODA KODU"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
            />
            <button
              onClick={handleJoin}
              className="btn btn-secondary whitespace-nowrap"
            >
              Katıl 🚀
            </button>
          </div>
        </div>

      </div>
    </main>
  );
}
