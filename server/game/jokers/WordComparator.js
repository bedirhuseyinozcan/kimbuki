const BaseJoker = require('./BaseJoker');

class WordComparator extends BaseJoker {
    constructor() {
        super(10, "Boyut Ölçer", "common");
    }

    execute(room, user, payload, context) {
        const targetId = context.targetId;
        if (targetId && typeof targetId === 'string') {
            const target = room.users.find(u => u.id === targetId);
            if (target && user.assignedWord && target.assignedWord) {
                const mLen = user.assignedWord.replace(/\s/g, '').length;
                const tLen = target.assignedWord.replace(/\s/g, '').length;
                const cmp = mLen > tLen ? "DAHA UZUN" : mLen < tLen ? "DAHA KISA" : "AYNI UZUNLUKTA";
                room.addChatLog({ system: true, privateTo: user.id, message: `Sistem (Özel): Senin kelimen ${target.name}'in kelimesinden ${cmp}.`, timestamp: Date.now() });
                return true;
            }
        }
        return false;
    }
}

module.exports = WordComparator;
