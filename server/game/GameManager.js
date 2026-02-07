const Room = require("./Room");

class GameManager {
    constructor(io) {
        this.io = io;
        this.rooms = new Map();
    }

    handleConnection(socket) {
        console.log("New client connected:", socket.id);

        socket.on("room:create", ({ name }, cb) => this.handleCreateRoom(socket, name, cb));
        socket.on("room:join", ({ roomCode, name }, cb) => this.handleJoinRoom(socket, roomCode, name, cb));
        socket.on("game:start", () => this.handleStartGame(socket));
        socket.on("game:vote", ({ targetId }) => this.handleVote(socket, targetId));
        socket.on("game:imposter_guess", ({ guess }) => this.handleImposterGuess(socket, guess));
        socket.on("game:clue", ({ clue }) => this.handleClue(socket, clue));

        socket.on("disconnect", () => this.handleDisconnect(socket));
    }

    handleCreateRoom(socket, name, cb) {
        const code = Math.random().toString(36).slice(2, 8).toUpperCase();
        const room = new Room(code, this.io);
        this.rooms.set(code, room);

        socket.join(code);
        room.addUser(socket.id, name);

        cb?.({ ok: true, roomCode: code });
    }

    handleJoinRoom(socket, roomCode, name, cb) {
        const code = (roomCode || "").toUpperCase();
        const room = this.rooms.get(code);

        if (!room) return cb?.({ ok: false, error: "Oda bulunamadı" });

        socket.join(code);
        room.addUser(socket.id, name);

        cb?.({ ok: true });
    }

    handleStartGame(socket) {
        const room = this.getRoomBySocket(socket);
        if (!room) return;


        room.startGame();
    }

    handleVote(socket, targetId) {
        const room = this.getRoomBySocket(socket);
        if (room) room.vote(socket.id, targetId);
    }

    handleImposterGuess(socket, guess) {
        const room = this.getRoomBySocket(socket);
        if (room) room.imposterGuess(socket.id, guess);
    }

    handleClue(socket, clue) {
        const room = this.getRoomBySocket(socket);
        if (room) room.handleClue(socket.id, clue);
    }

    handleDisconnect(socket) {
        const room = this.getRoomBySocket(socket);
        if (room) {
            const isEmpty = room.removeUser(socket.id);
            if (isEmpty) {


                setTimeout(() => {
                    if (room.users.length === 0) {
                        this.rooms.delete(room.code);
                        console.log(`Room ${room.code} deleted (empty).`);
                    }
                }, 10000);
            }
        }
    }

    getRoomBySocket(socket) {

        for (const [code, room] of this.rooms) {
            if (room.users.find(u => u.id === socket.id)) return room;
        }
        return null;
    }
}

module.exports = GameManager;
