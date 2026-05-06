# 🔔 Arsitektur Push Notifications - 30 FC

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER ACTIONS                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌──────────────┬──────────────┬──────────────┐
        │              │              │              │
        ▼              ▼              ▼              ▼
   [Kirim Chat]   [Bayar]    [Buat Jadwal]   [Login]
        │              │              │              │
        └──────────────┴──────────────┴──────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FIRESTORE                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   messages   │  │ participants │  │  schedules   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                CLOUD FUNCTIONS (Auto Trigger)                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ onNewChatMessage │  │ onPaymentChange  │  │ onNewSchedule│ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              FIREBASE CLOUD MESSAGING (FCM)                      │
│                  Send Push Notification                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌──────────────┬──────────────┬──────────────┐
        │              │              │              │
        ▼              ▼              ▼              ▼
   [Device 1]     [Device 2]     [Device 3]     [Device 4]
   User A         User B         User C         Admin
        │              │              │              │
        └──────────────┴──────────────┴──────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              SERVICE WORKER (Background)                         │
│           firebase-messaging-sw.js                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    [NOTIFICATION MUNCUL]
                    Bahkan saat app ditutup!
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT SIDE                               │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  AuthContext.tsx                                        │    │
│  │  - Request FCM token saat login                        │    │
│  │  - Save token ke Firestore                             │    │
│  │  - Setup foreground message listener                   │    │
│  └────────────────────────────────────────────────────────┘    │
│                           │                                      │
│                           ▼                                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  fcm.ts                                                 │    │
│  │  - requestFCMToken()                                    │    │
│  │  - setupForegroundMessageListener()                     │    │
│  │  - deleteFCMToken()                                     │    │
│  └────────────────────────────────────────────────────────┘    │
│                           │                                      │
│                           ▼                                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  firebase.ts                                            │    │
│  │  - Initialize Firebase                                  │    │
│  │  - Initialize Messaging                                 │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE WORKER                              │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  firebase-messaging-sw.js                               │    │
│  │  - Handle background messages                           │    │
│  │  - Show notifications                                   │    │
│  │  - Handle notification clicks                           │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      SERVER SIDE                                 │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Cloud Functions (functions/src/index.ts)               │    │
│  │                                                          │    │
│  │  1. onNewChatMessage                                    │    │
│  │     - Trigger: New message in Firestore                │    │
│  │     - Action: Send notif to all participants           │    │
│  │                                                          │    │
│  │  2. onPaymentStatusChange                               │    │
│  │     - Trigger: Payment status updated                   │    │
│  │     - Action: Send notif to admin                       │    │
│  │                                                          │    │
│  │  3. onNewSchedule                                       │    │
│  │     - Trigger: New schedule created                     │    │
│  │     - Action: Send notif to all users                   │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. User Login
```
User Login
    ↓
AuthContext.tsx
    ↓
requestFCMToken(userId)
    ↓
Get FCM Token from Firebase
    ↓
Save to Firestore: fcmTokens/{userId}
```

### 2. Chat Notification
```
User A kirim chat
    ↓
Firestore: schedules/{id}/messages/{msgId}
    ↓
Cloud Function: onNewChatMessage (auto trigger)
    ↓
Get all participants (except sender)
    ↓
Get FCM tokens from Firestore
    ↓
Send notification via FCM
    ↓
Service Worker: firebase-messaging-sw.js
    ↓
Show notification on User B, C, D devices
```

### 3. Payment Notification
```
User bayar
    ↓
Update: schedules/{id}/participants/{userId}
    ↓
Cloud Function: onPaymentStatusChange (auto trigger)
    ↓
Get admin FCM tokens
    ↓
Send notification via FCM
    ↓
Service Worker
    ↓
Show notification on Admin device
```

## Firestore Collections

```
fcmTokens/
  {userId}/
    - token: "fcm_token_string"
    - userId: "user_id"
    - platform: "web"
    - updatedAt: timestamp

schedules/
  {scheduleId}/
    - title, location, etc.
    
    messages/
      {messageId}/
        - userId, text, timestamp
    
    participants/
      {userId}/
        - name, paymentStatus, etc.
```

## Security Rules

```javascript
// fcmTokens - User can only write their own token
match /fcmTokens/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth.uid == userId;
}

// Cloud Functions have admin access
// Can read all tokens to send notifications
```

## Performance

- **Token Refresh**: Auto refresh saat expired
- **Batch Sending**: FCM sendEachForMulticast untuk multiple devices
- **Caching**: Service worker cache untuk offline support
- **Retry**: Auto retry jika send gagal

## Monitoring

```
Firebase Console
    ↓
Functions → Logs
    ↓
See:
- Function executions
- Notification sent count
- Errors
- Performance metrics
```

---

**Key Points:**
- ✅ Fully automated (no manual trigger needed)
- ✅ Works in background (app closed)
- ✅ Real-time (instant notification)
- ✅ Scalable (handles multiple users)
- ✅ Reliable (retry on failure)
