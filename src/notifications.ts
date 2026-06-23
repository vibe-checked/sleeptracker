import * as Notifications from 'expo-notifications';
import type { SmartAlarmConfig } from './data/types';

const ALARM_ID_KEY = 'smart-alarm';

// Foreground presentation so a fired alarm shows even with the app open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }
  const req = await Notifications.requestPermissionsAsync();
  return req.granted || req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

// Subtract the smart window so the alarm fires at the *start* of the window
// (the lightest-sleep target), mirroring AutoSleep's behavior.
function windowStart(config: SmartAlarmConfig): { hour: number; minute: number } {
  let total = config.wakeHour * 60 + config.wakeMin - config.windowMin;
  total = ((total % 1440) + 1440) % 1440;
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

export async function scheduleSmartAlarm(config: SmartAlarmConfig): Promise<string | null> {
  await cancelSmartAlarm();
  if (!config.enabled) return null;
  const granted = await ensureNotificationPermission();
  if (!granted) return null;
  const { hour, minute } = windowStart(config);
  return Notifications.scheduleNotificationAsync({
    identifier: ALARM_ID_KEY,
    content: {
      title: '☀️ Smart Alarm',
      body: "You're in light sleep — a good time to wake up.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelSmartAlarm(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(ALARM_ID_KEY);
  } catch {
    // not scheduled
  }
}

export async function getScheduledAlarm(): Promise<boolean> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all.some(n => n.identifier === ALARM_ID_KEY);
}
