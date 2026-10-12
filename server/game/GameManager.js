const Room = require("./Room");
const RewardService = require("./services/RewardService");
const payloadValidator = require("./validators/payloadValidator");

class GameManager {
    constructor(io) {
        this.io = io;
        this.rooms = new Map();
        this.creationRateLimiter = new Map();
        
        setInterval(() => this.creationRateLimiter.clear(), 10 * 60 * 1000);
    }

    handleConnection(socket) {
        console.log("New client connected:", socket.id);

        socket.on("game:ping", (payload) => {
            socket.emit("game:pong", {
                clientTimestamp: payload?.clientTimestamp,
                serverTimestamp: Date.now()
            });
        });

        socket.on("room:create", (payload, cb) => {
            const val = payloadValidator.validateRoomCreate(payload);
            if (!val.ok) {
                return cb?.({ ok: false, error: val.error });
            }
            this.handleCreateRoom(
                socket,
                val.data.name,
                socket.data?.userId,
                val.data.avatar,
                val.data.pedestal,
                val.data.nameColor,
                val.data.title,
                cb
            );
        });

        socket.on("room:join", (payload, cb) => {
            const val = payloadValidator.validateRoomJoin(payload);
            if (!val.ok) {
                return cb?.({ ok: false, error: val.error });
            }
            this.handleJoinRoom(
                socket,
                val.data.roomCode,
                val.data.name,
                socket.data?.userId,
                val.data.avatar,
                val.data.pedestal,
                val.data.nameColor,
                val.data.title,
                cb
            );
        });

        socket.on("game:update_avatar", (payload) => this.handleUpdateAvatar(socket, payload?.avatarIndex));
        socket.on("game:start", (settings) => this.handleStartGame(socket, settings));
        socket.on("game:place_bet", (payload) => this.handlePlaceBet(socket, payload?.targetId));
        
        socket.on("game:start_objection", () => {
            const room = this.getRoomBySocket(socket);
            if (room) room.startObjection(socket.id);
        });

        socket.on("game:vote_objection", (payload) => {
            const room = this.getRoomBySocket(socket);
            if (!room) return;
            const user = room.users.find(u => u.id === socket.id);
            const val = payloadValidator.validateVoteObjection(payload?.vote, user, room);
            if (!val.ok) {
                socket.emit("game:error", { message: val.error });
                return;
            }
            room.voteObjection(socket.id, val.data);
        });

        socket.on("game:set_word", (payload) => this.handleSetWord(socket, payload?.word));
        socket.on("game:edit_word", () => this.handleEditWord(socket));
        socket.on("game:shuffle_targets", () => this.handleShuffleTargets(socket));
        socket.on("game:select_joker", (payload) => this.handleSelectJoker(socket, payload?.jokerId));
        socket.on("game:chat", (payload) => this.handleChat(socket, payload?.message));
        socket.on("game:ask_question", (payload) => this.handleAskQuestion(socket, payload?.question));
        socket.on("game:submit_vote", (payload) => this.handleSubmitVote(socket, payload?.vote));
        socket.on("game:skip_turn", () => this.handleSkipTurn(socket));
        socket.on("game:guess", (payload) => this.handleGuess(socket, payload?.guess));
        socket.on("game:set_avatar", (payload) => this.handleSetAvatar(socket, payload?.avatarId));
        socket.on("game:toggle_voice", (payload) => this.handleToggleVoice(socket, payload?.enabled));
        socket.on("game:use_joker", (payload) => this.handleUseJoker(socket, payload || {}));
        socket.on("game:head_rotation", (payload) => this.handleHeadRotation(socket, payload));
        socket.on("room:close", () => this.handleCloseRoom(socket));

        socket.on("game:taunt", (payload) => this.handleTaunt(socket, payload?.type));
        socket.on("game:leave", () => this.handleLeave(socket));
        socket.on("disconnect", () => this.handleDisconnect(socket));
    }

    handleSelectJoker(socket, rawJokerId) {
        const room = this.getRoomBySocket(socket);
        if (!room) return;
        const user = room.users.find(u => u.id === socket.id);
        const val = payloadValidator.validateSelectJoker(rawJokerId, user, room);
        if (!val.ok) {
            socket.emit("game:error", { message: val.error });
            return;
        }
        room.selectJoker(socket.id, val.data);
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

    async handleCreateRoom(socket, name, userId, avatar, pedestal, nameColor, title, cb) {
        try {
            const forwardedFor = socket.handshake.headers['x-forwarded-for'];
            const clientIP = (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0] : forwardedFor) || socket.handshake.address;
            const now = Date.now();
            if (this.creationRateLimiter.has(clientIP)) {
                const lastTime = this.creationRateLimiter.get(clientIP);
                if (now - lastTime < 5000) { 
                    cb?.({ ok: false, error: "Lütfen yavaşlayın! Kısa sürede çok fazla oda kurdunuz." });
                    return;
                }
            }
            this.creationRateLimiter.set(clientIP, now);

            const code = Math.random().toString(36).slice(2, 8).toUpperCase();
            const room = new Room(code, this.io);
            this.rooms.set(code, room);

            socket.join(code);
            
            const reputation = await RewardService.getUserReputation(userId);
            room.addUser(socket.id, name, userId, avatar, pedestal, reputation, nameColor, title);

            cb?.({ ok: true, roomCode: code });
        } catch (err) {
            console.error("Create room error:", err);
            cb?.({ ok: false, error: "Sunucu hatası" });
        }
    }

    async handleJoinRoom(socket, roomCode, name, userId, avatar, pedestal, nameColor, title, cb) {
        try {
            const code = (roomCode || "").toUpperCase();
            let room = this.rooms.get(code);

            if (room) {
                const isReconnecting = (userId ? room.users.some(u => u.dbId === userId) : false)
                    || room.users.some(u => u.disconnected && u.name === name);

                if (room.gameState !== "LOBBY" && !isReconnecting) {
                    cb?.({ ok: false, error: "Oyun zaten başladı! Bu odaya şu an katılamazsınız." });
                    return;
                }
            } else {
                room = new Room(code, this.io);
                this.rooms.set(code, room);
            }

            socket.join(code);
            
            const reputation = await RewardService.getUserReputation(userId);
            room.addUser(socket.id, name, userId, avatar, pedestal, reputation, nameColor, title);

            cb?.({ ok: true });
        } catch (err) {
            console.error("Join room error:", err);
            cb?.({ ok: false, error: "Sunucu hatası" });
        }
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
            room.updateVoice(socket.id, Boolean(enabled));
        }
    }

    handleStartGame(socket, rawSettings) {
        const room = this.getRoomBySocket(socket);
        if (!room) {
            socket.emit("game:error", { message: "Oda bulunamadı." });
            return;
        }
        const user = room.users.find(u => u.id === socket.id);
        const val = payloadValidator.validateGameStart(rawSettings, user, room);
        if (!val.ok) {
            socket.emit("game:error", { message: val.error });
            return;
        }
        room.startGame(val.data);
    }

    handlePlaceBet(socket, rawTargetId) {
        const room = this.getRoomBySocket(socket);
        if (!room) return;
        const user = room.users.find(u => u.id === socket.id);
        const val = payloadValidator.validatePlaceBet(rawTargetId, user, room);
        if (!val.ok) {
            socket.emit("game:error", { message: val.error });
            return;
        }
        room.placeBet(socket.id, val.data);
    }

    handleSetWord(socket, rawWord) {
        const room = this.getRoomBySocket(socket);
        if (!room) return;
        const user = room.users.find(u => u.id === socket.id);
        const val = payloadValidator.validateSetWord(rawWord, user, room);
        if (!val.ok) {
            socket.emit("game:error", { message: val.error });
            return;
        }
        room.setWord(socket.id, val.data);
    }

    handleEditWord(socket) {
        const room = this.getRoomBySocket(socket);
        if (room) room.editWord(socket.id);
    }

    handleShuffleTargets(socket) {
        const room = this.getRoomBySocket(socket);
        if (room) room.shuffleTargets(socket.id);
    }

    handleChat(socket, rawMessage) {
        const val = payloadValidator.validateChat(rawMessage, socket.id);
        if (!val.ok) {
            socket.emit("game:error", { message: val.error });
            return;
        }
        const room = this.getRoomBySocket(socket);
        if (room) room.handleChat(socket.id, val.data);
    }

    handleAskQuestion(socket, rawQuestion) {
        const room = this.getRoomBySocket(socket);
        if (!room) return;
        const user = room.users.find(u => u.id === socket.id);
        const val = payloadValidator.validateAskQuestion(rawQuestion, user, room);
        if (!val.ok) {
            socket.emit("game:error", { message: val.error });
            return;
        }
        room.askQuestion(socket.id, val.data);
    }

    handleSubmitVote(socket, rawVote) {
        const room = this.getRoomBySocket(socket);
        if (!room) return;
        const user = room.users.find(u => u.id === socket.id);
        const val = payloadValidator.validateSubmitVote(rawVote, user, room);
        if (!val.ok) {
            socket.emit("game:error", { message: val.error });
            return;
        }
        room.submitVote(socket.id, val.data);
    }

    handleSkipTurn(socket) {
        const room = this.getRoomBySocket(socket);
        if (room) room.skipTurn(socket.id);
    }

    handleGuess(socket, rawGuess) {
        const room = this.getRoomBySocket(socket);
        if (!room) return;
        const user = room.users.find(u => u.id === socket.id);
        const val = payloadValidator.validateGuess(rawGuess, user, room);
        if (!val.ok) {
            socket.emit("game:error", { message: val.error });
            return;
        }
        room.guessWord(socket.id, val.data);
    }

    handleUseJoker(socket, payload) {
        const room = this.getRoomBySocket(socket);
        if (!room) return;
        const rateCheck = payloadValidator.checkActionRateLimit(socket.id, 'use_joker', 800);
        if (!rateCheck.ok) {
            socket.emit("game:error", { message: rateCheck.error });
            return;
        }
        room.useJoker(socket.id, payload);
    }

    handleHeadRotation(socket, payload) {
        const val = payloadValidator.validateHeadRotation(payload, socket.id);
        if (!val.ok) return;
        const room = this.getRoomBySocket(socket);
        if (room) room.broadcastHeadRotation(socket.id, val.data);
    }

    handleTaunt(socket, rawType) {
        const val = payloadValidator.validateTaunt(rawType, socket.id);
        if (!val.ok) {
            socket.emit("game:error", { message: val.error });
            return;
        }
        const room = this.getRoomBySocket(socket);
        if (room) room.playTaunt(socket.id, val.data);
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
