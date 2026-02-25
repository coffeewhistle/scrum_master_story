/**
 * Theme — Centralized color palette and spacing constants.
 *
 * All UI components should reference these values instead of
 * hardcoding hex colors.
 */

export const colors = {
  // Base backgrounds (darkest to lightest)
  bgPrimary: '#1a1a2e',
  bgSecondary: '#12122a',
  bgCard: '#16213e',
  bgTrack: '#2a2a4a',

  // Accent / brand
  accent: '#0f3460',
  danger: '#e94560',
  success: '#4ecca3',
  warning: '#e67e22',
  info: '#3498db',
  gold: '#ffd700',
  yellow: '#f0c040',

  // Text
  textPrimary: '#ffffff',
  textSecondary: '#a0a0a0',
  textDark: '#1a1a2e',

  // Blocker-specific
  blockerBg: '#8b0000',
  blockerGlow: '#e94560',

  // Overlay
  overlayBg: 'rgba(0, 0, 0, 0.75)',
} as const;

export type ColorKey = keyof typeof colors;
