import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// MARK: - Light Theme
export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0F172A', // Slate 900 (Clean, professional)
    primaryContainer: '#F1F5F9',
    secondary: '#334155', // Slate 700
    secondaryContainer: '#E0E7FF', // Indigo tint (Distinct from Slate)
    tertiary: '#475569', // Slate 600
    tertiaryContainer: '#F1F5F9',
    surface: '#FFFFFF',
    surfaceVariant: '#E2E8F0', // Slightly darker slate for variants
    background: '#FFFFFF', // Pure white background
    error: '#EF4444',
    errorContainer: '#FEF2F2',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#1E1B4B',
    onSecondary: '#FFFFFF',
    onSecondaryContainer: '#3730A3', // Indigo 800
    onTertiary: '#FFFFFF',
    onTertiaryContainer: '#4C0519',
    onSurface: '#0F172A',
    onSurfaceVariant: '#64748B',
    onBackground: '#0F172A',
    onError: '#FFFFFF',
    onErrorContainer: '#450A0A',
    outline: '#E2E8F0',
    outlineVariant: '#CBD5E1',
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#1E293B',
    inverseOnSurface: '#F8FAFC',
    inversePrimary: '#C7D2FE',
    // Custom colors for categories
    fridge: '#2563EB', // Blue
    grocery: '#475569', // Slate 600 instead of Green
    hygiene: '#64748B', // Neutral Slate
    personalCare: '#94A3B8', // Neutral Slate variant
    // Status colors
    lowStock: '#F59E0B', // Amber
    mediumStock: '#FBBF24', // Yellow
    highStock: '#10B981', // Emerald
    outOfStock: '#EF4444', // Red
  },
};

// MARK: - Dark Theme
export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#CBD5E1', // Slate 200 - Softer than near-white
    primaryContainer: '#334155',
    secondary: '#94A3B8', 
    secondaryContainer: '#1E293B',
    tertiary: '#64748B',
    tertiaryContainer: '#0F172A',
    surface: '#1E293B', // Slate 800
    surfaceVariant: '#0F172A', // Slate 900
    background: '#020617', // Slate 950
    error: '#F87171',
    errorContainer: '#450A0A',
    onPrimary: '#0F172A', // Slate 900 (High contrast for light primary)
    onPrimaryContainer: '#D1D5DB', // Soft gray instead of white
    onSecondary: '#020617',
    onSecondaryContainer: '#D1D5DB',
    onTertiary: '#F1F5F9',
    onTertiaryContainer: '#D1D5DB',
    onSurface: '#D1D5DB', // Gray 300 - Softer text for dark mode
    onSurfaceVariant: '#94A3B8',
    onBackground: '#D1D5DB', // Gray 300
    onError: '#450A0A',
    onErrorContainer: '#FECACA',
    outline: '#334155',
    outlineVariant: '#1E293B',
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#F1F5F9',
    inverseOnSurface: '#0F172A',
    inversePrimary: '#4F46E5',
    // Custom colors for categories
    fridge: '#60A5FA',
    grocery: '#94A3B8', // Softer slate instead of green
    hygiene: '#94A3B8',
    personalCare: '#CBD5E1',
    // Status colors
    lowStock: '#FBBF24',
    mediumStock: '#FDE047',
    highStock: '#34D399',
    outOfStock: '#F87171',
  },
};

// MARK: - Theme Type Extension
declare global {
  namespace ReactNativePaper {
    interface ThemeColors {
      fridge: string;
      grocery: string;
      hygiene: string;
      personalCare: string;
      lowStock: string;
      mediumStock: string;
      highStock: string;
      outOfStock: string;
    }
  }
}

// MARK: - Helper Functions
export const getStockColor = (quantity: number, isDark: boolean = false) => {
  const theme = isDark ? darkTheme : lightTheme;
  const percentage = Math.round(quantity * 100);
  
  if (percentage <= 0) {
    return theme.colors.outOfStock;
  } else if (percentage < 25) {
    return theme.colors.lowStock;
  } else if (percentage < 50) {
    return theme.colors.mediumStock;
  } else {
    return theme.colors.highStock;
  }
};

export const getCategoryColor = (category: string, isDark: boolean = false) => {
  const theme = isDark ? darkTheme : lightTheme;
  
  switch (category.toLowerCase()) {
    case 'fridge':
      return theme.colors.fridge;
    case 'grocery':
      return theme.colors.grocery;
    case 'hygiene':
      return theme.colors.hygiene;
    case 'personal care':
    case 'personalcare':
      return theme.colors.personalCare;
    default:
      return theme.colors.primary;
  }
};

export const getContrastColor = (backgroundColor: string) => {
  // Simple contrast calculation - in a real app you might want a more sophisticated algorithm
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#0F172A' : '#FFFFFF';
};

export const getDialogTheme = (isDark: boolean) => {
  const baseTheme = isDark ? darkTheme : lightTheme;
  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      elevation: isDark ? baseTheme.colors.elevation : {
        level0: 'transparent',
        level1: '#FFFFFF',
        level2: '#FFFFFF',
        level3: '#FFFFFF',
        level4: '#FFFFFF',
        level5: '#FFFFFF',
      },
      surface: isDark ? baseTheme.colors.surface : '#FFFFFF',
    },
  };
};

// For backward compatibility while I refactor screens
export const whiteDialogTheme = lightTheme; 
export const darkDialogTheme = darkTheme;

// MARK: - Common Styles
export const commonStyles = {
  shadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  },
  glass: {
    backgroundColor: '#FFFFFF', // Solid white
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  glassDark: {
    backgroundColor: '#1E293B', // Solid slate
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardPadding: 20,
  borderRadius: 24, // Smoother, larger radius
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
};