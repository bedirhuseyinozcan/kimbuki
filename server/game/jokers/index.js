const RewardService = require('../services/RewardService');

const TimeBender = require('./TimeBender');
const LetterOpener = require('./LetterOpener');
const DoubleMagazine = require('./DoubleMagazine');
const Silencer = require('./Silencer');
const MindWiper = require('./MindWiper');
const BloodTie = require('./BloodTie');
const RussianRoulette = require('./RussianRoulette');
const TimeBomb = require('./TimeBomb');
const MirrorShield = require('./MirrorShield');
const SecretShield = require('./SecretShield');
const WordComparator = require('./WordComparator');
const MysteryBox = require('./MysteryBox');
const LifeSwap = require('./LifeSwap');
const LetterDetective = require('./LetterDetective');
const Amnesia = require('./Amnesia');
const Telepathy = require('./Telepathy');

class JokerManager {
    constructor() {
        this.strategies = new Map();
        this.registerStrategies();
    }

    registerStrategies() {
        this.strategies.set(0, new TimeBender());
        this.strategies.set(1, new LetterOpener());
        this.strategies.set(2, new DoubleMagazine());
        this.strategies.set(3, new Silencer());
        this.strategies.set(4, new MindWiper());
        this.strategies.set(5, new BloodTie());
        this.strategies.set(6, new RussianRoulette());
        this.strategies.set(7, new TimeBomb());
        this.strategies.set(8, new MirrorShield());
        this.strategies.set(9, new SecretShield());
        this.strategies.set(10, new WordComparator());
        this.strategies.set(11, new MysteryBox(11, "Gümüş Sürpriz Kutu", "silver", [2, 3, 8, 12, 15]));
        this.strategies.set(12, new MysteryBox(12, "Altın Sürpriz Kutu", "gold", [4, 5, 6, 7, 13]));
        this.strategies.set(13, new LifeSwap());
        this.strategies.set(14, new LetterDetective());
        this.strategies.set(15, new Amnesia());
        this.strategies.set(16, new Telepathy());
    }

    /**
     * Executes a joker action for a user in a room.
     * @param {object} room - Room instance
     * @param {string} userId - User socket ID
     * @param {object} payload - Action parameters (targetId, newWord, etc.)
     */
    executeJoker(room, userId, payload) {
        if (room.gameState !== "PLAYING" || !payload || typeof payload !== 'object') return false;

        if (room.roundCount < 3) {
            room.io.to(userId).emit("game:error", { message: "Jokerler 3. turdan itibaren kullanılabilir!" });
            return false;
        }

        const user = room.users.find(u => u.id === userId);
        if (!user || user.status !== 'playing' || user.hasUsedJoker || user.joker === null) return false;

        if (room.users[room.currentTurnIndex]?.id !== userId) {
            room.io.to(userId).emit("game:error", { message: "Jokerini sadece kendi sıranda kullanabilirsin!" });
            return false;
        }

        const jokerType = user.joker;
        const strategy = this.strategies.get(jokerType);
        if (!strategy) {
            room.io.to(userId).emit("game:error", { message: "Bilinmeyen joker türü!" });
            return false;
        }

        let targetId = payload.targetId;
        const initialTargetId = targetId;

        const forbiddenSelfTargets = [3, 4, 5, 7, 10, 13, 15, 16];
        if (targetId === user.id && forbiddenSelfTargets.includes(jokerType)) {
            room.io.to(userId).emit("game:error", { message: "Bu jokeri kendi üzerinde kullanamazsın!" });
            return false;
        }

        if (jokerType === 7 && targetId && typeof targetId === 'string') {
            const targetForBomb = room.users.find(u => u.id === targetId);
            if (targetForBomb && targetForBomb.timeBomb) {
                room.io.to(userId).emit("game:error", { message: "Bu oyuncunun üzerinde zaten aktif bir bomba var!" });
                return false;
            }
        }

        const reflectableJokers = [3, 4, 5, 7, 13, 15];
        if (targetId && reflectableJokers.includes(jokerType)) {
            const targetUser = room.users.find(u => u.id === targetId);
            if (targetUser && targetUser.mirrorRoundsLeft > 0 && targetUser.id !== user.id) {
                room.addChatLog({
                    system: true,
                    message: `🛡️ YANSIMA! Kötü niyetli joker, gizli Ayna Kalkanı'na çarpıp ${user.name}'e geri sekti!`,
                    timestamp: Date.now()
                });
                targetId = user.id;
            }
        }

        const context = { initialTargetId, targetId };
        const jokerConsumed = strategy.execute(room, user, payload, context);

        if (jokerConsumed) {
            if (jokerType !== 11 && jokerType !== 12 && jokerType !== 14) {
                user.hasUsedJoker = true;
            } else if (jokerType === 14 && user.detectiveUses >= 3) {
                user.hasUsedJoker = true;
            }

            if (user.dbId) {
                RewardService.progressQuest(user.dbId, 'use_joker');
            }
        } else if (jokerType !== 14 || (user.detectiveUses === undefined || user.detectiveUses === 0)) {
            room.io.to(userId).emit("game:error", { message: "Joker geçersiz bir hedefe uygulanamadı. Jokerin iade edildi!" });
        }

        room.broadcastState();
        return jokerConsumed;
    }
}

module.exports = new JokerManager();
