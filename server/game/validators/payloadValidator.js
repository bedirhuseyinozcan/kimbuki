
const chatRateLimits = new Map();    
const headRotRateLimits = new Map();   
const tauntRateLimits = new Map();      
const actionRateLimits = new Map();    

setInterval(() => {
    const now = Date.now();
    for (const [id, timestamps] of chatRateLimits.entries()) {
        const recent = timestamps.filter(t => now - t < 5000);
        if (recent.length === 0) chatRateLimits.delete(id);
        else chatRateLimits.set(id, recent);
    }
    for (const [id, data] of headRotRateLimits.entries()) {
        if (now - data.windowStart > 5000) headRotRateLimits.delete(id);
    }
    for (const [id, lastTime] of tauntRateLimits.entries()) {
        if (now - lastTime > 10000) tauntRateLimits.delete(id);
    }
    for (const [key, lastTime] of actionRateLimits.entries()) {
        if (now - lastTime > 10000) actionRateLimits.delete(key);
    }
}, 30000);

const payloadValidator = {
   
    checkActionRateLimit(userId, action, cooldownMs = 500) {
        if (!userId) return { ok: true };
        const key = `${userId}:${action}`;
        const now = Date.now();
        const lastTime = actionRateLimits.get(key) || 0;
        if (now - lastTime < cooldownMs) {
            return { ok: false, error: "Çok hızlı işlem yapıyorsunuz! Lütfen biraz bekleyin." };
        }
        actionRateLimits.set(key, now);
        return { ok: true };
    },
    
    validateRoomCreate(payload) {
        if (!payload || typeof payload !== "object") {
            return { ok: false, error: "Geçersiz istek gövdesi." };
        }
        const name = typeof payload.name === "string" ? payload.name.trim() : "";
        if (name.length < 2 || name.length > 20) {
            return { ok: false, error: "Oyuncu adı 2 ile 20 karakter arasında olmalıdır." };
        }

        return {
            ok: true,
            data: {
                name,
                avatar: typeof payload.avatar === "string" || typeof payload.avatar === "number" ? payload.avatar : "Warrior",
                pedestal: typeof payload.pedestal === "string" ? payload.pedestal.substring(0, 30) : "default_stone",
                nameColor: typeof payload.nameColor === "string" ? payload.nameColor.substring(0, 30) : "text-white",
                title: typeof payload.title === "string" ? payload.title.substring(0, 40) : "",
            }
        };
    },

    
    validateRoomJoin(payload) {
        if (!payload || typeof payload !== "object") {
            return { ok: false, error: "Geçersiz istek gövdesi." };
        }
        const rawCode = typeof payload.roomCode === "string" ? payload.roomCode.trim().toUpperCase() : "";
        if (!/^[A-Z0-9]{4,10}$/.test(rawCode)) {
            return { ok: false, error: "Geçersiz oda kodu formatı." };
        }

        const name = typeof payload.name === "string" ? payload.name.trim() : "";
        if (name.length < 2 || name.length > 20) {
            return { ok: false, error: "Oyuncu adı 2 ile 20 karakter arasında olmalıdır." };
        }

        return {
            ok: true,
            data: {
                roomCode: rawCode,
                name,
                avatar: typeof payload.avatar === "string" || typeof payload.avatar === "number" ? payload.avatar : "Warrior",
                pedestal: typeof payload.pedestal === "string" ? payload.pedestal.substring(0, 30) : "default_stone",
                nameColor: typeof payload.nameColor === "string" ? payload.nameColor.substring(0, 30) : "text-white",
                title: typeof payload.title === "string" ? payload.title.substring(0, 40) : "",
            }
        };
    },

    validateGameStart(settings, user, room) {
        if (!user || !user.isHost) {
            return { ok: false, error: "Yalnızca oda kurucusu (Host) oyunu başlatabilir!" };
        }
        if (!room) {
            return { ok: false, error: "Oda bulunamadı." };
        }
        const activeUsers = room.users.filter(u => !u.disconnected);
        if (activeUsers.length < 2) {
            return { ok: false, error: "Oyunu başlatmak için en az 2 aktif oyuncu gereklidir." };
        }

        const rawSettings = settings && typeof settings === "object" ? settings : {};
        const betAmount = Number(rawSettings.betAmount);
        const validBet = Number.isInteger(betAmount) && betAmount >= 10 && betAmount <= 100000 ? betAmount : 50;

        return {
            ok: true,
            data: {
                category: typeof rawSettings.category === "string" ? rawSettings.category.substring(0, 30) : "Karışık",
                theme: rawSettings.theme === "night" ? "night" : "day",
                map: typeof rawSettings.map === "string" ? rawSettings.map.substring(0, 60) : "floating_island__low_poly_vr.glb",
                bettingEnabled: Boolean(rawSettings.bettingEnabled),
                jokersEnabled: rawSettings.jokersEnabled !== undefined ? Boolean(rawSettings.jokersEnabled) : true,
                betAmount: validBet,
            }
        };
    },

    validateSetWord(word, user, room) {
        if (!room || room.gameState !== "WORD_SELECTION") {
            return { ok: false, error: "Şu anda kelime belirleme aşamasında değilsiniz." };
        }
        const rateCheck = this.checkActionRateLimit(user?.id, 'set_word', 500);
        if (!rateCheck.ok) return rateCheck;

        if (!user || !user.targetId || user.hasSubmittedWord) {
            return { ok: false, error: "Zaten kelime gönderdiniz veya hedefiniz yok." };
        }
        if (typeof word !== "string") {
            return { ok: false, error: "Kelime metin formatında olmalıdır." };
        }
        const cleanWord = word.trim().substring(0, 30);
        if (cleanWord.length < 3 || cleanWord.length > 30) {
            return { ok: false, error: "Kelime 3 ile 30 karakter arasında olmalıdır." };
        }
        if (!/^[a-zA-ZçğıöşüÇĞİÖŞÜ0-9\s]+$/.test(cleanWord)) {
            return { ok: false, error: "Kelime yalnızca harf, rakam ve boşluk içerebilir." };
        }

        return { ok: true, data: cleanWord };
    },

    validatePlaceBet(targetId, user, room) {
        if (!room || room.gameState !== "BETTING") {
            return { ok: false, error: "Şu anda bahis aşamasında değilsiniz." };
        }
        const rateCheck = this.checkActionRateLimit(user?.id, 'place_bet', 500);
        if (!rateCheck.ok) return rateCheck;
        if (!user || user.hasPlacedBet) {
            return { ok: false, error: "Zaten bahis yatırdınız." };
        }
        if (typeof targetId !== "string" || !targetId) {
            return { ok: false, error: "Geçersiz hedef oyuncu." };
        }
        if (targetId === user.id) {
            return { ok: false, error: "Kendinize bahis yatıramazsınız!" };
        }
        const targetExists = room.users.some(u => u.id === targetId && !u.disconnected && u.status === 'playing');
        if (!targetExists) {
            return { ok: false, error: "Bahis yatırılacak aktif oyuncu bulunamadı." };
        }

        return { ok: true, data: targetId };
    },

    validateChat(message, userId) {
        if (typeof message !== "string") {
            return { ok: false, error: "Mesaj metin formatında olmalıdır." };
        }
        const cleanMsg = message.trim();
        if (cleanMsg.length === 0 || cleanMsg.length > 150) {
            return { ok: false, error: "Mesaj 1 ile 150 karakter arasında olmalıdır." };
        }

        const now = Date.now();
        const timestamps = chatRateLimits.get(userId) || [];
        const recent = timestamps.filter(t => now - t < 3000);
        if (recent.length >= 5) {
            return { ok: false, error: "Çok hızlı mesaj gönderiyorsunuz, lütfen biraz bekleyin!" };
        }
        recent.push(now);
        chatRateLimits.set(userId, recent);

        return { ok: true, data: cleanMsg };
    },

    validateAskQuestion(question, user, room) {
        if (!room || room.gameState !== "PLAYING") {
            return { ok: false, error: "Oyun şu anda soru sorma aşamasında değil." };
        }
        const rateCheck = this.checkActionRateLimit(user?.id, 'ask_question', 1000);
        if (!rateCheck.ok) return rateCheck;

        if (room.activeQuestion) {
            return { ok: false, error: "Şu anda devam eden aktif bir soru var!" };
        }
        const currentUser = room.users[room.currentTurnIndex];
        if (!currentUser || currentUser.id !== user?.id) {
            return { ok: false, error: "Şu anda sizin sıranız değil!" };
        }
        if (currentUser.russianRouletteActive) {
            return { ok: false, error: "Rus Ruletindesiniz, soru soramazsınız!" };
        }
        if (typeof question !== "string") {
            return { ok: false, error: "Soru metin formatında olmalıdır." };
        }
        const cleanQ = question.trim();
        if (cleanQ.length < 3 || cleanQ.length > 150) {
            return { ok: false, error: "Soru 3 ile 150 karakter arasında olmalıdır." };
        }

        return { ok: true, data: cleanQ };
    },

    validateSubmitVote(vote, user, room) {
        if (!room || room.gameState !== "PLAYING" || !room.activeQuestion) {
            return { ok: false, error: "Şu anda oylanacak aktif bir soru bulunmuyor." };
        }
        const rateCheck = this.checkActionRateLimit(user?.id, 'submit_vote', 300);
        if (!rateCheck.ok) return rateCheck;

        if (!user || user.status !== "playing" || user.disconnected) {
            return { ok: false, error: "Yalnızca aktif oyuncular oy kullanabilir." };
        }
        if (room.activeQuestion.askerId === user.id) {
            return { ok: false, error: "Kendi sorduğunuz soruya oy veremezsiniz!" };
        }

        const normalized = typeof vote === "string" ? vote.trim().toLowerCase() : "";
        let validVote = "";
        if (normalized === "yes" || normalized === "evet") validVote = "yes";
        else if (normalized === "no" || normalized === "hayır") validVote = "no";
        else if (normalized === "dunno" || normalized === "bilmiyorum") validVote = "dunno";
        else {
            return { ok: false, error: "Geçersiz oy seçeneği! (Evet, Hayır veya Bilmiyorum olmalıdır)" };
        }

        return { ok: true, data: validVote };
    },

    validateGuess(guess, user, room) {
        if (!room || room.gameState !== "PLAYING") {
            return { ok: false, error: "Oyun tahmin aşamasında değil." };
        }
        const rateCheck = this.checkActionRateLimit(user?.id, 'guess', 500);
        if (!rateCheck.ok) return rateCheck;

        const currentUser = room.users[room.currentTurnIndex];
        if (!currentUser || currentUser.id !== user?.id) {
            return { ok: false, error: "Tahmin yapmak için sıranın size gelmesini bekleyin!" };
        }
        if (typeof guess !== "string") {
            return { ok: false, error: "Tahmin metin formatında olmalıdır." };
        }
        const cleanGuess = guess.trim();
        if (cleanGuess.length === 0 || cleanGuess.length > 50) {
            return { ok: false, error: "Tahmin 1 ile 50 karakter arasında olmalıdır." };
        }

        return { ok: true, data: cleanGuess };
    },

    validateSelectJoker(jokerId, user, room) {
        if (!room || room.gameState !== "JOKER_DRAFT") {
            return { ok: false, error: "Şu anda joker seçim aşamasında değilsiniz." };
        }
        const rateCheck = this.checkActionRateLimit(user?.id, 'select_joker', 500);
        if (!rateCheck.ok) return rateCheck;

        if (!user || user.status !== "playing") {
            return { ok: false, error: "Yalnızca aktif oyuncular joker seçebilir." };
        }
        const idNum = Number(jokerId);
        if (!Number.isInteger(idNum) || !user.jokerChoices || !user.jokerChoices.includes(idNum)) {
            return { ok: false, error: "Seçilen joker size sunulan seçenekler arasında yok!" };
        }

        return { ok: true, data: idNum };
    },

    validateVoteObjection(vote, user, room) {
        if (!room || !room.objection) {
            return { ok: false, error: "Şu anda aktif bir itiraz oylaması yok." };
        }
        const rateCheck = this.checkActionRateLimit(user?.id, 'vote_objection', 300);
        if (!rateCheck.ok) return rateCheck;
        if (!user || user.status !== "playing" || user.disconnected) {
            return { ok: false, error: "Oy kullanma yetkiniz yok." };
        }
        if (typeof vote !== "boolean") {
            return { ok: false, error: "İtiraz oyu doğru/yanlış (boolean) olmalıdır." };
        }

        return { ok: true, data: vote };
    },

    validateHeadRotation(payload, userId) {
        if (!payload || typeof payload !== "object") return { ok: false };
        const pitch = Number(payload.pitch);
        const yaw = Number(payload.yaw);
        if (!Number.isFinite(pitch) || !Number.isFinite(yaw)) return { ok: false };
        if (pitch < -3.5 || pitch > 3.5 || yaw < -3.5 || yaw > 3.5) return { ok: false };

        const now = Date.now();
        const tracker = headRotRateLimits.get(userId) || { count: 0, windowStart: now };
        if (now - tracker.windowStart > 1000) {
            tracker.count = 1;
            tracker.windowStart = now;
        } else {
            tracker.count++;
            if (tracker.count > 30) return { ok: false }; // sessizce yoksay
        }
        headRotRateLimits.set(userId, tracker);

        return { ok: true, data: { pitch, yaw } };
    },

    validateTaunt(type, userId) {
        if (typeof type !== "string" || type.length > 30) {
            return { ok: false, error: "Geçersiz taunt tipi." };
        }

        const now = Date.now();
        const lastTime = tauntRateLimits.get(userId) || 0;
        if (now - lastTime < 2000) {
            return { ok: false, error: "Taunt için biraz beklemelisin!" };
        }
        tauntRateLimits.set(userId, now);

        return { ok: true, data: type };
    }
};

module.exports = payloadValidator;
