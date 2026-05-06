/**
 * Simple notification system using Firestore realtime listeners
 * Works without Cloud Functions or FCM setup
 */

import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { showNotification } from './notifications';

interface NotificationListener {
  unsubscribe: () => void;
}

/**
 * Listen for new chat messages and show notifications
 */
export function listenForChatNotifications(
  scheduleId: string,
  currentUserId: string,
  scheduleName: string
): NotificationListener {
  const messagesRef = collection(db, 'schedules', scheduleId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));

  let isFirstLoad = true;

  const unsubscribe = onSnapshot(q, (snapshot) => {
    // Skip first load to avoid notification on page load
    if (isFirstLoad) {
      isFirstLoad = false;
      return;
    }

    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const message = change.doc.data();
        
        // Don't notify for own messages
        if (message.userId === currentUserId) {
          return;
        }

        // Show notification
        showNotification({
          title: `💬 ${message.nickname || message.name}`,
          body: message.text.length > 100 
            ? message.text.substring(0, 100) + '...' 
            : message.text,
          tag: `chat-${scheduleId}`,
          requireInteraction: false,
        });
      }
    });
  });

  return { unsubscribe };
}

/**
 * Listen for payment status changes and show notifications to admin
 */
export function listenForPaymentNotifications(
  scheduleId: string,
  isAdmin: boolean,
  scheduleName: string
): NotificationListener {
  if (!isAdmin) {
    return { unsubscribe: () => {} };
  }

  const participantsRef = collection(db, 'schedules', scheduleId, 'participants');
  
  let isFirstLoad = true;
  const previousStatuses = new Map<string, string>();

  const unsubscribe = onSnapshot(participantsRef, (snapshot) => {
    // Skip first load
    if (isFirstLoad) {
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        previousStatuses.set(doc.id, data.paymentStatus || 'unpaid');
      });
      isFirstLoad = false;
      return;
    }

    snapshot.docChanges().forEach((change) => {
      if (change.type === 'modified') {
        const participant = change.doc.data();
        const previousStatus = previousStatuses.get(change.doc.id);
        const currentStatus = participant.paymentStatus;

        // Check if payment status changed from unpaid to paid
        if (
          previousStatus === 'unpaid' &&
          (currentStatus === 'paid_qris' || currentStatus === 'paid_cash' || currentStatus === 'pending_qris')
        ) {
          const paymentMethod = currentStatus === 'paid_qris' ? 'QRIS' : 
                               currentStatus === 'paid_cash' ? 'Tunai' : 'QRIS (Pending)';

          showNotification({
            title: '💰 Pembayaran Baru!',
            body: `${participant.nickname || participant.name} membayar via ${paymentMethod} untuk ${scheduleName}`,
            tag: `payment-${scheduleId}`,
            requireInteraction: false,
          });
        }

        // Update previous status
        previousStatuses.set(change.doc.id, currentStatus);
      }
    });
  });

  return { unsubscribe };
}

/**
 * Listen for new schedules and show notifications
 */
export function listenForNewSchedules(currentUserId: string): NotificationListener {
  const schedulesRef = collection(db, 'schedules');
  const q = query(schedulesRef, orderBy('createdAt', 'desc'), limit(1));

  let isFirstLoad = true;

  const unsubscribe = onSnapshot(q, (snapshot) => {
    // Skip first load
    if (isFirstLoad) {
      isFirstLoad = false;
      return;
    }

    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const schedule = change.doc.data();
        
        const scheduleDate = new Date(schedule.timestamp);
        const formattedDate = scheduleDate.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
        });

        showNotification({
          title: '🎯 Jadwal Baru!',
          body: `${schedule.title} - ${formattedDate} di ${schedule.location}`,
          tag: `schedule-${change.doc.id}`,
          requireInteraction: false,
        });
      }
    });
  });

  return { unsubscribe };
}
