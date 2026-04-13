import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Syne_400Regular,
  Syne_700Bold,
  Syne_800ExtraBold,
} from '@expo-google-fonts/syne';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { Colors } from '@/constants/colors';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { registerForPushNotifications } from '@/lib/notifications';

SplashScreen.preventAutoHideAsync();

// ─── Auth gate — redirects based on session ───────────────────────────────────

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (session) registerForPushNotifications();
  }, [session]);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const inOnboarding = segments[0] === 'onboarding';

    if (!session && inAuthGroup) {
      // Not signed in but trying to access app — send to login
      // In dev mode, skip auth gate so the app is accessible without Supabase
      if (!__DEV__) router.replace('/login');
    } else if (session && (segments[0] === 'login' || inOnboarding)) {
      // Signed in but on login/onboarding — send to app
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  return <>{children}</>;
}

// ─── Root layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Syne-Regular': Syne_400Regular,
    'Syne-Bold': Syne_700Bold,
    'Syne-ExtraBold': Syne_800ExtraBold,
    'DMSans-Regular': DMSans_400Regular,
    'DMSans-Medium': DMSans_500Medium,
    'DMSans-Bold': DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <AppProvider>
        <AuthGate>
          <View style={{ flex: 1, backgroundColor: Colors.bg }}>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.bg },
                animation: 'fade',
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="login" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="settings"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="edit-profile"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="auth/email"
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen
                name="notifications"
                options={{ animation: 'slide_from_right' }}
              />
            </Stack>
          </View>
        </AuthGate>
      </AppProvider>
    </AuthProvider>
  );
}
