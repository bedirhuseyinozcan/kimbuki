function skipTurn(room, userId) {
    if (room.gameState !== "PLAYING") return;
    const currentUser = room.users[room.currentTurnIndex];
    if (!currentUser || currentUser.id !== userId) return;

    if (currentUser.russianRouletteActive) return;

    room.nextTurn();
}

function openLettersForUser(room, user, count) {
    if (!user.assignedWord) return;
    const word = user.assignedWord.toLocaleUpperCase("tr-TR").replace(/[^A-ZÇĞİÖŞÜ0-9]/g, "");
    for (let k = 0; k < count; k++) {
        const unrevealed = word.split('').filter(c => !user.revealedLetters.includes(c));
        if (unrevealed.length === 0) {
            room.addChatLog({ system: true, privateTo: user.id, message: "Sistem (Özel): Açılacak başka harf kalmadı!", timestamp: Date.now() });
            break;
        }
        const randomChar = unrevealed[Math.floor(Math.random() * unrevealed.length)];
        user.revealedLetters.push(randomChar);
        const countChar = word.split('').filter(c => c === randomChar).length;
        room.addChatLog({ system: true, privateTo: user.id, message: `Sistem (Özel): Kelimen '${randomChar}' karakterini içeriyor (${countChar} adet).`, timestamp: Date.now() });
    }
}

function nextTurn(room, isDisconnect = false) {
    if (room.questionTimer) {
        clearTimeout(room.questionTimer);
        room.questionTimer = null;
    }
    room.activeQuestion = null;
    room.resolvedQuestionsThisTurn = [];
    if (room.gameState !== "PLAYING") return;

    if (!isDisconnect) {
        const prevUser = room.users[room.currentTurnIndex];
        if (prevUser && prevUser.status === 'playing') {
            if (prevUser.russianRouletteActive) {
                let dmg = 3;
                if (prevUser.shieldActive) {
                    prevUser.shieldActive = false;
                    dmg -= 1;
                    room.io.to(room.code).emit("game:visual_effect", { type: 'shield_cast', targetId: prevUser.id });
                }

                prevUser.lives -= dmg;
                prevUser.russianRouletteActive = false;

                if (prevUser.lives <= 0) {
                    prevUser.status = 'spectator';
                    prevUser.bloodTieTarget = null;
                    prevUser.timeBomb = null;
                    room.io.to(room.code).emit("game:visual_effect", { type: 'roulette_die', targetId: prevUser.id });
                    room.addChatLog({ system: true, message: `💀 ${prevUser.name} Rus Ruleti süresini aştı ve elendi!`, timestamp: Date.now() });
                } else {
                    room.addChatLog({ system: true, message: `🛡️ ${prevUser.name} Rus Ruleti süresini aştı! Kalkanı parçalandı ve ağır hasar aldı ama yaşıyor!`, timestamp: Date.now() });
                }

                const activePlayers = room.users.filter(x => x.status === 'playing');
                if (activePlayers.length <= 1) {
                    room.endGame();
                    return;
                }
            }
            prevUser.extraQuestionChain = false;
            prevUser.extraQuestions = 0;
        }
    }

    let spins = 0;
    let foundNext = false;
    const maxSpins = room.users.length * 3;

    while (spins < maxSpins) {
        spins++;
        if (!isDisconnect || spins > 1) {
            room.currentTurnIndex = (room.currentTurnIndex + 1) % room.users.length;

            if (room.currentTurnIndex === 0) {
                room.roundCount++;

                for (let u of room.users) {
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
                                    room.io.to(room.code).emit("game:visual_effect", { type: 'shield_cast', targetId: u.id });
                                }

                                u.lives -= dmg;
                                u.timeBomb = null;
                                room.io.to(room.code).emit("game:visual_effect", { type: 'bomb_explode', targetId: u.id });

                                if (shielded) {
                                    room.addChatLog({ system: true, message: `🛡️ 💥 GÜM! Saatli Bomba patladı! ${u.name}'in kalkanı kırıldı ama yine de 1 can kaybetti! (-1 Can)`, timestamp: Date.now() });
                                } else {
                                    room.addChatLog({ system: true, message: `💥 GÜM! Süre doldu. ${u.name}'in üzerindeki Saatli Bomba patladı! (-2 Can)`, timestamp: Date.now() });
                                }

                                if (u.lives <= 0) {
                                    u.status = 'spectator';
                                    u.bloodTieTarget = null;
                                    room.addChatLog({ system: true, message: `💀 ${u.name} bombanın etkisiyle elendi! Kelimesi: ${u.assignedWord}`, timestamp: Date.now() });
                                }
                            }
                        }
                    }
                }

                const activePlayers = room.users.filter(x => x.status === 'playing');
                if (activePlayers.length <= 1) {
                    room.endGame();
                    return;
                }
            }
        }

        const nextUser = room.users[room.currentTurnIndex];
        if (nextUser && nextUser.status === 'playing' && !nextUser.disconnected) {
            if (nextUser.silencedTurns > 0) {
                nextUser.silencedTurns--;
                room.addChatLog({
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
        room.endGame();
        return;
    }

    room.startTimer();
    room.broadcastState();
}

function startTimer(room) {
    if (room.timer) clearTimeout(room.timer);

    room.turnStartTime = Date.now();

    room.timer = setTimeout(() => {
        if (room.gameState === "PLAYING") {
            room.nextTurn();
        }
    }, room.turnTime * 1000);
}

module.exports = {
    skipTurn,
    openLettersForUser,
    nextTurn,
    startTimer
};
