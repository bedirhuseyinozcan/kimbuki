const BaseJoker = require('./BaseJoker');

class MindWiper extends BaseJoker {
    constructor() {
        super(4, "Hafıza Silici", "prismatic");
    }

    execute(room, user, payload, context) {
        const targetId = context.targetId;
        const initialTargetId = context.initialTargetId;

        if (!targetId || !payload.newWord || typeof payload.newWord !== 'string') {
            return false;
        }

        const cleanWord = payload.newWord.trim().substring(0, 30);
        if (!cleanWord) {
            room.io.to(user.id).emit("game:error", { message: "Geçerli bir kelime girmelisiniz!" });
            return false;
        }

        const target = room.users.find(u => u.id === targetId);
        if (!target) return false;

        // Ayna geri sekmesi kontrolü
        if (target.id === user.id && initialTargetId !== user.id) {
            room.pendingMirrorWordOwner = initialTargetId;
            room.pendingMirrorWordTarget = user.id;
            target.assignedWord = "AYNA SAHİBİ KELİME BEKLENİYOR"; 
            target.revealedLetters = [];
            
            const mirrorOwner = room.users.find(u => u.id === initialTargetId);
            room.addChatLog({ system: true, message: `🧠 Hafıza Silici geri tepti! ${target.name}'in kelimesi silindi! Ayna sahibi ${mirrorOwner ? mirrorOwner.name : ''} yeni kelimeyi belirliyor...`, timestamp: Date.now() });
            room.addChatLog({ system: true, privateTo: initialTargetId, message: `Sistem (Özel): Ayna ile Hafıza Siliciyi yansıttın! Lütfen 30 saniye içinde chat alanına "/kelime YENIKELIME" yazarak rakibinin yeni kelimesini belirle (Örn: /kelime Karpuz).`, timestamp: Date.now() });

            if (room.mirrorWordTimer) clearTimeout(room.mirrorWordTimer);
            room.mirrorWordTimer = setTimeout(() => {
                if (room.pendingMirrorWordOwner) {
                    const mirrorOwnerStillHere = room.users.find(u => u.id === room.pendingMirrorWordOwner && !u.disconnected);
                    const t = room.users.find(u => u.id === room.pendingMirrorWordTarget);
                    if (t) {
                        if (!mirrorOwnerStillHere) {
                            t.assignedWord = "BİLİNMEYEN";
                            room.addChatLog({ system: true, message: `⏳ Ayna sahibi oyundan koptuğu için ${t.name}'in kelimesi sıfırlandı!`, timestamp: Date.now() });
                        } else {
                            t.assignedWord = Math.random().toString(36).substring(2, 8).toUpperCase();
                            room.addChatLog({ system: true, message: `⏳ Ayna sahibi süresinde kelime belirlemedi! ${t.name}'in kelimesi rastgele harflere dönüştü!`, timestamp: Date.now() });
                        }
                        room.broadcastState();
                    }
                    room.pendingMirrorWordOwner = null;
                    room.pendingMirrorWordTarget = null;
                }
            }, 30000);
        } else {
            target.assignedWord = cleanWord; 
            room.addChatLog({ system: true, message: `🧠 Hafıza Silici kullanıldı! ${target.name}'in kelimesi acımasızca değiştirildi!`, timestamp: Date.now() });
            target.revealedLetters = [];
            room.io.to(room.code).emit("game:visual_effect", { type: 'mind_wipe', targetId: target.id });
        }

        return true;
    }
}

module.exports = MindWiper;
