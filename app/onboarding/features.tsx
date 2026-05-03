import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import GradientButton from '@/components/GradientButton';
import CommentBubble from '@/components/CommentBubble';

const { width } = Dimensions.get('window');

// --- Slide 1: Connect Your Platforms ---
function SlideConnect() {
  const icons = [
    { icon: 'tiktok', color: '#FFFFFF', bg: '#010101', label: 'TikTok', delay: 0 },
    { icon: 'instagram', color: '#FFFFFF', bg: '#E1306C', label: 'Instagram', delay: 80 },
    { icon: 'youtube', color: '#FFFFFF', bg: '#FF0000', label: 'YouTube', delay: 160 },
    { icon: 'facebook', color: '#FFFFFF', bg: '#1877F2', label: 'Facebook', delay: 240 },
    { icon: 'twitch', color: '#FFFFFF', bg: '#9146FF', label: 'Twitch', delay: 320 },
  ];

  return (
    <View style={slideStyles.illustration}>
      {/* Center link icon */}
      <Animated.View entering={FadeInDown.delay(200).duration(600).springify()} style={slideStyles.liveBadgeWrap}>
        <LinearGradient
          colors={['#FF2D87', '#7B2FFF']}
          style={slideStyles.liveBadge}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <FontAwesome5 name="link" size={16} color="#FFFFFF" solid />
          <Text style={slideStyles.liveText}>CONNECT</Text>
        </LinearGradient>
        <View style={slideStyles.liveGlow} />
      </Animated.View>

      {/* Platform icons with connected checkmarks */}
      <View style={slideStyles.platformRow}>
        {icons.map((p, i) => (
          <Animated.View
            key={p.icon}
            entering={FadeInDown.delay(300 + p.delay).duration(500).springify()}
            style={{ alignItems: 'center', gap: 4 }}
          >
            <View style={[slideStyles.platformIcon, { backgroundColor: p.bg }]}>
              <FontAwesome5 name={p.icon} size={20} color={p.color} solid />
            </View>
            <View style={slideStyles.connectLine} />
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

// --- Slide 2 (formerly 1): Stream Everywhere ---
function SlideStream() {
  const icons = [
    { icon: 'tiktok', color: '#FFFFFF', bg: '#010101', delay: 0 },
    { icon: 'instagram', color: '#FFFFFF', bg: '#E1306C', delay: 80 },
    { icon: 'youtube', color: '#FFFFFF', bg: '#FF0000', delay: 160 },
    { icon: 'facebook', color: '#FFFFFF', bg: '#1877F2', delay: 240 },
    { icon: 'twitch', color: '#FFFFFF', bg: '#9146FF', delay: 320 },
  ];

  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withTiming(1, { duration: 1200 });
  }, []);

  return (
    <View style={slideStyles.illustration}>
      {/* Center live badge */}
      <Animated.View entering={FadeInDown.delay(200).duration(600).springify()} style={slideStyles.liveBadgeWrap}>
        <LinearGradient
          colors={['#FF2D87', '#7B2FFF']}
          style={slideStyles.liveBadge}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={slideStyles.liveDot} />
          <Text style={slideStyles.liveText}>LIVE</Text>
        </LinearGradient>
        <View style={slideStyles.liveGlow} />
      </Animated.View>

      {/* Platform icons in arc */}
      <View style={slideStyles.platformRow}>
        {icons.map((p, i) => (
          <Animated.View
            key={p.icon}
            entering={FadeInDown.delay(300 + p.delay).duration(500).springify()}
          >
            <View style={[slideStyles.platformIcon, { backgroundColor: p.bg }]}>
              <FontAwesome5 name={p.icon} size={20} color={p.color} solid />
            </View>
            {/* Connecting line up to live badge */}
            <View style={[
              slideStyles.connectLine,
              { backgroundColor: i === 2 ? Colors.pink : Colors.border },
            ]} />
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

// --- Slide 2: Unified Comments ---
function SlideComments() {
  const sampleComments = [
    { platform: 'tiktok' as const, username: '@nova_streams', text: 'omg this is fire 🔥', type: 'comment' as const },
    { platform: 'instagram' as const, username: '@realbeatriz', text: 'love the energy!!', type: 'comment' as const },
    { platform: 'youtube' as const, username: 'MarcusLive', text: 'first time watching, staying forever', type: 'comment' as const },
  ];

  return (
    <View style={slideStyles.illustration}>
      <View style={slideStyles.commentStack}>
        {sampleComments.map((c, i) => (
          <Animated.View
            key={i}
            entering={FadeInDown.delay(200 + i * 120).duration(500).springify()}
          >
            <CommentBubble
              platform={c.platform}
              username={c.username}
              text={c.text}
              type={c.type}
            />
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

// --- Slide 3: Gifts ---
function SlideGifts() {
  const gifts = [
    { ionicon: 'rose',        name: 'Rose',  count: 24, value: '$48',  platform: 'TikTok',   colors: ['#FF2D87', '#FF6BB3'] as [string,string], pct: 0.9 },
    { ionicon: 'star',        name: 'Star',  count: 50, value: '$62',  platform: 'Facebook', colors: ['#FFB800', '#FFD460'] as [string,string], pct: 1.0 },
    { ionicon: 'heart',       name: 'Heart', count: 12, value: '$22',  platform: 'Twitch',   colors: ['#7B2FFF', '#A855F7'] as [string,string], pct: 0.45 },
    { ionicon: 'gift',        name: 'Gift',  count: 8,  value: '$16',  platform: 'YouTube',  colors: ['#FF4500', '#FF7043'] as [string,string], pct: 0.32 },
  ];

  return (
    <View style={slideStyles.illustration}>
      <View style={slideStyles.giftsList}>
        {gifts.map((g, i) => (
          <Animated.View
            key={g.name}
            entering={FadeInDown.delay(180 + i * 90).duration(450).springify()}
            style={slideStyles.giftRow}
          >
            <LinearGradient
              colors={g.colors}
              style={slideStyles.giftIconBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name={g.ionicon as any} size={16} color="#FFFFFF" />
            </LinearGradient>

            <View style={slideStyles.giftMeta}>
              <View style={slideStyles.giftTopRow}>
                <Text style={slideStyles.giftName}>{g.name}</Text>
                <Text style={[slideStyles.giftValue, { color: g.colors[0] }]}>{g.value}</Text>
              </View>
              <View style={slideStyles.giftBottomRow}>
                <Text style={slideStyles.giftPlatform}>{g.platform} · ×{g.count}</Text>
              </View>
              <View style={slideStyles.giftBarTrack}>
                <LinearGradient
                  colors={g.colors}
                  style={[slideStyles.giftBarFill, { width: `${g.pct * 100}%` }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
            </View>
          </Animated.View>
        ))}
      </View>

      {/* Total bar */}
      <Animated.View
        entering={FadeInDown.delay(640).duration(500)}
        style={slideStyles.totalBar}
      >
        <LinearGradient
          colors={[Colors.pink + '20', Colors.purple + '20']}
          style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
        <View style={slideStyles.totalLeft}>
          <Ionicons name="trending-up" size={14} color={Colors.pink} />
          <Text style={slideStyles.totalLabel}>Today's total</Text>
        </View>
        <Text style={slideStyles.totalValue}>$147.50</Text>
      </Animated.View>
    </View>
  );
}

const SLIDES = [
  {
    id: 'connect',
    title: 'Connect Your Platforms',
    subtitle: 'Link your social accounts once.\nViba syncs everything automatically.',
    Illustration: SlideConnect,
  },
  {
    id: 'stream',
    title: 'Go Live Everywhere',
    subtitle: 'One tap. Every platform.\nSimultaneously.',
    Illustration: SlideStream,
  },
  {
    id: 'comments',
    title: 'Unified Comments',
    subtitle: 'Reply to every fan, from every app,\nin one place.',
    Illustration: SlideComments,
  },
  {
    id: 'gifts',
    title: 'Track Every Gift',
    subtitle: 'See TikTok roses, Facebook Stars,\nand more — all in one feed.',
    Illustration: SlideGifts,
  },
];

export default function FeaturesScreen() {
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    if (idx !== activeSlide) {
      setActiveSlide(idx);
      Haptics.selectionAsync();
    }
  };

  const handleNext = () => {
    if (activeSlide < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (activeSlide + 1) * width, animated: true });
      setActiveSlide(activeSlide + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push('/onboarding/connect');
    }
  };

  const handleSkip = () => {
    router.push('/onboarding/connect');
  };

  return (
    <View style={styles.container}>
      {/* Top nav */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.topNav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {SLIDES.map((slide, i) => {
          const Illus = slide.Illustration;
          return (
            <View key={slide.id} style={[styles.slide, { width }]}>
              <View style={styles.illustrationWrap}>
                <Illus />
              </View>
              <Animated.Text
                entering={FadeInDown.delay(300).duration(500)}
                style={styles.slideTitle}
              >
                {slide.title}
              </Animated.Text>
              <Animated.Text
                entering={FadeInDown.delay(420).duration(500)}
                style={styles.slideSubtitle}
              >
                {slide.subtitle}
              </Animated.Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Dots + CTA */}
      <Animated.View entering={FadeInUp.delay(600).duration(500)} style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <DotIndicator key={i} active={i === activeSlide} />
          ))}
        </View>
        <GradientButton
          label={activeSlide === SLIDES.length - 1 ? 'Connect Platforms →' : 'Next'}
          onPress={handleNext}
          size="large"
        />
      </Animated.View>
    </View>
  );
}

function DotIndicator({ active }: { active: boolean }) {
  const width = useSharedValue(active ? 28 : 8);
  const opacity = useSharedValue(active ? 1 : 0.3);

  useEffect(() => {
    width.value = withSpring(active ? 28 : 8, { damping: 15 });
    opacity.value = withTiming(active ? 1 : 0.3, { duration: 200 });
  }, [active]);

  const style = useAnimatedStyle(() => ({
    width: width.value,
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={style}>
      <LinearGradient
        colors={active ? ['#FF2D87', '#7B2FFF'] : [Colors.border, Colors.border]}
        style={dotStyles.dot}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />
    </Animated.View>
  );
}

const dotStyles = StyleSheet.create({
  dot: { height: 8, borderRadius: 4 },
});

const slideStyles = StyleSheet.create({
  illustration: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 24,
  },
  liveBadgeWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 32,
    gap: 8,
    zIndex: 1,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    opacity: 0.9,
  },
  liveText: {
    fontFamily: 'Syne-Bold',
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: 3,
  },
  liveGlow: {
    position: 'absolute',
    width: 160,
    height: 50,
    backgroundColor: Colors.pink,
    opacity: 0.25,
    borderRadius: 40,
    top: 0,
    shadowColor: Colors.pink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 10,
  },
  platformRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
  },
  platformIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  connectLine: {
    width: 2,
    height: 20,
    alignSelf: 'center',
    marginTop: 2,
    borderRadius: 1,
  },
  commentStack: {
    width: '100%',
    gap: 10,
    paddingHorizontal: 8,
  },
  giftsList: {
    width: '100%',
    gap: 8,
  },
  giftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  giftIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftMeta: {
    flex: 1,
    gap: 5,
  },
  giftTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  giftBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  giftName: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    color: Colors.textPrimary,
  },
  giftValue: {
    fontFamily: 'Syne-Bold',
    fontSize: 14,
  },
  giftPlatform: {
    fontFamily: 'DMSans-Regular',
    fontSize: 11,
    color: Colors.textMuted,
  },
  giftBarTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  giftBarFill: {
    height: 3,
    borderRadius: 2,
  },
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderPink,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginTop: 4,
    overflow: 'hidden',
  },
  totalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  totalLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  totalValue: {
    fontFamily: 'Syne-Bold',
    fontSize: 20,
    color: Colors.pink,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgDeep,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bgGlass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  skipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 15,
    color: Colors.textMuted,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  illustrationWrap: {
    height: 280,
    marginBottom: 32,
  },
  slideTitle: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 30,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  slideSubtitle: {
    fontFamily: 'DMSans-Regular',
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  footer: {
    paddingHorizontal: 28,
    paddingBottom: 48,
    paddingTop: 16,
    alignItems: 'center',
    gap: 24,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
});
