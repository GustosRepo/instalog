/**
 * Notifications utility
 * Gentle local reminders for tasks — soft nudges, not alarms
 */

import * as Notifications from 'expo-notifications';
import {Platform} from 'react-native';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions.
 * Returns true if granted.
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  const {status: existing} = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const {status} = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

/**
 * Check if we have notification permission without prompting.
 */
export const hasNotificationPermission = async (): Promise<boolean> => {
  const {status} = await Notifications.getPermissionsAsync();
  return status === 'granted';
};

/**
 * Schedule a gentle task reminder at a specific time.
 * Returns the notification identifier for cancellation.
 */
export const scheduleTaskReminder = async (
  taskId: string,
  taskText: string,
  triggerDate: Date,
): Promise<string | null> => {
  const hasPermission = await hasNotificationPermission();
  if (!hasPermission) return null;

  // Don't schedule if the time has already passed
  if (triggerDate.getTime() <= Date.now()) return null;

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Quick nudge',
        body: `${taskText} — want to do it now or later?`,
        data: {taskId, type: 'task_reminder'},
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
    return id;
  } catch (error) {
    console.warn('Failed to schedule notification:', error);
    return null;
  }
};

/**
 * Cancel a scheduled notification by identifier.
 */
export const cancelTaskReminder = async (
  notificationId: string,
): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.warn('Failed to cancel notification:', error);
  }
};

/**
 * Cancel all scheduled notifications (for clear-all operations).
 */
export const cancelAllReminders = async (): Promise<void> => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn('Failed to cancel all notifications:', error);
  }
};
