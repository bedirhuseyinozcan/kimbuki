const Room = require("./Room");

class GameManager {
    constructor(io) {
        this.io = io;
        this.rooms = new Map();
    }

    handleConnection(socket) {
        console.log("New client connected:", socket.id);

        socket.on("room:create", ({ name, userId, avatar }, cb) => this.handleCreateRoom(socket, name, userId, avatar, cb));
        socket.on("room:join", ({ roomCode, name, userId, avatar }, cb) => this.handleJoinRoom(socket, roomCode, name, userId, avatar, cb));
        socket.on("game:update_avatar", ({ avatarIndex }) => this.handleUpdateAvatar(socket, avatarIndex));
        socket.on("game:start", (settings = {}) => this.handleStartGame(socket, settings));
        socket.on("game:place_bet", ({ targetId }) => this.handlePlaceBet(socket, targetId));
        socket.on("game:start_objection", () => {
            const room = this.getRoomBySocket(socket);
            if (room) room.startObjection(socket.id);
        });
        socket.on("game:vote_objection", ({ vote }) => {
            const room = this.getRoomBySocket(socket);
            if (room) room.voteObjection(socket.id, vote);
        });
        socket.on("game:set_word", ({ word }) => this.handleSetWord(socket, word));
        socket.on("game:edit_word", () => this.handleEditWord(socket));
        socket.on("game:shuffle_targets", () => this.handleShuffleTargets(socket));
        socket.on("game:chat", ({ message }) => this.handleChat(socket, message));
        socket.on("game:ask_question", ({ question }) => this.handleAskQuestion(socket, question));
        socket.on("game:submit_vote", ({ vote }) => this.handleSubmitVote(socket, vote));
        socket.on("game:skip_turn", () => this.handleSkipTurn(socket));
        socket.on("game:guess", ({ guess }) => this.handleGuess(socket, guess));
        socket.on("game:set_avatar", ({ avatarId }) => this.handleSetAvatar(socket, avatarId));
        socket.on("game:toggle_voice", ({ enabled }) => this.handleToggleVoice(socket, enabled));
        socket.on("game:use_joker", (payload) => this.handleUseJoker(socket, payload));
        socket.on("game:head_rotation", (payload) => this.handleHeadRotation(socket, payload));
        socket.on("room:close", () => this.handleCloseRoom(socket));

        socket.on("game:leave", () => this.handleLeave(socket));
        socket.on("disconnect", () => this.handleDisconnect(socket));
    }

    handleLeave(socket) {
        const room = this.getRoomBySocket(socket);
        if (room) {
            const user = room.users.find(u => u.id === socket.id);
            if (user) {
                user.disconnected = true;
                room.permanentlyRemoveUser(socket.id);
            }
            if (room.users.length === 0) {
                this.rooms.delete(room.code);
            }
        }
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

    handleCreateRoom(socket, name, userId, avatar, cb) {
        const code = Math.random().toString(36).slice(2, 8).toUpperCase();
        const room = new Room(code, this.io);
        this.rooms.set(code, room);

        socket.join(code);
        room.addUser(socket.id, name, userId, avatar);

        cb?.({ ok: true, roomCode: code });
    }

    handleJoinRoom(socket, roomCode, name, userId, avatar, cb) {
        const code = (roomCode || "").toUpperCase();
        let room = this.rooms.get(code);

        if (!room) {
            room = new Room(code, this.io);
            this.rooms.set(code, room);
        }

        socket.join(code);
        room.addUser(socket.id, name, userId, avatar);

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

    handleToggleVoice(socket, enabled) {
        const room = this.getRoomBySocket(socket);
        if (room) {
            room.updateVoice(socket.id, enabled);
        }
    }

    handleStartGame(socket, settings) {
        const room = this.getRoomBySocket(socket);
        if (room) room.startGame(settings);
    }

    handlePlaceBet(socket, targetId) {
        const room = this.getRoomBySocket(socket);
        if (room) room.placeBet(socket.id, targetId);
    }

    handleSetWord(socket, word) {
        const room = this.getRoomBySocket(socket);
        if (room) room.setWord(socket.id, word);
    }

    handleEditWord(socket) {
        const room = this.getRoomBySocket(socket);
        if (room) room.editWord(socket.id);
    }

    handleShuffleTargets(socket) {
        const room = this.getRoomBySocket(socket);
        if (room) room.shuffleTargets(socket.id);
    }

    handleChat(socket, message) {
        const room = this.getRoomBySocket(socket);
        if (room) room.handleChat(socket.id, message);
    }

    handleAskQuestion(socket, question) {
        const room = this.getRoomBySocket(socket);
        if (room) room.askQuestion(socket.id, question);
    }

    handleSubmitVote(socket, vote) {
        const room = this.getRoomBySocket(socket);
        if (room) room.submitVote(socket.id, vote);
    }

    handleSkipTurn(socket) {
        const room = this.getRoomBySocket(socket);
        if (room) room.skipTurn(socket.id);
    }

    handleGuess(socket, guess) {
        const room = this.getRoomBySocket(socket);
        if (room) room.guessWord(socket.id, guess);
    }

    handleUseJoker(socket, payload) {
        const room = this.getRoomBySocket(socket);
        if (room) room.useJoker(socket.id, payload);
    }

    handleHeadRotation(socket, payload) {
        const room = this.getRoomBySocket(socket);
        if (room) room.broadcastHeadRotation(socket.id, payload);
    }

    handleDisconnect(socket) {
        const room = this.getRoomBySocket(socket);
        if (room) {
            const isEmpty = room.removeUser(socket.id);
            if (isEmpty) {
                setTimeout(() => {
                    if (room.users.every(u => u.disconnected)) {
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

    getStats() {
        let totalPlayers = 0;
        this.rooms.forEach(room => {
            totalPlayers += room.users.filter(u => !u.disconnected).length;
        });
        return {
            activeRooms: this.rooms.size,
            activePlayers: totalPlayers
        };
    }
}

module.exports = GameManager;
