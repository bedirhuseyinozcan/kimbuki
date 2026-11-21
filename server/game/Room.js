const JokerManager = require('./jokers');
const questionHandler = require('./handlers/questionHandler');
const guessHandler = require('./handlers/guessHandler');
const objectionHandler = require('./handlers/objectionHandler');
const StateSerializer = require('./managers/StateSerializer');
const PhaseManager = require('./managers/PhaseManager');
const TurnManager = require('./managers/TurnManager');
const { VALID_MAPS, VALID_THEMES, VALID_CATEGORIES, VALID_BET_AMOUNTS, VALID_GAME_MODES } = require('../config/catalog');

class Room {
    constructor(code, io) {
        this.code = code;
        this.io = io;
        this.users = [];
        this.gameState = "LOBBY";
        this.category = "Karışık"; this.theme = "day"; this.map = "floating_island__low_poly_vr.glb";
        this.gameMode = "classic";
        this.activeQuestion = null;
        
        this.turnTime = 60;
        this.timer = null;
        this.turnTimeLeft = 0;
        this.currentTurnIndex = 0;
        this.roundCount = 1;

        this.chatHistory = [];
        this.roundLogs = [];
        this.winners = [];
        this.bets = {};
        this.paidDbIds = new Set();
        this.objection = null;
        this.hasObjectionUsed = false;
        this.isBettingEnabled = false;
        this.betAmount = 50;
        this.isJokersEnabled = true;
        this.resolvedQuestionsThisTurn = [];
        this.turnStartTime = 0;
        this.pausedRemainingMs = 0;
        this.betTimer = null;
        this.jokerDraftTimer = null;
        this.questionTimer = null;
        this.objectionTimer = null;
        this.bettingEndTime = null;
        this.jokerDraftEndTime = null;
        this.pendingMirrorWordOwner = null;
        this.pendingMirrorWordTarget = null;
        this.mirrorWordTimer = null;
        this.isStartingGame = false;
        this.isProcessingGuess = false;
        this.destroyed = false;
    }

    clearAllTimers() {
        if (this.timer) { clearTimeout(this.timer); this.timer = null; }
        if (this.questionTimer) { clearTimeout(this.questionTimer); this.questionTimer = null; }
        if (this.objectionTimer) { clearTimeout(this.objectionTimer); this.objectionTimer = null; }
        if (this.mirrorWordTimer) { clearTimeout(this.mirrorWordTimer); this.mirrorWordTimer = null; }
        if (this.betTimer) { clearTimeout(this.betTimer); this.betTimer = null; }
        if (this.jokerDraftTimer) { clearTimeout(this.jokerDraftTimer); this.jokerDraftTimer = null; }
    }

    destroy() {
        this.destroyed = true;
        this.clearAllTimers();
        for (const u of this.users) {
            if (u.disconnectTimer) {
                clearTimeout(u.disconnectTimer);
                u.disconnectTimer = null;
            }
        }
    }

    addChatLog(logObj) {
        this.chatHistory.push(logObj);
        if (this.chatHistory.length > 60) {
            this.chatHistory.shift();
        }
        if (logObj.privateTo) {
            this.io.to(logObj.privateTo).emit("game:new_chat", logObj);
        } else {
            this.io.to(this.code).emit("game:new_chat", logObj);
        }
    }

    sendInitChat(socketId) {
        const user = this.users.find(u => u.id === socketId);
        if (!user) return;
        const history = this.chatHistory
            .filter(c => !c.privateTo || c.privateTo === socketId)
            .map(c => ({
                system: c.system,
                userId: c.userId,
                name: c.name,
                nameColor: c.nameColor,
                message: c.message,
                timestamp: c.timestamp
            }));
        this.io.to(socketId).emit("game:init_chat", { chatHistory: history });
    }

    addUser(socketId, name, dbId, avatar, pedestal = 'default_stone', reputation = 0, nameColor = 'text-white', title = '', guestId = null) {
        const existingUser = this.users.find(u =>
            (dbId && u.dbId && u.dbId === dbId) ||
            (guestId && u.guestId && u.guestId === guestId) ||
            (!u.dbId && !u.guestId && !dbId && !guestId && u.disconnected && u.name === name)
        );
        if (existingUser) {
            const oldId = existingUser.id;
            if (existingUser.disconnectTimer) {
                clearTimeout(existingUser.disconnectTimer);
                existingUser.disconnectTimer = null;
            }
            existingUser.id = socketId;
            existingUser.disconnected = false;
            existingUser.reputation = reputation;
            existingUser.avatar = avatar || existingUser.avatar;
            existingUser.pedestal = pedestal || existingUser.pedestal;
            existingUser.nameColor = nameColor || existingUser.nameColor;
            existingUser.title = (title !== undefined) ? title : existingUser.title;
            
            this.users.forEach(u => {
                if (u.targetId === oldId) u.targetId = socketId;
                if (u.bloodTieTarget === oldId) u.bloodTieTarget = socketId;
                if (u.timeBomb && u.timeBomb.casterId === oldId) u.timeBomb.casterId = socketId;
            });
            
            if (this.bets) {
                if (this.bets[oldId]) {
                    this.bets[socketId] = this.bets[oldId];
                    delete this.bets[oldId];
                }
                for (let b in this.bets) {
                    if (this.bets[b] === oldId) this.bets[b] = socketId;
                }
            }
            if (this.pendingMirrorWordOwner === oldId) this.pendingMirrorWordOwner = socketId;
            if (this.pendingMirrorWordTarget === oldId) this.pendingMirrorWordTarget = socketId;
            if (this.objection && this.objection.votes[oldId] !== undefined) {
                this.objection.votes[socketId] = this.objection.votes[oldId];
                delete this.objection.votes[oldId];
            }

            const winnerIndex = this.winners.indexOf(oldId);
            if (winnerIndex !== -1) this.winners[winnerIndex] = socketId;
            if (this.activeQuestion) {
                if (this.activeQuestion.askerId === oldId) this.activeQuestion.askerId = socketId;
                if (this.activeQuestion.votes[oldId]) {
                    this.activeQuestion.votes[socketId] = this.activeQuestion.votes[oldId];
                    delete this.activeQuestion.votes[oldId];
                }
            }
            this.chatHistory.forEach(c => {
                if (c.privateTo === oldId) c.privateTo = socketId;
            });

            this.addChatLog({
                system: true,
                message: `🔄 ${existingUser.name} oyuna tekrar bağlandı!`,
                timestamp: Date.now()
            });

            this.io.to(socketId).emit("game:reconnected", { message: "Odaya yeniden bağlandınız!" });
            this.sendInitChat(socketId);
            this.broadcastState();
            return;
        }

        const isHost = this.users.length === 0;
        this.users.push({
            id: socketId,
            dbId: dbId,
            guestId: guestId,
            name,
            isHost,
            avatar: avatar || 'Warrior',
            pedestal: pedestal || 'default_stone',
            nameColor: nameColor || 'text-white',
            title: title || '',
            reputation: reputation,
            targetId: null,
            assignedWord: null,
            status: 'playing',
            hasSubmittedWord: false,
            isVoiceEnabled: false,
            lives: 3,
            disconnected: false,
            joker: null,
            jokerChoices: [],
            hasDrafted: false,
            hasUsedJoker: false,
            russianRouletteActive: false,
            bloodTieTarget: null,
            timeBomb: null,
            mirrorRoundsLeft: 0,
            shieldActive: false,
            extraQuestionChain: false,
            revealedLetters: [],
            silencedTurns: 0,
            extraQuestions: 0,
            questionsAskedThisTurn: 0,
            lastTauntTime: 0,
            lastHeadRotTime: 0
        });
        this.sendInitChat(socketId);
        this.broadcastState();
    }

    checkPhaseProgression() {
        return PhaseManager.checkPhaseProgression(this);
    }

    removeUser(socketId) {
        const user = this.users.find(u => u.id === socketId);
        if (!user) return this.users.length === 0;

        user.disconnected = true;

        this.addChatLog({
            system: true,
            message: `⚠️ ${user.name} bağlantısı koptu (yeniden bağlanması için 60sn bekleniyor)...`,
            timestamp: Date.now()
        });

        if (user.isHost) {
            user.isHost = false;
            const nextHost = this.users.find(u => !u.disconnected);
            if (nextHost) nextHost.isHost = true;
        }

        if (this.gameState === "WORD_SELECTION") {
            const active = this.users.filter(u => !u.disconnected);
            if (active.length >= 2) {
                for (let i = 0; i < active.length; i++) {
                    const next = (i + 1) % active.length;
                    active[i].targetId = active[next].id;
                    active[i].hasSubmittedWord = false;
                    active[i].assignedWord = null;
                }
                this.addChatLog({ system: true, message: `⚠️ Bir oyuncu koptuğu için kelime hedefleri yeniden dağıtıldı!`, timestamp: Date.now() });
            }
        }

        if (this.activeQuestion) {
            const playingUsers = this.users.filter(u => u.status === 'playing' && !u.disconnected && u.id !== this.activeQuestion.askerId);
            const voteCount = Object.keys(this.activeQuestion.votes).filter(vId => playingUsers.some(p => p.id === vId)).length;
            if (voteCount >= playingUsers.length && playingUsers.length > 0) {
                this.resolveQuestion();
            }
        }
        
        if (this.objection) {
            const playingUsers = this.users.filter(u => u.status === 'playing' && !u.disconnected);
            const voteCount = Object.keys(this.objection.votes).filter(vId => playingUsers.some(p => p.id === vId)).length;
            if (voteCount >= playingUsers.length && playingUsers.length > 0) {
                clearTimeout(this.objectionTimer);
                this.resolveObjection();
            }
        }

        this.checkPhaseProgression();
        this.broadcastState();

        const allDisconnected = this.users.every(u => u.disconnected);
        if (allDisconnected) return true; 

        if (!user.disconnectTimer) {
            user.disconnectTimer = setTimeout(() => {
                this.permanentlyRemoveUser(socketId);
            }, 60000);
        }

        const userIndex = this.users.indexOf(user);
        const wasCurrentTurn = this.gameState === "PLAYING" && this.currentTurnIndex === userIndex;
        if (wasCurrentTurn && !this.activeQuestion && !this.objection) {
            if (this.timer) clearTimeout(this.timer);
            const remaining = this.turnStartTime + (this.turnTime * 1000) - Date.now();
            const skipDelay = Math.max(0, Math.min(remaining, 5000));
            this.timer = setTimeout(() => {
                if (this.gameState === "PLAYING") {
                    const currentUser = this.users[this.currentTurnIndex];
                    if (currentUser && currentUser.disconnected) {
                         this.nextTurn(true);
                    }
                }
            }, skipDelay || 5000);
        }

        return false;
    }

    permanentlyRemoveUser(socketId) {
        const userIndex = this.users.findIndex(u => u.id === socketId);
        if (userIndex === -1) return;
        const user = this.users[userIndex];
        if (!user.disconnected) return;
        if (user.disconnectTimer) {
            clearTimeout(user.disconnectTimer);
            user.disconnectTimer = null;
        }
        const wasHost = user.isHost;
        const wasCurrentTurn = this.gameState === "PLAYING" && this.currentTurnIndex === userIndex;

        this.users.splice(userIndex, 1);

        // Keep currentTurnIndex pointing to the same active player after splice
        if (userIndex < this.currentTurnIndex) {
            this.currentTurnIndex = Math.max(0, this.currentTurnIndex - 1);
        } else if (this.currentTurnIndex >= this.users.length) {
            this.currentTurnIndex = 0;
        }

        if (this.users.length > 0 && wasHost) {
            const nextHost = this.users.find(u => !u.disconnected) || this.users[0];
            if (nextHost) nextHost.isHost = true;
        }

        if (this.gameState === "WORD_SELECTION") {
            const active = this.users.filter(u => !u.disconnected);
            const needsRedistribution = active.some(u => u.targetId === socketId || !u.targetId);
            if (active.length >= 2 && needsRedistribution) {
                for (let i = 0; i < active.length; i++) {
                    const next = (i + 1) % active.length;
                    active[i].targetId = active[next].id;
                    active[i].hasSubmittedWord = false;
                    active[i].assignedWord = null;
                }
                this.addChatLog({ system: true, message: `⚠️ Bir oyuncu ayrıldığı için kelime hedefleri yeniden dağıtıldı!`, timestamp: Date.now() });
            }
        }
        
        if (this.activeQuestion) {
            const playingUsers = this.users.filter(u => u.status === 'playing' && !u.disconnected && u.id !== this.activeQuestion.askerId);
            const voteCount = Object.keys(this.activeQuestion.votes).filter(vId => playingUsers.some(p => p.id === vId)).length;
            if (voteCount >= playingUsers.length && playingUsers.length > 0) {
                this.resolveQuestion();
            }
        }
        if (this.objection) {
            const playingUsers = this.users.filter(u => u.status === 'playing' && !u.disconnected);
            const voteCount = Object.keys(this.objection.votes).filter(vId => playingUsers.some(p => p.id === vId)).length;
            if (voteCount >= playingUsers.length && playingUsers.length > 0) {
                if (this.objectionTimer) clearTimeout(this.objectionTimer);
                this.resolveObjection();
            }
        }

        this.checkPhaseProgression();

        const playingUsers = this.users.filter(u => u.status === 'playing' && !u.disconnected);
        if (playingUsers.length < 2 && (this.gameState === "PLAYING" || this.gameState === "WORD_SELECTION" || this.gameState === "JOKER_DRAFT" || this.gameState === "BETTING")) {
            this.endGame();
        } else if (wasCurrentTurn && this.gameState === "PLAYING") {
            this.currentTurnIndex = this.currentTurnIndex % Math.max(1, this.users.length);
            this.nextTurn(true);
        }

        this.broadcastState();
    }

    updateAvatar(userId, avatarIndex) {
        if (this.gameState !== "LOBBY") return;
        const user = this.users.find(u => u.id === userId);
        if (user) {
            user.avatar = avatarIndex;
            this.broadcastState();
        }
    }

    updateVoice(userId, enabled) {
        if (typeof enabled !== 'boolean') return;
        const user = this.users.find(u => u.id === userId);
        if (user) {
            user.isVoiceEnabled = enabled;
            this.broadcastState();
        }
    }

    updateSettings(userId, settings = {}) {
        if (this.gameState !== "LOBBY" || !settings || typeof settings !== "object") return false;
        const user = this.users.find(u => u.id === userId);
        if (!user || !user.isHost) return false;

        if (typeof settings.category === "string" && VALID_CATEGORIES.includes(settings.category)) {
            this.category = settings.category;
        }
        if (typeof settings.theme === "string" && VALID_THEMES.includes(settings.theme)) {
            this.theme = settings.theme;
        }
        if (typeof settings.map === "string" && VALID_MAPS.includes(settings.map)) {
            this.map = settings.map;
        }
        if (typeof settings.bettingEnabled === "boolean") {
            this.isBettingEnabled = settings.bettingEnabled;
        }
        if (typeof settings.betAmount === "number" && VALID_BET_AMOUNTS.includes(settings.betAmount)) {
            this.betAmount = settings.betAmount;
        }
        if (typeof settings.jokersEnabled === "boolean") {
            this.isJokersEnabled = settings.jokersEnabled;
        }
        if (typeof settings.gameMode === "string" && VALID_GAME_MODES.includes(settings.gameMode)) {
            this.gameMode = settings.gameMode;
            this.turnTime = this.gameMode === "blitz" ? 30 : 60;
        }

        this.broadcastState();
        return true;
    }

    async startGame(settings = {}) {
        return PhaseManager.startGame(this, settings);
    }

    startWordSelection() {
        return PhaseManager.startWordSelection(this);
    }

    startJokerDraft() {
        return PhaseManager.startJokerDraft(this);
    }

    selectJoker(userId, jokerId) {
        if (this.gameState !== "JOKER_DRAFT") return;
        const user = this.users.find(u => u.id === userId);
        if (!user || user.hasDrafted || !this.isJokersEnabled) return;
        
        if (user.jokerChoices.includes(jokerId)) {
            user.joker = jokerId;
            user.hasDrafted = true;
        }

        this.checkPhaseProgression();
        if (this.gameState === "JOKER_DRAFT") {
            this.broadcastState();
        }
    }

    placeBet(userId, targetId) {
        if (this.gameState !== "BETTING" || typeof targetId !== 'string') return;
        const user = this.users.find(u => u.id === userId);
        if (!user || user.hasPlacedBet) return;

        this.bets[userId] = targetId;
        user.hasPlacedBet = true;

        this.checkPhaseProgression();
        this.broadcastState();
    }

    startObjection(userId) {
        return objectionHandler.startObjection(this, userId);
    }

    voteObjection(userId, vote) {
        return objectionHandler.voteObjection(this, userId, vote);
    }

    resolveObjection() {
        return objectionHandler.resolveObjection(this);
    }

    setWord(userId, word) {
        if (this.gameState !== "WORD_SELECTION" || typeof word !== 'string') return;

        const cleanWord = word.trim().substring(0, 50);
        if (!cleanWord || cleanWord.length < 3 || !/^[a-zA-ZçğıöşüÇĞİÖŞÜ0-9\s]+$/.test(cleanWord)) {
            this.io.to(userId).emit("game:error", { message: "Geçersiz! Kelime en az 3 harfli olmalı ve sadece harf/rakamlardan oluşmalıdır." });
            return;
        }

        const user = this.users.find(u => u.id === userId);
        if (!user || !user.targetId || user.hasSubmittedWord) return;

        const targetUser = this.users.find(u => u.id === user.targetId);
        if (targetUser) {
            targetUser.assignedWord = cleanWord; 
            user.hasSubmittedWord = true;
        }

        this.checkPhaseProgression();
        this.broadcastState();
    }

    editWord(userId) {
        if (this.gameState !== "WORD_SELECTION") return;
        const user = this.users.find(u => u.id === userId);
        if (user && user.hasSubmittedWord) {
            user.hasSubmittedWord = false;
            const targetUser = this.users.find(u => u.id === user.targetId);
            if (targetUser) {
                targetUser.assignedWord = null;
            }
            this.broadcastState();
        }
    }

    shuffleTargets(userId) {
        if (this.gameState !== "WORD_SELECTION") return;
        const user = this.users.find(u => u.id === userId);
        if (!user || !user.isHost) return;

        const ids = this.users.filter(u => !u.disconnected).map(u => u.id);
        let shuffled = [...ids];
        let isValid = false;
        let attempts = 0;
        
        while (!isValid && attempts < 100) {
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            isValid = true;
            for (let i = 0; i < ids.length; i++) {
                if (ids[i] === shuffled[i]) {
                    isValid = false;
                    break;
                }
            }
            attempts++;
        }

        if (isValid) {
            for (let i = 0; i < ids.length; i++) {
                const p = this.users.find(u => u.id === ids[i]);
                if (p) {
                    p.targetId = shuffled[i];
                    p.hasSubmittedWord = false;
                    p.assignedWord = null;
                }
            }
            this.broadcastState();
        }
    }

    startPlaying() {
        return PhaseManager.startPlaying(this);
    }

    handleChat(userId, message) {
        if (typeof message !== 'string' || message.length > 150) return;
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        if (message.toLowerCase().startsWith('/kelime ')) {
            if (this.pendingMirrorWordOwner === userId) {
                const newWord = message.substring(8).trim().toLocaleUpperCase("tr-TR").replace(/[^A-ZÇĞİÖŞÜ0-9 ]/g, "").trim();
                const alnumLen = newWord.replace(/\s+/g, "").length;
                const target = this.users.find(u => u.id === this.pendingMirrorWordTarget);
                
                if (target && alnumLen >= 3) {
                    target.assignedWord = newWord.substring(0, 30);
                    target.isWaitingMirrorWord = false;
                    target.revealedLetters = [];
                    this.pendingMirrorWordOwner = null;
                    this.pendingMirrorWordTarget = null;
                    if (this.mirrorWordTimer) {
                        clearTimeout(this.mirrorWordTimer);
                        this.mirrorWordTimer = null;
                    }
                    this.addChatLog({ system: true, message: `🧠 Ayna sahibi ${user.name}, geri seken jokerle ${target.name}'in yeni kelimesini acımasızca belirledi!`, timestamp: Date.now() });
                    this.broadcastState();
                } else {
                    this.io.to(userId).emit("game:error", { message: "Geçerli ve en az 3 harfli bir kelime girmelisiniz!" });
                }
                return;
            }
        }

        this.addChatLog({
            userId: user.id,
            name: user.name,
            nameColor: user.nameColor,
            message: message,
            timestamp: Date.now()
        });
        // broadcastState çağrılmıyor; addChatLog doğrudan game:new_chat event'ini yayınlar
    }

    skipTurn(userId) {
        return TurnManager.skipTurn(this, userId);
    }

    async guessWord(userId, guess) {
        return guessHandler.guessWord(this, userId, guess);
    }

    openLettersForUser(user, count) {
        return TurnManager.openLettersForUser(this, user, count);
    }

    useJoker(userId, payload) {
        return JokerManager.executeJoker(this, userId, payload);
    }

    askQuestion(userId, question) {
        return questionHandler.askQuestion(this, userId, question);
    }

    submitVote(userId, voteType) {
        return questionHandler.submitVote(this, userId, voteType);
    }

    resolveQuestion() {
        return questionHandler.resolveQuestion(this);
    }

    nextTurn(isDisconnect = false) {
        return TurnManager.nextTurn(this, isDisconnect);
    }

    startTimer() {
        return TurnManager.startTimer(this);
    }

    async endGame() {
        return PhaseManager.endGame(this);
    }

    broadcastState() {
        return StateSerializer.broadcastState(this);
    }

    broadcastHeadRotation(socketOrId, payload) {
        return StateSerializer.broadcastHeadRotation(this, socketOrId, payload);
    }

    playTaunt(userId, type) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        const now = Date.now();
        if (now - user.lastTauntTime < 1500) return; 
        user.lastTauntTime = now;

        this.io.to(this.code).emit("game:play_taunt", { userId, type });
    }
}

module.exports = Room;
