
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

    
    validateActivePlayer(user, room) {
        if (!room) {
            return { ok: false, error: "Oda bulunamadı." };
        }
        if (!user) {
            return { ok: false, error: "Oyuncu profili bulunamadı." };
        }
        if (user.disconnected) {
            return { ok: false, error: "Bağlantınız kopmuş durumda. Lütfen odaya tekrar bağlanın." };
        }
        if (user.status !== "playing") {
            return { ok: false, error: "Yalnızca hayatta olan aktif oyuncular bu aksiyonu gerçekleştirebilir. İzleyiciler (spectator) oyun akışını değiştiremez!" };
        }
        return { ok: true };
    },

   
    validateCurrentTurn(user, room, actionName = "aksiyon almak") {
        const activeCheck = this.validateActivePlayer(user, room);
        if (!activeCheck.ok) return activeCheck;

        if (room.gameState !== "PLAYING") {
            return { ok: false, error: `Şu anda oyun aşamasında değilsiniz. (Mevcut aşama: ${room.gameState})` };
        }
        const currentUser = room.users[room.currentTurnIndex];
        if (!currentUser || currentUser.id !== user.id) {
            return { ok: false, error: `Sıra sizde değil! ${actionName} için sıranın size gelmesini bekleyin.` };
        }
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
        if (room.gameState !== "LOBBY" && room.gameState !== "ROUND_END") {
            return { ok: false, error: "Oyun zaten başlamış durumda!" };
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
        const activeCheck = this.validateActivePlayer(user, room);
        if (!activeCheck.ok) return activeCheck;

        if (room.gameState !== "WORD_SELECTION") {
            return { ok: false, error: "Şu anda kelime belirleme aşamasında değilsiniz." };
        }
        const rateCheck = this.checkActionRateLimit(user?.id, 'set_word', 500);
        if (!rateCheck.ok) return rateCheck;

        if (!user.targetId || user.hasSubmittedWord) {
            return { ok: false, error: "Zaten kelime gönderdiniz veya hedef oyuncunuz yok." };
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

   
    validateEditWord(user, room) {
        const activeCheck = this.validateActivePlayer(user, room);
        if (!activeCheck.ok) return activeCheck;

        if (room.gameState !== "WORD_SELECTION") {
            return { ok: false, error: "Şu anda kelime düzenleme aşamasında değilsiniz." };
        }
        if (!user.hasSubmittedWord) {
            return { ok: false, error: "Henüz bir kelime göndermediniz." };
        }
        return { ok: true };
    },

    validateShuffleTargets(user, room) {
        if (!user || !user.isHost) {
            return { ok: false, error: "Yalnızca oda kurucusu hedefleri karıştırabilir." };
        }
        if (!room || room.gameState !== "WORD_SELECTION") {
            return { ok: false, error: "Hedefler yalnızca kelime seçimi aşamasında karıştırılabilir." };
        }
        return { ok: true };
    },

    validatePlaceBet(targetId, user, room) {
        const activeCheck = this.validateActivePlayer(user, room);
        if (!activeCheck.ok) return activeCheck;

        if (room.gameState !== "BETTING") {
            return { ok: false, error: "Şu anda bahis aşamasında değilsiniz." };
        }
        const rateCheck = this.checkActionRateLimit(user?.id, 'place_bet', 500);
        if (!rateCheck.ok) return rateCheck;

        if (user.hasPlacedBet) {
            return { ok: false, error: "Zaten bahis yatırdınız." };
        }
        if (typeof targetId !== "string" || !targetId.trim()) {
            return { ok: false, error: "Geçersiz hedef oyuncu formatı." };
        }
        const cleanTargetId = targetId.trim();
        if (cleanTargetId === user.id) {
            return { ok: false, error: "Kendinize bahis yatıramazsınız!" };
        }
        const target = room.users.find(u => u.id === cleanTargetId && !u.disconnected && u.status === 'playing');
        if (!target) {
            return { ok: false, error: "Bahis yatırılacak aktif oyuncu bulunamadı." };
        }

        return { ok: true, data: target.id };
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
        const turnCheck = this.validateCurrentTurn(user, room, "soru sormak");
        if (!turnCheck.ok) return turnCheck;

        const rateCheck = this.checkActionRateLimit(user?.id, 'ask_question', 1000);
        if (!rateCheck.ok) return rateCheck;

        if (room.activeQuestion) {
            return { ok: false, error: "Şu anda devam eden aktif bir soru var!" };
        }
        if (user.russianRouletteActive) {
            return { ok: false, error: "Rus Ruletindesiniz, soru soramazsınız! Yalnızca tahmin yapabilirsiniz." };
        }
        if (user.questionsAskedThisTurn >= 1 && (user.extraQuestions || 0) <= 0) {
            return { ok: false, error: "Bu turdaki soru sorma hakkınızı doldurdunuz!" };
        }

        if (typeof question !== "string") {
            return { ok: false, error: "Soru metin formatında olmalıdır." };
        }
        const cleanQ = question.trim();
        if (cleanQ.length < 3 || cleanQ.length > 150) {
            return { ok: false, error: "Soru en az 3, en fazla 150 karakter olmalıdır." };
        }

        return { ok: true, data: cleanQ };
    },

    validateSubmitVote(vote, user, room) {
        const activeCheck = this.validateActivePlayer(user, room);
        if (!activeCheck.ok) return activeCheck;

        if (room.gameState !== "PLAYING" || !room.activeQuestion) {
            return { ok: false, error: "Şu anda oylanacak aktif bir soru bulunmuyor." };
        }
        const rateCheck = this.checkActionRateLimit(user?.id, 'submit_vote', 300);
        if (!rateCheck.ok) return rateCheck;

        if (room.activeQuestion.askerId === user.id) {
            return { ok: false, error: "Kendi sorduğunuz soruya oy veremezsiniz!" };
        }

        if (typeof vote !== "string") {
            return { ok: false, error: "Oy formatı metin olmalıdır." };
        }
        const normalized = vote.trim().toLowerCase();
        let validVote = "";
        if (normalized === "yes" || normalized === "evet") validVote = "yes";
        else if (normalized === "no" || normalized === "hayır") validVote = "no";
        else if (normalized === "sometimes" || normalized === "bazen" || normalized === "dunno" || normalized === "bilmiyorum") validVote = "sometimes";
        else {
            return { ok: false, error: "Geçersiz oy seçeneği! (Evet, Hayır veya Bazen olmalıdır)" };
        }

        return { ok: true, data: validVote };
    },

    validateGuess(guess, user, room) {
        const turnCheck = this.validateCurrentTurn(user, room, "tahmin yapmak");
        if (!turnCheck.ok) return turnCheck;

        const rateCheck = this.checkActionRateLimit(user?.id, 'guess', 500);
        if (!rateCheck.ok) return rateCheck;

        if (typeof guess !== "string") {
            return { ok: false, error: "Tahmin metin formatında olmalıdır." };
        }
        const cleanGuess = guess.trim();
        if (cleanGuess.length < 3 || cleanGuess.length > 50) {
            return { ok: false, error: "Tahmin en az 3, en fazla 50 karakter olmalıdır." };
        }
        if (!/^[a-zA-ZçğıöşüÇĞİÖŞÜ0-9\s]+$/.test(cleanGuess)) {
            return { ok: false, error: "Tahmin yalnızca harf, rakam ve boşluk içerebilir." };
        }

        return { ok: true, data: cleanGuess };
    },

    validateSkipTurn(user, room) {
        const turnCheck = this.validateCurrentTurn(user, room, "turu geçmek");
        if (!turnCheck.ok) return turnCheck;

        const rateCheck = this.checkActionRateLimit(user?.id, 'skip_turn', 500);
        if (!rateCheck.ok) return rateCheck;

        if (user.russianRouletteActive) {
            return { ok: false, error: "Rus Ruletindeyken turu geçemezsiniz, tahmin etmek zorundasınız!" };
        }
        if (room.activeQuestion) {
            return { ok: false, error: "Aktif soru oylanırken turu geçemezsiniz!" };
        }

        return { ok: true };
    },

    validateSelectJoker(jokerId, user, room) {
        const activeCheck = this.validateActivePlayer(user, room);
        if (!activeCheck.ok) return activeCheck;

        if (room.gameState !== "JOKER_DRAFT") {
            return { ok: false, error: "Şu anda joker seçim aşamasında değilsiniz." };
        }
        const rateCheck = this.checkActionRateLimit(user?.id, 'select_joker', 500);
        if (!rateCheck.ok) return rateCheck;

        if (user.hasDrafted) {
            return { ok: false, error: "Zaten bir joker seçtiniz." };
        }
        const idNum = Number(jokerId);
        if (!Number.isInteger(idNum) || !user.jokerChoices || !user.jokerChoices.includes(idNum)) {
            return { ok: false, error: "Seçilen joker size sunulan seçenekler arasında yok!" };
        }

        return { ok: true, data: idNum };
    },

    validateUseJoker(payload, user, room) {
        const turnCheck = this.validateCurrentTurn(user, room, "joker kullanmak");
        if (!turnCheck.ok) return turnCheck;

        const rateCheck = this.checkActionRateLimit(user?.id, 'use_joker', 800);
        if (!rateCheck.ok) return rateCheck;

        if (user.russianRouletteActive) {
            return { ok: false, error: "Rus Ruletindeyken joker kullanamazsınız!" };
        }
        if (room.roundCount < 3) {
            return { ok: false, error: "Jokerler 3. turdan itibaren kullanılabilir!" };
        }
        if (user.joker === null || user.joker === undefined) {
            return { ok: false, error: "Kullanabileceğiniz bir jokeriniz yok!" };
        }
        if (user.hasUsedJoker) {
            return { ok: false, error: "Joker hakkınızı bu oyunda zaten kullandınız!" };
        }
        if (!payload || typeof payload !== "object") {
            return { ok: false, error: "Geçersiz joker parametresi." };
        }

        const targetRequiredJokers = [3, 4, 5, 7, 10, 13, 15, 16];
        const wordRequiredJokers = [4, 14];

        const cleanPayload = {};

        const rawTargetId = typeof payload.targetId === "string" ? payload.targetId.trim() : "";
        if (targetRequiredJokers.includes(user.joker)) {
            if (!rawTargetId) {
                return { ok: false, error: "Lütfen bir hedef oyuncu seçin." };
            }
            if (rawTargetId === user.id) {
                return { ok: false, error: "Bu jokeri kendi üzerinizde kullanamazsınız!" };
            }
            const target = room.users.find(u => u.id === rawTargetId && !u.disconnected && u.status === 'playing');
            if (!target) {
                return { ok: false, error: "Hedef oyuncu bulunamadı veya artık oyunda değil." };
            }
            cleanPayload.targetId = target.id;
        } else if (rawTargetId) {
            const target = room.users.find(u => u.id === rawTargetId && !u.disconnected && u.status === 'playing');
            if (target) {
                cleanPayload.targetId = target.id;
            }
        }

        const rawNewWord = typeof payload.newWord === "string" ? payload.newWord.trim() : "";
        if (wordRequiredJokers.includes(user.joker)) {
            if (!rawNewWord) {
                return { ok: false, error: user.joker === 14 ? "Lütfen sorgulamak istediğiniz harfi girin." : "Lütfen geçerli bir kelime girin." };
            }
            if (rawNewWord.length > 30) {
                return { ok: false, error: "Kelime veya harf en fazla 30 karakter olabilir." };
            }
            cleanPayload.newWord = rawNewWord;
        } else if (rawNewWord) {
            if (rawNewWord.length <= 30) {
                cleanPayload.newWord = rawNewWord;
            }
        }

        return { ok: true, data: cleanPayload };
    },
    validateStartObjection(user, room) {
        const activeCheck = this.validateActivePlayer(user, room);
        if (!activeCheck.ok) return activeCheck;

        if (room.gameState !== "PLAYING") {
            return { ok: false, error: "Şike itirazı yalnızca oyun oynanırken yapılabilir." };
        }
        const rateCheck = this.checkActionRateLimit(user?.id, 'start_objection', 1000);
        if (!rateCheck.ok) return rateCheck;

        if (user.russianRouletteActive) {
            return { ok: false, error: "Rus Ruletindeyken şike itirazı yapamazsınız!" };
        }
        if (room.objection) {
            return { ok: false, error: "Şu anda zaten devam eden bir şike itirazı var!" };
        }
        if (room.hasObjectionUsed) {
            return { ok: false, error: "Bu oyunda şike itirazı hakkı zaten kullanıldı!" };
        }

        return { ok: true };
    },

    validateVoteObjection(vote, user, room) {
        const activeCheck = this.validateActivePlayer(user, room);
        if (!activeCheck.ok) return activeCheck;

        if (room.gameState !== "PLAYING" || !room.objection) {
            return { ok: false, error: "Şu anda aktif bir itiraz oylaması yok." };
        }
        const rateCheck = this.checkActionRateLimit(user?.id, 'vote_objection', 300);
        if (!rateCheck.ok) return rateCheck;

        if (typeof vote !== "boolean") {
            return { ok: false, error: "İtiraz oyu doğru/yanlış (boolean) formatında olmalıdır." };
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
            if (tracker.count > 30) return { ok: false }; // Flood durumunda sessizce yut
        }
        headRotRateLimits.set(userId, tracker);

        return { ok: true, data: { pitch, yaw } };
    },

    validateTaunt(type, userId) {
        if (typeof type !== "string" || type.trim().length === 0 || type.length > 30) {
            return { ok: false, error: "Geçersiz taunt tipi." };
        }

        const now = Date.now();
        const lastTime = tauntRateLimits.get(userId) || 0;
        if (now - lastTime < 2000) {
            return { ok: false, error: "Taunt için lütfen 2 saniye bekleyin!" };
        }
        tauntRateLimits.set(userId, now);

        return { ok: true, data: type.trim() };
    }
};

module.exports = payloadValidator;
