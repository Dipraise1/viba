import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { PLATFORMS, PlatformId, getPlatform } from '@/constants/platforms';
import GradientButton from '@/components/GradientButton';

const { width, height } = Dimensions.get('window');

type OAuthStage = 'confirm' | 'loading' | 'success';

// ─── OAuth Modal ──────────────────────────────────────────────────────────────

function OAuthModal({
  platformId,
  visible,
  onSuccess,
  onCancel,
}: {
  platformId: PlatformId | null;
  visible: boolean;
  onSuccess: (id: PlatformId) => void;
  onCancel: () => void;
}) {
  const [stage, setStage] = useState<OAuthStage>('confirm');
  const platform = platformId ? getPlatform(platformId) : null;

  const handleAuthorize = () => {
    if (!platformId || !platform) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStage('loading');
    // Simulate OAuth redirect + token exchange
    setTimeout(() => {
      setStage('success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        setStage('confirm');
        onSuccess(platformId);
      }, 900);
    }, 2000);
  };

  const handleCancel = () => {
    setStage('confirm');
    onCancel();
  };

  if (!platform || !platformId) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
      <View style={modalStyles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleCancel} activeOpacity={1} />
        <Animated.View entering={FadeInUp.duration(300).springify()} style={modalStyles.sheet}>
          {/* Handle */}
          <View style={modalStyles.handle} />

          {/* Platform brand header */}
          <LinearGradient
            colors={platform.gradient as any}
            style={modalStyles.brandHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <FontAwesome5 name={platform.icon} size={32} color="#FFFFFF" solid />
          </LinearGradient>

          {stage === 'confirm' && (
            <>
              <Text style={modalStyles.title}>Connect {platform.name}</Text>
              <Text style={modalStyles.subtitle}>
                Viba will be authorized to stream live on your behalf. We never post without your action.
              </Text>

              {/* Permission list */}
              <View style={modalStyles.permList}>
                {[
                  'Start and manage live streams',
                  'Read comments during streams',
                  'Read gift/reward events',
                ].map((perm) => (
                  <View key={perm} style={modalStyles.permRow}>
                    <View style={[modalStyles.permDot, { backgroundColor: platform.gradient[0] as string }]}>
                      <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                    </View>
                    <Text style={modalStyles.permText}>{perm}</Text>
                  </View>
                ))}
              </View>

              <View style={modalStyles.actions}>
                <TouchableOpacity style={modalStyles.cancelBtn} onPress={handleCancel} activeOpacity={0.7}>
                  <Text style={modalStyles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={modalStyles.authorizeBtn} onPress={handleAuthorize} activeOpacity={0.85}>
                  <LinearGradient
                    colors={platform.gradient as any}
                    style={modalStyles.authorizeBtnGrad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <FontAwesome5 name={platform.icon} size={14} color="#FFFFFF" solid />
                    <Text style={modalStyles.authorizeText}>Authorize {platform.name}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}

          {stage === 'loading' && (
            <View style={modalStyles.loadingState}>
              <ActivityIndicator color={platform.gradient[0] as string} size="large" />
              <Text style={modalStyles.loadingTitle}>Connecting…</Text>
              <Text style={modalStyles.loadingText}>
                Redirecting to {platform.name} to complete authorization
              </Text>
            </View>
          )}

          {stage === 'success' && (
            <Animated.View entering={ZoomIn.duration(400).springify()} style={modalStyles.successState}>
              <View style={[modalStyles.successCircle, { backgroundColor: platform.gradient[0] as string }]}>
                <Ionicons name="checkmark" size={32} color="#FFFFFF" />
              </View>
              <Text style={modalStyles.successTitle}>{platform.name} connected!</Text>
              <Text style={modalStyles.successText}>Your account is now linked to Viba.</Text>
            </Animated.View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: '#13131F',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 14,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginTop: 12,
    marginBottom: 4,
  },
  brandHeader: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  title: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 22,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  permList: {
    width: '100%',
    gap: 10,
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  permDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 15,
    color: Colors.textSecondary,
  },
  authorizeBtn: {
    flex: 2,
    borderRadius: 14,
    overflow: 'hidden',
  },
  authorizeBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  authorizeText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 14,
    width: '100%',
  },
  loadingTitle: {
    fontFamily: 'Syne-Bold',
    fontSize: 18,
    color: Colors.textPrimary,
  },
  loadingText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  successState: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 12,
    width: '100%',
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontFamily: 'Syne-Bold',
    fontSize: 20,
    color: Colors.textPrimary,
  },
  successText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: Colors.textMuted,
  },
});

// ─── Platform row ─────────────────────────────────────────────────────────────

function PlatformRow({
  platformId,
  isConnected,
  onConnect,
  onDisconnect,
  index,
}: {
  platformId: PlatformId;
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  index: number;
}) {
  const platform = getPlatform(platformId);

  return (
    <Animated.View
      entering={FadeInDown.delay(200 + index * 70).duration(500).springify()}
      style={[rowStyles.card, isConnected && rowStyles.cardConnected]}
    >
      <View style={[rowStyles.icon, { backgroundColor: platform.gradient[0] as string }]}>
        <FontAwesome5 name={platform.icon} size={18} color="#FFFFFF" solid />
      </View>
      <View style={rowStyles.info}>
        <Text style={rowStyles.name}>{platform.name}</Text>
        <Text style={[rowStyles.status, isConnected && rowStyles.statusConnected]}>
          {isConnected ? 'Connected' : 'Not connected'}
        </Text>
      </View>
      {isConnected ? (
        <View style={rowStyles.connectedBadge}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
        </View>
      ) : (
        <TouchableOpacity style={rowStyles.connectBtn} onPress={onConnect} activeOpacity={0.8}>
          <LinearGradient
            colors={platform.gradient as any}
            style={rowStyles.connectBtnGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={rowStyles.connectBtnText}>Connect</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const rowStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 14,
  },
  cardConnected: {
    borderColor: Colors.success + '40',
    backgroundColor: 'rgba(0,217,126,0.04)',
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 3 },
  name: {
    fontFamily: 'DMSans-Bold',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  status: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  statusConnected: { color: Colors.success },
  connectedBadge: { paddingHorizontal: 4 },
  connectBtn: { borderRadius: 12, overflow: 'hidden' },
  connectBtnGrad: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  connectBtnText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ConnectScreen() {
  const [connected, setConnected] = useState<Set<PlatformId>>(new Set());
  const [oauthTarget, setOauthTarget] = useState<PlatformId | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const openOAuth = (id: PlatformId) => {
    setOauthTarget(id);
    setModalVisible(true);
  };

  const handleOAuthSuccess = (id: PlatformId) => {
    setConnected((prev) => new Set([...prev, id]));
    setModalVisible(false);
    setOauthTarget(null);
  };

  const handleOAuthCancel = () => {
    setModalVisible(false);
    setOauthTarget(null);
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/onboarding/notifications');
  };

  return (
    <View style={styles.container}>
      {/* Nav */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.topNav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.stepPill}>
          <Text style={styles.stepText}>3 of 5</Text>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.header}>
          <Text style={styles.title}>Connect Your{'\n'}Accounts</Text>
          <Text style={styles.subtitle}>
            Authorize each platform so Viba can stream on your behalf.
          </Text>
        </Animated.View>

        {/* Connected badge */}
        {connected.size > 0 && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.connectedBanner}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.connectedBannerText}>
              {connected.size} platform{connected.size > 1 ? 's' : ''} connected
            </Text>
          </Animated.View>
        )}

        {/* Platform list */}
        <View style={styles.platformList}>
          {PLATFORMS.map((p, i) => (
            <PlatformRow
              key={p.id}
              platformId={p.id}
              isConnected={connected.has(p.id)}
              onConnect={() => openOAuth(p.id)}
              onDisconnect={() => setConnected((prev) => { const n = new Set(prev); n.delete(p.id); return n; })}
              index={i}
            />
          ))}
        </View>
      </ScrollView>

      {/* Footer */}
      <Animated.View entering={FadeInUp.delay(600).duration(500)} style={styles.footer}>
        <GradientButton
          label="Continue"
          onPress={handleContinue}
          disabled={connected.size === 0}
          size="large"
        />
        {connected.size === 0 && (
          <Text style={styles.hintText}>Connect at least one platform to continue</Text>
        )}
      </Animated.View>

      {/* OAuth Modal */}
      <OAuthModal
        platformId={oauthTarget}
        visible={modalVisible}
        onSuccess={handleOAuthSuccess}
        onCancel={handleOAuthCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDeep },
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
  stepPill: {
    backgroundColor: Colors.bgGlass,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepText: { fontFamily: 'DMSans-Medium', fontSize: 13, color: Colors.textMuted },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 24 },
  header: { marginBottom: 24, marginTop: 24 },
  title: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 36,
    color: Colors.textPrimary,
    lineHeight: 44,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 23,
  },
  connectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,217,126,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.success + '35',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  connectedBannerText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: Colors.success,
  },
  platformList: { gap: 10 },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 16,
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.bgDeep,
  },
  hintText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
