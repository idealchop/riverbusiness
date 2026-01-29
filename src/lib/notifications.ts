'use client';
import { collection, addDoc, serverTimestamp, type Firestore } from 'firebase/firestore';
import type { Notification } from '@/lib/types';

/**
 * Creates a notification document in a user's notification subcollection from the client.
 *
 * @param firestore The Firestore instance.
 * @param userId The ID of the user to notify.
 * @param notificationData The notification payload.
 */
export async function createClientNotification(
  firestore: Firestore,
  userId: string,
  notificationData: Omit<Notification, 'id' | 'userId' | 'date' | 'isRead'>
) {
  if (!userId) {
    console.warn("User ID is missing, cannot create client notification.");
    return;
  }
  try {
    const notificationWithMeta = {
      ...notificationData,
      userId: userId,
      date: serverTimestamp(),
      isRead: false,
    };
    await addDoc(collection(firestore, 'users', userId, 'notifications'), notificationWithMeta);
  } catch (error) {
    console.error(`Failed to create client notification for user ${userId}`, error);
    // Depending on the context, you might want to throw the error
    // or show a toast to the admin. For now, we log it.
  }
}
