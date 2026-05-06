# 🔔 Cara Setup Notifikasi Push - 30 FC

## Apa yang Sudah Dibuat?

✅ Notifikasi otomatis untuk:
1. **Chat baru** → Semua peserta dapat notif
2. **Pembayaran** → Admin dapat notif
3. **Jadwal baru** → Semua user dapat notif

✅ Notifikasi jalan di background (Android)
✅ App bisa diinstall seperti app biasa (PWA)

## Cara Setup (5 Menit)

### 1️⃣ Dapatkan VAPID Key

1. Buka: https://console.firebase.google.com/project/fc-1488f/settings/cloudmessaging
2. Login dengan akun Firebase
3. Cari bagian **"Web Push certificates"**
4. Klik tombol **"Generate key pair"**
5. Copy key yang muncul (contoh: `BPxxx...xxx`)

### 2️⃣ Simpan VAPID Key

Buat file baru bernama `.env` di folder project, isi dengan:
```
VITE_VAPID_KEY="PASTE_KEY_DARI_STEP_1_DISINI"
```

### 3️⃣ Install & Deploy Cloud Functions

Buka terminal, jalankan:
```bash
# Masuk ke folder functions
cd functions

# Install dependencies
npm install

# Kembali ke root
cd ..

# Login ke Firebase (akan buka browser)
firebase login

# Deploy functions
npm run deploy:functions
```

Tunggu sampai selesai (sekitar 2-3 menit).

### 4️⃣ Deploy Web App

```bash
# Build app
npm run build

# Deploy ke Firebase Hosting
npm run deploy:hosting
```

## ✅ Selesai!

App sudah siap dengan notifikasi push!

## 📱 Cara Test di Android

### Install PWA:
1. Buka app di **Chrome Android**: https://fc-1488f.web.app
2. Tap menu (3 titik) → **"Add to Home screen"**
3. Tap **"Add"**
4. Icon app akan muncul di home screen

### Test Notifikasi:
1. Buka app dari home screen
2. Login
3. Izinkan notifikasi (tap "Allow")
4. Dari HP lain, kirim chat atau bayar
5. **Notifikasi akan muncul** bahkan saat app ditutup!

## 🎯 Cara Kerja

```
User A kirim chat
    ↓
Cloud Function detect
    ↓
Kirim notif ke User B, C, D
    ↓
Notif muncul di HP mereka
```

## 🔧 Troubleshooting

**Notif tidak muncul?**
- Pastikan sudah izinkan notifikasi
- Cek Settings → Apps → 30 FC → Notifications → ON
- Coba clear cache dan login ulang

**Error saat deploy?**
- Pastikan billing enabled di Firebase Console
- Cek `firebase functions:log` untuk lihat error

**Service worker error?**
- Clear browser cache
- Uninstall PWA dan install ulang

## 📞 Butuh Bantuan?

Baca dokumentasi lengkap:
- `QUICK_START_NOTIFICATIONS.md` - Panduan cepat
- `PUSH_NOTIFICATIONS_SETUP.md` - Dokumentasi detail
- `SETUP_CHECKLIST.md` - Checklist lengkap

## 🎉 Fitur Notifikasi

### 💬 Chat
- Kirim chat → Semua peserta dapat notif
- Klik notif → Langsung buka chat

### 💰 Pembayaran
- User bayar → Admin dapat notif
- Klik notif → Langsung buka detail jadwal

### 🎯 Jadwal Baru
- Admin buat jadwal → Semua user dapat notif
- Klik notif → Langsung buka jadwal

---

**Status**: ✅ Siap digunakan
**Platform**: Android (Chrome), Desktop (Chrome/Edge/Firefox)
**Background**: ✅ Jalan di background
