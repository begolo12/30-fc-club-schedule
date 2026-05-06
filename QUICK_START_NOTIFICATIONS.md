# Quick Start - Push Notifications

## 🎯 Fitur yang Sudah Ditambahkan

1. ✅ **Notifikasi Chat**: Otomatis kirim notif ke semua peserta saat ada chat baru
2. ✅ **Notifikasi Pembayaran**: Admin dapat notif saat ada yang bayar
3. ✅ **Notifikasi Jadwal Baru**: Semua user dapat notif saat ada jadwal baru
4. ✅ **Background Notifications**: Notif tetap muncul meski app ditutup (Android)

## 🚀 Cara Setup (5 Menit)

### 1. Generate VAPID Key

```bash
# Buka Firebase Console
https://console.firebase.google.com/project/fc-1488f/settings/cloudmessaging

# Klik "Generate key pair" di bagian Web Push certificates
# Copy key yang muncul
```

### 2. Update VAPID Key

Edit file `src/lib/fcm.ts` baris 10:
```typescript
const VAPID_KEY = 'PASTE_YOUR_KEY_HERE';
```

### 3. Deploy Cloud Functions

```bash
# Install dependencies
cd functions
npm install
cd ..

# Deploy
firebase login
firebase deploy --only functions
```

### 4. Test di Android

1. Build app: `npm run build`
2. Deploy: `firebase deploy --only hosting`
3. Buka di Chrome Android
4. Add to Home Screen
5. Login dan izinkan notifikasi
6. Test kirim chat atau bayar → notif akan muncul!

## 📱 Cara Kerja di Android

- App berjalan sebagai PWA (Progressive Web App)
- Service worker handle notifikasi di background
- Notif muncul bahkan saat app ditutup
- Klik notif akan buka app langsung ke halaman terkait

## 🔧 Troubleshooting

**Notif tidak muncul?**
- Check permission: Settings > Site Settings > Notifications
- Clear cache dan reload
- Check console untuk error

**Cloud Functions error?**
- Check logs: `firebase functions:log`
- Pastikan billing enabled di Firebase Console

## 📁 File yang Ditambahkan

```
public/firebase-messaging-sw.js     → Service worker
src/lib/fcm.ts                      → FCM utilities
functions/src/index.ts              → Cloud Functions
PUSH_NOTIFICATIONS_SETUP.md         → Dokumentasi lengkap
```

## ⚡ Testing Cepat

```bash
# Terminal 1: Run dev server
npm run dev

# Terminal 2: Test functions locally (optional)
cd functions
npm run serve
```

Buka 2 browser/device berbeda, login sebagai user berbeda, join jadwal yang sama, kirim chat → notif akan muncul!
