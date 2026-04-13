import { Colors } from './colors';

export type PlatformId = 'tiktok' | 'instagram' | 'facebook' | 'youtube' | 'twitch';

export interface Platform {
  id: PlatformId;
  name: string;
  icon: string;       // FontAwesome5 icon name
  color: string;
  bgColor: string;
  gradient: string[];
}

export const PLATFORMS: Platform[] = [
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: 'tiktok',
    color: '#FFFFFF',
    bgColor: '#010101',
    gradient: ['#010101', '#1a1a1a'],
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: 'instagram',
    color: '#FFFFFF',
    bgColor: '#833AB4',
    gradient: ['#833AB4', '#E1306C', '#F77737'],
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: 'facebook',
    color: '#FFFFFF',
    bgColor: '#1877F2',
    gradient: ['#1877F2', '#0C5ECC'],
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: 'youtube',
    color: '#FFFFFF',
    bgColor: '#FF0000',
    gradient: ['#FF0000', '#CC0000'],
  },
  {
    id: 'twitch',
    name: 'Twitch',
    icon: 'twitch',
    color: '#FFFFFF',
    bgColor: '#9146FF',
    gradient: ['#9146FF', '#6B2ECC'],
  },
];

export const getPlatform = (id: PlatformId): Platform =>
  PLATFORMS.find((p) => p.id === id) ?? PLATFORMS[0];
