import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Tabs, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

type TabItem = {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
};

const TABS: TabItem[] = [
  { name: 'index', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { name: 'live', label: 'Go Live', icon: 'radio-outline', iconActive: 'radio' },
  { name: 'comments', label: 'Activity', icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
  { name: 'wallet', label: 'Wallet', icon: 'wallet-outline', iconActive: 'wallet' },
  { name: 'profile', label: 'Profile', icon: 'person-outline', iconActive: 'person' },
];

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { unreadCount, tokenBalance } = useApp();

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom + 6 }]}>
      <View style={styles.tabBarInner}>
        {state.routes.map((route: any, index: number) => {
          const tab = TABS.find((t) => t.name === route.name) ?? TABS[0];
          const isFocused = state.index === index;
          const isLive = route.name === 'live';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (isLive) {
            return (
              <TouchableOpacity key={route.key} onPress={onPress} style={styles.tabItem} activeOpacity={0.7}>
                <View style={[styles.liveButton, isFocused && styles.liveButtonActive]}>
                  <Ionicons name={isFocused ? tab.iconActive : tab.icon} size={20} color="#FFFFFF" />
                </View>
                <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive, styles.tabLabelLive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          }

          const badge = route.name === 'index' && unreadCount > 0
            ? unreadCount
            : route.name === 'wallet' && tokenBalance < 10
            ? '!'
            : null;

          return (
            <TouchableOpacity key={route.key} onPress={onPress} style={styles.tabItem} activeOpacity={0.7}>
              <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
                <Ionicons
                  name={isFocused ? tab.iconActive : tab.icon}
                  size={22}
                  color={isFocused ? Colors.pink : Colors.textMuted}
                />
                {badge && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="live" />
      <Tabs.Screen name="comments" />
      <Tabs.Screen name="wallet" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(10,10,18,0.97)',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  tabBarInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  iconWrap: {
    width: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  iconWrapActive: {
    backgroundColor: Colors.pinkDim,
  },
  liveButton: {
    width: 48,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.bgGlass,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveButtonActive: {
    backgroundColor: Colors.pink,
    borderColor: Colors.pink,
  },
  tabLabel: {
    fontFamily: 'DMSans-Regular',
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: Colors.pink,
    fontFamily: 'DMSans-Medium',
  },
  tabLabelLive: {
    color: Colors.textSecondary,
  },
  tabBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.bg,
  },
  tabBadgeText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 9,
    color: '#FFFFFF',
  },
});
