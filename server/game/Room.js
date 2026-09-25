const User = require('../models/User');

class Room {
    constructor(code, io) {
        this.code = code;
        this.io = io;
        this.users = [];
        this.gameState = "LOBBY";
        this.category = "";
        this.activeQuestion = null;
        
        this.turnTime = 60;
        this.timer = null;
        this.turnTimeLeft = 0;
        this.currentTurnIndex = 0;

        this.chatHistory = [];
        this.winners = []; 
    }

    addUser(socketId, name, dbId, avatar) {
        if (dbId) {
            const existingUser = this.users.find(u => u.dbId === dbId && u.disconnected);
            if (existingUser) {
                const oldId = existingUser.id;
                if (existingUser.disconnectTimer) {
                    clearTimeout(existingUser.disconnectTimer);
                    existingUser.disconnectTimer = null;
                }
                existingUser.id = socketId;
                existingUser.disconnected = false;
                
                this.users.forEach(u => {
                    if (u.targetId === oldId) u.targetId = socketId;
                });
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
            avatar: avatar || 'default-violet',
            targetId: null,
            assignedWord: null,
            status: 'playing',
            hasSubmittedWord: false,
            isVoiceEnabled: false,
            lives: 3,
            disconnected: false,
            joker: null,
            hasUsedJoker: false,
            silencedTurns: 0,
            extraQuestions: 0
        });
        this.broadcastState();
    }

    removeUser(socketId) {
        const user = this.users.find(u => u.id === socketId);
        if (!user) return this.users.length === 0;

        user.disconnected = true;
        this.broadcastState();

        const allDisconnected = this.users.every(u => u.disconnected);
        if (allDisconnected) return true; 

        user.disconnectTimer = setTimeout(() => {
            this.permanentlyRemoveUser(socketId);
        }, 60000);

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

        const playingUsers = this.users.filter(u => u.status === 'playing' && !u.disconnected);
        if (playingUsers.length < 2 && (this.gameState === "PLAYING" || this.gameState === "WORD_SELECTION")) {
            this.endGame();
        } else if (wasCurrentTurn && this.gameState === "PLAYING") {
            
            this.currentTurnIndex = this.currentTurnIndex % this.users.length;
            
            this.nextTurn();
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
        const user = this.users.find(u => u.id === userId);
        if (user) {
            user.isVoiceEnabled = enabled;
            this.broadcastState();
        }
    }

    async startGame(settings = {}) {
        if (this.users.length < 2) return; 

        this.category = settings.category || "Karışık";
        this.initialPlayerCount = this.users.length;
        this.isBettingEnabled = settings.bettingEnabled || false;
        this.betAmount = settings.betAmount || 50;
        this.isJokersEnabled = settings.jokersEnabled !== undefined ? settings.jokersEnabled : true;
        this.bets = {};
        this.hasObjectionUsed = false;

        if (this.isBettingEnabled) {
            const User = require('../models/User');
            // Check if all players have enough gold
            for (let u of this.users) {
                if (u.dbId) {
                    const userDb = await User.findById(u.dbId);
                    if (!userDb || userDb.gold < this.betAmount) {
                        this.io.to(this.code).emit("game:error", { message: `${u.name} isimli oyuncunun yeterli altını (${this.betAmount}) yok!` });
                        return;
                    }
                } else {
                    this.io.to(this.code).emit("game:error", { message: `${u.name} giriş yapmadığı için bahisli moda katılamaz!` });
                    return;
                }
            }
            
            // Deduct gold from all
            for (let u of this.users) {
                await User.findByIdAndUpdate(u.dbId, { $inc: { gold: -this.betAmount } });
            }

            this.gameState = "BETTING";
            this.chatHistory = [];
            this.roundLogs = [];
            this.winners = [];
            this.bettingEndTime = Date.now() + 10000;
            
            for (let i = 0; i < this.users.length; i++) {
                this.users[i].status = 'playing';
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

        const availableJokers = [0, 1, 2, 3, 4];
        for(let i = availableJokers.length - 1; i > 0; i--){
            const j = Math.floor(Math.random() * (i + 1));
            [availableJokers[i], availableJokers[j]] = [availableJokers[j], availableJokers[i]];
        }
        
        for (let i = 0; i < this.users.length; i++) {
            this.users[i].status = 'playing';
            this.users[i].assignedWord = null;
            this.users[i].hasSubmittedWord = false;
            this.users[i].joker = this.isJokersEnabled ? availableJokers[i % availableJokers.length] : null;
            this.users[i].hasUsedJoker = false;
            this.users[i].silencedTurns = 0;
            this.users[i].extraQuestions = 0;
            this.users[i].questionsAskedThisTurn = 0;
            this.users[i].hintStr = null;
            
            const nextIndex = (i + 1) % this.users.length;
            this.users[i].targetId = this.users[nextIndex].id;
        }

        this.broadcastState();
    }

    placeBet(userId, targetId) {
        if (this.gameState !== "BETTING") return;
        const user = this.users.find(u => u.id === userId);
        if (!user || user.hasPlacedBet) return;

        this.bets[userId] = targetId;
        user.hasPlacedBet = true;

        const allBet = this.users.filter(u => u.status === 'playing').every(u => u.hasPlacedBet);
        if (allBet) {
            this.startWordSelection();
        } else {
            this.broadcastState();
        }
    }

    startObjection(userId) {
        if (!this.isBettingEnabled || this.objection || this.gameState !== "PLAYING" || this.hasObjectionUsed) return;
        
        const initiator = this.users.find(u => u.id === userId);
        if (!initiator) return;

        this.hasObjectionUsed = true;
        if (this.timer) clearTimeout(this.timer);
        
        this.objection = {
            initiator: initiator.name,
            votes: {},
            endTime: Date.now() + 15000 
        };
        
        this.objection.votes[userId] = true;
        this.broadcastState();
        
        this.objectionTimer = setTimeout(() => {
            this.resolveObjection();
        }, 15000);
    }

    voteObjection(userId, vote) {
        if (!this.objection) return;
        this.objection.votes[userId] = vote;
        
        const playingUsers = this.users.filter(u => u.status === 'playing');
        if (Object.keys(this.objection.votes).length === playingUsers.length) {
            clearTimeout(this.objectionTimer);
            this.resolveObjection();
        } else {
            this.broadcastState();
        }
    }

    async resolveObjection() {
        if (!this.objection) return;
        
        const playingUsers = this.users.filter(u => u.status === 'playing');
        let yesVotes = 0;
        for (let v of Object.values(this.objection.votes)) {
            if (v === true) yesVotes++;
        }
        
        const majority = Math.ceil(playingUsers.length / 2);
        
        const User = require('../models/User');
        if (yesVotes >= majority) {
            for (let u of this.users) {
                if (u.dbId) {
                    await User.findByIdAndUpdate(u.dbId, { $inc: { gold: this.betAmount } }).catch(err => console.error(err));
                }
            }
            this.io.to(this.code).emit("game:error", { message: `🚨 Şike itirazı kabul edildi! Oyun iptal edildi, herkese ${this.betAmount} Altın iade edildi.` });
            
            this.objection = null;
            if (this.timer) clearInterval(this.timer);
            this.gameState = "LOBBY";
            this.chatHistory = [];
            this.broadcastState();
        } else {
            this.io.to(this.code).emit("game:error", { message: `❌ Şike itirazı reddedildi! Yeterli çoğunluk sağlanamadı.` });
            this.objection = null;
            this.startTimer();
            this.broadcastState();
        }
    }
    setWord(userId, word) {
        if (this.gameState !== "WORD_SELECTION") return;

        const user = this.users.find(u => u.id === userId);
        if (!user || !user.targetId || user.hasSubmittedWord) return;

        const targetUser = this.users.find(u => u.id === user.targetId);
        if (targetUser) {
            targetUser.assignedWord = word.trim();
            user.hasSubmittedWord = true;
        }

        const allAssigned = this.users.every(u => u.hasSubmittedWord);
        if (allAssigned) {
            this.startPlaying();
        } else {
            this.broadcastState();
        }
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

        const ids = this.users.map(u => u.id);
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
            for (let i = 0; i < this.users.length; i++) {
                this.users[i].targetId = shuffled[i];
                this.users[i].hasSubmittedWord = false;
                this.users[i].assignedWord = null;
            }
            this.broadcastState();
        }
    }

    startPlaying() {
        this.gameState = "PLAYING";
        this.currentTurnIndex = 0;
        this.activeQuestion = null;
        this.startTimer();
        this.broadcastState();
    }

    handleChat(userId, message) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        this.chatHistory.push({
            userId: user.id,
            name: user.name,
            message: message,
            timestamp: Date.now()
        });

        this.broadcastState();
    }

    skipTurn(userId) {
        if (this.gameState !== "PLAYING") return;
        const currentUser = this.users[this.currentTurnIndex];
        if (currentUser.id !== userId) return;

        this.nextTurn();
    }

    guessWord(userId, guess) {
        if (this.gameState !== "PLAYING") return;
        
        const currentUser = this.users[this.currentTurnIndex];
        if (currentUser.id !== userId) return;

        const user = this.users.find(u => u.id === userId);
        if (!user || user.status !== 'playing') return;

        const normalizedTarget = (user.assignedWord || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const normalizedGuess = (guess || "").toLowerCase().replace(/[^a-z0-9]/g, "");

        const isCorrect = normalizedTarget === normalizedGuess || 
                         (normalizedTarget.includes(normalizedGuess) && normalizedGuess.length > 3) ||
                         (normalizedGuess.includes(normalizedTarget) && normalizedTarget.length > 3);

        if (isCorrect) {
            user.status = 'spectator';
            this.winners.push(user.id);
            const User = require('../models/User');
            
            let winnerReward = 0; 
            const rank = this.winners.length; 
            
            if (this.isBettingEnabled) {
                const playersCount = this.initialPlayerCount || this.users.length;
                const totalPot = playersCount * this.betAmount;
                let pct = 0;
                
                if (playersCount <= 2) {
                    pct = rank === 1 ? 1.0 : 0;
                } else if (playersCount === 3) {
                    pct = rank === 1 ? 0.60 : (rank === 2 ? 0.40 : 0);
                } else if (playersCount === 4) {
                    pct = rank === 1 ? 0.50 : (rank === 2 ? 0.30 : (rank === 3 ? 0.20 : 0));
                } else {
                    if (rank === 1) pct = 0.40;
                    else if (rank === 2) pct = 0.30;
                    else if (rank === 3) pct = 0.20;
                    else if (rank === 4) pct = 0.10;
                    else pct = 0;
                }
                
                winnerReward = Math.floor(totalPot * pct);
            }
            
            let xpReward = 30;
            if (rank === 1) xpReward = 150;
            else if (rank === 2) xpReward = 100;
            else if (rank === 3) xpReward = 75;
            else if (rank === 4) xpReward = 50;
            
            if (user.dbId) {
                User.findByIdAndUpdate(user.dbId, { $inc: { gold: winnerReward, xp: xpReward } })
                    .catch(err => console.error("Reward update error:", err));
            }

            let winMsg = "";
            if (this.isBettingEnabled) {
                winMsg = `${user.name} doğru tahmin etti! (${rank}. oldu) ve ${winnerReward} Altın kazandı! Kelimesi: ${user.assignedWord}`;
            } else {
                winMsg = `${user.name} doğru tahmin etti! (${rank}. oldu) ve ${xpReward} XP kazandı! Kelimesi: ${user.assignedWord}`;
            }
            this.chatHistory.push({ system: true, message: winMsg, timestamp: Date.now() });
            this.roundLogs.push(winMsg);

            if (this.isBettingEnabled && bettorReward > 0) {
                const bettors = Object.keys(this.bets || {}).filter(uid => this.bets[uid] === user.id);
                let bettorNames = [];
                
                for (let uid of bettors) {
                    const bettorUser = this.users.find(u => u.id === uid);
                    if (bettorUser && bettorUser.dbId) {
                        User.findByIdAndUpdate(bettorUser.dbId, { $inc: { gold: bettorReward, xp: 50 } })
                            .catch(err => console.error("Gold update error:", err));
                        bettorNames.push(bettorUser.name);
                    }
                }
                
                if (bettorNames.length > 0) {
                    const betMsg = `🎲 ${user.name} üzerine bahis oynayan ${bettorNames.join(', ')} ekstra ${bettorReward} Altın daha kazandı!`;
                    this.chatHistory.push({ system: true, message: betMsg, timestamp: Date.now() });
                    this.roundLogs.push(betMsg);
                }
            }

            const playingUsers = this.users.filter(u => u.status === 'playing');
            if (playingUsers.length <= 1) { 
                this.endGame();
                return;
            }

            if (this.users[this.currentTurnIndex].id === userId) {
                this.nextTurn();
            } else {
                this.broadcastState();
            }
        } else {
            user.lives--;
            if (user.lives <= 0) {
                user.status = 'spectator';
                this.chatHistory.push({
                    system: true,
                    message: `${user.name} tüm tahmin haklarını kaybetti ve izleyici oldu! Kelimesi: ${user.assignedWord}`,
                    timestamp: Date.now()
                });
            } else {
                this.chatHistory.push({
                    system: true,
                    message: `${user.name} yanlış tahminde bulundu! (${guess}) (Kalan Can: ${user.lives})`,
                    timestamp: Date.now()
                });
            }

            const playingUsers = this.users.filter(u => u.status === 'playing');
            if (playingUsers.length <= 1) { 
                this.endGame();
                return;
            }

            if (this.users[this.currentTurnIndex].id === userId) {
                this.nextTurn();
            } else {
                this.broadcastState();
            }
        }
    }

    useJoker(userId, payload) {
        if (this.gameState !== "PLAYING") return;
        const user = this.users.find(u => u.id === userId);
        if (!user || user.status !== 'playing' || user.hasUsedJoker || user.joker === null) return;

        user.hasUsedJoker = true;
        const jokerType = user.joker;

        switch (jokerType) {
            case 0: 
                if (this.currentTurnIndex !== -1 && this.users[this.currentTurnIndex].id === userId) {
                    if (this.timer) clearTimeout(this.timer);
                    this.turnTimeLeft = (this.turnStartTime + (this.turnTime * 1000) - Date.now()) / 1000;
                    const newTime = this.turnTimeLeft + 60;
                    this.turnStartTime = Date.now() - (this.turnTime * 1000 - newTime * 1000); 
                    
                    this.timer = setTimeout(() => {
                        if (this.gameState === "PLAYING") {
                            this.nextTurn();
                        }
                    }, newTime * 1000);
                    
                    this.chatHistory.push({ system: true, message: `${user.name} joker kullanarak süresine 1 dakika ekledi!`, timestamp: Date.now() });
                }
                break;
            case 1: 
                if (payload && payload.targetId && payload.newWord) {
                    const target = this.users.find(u => u.id === payload.targetId);
                    if (target) {
                        target.assignedWord = payload.newWord;
                        this.chatHistory.push({ system: true, message: `${user.name}, bir oyuncunun kelimesini değiştirdi!`, timestamp: Date.now() });
                    }
                }
                break;
            case 2: 
                user.extraQuestions = 3;
                this.chatHistory.push({ system: true, message: `${user.name}, joker kullanarak 3 ekstra soru sorma hakkı kazandı!`, timestamp: Date.now() });
                break;
            case 3: 
                if (user.assignedWord) {
                    if (!user.hintStr) {
                        let hint = "";
                        for (let i = 0; i < user.assignedWord.length; i++) {
                            hint += (user.assignedWord[i] === ' ') ? ' ' : '_';
                        }
                        user.hintStr = hint;
                    }

                    const word = user.assignedWord;
                    let hiddenIndices = [];
                    for(let i = 0; i < word.length; i++) {
                        if(user.hintStr[i] === '_') hiddenIndices.push(i);
                    }
                    if(hiddenIndices.length > 0) {
                        const randomIdx = hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];
                        
                        let newHintStr = "";
                        for(let i = 0; i < word.length; i++) {
                            if (i === randomIdx) newHintStr += word[i];
                            else newHintStr += user.hintStr[i];
                        }
                        user.hintStr = newHintStr;
                        
                        const formattedHint = user.hintStr.split('').join(' ');
                        this.chatHistory.push({ 
                            system: true, 
                            message: `${user.name}, joker kullanarak bir ipucu aldı! Mevcut kelimesi: ${formattedHint}`, 
                            timestamp: Date.now() 
                        });
                        this.broadcastState();
                    }
                }
                break;
            case 4: 
                if (payload && payload.targetId) {
                    const silenceTarget = this.users.find(u => u.id === payload.targetId);
                    if (silenceTarget) {
                        silenceTarget.silencedTurns = 2;
                        this.chatHistory.push({ system: true, message: `${user.name}, bir oyuncuyu 2 tur susturdu!`, timestamp: Date.now() });
                    }
                }
                break;
        }
        
        this.broadcastState();
    }

    askQuestion(userId, question) {
        if (this.gameState !== "PLAYING") return;
        const currentUser = this.users[this.currentTurnIndex];
        if (currentUser.id !== userId) return;

        const asked = currentUser.questionsAskedThisTurn || 0;
        
        if (asked >= 1) {
            
            if (currentUser.extraQuestions > 0) {
                currentUser.extraQuestions--;
            } else {
                this.io.to(currentUser.id).emit("game:error", { message: "Bu turdaki soru hakkını doldurdun! Lütfen tahmin et veya sıranı bekle." });
                return;
            }
        }

        currentUser.questionsAskedThisTurn = asked + 1;

        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        
        const remainingMs = this.turnStartTime + (this.turnTime * 1000) - Date.now();
        this.pausedRemainingMs = remainingMs > 0 ? remainingMs : 0;

        this.activeQuestion = {
            askerId: userId,
            question: question,
            votes: {},
            endTime: Date.now() + 15000
        };
        
        this.questionTimer = setTimeout(() => {
            this.resolveQuestion();
        }, 15000);

        this.broadcastState();
    }

    submitVote(userId, voteType) {
        if (this.gameState !== "PLAYING" || !this.activeQuestion) return;
        if (this.activeQuestion.askerId === userId) return; 

        this.activeQuestion.votes[userId] = voteType;
        this.broadcastState();
    }

    resolveQuestion() {
        if (!this.activeQuestion) return;
        
        this.lastResolvedQuestion = this.activeQuestion;
        this.activeQuestion = null;
        if (this.questionTimer) {
            clearTimeout(this.questionTimer);
            this.questionTimer = null;
        }
        
        this.turnStartTime = Date.now() - ((this.turnTime * 1000) - this.pausedRemainingMs);
        
        this.timer = setTimeout(() => {
            if (this.gameState === "PLAYING") {
                this.nextTurn();
            }
        }, this.pausedRemainingMs);
        
        this.broadcastState();
    }

    nextTurn() {
        this.activeQuestion = null;
        this.lastResolvedQuestion = null;
        if (this.gameState !== "PLAYING") return;

        let attempts = 0;
        do {
            this.currentTurnIndex = (this.currentTurnIndex + 1) % this.users.length;
            attempts++;
            if (attempts > this.users.length) {
                this.endGame();
                return;
            }
            
            const nextUser = this.users[this.currentTurnIndex];
            if (nextUser.status === 'playing') {
                if (nextUser.silencedTurns > 0) {
                    nextUser.silencedTurns--;
                    this.chatHistory.push({
                        system: true,
                        message: `${nextUser.name} susturulduğu için sırasını atlıyor.`,
                        timestamp: Date.now()
                    });
                    continue; 
                } else {
                    nextUser.questionsAskedThisTurn = 0;
                    break; 
                }
            }
        } while (true);

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
        
        const User = require('../models/User');
        for (let u of this.users) {
            if (u.dbId && !this.winners.includes(u.id)) {
                User.findByIdAndUpdate(u.dbId, { $inc: { xp: 20 } })
                    .catch(err => console.error("XP update error:", err));
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
                status: u.status,
                targetId: u.targetId,
                hasSubmittedWord: u.hasSubmittedWord,
                isVoiceEnabled: u.isVoiceEnabled,
                lives: u.lives,
                joker: u.id === user.id ? u.joker : null,
                hasUsedJoker: u.hasUsedJoker,
                silencedTurns: u.silencedTurns,
                extraQuestions: u.extraQuestions || 0,
                questionsAskedThisTurn: u.questionsAskedThisTurn || 0,
                assignedWord: (this.gameState === "ROUND_END" || u.id !== user.id) ? u.assignedWord : null,
                hintStr: (u.id === user.id) ? u.hintStr : null
            }));

            const payload = {
                gameState: this.gameState,
                category: this.category,
                isBettingEnabled: this.isBettingEnabled,
                betAmount: this.betAmount,
                isJokersEnabled: this.isJokersEnabled,
                activeQuestion: this.activeQuestion,
                lastResolvedQuestion: this.lastResolvedQuestion || null,
                users: usersPayload,
                currentTurnUserId: this.gameState === "PLAYING" ? this.users[this.currentTurnIndex]?.id : null,
                turnEndsAt: this.gameState === "PLAYING" ? (this.activeQuestion ? Date.now() + this.pausedRemainingMs : this.turnStartTime + (this.turnTime * 1000)) : null,
                chatHistory: this.chatHistory,
                winners: this.winners,
                objection: this.objection,
                hasObjectionUsed: this.hasObjectionUsed,
                bettingEndTime: this.bettingEndTime,
                roundLogs: this.gameState === "ROUND_END" ? this.roundLogs : []
            };

            this.io.to(user.id).emit("game:state", payload);
        });
    }
    broadcastHeadRotation(userId, payload) {
        if (!payload || typeof payload.pitch !== 'number' || typeof payload.yaw !== 'number') return;
        
        this.io.to(this.code).emit("game:head_update", {
            userId,
            pitch: payload.pitch,
            yaw: payload.yaw
        });
    }
}

module.exports = Room;
