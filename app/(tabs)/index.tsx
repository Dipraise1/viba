import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { PLATFORMS } from '@/constants/platforms';
import { useApp } from '@/context/AppContext';
import { MIN_VIBA_TO_STREAM } from '@/context/AppContext';

const { width } = Dimensions.get('window');

// Pulsing live dot
function LiveDot() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.7);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 700 }),
        withTiming(1, { duration: 700 })
      ),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700 }),
        withTiming(0.4, { duration: 700 })
      ),
      -1,
      false
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[liveDotStyles.dot, style]} />
  );
}

const liveDotStyles = StyleSheet.create({
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
});

function StreamStatCard({
  label,
  value,
  sub,
  color,
  delay,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  delay: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(500)} style={[statStyles.card, { borderColor: color + '30' }]}>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
      {sub && <Text style={statStyles.sub}>{sub}</Text>}
    </Animated.View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 2,
  },
  value: {
    fontFamily: 'Syne-Bold',
    fontSize: 22,
  },
  label: {
    fontFamily: 'DMSans-Regular',
    fontSize: 11,
    color: Colors.textMuted,
  },
  sub: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: Colors.success,
    marginTop: 2,
  },
});

function PlatformStatusRow() {
  const { platforms } = useApp();
  const connectedIds = platforms.filter((p) => p.connected).map((p) => p.id);

  return (
    <View style={platformStyles.row}>
      {PLATFORMS.map((p) => {
        const isOn = connectedIds.includes(p.id);
        return (
          <View key={p.id} style={[platformStyles.pill, !isOn && platformStyles.pillOff]}>
            <FontAwesome5 name={p.icon} size={12} color={isOn ? '#FFFFFF' : Colors.textMuted} solid />
            <Text style={[platformStyles.name, !isOn && platformStyles.nameOff]}>{p.name}</Text>
            {isOn && <View style={platformStyles.onDot} />}
          </View>
        );
      })}
    </View>
  );
}

const platformStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.bgGlass,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderBright,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pillOff: {
    backgroundColor: 'transparent',
    borderColor: Colors.border,
    opacity: 0.5,
  },
  name: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: Colors.textPrimary,
  },
  nameOff: {
    color: Colors.textMuted,
  },
  onDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
});

function RecentStreamCard({
  title,
  date,
  duration,
  viewers,
  gifts,
}: {
  title: string;
  date: string;
  duration: string;
  viewers: string;
  gifts: string;
}) {
  return (
    <View style={recentStyles.card}>
      <View style={recentStyles.top}>
        <View style={recentStyles.titleRow}>
          <Ionicons name="recording-outline" size={14} color={Colors.pink} />
          <Text style={recentStyles.title} numberOfLines={1}>{title}</Text>
        </View>
        <Text style={recentStyles.date}>{date}</Text>
      </View>
      <View style={recentStyles.stats}>
        <View style={recentStyles.stat}>
          <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
          <Text style={recentStyles.statText}>{duration}</Text>
        </View>
        <View style={recentStyles.stat}>
          <Ionicons name="eye-outline" size={12} color={Colors.textMuted} />
          <Text style={recentStyles.statText}>{viewers}</Text>
        </View>
        <View style={recentStyles.stat}>
          <Ionicons name="gift-outline" size={12} color={Colors.gold} />
          <Text style={[recentStyles.statText, { color: Colors.gold }]}>{gifts}</Text>
        </View>
      </View>
    </View>
  );
}

const recentStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 10,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  title: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
  },
  date: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 8,
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: Colors.textSecondary,
  },
});

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { profile, platforms, unreadCount, tokenBalance } = useApp();
  const connectedCount = platforms.filter((p) => p.connected).length;
  const canStream = tokenBalance >= MIN_VIBA_TO_STREAM;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 20 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(0).duration(500)} style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good evening</Text>
          <Text style={styles.username}>{profile.handle}</Text>
        </View>
        <TouchableOpacity
          style={styles.notifBtn}
          activeOpacity={0.7}
          onPress={() => router.push('/notifications')}
        >
          <Ionicons name="notifications-outline" size={22} color={Colors.textSecondary} />
          {unreadCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Go Live banner */}
      <Animated.View entering={FadeInDown.delay(100).duration(500)}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.goLiveBanner}
          onPress={() => router.push('/(tabs)/live')}
        >
          <LinearGradient
            colors={['#FF2D87', '#7B2FFF']}
            style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.bannerLeft}>
            <View style={styles.bannerLiveRow}>
              <LiveDot />
              <Text style={styles.bannerReadyText}>Ready to go live</Text>
            </View>
            <Text style={styles.bannerTitle}>Start streaming now</Text>
            <Text style={styles.bannerSub}>{connectedCount} platform{connectedCount !== 1 ? 's' : ''} connected · earn $VIBA</Text>
          </View>
          <View style={styles.bannerRight}>
            <View style={styles.bannerBtn}>
              <Ionicons name="radio" size={20} color={Colors.pink} />
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Stats row */}
      <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>This week</Text>
        <Text style={styles.sectionSub}>across all platforms</Text>
      </Animated.View>
      <View style={styles.statsRow}>
        <StreamStatCard label="Viewers" value="4.2K" sub="+18%" color={Colors.pink} delay={250} />
        <StreamStatCard label="Gifts" value="$312" sub="+34%" color={Colors.gold} delay={300} />
        <StreamStatCard label="Follows" value="890" sub="+12%" color={Colors.purpleLight} delay={350} />
      </View>

      {/* Viba Token earnings card */}
      <Animated.View entering={FadeInDown.delay(370).duration(500)}>
        <View style={styles.tokenCard}>
          <LinearGradient
            colors={['rgba(123,47,255,0.18)', 'rgba(255,45,135,0.10)']}
            style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.tokenLeft}>
            <View style={styles.tokenBadge}>
              <Text style={styles.tokenBadgeText}>$VIBA</Text>
            </View>
            <Text style={styles.tokenTitle}>Token earnings</Text>
            <Text style={styles.tokenSub}>Earned from streaming</Text>
          </View>
          <View style={styles.tokenRight}>
            <Text style={styles.tokenAmount}>1,240</Text>
            <Text style={styles.tokenAmountUnit}>$VIBA</Text>
            <View style={styles.tokenGain}>
              <Ionicons name="trending-up" size={11} color="#34D399" />
              <Text style={styles.tokenGainText}>+180 this week</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Connected platforms */}
      <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Connected platforms</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(tabs)/profile')}>
          <Text style={styles.sectionAction}>Manage</Text>
        </TouchableOpacity>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(430).duration(500)}>
        <PlatformStatusRow />
      </Animated.View>

      {/* Recent streams */}
      <Animated.View entering={FadeInDown.delay(520).duration(500)} style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent streams</Text>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={styles.sectionAction}>See all</Text>
        </TouchableOpacity>
      </Animated.View>
      <View style={styles.recentList}>
        <Animated.View entering={FadeInDown.delay(560).duration(500)}>
          <RecentStreamCard
            title="Saturday Night Stream"
            date="Yesterday"
            duration="1h 42m"
            viewers="1.2K"
            gifts="$94"
          />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(600).duration(500)}>
          <RecentStreamCard
            title="Q&A with followers"
            date="3 days ago"
            duration="55m"
            viewers="780"
            gifts="$47"
          />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(640).duration(500)}>
          <RecentStreamCard
            title="Morning vibes"
            date="Last week"
            duration="30m"
            viewers="420"
            gifts="$21"
          />
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    paddingHorizontal: 20,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  greeting: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: Colors.textMuted,
  },
  username: {
    fontFamily: 'Syne-Bold',
    fontSize: 22,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.pink,
    borderWidth: 1.5,
    borderColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 9,
    color: '#FFFFFF',
  },
  goLiveBanner: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  bannerLeft: {
    flex: 1,
    gap: 4,
  },
  bannerLiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  bannerReadyText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bannerTitle: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 22,
    color: '#FFFFFF',
  },
  bannerSub: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  bannerRight: {
    marginLeft: 16,
  },
  bannerBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 2,
  },
  sectionTitle: {
    fontFamily: 'Syne-Bold',
    fontSize: 16,
    color: Colors.textPrimary,
  },
  sectionSub: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  sectionAction: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: Colors.pink,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  recentList: {
    gap: 10,
  },
  tokenCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(123,47,255,0.3)',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  tokenLeft: {
    gap: 4,
    flex: 1,
  },
  tokenBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(123,47,255,0.25)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginBottom: 2,
  },
  tokenBadgeText: {
    fontFamily: 'Syne-Bold',
    fontSize: 10,
    color: '#C084FC',
    letterSpacing: 1,
  },
  tokenTitle: {
    fontFamily: 'Syne-Bold',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  tokenSub: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  tokenRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  tokenAmount: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 26,
    background: 'linear-gradient(90deg, #FF2D87, #7B2FFF)',
    color: '#C084FC',
  },
  tokenAmountUnit: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: 'rgba(192,132,252,0.6)',
    marginTop: -4,
  },
  tokenGain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  tokenGainText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#34D399',
  },
});
