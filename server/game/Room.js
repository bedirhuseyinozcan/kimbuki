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
        this.pendingMirrorWordOwner = null;
        this.pendingMirrorWordTarget = null;
        this.mirrorWordTimer = null;
    }
    addChatLog(logObj) {
        this.chatHistory.push(logObj);
        if (this.chatHistory.length > 60) {
            this.chatHistory.shift();
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
            questionsAskedThisTurn: 0
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
            this.users[i].shieldActive = false;
            this.users[i].extraQuestionChain = false;
            this.users[i].revealedLetters = [];
            this.users[i].silencedTurns = 0;
            this.users[i].extraQuestions = 0;
            this.users[i].questionsAskedThisTurn = 0;
            
            const nextIndex = (i + 1) % this.users.length;
            this.users[i].targetId = this.users[nextIndex].id;
        }

        this.broadcastState();
    }

    startJokerDraft() {
        this.gameState = "JOKER_DRAFT";
        
        const getRandomJoker = () => {
            const r = Math.random() * 100;
            if (r < 10) return [4, 5, 6, 7][Math.floor(Math.random() * 4)];
            if (r < 40) return [2, 3, 8, 12][Math.floor(Math.random() * 4)];
            return [0, 1, 9, 10, 11][Math.floor(Math.random() * 5)];
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

        const allDrafted = this.users.filter(u => u.status === 'playing' && !u.disconnected).every(u => u.hasDrafted);
        if(allDrafted) {
            if(this.jokerDraftTimer) clearTimeout(this.jokerDraftTimer);
            this.startPlaying();
        } else {
            this.broadcastState();
        }
    }

    placeBet(userId, targetId) {
        if (this.gameState !== "BETTING" || typeof targetId !== 'string') return;
        const user = this.users.find(u => u.id === userId);
        if (!user || user.hasPlacedBet) return;

        this.bets[userId] = targetId;
        user.hasPlacedBet = true;

        const allBet = this.users.filter(u => u.status === 'playing' && !u.disconnected).every(u => u.hasPlacedBet);
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
        if (!this.objection || typeof vote !== 'boolean') return;
        this.objection.votes[userId] = vote;
        
        const playingUsers = this.users.filter(u => u.status === 'playing' && !u.disconnected);
        if (Object.keys(this.objection.votes).length >= playingUsers.length) {
            clearTimeout(this.objectionTimer);
            this.resolveObjection();
        } else {
            this.broadcastState();
        }
    }

    async resolveObjection() {
        if (!this.objection) return;
        
        const playingUsers = this.users.filter(u => u.status === 'playing' && !u.disconnected);
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
        if (this.gameState !== "WORD_SELECTION" || typeof word !== 'string') return;

        const user = this.users.find(u => u.id === userId);
        if (!user || !user.targetId || user.hasSubmittedWord) return;

        const targetUser = this.users.find(u => u.id === user.targetId);
        if (targetUser) {
            targetUser.assignedWord = word.trim().substring(0, 50); 
            user.hasSubmittedWord = true;
        }

        const allAssigned = this.users.filter(u => u.status === 'playing' && !u.disconnected).every(u => u.hasSubmittedWord);
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
        this.currentTurnIndex = 0;
        this.roundCount = 1;
        this.activeQuestion = null;
        this.resolvedQuestionsThisTurn = [];
        
        while (this.users[this.currentTurnIndex].disconnected) {
            this.currentTurnIndex = (this.currentTurnIndex + 1) % this.users.length;
        }

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

        this.broadcastState();
    }

    skipTurn(userId) {
        if (this.gameState !== "PLAYING") return;
        const currentUser = this.users[this.currentTurnIndex];
        if (currentUser.id !== userId) return;
        
        if (currentUser.russianRouletteActive) return;

        this.nextTurn();
    }

    guessWord(userId, guess) {
        if (this.gameState !== "PLAYING" || typeof guess !== 'string') return;
        
        const currentUser = this.users[this.currentTurnIndex];
        if (currentUser.id !== userId) return;

        const user = this.users.find(u => u.id === userId);
        if (!user || user.status !== 'playing') return;

        const normalizedTarget = (user.assignedWord || "").toLocaleLowerCase("tr-TR").replace(/[^a-z0-9çğıöşü]/g, "");
        const normalizedGuess = (guess || "").toLocaleLowerCase("tr-TR").replace(/[^a-z0-9çğıöşü]/g, "");
        if (!normalizedGuess || normalizedGuess.length === 0) return;

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
                if (caster && caster.status === 'playing' && caster.id !== user.id) {
                    if (caster.shieldActive) {
                        caster.shieldActive = false;
                        this.addChatLog({ system: true, message: `🛡️ 💥 İADE! ${user.name} bombayı bildi ancak ${caster.name} kalkanı sayesinde patlamadan kurtuldu!`, timestamp: Date.now() });
                    } else {
                        caster.lives -= 2;
                        this.addChatLog({ system: true, message: `🔄💥 İADE! ${user.name} kelimesini bildi ve bombayı ${caster.name}'e geri fırlatarak patlattı! (-2 Can)`, timestamp: Date.now() });
                        if (caster.lives <= 0) {
                            caster.status = 'spectator';
                            caster.timeBomb = null;
                            caster.bloodTieTarget = null;
                            this.addChatLog({ system: true, message: `💀 ${caster.name} kendi bombasıyla elendi! Kelimesi: ${caster.assignedWord}`, timestamp: Date.now() });
                        }
                    }
                } else if (caster && caster.id === user.id) {
                    this.addChatLog({ system: true, message: `💣 ${user.name} kalkanından seken kendi bombasını başarıyla imha etti!`, timestamp: Date.now() });
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
            this.addChatLog({ system: true, message: winMsg, timestamp: Date.now() });
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
                    this.addChatLog({ system: true, message: betMsg, timestamp: Date.now() });
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
                if (user.shieldActive) {
                    user.shieldActive = false;
                    user.russianRouletteActive = false;
                    this.addChatLog({ system: true, message: `🛡️ ${user.name} Rus Ruleti'nde yanlış tahminde bulundu ama Gizli Kalkanı hayatını kurtardı!`, timestamp: Date.now() });
                } else {
                    user.lives = 0;
                }
            } else {
                if (user.shieldActive) {
                    user.shieldActive = false;
                    this.addChatLog({ system: true, message: `🛡️ ${user.name} yanlış bildiği için can kaybedecekti ancak Gizli Kalkanı onu korudu!`, timestamp: Date.now() });
                } else {
                    user.lives -= 1;
                }
            }

            if (user.lives <= 0) {
                user.status = 'spectator';
                user.bloodTieTarget = null;
                user.timeBomb = null;
                this.addChatLog({
                    system: true,
                    message: (isRussianRoulette && !user.shieldActive)
                        ? `💀 RUS RULETİ PATLADI! ${user.name} yanlış bildi ve anında elendi! Kelimesi: ${user.assignedWord}`
                        : `${user.name} tüm tahmin haklarını kaybetti ve izleyici oldu! Kelimesi: ${user.assignedWord}`,
                    timestamp: Date.now()
                });
            } else if (!user.shieldActive) {
                this.addChatLog({
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
        if (this.gameState !== "PLAYING" || !payload || typeof payload !== 'object') return;
        if (this.roundCount < 3) {
            this.io.to(userId).emit("game:error", { message: "Jokerler 3. turdan itibaren kullanılabilir!" });
            return;
        }

        const user = this.users.find(u => u.id === userId);
        if (!user || user.status !== 'playing' || user.hasUsedJoker || user.joker === null) return;

        if (this.users[this.currentTurnIndex].id !== userId) {
            this.io.to(userId).emit("game:error", { message: "Jokerini sadece kendi sıranda kullanabilirsin!" });
            return;
        }

        const jokerType = user.joker;
        let targetId = payload.targetId;
        let originalTargetId = targetId; 

        if (jokerType === 7 && targetId && typeof targetId === 'string') {
            const targetForBomb = this.users.find(u => u.id === targetId);
            if (targetForBomb && targetForBomb.timeBomb) {
                 this.io.to(userId).emit("game:error", { message: "Bu oyuncunun üzerinde zaten aktif bir bomba var!" });
                 return;
            }
        }

        user.hasUsedJoker = true;

        if (targetId && [3, 4, 5, 7].includes(jokerType)) {
            const targetUser = this.users.find(u => u.id === targetId);
            if (targetUser && targetUser.mirrorRoundsLeft > 0 && targetUser.id !== user.id) {
                this.addChatLog({ system: true, message: `🛡️ YANSIMA! Kötü niyetli joker, gizli Ayna Kalkanı'na çarpıp ${user.name}'e geri sekti!`, timestamp: Date.now() });
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
                    this.timer = setTimeout(() => { if (this.gameState === "PLAYING") this.nextTurn(); }, newTime * 1000);
                    this.addChatLog({ system: true, message: `⏳ ${user.name} Zaman Bükücü kullanarak süresine 1 dakika ekledi!`, timestamp: Date.now() });
                }
                break;
            case 1: 
                this.addChatLog({ system: true, message: `🔍 ${user.name}, Harf Açıcı kullanarak gizli bir ipucu elde etti!`, timestamp: Date.now() });
                this.openLettersForUser(user, 1);
                break;
            case 2: 
                user.extraQuestions = 1;
                user.extraQuestionChain = true;
                this.addChatLog({ system: true, message: `🔫 ${user.name}, Çift Şarjör kullandı! (Ekstra +1 soru hakkı kazandı ve aldığı her 'Evet' oyunda yeni bir hak kazanacak!)`, timestamp: Date.now() });
                break;
            case 3: 
                if (targetId && typeof targetId === 'string') {
                    const silenceTarget = this.users.find(u => u.id === targetId);
                    if (silenceTarget) {
                        silenceTarget.silencedTurns = 2;
                        this.addChatLog({ system: true, message: `🤫 Susturucu kullanıldı! ${silenceTarget.name}, 2 tur boyunca susturuldu.`, timestamp: Date.now() });
                    }
                }
                break;
            case 4: 
                if (targetId && payload.newWord && typeof payload.newWord === 'string') {
                    const target = this.users.find(u => u.id === targetId);
                    if (target) {
                        if (target.id === user.id && originalTargetId !== user.id) {
                            this.pendingMirrorWordOwner = originalTargetId;
                            this.pendingMirrorWordTarget = user.id;
                            target.assignedWord = "AYNA SAHİBİ KELİME BEKLENİYOR"; 
                            target.revealedLetters = [];
                            
                            const mirrorOwner = this.users.find(u => u.id === originalTargetId);
                            
                            this.addChatLog({ system: true, message: `🧠 Hafıza Silici geri tepti! ${target.name}'in kelimesi silindi! Ayna sahibi ${mirrorOwner ? mirrorOwner.name : ''} yeni kelimeyi belirliyor...`, timestamp: Date.now() });
                            
                            this.addChatLog({ system: true, privateTo: originalTargetId, message: `Sistem (Özel): Ayna ile Hafıza Siliciyi yansıttın! Lütfen 30 saniye içinde chat alanına "/kelime YENIKELIME" yazarak rakibinin yeni kelimesini belirle (Örn: /kelime Karpuz).`, timestamp: Date.now() });

                            if (this.mirrorWordTimer) clearTimeout(this.mirrorWordTimer);
                            this.mirrorWordTimer = setTimeout(() => {
                                if (this.pendingMirrorWordOwner) {
                                    const t = this.users.find(u => u.id === this.pendingMirrorWordTarget);
                                    if (t) {
                                        t.assignedWord = Math.random().toString(36).substring(2, 8).toUpperCase();
                                        this.addChatLog({ system: true, message: `⏳ Ayna sahibi süresinde kelime belirlemedi! ${t.name}'in kelimesi rastgele harflere dönüştü!`, timestamp: Date.now() });
                                        this.broadcastState();
                                    }
                                    this.pendingMirrorWordOwner = null;
                                    this.pendingMirrorWordTarget = null;
                                }
                            }, 30000);
                        } else {
                            target.assignedWord = payload.newWord.substring(0, 30); 
                            this.addChatLog({ system: true, message: `🧠 Hafıza Silici kullanıldı! ${target.name}'in kelimesi acımasızca değiştirildi!`, timestamp: Date.now() });
                            target.revealedLetters = [];
                        }
                    }
                }
                break;
            case 5:
                if (targetId && typeof targetId === 'string') {
                    user.bloodTieTarget = targetId;
                    this.addChatLog({ system: true, message: `🩸 Kan Bağı kullanıldı! ${user.name} hedefini seçti, kaderleri artık bir!`, timestamp: Date.now() });
                }
                break;
            case 6:
                user.russianRouletteActive = true;
                this.addChatLog({ system: true, message: `💀 RUS RULETİ! ${user.name} hemen tahmin etmek zorunda!`, timestamp: Date.now() });
                this.openLettersForUser(user, 2);
                break;
            case 7: 
                if (targetId && typeof targetId === 'string') {
                    const target = this.users.find(u => u.id === targetId);
                    if (target) {
                        target.timeBomb = { casterId: originalTargetId, roundsLeft: 3 };
                        this.addChatLog({ system: true, message: `💣 SAATLİ BOMBA! ${target.name}'in üzerine bomba yerleştirildi. 3 tur içinde bilemezse patlayacak!`, timestamp: Date.now() });
                    }
                }
                break;
            case 8: 
                user.mirrorRoundsLeft = 3;
                this.addChatLog({ system: true, privateTo: user.id, message: "Sistem (Özel): Ayna (Kalkan) aktif! 3 tur boyunca sana atılan kötü niyetli jokerler atan kişiye geri sekecek.", timestamp: Date.now() });
                break;
            case 9:
                user.shieldActive = true;
                this.addChatLog({ system: true, privateTo: user.id, message: "Sistem (Özel): Gizli Kalkan aktif! Bir sonraki ölümcül hatanı veya bombayı engelleyecek.", timestamp: Date.now() });
                break;
            case 10:
                if (targetId && typeof targetId === 'string') {
                    const target = this.users.find(u => u.id === targetId);
                    if (target && user.assignedWord && target.assignedWord) {
                        const mLen = user.assignedWord.replace(/\s/g, '').length;
                        const tLen = target.assignedWord.replace(/\s/g, '').length;
                        const cmp = mLen > tLen ? "DAHA UZUN" : mLen < tLen ? "DAHA KISA" : "AYNI UZUNLUKTA";
                        this.addChatLog({ system: true, privateTo: user.id, message: `Sistem (Özel): Senin kelimen ${target.name}'in kelimesinden ${cmp}.`, timestamp: Date.now() });
                    }
                }
                break;
            case 11:
                const goldJokers = [2, 3, 8, 12];
                user.joker = goldJokers[Math.floor(Math.random() * goldJokers.length)];
                user.hasUsedJoker = false; 
                this.addChatLog({ system: true, privateTo: user.id, message: "Sistem (Özel): Gümüş Sürpriz Kutu'yu açtın ve içinden ALTIN joker çıktı!", timestamp: Date.now() });
                break;
            case 12:
                const prisJokers = [4, 5, 6, 7];
                user.joker = prisJokers[Math.floor(Math.random() * prisJokers.length)];
                user.hasUsedJoker = false;
                this.addChatLog({ system: true, privateTo: user.id, message: "Sistem (Özel): Altın Sürpriz Kutu'yu açtın ve içinden PRİZMATİK joker çıktı!", timestamp: Date.now() });
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
        if (typeof question !== 'string' || question.length > 150) return;
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
        if (this.gameState !== "PLAYING" || !this.activeQuestion || typeof voteType !== 'string') return;
        if (this.activeQuestion.askerId === userId) return; 

        this.activeQuestion.votes[userId] = voteType;
        
        const playingUsers = this.users.filter(u => u.status === 'playing' && !u.disconnected && u.id !== this.activeQuestion.askerId);
        if (Object.keys(this.activeQuestion.votes).length >= playingUsers.length) {
            this.resolveQuestion();
        } else {
            this.broadcastState();
        }
    }

    resolveQuestion() {
        if (!this.activeQuestion) return;
        
        const asker = this.users.find(u => u.id === this.activeQuestion.askerId);
        
        const playingUsers = this.users.filter(u => u.status === 'playing');
        let yesCount = 0, noCount = 0;
        for (let vote of Object.values(this.activeQuestion.votes)) {
            if(vote === 'yes') yesCount++;
            else if(vote === 'no') noCount++;
        }
        const isYesMajority = yesCount > noCount;
        const isNoMajority = noCount > yesCount;

        if (asker && asker.extraQuestionChain) {
            if (isYesMajority) {
                asker.extraQuestions += 1;
                this.addChatLog({ system: true, privateTo: asker.id, message: "Sistem (Özel): Sorun çoğunluktan 'Evet' oyu aldığı için +1 Soru Hakkı daha kazandın!", timestamp: Date.now() });
            } else {
                asker.extraQuestions = 0;
                asker.extraQuestionChain = false;
                this.addChatLog({ system: true, privateTo: asker.id, message: "Sistem (Özel): Sorun 'Evet' çoğunluğunu sağlayamadığı için Çift Şarjör serin kırıldı!", timestamp: Date.now() });
            }
        }

        for (let u of this.users) {
            if (u.bloodTieTarget === this.activeQuestion.askerId && u.status === 'playing') {
                if (isYesMajority) {
                    this.addChatLog({ system: true, message: `🩸 Kan Bağı: Bağlı olduğun oyuncu EVET aldı! ${u.name}'in gizli bir harfi açıldı.`, timestamp: Date.now() });
                    this.openLettersForUser(u, 1);
                } else if (isNoMajority) {
                    if (u.shieldActive) {
                        u.shieldActive = false;
                        this.addChatLog({ system: true, message: `🛡️ 🩸 Kan Bağı: ${u.name} can kaybedecekti ancak Gizli Kalkanı onu korudu!`, timestamp: Date.now() });
                    } else {
                        u.lives -= 1;
                        if (u.lives <= 0) {
                            u.status = 'spectator';
                            u.bloodTieTarget = null;
                            u.timeBomb = null;
                            this.addChatLog({ system: true, message: `🩸 Kan Bağı: Bağlı olduğun oyuncu HAYIR aldı! ${u.name} tüm canlarını kaybetti ve elendi!`, timestamp: Date.now() });
                        } else {
                            this.addChatLog({ system: true, message: `🩸 Kan Bağı: Bağlı olduğun oyuncu HAYIR aldı! ${u.name} 1 can kaybetti!`, timestamp: Date.now() });
                        }
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
                    if (prevUser.shieldActive) {
                        prevUser.shieldActive = false;
                        prevUser.russianRouletteActive = false;
                        this.addChatLog({ system: true, message: `🛡️ ${prevUser.name} Rus Ruleti süresini aştı ama Gizli Kalkanı onu ipten aldı!`, timestamp: Date.now() });
                    } else {
                        prevUser.lives = 0;
                        prevUser.status = 'spectator';
                        prevUser.bloodTieTarget = null;
                        prevUser.timeBomb = null;
                        this.addChatLog({ system: true, message: `💀 ${prevUser.name} Rus Ruleti süresini aştı ve elendi!`, timestamp: Date.now() });
                        
                        const activePlayers = this.users.filter(x => x.status === 'playing');
                        if (activePlayers.length <= 1) {
                            this.endGame();
                            return;
                        }
                    }
                }
                prevUser.extraQuestionChain = false;
                prevUser.extraQuestions = 0;
            }
        }

        let attempts = 0;
        let foundNext = false;
        
        while (attempts < this.users.length) {
            if (!isDisconnect || attempts > 0) {
                this.currentTurnIndex = (this.currentTurnIndex + 1) % this.users.length;
                
                if (this.currentTurnIndex === 0) {
                    this.roundCount++;
                    
                    for (let u of this.users) {
                        if (u.status === 'playing') {
                            if (u.mirrorRoundsLeft > 0) u.mirrorRoundsLeft--;
                            
                            if (u.timeBomb) {
                                u.timeBomb.roundsLeft--;
                                if (u.timeBomb.roundsLeft <= 0) {
                                    if (u.shieldActive) {
                                        u.shieldActive = false;
                                        u.timeBomb = null;
                                        this.addChatLog({ system: true, message: `🛡️ 💥 GÜM! Saatli Bomba patladı ancak ${u.name}'in Gizli Kalkanı hasarı tamamen emdi!`, timestamp: Date.now() });
                                    } else {
                                        u.lives -= 2;
                                        u.timeBomb = null;
                                        this.addChatLog({ system: true, message: `💥 GÜM! Süre doldu. ${u.name}'in üzerindeki Saatli Bomba patladı! (-2 Can)`, timestamp: Date.now() });
                                        if (u.lives <= 0) {
                                            u.status = 'spectator';
                                            u.bloodTieTarget = null;
                                            this.addChatLog({ system: true, message: `💀 ${u.name} bombanın etkisiyle elendi! Kelimesi: ${u.assignedWord}`, timestamp: Date.now() });
                                        }
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
            
            isDisconnect = false; 
            attempts++;
            
            const nextUser = this.users[this.currentTurnIndex];
            if (nextUser && nextUser.status === 'playing') {
                if (nextUser.silencedTurns > 0) {
                    nextUser.silencedTurns--;
                    this.addChatLog({
                        system: true,
                        message: `🤐 ${nextUser.name} susturulduğu için sırasını atlıyor.`,
                        timestamp: Date.now()
                    });
                    continue; 
                } else {
                    nextUser.questionsAskedThisTurn = 0;
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
                mirrorRoundsLeft: 0, 
                shieldActive: false, 
                extraQuestionChain: (u.id === user.id) ? u.extraQuestionChain : false,
                silencedTurns: u.silencedTurns,
                extraQuestions: u.extraQuestions || 0,
                questionsAskedThisTurn: u.questionsAskedThisTurn || 0,
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
