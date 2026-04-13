import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure how notifications appear when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

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

  // Save push token to Supabase
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', user.id);
  }

  return token;
}

// ─── Local notification helpers ───────────────────────────────────────────────

export async function notifyViewerMilestone(count: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🎉 Milestone reached!',
      body: `${count.toLocaleString()} viewers are watching your stream right now.`,
      sound: true,
    },
    trigger: null, // immediate
  });
}

export async function notifyGiftReceived(platform: string, giftName: string, value: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Gift on ${platform}!`,
      body: `You received a ${giftName} worth ${value}.`,
      sound: true,
    },
    trigger: null,
  });
}

export async function notifyStreamEnded(durationSecs: number, peakViewers: number) {
  const mins = Math.floor(durationSecs / 60);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Stream ended',
      body: `Great stream! ${mins} min · ${peakViewers.toLocaleString()} peak viewers.`,
    },
    trigger: null,
  });
}
