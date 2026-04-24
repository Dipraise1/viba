import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { AppColors } from '@/constants/themes';
import { useApp } from '@/context/AppContext';

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabConfig = {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFilled: keyof typeof Ionicons.glyphMap;
};

const LEFT_TABS: TabConfig[] = [
  { name: 'index', icon: 'home-outline', iconFilled: 'home' },
  { name: 'discover', icon: 'play-circle-outline', iconFilled: 'play-circle' },
];

const RIGHT_TABS: TabConfig[] = [
  { name: 'activity', icon: 'notifications-outline', iconFilled: 'notifications' },
  { name: 'profile', icon: 'person-outline', iconFilled: 'person' },
];

// ─── Animated tab button ──────────────────────────────────────────────────────

function TabButton({
  config,
  isFocused,
  onPress,
  badge,
  C,
}: {
  config: TabConfig;
  isFocused: boolean;
  onPress: () => void;
  badge?: number;
  C: AppColors;
}) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);
  const tabStyles = useMemo(() => makeTabBtnStyles(C), [C]);

  useEffect(() => {
    glow.value = withTiming(isFocused ? 1 : 0, { duration: 220 });
  }, [isFocused]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(glow.value, [0, 1], [1, 1.12], Extrapolation.CLAMP) }],
    opacity: interpolate(glow.value, [0, 1], [0.45, 1], Extrapolation.CLAMP),
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scaleX: interpolate(glow.value, [0, 1], [0.3, 1], Extrapolation.CLAMP) }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.85, { damping: 15 }, () => {
      scale.value = withSpring(1, { damping: 12 });
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable onPress={handlePress} style={tabStyles.tabBtn}>
      <Animated.View style={[tabStyles.iconContainer, { transform: [{ scale }] }]}>
        <Animated.View style={iconStyle}>
          <Ionicons
            name={isFocused ? config.iconFilled : config.icon}
            size={23}
            color={isFocused ? C.textPrimary : C.textMuted}
          />
        </Animated.View>
        {badge !== undefined && badge > 0 && (
          <View style={tabStyles.badge}>
            <Animated.Text style={tabStyles.badgeText}>
              {badge > 9 ? '9+' : badge}
            </Animated.Text>
          </View>
        )}
      </Animated.View>

      {/* Active dot */}
      <Animated.View style={[tabStyles.activeDot, dotStyle]}>
        <LinearGradient
          colors={C.gradientBrandH}
          style={tabStyles.activeDotGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </Animated.View>
    </Pressable>
  );
}

// ─── Go Live FAB ──────────────────────────────────────────────────────────────

function LiveFab({ isFocused, onPress }: { isFocused: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isFocused) {
      pulse.value = withSpring(1.08, { damping: 8 });
    } else {
      pulse.value = withSpring(1, { damping: 10 });
    }
  }, [isFocused]);

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * pulse.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.88, { damping: 14 }, () => {
      scale.value = withSpring(1, { damping: 10 });
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <View style={fabStyles.fabWrapper}>
      <Pressable onPress={handlePress}>
        <Animated.View style={fabStyle}>
          <LinearGradient
            colors={isFocused ? ['#FF2D87', '#C020E0', '#7B2FFF'] : ['#2A1535', '#1A0D28']}
            style={[fabStyles.fab, isFocused && fabStyles.fabActive]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons
              name={isFocused ? 'radio' : 'radio-outline'}
              size={26}
              color={isFocused ? '#FFFFFF' : 'rgba(255,255,255,0.55)'}
            />
            {isFocused && <View style={fabStyles.fabGlow} />}
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </View>
  );
}

// ─── Custom tab bar ───────────────────────────────────────────────────────────

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { unreadCount } = useApp();
  const { colors: C } = useTheme();
  const barStyles = useMemo(() => makeBarStyles(C), [C]);

  const activeRoute = state.routes[state.index]?.name;

  const navigate = (name: string) => {
    const route = state.routes.find((r: any) => r.name === name);
    if (!route) return;
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (activeRoute !== name && !event.defaultPrevented) {
      navigation.navigate(name);
    }
  };

  if (activeRoute === 'live') return null;

  return (
    <View style={[barStyles.outerWrap, { paddingBottom: insets.bottom + 8 }]}>
      <View style={barStyles.bar}>
        {/* Left tabs */}
        <View style={barStyles.tabGroup}>
          {LEFT_TABS.map((tab) => (
            <TabButton
              key={tab.name}
              config={tab}
              isFocused={activeRoute === tab.name}
              onPress={() => navigate(tab.name)}
              badge={tab.name === 'index' ? unreadCount : undefined}
              C={C}
            />
          ))}
        </View>

        {/* Center FAB */}
        <LiveFab
          isFocused={activeRoute === 'live'}
          onPress={() => navigate('live')}
        />

        {/* Right tabs */}
        <View style={barStyles.tabGroup}>
          {RIGHT_TABS.map((tab) => (
            <TabButton
              key={tab.name}
              config={tab}
              isFocused={activeRoute === tab.name}
              onPress={() => navigate(tab.name)}
              C={C}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="live" />
      <Tabs.Screen name="activity" />
      <Tabs.Screen name="chats" options={{ href: null }} />
      <Tabs.Screen name="gifts" options={{ href: null }} />
      <Tabs.Screen name="wallet" options={{ href: null }} />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const FAB_SIZE = 58;
const FAB_LIFT = 20;

function makeBarStyles(C: AppColors) {
  return StyleSheet.create({
    outerWrap: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      pointerEvents: 'box-none',
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '90%',
      height: 64,
      backgroundColor: C.bgDeep,
      borderRadius: 32,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 20,
      overflow: 'visible',
    },
    tabGroup: {
      flexDirection: 'row',
      flex: 1,
      justifyContent: 'space-evenly',
    },
  });
}

function makeTabBtnStyles(C: AppColors) {
  return StyleSheet.create({
    tabBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      gap: 4,
    },
    iconContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 40,
      height: 34,
    },
    activeDot: {
      width: 18,
      height: 3,
      borderRadius: 2,
      overflow: 'hidden',
    },
    activeDotGrad: {
      flex: 1,
      borderRadius: 2,
    },
    badge: {
      position: 'absolute',
      top: -3,
      right: -3,
      minWidth: 15,
      height: 15,
      borderRadius: 8,
      backgroundColor: C.pink,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
      borderWidth: 1.5,
      borderColor: C.bgDeep,
    },
    badgeText: {
      fontFamily: 'DMSans-Bold',
      fontSize: 8,
      color: '#FFFFFF',
    },
  });
}

// Static FAB styles (camera preview always dark, FAB lives on camera)
const fabStyles = StyleSheet.create({
  fabWrapper: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    marginTop: -FAB_LIFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  fabActive: {
    borderColor: 'rgba(255,45,135,0.5)',
    shadowColor: '#FF2D87',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 12,
  },
  fabGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: FAB_SIZE / 2,
    backgroundColor: 'rgba(255,45,135,0.12)',
  },
});
