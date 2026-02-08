
import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme as NavDefaultTheme, DarkTheme as NavDarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider as PaperProvider, IconButton, Title, Paragraph, Button } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { StatusBar, Alert, View, StyleSheet, AppState } from 'react-native';

// Screens
import InventoryScreen from './src/screens/InventoryScreen';
import ShoppingScreen from './src/screens/ShoppingScreen';
import InsightsScreen from './src/screens/InsightsScreen';
import NotesScreen from './src/screens/NotesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import NoteDetailScreen from './src/screens/NoteDetailScreen';

import NotificationSettingsScreen from './src/screens/NotificationSettingsScreen';
import { useColorScheme } from 'react-native';

// Managers
import { inventoryManager } from './src/managers/InventoryManager';
import { settingsManager } from './src/managers/SettingsManager';
import { notesManager } from './src/managers/NotesManager';

// Themes
import { lightTheme, darkTheme, commonStyles } from './src/themes/AppTheme';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const App: React.FC = () => {
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('system');
  const systemColorScheme = useColorScheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSecurityEnabled, setIsSecurityEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);



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

      setIsLoading(false);
    } catch (error) {
      console.error('❌ Error initializing app:', error);
      setIsLoading(false);
    }
  };

  const handleAuthenticate = async () => {
    const success = await settingsManager.authenticateUser();
    setIsAuthenticated(success);
  };

  // Calculated effective theme
  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  // Show loading screen while initializing
  if (isLoading) {
    return (
      <PaperProvider theme={theme}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={theme.colors.surface}
        />
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

  // Tab Navigator Component
  const TabNavigator = () => {
    return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: string;

            switch (route.name) {
              case 'Inventory':
                iconName = focused ? 'fridge' : 'fridge-outline';
                break;
              case 'Shopping':
                iconName = focused ? 'cart' : 'cart-outline';
                break;
              case 'Insights':
                iconName = focused ? 'chart-bar' : 'chart-bar';
                break;
              case 'Notes':
                iconName = focused ? 'note-text' : 'note-text-outline';
                break;
              default:
                iconName = 'circle';
            }

            return <Icon name={iconName as any} size={size} color={color} />;
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
          tabBarShowLabel: true,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginBottom: 4,
          },
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopWidth: 0,
            height: 65,
            paddingBottom: 10,
            paddingTop: 10,
            position: 'absolute',
            bottom: 20,
            left: 20,
            right: 20,
            borderRadius: 32,
            ...commonStyles.shadow,
            elevation: 8,
          },
          headerStyle: {
            backgroundColor: theme.colors.background,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontWeight: '800',
            fontSize: 22,
            color: theme.colors.onBackground,
            letterSpacing: -0.5,
          },
          headerLeft: () => null,
        })}
      >
        <Tab.Screen 
          name="Inventory" 
          component={InventoryScreen}
          options={({ navigation }) => ({
            title: 'Inventory',
            headerRight: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12, gap: 4 }}>
                <IconButton
                  icon={settingsManager.isInventoryReminderEnabled() ? "bell" : "bell-outline"}
                  size={22}
                  iconColor={settingsManager.isInventoryReminderEnabled() ? theme.colors.primary : theme.colors.onSurfaceVariant}
                  onPress={() => navigation.navigate('NotificationSettings')}
                  style={{ margin: 0, backgroundColor: theme.colors.surfaceVariant }}
                />
                <IconButton
                  icon="cog"
                  size={22}
                  iconColor={theme.colors.onSurfaceVariant}
                  onPress={() => navigation.navigate('Settings')}
                  style={{ margin: 0, backgroundColor: theme.colors.surfaceVariant }}
                />
              </View>
            ),
          })}
        />
        <Tab.Screen 
          name="Shopping" 
          component={ShoppingScreen}
          options={({ navigation }) => ({
            title: 'Shopping List',
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
          })}
        />
        <Tab.Screen 
          name="Insights" 
          component={InsightsScreen}
          options={({ navigation }) => ({
            title: 'Insights',
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
          })}
        />
        <Tab.Screen 
          name="Notes" 
          component={NotesScreen}
          options={({ navigation }) => ({
            title: 'Notes',
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
          })}
        />
      </Tab.Navigator>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <PaperProvider theme={theme}>
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={theme.colors.surface}
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
                backgroundColor: theme.colors.surface,
              },
              headerTintColor: theme.colors.onSurface,
              headerTitleStyle: {
                fontWeight: '600',
                textAlign: 'left',
              },
              headerTitleAlign: 'left',
              cardStyle: { backgroundColor: theme.colors.background },
            }}
          >
            <Stack.Screen 
              name="MainTabs" 
              component={TabNavigator}
              options={{ headerShown: false }}
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
          </Stack.Navigator>
        </NavigationContainer>
      </View>
    </PaperProvider>
    </GestureHandlerRootView>
  );
};

export default App;