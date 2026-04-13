import React, { createContext, useContext, useState, ReactNode } from 'react';
import { PlatformId } from '@/constants/platforms';

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
}

interface AppState {
  profile: UserProfile;
  platforms: ConnectedPlatform[];
  streamSettings: StreamSettings;
  notifications: NotificationSettings;
  privacy: PrivacySettings;

  updateProfile: (p: Partial<UserProfile>) => void;
  togglePlatform: (id: PlatformId) => void;
  updateStreamSettings: (s: Partial<StreamSettings>) => void;
  updateNotifications: (n: Partial<NotificationSettings>) => void;
  updatePrivacy: (p: Partial<PrivacySettings>) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>({
    displayName: 'Creator',
    handle: '@creator',
  });

  const [platforms, setPlatforms] = useState<ConnectedPlatform[]>([
    { id: 'tiktok', connected: true, username: '@creator_tt' },
    { id: 'instagram', connected: true, username: '@creator.ig' },
    { id: 'youtube', connected: true, username: '@CreatorYT' },
    { id: 'facebook', connected: false },
    { id: 'twitch', connected: false },
  ]);

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

  const togglePlatform = (id: PlatformId) => {
    setPlatforms((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (p.connected) return { ...p, connected: false, username: undefined };
        return { ...p, connected: true, username: `@${profile.handle.replace('@', '')}_${id}` };
      })
    );
  };

  return (
    <AppContext.Provider
      value={{
        profile,
        platforms,
        streamSettings,
        notifications,
        privacy,
        updateProfile: (p) => setProfile((prev) => ({ ...prev, ...p })),
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
