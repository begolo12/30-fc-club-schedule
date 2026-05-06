# Setup Push Notifications (FCM)

Aplikasi ini menggunakan Firebase Cloud Messaging (FCM) untuk mengirim notifikasi push ke perangkat Android dan web browser.

## Fitur Notifikasi

1. **Notifikasi Chat Baru**: Semua peserta jadwal akan menerima notifikasi saat ada pesan baru
2. **Notifikasi Pembayaran**: Admin akan menerima notifikasi saat ada pembayaran baru
3. **Notifikasi Jadwal Baru**: Semua user akan menerima notifikasi saat ada jadwal baru dibuat

## Setup Instructions

### 1. Generate VAPID Key

1. Buka Firebase Console: https://console.firebase.google.com
2. Pilih project: `fc-1488f`
3. Pergi ke **Project Settings** > **Cloud Messaging**
4. Di bagian **Web Push certificates**, klik **Generate key pair**
5. Copy VAPID key yang dihasilkan

### 2. Update VAPID Key

Edit file `src/lib/fcm.ts` dan ganti `YOUR_VAPID_KEY_HERE` dengan VAPID key yang baru:

```typescript
const VAPID_KEY = 'YOUR_ACTUAL_VAPID_KEY_HERE';
```

### 3. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 4. Login ke Firebase

```bash
firebase login
```

### 5. Install Dependencies untuk Cloud Functions

```bash
cd functions
npm install
cd ..
```

### 6. Deploy Cloud Functions

```bash
firebase deploy --only functions
```

Ini akan deploy 3 Cloud Functions:
- `onNewChatMessage`: Trigger saat ada chat baru
- `onPaymentStatusChange`: Trigger saat status pembayaran berubah
- `onNewSchedule`: Trigger saat jadwal baru dibuat

### 7. Build dan Deploy Web App

```bash
npm run build
firebase deploy --only hosting
```

## Testing di Android

### Untuk PWA (Progressive Web App):

1. Buka aplikasi di Chrome Android
2. Tap menu (3 titik) > **Add to Home screen**
3. Aplikasi akan terinstall sebagai PWA
4. Buka aplikasi dari home screen
5. Login dan izinkan notifikasi
6. Aplikasi akan berjalan di background dan menerima notifikasi

### Untuk Testing:

1. Login sebagai user A di device 1
2. Login sebagai user B di device 2
3. Kedua user join ke jadwal yang sama
4. User A kirim chat → User B akan dapat notifikasi
5. User B bayar → Admin akan dapat notifikasi

## Troubleshooting

### Notifikasi tidak muncul:

1. Pastikan permission notifikasi sudah granted
2. Check browser console untuk error
3. Pastikan service worker sudah registered: `navigator.serviceWorker.getRegistrations()`
4. Pastikan FCM token tersimpan di Firestore collection `fcmTokens`
5. Check Cloud Functions logs: `firebase functions:log`

### Service Worker error:

1. Clear browser cache dan reload
2. Unregister service worker lama:
   ```javascript
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(r => r.unregister())
   })
   ```
3. Reload aplikasi

### Cloud Functions tidak trigger:

1. Check Firebase Console > Functions untuk melihat status
2. Check logs: `firebase functions:log`
3. Pastikan Firestore rules mengizinkan write

## File Structure

```
├── public/
│   └── firebase-messaging-sw.js    # Service worker untuk background notifications
├── src/
│   ├── lib/
│   │   ├── fcm.ts                  # FCM utilities
│   │   ├── firebase.ts             # Firebase initialization
│   │   └── notifications.ts        # Browser notification utilities
│   └── contexts/
│       └── AuthContext.tsx         # FCM token management
├── functions/
│   └── src/
│       └── index.ts                # Cloud Functions
├── firebase.json                   # Firebase configuration
└── .firebaserc                     # Firebase project config
```

## Important Notes

- FCM hanya bekerja di HTTPS atau localhost
- Service worker harus di root path (`/firebase-messaging-sw.js`)
- Android Chrome mendukung background notifications
- iOS Safari tidak mendukung FCM (gunakan native app)
- Notifikasi akan muncul bahkan saat app di background/closed

## Security

- FCM tokens disimpan di Firestore collection `fcmTokens`
- Hanya admin yang bisa melihat semua tokens
- Token otomatis di-refresh saat expired
- Token dihapus saat user logout

## Monitoring

Check Firebase Console untuk:
- Cloud Functions execution logs
- FCM delivery reports
- Error tracking
- Performance monitoring
