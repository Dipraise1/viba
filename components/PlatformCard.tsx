import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Platform as PlatformType } from '@/constants/platforms';
import { Colors } from '@/constants/colors';

interface PlatformCardProps {
  platform: PlatformType;
  isConnected: boolean;
  onPress: () => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function PlatformCard({ platform, isConnected, onPress }: PlatformCardProps) {
  const scale = useSharedValue(1);
  const checkScale = useSharedValue(isConnected ? 1 : 0);
  const borderOpacity = useSharedValue(isConnected ? 1 : 0);

  useEffect(() => {
    checkScale.value = withSpring(isConnected ? 1 : 0, { damping: 12, stiffness: 200 });
    borderOpacity.value = withTiming(isConnected ? 1 : 0, { duration: 250 });
  }, [isConnected]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12 });
  };

  return (
    <AnimatedTouchable
      style={[styles.card, cardStyle, isConnected && styles.cardConnected]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      {isConnected && (
        <LinearGradient
          colors={['rgba(255,45,135,0.06)', 'rgba(123,47,255,0.06)']}
          style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}

      {/* Platform icon */}
      <LinearGradient
        colors={platform.gradient as [string, string, ...string[]]}
        style={styles.iconWrap}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <FontAwesome5 name={platform.icon} size={22} color="#FFFFFF" solid />
      </LinearGradient>

      {/* Name + handle */}
      <View style={styles.nameWrap}>
        <Text style={styles.name}>{platform.name}</Text>
        {isConnected && (
          <Animated.Text style={[styles.connectedLabel, { opacity: checkScale }]}>
            Connected
          </Animated.Text>
        )}
      </View>

      {/* Connect button / check */}
      {isConnected ? (
        <Animated.View style={[styles.checkCircle, checkStyle]}>
          <LinearGradient
            colors={['#FF2D87', '#7B2FFF']}
            style={styles.checkGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>
      ) : (
        <View style={styles.connectBtn}>
          <Text style={styles.connectLabel}>Connect</Text>
        </View>
      )}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
    overflow: 'hidden',
  },
  cardConnected: {
    borderColor: Colors.borderPink,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nameWrap: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: 'Syne-Bold',
    fontSize: 16,
    color: Colors.textPrimary,
  },
  connectedLabel: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: Colors.success,
  },
  connectBtn: {
    borderWidth: 1.5,
    borderColor: Colors.borderBright,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  connectLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  checkCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  checkGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
