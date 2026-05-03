import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Clipboard,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ExpoClipboard from 'expo-clipboard';
import { useTheme } from '@/context/ThemeContext';
import { useWallet } from '@/context/WalletContext';
import { SOLANA_CLUSTER } from '@/lib/solana-wallet';
import type { AppColors } from '@/constants/themes';
import SolanaLogo from '@/components/SolanaLogo';

// ─── Deposit modal ────────────────────────────────────────────────────────────

function DepositModal({
  visible,
  token,
  address,
  onClose,
  C,
}: {
  visible: boolean;
  token: 'SOL' | 'VIBA';
  address: string;
  onClose: () => void;
  C: AppColors;
}) {
  const [copied, setCopied] = useState(false);
  const isSol = token === 'SOL';

  const handleCopy = async () => {
    await ExpoClipboard.setStringAsync(address);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncated = address.length > 20
    ? `${address.slice(0, 10)}...${address.slice(-10)}`
    : address;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={mS.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <Animated.View entering={FadeInUp.duration(320).springify()} style={[mS.sheet, { backgroundColor: '#080713', borderColor: C.border }]}>
          <View style={[mS.handle, { backgroundColor: C.border }]} />

          {/* Icon */}
          {isSol
            ? <View style={mS.solIconWrap}><SolanaLogo size={40} /></View>
            : <LinearGradient colors={['#FF2D87', '#7B2FFF']} style={mS.vibaIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={mS.vibaIconText}>V</Text>
              </LinearGradient>
          }

          <Text style={[mS.title, { color: C.textPrimary }]}>Deposit {token}</Text>
          <Text style={[mS.sub, { color: C.textMuted }]}>
            Send {isSol ? 'SOL' : '$VIBA tokens'} to your Viba wallet on Solana
          </Text>

          {/* Address card */}
          <View style={[mS.addrCard, { backgroundColor: '#0A0A14', borderColor: C.border }]}>
            <Text style={[mS.addrLabel, { color: C.textMuted }]}>YOUR WALLET ADDRESS</Text>
            <Text style={[mS.addrText, { color: C.textPrimary }]} selectable>{truncated}</Text>
            <TouchableOpacity
              style={[mS.copyBtn, {
                backgroundColor: copied
                  ? 'rgba(0,217,126,0.15)'
                  : isSol ? 'rgba(153,69,255,0.15)' : C.pinkDim,
              }]}
              onPress={handleCopy}
              activeOpacity={0.8}
            >
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={15}
                color={copied ? C.success : isSol ? '#9945FF' : C.pink}
              />
              <Text style={[mS.copyText, { color: copied ? C.success : isSol ? '#9945FF' : C.pink }]}>
                {copied ? 'Copied!' : 'Copy full address'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Network badge */}
          <View style={[mS.networkRow, { backgroundColor: '#0A0A14', borderColor: C.border }]}>
            <SolanaLogo size={14} />
            <Text style={[mS.networkText, { color: C.textSecondary }]}>
              Solana · <Text style={{ color: C.textPrimary }}>{SOLANA_CLUSTER === 'devnet' ? 'Devnet' : 'Mainnet'}</Text>
            </Text>
            <View style={[mS.networkDot, { backgroundColor: '#14F195' }]} />
            <Text style={[mS.networkLive, { color: '#14F195' }]}>Live</Text>
          </View>

          <Text style={[mS.warning, { color: C.textMuted }]}>
            Only send {token} on the Solana network (SPL). Sending assets on other networks will result in permanent loss.
          </Text>

          <TouchableOpacity style={[mS.closeBtn, { borderColor: C.border }]} onPress={onClose} activeOpacity={0.8}>
            <Text style={[mS.closeBtnText, { color: C.textSecondary }]}>Done</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const mS = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.75)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingBottom: 48, alignItems: 'center', gap: 14, borderTopWidth: 1 },
  handle: { width: 36, height: 4, borderRadius: 2, marginTop: 12, marginBottom: 4 },
  solIconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#0D0D1A', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  vibaIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  vibaIconText: { fontSize: 28, color: '#FFFFFF', fontFamily: 'Syne-ExtraBold' },
  title: { fontFamily: 'Syne-ExtraBold', fontSize: 22, textAlign: 'center' },
  sub: { fontFamily: 'DMSans-Regular', fontSize: 14, textAlign: 'center', lineHeight: 21, maxWidth: 280 },
  addrCard: { width: '100%', borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  addrLabel: { fontFamily: 'DMSans-Regular', fontSize: 10, letterSpacing: 1.2 },
  addrText: { fontFamily: 'DMSans-Bold', fontSize: 13, letterSpacing: 0.4, lineHeight: 20 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  copyText: { fontFamily: 'DMSans-Bold', fontSize: 13 },
  networkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  networkDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 'auto' },
  networkText: { fontFamily: 'DMSans-Regular', fontSize: 13, flex: 1, marginLeft: 4 },
  networkLive: { fontFamily: 'DMSans-Bold', fontSize: 11 },
  warning: { fontFamily: 'DMSans-Regular', fontSize: 12, textAlign: 'center', lineHeight: 18, maxWidth: 300 },
  closeBtn: { width: '100%', borderRadius: 14, borderWidth: 1, paddingVertical: 15, alignItems: 'center' },
  closeBtnText: { fontFamily: 'DMSans-Medium', fontSize: 15 },
});

// ─── Asset card ───────────────────────────────────────────────────────────────

function AssetCard({
  isSol,
  balance,
  usdValue,
  pricePerToken,
  change24h,
  onDeposit,
  index,
  C,
}: {
  isSol: boolean;
  balance: number;
  usdValue: number | null;
  pricePerToken: number | null;
  change24h: number | null;
  onDeposit: () => void;
  index: number;
  C: AppColors;
}) {
  const positive = (change24h ?? 0) >= 0;
  return (
    <Animated.View entering={FadeInDown.delay(120 + index * 80).duration(450).springify()}>
      <View style={[aS.card, { backgroundColor: '#000000', borderColor: C.border }]}>
        {/* Top row: icon + name + price */}
        <View style={aS.topRow}>
          {isSol
            ? <View style={[aS.iconWrap, { backgroundColor: '#0D0D1A' }]}>
                <SolanaLogo size={22} />
              </View>
            : <LinearGradient colors={['#FF2D87', '#7B2FFF']} style={aS.iconWrap} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={aS.vibaLetter}>V</Text>
              </LinearGradient>
          }
          <View style={aS.nameCol}>
            <Text style={[aS.symbol, { color: C.textPrimary }]}>{isSol ? 'SOL' : 'VIBA'}</Text>
            <Text style={[aS.name, { color: C.textMuted }]}>{isSol ? 'Solana' : 'Viba Token'}</Text>
          </View>
          <View style={aS.priceCol}>
            {pricePerToken !== null ? (
              <Text style={[aS.price, { color: C.textPrimary }]}>
                ${pricePerToken >= 1 ? pricePerToken.toFixed(2) : pricePerToken.toFixed(4)}
              </Text>
            ) : (
              <View style={[aS.preLaunchBadge, { backgroundColor: C.pinkDim, borderColor: C.borderPink }]}>
                <Text style={[aS.preLaunchText, { color: C.pink }]}>Pre-launch</Text>
              </View>
            )}
            {change24h !== null ? (
              <View style={[aS.changePill, { backgroundColor: positive ? 'rgba(0,217,126,0.12)' : 'rgba(255,68,68,0.12)' }]}>
                <Ionicons name={positive ? 'trending-up' : 'trending-down'} size={10} color={positive ? C.success : '#FF4444'} />
                <Text style={[aS.changeText, { color: positive ? C.success : '#FF4444' }]}>
                  {positive ? '+' : ''}{change24h.toFixed(1)}%
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={[aS.divider, { backgroundColor: C.border }]} />

        {/* Bottom row: balance + actions */}
        <View style={aS.bottomRow}>
          <View>
            <Text style={[aS.balAmount, { color: C.textPrimary }]}>
              {isSol ? balance.toFixed(4) : balance.toLocaleString()}
              <Text style={[aS.balSymbol, { color: C.textMuted }]}> {isSol ? 'SOL' : 'VIBA'}</Text>
            </Text>
            {usdValue !== null ? (
              <Text style={[aS.balUsd, { color: C.textMuted }]}>${usdValue.toFixed(2)} USD</Text>
            ) : (
              <Text style={[aS.balUsd, { color: C.textMuted }]}>Price TBD at launch</Text>
            )}
          </View>
          <View style={aS.actionsRow}>
            <TouchableOpacity style={[aS.actionBtn, { borderColor: C.border }]} onPress={onDeposit} activeOpacity={0.8}>
              <Ionicons name="arrow-down-outline" size={14} color={C.textSecondary} />
              <Text style={[aS.actionText, { color: C.textSecondary }]}>Deposit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[aS.actionBtn, { borderColor: C.border }]}
              onPress={() => Alert.alert('Send', 'Sending tokens will be available at launch.')}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-up-outline" size={14} color={C.textSecondary} />
              <Text style={[aS.actionText, { color: C.textSecondary }]}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const aS = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 18, gap: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  vibaLetter: { fontSize: 22, color: '#FFFFFF', fontFamily: 'Syne-ExtraBold' },
  nameCol: { flex: 1, gap: 2 },
  symbol: { fontFamily: 'Syne-Bold', fontSize: 16 },
  name: { fontFamily: 'DMSans-Regular', fontSize: 12 },
  priceCol: { alignItems: 'flex-end', gap: 4 },
  price: { fontFamily: 'Syne-Bold', fontSize: 15 },
  changePill: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  changeText: { fontFamily: 'DMSans-Bold', fontSize: 10 },
  preLaunchBadge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3 },
  preLaunchText: { fontFamily: 'DMSans-Bold', fontSize: 10 },
  divider: { height: 1 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balAmount: { fontFamily: 'Syne-ExtraBold', fontSize: 26 },
  balSymbol: { fontSize: 14, fontFamily: 'DMSans-Regular' },
  balUsd: { fontFamily: 'DMSans-Regular', fontSize: 13, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  actionText: { fontFamily: 'DMSans-Medium', fontSize: 13 },
});

// ─── Quick action ─────────────────────────────────────────────────────────────

function QuickAction({ icon, label, colors, onPress, C }: { icon: string; label: string; colors: [string, string]; onPress: () => void; C: AppColors }) {
  return (
    <TouchableOpacity style={qS.wrap} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient colors={colors} style={qS.circle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Ionicons name={icon as any} size={20} color="#FFFFFF" />
      </LinearGradient>
      <Text style={[qS.label, { color: C.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const qS = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8, flex: 1 },
  circle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: 'DMSans-Medium', fontSize: 12 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────


export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const { colors: C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { ready, publicKey, solBalance, vibaBalance, solPriceUsd, solChange24h, transactions, refreshing, refresh } = useWallet();

  const [depositToken, setDepositToken] = useState<'SOL' | 'VIBA' | null>(null);

  const solUsd = solBalance * solPriceUsd;
  const totalUsd = solUsd; // VIBA not launched — no USD value yet

  const addrShort = publicKey
    ? `${publicKey.slice(0, 6)}...${publicKey.slice(-6)}`
    : '—';

  if (!ready) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={C.pink} size="large" />
        <Text style={[s.loadingText, { color: C.textMuted }]}>Setting up wallet…</Text>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={[s.iconBtn, { backgroundColor: '#000000', borderColor: C.border }]} onPress={() => router.back()} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={20} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <SolanaLogo size={16} />
          <Text style={[s.headerTitle, { color: C.textPrimary }]}>Wallet</Text>
        </View>
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: '#000000', borderColor: C.border }]}
          onPress={() => refresh()}
          activeOpacity={0.75}
        >
          {refreshing
            ? <ActivityIndicator size="small" color={C.pink} />
            : <Ionicons name="refresh-outline" size={18} color={C.textPrimary} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.pink} />
        }
      >
        {/* Hero portfolio card */}
        <Animated.View entering={FadeInDown.delay(40).duration(480)}>
          <View style={[s.hero, { backgroundColor: '#000000', borderColor: C.border }]}>
            <LinearGradient
              colors={['rgba(153,69,255,0.08)', 'rgba(20,241,149,0.05)']}
              style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={s.heroGlow} />

            <View style={s.heroTop}>
              <View style={s.solanaNetworkBadge}>
                <SolanaLogo size={14} />
                <Text style={s.solanaNetworkText}>
                  Solana · {SOLANA_CLUSTER === 'devnet' ? 'Devnet' : 'Mainnet'}
                </Text>
                <View style={s.liveDot} />
              </View>
            </View>

            <Text style={s.portfolioLabel}>Total Portfolio</Text>
            <Text style={s.portfolioValue}>${totalUsd.toFixed(2)}</Text>

            {/* Address row */}
            <TouchableOpacity
              style={[s.addressRow, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }]}
              onPress={async () => {
                if (!publicKey) return;
                await ExpoClipboard.setStringAsync(publicKey);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Copied', 'Wallet address copied');
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="wallet-outline" size={13} color="rgba(255,255,255,0.4)" />
              <Text style={s.addressText}>{addrShort}</Text>
              <Ionicons name="copy-outline" size={12} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Quick actions */}
        <Animated.View entering={FadeInDown.delay(80).duration(420)} style={[s.quickRow, { backgroundColor: '#000000', borderColor: C.border }]}>
          <QuickAction icon="arrow-down-outline" label="Deposit" colors={['#7B2FFF', '#A855F7']} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDepositToken('SOL'); }} C={C} />
          <QuickAction icon="arrow-up-outline" label="Send" colors={['#FF2D87', '#FF6BB3']} onPress={() => Alert.alert('Send', 'Available at token launch.')} C={C} />
          <QuickAction icon="swap-horizontal-outline" label="Swap" colors={['#00D4AA', '#14F195']} onPress={() => Alert.alert('Swap', 'Token swaps coming soon.')} C={C} />
          <QuickAction icon="cart-outline" label="Buy" colors={['#FF6B35', '#FFB800']} onPress={() => Alert.alert('Buy', 'Card purchases coming soon.')} C={C} />
        </Animated.View>

        {/* Assets */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <Text style={[s.sectionTitle, { color: C.textPrimary }]}>Assets</Text>
        </Animated.View>

        <AssetCard
          isSol
          balance={solBalance}
          usdValue={solPriceUsd > 0 ? solUsd : null}
          pricePerToken={solPriceUsd > 0 ? solPriceUsd : null}
          change24h={solPriceUsd > 0 ? solChange24h : null}
          onDeposit={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDepositToken('SOL'); }}
          index={0}
          C={C}
        />

        <AssetCard
          isSol={false}
          balance={vibaBalance}
          usdValue={null}
          pricePerToken={null}
          change24h={null}
          onDeposit={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDepositToken('VIBA'); }}
          index={1}
          C={C}
        />

        {/* Recent activity */}
        <Animated.View entering={FadeInDown.delay(280).duration(400)}>
          <Text style={[s.sectionTitle, { color: C.textPrimary }]}>Recent Activity</Text>
        </Animated.View>

        {transactions.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(300).duration(380)} style={[s.emptyTx, { backgroundColor: '#000000', borderColor: C.border }]}>
            <Ionicons name="receipt-outline" size={30} color={C.textMuted} />
            <Text style={[s.emptyTxTitle, { color: C.textPrimary }]}>No transactions yet</Text>
            <Text style={[s.emptyTxSub, { color: C.textMuted }]}>Deposit SOL or VIBA to get started</Text>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(300).duration(380)} style={[s.txList, { backgroundColor: '#000000', borderColor: C.border }]}>
            {transactions.map((tx, i) => (
              <View key={tx.signature} style={[s.txRow, i < transactions.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
                <View style={[s.txIconWrap, { backgroundColor: C.vibaDim }]}>
                  <Ionicons name="swap-horizontal-outline" size={15} color={C.viba} />
                </View>
                <View style={s.txInfo}>
                  <Text style={[s.txSig, { color: C.textPrimary }]} numberOfLines={1}>
                    {tx.signature.slice(0, 18)}…
                  </Text>
                  <Text style={[s.txTime, { color: C.textMuted }]}>
                    {tx.blockTime ? new Date(tx.blockTime * 1000).toLocaleDateString() : 'Pending'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => Alert.alert('Transaction', tx.signature)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="open-outline" size={16} color={C.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </Animated.View>
        )}
      </ScrollView>

      {/* Deposit modal */}
      {depositToken && publicKey && (
        <DepositModal
          visible
          token={depositToken}
          address={publicKey}
          onClose={() => setDepositToken(null)}
          C={C}
        />
      )}
    </View>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    loadingText: { fontFamily: 'DMSans-Regular', fontSize: 14, marginTop: 12 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { fontFamily: 'Syne-Bold', fontSize: 18 },
    iconBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingHorizontal: 16, gap: 12 },

    // Hero
    hero: { borderRadius: 22, padding: 22, gap: 8, borderWidth: 1, overflow: 'hidden' },
    heroGlow: { position: 'absolute', top: -80, right: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(153,69,255,0.12)' },
    heroTop: { flexDirection: 'row', alignItems: 'center' },
    solanaNetworkBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(153,69,255,0.1)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(153,69,255,0.2)' },
    solanaNetworkText: { fontFamily: 'DMSans-Medium', fontSize: 12, color: '#9945FF' },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#14F195', marginLeft: 2 },
    portfolioLabel: { fontFamily: 'DMSans-Regular', fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 },
    portfolioValue: { fontFamily: 'Syne-ExtraBold', fontSize: 46, color: '#FFFFFF', lineHeight: 50, letterSpacing: -1 },
    addressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, marginTop: 4 },
    addressText: { fontFamily: 'DMSans-Medium', fontSize: 12, color: 'rgba(255,255,255,0.5)' },

    // Quick actions
    quickRow: { flexDirection: 'row', borderRadius: 18, borderWidth: 1, paddingVertical: 18, paddingHorizontal: 8 },

    sectionTitle: { fontFamily: 'Syne-Bold', fontSize: 16, marginTop: 4 },

    // Transactions
    emptyTx: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: 'center', gap: 8 },
    emptyTxTitle: { fontFamily: 'Syne-Bold', fontSize: 15 },
    emptyTxSub: { fontFamily: 'DMSans-Regular', fontSize: 13, textAlign: 'center' },
    txList: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 14 },
    txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
    txIconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    txInfo: { flex: 1, gap: 3 },
    txSig: { fontFamily: 'DMSans-Medium', fontSize: 13 },
    txTime: { fontFamily: 'DMSans-Regular', fontSize: 11 },
  });
}
