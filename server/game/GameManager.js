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
        socket.on("game:update_avatar", ({ avatarIndex }) => this.handleUpdateAvatar(socket, avatarIndex));
        socket.on("game:start", () => this.handleStartGame(socket));
        socket.on("game:set_word", ({ word }) => this.handleSetWord(socket, word));
        socket.on("game:chat", ({ message }) => this.handleChat(socket, message));
        socket.on("game:skip_turn", () => this.handleSkipTurn(socket));
        socket.on("game:guess", ({ guess }) => this.handleGuess(socket, guess));
        socket.on("game:use_hint", () => this.handleUseHint(socket));
        socket.on("game:set_avatar", ({ avatarId }) => this.handleSetAvatar(socket, avatarId));
        socket.on("room:close", () => this.handleCloseRoom(socket));

        socket.on("disconnect", () => this.handleDisconnect(socket));
    }

    handleCloseRoom(socket) {
        const room = this.getRoomBySocket(socket);
        if (room) {
            const user = room.users.find(u => u.id === socket.id);
            if (user && user.isHost) {
                this.io.to(room.code).emit("game:closed");
                this.rooms.delete(room.code);
                console.log(`Room ${room.code} closed by host.`);
            }
        }
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
        let room = this.rooms.get(code);

        if (!room) {
            room = new Room(code, this.io);
            this.rooms.set(code, room);
        }

        socket.join(code);
        room.addUser(socket.id, name);

        cb?.({ ok: true });
    }

    handleUpdateAvatar(socket, avatarIndex) {
        const room = this.getRoomBySocket(socket);
        if (room) room.updateAvatar(socket.id, avatarIndex);
    }

    handleSetAvatar(socket, avatarId) {
        const room = this.getRoomBySocket(socket);
        if (room) {
            room.updateAvatar(socket.id, avatarId);
        }
    }

    handleStartGame(socket) {
        const room = this.getRoomBySocket(socket);
        if (room) room.startGame();
    }

    handleSetWord(socket, word) {
        const room = this.getRoomBySocket(socket);
        if (room) room.setWord(socket.id, word);
    }

    handleChat(socket, message) {
        const room = this.getRoomBySocket(socket);
        if (room) room.handleChat(socket.id, message);
    }

    handleSkipTurn(socket) {
        const room = this.getRoomBySocket(socket);
        if (room) room.skipTurn(socket.id);
    }

    handleGuess(socket, guess) {
        const room = this.getRoomBySocket(socket);
        if (room) room.guessWord(socket.id, guess);
    }

    handleUseHint(socket) {
        const room = this.getRoomBySocket(socket);
        if (room) room.useHint(socket.id);
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
