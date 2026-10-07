const User = require('../models/User');

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
        if (playingUsers.length < 2 && (this.gameState === "PLAYING" || this.gameState === "WORD_SELECTION" || this.gameState === "JOKER_DRAFT")) {
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

        this.category = settings.category || "Karışık"; this.theme = settings.theme || "day"; this.map = settings.map || "floating_island__low_poly_vr.glb";
        this.initialPlayerCount = this.users.length;
        this.isBettingEnabled = settings.bettingEnabled || false;
        this.betAmount = settings.betAmount || 50;
        this.isJokersEnabled = settings.jokersEnabled !== undefined ? settings.jokersEnabled : true;
        this.bets = {};
        this.hasObjectionUsed = false;
        this.objection = null;
        this.roundCount = 1;

        if (this.isBettingEnabled) {
            const User = require('../models/User');
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

        for (let i = 0; i < this.users.length; i++) {
            this.users[i].status = 'playing';
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
            this.users[i].mirrorRoundsLeft = 0;
            this.users[i].silencedTurns = 0;
            this.users[i].extraQuestions = 0;
            this.users[i].questionsAskedThisTurn = 0;
            this.users[i].hintStr = null;
            
            const nextIndex = (i + 1) % this.users.length;
            this.users[i].targetId = this.users[nextIndex].id;
        }

        this.broadcastState();
    }

    startJokerDraft() {
        this.gameState = "JOKER_DRAFT";
        
        const getRandomJoker = () => {
            const r = Math.random() * 100;
            if (r < 10) return [5, 6, 7][Math.floor(Math.random() * 3)];
            if (r < 40) return [2, 3, 4][Math.floor(Math.random() * 3)];
            return [0, 1, 8][Math.floor(Math.random() * 3)];
        };

        for (let u of this.users) {
            if (u.status === 'playing') {
                if (this.isJokersEnabled) {
                    let j1 = getRandomJoker();
                    let j2 = getRandomJoker();
                    while (j1 === j2) j2 = getRandomJoker();
                    u.jokerChoices = [j1, j2];
                    u.hasDrafted = false;
                } else {
                    u.hasDrafted = true; 
                }
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

        const allDrafted = this.users.filter(u => u.status === 'playing').every(u => u.hasDrafted);
        if(allDrafted) {
            if(this.jokerDraftTimer) clearTimeout(this.jokerDraftTimer);
            this.startPlaying();
        } else {
            this.broadcastState();
        }
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
            this.startJokerDraft();
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
        this.roundCount = 1;
        this.activeQuestion = null;
        this.resolvedQuestionsThisTurn = [];
        this.startTimer();
        this.broadcastState();
    }

    handleChat(userId, message) {
        const user = this.users.find(u => u.id === userId);
        if (!user || !message || message.length > 150) return;

        this.chatHistory.push({
            userId: user.id,
            name: user.name,
            nameColor: user.nameColor,
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

        const isRussianRoulette = user.russianRouletteActive;

        if (isCorrect) {
            user.status = 'spectator';
            user.bloodTieTarget = null;
            this.winners.push(user.id);
            const User = require('../models/User');
            
            if (user.timeBomb) {
                const caster = this.users.find(c => c.id === user.timeBomb.casterId);
                if (caster && caster.status === 'playing') {
                    caster.lives -= 2;
                    this.chatHistory.push({ system: true, message: `🔄💥 İADE! ${user.name} kelimesini bildi ve bombayı ${caster.name}'e geri fırlatarak patlattı! (-2 Can)`, timestamp: Date.now() });
                    if (caster.lives <= 0) {
                        caster.status = 'spectator';
                        caster.timeBomb = null;
                        caster.bloodTieTarget = null;
                        this.chatHistory.push({ system: true, message: `💀 ${caster.name} kendi bombasıyla elendi! Kelimesi: ${caster.assignedWord}`, timestamp: Date.now() });
                    }
                }
                user.timeBomb = null;
            }
            
            let winnerReward = 0; 
            let bettorReward = 0;
            const rank = this.winners.length; 
            
            if (this.isBettingEnabled) {
                const playersCount = this.initialPlayerCount || this.users.length;
                const totalPot = playersCount * this.betAmount;
                let pct = 0;
                
                if (isRussianRoulette) {
                    winnerReward = totalPot; 
                    bettorReward = 0;
                } else {
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
                    bettorReward = Math.max(1, Math.floor(winnerReward / 2));
                }
            }
            
            let repReward = 5;
            if (isRussianRoulette) repReward = 200;
            else if (rank === 1) repReward = 50;
            else if (rank === 2) repReward = 20;
            else if (rank === 3) repReward = 10;
            
            let playerRewards = {};
            const addReward = (dbId, gold, rep, type) => {
                if (!dbId) return;
                if (!playerRewards[dbId]) playerRewards[dbId] = { gold: 0, rep: 0, winCount: 0, playCount: 0, betWinCount: 0 };
                playerRewards[dbId].gold += gold;
                playerRewards[dbId].rep += rep;
                if (type === 'win') { playerRewards[dbId].winCount++; playerRewards[dbId].playCount++; }
                if (type === 'bet_win') { playerRewards[dbId].betWinCount++; }
            };

            addReward(user.dbId, winnerReward, repReward, 'win');

            let winMsg = "";
            if (isRussianRoulette) {
                winMsg = `💀👑 RUS RULETİ BAŞARILI! ${user.name} hayatını riske attı ve tüm kasayı (${winnerReward || repReward} Ödül) TEK BAŞINA ALDI!`;
            } else if (this.isBettingEnabled) {
                winMsg = `🏆 ${user.name} doğru tahmin etti! (${rank}. oldu) -> Oyun kazancı: ${winnerReward} Altın. (Kelimesi: ${user.assignedWord})`;
            } else {
                winMsg = `🏆 ${user.name} doğru tahmin etti! (${rank}. oldu) -> Oyun kazancı: ${repReward} İtibar. (Kelimesi: ${user.assignedWord})`;
            }
            this.chatHistory.push({ system: true, message: winMsg, timestamp: Date.now() });
            this.roundLogs.push(winMsg);

            if (this.isBettingEnabled && bettorReward > 0 && !isRussianRoulette) {
                const bettors = Object.keys(this.bets || {}).filter(uid => this.bets[uid] === user.id);
                let bettorNames = [];
                
                for (let uid of bettors) {
                    const bettorUser = this.users.find(u => u.id === uid);
                    if (bettorUser) {
                        addReward(bettorUser.dbId, bettorReward, 5, 'bet_win');
                        bettorNames.push(bettorUser.name);
                    }
                }
                
                if (bettorNames.length > 0) {
                    const betMsg = `🎲 Bahis Kazananları (${user.name} üzerine oynayanlar): ${bettorNames.join(', ')} -> Bahis kazancı: Ekstra ${bettorReward} Altın!`;
                    this.chatHistory.push({ system: true, message: betMsg, timestamp: Date.now() });
                    this.roundLogs.push(betMsg);
                }
            }

            for (const [dbId, rewards] of Object.entries(playerRewards)) {
                User.findById(dbId).then(userDb => {
                    if (userDb) {
                        userDb.gold += rewards.gold;
                        userDb.reputation += rewards.rep;
                        if (userDb.quests && userDb.quests.active) {
                            userDb.quests.active.forEach(q => {
                                if (q.type === 'win' && !q.isClaimed && q.progress < q.target) q.progress += rewards.winCount;
                                if (q.type === 'play' && !q.isClaimed && q.progress < q.target) q.progress += rewards.playCount;
                                if (q.type === 'bet_win' && !q.isClaimed && q.progress < q.target) q.progress += rewards.betWinCount;
                            });
                            userDb.markModified('quests');
                        }
                        return userDb.save();
                    }
                }).catch(err => console.error("Aggregated reward update error:", err));
            }

            if (isRussianRoulette) {
                this.endGame();
                return;
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
            if (isRussianRoulette) {
                user.lives = 0;
            } else {
                user.lives--;
            }

            if (user.lives <= 0) {
                user.status = 'spectator';
                user.bloodTieTarget = null;
                user.timeBomb = null;
                this.chatHistory.push({
                    system: true,
                    message: isRussianRoulette 
                        ? `💀 RUS RULETİ PATLADI! ${user.name} yanlış bildi ve anında elendi! Kelimesi: ${user.assignedWord}`
                        : `${user.name} tüm tahmin haklarını kaybetti ve izleyici oldu! Kelimesi: ${user.assignedWord}`,
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

    openLettersForUser(user, count) {
        if (!user.assignedWord) return;
        if (!user.hintStr) {
            user.hintStr = user.assignedWord.split('').map(c => c === ' ' ? ' ' : '_').join('');
        }
        const word = user.assignedWord;
        for (let k = 0; k < count; k++) {
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
            }
        }
    }

    useJoker(userId, payload) {
        if (this.gameState !== "PLAYING") return;
        if (this.roundCount < 3) {
            this.io.to(userId).emit("game:error", { message: "Jokerler 3. turdan itibaren kullanılabilir!" });
            return;
        }

        const user = this.users.find(u => u.id === userId);
        if (!user || user.status !== 'playing' || user.hasUsedJoker || user.joker === null) return;

        user.hasUsedJoker = true;
        const jokerType = user.joker;

        let targetId = payload?.targetId;

        if (targetId && [3, 4, 5, 7].includes(jokerType)) {
            const targetUser = this.users.find(u => u.id === targetId);
            if (targetUser && targetUser.mirrorRoundsLeft > 0 && targetUser.id !== user.id) {
                this.chatHistory.push({ system: true, message: `🛡️ YANSIMA! ${targetUser.name}'in gizli Aynası devreye girdi. Kötü niyetli joker, ${user.name}'e geri sekti!`, timestamp: Date.now() });
                targetId = user.id;
            }
        }

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
                    
                    this.chatHistory.push({ system: true, message: `⏳ ${user.name} Zaman Bükücü kullanarak süresine 1 dakika ekledi!`, timestamp: Date.now() });
                }
                break;
            case 1: 
                this.openLettersForUser(user, 1);
                const formattedHint = user.hintStr.split('').join(' ');
                this.chatHistory.push({ system: true, message: `🔍 ${user.name}, Harf Açıcı kullanarak bir ipucu elde etti! Mevcut kelimesi: ${formattedHint}`, timestamp: Date.now() });
                break;
            case 2: 
                user.extraQuestions = 3;
                this.chatHistory.push({ system: true, message: `🔫 ${user.name}, Çift Şarjör kullanarak 3 ekstra soru hakkı kazandı!`, timestamp: Date.now() });
                break;
            case 3: 
                if (targetId) {
                    const silenceTarget = this.users.find(u => u.id === targetId);
                    if (silenceTarget) {
                        silenceTarget.silencedTurns = 2;
                        this.chatHistory.push({ system: true, message: `🤫 Susturucu kullanıldı! ${silenceTarget.name}, 2 tur boyunca susturuldu.`, timestamp: Date.now() });
                    }
                }
                break;
            case 4: 
                if (targetId && payload.newWord) {
                    const target = this.users.find(u => u.id === targetId);
                    if (target) {
                        target.assignedWord = payload.newWord;
                        target.hintStr = null;
                        this.chatHistory.push({ system: true, message: `🧠 Hafıza Silici kullanıldı! ${target.name}'in kelimesi acımasızca değiştirildi!`, timestamp: Date.now() });
                    }
                }
                break;
            case 5:
                if (targetId) {
                    user.bloodTieTarget = targetId;
                    this.chatHistory.push({ system: true, message: `🩸 Kan Bağı kullanıldı! ${user.name} hedefini seçti, kaderleri artık bir!`, timestamp: Date.now() });
                }
                break;
            case 6:
                user.russianRouletteActive = true;
                this.openLettersForUser(user, 2);
                this.chatHistory.push({ system: true, message: `💀 RUS RULETİ! ${user.name}'in 2 harfi açıldı ve hemen tahmin etmek zorunda!`, timestamp: Date.now() });
                break;
            case 7: 
                if (targetId) {
                    const target = this.users.find(u => u.id === targetId);
                    if (target) {
                        target.timeBomb = { casterId: user.id, roundsLeft: 3 };
                        this.chatHistory.push({ system: true, message: `💣 SAATLİ BOMBA! ${target.name}'in üzerine bomba yerleştirildi. 3 tur içinde bilemezse patlayacak!`, timestamp: Date.now() });
                    }
                }
                break;
            case 8: 
                user.mirrorRoundsLeft = 3;
                this.chatHistory.push({ system: true, message: `✨ ${user.name}, gizemli bir savunma jokeri kullandı...`, timestamp: Date.now() });
                break;
        }
        
        if (user.dbId) {
            const User = require('../models/User');
            User.findById(user.dbId).then(userDb => {
                if (userDb && userDb.quests && userDb.quests.active) {
                    userDb.quests.active.forEach(q => {
                        if (q.type === 'use_joker' && !q.isClaimed && q.progress < q.target) q.progress++;
                    });
                    userDb.markModified('quests');
                    return userDb.save();
                }
            }).catch(err => console.error("Joker quest update error:", err));
        }

        this.broadcastState();
    }

    askQuestion(userId, question) {
        if (this.gameState !== "PLAYING") return;
        if (this.activeQuestion) return;
        if (!question || question.length > 150) return;
        const currentUser = this.users[this.currentTurnIndex];
        if (currentUser.id !== userId) return;
        if (currentUser.russianRouletteActive) return; 

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
        this.pausedRemainingMs = Math.max(10000, remainingMs);

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
        
        const playingUsers = this.users.filter(u => u.status === 'playing');
        let yesCount = 0, noCount = 0;
        for (let vote of Object.values(this.activeQuestion.votes)) {
            if(vote === 'yes') yesCount++;
            else if(vote === 'no') noCount++;
        }
        const isYesMajority = yesCount > noCount;
        const isNoMajority = noCount > yesCount;

        for (let u of this.users) {
            if (u.bloodTieTarget === this.activeQuestion.askerId && u.status === 'playing') {
                if (isYesMajority) {
                    this.openLettersForUser(u, 1);
                    this.chatHistory.push({ system: true, message: `🩸 Kan Bağı: Bağlı olduğun oyuncu EVET aldı! ${u.name}'in bir harfi açıldı.`, timestamp: Date.now() });
                } else if (isNoMajority) {
                    u.lives -= 1;
                    if (u.lives <= 0) {
                        u.status = 'spectator';
                        u.bloodTieTarget = null;
                        u.timeBomb = null;
                        this.chatHistory.push({ system: true, message: `🩸 Kan Bağı: Bağlı olduğun oyuncu HAYIR aldı! ${u.name} tüm canlarını kaybetti ve elendi!`, timestamp: Date.now() });
                    } else {
                        this.chatHistory.push({ system: true, message: `🩸 Kan Bağı: Bağlı olduğun oyuncu HAYIR aldı! ${u.name} 1 can kaybetti!`, timestamp: Date.now() });
                    }
                }
            }
        }

        if (!this.resolvedQuestionsThisTurn) this.resolvedQuestionsThisTurn = []; 
        this.resolvedQuestionsThisTurn.push(this.activeQuestion);
        this.activeQuestion = null;
        if (this.questionTimer) {
            clearTimeout(this.questionTimer);
            this.questionTimer = null;
        }

        const activePlayers = this.users.filter(x => x.status === 'playing');
        if (activePlayers.length <= 1) {
            this.endGame();
            return;
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
        this.resolvedQuestionsThisTurn = [];
        if (this.gameState !== "PLAYING") return;

        const prevUser = this.users[this.currentTurnIndex];
        if (prevUser && prevUser.russianRouletteActive && prevUser.status === 'playing') {
            prevUser.lives = 0;
            prevUser.status = 'spectator';
            prevUser.bloodTieTarget = null;
            prevUser.timeBomb = null;
            this.chatHistory.push({ system: true, message: `💀 ${prevUser.name} Rus Ruleti süresini aştı ve elendi!`, timestamp: Date.now() });
            
            const activePlayers = this.users.filter(x => x.status === 'playing');
            if (activePlayers.length <= 1) {
                this.endGame();
                return;
            }
        }

        let attempts = 0;
        do {
            this.currentTurnIndex = (this.currentTurnIndex + 1) % this.users.length;
            
            if (this.currentTurnIndex === 0) {
                this.roundCount++;
                
                for (let u of this.users) {
                    if (u.status === 'playing') {
                        if (u.mirrorRoundsLeft > 0) u.mirrorRoundsLeft--;
                        
                        if (u.timeBomb) {
                            u.timeBomb.roundsLeft--;
                            if (u.timeBomb.roundsLeft <= 0) {
                                u.lives -= 2;
                                u.timeBomb = null;
                                this.chatHistory.push({ system: true, message: `💥 GÜM! Süre doldu. ${u.name}'in üzerindeki Saatli Bomba patladı! (-2 Can)`, timestamp: Date.now() });
                                if (u.lives <= 0) {
                                    u.status = 'spectator';
                                    u.bloodTieTarget = null;
                                    this.chatHistory.push({ system: true, message: `💀 ${u.name} bombanın etkisiyle elendi! Kelimesi: ${u.assignedWord}`, timestamp: Date.now() });
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
                        message: `🤐 ${nextUser.name} susturulduğu için sırasını atlıyor.`,
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
                mirrorRoundsLeft: (u.id === user.id) ? u.mirrorRoundsLeft : 0, 
                silencedTurns: u.silencedTurns,
                extraQuestions: u.extraQuestions || 0,
                questionsAskedThisTurn: u.questionsAskedThisTurn || 0,
                assignedWord: (this.gameState === "ROUND_END" || u.id !== user.id) ? u.assignedWord : null,
                hintStr: (u.id === user.id) ? u.hintStr : null
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
                chatHistory: this.chatHistory,
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
        
        this.io.to(this.code).emit("game:head_update", {
            userId,
            pitch: payload.pitch,
            yaw: payload.yaw
        });
    }

    playTaunt(userId, type) {
        this.io.to(this.code).emit("game:play_taunt", { userId, type });
    }
}

module.exports = Room;
