import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// MARK: - Light Theme
export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#007AFF',
    primaryContainer: '#E3F2FD',
    secondary: '#34C759',
    secondaryContainer: '#E8F5E8',
    tertiary: '#FF2D92',
    tertiaryContainer: '#FCE4EC',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    background: '#FAFAFA',
    error: '#FF3B30',
    errorContainer: '#FFEBEE',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#001F2A',
    onSecondary: '#FFFFFF',
    onSecondaryContainer: '#002106',
    onTertiary: '#FFFFFF',
    onTertiaryContainer: '#3B0A1C',
    onSurface: '#1C1B1F',
    onSurfaceVariant: '#49454F',
    onBackground: '#1C1B1F',
    onError: '#FFFFFF',
    onErrorContainer: '#410E0B',
    outline: '#79747E',
    outlineVariant: '#CAC4D0',
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#313033',
    inverseOnSurface: '#F4EFF4',
    inversePrimary: '#9ECAFF',
    // Custom colors for categories
    fridge: '#007AFF',
    grocery: '#34C759',
    hygiene: '#32D74B',
    personalCare: '#FF2D92',
    // Status colors
    lowStock: '#FF9500',
    mediumStock: '#FFD60A',
    highStock: '#34C759',
    outOfStock: '#FF3B30',
  },
};

// MARK: - Dark Theme
export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#9ECAFF',
    primaryContainer: '#004A77',
    secondary: '#74DD87',
    secondaryContainer: '#00390C',
    tertiary: '#FFB3DA',
    tertiaryContainer: '#5D1049',
    surface: '#121212',
    surfaceVariant: '#1E1E1E',
    background: '#0F0F0F',
    error: '#FFB4AB',
    errorContainer: '#93000A',
    onPrimary: '#003258',
    onPrimaryContainer: '#CFE5FF',
    onSecondary: '#003A00',
    onSecondaryContainer: '#90F59F',
    onTertiary: '#5D1049',
    onTertiaryContainer: '#FFD8E4',
    onSurface: '#E6E1E5',
    onSurfaceVariant: '#CAC4D0',
    onBackground: '#E6E1E5',
    onError: '#690005',
    onErrorContainer: '#FFDAD6',
    outline: '#938F99',
    outlineVariant: '#49454F',
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#E6E1E5',
    inverseOnSurface: '#313033',
    inversePrimary: '#0061A4',
    // Custom colors for categories (adjusted for dark mode)
    fridge: '#9ECAFF',
    grocery: '#74DD87',
    hygiene: '#64D2FF',
    personalCare: '#FFB3DA',
    // Status colors (adjusted for dark mode)
    lowStock: '#FFB86C',
    mediumStock: '#F1FA8C',
    highStock: '#50FA7B',
    outOfStock: '#FF5555',
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
  
  if (quantity <= 0) {
    return theme.colors.outOfStock;
  } else if (quantity <= 0.25) {
    return theme.colors.lowStock;
  } else if (quantity <= 0.5) {
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
  return brightness > 128 ? '#000000' : '#FFFFFF';
};

// MARK: - Common Styles
export const commonStyles = {
  shadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardPadding: 16,
  borderRadius: 12,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
};