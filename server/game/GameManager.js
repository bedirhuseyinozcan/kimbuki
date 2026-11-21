const Room = require("./Room");
const RewardService = require("./services/RewardService");
const payloadValidator = require("./validators/payloadValidator");
const { FREE_DEFAULTS } = require("../config/catalog");

const MAX_ROOMS = 200;
const MAX_PLAYERS_PER_ROOM = 10;

class GameManager {
    constructor(io) {
        this.io = io;
        this.rooms = new Map();
        this.socketToRoom = new Map();
        this.creationRateLimiter = new Map();
        
        const cleanupInterval = setInterval(() => this.creationRateLimiter.clear(), 10 * 60 * 1000);
        if (cleanupInterval.unref) cleanupInterval.unref();
    }

    sanitizeCosmetics(profile, avatar, pedestal, nameColor, title) {
        const safeAvatar = (typeof avatar === 'string' && profile.unlockedAvatars.includes(avatar))
            ? avatar
            : FREE_DEFAULTS.avatar;
        const safePedestal = (typeof pedestal === 'string' && profile.unlockedPedestals.includes(pedestal))
            ? pedestal
            : FREE_DEFAULTS.pedestal;
        const safeNameColor = (typeof nameColor === 'string' && profile.unlockedNameColors.includes(nameColor))
            ? nameColor
            : FREE_DEFAULTS.nameColor;
        const safeTitle = (typeof title === 'string' && (title === FREE_DEFAULTS.title || profile.unlockedTitles.includes(title)))
            ? title
            : FREE_DEFAULTS.title;
        return { safeAvatar, safePedestal, safeNameColor, safeTitle };
    }

    checkRoomCreationRateLimit(socket) {
        const clientIP = socket.handshake.address || 'unknown';
        const now = Date.now();
        if (this.creationRateLimiter.has(clientIP)) {
            const lastTime = this.creationRateLimiter.get(clientIP);
            if (now - lastTime < 5000) {
                return false;
            }
        }
        this.creationRateLimiter.set(clientIP, now);
        return true;
    }

    generateUniqueRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        for (let attempt = 0; attempt < 20; attempt++) {
            let code = '';
            for (let i = 0; i < 6; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            if (!this.rooms.has(code)) return code;
        }
        return Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, 'X');
    }

    leaveOtherRooms(socket, exceptCode = null) {
        const mappedRoom = this.socketToRoom.get(socket.id);
        if (mappedRoom && mappedRoom.code !== exceptCode) {
            socket.leave(mappedRoom.code);
            const user = mappedRoom.users.find(u => u.id === socket.id);
            if (user) {
                user.disconnected = true;
                mappedRoom.permanentlyRemoveUser(socket.id);
            }
            this.socketToRoom.delete(socket.id);
            if (mappedRoom.users.length === 0 && this.rooms.get(mappedRoom.code) === mappedRoom) {
                if (typeof mappedRoom.destroy === 'function') mappedRoom.destroy();
                this.rooms.delete(mappedRoom.code);
            }
        }
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
        socket.on("game:update_settings", (settings) => this.handleUpdateSettings(socket, settings));
        socket.on("game:start", (settings) => this.handleStartGame(socket, settings));
        socket.on("game:place_bet", (payload) => this.handlePlaceBet(socket, payload?.targetId));
        
        socket.on("game:start_objection", () => this.handleStartObjection(socket));

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
        this.socketToRoom.delete(socket.id);
        if (room) {
            socket.leave(room.code);
            const user = room.users.find(u => u.id === socket.id);
            if (user) {
                user.disconnected = true;
                room.permanentlyRemoveUser(socket.id);
            }
            if (room.users.length === 0 && this.rooms.get(room.code) === room) {
                room.destroy();
                this.rooms.delete(room.code);
            }
        }
    }

    handleCloseRoom(socket) {
        const room = this.getRoomBySocket(socket);
        if (room) {
            const user = room.users.find(u => u.id === socket.id);
            if (user && user.isHost) {
                if (room.isBettingEnabled && room.gameState !== "LOBBY" && room.gameState !== "ROUND_END" && room.paidDbIds?.size > 0) {
                    const refundIds = Array.from(room.paidDbIds);
                    room.paidDbIds.clear();
                    RewardService.refundBetFees(refundIds, room.betAmount).catch(e => console.error("Close room refund error:", e));
                }
                for (const u of room.users) {
                    this.socketToRoom.delete(u.id);
                }
                this.io.to(room.code).emit("game:closed");
                this.io.in(room.code).socketsLeave(room.code);
                room.destroy();
                if (this.rooms.get(room.code) === room) {
                    this.rooms.delete(room.code);
                }
                console.log(`Room ${room.code} closed by host.`);
            }
        }
    }

    async handleCreateRoom(socket, name, userId, avatar, pedestal, nameColor, title, cb) {
        try {
            if (this.rooms.size >= MAX_ROOMS) {
                cb?.({ ok: false, error: "Sunucu şu an maksimum oda kapasitesine ulaştı. Lütfen biraz sonra tekrar deneyin." });
                return;
            }

            if (!this.checkRoomCreationRateLimit(socket)) {
                cb?.({ ok: false, error: "Lütfen yavaşlayın! Kısa sürede çok fazla oda kurdunuz." });
                return;
            }

            this.leaveOtherRooms(socket);

            const code = this.generateUniqueRoomCode();
            const room = new Room(code, this.io);
            this.rooms.set(code, room);

            socket.join(code);
            
            const profile = await RewardService.getUserProfileForRoom(userId);
            const { safeAvatar, safePedestal, safeNameColor, safeTitle } = this.sanitizeCosmetics(profile, avatar, pedestal, nameColor, title);
            room.addUser(socket.id, name, userId, safeAvatar, safePedestal, profile.reputation, safeNameColor, safeTitle, socket.data?.guestId || null);
            this.socketToRoom.set(socket.id, room);

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

            const guestId = socket.data?.guestId || null;

            if (room) {
                const isReconnecting = (userId ? room.users.some(u => u.dbId && u.dbId === userId) : false)
                    || (guestId ? room.users.some(u => u.guestId && u.guestId === guestId) : false)
                    || (!userId && !guestId && room.users.some(u => !u.dbId && !u.guestId && u.disconnected && u.name === name));

                if (room.gameState !== "LOBBY" && !isReconnecting) {
                    cb?.({ ok: false, error: "Oyun zaten başladı! Bu odaya şu an katılamazsınız." });
                    return;
                }
                if (!isReconnecting && room.users.length >= MAX_PLAYERS_PER_ROOM) {
                    cb?.({ ok: false, error: `Bu oda dolu (Maksimum ${MAX_PLAYERS_PER_ROOM} oyuncu).` });
                    return;
                }
            } else {
                if (this.rooms.size >= MAX_ROOMS) {
                    cb?.({ ok: false, error: "Sunucu şu an maksimum oda kapasitesine ulaştı." });
                    return;
                }
                if (!this.checkRoomCreationRateLimit(socket)) {
                    cb?.({ ok: false, error: "Lütfen yavaşlayın! Kısa sürede çok fazla oda kurdunuz." });
                    return;
                }
                room = new Room(code, this.io);
                this.rooms.set(code, room);
            }

            this.leaveOtherRooms(socket, code);

            const profile = await RewardService.getUserProfileForRoom(userId);

            // Re-check room state after async DB lookup to prevent mid-game join race
            const currentRoom = this.rooms.get(code);
            if (!currentRoom || currentRoom !== room) {
                cb?.({ ok: false, error: "Oda artık mevcut değil." });
                return;
            }
            const isReconnectingNow = (userId ? room.users.some(u => u.dbId && u.dbId === userId) : false)
                || (guestId ? room.users.some(u => u.guestId && u.guestId === guestId) : false)
                || (!userId && !guestId && room.users.some(u => !u.dbId && !u.guestId && u.disconnected && u.name === name));
            if (room.gameState !== "LOBBY" && !isReconnectingNow) {
                cb?.({ ok: false, error: "Oyun siz bağlanırken başladı!" });
                return;
            }
            if (!isReconnectingNow && room.users.length >= MAX_PLAYERS_PER_ROOM) {
                cb?.({ ok: false, error: `Bu oda dolu (Maksimum ${MAX_PLAYERS_PER_ROOM} oyuncu).` });
                return;
            }

            socket.join(code);

            const { safeAvatar, safePedestal, safeNameColor, safeTitle } = this.sanitizeCosmetics(profile, avatar, pedestal, nameColor, title);
            room.addUser(socket.id, name, userId, safeAvatar, safePedestal, profile.reputation, safeNameColor, safeTitle, guestId);
            this.socketToRoom.set(socket.id, room);

            cb?.({ ok: true });
        } catch (err) {
            console.error("Join room error:", err);
            cb?.({ ok: false, error: "Sunucu hatası" });
        }
    }

    async handleUpdateAvatar(socket, avatarId) {
        if (typeof avatarId !== 'string' || !avatarId.trim() || avatarId.length > 40) return;
        const room = this.getRoomBySocket(socket);
        if (!room) return;
        const profile = await RewardService.getUserProfileForRoom(socket.data?.userId);
        if (!profile.unlockedAvatars.includes(avatarId)) {
            socket.emit("game:error", { message: "Bu karaktere sahip değilsiniz." });
            return;
        }
        room.updateAvatar(socket.id, avatarId);
    }

    handleSetAvatar(socket, avatarId) {
        return this.handleUpdateAvatar(socket, avatarId);
    }

    handleToggleVoice(socket, enabled) {
        const room = this.getRoomBySocket(socket);
        if (room) {
            room.updateVoice(socket.id, Boolean(enabled));
        }
    }

    handleUpdateSettings(socket, settings) {
        const room = this.getRoomBySocket(socket);
        if (room) {
            room.updateSettings(socket.id, settings);
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
        room.startGame(val.data).catch((err) => {
            console.error(`[GameManager] startGame error in room ${room.code}:`, err);
            this.io.to(room.code).emit("game:error", { message: "Oyun başlatılırken bir sunucu hatası oluştu." });
        });
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
        if (!room) return;
        const user = room.users.find(u => u.id === socket.id);
        const val = payloadValidator.validateEditWord(user, room);
        if (!val.ok) {
            socket.emit("game:error", { message: val.error });
            return;
        }
        room.editWord(socket.id);
    }

    handleShuffleTargets(socket) {
        const room = this.getRoomBySocket(socket);
        if (!room) return;
        const user = room.users.find(u => u.id === socket.id);
        const val = payloadValidator.validateShuffleTargets(user, room);
        if (!val.ok) {
            socket.emit("game:error", { message: val.error });
            return;
        }
        room.shuffleTargets(socket.id);
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
        if (!room) return;
        const user = room.users.find(u => u.id === socket.id);
        const val = payloadValidator.validateSkipTurn(user, room);
        if (!val.ok) {
            socket.emit("game:error", { message: val.error });
            return;
        }
        room.skipTurn(socket.id);
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

    handleUseJoker(socket, rawPayload) {
        const room = this.getRoomBySocket(socket);
        if (!room) return;
        const user = room.users.find(u => u.id === socket.id);
        const val = payloadValidator.validateUseJoker(rawPayload, user, room);
        if (!val.ok) {
            socket.emit("game:error", { message: val.error });
            return;
        }
        room.useJoker(socket.id, val.data);
    }

    handleStartObjection(socket) {
        const room = this.getRoomBySocket(socket);
        if (!room) return;
        const user = room.users.find(u => u.id === socket.id);
        const val = payloadValidator.validateStartObjection(user, room);
        if (!val.ok) {
            socket.emit("game:error", { message: val.error });
            return;
        }
        room.startObjection(socket.id);
    }

    handleHeadRotation(socket, payload) {
        const val = payloadValidator.validateHeadRotation(payload, socket.id);
        if (!val.ok) return;
        const room = this.getRoomBySocket(socket);
        if (room) room.broadcastHeadRotation(socket, val.data);
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
        this.socketToRoom.delete(socket.id);
        if (room) {
            const isEmpty = room.removeUser(socket.id);
            if (isEmpty) {
                setTimeout(() => {
                    if (room.users.every(u => u.disconnected) && this.rooms.get(room.code) === room) {
                        for (const u of room.users) {
                            this.socketToRoom.delete(u.id);
                        }
                        room.destroy();
                        this.rooms.delete(room.code);
                        console.log(`Room ${room.code} deleted (empty).`);
                    }
                }, 10000);
            }
        }
    }

    getRoomBySocket(socket) {
        const room = this.socketToRoom.get(socket.id);
        if (room && this.rooms.get(room.code) === room && room.users.some(u => u.id === socket.id)) {
            return room;
        }
        if (room) {
            this.socketToRoom.delete(socket.id);
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
