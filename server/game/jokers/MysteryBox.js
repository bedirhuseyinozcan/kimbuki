const BaseJoker = require('./BaseJoker');

class MysteryBox extends BaseJoker {
    constructor(id, name, rarity, targetPool) {
        super(id, name, rarity);
        this.targetPool = targetPool;
    }

    execute(room, user, payload, context) {
        const chosenJoker = this.targetPool[Math.floor(Math.random() * this.targetPool.length)];
        user.joker = chosenJoker;
        const rarityText = this.id === 11 ? "ALTIN" : "PRİZMATİK";
        room.addChatLog({
            system: true,
            privateTo: user.id,
            message: `Sistem (Özel): ${this.name}'yu açtın ve içinden ${rarityText} joker çıktı!`,
            timestamp: Date.now()
        });
        user.hasUsedJoker = false;
        return true;
    }
}

module.exports = MysteryBox;
