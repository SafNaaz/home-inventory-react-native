import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// MARK: - Light Theme
export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6366F1', // Modern Indigo
    primaryContainer: '#EEF2FF',
    secondary: '#10B981', // Emerald
    secondaryContainer: '#ECFDF5',
    tertiary: '#F43F5E', // Rose
    tertiaryContainer: '#FFF1F2',
    surface: '#FFFFFF',
    surfaceVariant: '#F8FAFC',
    background: '#F1F5F9',
    error: '#EF4444',
    errorContainer: '#FEF2F2',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#1E1B4B',
    onSecondary: '#FFFFFF',
    onSecondaryContainer: '#064E3B',
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
    fridge: '#3B82F6', // Blue
    grocery: '#10B981', // Green
    hygiene: '#06B6D4', // Cyan
    personalCare: '#EC4899', // Pink
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
    primary: '#818CF8', // Soft Indigo
    primaryContainer: '#312E81',
    secondary: '#34D399', // Soft Emerald
    secondaryContainer: '#064E3B',
    tertiary: '#FB7185', // Soft Rose
    tertiaryContainer: '#4C0519',
    surface: '#1E293B', // Slate 800
    surfaceVariant: '#0F172A', // Slate 900
    background: '#020617', // Slate 950
    error: '#F87171',
    errorContainer: '#450A0A',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#E0E7FF',
    onSecondary: '#FFFFFF',
    onSecondaryContainer: '#D1FAE5',
    onTertiary: '#FFFFFF',
    onTertiaryContainer: '#FFE4E6',
    onSurface: '#F1F5F9',
    onSurfaceVariant: '#94A3B8',
    onBackground: '#F1F5F9',
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
    grocery: '#34D399',
    hygiene: '#22D3EE',
    personalCare: '#F472B6',
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
  } else if (percentage <= 25) {
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
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  glassDark: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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