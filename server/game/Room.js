const Player = require("../models/Player");

class Room {
    constructor(code, io) {
        this.code = code;
        this.io = io;
        this.users = [];
        this.gameState = "LOBBY";
        this.targetPlayer = null;
        this.imposterId = null;
        this.roundTime = 300;
        this.turnTime = 30;
        this.timer = null;
        this.timeLeft = this.roundTime;


        this.currentTurnIndex = 0;
        this.turnTimeLeft = 0;
        this.clueHistory = [];

        this.winner = null;
        this.gameEndReason = "";
    }

    addUser(socketId, name) {
        const isHost = this.users.length === 0;
        this.users.push({
            id: socketId,
            name,
            score: 0,
            isHost,
            role: null,
            votedFor: null
        });
        this.broadcastState();
    }

    removeUser(socketId) {
        const wasHost = this.users.find(u => u.id === socketId)?.isHost;
        this.users = this.users.filter((u) => u.id !== socketId);

        if (this.users.length > 0 && wasHost) {
            this.users[0].isHost = true;
        }

        if (this.users.length < 3 && this.gameState === "PLAYING") {
            this.endGame("imposter", "Not enough players!");
        }

        this.broadcastState();
        return this.users.length === 0;
    }

    async startGame() {
        if (this.users.length < 3) {

        }

        this.gameState = "PLAYING";
        this.timeLeft = this.roundTime;
        this.winner = null;
        this.gameEndReason = "";


        this.users.forEach(u => {
            u.role = 'civilian';
            u.votedFor = null;
        });

        const imposterIndex = Math.floor(Math.random() * this.users.length);
        this.users[imposterIndex].role = 'imposter';
        this.imposterId = this.users[imposterIndex].id;

        try {
            const count = await Player.countDocuments();
            const random = Math.floor(Math.random() * count);
            const randomPlayer = await Player.findOne().skip(random);
            this.targetPlayer = randomPlayer;
        } catch (error) {
            console.error("Error fetching random player:", error);
            
            this.endGame("imposter", "Database Error!");
            return;
        }

        this.clueHistory = [];
        this.currentTurnIndex = Math.floor(Math.random() * this.users.length);
        this.turnTimeLeft = this.turnTime;

        this.startTimer();
        this.broadcastState();
    }

    handleClue(userId, clueText) {
        if (this.gameState !== "PLAYING") return;

        const currentUser = this.users[this.currentTurnIndex];
        if (currentUser.id !== userId) return;

        this.clueHistory.push({
            userId: currentUser.id,
            name: currentUser.name,
            clue: clueText,
            timestamp: Date.now()
        });

        this.nextTurn();
    }

    nextTurn() {
        this.currentTurnIndex = (this.currentTurnIndex + 1) % this.users.length;
        this.turnTimeLeft = this.turnTime;
        this.broadcastState();
    }

    vote(voterId, targetId) {
        if (this.gameState !== "PLAYING") return;
        if (voterId === targetId) return;

        const voter = this.users.find(u => u.id === voterId);
        if (!voter) return;


        if (voter.votedFor === targetId) {
            voter.votedFor = null;
        } else {
            voter.votedFor = targetId;
        }

        this.checkVoteOutcome();
        this.broadcastState();
    }

    checkVoteOutcome() {

        const votes = {};
        const aliveCount = this.users.length;

        this.users.forEach(u => {
            if (u.votedFor) {
                votes[u.votedFor] = (votes[u.votedFor] || 0) + 1;
            }
        });

        for (const [targetId, count] of Object.entries(votes)) {
            if (count > aliveCount / 2) {

                const target = this.users.find(u => u.id === targetId);
                if (target.role === 'imposter') {
                    this.endGame('civilians', `Imposter ${target.name} yakalandı!`);
                } else {
                    this.endGame('imposter', `Masum ${target.name} atıldı! Imposter kazandı.`);
                }
                return;
            }
        }
    }

    imposterGuess(guesserId, guessName) {
        if (this.gameState !== "PLAYING") return;

        const user = this.users.find(u => u.id === guesserId);
        if (!user || user.role !== 'imposter') return;

        const normalizedTarget = this.targetPlayer.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        const normalizedGuess = guessName.toLowerCase().replace(/[^a-z0-9]/g, "");

        if (normalizedTarget === normalizedGuess || (normalizedTarget.includes(normalizedGuess) && normalizedGuess.length > 3)) {
            this.endGame('imposter', `Imposter ${user.name} doğru bildi!`);
        } else {
            this.endGame('civilians', `Imposter ${user.name} yanlış bildi!`);
        }
    }

    startTimer() {
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => {
            this.timeLeft--;
            if (this.timeLeft <= 0) {
                this.endGame('imposter', "Süre bitti! Imposter kazandı.");
                return;
            }

            this.turnTimeLeft--;
            if (this.turnTimeLeft <= 0) {
                this.nextTurn();
            } else {
                this.broadcastState();
            }
        }, 1000);
    }

    endGame(winner, reason) {
        this.gameState = "ROUND_END";
        this.winner = winner;
        this.gameEndReason = reason;
        clearInterval(this.timer);
        this.broadcastState();
    }

    broadcastState() {

        this.users.forEach(user => {

            const isImposter = user.role === 'imposter';

            const payload = {
                gameState: this.gameState,
                users: this.users.map(u => ({
                    id: u.id,
                    name: u.name,
                    isHost: u.isHost,




                    score: u.score,
                    votedFor: u.votedFor
                })),
                timeLeft: this.timeLeft,
                winner: this.winner,
                reason: this.gameEndReason,


                targetPlayer: (this.gameState === "ROUND_END" || !isImposter) ? this.targetPlayer : null,


                currentTurnUserId: this.users[this.currentTurnIndex]?.id,
                turnTimeLeft: this.turnTimeLeft,
                clueHistory: this.clueHistory,


                myRole: user.role
            };

            this.io.to(user.id).emit("game:state", payload);
        });
    }
}

module.exports = Room;
