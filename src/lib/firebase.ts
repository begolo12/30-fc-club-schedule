import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Initialize Firebase Cloud Messaging lazily & safely
let messaging: ReturnType<typeof getMessaging> | null = null;

export async function getMessagingSafe() {
  if (messaging) return messaging;
  try {
    const supported = await isSupported();
    if (supported && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      messaging = getMessaging(app);
      return messaging;
    }
  } catch (error) {
    console.warn('Firebase Messaging not supported:', error);
  }
  return null;
}

export { messaging, getToken, onMessage };
