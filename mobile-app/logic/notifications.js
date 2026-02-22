import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications should be handled when the app is open
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

/**
 * Request permission for notifications
 */
export async function requestPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    return finalStatus === 'granted';
}

/**
 * Schedule all Sehri and Iftar notifications for the given schedule
 */
export async function scheduleRamadanNotifications(schedule, zilla) {
    // 1. Clear existing notifications to avoid duplicates when location changes
    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = Date.now();
    let scheduledCount = 0;

    for (const entry of schedule) {
        // Parse times
        const [y, mo, d] = entry.date.split('-').map(Number);

        // ── Schedule Iftar Reminder (5 minutes before) ──
        const [iH, iM] = entry.iftar.split(':').map(Number);
        const iftarDate = new Date(y, mo - 1, d, iH, iM, 0);
        const iftarReminderTime = iftarDate.getTime() - (5 * 60 * 1000); // 5 mins before

        if (iftarReminderTime > now) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "🌅 Iftar Reminder",
                    body: `Prepare for Iftar in 5 minutes (${zilla}).`,
                    sound: 'default',
                },
                trigger: new Date(iftarReminderTime),
            });
            scheduledCount++;
        }

        // ── Schedule Sehri Alarm (20 minutes before) ──
        const [sH, sM] = entry.sehri_end.split(':').map(Number);
        const sehriDate = new Date(y, mo - 1, d, sH, sM, 0);
        const sehriAlarmTime = sehriDate.getTime() - (20 * 60 * 1000); // 20 mins before

        if (sehriAlarmTime > now) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "🌙 Sehri Alarm",
                    body: `Time to wake up for Sehri. Ends in 20 minutes.`,
                    sound: Platform.OS === 'android' ? 'default' : true, // iOS needs true for default sound
                    priority: Notifications.AndroidImportance.MAX,
                },
                trigger: new Date(sehriAlarmTime),
            });
            scheduledCount++;
        }

        // Limit to avoid hitting OS limits (usually around 50-100)
        // We schedule 2 notifications per day, so 30 days = 60 notifications.
        // If we exceed 64, we might fail on some OS versions.
        if (scheduledCount >= 60) break;
    }

    return scheduledCount;
}
