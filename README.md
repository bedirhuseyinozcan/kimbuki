# Notekim — Multiplayer Eğlenceli Tahmin Oyunu

Arkadaşlarınızla oynayabileceğiniz, herkesin kafasında bir kelime/isim yazdığı ve kim olduğunu bulmaya çalıştığı klasik "Ben Kimim?" (Post-it) oyununun modern, dijital ve çok oyunculu (multiplayer) versiyonudur.

## Oyun Mantığı

1. **Oda Kur & Katıl:** Bir kişi oda kurar ve davet bağlantısını arkadaşlarına atar.
2. **Kelime Belirleme:** Oyun başlayınca sistem herkesi birbiriyle eşleştirir. Her oyuncu, eşleştiği kişinin alnında yazacak olan kelimeyi (örn. bir futbolcu, ünlü, obje) yazar.
3. **Oyun Sahnesi:** Herkes diğerlerinin alnındaki kelimeyi görebilir, ancak kendi kelimesini göremez.
4. **Sırayla Soru Sorma:** Sırası gelen kişi 30 saniye içinde genel sorular sorar (örn: "Ben yaşıyor muyum?", "Futbolcu muyum?").
5. **Tahmin Etme:** Kelimesini bulduğunu düşünen kişi **Tahmin Et** butonunu kullanır. Doğru bilirse oyunu kazanır ve izleyici moduna geçer, oyun diğerleri için devam eder.

## Teknolojiler (Hibrit Yapı)

- **Frontend (client/):** Next.js (App Router), React, Tailwind CSS (Düzen ve genel stil), Material UI (MUI - Komponentler ve Dialoglar), Socket.io-client.
- **Backend (server/):** Node.js, Express, Socket.io.

## Kurulum ve Çalıştırma

### Sunucu (Server)

```bash
cd server
npm install
npm run dev
```

Sunucu `http://localhost:4000` adresinde çalışacaktır.

### İstemci (Client)

```bash
cd client
npm install
npm run dev
```

Uygulama `http://localhost:3000` adresinde açılacaktır.

## Lisans

MIT
