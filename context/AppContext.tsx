import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { PlatformId } from '@/constants/platforms';
import { supabase } from '@/lib/supabase';

export const MIN_VIBA_TO_STREAM = 10; // minimum tokens required to go live
export const VIBA_EARN_RATE = 1;      // tokens earned per second while live

export interface TokenTransaction {
  id: string;
  type: 'earn' | 'spend' | 'buy';
  amount: number;
  label: string;
  timestamp: Date;
}

export interface AppNotification {
  id: string;
  type: 'comment' | 'gift' | 'follower' | 'milestone' | 'system';
  title: string;
  body: string;
  platform?: PlatformId;
  read: boolean;
  timestamp: Date;
}

export type Quality = '720p' | '1080p' | '4K';
export type Orientation = 'portrait' | 'landscape';
export type Camera = 'front' | 'back';
export type CommentVisibility = 'everyone' | 'followers' | 'none';

export interface ConnectedPlatform {
  id: PlatformId;
  connected: boolean;
  username?: string;
}

export interface StreamSettings {
  quality: Quality;
  orientation: Orientation;
  camera: Camera;
  micEnabled: boolean;
  autoRecord: boolean;
}

export interface NotificationSettings {
  comments: boolean;
  gifts: boolean;
  followers: boolean;
  viewerMilestones: boolean;
}

export interface PrivacySettings {
  commentVisibility: CommentVisibility;
  showGiftsPublicly: boolean;
  showViewerCount: boolean;
}

export interface UserProfile {
  displayName: string;
  handle: string;
  bio?: string;
}

interface AppState {
  profile: UserProfile;
  platforms: ConnectedPlatform[];
  streamSettings: StreamSettings;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  // Token wallet
  tokenBalance: number;
  tokenTransactions: TokenTransaction[];
  addTokens: (amount: number, label: string) => void;
  spendTokens: (amount: number, label: string) => boolean;
  // In-app notifications
  appNotifications: AppNotification[];
  unreadCount: number;
  addNotification: (n: Omit<AppNotification, 'id' | 'read' | 'timestamp'>) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;

  updateProfile: (p: Partial<UserProfile>) => void;
  togglePlatform: (id: PlatformId) => void;
  updateStreamSettings: (s: Partial<StreamSettings>) => void;
  updateNotifications: (n: Partial<NotificationSettings>) => void;
  updatePrivacy: (p: Partial<PrivacySettings>) => void;
}

const AppContext = createContext<AppState | null>(null);

const DEFAULT_PLATFORMS: ConnectedPlatform[] = [
  { id: 'tiktok', connected: false },
  { id: 'instagram', connected: false },
  { id: 'youtube', connected: false },
  { id: 'facebook', connected: false },
  { id: 'twitch', connected: false },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>({
    displayName: 'Creator',
    handle: '@creator',
  });

  const [platforms, setPlatforms] = useState<ConnectedPlatform[]>(DEFAULT_PLATFORMS);

  const [streamSettings, setStreamSettings] = useState<StreamSettings>({
    quality: '1080p',
    orientation: 'portrait',
    camera: 'front',
    micEnabled: true,
    autoRecord: false,
  });

  const [notifications, setNotifications] = useState<NotificationSettings>({
    comments: true,
    gifts: true,
    followers: false,
    viewerMilestones: true,
  });

  const [privacy, setPrivacy] = useState<PrivacySettings>({
    commentVisibility: 'everyone',
    showGiftsPublicly: true,
    showViewerCount: true,
  });

  // Token wallet — start with 50 tokens so new users can stream immediately
  const [tokenBalance, setTokenBalance] = useState(50);
  const [tokenTransactions, setTokenTransactions] = useState<TokenTransaction[]>([
    { id: '0', type: 'buy', amount: 50, label: 'Welcome bonus', timestamp: new Date() },
  ]);

  // In-app notifications
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([
    {
      id: 'n1',
      type: 'system',
      title: 'Welcome to Viba',
      body: 'You received 50 $VIBA as a welcome bonus. Go live to start earning!',
      read: false,
      timestamp: new Date(),
    },
  ]);

  const addTokens = (amount: number, label: string) => {
    setTokenBalance((b) => b + amount);
    setTokenTransactions((prev) => [
      { id: Date.now().toString(), type: 'earn', amount, label, timestamp: new Date() },
      ...prev,
    ]);
  };

  const spendTokens = (amount: number, label: string): boolean => {
    if (tokenBalance < amount) return false;
    setTokenBalance((b) => b - amount);
    setTokenTransactions((prev) => [
      { id: Date.now().toString(), type: 'spend', amount: -amount, label, timestamp: new Date() },
      ...prev,
    ]);
    return true;
  };

  const addNotification = (n: Omit<AppNotification, 'id' | 'read' | 'timestamp'>) => {
    setAppNotifications((prev) => [
      { ...n, id: Date.now().toString(), read: false, timestamp: new Date() },
      ...prev,
    ]);
  };

  const markAllRead = () => setAppNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const markRead = (id: string) => setAppNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));

  const unreadCount = appNotifications.filter((n) => !n.read).length;

  // Load profile from Supabase when session exists
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('display_name, handle, bio')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile({
          displayName: data.display_name,
          handle: data.handle,
          bio: data.bio ?? undefined,
        });
      }

      // Load connected platforms
      const { data: platformData } = await supabase
        .from('connected_platforms')
        .select('platform, username')
        .eq('user_id', user.id);

      if (platformData && platformData.length > 0) {
        setPlatforms((prev) =>
          prev.map((p) => {
            const found = platformData.find((r) => r.platform === p.id);
            return found
              ? { ...p, connected: true, username: found.username ?? undefined }
              : p;
          })
        );
      }
    };

    loadProfile();

    // Re-load when auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') loadProfile();
      if (event === 'SIGNED_OUT') {
        setProfile({ displayName: 'Creator', handle: '@creator' });
        setPlatforms(DEFAULT_PLATFORMS);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const updateProfile = async (p: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...p }));

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('profiles')
      .update({
        ...(p.displayName && { display_name: p.displayName }),
        ...(p.handle && { handle: p.handle }),
        ...(p.bio !== undefined && { bio: p.bio }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
  };

  const togglePlatform = async (id: PlatformId) => {
    const current = platforms.find((p) => p.id === id);
    if (!current) return;

    const { data: { user } } = await supabase.auth.getUser();

    if (current.connected) {
      // Disconnect
      setPlatforms((prev) =>
        prev.map((p) => p.id === id ? { ...p, connected: false, username: undefined } : p)
      );
      if (user) {
        await supabase
          .from('connected_platforms')
          .delete()
          .eq('user_id', user.id)
          .eq('platform', id);
      }
    } else {
      // Connect (OAuth flow handled by the UI — this just saves the result)
      const username = `@${profile.handle.replace('@', '')}_${id}`;
      setPlatforms((prev) =>
        prev.map((p) => p.id === id ? { ...p, connected: true, username } : p)
      );
      if (user) {
        await supabase
          .from('connected_platforms')
          .upsert({ user_id: user.id, platform: id, username });
      }
    }
  };

  return (
    <AppContext.Provider
      value={{
        profile,
        platforms,
        streamSettings,
        notifications,
        privacy,
        tokenBalance,
        tokenTransactions,
        addTokens,
        spendTokens,
        appNotifications,
        unreadCount,
        addNotification,
        markAllRead,
        markRead,
        updateProfile,
        togglePlatform,
        updateStreamSettings: (s) => setStreamSettings((prev) => ({ ...prev, ...s })),
        updateNotifications: (n) => setNotifications((prev) => ({ ...prev, ...n })),
        updatePrivacy: (p) => setPrivacy((prev) => ({ ...prev, ...p })),
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
