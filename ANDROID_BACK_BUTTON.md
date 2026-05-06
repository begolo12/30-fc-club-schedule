# 🔙 Android Back Button Behavior

## Masalah Sebelumnya

Tombol back di Android langsung keluar dari aplikasi tanpa navigasi yang proper.

## Solusi yang Diimplementasikan

### Behavior Baru:

1. **Di halaman dalam (bukan root)**:
   - Tombol back → Navigasi ke halaman sebelumnya (normal)
   - Contoh: Detail Jadwal → Dashboard

2. **Di halaman root (Dashboard atau Login)**:
   - Tombol back pertama → Muncul toast "Tekan sekali lagi untuk keluar"
   - Tombol back kedua (dalam 2 detik) → Keluar dari aplikasi
   - Jika tidak tekan lagi dalam 2 detik → Reset, harus tekan 2x lagi

## Implementasi

### File yang Dimodifikasi:

1. **`src/App.tsx`**
   - Menambahkan `AndroidBackButtonHandler` component
   - Handle back button behavior
   - Show toast notification

2. **`src/index.css`**
   - Menambahkan animasi `slideUp` dan `slideDown` untuk toast

3. **`src/hooks/useAndroidBackButton.ts`** (optional, tidak dipakai)
   - Custom hook untuk back button (backup implementation)

## Cara Kerja

```
User tekan back button
    ↓
Cek: Apakah di halaman root?
    ↓
┌─────────────────┬─────────────────┐
│   Bukan Root    │    Root Path    │
│   (Detail, dll) │  (Dashboard)    │
└─────────────────┴─────────────────┘
        │                   │
        ▼                   ▼
  Navigate back      Cek: Sudah tekan?
   (normal)               │
                    ┌─────┴─────┐
                    │           │
                Belum       Sudah
                    │           │
                    ▼           ▼
              Show toast    Exit app
           "Tekan lagi"
```

## Testing

### Di Browser (Development):
```bash
npm run dev
```
- Buka di browser
- Navigate ke detail jadwal
- Tekan browser back button → Kembali ke dashboard
- Di dashboard, tekan back → Muncul toast
- Tekan back lagi → Keluar

### Di Android (Production):
1. Deploy app: `npm run deploy:hosting`
2. Buka di Chrome Android
3. Add to Home Screen
4. Test:
   - Buka detail jadwal
   - Tekan back → Kembali ke dashboard ✅
   - Di dashboard, tekan back → Toast muncul ✅
   - Tekan back lagi → App keluar ✅

## Kustomisasi

### Ubah Durasi Toast:
Edit `src/App.tsx` line ~85:
```typescript
backPressTimeout = setTimeout(() => {
  backPressedOnce = false;
}, 2000); // Ubah 2000 (2 detik) sesuai kebutuhan
```

### Ubah Teks Toast:
Edit `src/App.tsx` line ~105:
```typescript
toast.textContent = 'Tekan sekali lagi untuk keluar'; // Ubah teks
```

### Ubah Style Toast:
Edit `src/App.tsx` line ~103:
```typescript
toast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-zinc-900 text-zinc-100 px-6 py-3 rounded-full shadow-lg z-[9999] text-sm font-bold';
```

## Halaman Root

Halaman yang dianggap "root" (exit dengan double back):
- `/` - Dashboard
- `/login` - Login page

Halaman lain akan navigasi back normal:
- `/schedule/:id` - Detail jadwal
- `/calendar` - Calendar view
- `/finance` - Finance page
- `/admin` - Admin settings

## Troubleshooting

### Toast tidak muncul:
- Check browser console untuk error
- Pastikan CSS animation sudah di-load
- Clear cache dan reload

### Back button tidak bekerja:
- Check `AndroidBackButtonHandler` component di-render
- Check browser console untuk error
- Test di incognito mode

### App langsung keluar:
- Check logic di `handleBackButton` function
- Pastikan `backPressedOnce` state bekerja
- Check timeout tidak terlalu pendek

## Browser Compatibility

- ✅ Chrome Android (PWA)
- ✅ Chrome Desktop
- ✅ Edge Desktop
- ✅ Firefox Desktop
- ⚠️ Safari iOS (limited PWA support)

## Notes

- Behavior ini khusus untuk PWA/web app
- Native app behavior mungkin berbeda
- Toast muncul di atas bottom navbar (z-index: 9999)
- Animation smooth dengan CSS keyframes

---

**Status**: ✅ Implemented
**Tested**: ✅ Ready for testing
**Platform**: Android PWA, Desktop browsers
