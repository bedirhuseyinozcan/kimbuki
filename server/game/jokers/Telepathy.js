const BaseJoker = require('./BaseJoker');

class Telepathy extends BaseJoker {
    constructor() {
        super(16, "Telepati", "common");
    }

    execute(room, user, payload, context) {
        const targetId = context.targetId;
        if (targetId && typeof targetId === 'string') {
            const target = room.users.find(u => u.id === targetId);
            if (target && target.status === 'playing' && user.assignedWord && target.assignedWord) {
                const myLetters = [...new Set(user.assignedWord.toLocaleUpperCase("tr-TR").replace(/[^A-ZÇĞİÖŞÜ0-9]/g, "").split(''))];
                const targetLetters = [...new Set(target.assignedWord.toLocaleUpperCase("tr-TR").replace(/[^A-ZÇĞİÖŞÜ0-9]/g, "").split(''))];
                
                const commonLetters = myLetters.filter(l => targetLetters.includes(l));

                room.io.to(room.code).emit("game:visual_effect", { type: 'letter_reveal', targetId: user.id });
                room.io.to(room.code).emit("game:visual_effect", { type: 'letter_reveal', targetId: target.id });
                room.addChatLog({ system: true, message: `🤝 TELEPATİ! ${user.name} ve ${target.name} zihinlerini birleştirdi!`, timestamp: Date.now() });

                if (commonLetters.length > 0) {
                    const commonStr = commonLetters.join(", ");
                    room.addChatLog({ system: true, privateTo: user.id, message: `Sistem (Özel): ${target.name} ile kelimelerinizdeki ORTAK HARFLER şunlar: ${commonStr}`, timestamp: Date.now() });
                    room.addChatLog({ system: true, privateTo: target.id, message: `Sistem (Özel): ${user.name} ile kelimelerinizdeki ORTAK HARFLER şunlar: ${commonStr}`, timestamp: Date.now() });
                    
                    commonLetters.forEach(char => {
                        if (!user.revealedLetters) user.revealedLetters = [];
                        if (!target.revealedLetters) target.revealedLetters = [];
                        if (!user.revealedLetters.includes(char)) user.revealedLetters.push(char);
                        if (!target.revealedLetters.includes(char)) target.revealedLetters.push(char);
                    });
                } else {
                    room.addChatLog({ system: true, privateTo: user.id, message: `Sistem (Özel): ${target.name} ile hiçbir ortak harfiniz YOK!`, timestamp: Date.now() });
                    room.addChatLog({ system: true, privateTo: target.id, message: `Sistem (Özel): ${user.name} ile hiçbir ortak harfiniz YOK!`, timestamp: Date.now() });
                }

                return true;
            }
        }
        return false;
    }
}

module.exports = Telepathy;
