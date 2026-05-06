# 🧪 Cara Test Notifikasi Chat - Quick Guide

## Masalah Sebelumnya
Notifikasi chat tidak muncul karena Cloud Functions belum di-deploy dan FCM belum di-setup.

## Solusi Baru ✅
Saya sudah implementasi **realtime notifications** yang langsung jalan tanpa perlu setup tambahan!

## Cara Test (5 Menit)

### Step 1: Jalankan App
```bash
cd /home/irvan/Dokumen/30-fc-club-schedule
npm run dev
```

App akan jalan di: **http://localhost:3002**

### Step 2: Buka 2 Browser/Tab

**Tab 1 (User A):**
1. Buka http://localhost:3002
2. Login dengan akun pertama
3. Izinkan notifikasi saat diminta (klik "Allow")

**Tab 2 (User B):**
1. Buka http://localhost:3002 di incognito/browser lain
2. Login dengan akun kedua
3. Izinkan notifikasi saat diminta (klik "Allow")

### Step 3: Test Chat Notification

1. **Kedua user join ke jadwal yang sama**:
   - User A: Buka jadwal → Klik "Ikut Main"
   - User B: Buka jadwal yang sama → Klik "Ikut Main"

2. **User A kirim chat**:
   - Scroll ke bawah ke bagian chat
   - Ketik pesan: "Halo test"
   - Klik Send

3. **User B akan dapat notifikasi** 💬:
   - Notifikasi muncul di browser
   - Bunyi notifikasi (jika enabled)
   - Isi: "💬 [Nama User A]: Halo test"

### Step 4: Test Payment Notification

1. **Login sebagai admin di Tab 1**:
   - Logout dari User A
   - Login dengan admin (admin@30fc.club / admin123)
   - Izinkan notifikasi

2. **User B bayar**:
   - Buka detail jadwal
   - Klik tombol bayar (QRIS atau Cash)

3. **Admin akan dapat notifikasi** 💰:
   - Notifikasi muncul di Tab 1
   - Isi: "💰 Pembayaran Baru! [Nama User B] membayar via [Metode]"

### Step 5: Test Schedule Notification

1. **Buka dashboard di kedua tab**

2. **Admin buat jadwal baru**:
   - Klik tombol "+" atau "Buat Jadwal"
   - Isi form jadwal
   - Klik "Simpan"

3. **Semua user akan dapat notifikasi** 🎯:
   - Notifikasi muncul di semua tab yang login
   - Isi: "🎯 Jadwal Baru! [Nama Jadwal] - [Tanggal] di [Lokasi]"

## Troubleshooting

### ❌ Notifikasi tidak muncul?

**1. Check permission:**
```javascript
// Buka Console (F12), ketik:
console.log(Notification.permission)
// Harus: "granted"
```

**2. Izinkan notifikasi manual:**
- Chrome: Klik icon 🔒 di address bar → Notifications → Allow
- Firefox: Klik icon 🔒 → Permissions → Notifications → Allow

**3. Test manual:**
```javascript
// Di Console, ketik:
new Notification('Test', { body: 'Hello!' })
// Harus muncul notifikasi
```

**4. Check browser console untuk error:**
- Buka DevTools (F12)
- Tab Console
- Lihat ada error merah?

### ❌ Notifikasi muncul untuk chat sendiri?

Ini bug. Seharusnya tidak muncul. Reload page dan coba lagi.

### ❌ Notifikasi tidak ada suara?

Check system settings:
- Windows: Settings → System → Notifications
- Mac: System Preferences → Notifications
- Android: Settings → Apps → Chrome → Notifications

## Expected Behavior

### ✅ Chat:
- User A kirim chat → User B, C, D dapat notif
- User A **tidak** dapat notif untuk chat sendiri
- Notif muncul bahkan saat tab tidak aktif

### ✅ Payment:
- User bayar → **Hanya admin** dapat notif
- User biasa tidak dapat notif payment
- Notif muncul real-time

### ✅ Schedule:
- Admin buat jadwal → **Semua user** dapat notif
- Notif muncul di semua tab yang login
- Notif muncul bahkan saat di halaman lain

## Demo Video (Optional)

Jika mau record demo:
1. Buka 2 browser side-by-side
2. Login di kedua browser
3. Kirim chat dari browser 1
4. Record saat notif muncul di browser 2

## Next Steps

Setelah test berhasil:
1. ✅ Deploy ke production: `npm run build && firebase deploy`
2. ✅ Test di Android PWA
3. ✅ Share ke team untuk testing

## Notes

- Notifikasi ini **client-side**, jadi tab harus terbuka
- Untuk notifikasi saat app ditutup, perlu upgrade ke FCM (optional)
- Solusi ini **gratis** dan tidak perlu Cloud Functions
- Bekerja di semua browser modern

---

**Status**: ✅ Ready to test
**Setup Time**: 0 minutes (sudah jalan!)
**Requirements**: 2 browser/tab, 2 akun user
