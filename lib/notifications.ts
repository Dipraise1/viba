import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// expo-notifications push is not available in Expo Go (SDK 53+).
// Skip the require entirely so the module never logs its console.error.
const IS_EXPO_GO = Constants.appOwnership === 'expo';

let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;

if (!IS_EXPO_GO) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Notifications = require('expo-notifications');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Device = require('expo-device');
  } catch {
    // unavailable in this build
  }
}

let notificationHandlerConfigured = false;

export function ensureNotificationHandlerConfigured() {
  if (notificationHandlerConfigured || !Notifications) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    notificationHandlerConfigured = true;
  } catch {
    // Expo Go — ignore
  }
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Notifications || !Device) return null;
  ensureNotificationHandlerConfigured();

  try {
    if (!Device.isDevice) return null;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('viba-stream', {
        name: 'Stream alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF2D87',
      });
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ push_token: token }).eq('id', user.id);
    }

    return token;
  } catch {
    return null;
  }
}

export async function notifyViewerMilestone(count: number) {
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎉 Milestone reached!',
        body: `${count.toLocaleString()} viewers are watching your stream right now.`,
        sound: true,
      },
      trigger: null,
    });
  } catch { /* Expo Go */ }
}

export async function notifyGiftReceived(platform: string, giftName: string, value: string) {
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Gift on ${platform}!`,
        body: `You received a ${giftName} worth ${value}.`,
        sound: true,
      },
      trigger: null,
    });
  } catch { /* Expo Go */ }
}

export async function notifyStreamEnded(durationSecs: number, peakViewers: number) {
  if (!Notifications) return;
  try {
    const mins = Math.floor(durationSecs / 60);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Stream ended',
        body: `Great stream! ${mins} min · ${peakViewers.toLocaleString()} peak viewers.`,
      },
      trigger: null,
    });
  } catch { /* Expo Go */ }
}
