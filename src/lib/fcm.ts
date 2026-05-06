/**
 * Firebase Cloud Messaging utilities for push notifications
 */

import { messaging, getToken, onMessage } from './firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// VAPID key - You need to generate this from Firebase Console
// Go to: Project Settings > Cloud Messaging > Web Push certificates
// Or set it in .env file as VITE_VAPID_KEY
const VAPID_KEY = import.meta.env.VITE_VAPID_KEY || 'YOUR_VAPID_KEY_HERE';

/**
 * Request FCM token and save to Firestore
 * @param userId - User ID to associate the token with
 * @returns Promise<string | null> - FCM token or null if failed
 */
export async function requestFCMToken(userId: string): Promise<string | null> {
  if (!messaging) {
    console.warn('Firebase Messaging not supported');
    return null;
  }

  try {
    // Request notification permission first
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('Service Worker registered:', registration);

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log('FCM Token:', token);
      
      // Save token to Firestore
      await setDoc(doc(db, 'fcmTokens', userId), {
        token,
        userId,
        updatedAt: serverTimestamp(),
        platform: 'web',
        userAgent: navigator.userAgent,
      }, { merge: true });

      return token;
    } else {
      console.warn('No FCM token available');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

/**
 * Setup foreground message listener
 * @param callback - Function to call when message is received
 */
export function setupForegroundMessageListener(
  callback: (payload: any) => void
): (() => void) | null {
  if (!messaging) {
    console.warn('Firebase Messaging not supported');
    return null;
  }

  const unsubscribe = onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    callback(payload);
  });

  return unsubscribe;
}

/**
 * Delete FCM token from Firestore
 * @param userId - User ID
 */
export async function deleteFCMToken(userId: string): Promise<void> {
  try {
    await setDoc(doc(db, 'fcmTokens', userId), {
      token: null,
      deletedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('Error deleting FCM token:', error);
  }
}

/**
 * Send notification data to trigger FCM
 * This is a helper to store notification data in Firestore
 * You'll need Cloud Functions to actually send the FCM notification
 */
export async function triggerNotification(data: {
  userId: string;
  title: string;
  body: string;
  type: 'chat' | 'payment' | 'schedule';
  scheduleId?: string;
  url?: string;
}): Promise<void> {
  try {
    await setDoc(doc(db, 'notifications', `${data.userId}_${Date.now()}`), {
      ...data,
      createdAt: serverTimestamp(),
      sent: false,
    });
  } catch (error) {
    console.error('Error triggering notification:', error);
  }
}
