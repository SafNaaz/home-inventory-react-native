
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { StatusBar, Alert, View } from 'react-native';

// Screens
import InventoryScreen from './src/screens/InventoryScreen';
import ShoppingScreen from './src/screens/ShoppingScreen';
import InsightsScreen from './src/screens/InsightsScreen';
import NotesScreen from './src/screens/NotesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import NotificationSettingsScreen from './src/screens/NotificationSettingsScreen';

// Managers
import { inventoryManager } from './src/managers/InventoryManager';
import { settingsManager } from './src/managers/SettingsManager';
import { notesManager } from './src/managers/NotesManager';

// Themes
import { lightTheme, darkTheme } from './src/themes/AppTheme';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSecurityEnabled, setIsSecurityEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize app
    initializeApp();

    // Set up listeners
    const settingsUnsubscribe = settingsManager.addListener(() => {
      setIsDarkMode(settingsManager.isDarkModeEnabled());
      setIsAuthenticated(settingsManager.isAuthenticated());
      setIsSecurityEnabled(settingsManager.isSecurityEnabled());
    });

    return () => {
      settingsUnsubscribe();
    };
  }, []);

  const initializeApp = async () => {
    try {
      // Load initial settings
      const settings = settingsManager.getSettings();
      setIsDarkMode(settings.isDarkMode);
      setIsSecurityEnabled(settings.isSecurityEnabled);
      setIsAuthenticated(settings.isAuthenticated);

      // Check authentication if needed
      if (settings.isSecurityEnabled && !settings.isAuthenticated) {
        const authSuccess = await settingsManager.checkAuthenticationIfNeeded();
        setIsAuthenticated(authSuccess);
        
        if (!authSuccess) {
          Alert.alert(
            'Authentication Required',
            'Please authenticate to access the app.',
            [
              {
                text: 'Retry',
                onPress: () => initializeApp(),
              },
              {
                text: 'Exit',
                onPress: () => {
                  // In a real app, you might want to close the app or show a locked screen
                },
                style: 'cancel',
              },
            ]
          );
          return;
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error('❌ Error initializing app:', error);
      setIsLoading(false);
    }
  };

  // Show loading screen while initializing
  if (isLoading) {
    return (
      <PaperProvider theme={isDarkMode ? darkTheme : lightTheme}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={isDarkMode ? '#121212' : '#ffffff'}
        />
        {/* You can create a proper loading screen component here */}
      </PaperProvider>
    );
  }

  // Show authentication screen if security is enabled but not authenticated
  if (isSecurityEnabled && !isAuthenticated) {
    return (
      <PaperProvider theme={isDarkMode ? darkTheme : lightTheme}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={isDarkMode ? '#121212' : '#ffffff'}
        />
        {/* You can create a proper authentication screen component here */}
      </PaperProvider>
    );
  }

  const theme = isDarkMode ? darkTheme : lightTheme;

  // Tab Navigator Component
  const TabNavigator = () => {
    const currentTheme = isDarkMode ? darkTheme : lightTheme;
    
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
            tabBarStyle: {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.outline,
            },
            headerStyle: {
              backgroundColor: theme.colors.surface,
            },
            headerTintColor: theme.colors.onSurface,
            headerTitleStyle: {
              fontWeight: '600',
              textAlign: 'left',
            },
            headerTitleAlign: 'left',
          })}
        >
          <Tab.Screen 
            name="Inventory" 
            component={InventoryScreen}
            options={({ navigation }) => ({
              title: 'Inventory',
              headerRight: () => (
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  marginRight: 8,
                  paddingHorizontal: 4,
                }}>
                  <IconButton
                    icon={settingsManager.isInventoryReminderEnabled() ? "bell" : "bell-outline"}
                    size={24}
                    iconColor={settingsManager.isInventoryReminderEnabled() ? currentTheme.colors.primary : currentTheme.colors.onSurfaceVariant}
                    style={{ marginHorizontal: 2 }}
                    onPress={() => navigation.navigate('NotificationSettings')}
                  />
                  <IconButton
                    icon="cog"
                    size={24}
                    iconColor={currentTheme.colors.onSurfaceVariant}
                    style={{ marginHorizontal: 2 }}
                    onPress={() => navigation.navigate('Settings')}
                  />
                  <IconButton
                    icon={settingsManager.isDarkModeEnabled() ? "white-balance-sunny" : "moon-waning-crescent"}
                    size={24}
                    iconColor={settingsManager.isDarkModeEnabled() ? '#FF9500' : '#8E44AD'}
                    style={{ marginHorizontal: 2 }}
                    onPress={async () => await settingsManager.toggleDarkMode()}
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
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  marginRight: 8,
                  paddingHorizontal: 4,
                }}>
                  <IconButton
                    icon={settingsManager.isInventoryReminderEnabled() ? "bell" : "bell-outline"}
                    size={24}
                    iconColor={settingsManager.isInventoryReminderEnabled() ? currentTheme.colors.primary : currentTheme.colors.onSurfaceVariant}
                    style={{ marginHorizontal: 2 }}
                    onPress={() => navigation.navigate('NotificationSettings')}
                  />
                  <IconButton
                    icon="cog"
                    size={24}
                    iconColor={currentTheme.colors.onSurfaceVariant}
                    style={{ marginHorizontal: 2 }}
                    onPress={() => navigation.navigate('Settings')}
                  />
                  <IconButton
                    icon={settingsManager.isDarkModeEnabled() ? "white-balance-sunny" : "moon-waning-crescent"}
                    size={24}
                    iconColor={settingsManager.isDarkModeEnabled() ? '#FF9500' : '#8E44AD'}
                    style={{ marginHorizontal: 2 }}
                    onPress={async () => await settingsManager.toggleDarkMode()}
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
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  marginRight: 8,
                  paddingHorizontal: 4,
                }}>
                  <IconButton
                    icon={settingsManager.isInventoryReminderEnabled() ? "bell" : "bell-outline"}
                    size={24}
                    iconColor={settingsManager.isInventoryReminderEnabled() ? currentTheme.colors.primary : currentTheme.colors.onSurfaceVariant}
                    style={{ marginHorizontal: 2 }}
                    onPress={() => navigation.navigate('NotificationSettings')}
                  />
                  <IconButton
                    icon="cog"
                    size={24}
                    iconColor={currentTheme.colors.onSurfaceVariant}
                    style={{ marginHorizontal: 2 }}
                    onPress={() => navigation.navigate('Settings')}
                  />
                  <IconButton
                    icon={settingsManager.isDarkModeEnabled() ? "white-balance-sunny" : "moon-waning-crescent"}
                    size={24}
                    iconColor={settingsManager.isDarkModeEnabled() ? '#FF9500' : '#8E44AD'}
                    style={{ marginHorizontal: 2 }}
                    onPress={async () => await settingsManager.toggleDarkMode()}
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
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  marginRight: 8,
                  paddingHorizontal: 4,
                }}>
                  <IconButton
                    icon={settingsManager.isInventoryReminderEnabled() ? "bell" : "bell-outline"}
                    size={24}
                    iconColor={settingsManager.isInventoryReminderEnabled() ? currentTheme.colors.primary : currentTheme.colors.onSurfaceVariant}
                    style={{ marginHorizontal: 2 }}
                    onPress={() => navigation.navigate('NotificationSettings')}
                  />
                  <IconButton
                    icon="cog"
                    size={24}
                    iconColor={currentTheme.colors.onSurfaceVariant}
                    style={{ marginHorizontal: 2 }}
                    onPress={() => navigation.navigate('Settings')}
                  />
                  <IconButton
                    icon={settingsManager.isDarkModeEnabled() ? "white-balance-sunny" : "moon-waning-crescent"}
                    size={24}
                    iconColor={settingsManager.isDarkModeEnabled() ? '#FF9500' : '#8E44AD'}
                    style={{ marginHorizontal: 2 }}
                    onPress={async () => await settingsManager.toggleDarkMode()}
                  />
                </View>
              ),
            })}
          />
        </Tab.Navigator>
    );
  };

  return (
    <PaperProvider theme={theme}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.surface}
      />
      <NavigationContainer>
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
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
};

export default App;