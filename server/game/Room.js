const User = require('../models/User');
const JokerManager = require('./jokers');
const questionHandler = require('./handlers/questionHandler');
const guessHandler = require('./handlers/guessHandler');
const objectionHandler = require('./handlers/objectionHandler');

class Room {
    constructor(code, io) {
        this.code = code;
        this.io = io;
        this.users = [];
        this.gameState = "LOBBY";
        this.category = ""; this.theme = "day"; this.map = "floating_island__low_poly_vr.glb";
        this.activeQuestion = null;
        
        this.turnTime = 60;
        this.timer = null;
        this.turnTimeLeft = 0;
        this.currentTurnIndex = 0;
        this.roundCount = 1;

        this.chatHistory = [];
        this.winners = []; 
        this.pendingMirrorWordOwner = null;
        this.pendingMirrorWordTarget = null;
        this.mirrorWordTimer = null;
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

    addUser(socketId, name, dbId, avatar, pedestal = 'default_stone', reputation = 0, nameColor = 'text-white', title = '') {
        if (dbId) {
            const existingUser = this.users.find(u => u.dbId === dbId);
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
                this.broadcastState();
                return;
            }
        }

        const isHost = this.users.length === 0;
        this.users.push({
            id: socketId,
            dbId: dbId,
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
        this.broadcastState();
    }

    checkPhaseProgression() {
        const playingUsers = this.users.filter(u => u.status === 'playing' && !u.disconnected);
        if (playingUsers.length < 2) return;

        if (this.gameState === "BETTING") {
            if (playingUsers.every(u => u.hasPlacedBet)) {
                this.startWordSelection();
            }
        } else if (this.gameState === "WORD_SELECTION") {
            if (playingUsers.every(u => u.hasSubmittedWord)) {
                this.startJokerDraft();
            }
        } else if (this.gameState === "JOKER_DRAFT") {
            if (playingUsers.every(u => u.hasDrafted)) {
                if (this.jokerDraftTimer) clearTimeout(this.jokerDraftTimer);
                this.startPlaying();
            }
        }
    }

    removeUser(socketId) {
        const user = this.users.find(u => u.id === socketId);
        if (!user) return this.users.length === 0;

        user.disconnected = true;

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
        const wasHost = user.isHost;
        const wasCurrentTurn = this.gameState === "PLAYING" && this.currentTurnIndex === userIndex;

        this.users.splice(userIndex, 1);

        if (this.users.length > 0 && wasHost) {
            const nextHost = this.users.find(u => !u.disconnected) || this.users[0];
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
                clearTimeout(this.objectionTimer);
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

    async startGame(settings = {}) {
        const activeUsers = this.users.filter(u => !u.disconnected);
        if (activeUsers.length < 2) return; 

        this.category = settings.category || "Karışık"; this.theme = settings.theme || "day"; this.map = settings.map || "floating_island__low_poly_vr.glb";
        this.initialPlayerCount = activeUsers.length;
        this.isBettingEnabled = settings.bettingEnabled || false;
        this.betAmount = settings.betAmount || 50;
        this.isJokersEnabled = settings.jokersEnabled !== undefined ? settings.jokersEnabled : true;
        this.bets = {};
        this.hasObjectionUsed = false;
        this.objection = null;
        this.roundCount = 1;

        if (this.isBettingEnabled) {
            const User = require('../models/User');
            let failedUser = null;
            const deductedUsers = [];
            for (let u of activeUsers) {
                if (u.dbId) {
                    const updatedUser = await User.findOneAndUpdate(
                        { _id: u.dbId, gold: { $gte: this.betAmount } },
                        { $inc: { gold: -this.betAmount } },
                        { new: true }
                    );
                    if (!updatedUser) {
                        failedUser = u;
                        break;
                    } else {
                        deductedUsers.push(u.dbId);
                    }
                } else {
                    failedUser = u;
                    break;
                }
            }

            if (failedUser) {
                for (let dbId of deductedUsers) {
                    await User.findByIdAndUpdate(dbId, { $inc: { gold: this.betAmount } });
                }
                this.io.to(this.code).emit("game:error", { message: `${failedUser.name} isimli oyuncunun yeterli altını (${this.betAmount}) yok veya giriş yapmamış!` });
                if (this.gameState === "ROUND_END") {
                    this.gameState = "LOBBY";
                    this.broadcastState();
                }
                return;
            }

            this.gameState = "BETTING";
            this.chatHistory = [];
            this.roundLogs = [];
            this.winners = [];
            this.bettingEndTime = Date.now() + 10000;
            
            for (let i = 0; i < this.users.length; i++) {
                this.users[i].status = this.users[i].disconnected ? 'spectator' : 'playing';
                this.users[i].lives = 3;
                this.users[i].assignedWord = null;
                this.users[i].hasSubmittedWord = false;
                this.users[i].hasPlacedBet = false;
            }
            this.broadcastState();

            this.betTimer = setTimeout(() => {
                this.startWordSelection();
            }, 10000);
            return;
        }

        this.startWordSelection();
    }

    startWordSelection() {
        if (this.betTimer) clearTimeout(this.betTimer);
        this.gameState = "WORD_SELECTION";
        this.chatHistory = [];
        this.roundLogs = [];
        this.winners = [];

        const activeUsers = this.users.filter(u => !u.disconnected);

        for (let i = 0; i < this.users.length; i++) {
            this.users[i].status = this.users[i].disconnected ? 'spectator' : 'playing';
            this.users[i].lives = 3;
            this.users[i].assignedWord = null;
            this.users[i].hasSubmittedWord = false;
            this.users[i].joker = null;
            this.users[i].hasDrafted = false;
            this.users[i].jokerChoices = [];
            this.users[i].hasUsedJoker = false;
            this.users[i].russianRouletteActive = false;
            this.users[i].bloodTieTarget = null;
            this.users[i].timeBomb = null;
            this.users[i].detectiveUses = 0;
            this.users[i].lastDetectiveRound = 0;
            this.users[i].mirrorRoundsLeft = 0;
            this.users[i].shieldActive = false;
            this.users[i].extraQuestionChain = false;
            this.users[i].revealedLetters = [];
            this.users[i].silencedTurns = 0;
            this.users[i].extraQuestions = 0;
            this.users[i].questionsAskedThisTurn = 0;
            this.users[i].targetId = null;
        }

        for (let i = 0; i < activeUsers.length; i++) {
            const nextIndex = (i + 1) % activeUsers.length;
            activeUsers[i].targetId = activeUsers[nextIndex].id;
        }

        this.broadcastState();
    }

    startJokerDraft() {
        if (!this.isJokersEnabled) {
            this.startPlaying();
            return;
        }

        this.gameState = "JOKER_DRAFT";
        
        const getRandomJoker = () => {
            const r = Math.random() * 100;
            if (r < 10) return [4, 5, 6, 7, 13][Math.floor(Math.random() * 5)];
            if (r < 40) return [2, 3, 8, 12, 15][Math.floor(Math.random() * 5)];
            return [0, 1, 9, 10, 11, 14, 16][Math.floor(Math.random() * 7)];
        };

        for (let u of this.users) {
            if (u.status === 'playing' && !u.disconnected) {
                let j1 = getRandomJoker();
                let j2 = getRandomJoker();
                while (j1 === j2) j2 = getRandomJoker();
                u.jokerChoices = [j1, j2];
                u.hasDrafted = false;
                u.joker = null;
            }
        }
        
        this.jokerDraftEndTime = Date.now() + 15000;
        this.jokerDraftTimer = setTimeout(() => {
            for (let u of this.users) {
                if (u.status === 'playing' && !u.hasDrafted && this.isJokersEnabled) {
                    u.joker = u.jokerChoices ? u.jokerChoices[0] : null;
                    u.hasDrafted = true;
                }
            }
            this.startPlaying();
        }, 15000);
        
        this.broadcastState();
    }

    selectJoker(userId, jokerId) {
        if(this.gameState !== "JOKER_DRAFT") return;
        const user = this.users.find(u => u.id === userId);
        if(!user || user.hasDrafted || !this.isJokersEnabled) return;
        
        if(user.jokerChoices.includes(jokerId)) {
            user.joker = jokerId;
            user.hasDrafted = true;
        }

        this.checkPhaseProgression();
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
        this.gameState = "PLAYING";
        this.roundCount = 1;
        this.activeQuestion = null;
        this.resolvedQuestionsThisTurn = [];
        
        const firstPlayableIndex = this.users.findIndex(u => !u.disconnected && u.status === 'playing');
        this.currentTurnIndex = firstPlayableIndex !== -1 ? firstPlayableIndex : 0;

        this.startTimer();
        this.broadcastState();
    }

    handleChat(userId, message) {
        if (typeof message !== 'string' || message.length > 150) return;
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        if (message.toLowerCase().startsWith('/kelime ')) {
            if (this.pendingMirrorWordOwner === userId) {
                const newWord = message.substring(8).trim().toLocaleUpperCase("tr-TR").replace(/[^A-ZÇĞİÖŞÜ0-9 ]/g, "");
                const target = this.users.find(u => u.id === this.pendingMirrorWordTarget);
                
                if (target && newWord.length > 0) {
                    target.assignedWord = newWord.substring(0, 30);
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
                    this.io.to(userId).emit("game:error", { message: "Geçerli bir kelime girmelisiniz!" });
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
        if (this.gameState !== "PLAYING") return;
        const currentUser = this.users[this.currentTurnIndex];
        if (currentUser.id !== userId) return;
        
        if (currentUser.russianRouletteActive) return;

        this.nextTurn();
    }

    async guessWord(userId, guess) {
        return guessHandler.guessWord(this, userId, guess);
    }

    openLettersForUser(user, count) {
        if (!user.assignedWord) return;
        const word = user.assignedWord.toLocaleUpperCase("tr-TR").replace(/[^A-ZÇĞİÖŞÜ0-9]/g, "");
        for(let k=0; k<count; k++) {
            const unrevealed = word.split('').filter(c => !user.revealedLetters.includes(c));
            if (unrevealed.length === 0) {
                this.addChatLog({ system: true, privateTo: user.id, message: "Sistem (Özel): Açılacak başka harf kalmadı!", timestamp: Date.now() });
                break;
            }
            const randomChar = unrevealed[Math.floor(Math.random() * unrevealed.length)];
            user.revealedLetters.push(randomChar);
            const countChar = word.split('').filter(c => c === randomChar).length;
            this.addChatLog({ system: true, privateTo: user.id, message: `Sistem (Özel): Kelimen '${randomChar}' karakterini içeriyor (${countChar} adet).`, timestamp: Date.now() });
        }
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
        if (this.questionTimer) {
            clearTimeout(this.questionTimer);
            this.questionTimer = null;
        }
        this.activeQuestion = null;
        this.resolvedQuestionsThisTurn = [];
        if (this.gameState !== "PLAYING") return;

        if (!isDisconnect) {
            const prevUser = this.users[this.currentTurnIndex];
            if (prevUser && prevUser.status === 'playing') {
                if (prevUser.russianRouletteActive) {
                    let dmg = 3;
                    let shielded = false;
                    if (prevUser.shieldActive) {
                        shielded = true;
                        prevUser.shieldActive = false;
                        dmg -= 1;
                        this.io.to(this.code).emit("game:visual_effect", { type: 'shield_cast', targetId: prevUser.id });
                    }
                    
                    prevUser.lives -= dmg;
                    prevUser.russianRouletteActive = false;
                    
                    if (prevUser.lives <= 0) {
                        prevUser.status = 'spectator';
                        prevUser.bloodTieTarget = null;
                        prevUser.timeBomb = null;
                        this.io.to(this.code).emit("game:visual_effect", { type: 'roulette_die', targetId: prevUser.id });
                        this.addChatLog({ system: true, message: `💀 ${prevUser.name} Rus Ruleti süresini aştı ve elendi!`, timestamp: Date.now() });
                    } else {
                        this.addChatLog({ system: true, message: `🛡️ ${prevUser.name} Rus Ruleti süresini aştı! Kalkanı parçalandı ve ağır hasar aldı ama yaşıyor!`, timestamp: Date.now() });
                    }
                    
                    const activePlayers = this.users.filter(x => x.status === 'playing');
                    if (activePlayers.length <= 1) {
                        this.endGame();
                        return;
                    }
                }
                prevUser.extraQuestionChain = false;
                prevUser.extraQuestions = 0;
            }
        }

        let spins = 0;
        let foundNext = false;
        const maxSpins = this.users.length * 3;

        while (spins < maxSpins) {
            spins++;
            if (!isDisconnect || spins > 1) {
                this.currentTurnIndex = (this.currentTurnIndex + 1) % this.users.length;
                
                if (this.currentTurnIndex === 0) {
                    this.roundCount++;
                    
                    for (let u of this.users) {
                        if (u.status === 'playing') {
                            if (u.mirrorRoundsLeft > 0) u.mirrorRoundsLeft--;
                            
                            if (u.timeBomb) {
                                u.timeBomb.roundsLeft--;
                                if (u.timeBomb.roundsLeft <= 0) {
                                    let dmg = 2;
                                    let shielded = false;
                                    if (u.shieldActive) {
                                        shielded = true;
                                        u.shieldActive = false;
                                        dmg -= 1;
                                        this.io.to(this.code).emit("game:visual_effect", { type: 'shield_cast', targetId: u.id });
                                    }
                                    
                                    u.lives -= dmg;
                                    u.timeBomb = null;
                                    this.io.to(this.code).emit("game:visual_effect", { type: 'bomb_explode', targetId: u.id });
                                    
                                    if (shielded) {
                                        this.addChatLog({ system: true, message: `🛡️ 💥 GÜM! Saatli Bomba patladı! ${u.name}'in kalkanı kırıldı ama yine de 1 can kaybetti! (-1 Can)`, timestamp: Date.now() });
                                    } else {
                                        this.addChatLog({ system: true, message: `💥 GÜM! Süre doldu. ${u.name}'in üzerindeki Saatli Bomba patladı! (-2 Can)`, timestamp: Date.now() });
                                    }
                                    
                                    if (u.lives <= 0) {
                                        u.status = 'spectator';
                                        u.bloodTieTarget = null;
                                        this.addChatLog({ system: true, message: `💀 ${u.name} bombanın etkisiyle elendi! Kelimesi: ${u.assignedWord}`, timestamp: Date.now() });
                                    }
                                }
                            }
                        }
                    }
                    
                    const activePlayers = this.users.filter(x => x.status === 'playing');
                    if (activePlayers.length <= 1) {
                        this.endGame();
                        return;
                    }
                }
            }
            
            const nextUser = this.users[this.currentTurnIndex];
            if (nextUser && nextUser.status === 'playing') {
                if (nextUser.silencedTurns > 0) {
                    nextUser.silencedTurns--;
                    this.addChatLog({
                        system: true,
                        message: `🤐 ${nextUser.name} susturulduğu için sırasını atlıyor.`,
                        timestamp: Date.now()
                    });
                } else {
                    nextUser.questionsAskedThisTurn = 0;
                    nextUser.lastQuestion = null;
                    nextUser.lastQuestions = [];
                    foundNext = true;
                    break; 
                }
            }
        } 

        if (!foundNext) {
            this.endGame();
            return;
        }

        this.startTimer();
        this.broadcastState();
    }

    startTimer() {
        if (this.timer) clearTimeout(this.timer);
        
        this.turnStartTime = Date.now();
        
        this.timer = setTimeout(() => {
            if (this.gameState === "PLAYING") {
                this.nextTurn();
            }
        }, this.turnTime * 1000);
    }

    endGame() {
        this.gameState = "ROUND_END";
        if (this.timer) clearTimeout(this.timer);
        if (this.questionTimer) clearTimeout(this.questionTimer);
        if (this.mirrorWordTimer) clearTimeout(this.mirrorWordTimer);
        if (this.betTimer) clearTimeout(this.betTimer);
        if (this.jokerDraftTimer) clearTimeout(this.jokerDraftTimer);
        
        const User = require('../models/User');
        for (let u of this.users) {
            if (u.dbId && !this.winners.includes(u.id)) {
                
                u.reputation += 5; 
                
                User.findById(u.dbId).then(userDb => {
                    if (userDb) {
                        userDb.reputation += 5;
                        if (userDb.quests && userDb.quests.active) {
                            userDb.quests.active.forEach(q => {
                                if (q.type === 'play' && !q.isClaimed && q.progress < q.target) q.progress++;
                            });
                            userDb.markModified('quests');
                        }
                        return userDb.save();
                    }
                }).catch(err => console.error("Reputation update error:", err));
            }
        }
        
        this.broadcastState();
    }

    broadcastState() {
        this.users.forEach(user => {
            const usersPayload = this.users.map(u => ({
                id: u.id,
                name: u.name,
                isHost: u.isHost,
                avatar: u.avatar,
                pedestal: u.pedestal,
                nameColor: u.nameColor,
                title: u.title,
                reputation: u.reputation || 0,
                status: u.status,
                targetId: u.targetId,
                hasSubmittedWord: u.hasSubmittedWord,
                isVoiceEnabled: u.isVoiceEnabled,
                lives: u.lives,
                joker: u.id === user.id ? u.joker : null,
                jokerChoices: u.id === user.id ? u.jokerChoices : undefined,
                hasDrafted: u.hasDrafted,
                hasUsedJoker: u.hasUsedJoker,
                russianRouletteActive: u.russianRouletteActive,
                bloodTieTarget: u.bloodTieTarget,
                timeBomb: u.timeBomb,
                mirrorRoundsLeft: (u.id === user.id) ? (u.mirrorRoundsLeft || 0) : 0, 
                shieldActive: (u.id === user.id) ? !!u.shieldActive : false, 
                extraQuestionChain: (u.id === user.id) ? u.extraQuestionChain : false,
                silencedTurns: u.silencedTurns,
                extraQuestions: u.extraQuestions || 0,
                questionsAskedThisTurn: u.questionsAskedThisTurn || 0,
                lastQuestion: u.lastQuestion,
                lastQuestions: u.lastQuestions || [],
                assignedWord: (this.gameState === "ROUND_END" || u.id !== user.id) ? u.assignedWord : null
            }));

            const payload = {
                gameState: this.gameState,
                category: this.category, theme: this.theme, map: this.map,
                isBettingEnabled: this.isBettingEnabled,
                betAmount: this.betAmount,
                isJokersEnabled: this.isJokersEnabled,
                activeQuestion: this.activeQuestion,
                resolvedQuestionsThisTurn: this.resolvedQuestionsThisTurn || [],
                users: usersPayload,
                currentTurnUserId: this.gameState === "PLAYING" ? this.users[this.currentTurnIndex]?.id : null,
                turnEndsAt: this.gameState === "PLAYING" ? (this.activeQuestion ? Date.now() + this.pausedRemainingMs : this.turnStartTime + (this.turnTime * 1000)) : null,
                chatHistory: this.chatHistory.filter(c => !c.privateTo || c.privateTo === user.id).map(c => ({
                    system: c.system,
                    userId: c.userId,
                    name: c.name,
                    nameColor: c.nameColor,
                    message: c.message,
                    timestamp: c.timestamp
                })),
                winners: this.winners,
                objection: this.objection,
                hasObjectionUsed: this.hasObjectionUsed,
                bettingEndTime: this.bettingEndTime,
                jokerDraftEndTime: this.jokerDraftEndTime,
                roundCount: this.roundCount || 1,
                roundLogs: this.gameState === "ROUND_END" ? this.roundLogs : []
            };

            this.io.to(user.id).emit("game:state", payload);
        });
    }

    broadcastHeadRotation(userId, payload) {
        if (!payload || typeof payload.pitch !== 'number' || typeof payload.yaw !== 'number') return;
        
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        const now = Date.now();
        if (now - user.lastHeadRotTime < 50) return; 
        user.lastHeadRotTime = now;

        this.io.to(this.code).emit("game:head_update", {
            userId,
            pitch: payload.pitch,
            yaw: payload.yaw
        });
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
