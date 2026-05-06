import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Send notification when a new chat message is posted
 */
export const onNewChatMessage = functions.firestore
  .document('schedules/{scheduleId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const scheduleId = context.params.scheduleId;
    const senderId = message.userId;

    try {
      // Get schedule details
      const scheduleDoc = await db.collection('schedules').doc(scheduleId).get();
      if (!scheduleDoc.exists) return;

      // Get all participants except the sender
      const participantsSnap = await db
        .collection('schedules')
        .doc(scheduleId)
        .collection('participants')
        .get();

      const participantIds = participantsSnap.docs
        .map(doc => doc.data().userId)
        .filter(userId => userId !== senderId);

      // Get FCM tokens for all participants
      const tokensSnap = await db
        .collection('fcmTokens')
        .where('userId', 'in', participantIds.slice(0, 10)) // Firestore 'in' limit is 10
        .get();

      const tokens = tokensSnap.docs
        .map(doc => doc.data().token)
        .filter(token => token);

      if (tokens.length === 0) {
        console.log('No FCM tokens found for participants');
        return;
      }

      // Send notification to all participants
      const payload = {
        notification: {
          title: `💬 ${message.nickname || message.name}`,
          body: message.text.length > 100 ? message.text.substring(0, 100) + '...' : message.text,
          icon: '/icons/icon-192.png',
        },
        data: {
          type: 'chat',
          scheduleId: scheduleId,
          url: `/schedule/${scheduleId}`,
          tag: `chat-${scheduleId}`,
        },
      };

      const response = await messaging.sendEachForMulticast({
        tokens: tokens,
        ...payload,
      });

      console.log(`Successfully sent ${response.successCount} notifications`);
      if (response.failureCount > 0) {
        console.log(`Failed to send ${response.failureCount} notifications`);
      }
    } catch (error) {
      console.error('Error sending chat notification:', error);
    }
  });

/**
 * Send notification to admin when a payment is made
 */
export const onPaymentStatusChange = functions.firestore
  .document('schedules/{scheduleId}/participants/{participantId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const scheduleId = context.params.scheduleId;

    // Check if payment status changed from unpaid to paid
    if (
      before.paymentStatus === 'unpaid' &&
      (after.paymentStatus === 'paid_qris' || after.paymentStatus === 'paid_cash' || after.paymentStatus === 'pending_qris')
    ) {
      try {
        // Get schedule details
        const scheduleDoc = await db.collection('schedules').doc(scheduleId).get();
        if (!scheduleDoc.exists) return;
        
        const schedule = scheduleDoc.data();

        // Get admin FCM tokens
        const adminsSnap = await db
          .collection('fcmTokens')
          .get();

        // Filter for admin users (you can add a field in fcmTokens to mark admins)
        // For now, we'll send to all tokens (you should filter by admin role)
        const adminTokens = adminsSnap.docs
          .map(doc => doc.data().token)
          .filter(token => token);

        if (adminTokens.length === 0) {
          console.log('No admin FCM tokens found');
          return;
        }

        const paymentMethod = after.paymentStatus === 'paid_qris' ? 'QRIS' : 
                             after.paymentStatus === 'paid_cash' ? 'Tunai' : 'QRIS (Pending)';

        // Send notification to admins
        const payload = {
          notification: {
            title: `💰 Pembayaran Baru!`,
            body: `${after.nickname || after.name} membayar via ${paymentMethod} untuk ${schedule?.title || 'pertandingan'}`,
            icon: '/icons/icon-192.png',
          },
          data: {
            type: 'payment',
            scheduleId: scheduleId,
            url: `/schedule/${scheduleId}`,
            tag: `payment-${scheduleId}`,
          },
        };

        const response = await messaging.sendEachForMulticast({
          tokens: adminTokens,
          ...payload,
        });

        console.log(`Successfully sent ${response.successCount} payment notifications to admins`);
        if (response.failureCount > 0) {
          console.log(`Failed to send ${response.failureCount} notifications`);
        }
      } catch (error) {
        console.error('Error sending payment notification:', error);
      }
    }
  });

/**
 * Send notification when a new schedule is created
 */
export const onNewSchedule = functions.firestore
  .document('schedules/{scheduleId}')
  .onCreate(async (snap, context) => {
    const schedule = snap.data();
    const scheduleId = context.params.scheduleId;

    try {
      // Get all FCM tokens
      const tokensSnap = await db.collection('fcmTokens').get();
      const tokens = tokensSnap.docs
        .map(doc => doc.data().token)
        .filter(token => token);

      if (tokens.length === 0) {
        console.log('No FCM tokens found');
        return;
      }

      const scheduleDate = new Date(schedule.timestamp);
      const formattedDate = scheduleDate.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });

      // Send notification to all users
      const payload = {
        notification: {
          title: '🎯 Jadwal Baru!',
          body: `${schedule.title} - ${formattedDate} di ${schedule.location}`,
          icon: '/icons/icon-192.png',
        },
        data: {
          type: 'schedule',
          scheduleId: scheduleId,
          url: `/schedule/${scheduleId}`,
          tag: `schedule-${scheduleId}`,
        },
      };

      const response = await messaging.sendEachForMulticast({
        tokens: tokens,
        ...payload,
      });

      console.log(`Successfully sent ${response.successCount} schedule notifications`);
      if (response.failureCount > 0) {
        console.log(`Failed to send ${response.failureCount} notifications`);
      }
    } catch (error) {
      console.error('Error sending schedule notification:', error);
    }
  });
