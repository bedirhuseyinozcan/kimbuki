class Room {
    constructor(code, io) {
        this.code = code;
        this.io = io;
        this.users = [];
        this.gameState = "LOBBY";
        
        this.turnTime = 30;
        this.timer = null;
        this.turnTimeLeft = 0;
        this.currentTurnIndex = 0;

        this.chatHistory = [];
        this.winners = []; 
    }

    addUser(socketId, name) {
        const isHost = this.users.length === 0;
        this.users.push({
            id: socketId,
            name,
            isHost,
            avatar: 1,
            targetId: null,
            assignedWord: null,
            status: 'playing',
            hasSubmittedWord: false,
            hasUsedHint: false
        });
        this.broadcastState();
    }

    removeUser(socketId) {
        const wasHost = this.users.find(u => u.id === socketId)?.isHost;
        this.users = this.users.filter((u) => u.id !== socketId);

        if (this.users.length > 0 && wasHost) {
            this.users[0].isHost = true;
        }

        
        const playingUsers = this.users.filter(u => u.status === 'playing');
        if (playingUsers.length < 2 && (this.gameState === "PLAYING" || this.gameState === "WORD_SELECTION")) {
            this.endGame();
        }

        this.broadcastState();
        return this.users.length === 0;
    }

    updateAvatar(userId, avatarIndex) {
        if (this.gameState !== "LOBBY") return;
        const user = this.users.find(u => u.id === userId);
        if (user) {
            user.avatar = avatarIndex;
            this.broadcastState();
        }
    }

    startGame() {
        if (this.users.length < 2) return; // At least 2 players needed

        this.gameState = "WORD_SELECTION";
        this.chatHistory = [];
        this.winners = [];

        
        for (let i = 0; i < this.users.length; i++) {
            this.users[i].status = 'playing';
            this.users[i].assignedWord = null;
            this.users[i].hasSubmittedWord = false;
            
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
            
            this.chatHistory.push({
                system: true,
                message: `${user.name} doğru tahmin etti! Kelimesi: ${user.assignedWord}`,
                timestamp: Date.now()
            });

            const playingUsers = this.users.filter(u => u.status === 'playing');
            if (playingUsers.length <= 1) { // End game if 1 or 0 players left
                this.endGame();
                return;
            }

            if (this.users[this.currentTurnIndex].id === userId) {
                this.nextTurn();
            } else {
                this.broadcastState();
            }
        } else {
            this.chatHistory.push({
                system: true,
                message: `${user.name} yanlış tahminde bulundu! (${guess})`,
                timestamp: Date.now()
            });
            if (this.users[this.currentTurnIndex].id === userId) {
                this.nextTurn();
            } else {
                this.broadcastState();
            }
        }
    }

    useHint(userId) {
        if (this.gameState !== "PLAYING") return;
        const user = this.users.find(u => u.id === userId);
        if (!user || user.status !== 'playing' || user.hasUsedHint || !user.assignedWord) return;

        user.hasUsedHint = true;
        
        const word = user.assignedWord;
        let hint = "";
        for (let i = 0; i < word.length; i++) {
            if (word[i] === ' ') {
                hint += "  ";
            } else if (i === 0 || word[i-1] === ' ') {
                hint += word[i] + " ";
            } else {
                hint += "_ ";
            }
        }

        this.io.to(user.id).emit("game:hint_result", { hint: hint.trim() });
        this.broadcastState();
    }

    nextTurn() {
        if (this.gameState !== "PLAYING") return;

        let attempts = 0;
        do {
            this.currentTurnIndex = (this.currentTurnIndex + 1) % this.users.length;
            attempts++;
            if (attempts > this.users.length) {
                this.endGame();
                return;
            }
        } while (this.users[this.currentTurnIndex].status !== 'playing');

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
                hasUsedHint: u.hasUsedHint,
                assignedWord: (this.gameState === "ROUND_END" || u.id !== user.id) ? u.assignedWord : null
            }));

            const payload = {
                gameState: this.gameState,
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
