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

    startGame(category = "Karışık") {
        if (this.users.length < 2) return; // At least 2 players needed

        this.gameState = "WORD_SELECTION";
        this.category = category;
        this.chatHistory = [];
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
            this.users[i].joker = availableJokers[i % availableJokers.length];
            this.users[i].hasUsedJoker = false;
            this.users[i].silencedTurns = 0;
            this.users[i].extraQuestions = 0;
            
            const nextIndex = (i + 1) % this.users.length;
            this.users[i].targetId = this.users[nextIndex].id;
        }

        this.broadcastState();
    }

    setWord(userId, word) {
        if (this.gameState !== "WORD_SELECTION") return;

        const user = this.users.find(u => u.id === userId);
        if (!user || !user.targetId || user.hasSubmittedWord) return;

        const targetUser = this.users.find(u => u.id === user.targetId);
        if (targetUser) {
            targetUser.assignedWord = word;
            user.hasSubmittedWord = true;
        }

        const allAssigned = this.users.every(u => u.hasSubmittedWord);
        if (allAssigned) {
            this.startPlaying();
        } else {
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
            if (user.dbId) {
                User.findByIdAndUpdate(user.dbId, { $inc: { gold: 50 } })
                    .catch(err => console.error("Gold update error:", err));
            }

            this.chatHistory.push({
                system: true,
                message: `${user.name} doğru tahmin etti ve 50 Altın kazandı! Kelimesi: ${user.assignedWord}`,
                timestamp: Date.now()
            });

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
                    const word = user.assignedWord;
                    
                    let hintStr = "";
                    let hiddenIndices = [];
                    for(let i=0; i<word.length; i++) {
                        if(word[i] !== ' ') hiddenIndices.push(i);
                    }
                    if(hiddenIndices.length > 0) {
                        const randomIdx = hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];
                        for(let i=0; i<word.length; i++) {
                            if (i === randomIdx || word[i] === ' ') {
                                hintStr += word[i] + " ";
                            } else {
                                hintStr += "_ ";
                            }
                        }
                        this.io.to(user.id).emit("game:joker_hint_result", { hint: hintStr.trim() });
                        this.chatHistory.push({ system: true, message: `${user.name}, joker kullanarak bir ipucu aldı! (Bir harf açıldı)`, timestamp: Date.now() });
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

        this.activeQuestion = {
            askerId: userId,
            question: question,
            votes: {} 
        };
        this.broadcastState();
    }

    submitVote(userId, voteType) {
        if (this.gameState !== "PLAYING" || !this.activeQuestion) return;
        if (this.activeQuestion.askerId === userId) return; 

        this.activeQuestion.votes[userId] = voteType;
        this.broadcastState();
    }

    nextTurn() {
        this.activeQuestion = null;
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
                assignedWord: (this.gameState === "ROUND_END" || u.id !== user.id) ? u.assignedWord : null
            }));

            const payload = {
                gameState: this.gameState,
                category: this.category,
                activeQuestion: this.activeQuestion,
                users: usersPayload,
                currentTurnUserId: this.gameState === "PLAYING" ? this.users[this.currentTurnIndex]?.id : null,
                turnEndsAt: this.gameState === "PLAYING" ? this.turnStartTime + (this.turnTime * 1000) : null,
                chatHistory: this.chatHistory,
                winners: this.winners
            };

            this.io.to(user.id).emit("game:state", payload);
        });
    }
}

module.exports = Room;
