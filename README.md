# Kimbuki 🎭 - Multiplayer 3D Parti ve Tahmin Oyunu

[![Live Preview](https://img.shields.io/badge/Oyna-Canl%C4%B1_Sunucu-success?style=for-the-badge&logo=vercel)](https://kimbuki.vercel.app/)

Kimbuki, arkadaşlarınızla oynayabileceğiniz, herkesin alnında bir kelime/isim yazdığı ve herkesin kendi kim olduğunu bulmaya çalıştığı klasik "Ben Kimim?" (Vampir Köylü / Post-it) oyununun modern, 3 boyutlu (3D) ve çok oyunculu versiyonudur!

**🌐 Canlı Oyna:** [https://kimbuki.vercel.app/](https://kimbuki.vercel.app/)

## ✨ Özellikler

- **🎭 3D Karakterler ve Çevre:** React Three Fiber destekli, tamamen 3 boyutlu oyun odaları ve karakterler.
- **🗣️ WebRTC Sesli Sohbet:** Oyuncular arası gecikmesiz, oyun içi entegre sesli sohbet.
- **💰 Ekonomi & EXP Sistemi:** Maç kazandıkça, bahis bildikçe ve katılım sağladıkça Altın ve XP kazanın. Lvl atlayın!
- **🎁 Günlük Ödüller:** 7 günlük giriş serisi (streak) sistemiyle her gün artan altın ödülleri.
- **🛒 Mağaza (Shop):** Kazandığınız altınlarla yeni 3D karakterler ve avatarlar satın alın.
- **🔮 Bahis ve Joker Sistemi:** Oyuna bahis yatırın, ipucu jokerlerini kullanarak kelimenizi daha kolay bulun.
- **⚖️ Şike/İtiraz Sistemi:** Adaletsizlik durumunda oyuncuların oylamasıyla itiraz edip turu iptal edin.

## 🎮 Oyun Mantığı

1. **Oda Kur & Katıl:** Bir kişi oda kurar ve kodu arkadaşlarına atar (veya direkt davet linki gönderir).
2. **Kelime Belirleme:** Her oyuncu, karşısındaki bir oyuncunun alnına yazılacak kelimeyi belirler.
3. **Oyun Sahnesi:** 3D masaya oturulur. Herkes diğerlerinin alnındaki kelimeyi görebilir, kendi kelimesini GÖREMEZ.
4. **Sırayla Soru Sorma:** Sırası gelen kişi mikrofonu açıp "Ben yaşıyor muyum?", "Futbolcu muyum?" gibi sorular sorar.
5. **Tahmin ve Bahis:** Kendi kelimesini bulan oyunu kazanır ve Kasa'dan (Pot) yüzdelik pay alır. İzleyiciler ise doğru kişiye bahis yaptıysa bahislerini ikiye katlar!

## 🛠️ Teknolojiler (Mimarî)

- **Frontend (`/client`):** Next.js (App Router), React Three Fiber (3D), Tailwind CSS, Material UI.
- **Backend (`/server`):** Node.js, Express.js, Socket.io (WebSocket Gerçek Zamanlı İletişim).
- **Veritabanı:** MongoDB (Mongoose) - Kullanıcılar, envanter, istatistikler ve günlük ödül takibi için.
- **Deployment:** Vercel (Frontend), Render (Backend), MongoDB Atlas (DB).

## 🚀 Kurulum (Local Development)

### 1. Veritabanı ve Backend (`/server`)
```bash
cd server
npm install
# .env dosyası oluşturup içine PORT ve MONGO_URI ekleyebilirsiniz.
npm run dev
```
*Sunucu `http://localhost:4000` adresinde çalışacaktır.*

### 2. Frontend (`/client`)
```bash
cd client
npm install
# .env.local oluşturup NEXT_PUBLIC_SERVER_URL=http://localhost:4000 ekleyin.
npm run dev
```
*Arayüz `http://localhost:3000` adresinde açılacaktır.*

## 📜 Lisans
Bu proje [MIT](LICENSE) lisansı altında sunulmaktadır.
