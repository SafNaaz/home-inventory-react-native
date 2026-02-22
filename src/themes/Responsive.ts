/**
 * Responsive Design Utilities
 * Provides adaptive sizing for all screen sizes, especially 6.5" and smaller devices.
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base design width (iPhone 14 Pro Max ~430pt)
const BASE_WIDTH = 430;
const BASE_HEIGHT = 932;

// Screen size classification
export const isSmallScreen = SCREEN_WIDTH < 380;       // < 5.5" phones
export const isMediumScreen = SCREEN_WIDTH < 410;      // 5.5" - 6.3" phones (e.g. 6.5" = ~390-400pt)
export const isLargeScreen = SCREEN_WIDTH >= 410;      // > 6.3" phones

// Scale factor (clamp to avoid extreme scaling)
const widthScale = Math.min(Math.max(SCREEN_WIDTH / BASE_WIDTH, 0.75), 1.0);
const heightScale = Math.min(Math.max(SCREEN_HEIGHT / BASE_HEIGHT, 0.75), 1.0);

/**
 * Scale a size value proportionally to screen width.
 * Use for font sizes, icon sizes, etc.
 */
export const rs = (size: number): number => {
  return Math.round(size * widthScale);
};

/**
 * Scale a vertical size proportionally to screen height.
 * Use for heights, vertical padding.
 */
export const rvs = (size: number): number => {
  return Math.round(size * heightScale);
};

/**
 * Moderately scale a size (less aggressive than rs).
 * Use for padding, margins where you want some scaling but not full.
 */
export const ms = (size: number, factor: number = 0.5): number => {
  return Math.round(size + (size * widthScale - size) * factor);
};

// ── Pre-computed responsive values ──────────────────────────────────────────

export const screen = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  isSmall: isSmallScreen,
  isMedium: isMediumScreen,
  isLarge: isLargeScreen,
};

// Font sizes - readable on all screens
export const fontSize = {
  xs: rs(11),       // was 10-11
  sm: rs(12),       // was 11-12
  md: rs(14),       // was 12-14
  base: rs(15),     // was 14-15
  lg: rs(16),       // was 15-16
  xl: rs(18),       // was 16-18
  xxl: rs(20),      // was 18-20
  h3: rs(22),       // was 20-22
  h2: rs(24),       // was 22-24
  h1: rs(28),       // was 24-28
};

// Spacing - comfortable touch targets
export const spacing = {
  xxs: ms(2),
  xs: ms(4),
  sm: ms(8),
  md: ms(12),
  base: ms(16),
  lg: ms(20),
  xl: ms(24),
  xxl: ms(32),
};

// Border radius
export const radius = {
  sm: ms(8),
  md: ms(12),
  lg: ms(16),
  xl: ms(20),
  xxl: ms(24),
  xxxl: ms(32),
  full: 999,
};

// Icon sizes
export const iconSize = {
  xs: rs(14),
  sm: rs(18),
  md: rs(22),
  lg: rs(26),
  xl: rs(32),
  xxl: rs(48),
};

// Touch target minimum (44pt recommended by Apple/Google)
export const touchTarget = Math.max(44, rs(44));

// Tab bar dimensions
export const tabBar = {
  height: isSmallScreen ? 58 : isMediumScreen ? 62 : 68,
  bottomOffset: isSmallScreen ? 14 : isMediumScreen ? 18 : 24,
  sideOffset: isSmallScreen ? 12 : isMediumScreen ? 16 : 20,
  borderRadius: isSmallScreen ? 24 : 32,
};

// Card dimensions
export const card = {
  categoryMinHeight: isSmallScreen ? 140 : isMediumScreen ? 155 : 175,
  borderRadius: isSmallScreen ? 20 : 24,
  padding: isSmallScreen ? 12 : 16,
};

// FAB positioning
export const fab = {
  bottom: tabBar.height + tabBar.bottomOffset + (isSmallScreen ? 24 : 32),
  right: isSmallScreen ? 12 : 16,
  margin: isSmallScreen ? 12 : 16,
};

export default {
  rs,
  rvs,
  ms,
  screen,
  fontSize,
  spacing,
  radius,
  iconSize,
  touchTarget,
  tabBar,
  card,
  fab,
};
