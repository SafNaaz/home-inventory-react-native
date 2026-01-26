
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider, IconButton, Title, Paragraph, Button } from 'react-native-paper';
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
import { lightTheme, darkTheme, commonStyles } from './src/themes/AppTheme';

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
              }
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

  const handleAuthenticate = async () => {
    const success = await settingsManager.authenticateUser();
    setIsAuthenticated(success);
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
    const theme = isDarkMode ? darkTheme : lightTheme;
    return (
      <PaperProvider theme={theme}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
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
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  marginRight: 12,
                  gap: 4,
                }}>
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
                  <IconButton
                    icon={settingsManager.isDarkModeEnabled() ? "white-balance-sunny" : "moon-waning-crescent"}
                    size={22}
                    iconColor={theme.colors.primary}
                    onPress={async () => await settingsManager.toggleDarkMode()}
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
                    icon={settingsManager.isDarkModeEnabled() ? "white-balance-sunny" : "moon-waning-crescent"}
                    size={24}
                    iconColor={theme.colors.primary}
                    onPress={async () => await settingsManager.toggleDarkMode()}
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
                    icon={settingsManager.isDarkModeEnabled() ? "white-balance-sunny" : "moon-waning-crescent"}
                    size={24}
                    iconColor={theme.colors.primary}
                    onPress={async () => await settingsManager.toggleDarkMode()}
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
                    icon={settingsManager.isDarkModeEnabled() ? "white-balance-sunny" : "moon-waning-crescent"}
                    size={24}
                    iconColor={theme.colors.primary}
                    onPress={async () => await settingsManager.toggleDarkMode()}
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