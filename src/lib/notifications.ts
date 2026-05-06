/**
 * Notification utility functions for browser notifications
 */

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
}

/**
 * Request notification permission from the user
 * @returns Promise<boolean> - true if permission granted, false otherwise
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Show a browser notification
 * @param options - Notification options
 * @returns Promise<boolean> - true if notification was shown, false otherwise
 */
export async function showNotification(options: NotificationOptions): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Browser does not support notifications');
    return false;
  }

  // Check if permission is granted
  if (Notification.permission !== 'granted') {
    const granted = await requestNotificationPermission();
    if (!granted) {
      console.warn('Notification permission not granted');
      return false;
    }
  }

  try {
    // Try to use service worker notification if available
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(options.title, {
        body: options.body,
        icon: options.icon || '/icons/icon-192.png',
        badge: options.badge || '/icons/icon-192.png',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
      });
    } else {
      // Fallback to regular notification
      new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icons/icon-192.png',
        badge: options.badge || '/icons/icon-192.png',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
      });
    }
    return true;
  } catch (error) {
    console.error('Error showing notification:', error);
    return false;
  }
}

/**
 * Check if notifications are supported and permission status
 * @returns object with support and permission status
 */
export function getNotificationStatus() {
  const supported = 'Notification' in window;
  const permission = supported ? Notification.permission : 'unsupported';
  
  return {
    supported,
    permission,
    granted: permission === 'granted',
    denied: permission === 'denied',
    default: permission === 'default',
  };
}
