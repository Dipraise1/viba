import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/themes';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { getPlatform } from '@/constants/platforms';

const GRADIENT_POOL: [string, string, string][] = [
  ['#FF2D87', '#C020E0', '#7B2FFF'],
  ['#FF6B35', '#FF2D87', '#C020E0'],
  ['#00D4AA', '#0094FF', '#7B2FFF'],
  ['#FFD700', '#FF6B35', '#FF2D87'],
  ['#00C9FF', '#92FE9D', '#00D4AA'],
  ['#FC466B', '#3F5EFB', '#7B2FFF'],
  ['#f7971e', '#ffd200', '#FF6B35'],
  ['#11998e', '#38ef7d', '#00D4AA'],
];

function creatorGradient(id: string): [string, string, string] {
  return GRADIENT_POOL[id.charCodeAt(0) % GRADIENT_POOL.length];
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '??';
}

interface Creator {
  id: string;
  handle: string;
  display_name: string;
  total_viewers: number;
  platforms: string[] | null;
  is_live: boolean;
  stream_count: number;
}

const TOPICS = [
  { id: 'music', label: 'Music', icon: 'music' },
  { id: 'gaming', label: 'Gaming', icon: 'gamepad' },
  { id: 'beauty', label: 'Beauty', icon: 'magic' },
  { id: 'fitness', label: 'Fitness', icon: 'dumbbell' },
  { id: 'talk', label: 'Talk', icon: 'microphone' },
  { id: 'dance', label: 'Dance', icon: 'star' },
  { id: 'art', label: 'Art', icon: 'paint-brush' },
  { id: 'food', label: 'Food', icon: 'utensils' },
];

const TOPIC_GRADS: [string, string][] = [
  ['#FF2D87', '#C020E0'],
  ['#7B2FFF', '#3F5EFB'],
  ['#FF6B35', '#FF2D87'],
  ['#00D4AA', '#0094FF'],
  ['#f7971e', '#ffd200'],
  ['#FC466B', '#3F5EFB'],
  ['#11998e', '#38ef7d'],
  ['#FFD700', '#FF6B35'],
];

function CreatorResult({ creator, index, C }: { creator: Creator; index: number; C: AppColors }) {
  const grad = creatorGradient(creator.id);

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(320)}>
      <TouchableOpacity style={resS.row} activeOpacity={0.75}>
        <View style={resS.avatarWrap}>
          <LinearGradient colors={grad} style={resS.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={resS.avatarText}>{initials(creator.display_name || creator.handle)}</Text>
          </LinearGradient>
          {creator.is_live && <View style={[resS.liveDot, { borderColor: C.bg }]} />}
        </View>
        <View style={resS.info}>
          <View style={resS.nameRow}>
            <Text style={[resS.name, { color: C.textPrimary }]} numberOfLines={1}>
              {creator.display_name || creator.handle}
            </Text>
            {creator.is_live && (
              <View style={resS.livePill}>
                <Text style={resS.livePillText}>LIVE</Text>
              </View>
            )}
          </View>
          <Text style={[resS.handle, { color: C.textMuted }]} numberOfLines={1}>
            @{creator.handle} · {creator.stream_count} stream{creator.stream_count !== 1 ? 's' : ''}
          </Text>
        </View>
        {(creator.platforms ?? []).length > 0 && (
          <View style={resS.platforms}>
            {(creator.platforms ?? []).slice(0, 3).map((p) => {
              try {
                const plat = getPlatform(p as any);
                return (
                  <View key={p} style={[resS.platDot, { backgroundColor: plat.gradient[0] + '22' }]}>
                    <FontAwesome5 name={plat.icon} size={8} color={plat.gradient[0]} solid />
                  </View>
                );
              } catch { return null; }
            })}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const resS = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 11 },
  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatar: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Syne-Bold', fontSize: 16, color: '#FFFFFF' },
  liveDot: { position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: 6, backgroundColor: '#FF2D87', borderWidth: 2 },
  info: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  name: { fontFamily: 'DMSans-Bold', fontSize: 14 },
  livePill: { backgroundColor: '#FF2D87', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  livePillText: { fontFamily: 'DMSans-Bold', fontSize: 9, color: '#FFFFFF', letterSpacing: 0.4 },
  handle: { fontFamily: 'DMSans-Regular', fontSize: 12 },
  platforms: { flexDirection: 'row', gap: 4 },
  platDot: { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
});

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Creator[]>([]);
  const [allCreators, setAllCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);

  // Load all creators once for instant search
  React.useEffect(() => {
    supabase
      .from('creator_discover')
      .select('*')
      .order('is_live', { ascending: false })
      .order('total_viewers', { ascending: false })
      .limit(60)
      .then(({ data }) => {
        if (data) setAllCreators(data.filter((c: Creator) => c.id !== user?.id));
      });

    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, [user?.id]);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (!text.trim()) { setResults([]); return; }
    const q = text.toLowerCase();
    setResults(
      allCreators.filter(
        (c) =>
          (c.display_name ?? '').toLowerCase().includes(q) ||
          c.handle.toLowerCase().includes(q)
      )
    );
  }, [allCreators]);

  const displayCreators = query.trim() ? results : allCreators;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          activeOpacity={0.7}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={[styles.searchBar, { backgroundColor: C.bgCard, borderColor: C.border }]}>
          <Ionicons name="search-outline" size={16} color={C.textMuted} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: C.textPrimary }]}
            placeholder="Search creators, topics..."
            placeholderTextColor={C.textMuted}
            value={query}
            onChangeText={handleSearch}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Topics grid — show when not searching */}
        {!query.trim() && (
          <>
            <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Browse topics</Text>
            <View style={styles.topicsGrid}>
              {TOPICS.map((topic, i) => {
                const active = activeTopic === topic.id;
                const [c1, c2] = TOPIC_GRADS[i % TOPIC_GRADS.length];
                return (
                  <TouchableOpacity
                    key={topic.id}
                    activeOpacity={0.8}
                    style={[styles.topicChip, active && styles.topicChipActive, !active && { borderColor: C.border, backgroundColor: C.bgCard }]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setActiveTopic(active ? null : topic.id);
                    }}
                  >
                    {active && (
                      <LinearGradient
                        colors={[c1, c2]} style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      />
                    )}
                    <FontAwesome5 name={topic.icon} size={13} color={active ? '#FFFFFF' : C.textMuted} solid />
                    <Text style={[styles.topicLabel, { color: active ? '#FFFFFF' : C.textSecondary }]}>{topic.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.sectionTitle, { color: C.textPrimary, marginTop: 4 }]}>All creators</Text>
          </>
        )}

        {/* Results / creator list */}
        {allCreators.length === 0 ? (
          <ActivityIndicator color={C.pink} style={{ marginTop: 40 }} />
        ) : displayCreators.length === 0 && query.trim() ? (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={40} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No results</Text>
            <Text style={[styles.emptySub, { color: C.textMuted }]}>Try a different name or handle.</Text>
          </View>
        ) : (
          <View style={[styles.resultsList, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            {displayCreators.map((c, i) => (
              <View key={c.id}>
                <CreatorResult creator={c} index={i} C={C} />
                {i < displayCreators.length - 1 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 16, paddingBottom: 12,
    },
    backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    searchBar: {
      flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
      borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10,
    },
    searchInput: { flex: 1, fontFamily: 'DMSans-Regular', fontSize: 14, padding: 0 },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, gap: 12 },
    sectionTitle: { fontFamily: 'Syne-Bold', fontSize: 16 },
    topicsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    topicChip: {
      flexDirection: 'row', alignItems: 'center', gap: 7,
      paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12,
      borderWidth: 1, overflow: 'hidden',
    },
    topicChipActive: {},
    topicLabel: { fontFamily: 'DMSans-Medium', fontSize: 13 },
    resultsList: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
    divider: { height: 1, marginLeft: 76 },
    empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
    emptyTitle: { fontFamily: 'Syne-Bold', fontSize: 16 },
    emptySub: { fontFamily: 'DMSans-Regular', fontSize: 13, textAlign: 'center' },
  });
}
