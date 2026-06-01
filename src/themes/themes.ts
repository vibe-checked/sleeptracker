export interface Theme {
  name: string;
  bg: string;
  bgGradientColors: [string, string, ...string[]];
  cardBg: string;
  cardBorder: string;
  text: string;
  textDim: string;
  textMuted: string;
  ring1: string;
  ring1Glow: string;
  ring2: string;
  ring2Glow: string;
  ring3: string;
  ring3Glow: string;
  accent: string;
  accentDim: string;
  deepColor: string;
  remColor: string;
  lightColor: string;
  awakeColor: string;
  hrColor: string;
  positive: string;
  negative: string;
  navBg: string;
  navActive: string;
}

export const midnight: Theme = {
  name: 'Midnight',
  bg: '#060a18',
  bgGradientColors: ['#0f1a3a', '#060a18'],
  cardBg: 'rgba(15, 22, 50, 0.65)',
  cardBorder: 'rgba(80, 120, 200, 0.12)',
  text: '#e8edf8',
  textDim: '#8b9cc4',
  textMuted: '#4a5a80',
  ring1: '#00d4ff',
  ring1Glow: 'rgba(0, 212, 255, 0.35)',
  ring2: '#a855f7',
  ring2Glow: 'rgba(168, 85, 247, 0.35)',
  ring3: '#06d6a0',
  ring3Glow: 'rgba(6, 214, 160, 0.35)',
  accent: '#00d4ff',
  accentDim: 'rgba(0, 212, 255, 0.15)',
  deepColor: '#6366f1',
  remColor: '#00d4ff',
  lightColor: '#a78bfa',
  awakeColor: '#f97316',
  hrColor: '#ef4444',
  positive: '#06d6a0',
  negative: '#ef4444',
  navBg: 'rgba(8, 12, 30, 0.95)',
  navActive: '#00d4ff',
};

export const neon: Theme = {
  name: 'Neon',
  bg: '#0a0a0a',
  bgGradientColors: ['#1a0025', '#0a0a0a'],
  cardBg: 'rgba(20, 10, 30, 0.7)',
  cardBorder: 'rgba(255, 0, 128, 0.15)',
  text: '#f0e6ff',
  textDim: '#b08cd0',
  textMuted: '#5a3d70',
  ring1: '#ff2d78',
  ring1Glow: 'rgba(255, 45, 120, 0.4)',
  ring2: '#ffb800',
  ring2Glow: 'rgba(255, 184, 0, 0.4)',
  ring3: '#00ff88',
  ring3Glow: 'rgba(0, 255, 136, 0.4)',
  accent: '#ff2d78',
  accentDim: 'rgba(255, 45, 120, 0.15)',
  deepColor: '#8b5cf6',
  remColor: '#ff2d78',
  lightColor: '#ffb800',
  awakeColor: '#ff6b35',
  hrColor: '#ff2d78',
  positive: '#00ff88',
  negative: '#ff2d78',
  navBg: 'rgba(10, 5, 15, 0.95)',
  navActive: '#ff2d78',
};

export const sunrise: Theme = {
  name: 'Sunrise',
  bg: '#0d0a1a',
  bgGradientColors: ['#1a0f2e', '#0d0a1a', '#1a1008'],
  cardBg: 'rgba(30, 18, 40, 0.6)',
  cardBorder: 'rgba(255, 140, 50, 0.12)',
  text: '#f5e6d0',
  textDim: '#c4a07a',
  textMuted: '#6b4f3a',
  ring1: '#ff8c32',
  ring1Glow: 'rgba(255, 140, 50, 0.35)',
  ring2: '#e04080',
  ring2Glow: 'rgba(224, 64, 128, 0.35)',
  ring3: '#ffd700',
  ring3Glow: 'rgba(255, 215, 0, 0.35)',
  accent: '#ff8c32',
  accentDim: 'rgba(255, 140, 50, 0.15)',
  deepColor: '#7c3aed',
  remColor: '#ff8c32',
  lightColor: '#e04080',
  awakeColor: '#ef4444',
  hrColor: '#e04080',
  positive: '#ffd700',
  negative: '#ef4444',
  navBg: 'rgba(13, 10, 20, 0.95)',
  navActive: '#ff8c32',
};

export const themes = { midnight, neon, sunrise };
export type ThemeName = keyof typeof themes;
