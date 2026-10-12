const BaseJoker = require('./BaseJoker');

class LetterDetective extends BaseJoker {
    constructor() {
        super(14, "Harf Dedektifi", "common");
    }

    execute(room, user, payload, context) {
        if (!payload.newWord || typeof payload.newWord !== 'string') {
            room.io.to(user.id).emit("game:error", { message: "Lütfen aramak istediğiniz harfi girin!" });
            return false;
        }
        
        const letter = payload.newWord.trim().toLocaleUpperCase("tr-TR").charAt(0);
        if (!/[A-ZÇĞİÖŞÜ0-9]/.test(letter)) {
             room.io.to(user.id).emit("game:error", { message: "Lütfen geçerli bir harf girin!" });
             return false;
        }

        if (user.lastDetectiveRound && (room.roundCount - user.lastDetectiveRound < 2)) {
             room.io.to(user.id).emit("game:error", { message: "Bu jokeri tekrar kullanmak için 1 tur beklemelisin!" });
             return false;
        }

        const myWord = (user.assignedWord || "").toLocaleUpperCase("tr-TR");
        const count = myWord.split('').filter(c => c === letter).length;

        room.addChatLog({ system: true, message: `🕵️‍♂️ ${user.name} Harf Dedektifi'ni kullandı! Kelimesinde bir harf arıyor...`, timestamp: Date.now() });

        if (count > 0) {
             room.addChatLog({ system: true, privateTo: user.id, message: `Sistem (Özel): Harika! Kelimende '${letter}' harfi BULUNUYOR! (${count} adet)`, timestamp: Date.now() });
             if (!user.revealedLetters) user.revealedLetters = [];
             if (!user.revealedLetters.includes(letter)) {
                 user.revealedLetters.push(letter);
             }
        } else {
             room.addChatLog({ system: true, privateTo: user.id, message: `Sistem (Özel): Maalesef, kelimende '${letter}' harfi YOK!`, timestamp: Date.now() });
        }

        user.lastDetectiveRound = room.roundCount;
        user.detectiveUses = (user.detectiveUses || 0) + 1;

        room.io.to(room.code).emit("game:visual_effect", { type: 'letter_reveal', targetId: user.id });

        if (user.detectiveUses >= 3) {
             room.addChatLog({ system: true, privateTo: user.id, message: `Sistem (Özel): Harf Dedektifi'nin görev süresi doldu (3/3).`, timestamp: Date.now() });
        } else {
             room.addChatLog({ system: true, privateTo: user.id, message: `Sistem (Özel): Harf Dedektifi için kalan kullanım hakkın: ${3 - user.detectiveUses}`, timestamp: Date.now() });
        }

        return true;
    }
}

module.exports = LetterDetective;
