# Kimbuki 🎭 - Multiplayer 3D Parti ve Tahmin Oyunu

[![Live Preview](https://img.shields.io/badge/Oyna-Canl%C4%B1_Sunucu-success?style=for-the-badge&logo=vercel)](https://kimbuki.vercel.app/)
[![License: Copyright](https://img.shields.io/badge/License-Copyright-red.svg)](LICENSE)

Kimbuki, arkadaşlarınızla oynayabileceğiniz, herkesin alnında bir kelime/isim yazdığı ve herkesin kim olduğunu bulmaya çalıştığı klasik "Ben Kimim?" (Vampir Köylü / Post-it) oyununun modern, 3 boyutlu (3D) ve çok oyunculu (multiplayer) versiyonudur!

**🚀 Canlı Oyna:** [https://kimbuki.vercel.app/](https://kimbuki.vercel.app/)

---

## ✨ Özellikler

- **🎨 3D Karakterler ve Çevre:** React Three Fiber destekli, tamamen 3 boyutlu oyun odaları, haritalar (Çöl, Kar, Uçan Ada) ve animasyonlu avatarlar. Baş hareketleri (Head Tracking) eşzamanlı olarak diğer oyunculara yansır!
- **🎙️ WebRTC Sesli Sohbet:** LiveKit altyapısı ile oyuncular arası gecikmesiz, oyun içi entegre sesli sohbet deneyimi.
- **📈 Ekonomi & İtibar Sistemi:** Maç kazandıkça, bahis bildikçe ve görevleri tamamladıkça Altın ve İtibar (Reputation) kazanın. Çaylaklıktan Efsanevi seviyelere yükselin!
- **🎁 Günlük Ödüller ve Görevler:** 7 günlük giriş serisi (streak) sistemi ve oyun içi hedefleri barındıran dinamik görev sistemi.
- **🛒 Mağaza (Shop):** Kazandığınız altınlarla yeni 3D karakterler (Rogue, Wizard, Cleric vs.), kaideler (pedestals), isim renkleri ve unvanlar satın alın.
- **🃏 Bahis ve Joker Sistemi:** Oyuna altın bahisleri yatırın. "Rus Ruleti", "Saatli Bomba", "Gizli Kalkan" gibi birbirinden eğlenceli ve stratejik jokerlerle oyunu şekillendirin.
- **⚖️ Şike/İtiraz Sistemi:** Adaletsizlik veya trolleme durumunda oyuncuların oylamasıyla itiraz edip turu iptal edin.
- **🎭 Taunt (Kışkırtma) Efektleri:** 3D masada arkadaşlarınıza emojili ve ses efektli anlık reaksiyonlar gönderin.

---

## 🛠️ Prodüksiyona Hazır Mimari (V2 Güncellemeleri)

Kimbuki, binlerce eşzamanlı oyuncuyu kaldırabilmesi için **prodüksiyon (canlı ortam) standartlarında** optimize edilmiştir:
- **Güvenlik (Socket Auth):** Tüm WebSocket (Socket.io) iletişimi JWT (JSON Web Token) middleware'i ile şifrelenmiş ve doğrulanmıştır. Sahte veri gönderimi engellenmiştir.
- **Atomik Veritabanı İşlemleri (Anti-Race Condition):** Bahis sistemi ve altın kazanımları MongoDB'nin atomic operatörleri (`$inc`, `findOneAndUpdate`) ile korunarak veri ezilmeleri ve negatif bakiye hataları (TOCTOU) engellenmiştir.
- **Bellek Optimizasyonu (Audio Pool):** Oyun içi ses efektleri için global `AudioContext` havuzu oluşturularak tarayıcı bazlı bellek sızıntıları (memory leak) ve ses kesilmeleri tamamen çözülmüştür.
- **3D Render Performansı:** Tüm GLTF/GLB modelleri oyun başlangıcında `useGLTF.preload` ile önbelleğe (cache) alınarak sahne içi anlık takılmalar (stuttering) ve FPS düşüşleri giderilmiştir.
- **Kesintisiz Yönlendirme:** Next.js App Router yapısı eksiksiz kurgulanarak yetkisiz veya eksik route erişimlerinde 404 yerine akıllı yönlendirmeler sağlanmıştır.

---

## 🎮 Oyun Mantığı

1. **Oda Kur & Katıl:** Bir kişi oda kurar ve kodu arkadaşlarına atar (veya direkt davet linki gönderir).
2. **Kelime Belirleme:** Her oyuncu, karşısındaki bir oyuncunun alnına yazılacak kelimeyi belirler.
3. **Oyun Sahnesi:** 3D masaya oturulur. Herkes diğerlerinin alnındaki kelimeyi görebilir, kendi kelimesini GÖREMEZ.
4. **Sırayla Soru Sorma:** Sırası gelen kişi mikrofonu açıp "Ben yaşıyor muyum?", "Futbolcu muyum?" gibi sorular sorar.
5. **Tahmin ve Bahis:** Kendi kelimesini bulan oyunu kazanır ve Kasa'dan (Pot) yüzdelik pay alır. İzleyiciler ise doğru kişiye bahis yaptıysa bahislerini katlar!

---

## 💻 Teknolojiler (Tech Stack)

- **Frontend (`/client`):** Next.js (React), React Three Fiber (Drei & Three.js), Tailwind CSS, Material UI (MUI), Framer Motion.
- **Backend (`/server`):** Node.js, Express.js, Socket.io (WebSocket).
- **Ses İletişimi:** LiveKit (WebRTC).
- **Veritabanı:** MongoDB (Mongoose) - Atomic sorgularla güvenli ekonomi yönetimi.
- **Dağıtım (Deployment):** Vercel (Frontend), Render/Railway (Backend), MongoDB Atlas (DB).

---

## ⚙️ Kurulum (Local Development)

Projeyi bilgisayarınızda çalıştırmak için aşağıdaki adımları izleyin:

### 1. Veritabanı ve Backend (`/server`)
\`\`\`bash
cd server
npm install
\`\`\`
`.env` dosyası oluşturup içine aşağıdaki değişkenleri ekleyin:
\`\`\`env
PORT=4000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=gizli_anahtariniz
\`\`\`
Daha sonra sunucuyu başlatın:
\`\`\`bash
npm run dev
\`\`\`
*Sunucu `http://localhost:4000` adresinde çalışacaktır.*

### 2. Frontend (`/client`)
\`\`\`bash
cd client
npm install
\`\`\`
`.env.local` dosyası oluşturup aşağıdaki değişkenleri ekleyin:
\`\`\`env
NEXT_PUBLIC_SERVER_URL=http://localhost:4000
NEXT_PUBLIC_LIVEKIT_URL=your_livekit_wss_url
\`\`\`
Daha sonra arayüzü başlatın:
\`\`\`bash
npm run dev
\`\`\`
*Oyun arayüzü `http://localhost:3000` adresinde açılacaktır.*

---

## 📜 Lisans
**Tüm Hakları Saklıdır (All Rights Reserved).**

Bu projenin kaynak kodları, tasarımı ve varlıkları ticari ve tescilli bir üründür. Açık kaynak kodlu (Open Source) **değildir**.
Kodun kopyalanması, başka projelerde kullanılması, satılması veya izinsiz olarak klonlanıp geliştirilmesi **kesinlikle yasaktır**. Detaylar için [LICENSE](LICENSE) dosyasına bakabilirsiniz.
