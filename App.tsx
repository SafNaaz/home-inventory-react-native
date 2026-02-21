
import React, { useEffect, useState, useMemo, useContext } from 'react';
import { NavigationContainer, DefaultTheme as NavDefaultTheme, DarkTheme as NavDarkTheme } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { GestureHandlerRootView, FlatList, ScrollView } from 'react-native-gesture-handler';
import { Provider as PaperProvider, IconButton, Title, Paragraph, Button, Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { StatusBar, Alert, View, StyleSheet, AppState, TouchableOpacity, RefreshControl } from 'react-native';
import { rs, tabBar as tabBarDims, fontSize, spacing, iconSize } from './src/themes/Responsive';

// Screens
import InventoryScreen from './src/screens/InventoryScreen';
import ShoppingScreen from './src/screens/ShoppingScreen';
import InsightsScreen from './src/screens/InsightsScreen';
import NotesScreen from './src/screens/NotesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import NoteDetailScreen from './src/screens/NoteDetailScreen';
import SplashScreen from './src/screens/SplashScreen';
import ActivityHistoryScreen from './src/screens/ActivityHistoryScreen';

import NotificationSettingsScreen from './src/screens/NotificationSettingsScreen';
import { useColorScheme } from 'react-native';

// Managers
import { inventoryManager } from './src/managers/InventoryManager';
import { settingsManager } from './src/managers/SettingsManager';
import { notesManager } from './src/managers/NotesManager';

// Themes
import { lightTheme, darkTheme, commonStyles } from './src/themes/AppTheme';
import * as Notifications from 'expo-notifications';
import * as ExpoSplashScreen from 'expo-splash-screen';

// Keep the native splash screen visible while we fetch resources
ExpoSplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading app might cause error here, ignore */
});

export const SwipeContext = React.createContext({
  swipeEnabled: true,
  setSwipeEnabled: (enabled: boolean) => {},
});

const Tab = createMaterialTopTabNavigator();
const Stack = createStackNavigator();

// Tab Navigator Component
const TabNavigator = () => {
  const { swipeEnabled } = useContext(SwipeContext);
  const systemColorScheme = useColorScheme();
  const settings = settingsManager.getSettings();
  const themeMode = settings.themeMode;
  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      screenOptions={{
        swipeEnabled: swipeEnabled,
        animationEnabled: false,
      }}
      tabBar={({ state, descriptors, navigation }) => {
        return (
          <View style={{
            position: 'absolute',
            bottom: tabBarDims.bottomOffset,
            left: tabBarDims.sideOffset,
            right: tabBarDims.sideOffset,
            height: tabBarDims.height,
            backgroundColor: theme.colors.surface,
            borderRadius: tabBarDims.borderRadius,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-around',
            ...commonStyles.shadow,
            elevation: 8,
            paddingBottom: rs(4),
          }}>
            {state.routes.map((route, index) => {
              const isFocused = state.index === index;
              const color = isFocused ? theme.colors.primary : theme.colors.onSurfaceVariant;

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              let iconName: any;
              switch (route.name) {
                case 'Inventory': iconName = isFocused ? 'fridge' : 'fridge-outline'; break;
                case 'Shopping': iconName = isFocused ? 'cart' : 'cart-outline'; break;
                case 'Insights': iconName = isFocused ? 'chart-bar' : 'chart-bar'; break;
                case 'Notes': iconName = isFocused ? 'note-text' : 'note-text-outline'; break;
                default: iconName = 'circle';
              }

              return (
                <TouchableOpacity
                  key={route.key}
                  onPress={onPress}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                  activeOpacity={0.7}
                >
                  <Icon name={iconName} size={rs(24)} color={color} />
                  <Text style={{ 
                    fontSize: rs(10), 
                    color, 
                    fontWeight: '700',
                    marginTop: rs(2),
                  }}>
                    {route.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      }}
    >
      <Tab.Screen name="Inventory" component={InventoryScreen} />
      <Tab.Screen name="Shopping" component={ShoppingScreen} />
      <Tab.Screen name="Insights" component={InsightsScreen} />
      <Tab.Screen name="Notes" component={NotesScreen} />
    </Tab.Navigator>
  );
};

const App: React.FC = () => {
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('system');
  const systemColorScheme = useColorScheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSecurityEnabled, setIsSecurityEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const [swipeEnabled, setSwipeEnabled] = useState(true);

  useEffect(() => {
    // Initialize app
    initializeApp();

    // Set up listeners
    const settingsUnsubscribe = settingsManager.addListener(() => {
      const currentSettings = settingsManager.getSettings();
      setThemeMode(currentSettings.themeMode);
      setIsAuthenticated(currentSettings.isAuthenticated);
      setIsSecurityEnabled(currentSettings.isSecurityEnabled);
    });

    // AppState listener
    const appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'background') {
        settingsManager.recordBackgroundTime();
      } else if (nextAppState === 'active') {
        // Check if we need to lock the app
        if (settingsManager.shouldLockApp()) {
          console.log('🔒 Auto-locking app due to timeout');
          // Update local state first to show lock screen
          setIsAuthenticated(false);
          // Update manager state
          await settingsManager.setAuthenticated(false);
          
          // Trigger authentication
          const authSuccess = await settingsManager.checkAuthenticationIfNeeded();
          setIsAuthenticated(authSuccess);
        } else {
           console.log('🔓 App stays unlocked (within timeout)');
        }
        settingsManager.clearBackgroundTime();
      }
    });

    return () => {
      settingsUnsubscribe();
      appStateSubscription.remove();
    };
  }, []);

  const initializeApp = async () => {
    try {
      // Wait for settings to be fully loaded
      await settingsManager.waitForInitialization();

      // Load initial settings
      const settings = settingsManager.getSettings();
      setThemeMode(settings.themeMode);
      setIsSecurityEnabled(settings.isSecurityEnabled);
      setIsAuthenticated(settings.isAuthenticated);

      // Check authentication if needed
      if (settings.isSecurityEnabled && !settings.isAuthenticated) {
        const authSuccess = await settingsManager.checkAuthenticationIfNeeded();
        setIsAuthenticated(authSuccess);
      }

      // Clear all notifications on startup
      await Notifications.dismissAllNotificationsAsync();

      setIsLoading(false);
    } catch (error) {
      console.error('❌ Error initializing app:', error);
      setIsLoading(false);
    }
  };

  const handleSplashFinish = () => {
    setShowSplashScreen(false);
  };


  const handleAuthenticate = async () => {
    const success = await settingsManager.authenticateUser();
    setIsAuthenticated(success);
  };

  // Calculated effective theme
  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  // Show splash screen while initializing or during animation
  if (showSplashScreen) {
    return (
      <PaperProvider theme={theme}>
        <SplashScreen onAnimationFinish={handleSplashFinish} isDark={isDark} />
      </PaperProvider>
    );
  }

  // Show authentication screen if security is enabled but not authenticated
  if (isSecurityEnabled && !isAuthenticated) {
    return (
      <PaperProvider theme={theme}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={theme.colors.surface}
        />
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center', 
          backgroundColor: theme.colors.background,
          padding: 32,
        }}>
          <Icon name="lock" size={80} color={theme.colors.primary} style={{ marginBottom: 24 }} />
          <Title style={{ fontSize: 24, marginBottom: 8, color: theme.colors.onBackground }}>App Locked</Title>
          <Paragraph style={{ textAlign: 'center', marginBottom: 32, color: theme.colors.onSurfaceVariant }}>
            Please authenticate using your device security to access your home inventory.
          </Paragraph>
          <Button 
            mode="contained" 
            onPress={handleAuthenticate}
            icon="fingerprint"
            contentStyle={{ paddingHorizontal: 24, paddingVertical: 8 }}
          >
            Unlock Now
          </Button>
        </View>
      </PaperProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SwipeContext.Provider value={{ swipeEnabled, setSwipeEnabled }}>
    <PaperProvider theme={theme}>
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={isDark ? theme.colors.surface : theme.colors.background}
        />
        <NavigationContainer
          theme={{
            ... (isDark ? NavDarkTheme : NavDefaultTheme),
            colors: {
              ...(isDark ? NavDarkTheme.colors : NavDefaultTheme.colors),
              primary: theme.colors.primary,
              background: theme.colors.background,
              card: theme.colors.surface,
              text: theme.colors.onSurface,
              border: theme.colors.outline,
              notification: theme.colors.error,
            },
          }}
        >
          <Stack.Navigator
            screenOptions={{
              headerStyle: {
                backgroundColor: theme.colors.background,
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 0,
              },
              headerTintColor: theme.colors.onSurface,
              headerTitleStyle: {
                fontWeight: '600',
                textAlign: 'left',
              },
              headerTitleAlign: 'left',
              cardStyle: { backgroundColor: theme.colors.background },
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              gestureResponseDistance: 50,
              cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            }}
          >
            <Stack.Screen 
              name="MainTabs" 
              component={TabNavigator}
              options={({ route, navigation }: any) => {
                const routeName = getFocusedRouteNameFromRoute(route) ?? 'Inventory';
                let headerTitle = 'Inventory';
                switch (routeName) {
                  case 'Inventory': headerTitle = 'Inventory'; break;
                  case 'Shopping': headerTitle = 'Shopping List'; break;
                  case 'Insights': headerTitle = 'Insights'; break;
                  case 'Notes': headerTitle = 'Notes'; break;
                }
                
                return {
                  headerShown: true,
                  title: headerTitle,
                  headerTitleAlign: 'center',
                  headerTitleStyle: {
                    fontWeight: '800',
                    fontSize: fontSize.xl,
                    color: theme.colors.onBackground,
                    letterSpacing: -0.5,
                  },
                  headerStyle: {
                    backgroundColor: theme.colors.background,
                    elevation: 0,
                    shadowOpacity: 0,
                    borderBottomWidth: 0,
                  },
                  headerLeft: () => null,
                  headerRight: () => (
                    <View style={{ marginRight: 16 }}>
                      <IconButton
                        icon="cog"
                        size={22}
                        iconColor={theme.colors.onSurfaceVariant}
                        onPress={() => navigation.navigate('Settings')}
                        style={{ margin: 0, backgroundColor: theme.colors.surfaceVariant }}
                      />
                    </View>
                  ),
                };
              }}
            />
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen}
              options={{ 
                title: 'Settings',
                headerBackTitleVisible: false,
              }}
            />
            <Stack.Screen 
              name="NotificationSettings" 
              component={NotificationSettingsScreen}
              options={{ 
                title: 'Notification Settings',
                headerBackTitleVisible: false,
              }}
            />
            <Stack.Screen 
              name="NoteDetail" 
              component={NoteDetailScreen}
              options={{ 
                title: 'Note',
                headerBackTitleVisible: false,
              }}
            />
            <Stack.Screen 
              name="ActivityHistory" 
              component={ActivityHistoryScreen}
              options={{ 
                title: 'Activity History',
                headerBackTitleVisible: false,
                gestureResponseDistance: 40,
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </View>
    </PaperProvider>
    </SwipeContext.Provider>
    </GestureHandlerRootView>
  );
};

export default App;