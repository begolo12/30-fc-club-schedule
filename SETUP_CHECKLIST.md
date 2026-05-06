# ✅ Setup Checklist - Push Notifications

Ikuti checklist ini untuk setup push notifications:

## Pre-requisites
- [ ] Node.js installed
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Firebase project created (fc-1488f)
- [ ] Billing enabled di Firebase Console

## Setup Steps

### 1. Generate VAPID Key
- [ ] Buka Firebase Console: https://console.firebase.google.com/project/fc-1488f/settings/cloudmessaging
- [ ] Klik "Generate key pair" di Web Push certificates
- [ ] Copy VAPID key

### 2. Configure Environment
- [ ] Buat file `.env` di root project
- [ ] Tambahkan: `VITE_VAPID_KEY="your_vapid_key_here"`
- [ ] Save file

### 3. Install Dependencies
```bash
cd functions
npm install
cd ..
```
- [ ] Dependencies installed successfully

### 4. Login to Firebase
```bash
firebase login
```
- [ ] Logged in successfully

### 5. Deploy Cloud Functions
```bash
npm run deploy:functions
```
- [ ] onNewChatMessage deployed
- [ ] onPaymentStatusChange deployed
- [ ] onNewSchedule deployed

### 6. Build & Deploy Web App
```bash
npm run build
npm run deploy:hosting
```
- [ ] Build successful
- [ ] Deployed to Firebase Hosting

## Testing

### Desktop Testing
- [ ] Open app in Chrome
- [ ] Login
- [ ] Allow notifications
- [ ] Open in another browser/incognito
- [ ] Login as different user
- [ ] Join same schedule
- [ ] Send chat → notification appears

### Android Testing
- [ ] Open app in Chrome Android
- [ ] Add to Home Screen
- [ ] Open PWA from home screen
- [ ] Login
- [ ] Allow notifications
- [ ] Test from another device:
  - [ ] Send chat → notification appears
  - [ ] Make payment → admin gets notification
  - [ ] Create schedule → all users get notification

### Background Testing
- [ ] Close app (swipe away)
- [ ] Send chat from another device
- [ ] Notification appears even when app is closed
- [ ] Tap notification → app opens to correct page

## Verification

### Check FCM Tokens
```bash
firebase firestore:get fcmTokens
```
- [ ] Tokens are being saved

### Check Cloud Functions
- [ ] Open Firebase Console > Functions
- [ ] All 3 functions are deployed
- [ ] Status: Healthy

### Check Logs
```bash
firebase functions:log
```
- [ ] No errors in logs
- [ ] Notifications being sent successfully

## Troubleshooting

If notifications don't work:
- [ ] Check VAPID key is correct
- [ ] Check notification permission is granted
- [ ] Check service worker is registered
- [ ] Check FCM token is saved in Firestore
- [ ] Check Cloud Functions logs for errors
- [ ] Check browser console for errors

## Final Checks
- [ ] Notifications work in foreground
- [ ] Notifications work in background
- [ ] Notifications work when app is closed
- [ ] Click notification opens correct page
- [ ] All 3 notification types working (chat, payment, schedule)

---

## Quick Commands Reference

```bash
# Development
npm run dev

# Build
npm run build

# Deploy everything
npm run deploy

# Deploy only functions
npm run deploy:functions

# Deploy only hosting
npm run deploy:hosting

# Check logs
firebase functions:log

# Check Firestore
firebase firestore:get fcmTokens
```

---

**Status**: [ ] Setup Complete
**Date**: ___________
**Tested By**: ___________
