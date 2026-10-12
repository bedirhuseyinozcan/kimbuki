function askQuestion(room, userId, question) {
    if (room.gameState !== "PLAYING") return;
    if (room.activeQuestion) return;
    if (typeof question !== 'string' || question.length > 150) return;
    const currentUser = room.users[room.currentTurnIndex];
    if (!currentUser || currentUser.id !== userId) return;
    if (currentUser.russianRouletteActive) return;

    const asked = currentUser.questionsAskedThisTurn || 0;

    if (asked >= 1) {
        if (currentUser.extraQuestions > 0) {
            currentUser.extraQuestions--;
        } else {
            room.io.to(currentUser.id).emit("game:error", { message: "Bu turdaki soru hakkını doldurdun! Lütfen tahmin et veya sıranı bekle." });
            return;
        }
    }

    currentUser.questionsAskedThisTurn = asked + 1;

    if (room.timer) {
        clearTimeout(room.timer);
        room.timer = null;
    }

    const remainingMs = room.turnStartTime + (room.turnTime * 1000) - Date.now();
    room.pausedRemainingMs = Math.max(10000, remainingMs);

    room.activeQuestion = {
        askerId: userId,
        question: question,
        votes: {},
        endTime: Date.now() + 15000
    };

    room.questionTimer = setTimeout(() => {
        resolveQuestion(room);
    }, 15000);

    room.broadcastState();
}

function submitVote(room, userId, voteType) {
    if (room.gameState !== "PLAYING" || !room.activeQuestion || typeof voteType !== 'string') return;
    if (room.activeQuestion.askerId === userId) return;

    const user = room.users.find(u => u.id === userId);
    if (!user || user.status !== 'playing' || user.disconnected) return;

    room.activeQuestion.votes[userId] = voteType;

    const playingUsers = room.users.filter(u => u.status === 'playing' && !u.disconnected && u.id !== room.activeQuestion.askerId);
    const validVotesCount = Object.keys(room.activeQuestion.votes).filter(vId => playingUsers.some(p => p.id === vId)).length;

    if (validVotesCount >= playingUsers.length) {
        resolveQuestion(room);
    } else {
        room.broadcastState();
    }
}

function resolveQuestion(room) {
    if (!room.activeQuestion) return;

    const asker = room.users.find(u => u.id === room.activeQuestion.askerId);

    let yesCount = 0, noCount = 0;
    for (let vote of Object.values(room.activeQuestion.votes)) {
        if (vote === 'yes') yesCount++;
        else if (vote === 'no') noCount++;
    }
    const isYesMajority = yesCount > noCount;
    const isNoMajority = noCount > yesCount;

    if (asker && asker.extraQuestionChain) {
        if (isYesMajority) {
            asker.extraQuestions += 1;
            room.addChatLog({ system: true, privateTo: asker.id, message: "Sistem (Özel): Sorun çoğunluktan 'Evet' oyu aldığı için +1 Soru Hakkı daha kazandın!", timestamp: Date.now() });
        } else {
            asker.extraQuestions = 0;
            asker.extraQuestionChain = false;
            room.addChatLog({ system: true, privateTo: asker.id, message: "Sistem (Özel): Sorun 'Evet' çoğunluğunu sağlayamadığı için Çift Şarjör serin kırıldı!", timestamp: Date.now() });
        }
    }

    for (let u of room.users) {
        if (u.bloodTieTarget === room.activeQuestion.askerId && u.status === 'playing') {
            if (isYesMajority) {
                room.addChatLog({ system: true, message: `🩸 Kan Bağı: Bağlı olduğun oyuncu EVET aldı! ${u.name}'in gizli bir harfi açıldı.`, timestamp: Date.now() });
                room.openLettersForUser(u, 1);
            } else if (isNoMajority) {
                let dmg = 1;
                if (u.shieldActive) {
                    u.shieldActive = false;
                    dmg -= 1;
                    room.io.to(room.code).emit("game:visual_effect", { type: 'shield_cast', targetId: u.id });
                    room.addChatLog({ system: true, message: `🛡️ 🩸 Kan Bağı: ${u.name} can kaybedecekti ancak Gizli Kalkanı onu korudu!`, timestamp: Date.now() });
                }
                u.lives -= dmg;
                if (dmg > 0) {
                    if (u.lives <= 0) {
                        u.status = 'spectator';
                        u.bloodTieTarget = null;
                        u.timeBomb = null;
                        room.addChatLog({ system: true, message: `🩸 Kan Bağı: Bağlı olduğun oyuncu HAYIR aldı! ${u.name} tüm canlarını kaybetti ve elendi!`, timestamp: Date.now() });
                    } else {
                        room.addChatLog({ system: true, message: `🩸 Kan Bağı: Bağlı olduğun oyuncu HAYIR aldı! ${u.name} 1 can kaybetti!`, timestamp: Date.now() });
                    }
                }
            }
        }
    }

    if (!room.resolvedQuestionsThisTurn) room.resolvedQuestionsThisTurn = [];
    if (asker) {
        asker.lastQuestion = room.activeQuestion;
        if (!asker.lastQuestions) asker.lastQuestions = [];
        asker.lastQuestions.push(room.activeQuestion);
    }
    room.resolvedQuestionsThisTurn.push(room.activeQuestion);
    room.activeQuestion = null;
    if (room.questionTimer) {
        clearTimeout(room.questionTimer);
        room.questionTimer = null;
    }

    const activePlayers = room.users.filter(x => x.status === 'playing');
    if (activePlayers.length <= 1) {
        room.endGame();
        return;
    }

    room.turnStartTime = Date.now() - ((room.turnTime * 1000) - room.pausedRemainingMs);

    room.timer = setTimeout(() => {
        if (room.gameState === "PLAYING") {
            room.nextTurn();
        }
    }, room.pausedRemainingMs);

    room.broadcastState();
}

module.exports = {
    askQuestion,
    submitVote,
    resolveQuestion
};
