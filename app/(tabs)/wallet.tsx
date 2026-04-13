import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useApp, TokenTransaction, MIN_VIBA_TO_STREAM, VIBA_EARN_RATE } from '@/context/AppContext';

// ─── Balance ring ─────────────────────────────────────────────────────────────

function BalanceRing({ balance }: { balance: number }) {
  return (
    <Animated.View entering={ZoomIn.delay(100).duration(600).springify()} style={ring.wrap}>
      {/* Outer glow */}
      <View style={ring.glow} />
      <LinearGradient
        colors={['rgba(168,85,247,0.25)', 'rgba(255,45,135,0.15)']}
        style={ring.bg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={ring.inner}>
          <Text style={ring.symbol}>V</Text>
          <Text style={ring.balance}>{balance.toLocaleString()}</Text>
          <Text style={ring.unit}>$VIBA</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const ring = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(168,85,247,0.12)',
    transform: [{ scale: 1.4 }],
  },
  bg: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(168,85,247,0.4)',
  },
  inner: {
    alignItems: 'center',
    gap: 2,
  },
  symbol: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 22,
    color: Colors.viba,
    marginBottom: 4,
  },
  balance: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 38,
    color: '#FFFFFF',
    lineHeight: 40,
  },
  unit: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: Colors.viba,
    letterSpacing: 1,
  },
});

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value, valueColor }: {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={infoStyles.row}>
      <View style={infoStyles.iconWrap}>
        <Ionicons name={icon as any} size={16} color={Colors.viba} />
      </View>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={[infoStyles.value, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.vibaDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  value: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    color: Colors.textPrimary,
  },
});

// ─── Transaction row ──────────────────────────────────────────────────────────

function TxRow({ tx }: { tx: TokenTransaction }) {
  const isEarn = tx.type === 'earn' || tx.type === 'buy';
  const timeAgo = (date: Date) => {
    const s = Math.floor((Date.now() - date.getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  return (
    <View style={txStyles.row}>
      <View style={[txStyles.icon, { backgroundColor: isEarn ? Colors.successDim : Colors.vibaDim }]}>
        <Ionicons
          name={isEarn ? 'arrow-down' : 'arrow-up'}
          size={14}
          color={isEarn ? Colors.success : Colors.viba}
        />
      </View>
      <View style={txStyles.info}>
        <Text style={txStyles.label}>{tx.label}</Text>
        <Text style={txStyles.time}>{timeAgo(tx.timestamp)}</Text>
      </View>
      <Text style={[txStyles.amount, { color: isEarn ? Colors.success : Colors.viba }]}>
        {isEarn ? '+' : ''}{tx.amount.toLocaleString()} $VIBA
      </Text>
    </View>
  );
}

const txStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 2 },
  label: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: Colors.textPrimary,
  },
  time: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  amount: {
    fontFamily: 'Syne-Bold',
    fontSize: 14,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const { tokenBalance, tokenTransactions, addTokens } = useApp();

  const handleBuy = () => {
    Alert.alert(
      'Buy $VIBA',
      'Token purchases will be available when the Viba Token launches. Stay tuned.',
      [{ text: 'OK' }]
    );
  };

  const handleReceive = () => {
    Alert.alert('Receive $VIBA', 'Your wallet address will be available after token launch.');
  };

  const canStream = tokenBalance >= MIN_VIBA_TO_STREAM;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <Text style={styles.title}>Wallet</Text>
        <View style={styles.headerRight}>
          <View style={[styles.streamStatusBadge, canStream ? styles.streamStatusOk : styles.streamStatusWarn]}>
            <View style={[styles.streamStatusDot, { backgroundColor: canStream ? Colors.success : Colors.gold }]} />
            <Text style={[styles.streamStatusText, { color: canStream ? Colors.success : Colors.gold }]}>
              {canStream ? 'Ready to stream' : 'Need more $VIBA'}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Balance ring */}
      <BalanceRing balance={tokenBalance} />

      {/* Action buttons */}
      <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleBuy} activeOpacity={0.8}>
          <LinearGradient
            colors={['#FF2D87', '#7B2FFF']}
            style={styles.actionBtnGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Buy $VIBA</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtnOutline} onPress={handleReceive} activeOpacity={0.8}>
          <Ionicons name="download-outline" size={18} color={Colors.viba} />
          <Text style={styles.actionBtnOutlineText}>Receive</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Token rules */}
      <Animated.View entering={FadeInDown.delay(260).duration(400)} style={styles.card}>
        <Text style={styles.cardTitle}>How $VIBA works</Text>
        <InfoRow
          icon="radio-outline"
          label="Minimum to stream"
          value={`${MIN_VIBA_TO_STREAM} $VIBA`}
          valueColor={canStream ? Colors.success : Colors.gold}
        />
        <InfoRow
          icon="flash-outline"
          label="Earn rate while live"
          value={`${VIBA_EARN_RATE} $VIBA / sec`}
          valueColor={Colors.viba}
        />
        <InfoRow
          icon="people-outline"
          label="Viewer bonus"
          value="+0.1 $VIBA / viewer"
          valueColor={Colors.viba}
        />
        <InfoRow
          icon="gift-outline"
          label="Gift received bonus"
          value="2× token multiplier"
          valueColor={Colors.viba}
        />
        <View style={[infoStyles.row, { borderBottomWidth: 0 }]}>
          <View style={infoStyles.iconWrap}>
            <Ionicons name="wallet-outline" size={16} color={Colors.viba} />
          </View>
          <Text style={infoStyles.label}>Current balance</Text>
          <Text style={[infoStyles.value, { color: tokenBalance >= MIN_VIBA_TO_STREAM ? Colors.success : Colors.gold }]}>
            {tokenBalance} / {MIN_VIBA_TO_STREAM} min
          </Text>
        </View>
      </Animated.View>

      {/* Insufficient balance warning */}
      {!canStream && (
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.warnCard}>
          <Ionicons name="warning-outline" size={18} color={Colors.gold} />
          <Text style={styles.warnText}>
            You need at least {MIN_VIBA_TO_STREAM} $VIBA to go live. Buy tokens or earn them by streaming short test broadcasts.
          </Text>
        </Animated.View>
      )}

      {/* Transaction history */}
      <Animated.View entering={FadeInDown.delay(320).duration(400)} style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Transaction history</Text>
        <Text style={styles.sectionSub}>{tokenTransactions.length} entries</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(360).duration(400)} style={styles.card}>
        {tokenTransactions.length === 0 ? (
          <View style={styles.emptyTx}>
            <Ionicons name="receipt-outline" size={28} color={Colors.textMuted} />
            <Text style={styles.emptyTxText}>No transactions yet. Go live to start earning.</Text>
          </View>
        ) : (
          tokenTransactions.slice(0, 20).map((tx) => <TxRow key={tx.id} tx={tx} />)
        )}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: 20, gap: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 26,
    color: Colors.textPrimary,
  },
  headerRight: {},
  streamStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  streamStatusOk: {
    backgroundColor: Colors.successDim,
    borderColor: 'rgba(0,217,126,0.2)',
  },
  streamStatusWarn: {
    backgroundColor: Colors.goldDim,
    borderColor: 'rgba(255,184,0,0.2)',
  },
  streamStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  streamStatusText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 2,
    borderRadius: 14,
    overflow: 'hidden',
  },
  actionBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionBtnText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  actionBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.35)',
    backgroundColor: Colors.vibaDim,
  },
  actionBtnOutlineText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 15,
    color: Colors.viba,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  cardTitle: {
    fontFamily: 'Syne-Bold',
    fontSize: 14,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  warnCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.goldDim,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.2)',
    padding: 14,
  },
  warnText: {
    flex: 1,
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: Colors.gold,
    lineHeight: 20,
  },
  emptyTx: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  emptyTxText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
