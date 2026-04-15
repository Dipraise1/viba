import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';

configureReanimatedLogger({ level: ReanimatedLogLevel.warn, strict: false });
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
import { AppProvider } from '@/context/AppContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { registerForPushNotifications } from '@/lib/notifications';

SplashScreen.preventAutoHideAsync();

// ─── Splash intro ─────────────────────────────────────────────────────────────

function SplashIntro({ onFinish }: { onFinish: () => void }) {
  const opacity = useSharedValue(0);
  const letterSpacing = useSharedValue(28);
  const scale = useSharedValue(1);

  const finish = () => onFinish();

  useEffect(() => {
    // Phase 1 — reveal (400ms)
    opacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
    letterSpacing.value = withSpring(5, { damping: 22, stiffness: 80 });

    // Phase 2 — fade out after hold (total ~4000ms)
    const timeout = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 400, easing: Easing.in(Easing.cubic) });
      scale.value = withTiming(0.96, { duration: 400 }, (done) => {
        if (done) runOnJS(finish)();
      });
    }, 3600);

    return () => clearTimeout(timeout);
  }, []);

  const textStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    letterSpacing: letterSpacing.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={splashStyles.container}>
      <Animated.Text style={[splashStyles.wordmark, textStyle]}>
        viba
      </Animated.Text>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#05050F',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  wordmark: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 52,
    color: '#FFFFFF',
  },
});

// ─── Auth gate — redirects based on session ───────────────────────────────────

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const inOnboarding = segments[0] === 'onboarding';

    if (!session && inAuthGroup) {
      router.replace('/login');
    } else if (session && (segments[0] === 'login' || inOnboarding)) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  return <>{children}</>;
}

// ─── Themed shell — lives inside ThemeProvider ───────────────────────────────

function ThemedApp() {
  const { colors, resolvedTheme } = useTheme();
  const { session } = useAuth();

  useEffect(() => {
    if (session) registerForPushNotifications();
  }, [session]);

  return (
    <AuthGate>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar style={resolvedTheme === 'light' ? 'dark' : 'light'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="edit-profile" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="auth/email" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="streams" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="gift-analytics" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="activity" options={{ animation: 'slide_from_bottom' }} />
        </Stack>
      </View>
    </AuthGate>
  );
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
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <AppProvider>
        <ThemeProvider>
          <ThemedApp />
          {!introDone && <SplashIntro onFinish={() => setIntroDone(true)} />}
        </ThemeProvider>
      </AppProvider>
    </AuthProvider>
  );
}
