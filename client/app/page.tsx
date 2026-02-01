"use client";

import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";

type User = {
  id: string;
  name: string;
};

export default function Home() {
  const socket: Socket = useMemo(() => {
    return io("http://localhost:4000", {
      transports: ["websocket"],
    });
  }, []);

  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [joinedRoom, setJoinedRoom] = useState<string | null>(null);

  useEffect(() => {
    socket.on("room:users", (list: User[]) => {
      setUsers(list);
    });

    return () => {
      socket.disconnect();
    };
  }, [socket]);

  const createRoom = () => {
    if (!name.trim()) return alert("İsim gir");
    socket.emit("room:create", { name }, (res: any) => {
      if (!res?.ok) return alert("Oda oluşturulamadı");
      setJoinedRoom(res.roomCode);
    });
  };

  const joinRoom = () => {
    if (!name.trim()) return alert("İsim gir");
    if (!roomCode.trim()) return alert("Oda kodu gir");
    socket.emit(
      "room:join",
      { roomCode: roomCode.toUpperCase(), name },
      (res: any) => {
        if (!res?.ok) return alert(res?.error ?? "Katılamadı");
        setJoinedRoom(roomCode.toUpperCase());
      }
    );
  };

  return (
    <main style={{ maxWidth: 520, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>Ben Kimim? Futbol</h1>

      <input
        placeholder="İsmin"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div style={{ marginTop: 8 }}>
        <button onClick={createRoom}>Oda Oluştur</button>
      </div>

      <div style={{ marginTop: 8 }}>
        <input
          placeholder="Oda Kodu"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
        />
        <button onClick={joinRoom}>Katıl</button>
      </div>

      <hr />

      <div>
        <strong>Oda:</strong> {joinedRoom ?? "-"}
      </div>

      <ul>
        {users.map((u) => (
          <li key={u.id}>{u.name}</li>
        ))}
      </ul>
    </main>
  );
}
