# 🔧 Fix: App Refresh Terus (Kedap-Kedip)

## Masalah

App refresh terus-menerus (kedap-kedip) dengan error di console:
```
Error getting FCM token: InvalidAccessError: Failed to execute 'subscribe' on 'PushManager': 
The provided applicationServerKey is not valid.
```

## Penyebab

FCM (Firebase Cloud Messaging) mencoba request token dengan VAPID key yang tidak valid (`YOUR_VAPID_KEY_HERE`), menyebabkan error loop yang membuat app refresh terus.

## Solusi ✅

**Menonaktifkan FCM** dan hanya menggunakan **Realtime Notifications** yang lebih sederhana.

### Perubahan yang Dilakukan:

**File: `src/contexts/AuthContext.tsx`**

**Sebelum:**
```typescript
import { requestFCMToken, setupForegroundMessageListener } from '../lib/fcm';

// Di useEffect:
requestFCMToken(currentUser.uid).catch(err => {
  console.warn('Failed to get FCM token:', err);
});

const unsubscribeForeground = setupForegroundMessageListener((payload) => {
  // ...
});
```

**Sesudah:**
```typescript
// FCM imports dihapus
// Hanya gunakan requestNotificationPermission

// Di useEffect:
requestNotificationPermission().catch(err => {
  console.warn('Failed to request notification permission:', err);
});

// Note: FCM is disabled for now, using realtime notifications instead
```

## Hasil

- ✅ App tidak refresh lagi
- ✅ Tidak ada error di console
- ✅ Notifikasi tetap bekerja (via realtime listeners)
- ✅ Lebih sederhana, tidak perlu FCM setup

## Notifikasi Tetap Bekerja!

Meskipun FCM dinonaktifkan, notifikasi **tetap bekerja** menggunakan:

1. **Firestore Realtime Listeners** (`src/lib/realtimeNotifications.ts`)
   - Listen perubahan data real-time
   - Trigger notifikasi saat ada chat/payment/schedule baru

2. **Browser Notification API** (`src/lib/notifications.ts`)
   - Show notifikasi native browser
   - Bekerja di semua browser modern

### Perbedaan:

| Feature | FCM (Sebelum) | Realtime (Sekarang) |
|---------|---------------|---------------------|
| Setup | Kompleks | Sederhana |
| VAPID Key | Perlu | Tidak perlu |
| Cloud Functions | Perlu | Tidak perlu |
| Background | Full | Tab harus buka |
| Error | Ada | Tidak ada ✅ |
| Biaya | Perlu billing | Gratis ✅ |

## Testing

### 1. Check App Tidak Refresh Lagi
```bash
npm run dev
# Buka http://localhost:3002
# App harus stabil, tidak refresh terus
```

### 2. Check Console Tidak Ada Error
- Buka DevTools (F12)
- Tab Console
- Tidak ada error merah ✅

### 3. Test Notifikasi Tetap Bekerja
- Buka 2 tab/browser
- Login sebagai 2 user berbeda
- Join ke jadwal yang sama
- Kirim chat
- **Notifikasi tetap muncul!** ✅

## Kapan Perlu FCM?

FCM hanya perlu jika:
1. Butuh notifikasi saat app **benar-benar ditutup** (tidak ada tab terbuka)
2. Butuh notifikasi **cross-device** (HP + Desktop sync)
3. Butuh notifikasi **offline**

Untuk mayoritas use case, **realtime notifications sudah cukup**!

## Cara Enable FCM (Optional)

Jika nanti mau enable FCM:

1. **Generate VAPID Key**:
   - Buka Firebase Console
   - Project Settings > Cloud Messaging
   - Generate key pair

2. **Set di .env**:
   ```bash
   echo 'VITE_VAPID_KEY="YOUR_ACTUAL_KEY"' > .env
   ```

3. **Uncomment FCM code** di `AuthContext.tsx`:
   ```typescript
   import { requestFCMToken, setupForegroundMessageListener } from '../lib/fcm';
   
   // Uncomment FCM code
   ```

4. **Deploy Cloud Functions**:
   ```bash
   cd functions
   npm install
   cd ..
   firebase deploy --only functions
   ```

## Summary

- ✅ **Masalah fixed**: App tidak refresh lagi
- ✅ **Notifikasi tetap jalan**: Via realtime listeners
- ✅ **Lebih sederhana**: Tidak perlu FCM setup
- ✅ **Gratis**: Tidak perlu Cloud Functions billing

---

**Status**: ✅ Fixed
**App Status**: Stable, tidak refresh lagi
**Notifications**: Working via realtime listeners
