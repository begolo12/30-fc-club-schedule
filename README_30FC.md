# 30 FC Club Manager

Aplikasi manajemen jadwal dan keuangan untuk klub futsal 30 FC.

## 🚀 Features

- ✅ Manajemen jadwal latihan dan sparing
- ✅ Sistem pembayaran (QRIS & Cash)
- ✅ Chat per jadwal
- ✅ Formasi tim (Team A vs Team B)
- ✅ Laporan keuangan
- ✅ **Push Notifications** (Chat, Payment, Schedule)
- ✅ PWA Support (Install di Android)
- ✅ Background Notifications

## 🔔 Push Notifications

Aplikasi ini mendukung push notifications untuk:
- 💬 **Chat Baru**: Notifikasi saat ada pesan baru
- 💰 **Pembayaran**: Admin dapat notif saat ada pembayaran
- 🎯 **Jadwal Baru**: Semua user dapat notif jadwal baru

### Quick Setup
1. Generate VAPID key dari Firebase Console
2. Set di `.env`: `VITE_VAPID_KEY="your_key"`
3. Deploy: `npm run deploy:functions`
4. Test di Android PWA

📖 **Dokumentasi Lengkap**: 
- [Quick Start](QUICK_START_NOTIFICATIONS.md)
- [Setup Guide](PUSH_NOTIFICATIONS_SETUP.md)
- [Setup Checklist](SETUP_CHECKLIST.md)
- [Summary](NOTIFICATIONS_SUMMARY.md)

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Deploy to Firebase
npm run deploy
```

## 📱 Install as PWA (Android)

1. Buka app di Chrome Android
2. Tap menu (⋮) → "Add to Home screen"
3. App akan terinstall seperti native app
4. Buka dari home screen
5. Notifikasi akan bekerja di background

## 🔧 Tech Stack

- React + TypeScript
- Vite
- Firebase (Auth, Firestore, Cloud Functions, FCM)
- Tailwind CSS
- PWA (vite-plugin-pwa)

## 📄 License

Private project for 30 FC Club

---

View your app in AI Studio: https://ai.studio/apps/653826d9-6d6d-48ae-b778-eeacac89781f
