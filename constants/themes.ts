export type ThemeMode = 'dark' | 'light' | 'system';

export const darkColors = {
  // Core brand
  pink: '#FF2D87',
  pinkLight: '#FF6BB3',
  pinkDim: 'rgba(255, 45, 135, 0.22)',
  purple: '#7B2FFF',
  purpleLight: '#A855F7',
  purpleDim: 'rgba(123, 47, 255, 0.22)',

  gradientPink: ['#FF2D87', '#FF6BB3'] as const,
  gradientPurple: ['#7B2FFF', '#A855F7'] as const,
  gradientBrand: ['#FF2D87', '#A855F7', '#7B2FFF'] as const,
  gradientBrandH: ['#7B2FFF', '#FF2D87'] as const,
  gradientCard: ['rgba(255,45,135,0.18)', 'rgba(123,47,255,0.18)'] as const,

  bg: '#080713',
  bgDeep: '#05050F',
  bgCard: 'rgba(255, 255, 255, 0.07)',
  bgCardHover: 'rgba(255, 255, 255, 0.10)',
  bgGlass: 'rgba(255, 255, 255, 0.08)',

  border: 'rgba(255, 255, 255, 0.11)',
  borderBright: 'rgba(255, 255, 255, 0.22)',
  borderPink: 'rgba(255, 45, 135, 0.45)',
  borderPurple: 'rgba(123, 47, 255, 0.45)',

  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.68)',
  textMuted: 'rgba(255, 255, 255, 0.42)',
  textPink: '#FF2D87',
  textPurple: '#A855F7',

  platforms: {
    tiktok: '#010101',
    tiktokAccent: '#69C9D0',
    instagram: '#E1306C',
    instagramGradient: ['#833AB4', '#E1306C', '#F77737'] as const,
    facebook: '#1877F2',
    youtube: '#FF0000',
    twitch: '#9146FF',
  },

  success: '#00D97E',
  successDim: 'rgba(0, 217, 126, 0.18)',
  gold: '#FFB800',
  goldDim: 'rgba(255, 184, 0, 0.18)',

  viba: '#C084FC',
  vibaBright: '#A855F7',
  vibaDim: 'rgba(168, 85, 247, 0.20)',
  vibaGlow: 'rgba(168, 85, 247, 0.35)',
};

export const lightColors = {
  // Core brand — slightly deeper for contrast on white
  pink: '#D91A72',
  pinkLight: '#FF5BAE',
  pinkDim: 'rgba(217, 26, 114, 0.10)',
  purple: '#5B18D4',
  purpleLight: '#7C3AED',
  purpleDim: 'rgba(91, 24, 212, 0.10)',

  gradientPink: ['#D91A72', '#FF5BAE'] as const,
  gradientPurple: ['#5B18D4', '#7C3AED'] as const,
  gradientBrand: ['#D91A72', '#7C3AED', '#5B18D4'] as const,
  gradientBrandH: ['#5B18D4', '#D91A72'] as const,
  gradientCard: ['rgba(217,26,114,0.07)', 'rgba(91,24,212,0.07)'] as const,

  bg: '#F2F1FA',
  bgDeep: '#E8E6F5',
  bgCard: 'rgba(255, 255, 255, 0.90)',
  bgCardHover: 'rgba(255, 255, 255, 1.0)',
  bgGlass: 'rgba(255, 255, 255, 0.65)',

  border: 'rgba(0, 0, 0, 0.08)',
  borderBright: 'rgba(0, 0, 0, 0.16)',
  borderPink: 'rgba(217, 26, 114, 0.30)',
  borderPurple: 'rgba(91, 24, 212, 0.30)',

  textPrimary: '#0B0A18',
  textSecondary: 'rgba(11, 10, 24, 0.62)',
  textMuted: 'rgba(11, 10, 24, 0.38)',
  textPink: '#D91A72',
  textPurple: '#5B18D4',

  platforms: {
    tiktok: '#010101',
    tiktokAccent: '#00BCD4',
    instagram: '#E1306C',
    instagramGradient: ['#833AB4', '#E1306C', '#F77737'] as const,
    facebook: '#1877F2',
    youtube: '#FF0000',
    twitch: '#9146FF',
  },

  success: '#00A855',
  successDim: 'rgba(0, 168, 85, 0.12)',
  gold: '#C48500',
  goldDim: 'rgba(196, 133, 0, 0.12)',

  viba: '#7C3AED',
  vibaBright: '#6D28D9',
  vibaDim: 'rgba(124, 58, 237, 0.12)',
  vibaGlow: 'rgba(124, 58, 237, 0.22)',
};

export interface AppColors {
  pink: string; pinkLight: string; pinkDim: string;
  purple: string; purpleLight: string; purpleDim: string;
  gradientPink: readonly [string, string];
  gradientPurple: readonly [string, string];
  gradientBrand: readonly [string, string, string];
  gradientBrandH: readonly [string, string];
  gradientCard: readonly [string, string];
  bg: string; bgDeep: string; bgCard: string; bgCardHover: string; bgGlass: string;
  border: string; borderBright: string; borderPink: string; borderPurple: string;
  textPrimary: string; textSecondary: string; textMuted: string; textPink: string; textPurple: string;
  platforms: {
    tiktok: string; tiktokAccent: string; instagram: string;
    instagramGradient: readonly [string, string, string];
    facebook: string; youtube: string; twitch: string;
  };
  success: string; successDim: string;
  gold: string; goldDim: string;
  viba: string; vibaBright: string; vibaDim: string; vibaGlow: string;
}
