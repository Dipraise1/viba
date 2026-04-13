export const Colors = {
  // Core brand
  pink: '#FF2D87',
  pinkLight: '#FF6BB3',
  pinkDim: 'rgba(255, 45, 135, 0.15)',
  purple: '#7B2FFF',
  purpleLight: '#A855F7',
  purpleDim: 'rgba(123, 47, 255, 0.15)',

  // Gradient arrays
  gradientPink: ['#FF2D87', '#FF6BB3'] as const,
  gradientPurple: ['#7B2FFF', '#A855F7'] as const,
  gradientBrand: ['#FF2D87', '#A855F7', '#7B2FFF'] as const,
  gradientBrandH: ['#7B2FFF', '#FF2D87'] as const,
  gradientCard: ['rgba(255,45,135,0.12)', 'rgba(123,47,255,0.12)'] as const,

  // Backgrounds
  bg: '#0A0A12',
  bgDeep: '#060609',
  bgCard: 'rgba(255, 255, 255, 0.04)',
  bgCardHover: 'rgba(255, 255, 255, 0.07)',
  bgGlass: 'rgba(255, 255, 255, 0.06)',

  // Borders
  border: 'rgba(255, 255, 255, 0.08)',
  borderBright: 'rgba(255, 255, 255, 0.15)',
  borderPink: 'rgba(255, 45, 135, 0.3)',
  borderPurple: 'rgba(123, 47, 255, 0.3)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  textMuted: 'rgba(255, 255, 255, 0.35)',
  textPink: '#FF2D87',
  textPurple: '#A855F7',

  // Platform brand colors
  platforms: {
    tiktok: '#010101',
    tiktokAccent: '#69C9D0',
    instagram: '#E1306C',
    instagramGradient: ['#833AB4', '#E1306C', '#F77737'] as const,
    facebook: '#1877F2',
    youtube: '#FF0000',
    twitch: '#9146FF',
  },

  // Semantic
  success: '#00D97E',
  successDim: 'rgba(0, 217, 126, 0.15)',
  gold: '#FFB800',
  goldDim: 'rgba(255, 184, 0, 0.15)',

  // Viba token
  viba: '#C084FC',
  vibaBright: '#A855F7',
  vibaDim: 'rgba(168, 85, 247, 0.15)',
  vibaGlow: 'rgba(168, 85, 247, 0.25)',
};
