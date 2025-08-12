import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Switch,
  Button,
  List,
  Divider,
  Text,
  useTheme,
  Portal,
  Dialog,
  TextInput,
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { settingsManager } from '../managers/SettingsManager';
import { inventoryManager } from '../managers/InventoryManager';
import { notesManager } from '../managers/NotesManager';
import { AppSettings } from '../models/Types';
import { commonStyles } from '../themes/AppTheme';

const SettingsScreen: React.FC = () => {
  const theme = useTheme();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timePickerType, setTimePickerType] = useState<'time1' | 'time2'>('time1');
  const [resetDialogVisible, setResetDialogVisible] = useState(false);
  const [exportDialogVisible, setExportDialogVisible] = useState(false);
  const [exportData, setExportData] = useState('');

  useEffect(() => {
    // Load initial data
    loadSettingsData();

    // Set up listener for data changes
    const unsubscribe = settingsManager.addListener(() => {
      loadSettingsData();
    });

    return unsubscribe;
  }, []);

  const loadSettingsData = () => {
    const currentSettings = settingsManager.getSettings();
    setSettings(currentSettings);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    loadSettingsData();
    setRefreshing(false);
  };

  const handleToggleDarkMode = async () => {
    await settingsManager.toggleDarkMode();
  };

  const handleToggleSecurity = async () => {
    await settingsManager.toggleSecurity();
  };

  const handleToggleInventoryReminder = async () => {
    await settingsManager.toggleInventoryReminder();
  };

  const handleToggleSecondReminder = async () => {
    await settingsManager.toggleSecondReminder();
  };

  const handleTimePickerOpen = (type: 'time1' | 'time2') => {
    setTimePickerType(type);
    setTimePickerVisible(true);
  };

  const handleTimePickerConfirm = async (date: Date) => {
    if (timePickerType === 'time1') {
      await settingsManager.updateReminderTime1(date);
    } else {
      await settingsManager.updateReminderTime2(date);
    }
    setTimePickerVisible(false);
  };

  const handleResetAllData = () => {
    Alert.alert(
      'Reset All Data',
      'This will permanently delete all your inventory items, shopping lists, notes, and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset All Data',
          style: 'destructive',
          onPress: async () => {
            await Promise.all([
              inventoryManager.clearAllData(),
              notesManager.clearAllNotes(),
              settingsManager.resetToDefaults(),
            ]);
            Alert.alert('Data Reset', 'All data has been cleared successfully.');
          },
        },
      ]
    );
  };

  const handleResetToDefaults = () => {
    setResetDialogVisible(true);
  };

  const handleConfirmResetToDefaults = async () => {
    await inventoryManager.resetToDefaults();
    setResetDialogVisible(false);
    Alert.alert(
      'Defaults Restored',
      'Your inventory has been reset with sample items. Your notes and settings remain unchanged.'
    );
  };

  const handleExportData = async () => {
    try {
      const notesData = notesManager.exportNotesToJSON();
      const inventoryStats = {
        totalItems: inventoryManager.getTotalItems(),
        lowStockItems: inventoryManager.getLowStockItemsCount(),
        averageStockLevel: inventoryManager.getAverageStockLevel(),
        activeCategories: inventoryManager.getActiveCategoriesCount(),
      };

      const exportData = {
        exportDate: new Date().toISOString(),
        notes: JSON.parse(notesData),
        inventoryStats,
        settings: settingsManager.getSettings(),
      };

      setExportData(JSON.stringify(exportData, null, 2));
      setExportDialogVisible(true);
    } catch (error) {
      Alert.alert('Export Error', 'Failed to export data. Please try again.');
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStorageInfo = (): string => {
    if (!settings) return 'Loading...';
    
    const itemsCount = inventoryManager.getTotalItems();
    const notesCount = notesManager.getTotalNotes();
    const historyCount = settings.miscItemHistory.length;
    
    return `${itemsCount} items, ${notesCount} notes, ${historyCount} history items`;
  };

  const renderAppearanceSection = () => (
    <Card style={styles.sectionCard}>
      <Card.Content>
        <Title style={styles.sectionTitle}>Appearance</Title>
        
        <List.Item
          title="Dark Mode"
          description="Use dark theme throughout the app"
          left={() => <Icon name="weather-night" size={24} color={theme.colors.onSurface} />}
          right={() => (
            <Switch
              value={settings?.isDarkMode || false}
              onValueChange={handleToggleDarkMode}
            />
          )}
        />
      </Card.Content>
    </Card>
  );

  const renderSecuritySection = () => (
    <Card style={styles.sectionCard}>
      <Card.Content>
        <Title style={styles.sectionTitle}>Security</Title>
        
        <List.Item
          title="App Lock"
          description="Require biometric authentication to access the app"
          left={() => <Icon name="fingerprint" size={24} color={theme.colors.onSurface} />}
          right={() => (
            <Switch
              value={settings?.isSecurityEnabled || false}
              onValueChange={handleToggleSecurity}
            />
          )}
        />
        
        {settings?.isSecurityEnabled && (
          <Paragraph style={styles.securityNote}>
            Authentication status: {settings.isAuthenticated ? 'Authenticated' : 'Not authenticated'}
          </Paragraph>
        )}
      </Card.Content>
    </Card>
  );

  const renderNotificationsSection = () => (
    <Card style={styles.sectionCard}>
      <Card.Content>
        <Title style={styles.sectionTitle}>Notifications</Title>
        
        <List.Item
          title="Inventory Reminders"
          description="Get reminded to update your inventory levels"
          left={() => <Icon name="bell-outline" size={24} color={theme.colors.onSurface} />}
          right={() => (
            <Switch
              value={settings?.isInventoryReminderEnabled || false}
              onValueChange={handleToggleInventoryReminder}
            />
          )}
        />
        
        {settings?.isInventoryReminderEnabled && (
          <>
            <List.Item
              title="First Reminder"
              description={`Daily at ${formatTime(settings.reminderTime1)}`}
              left={() => <Icon name="clock-outline" size={24} color={theme.colors.onSurface} />}
              onPress={() => handleTimePickerOpen('time1')}
            />
            
            <List.Item
              title="Second Reminder"
              description={
                settings.isSecondReminderEnabled 
                  ? `Daily at ${formatTime(settings.reminderTime2)}`
                  : 'Disabled'
              }
              left={() => <Icon name="clock-outline" size={24} color={theme.colors.onSurface} />}
              right={() => (
                <Switch
                  value={settings.isSecondReminderEnabled}
                  onValueChange={handleToggleSecondReminder}
                />
              )}
              onPress={() => settings.isSecondReminderEnabled && handleTimePickerOpen('time2')}
            />
          </>
        )}
      </Card.Content>
    </Card>
  );

  const renderDataSection = () => (
    <Card style={styles.sectionCard}>
      <Card.Content>
        <Title style={styles.sectionTitle}>Data Management</Title>
        
        <List.Item
          title="Storage Usage"
          description={getStorageInfo()}
          left={() => <Icon name="database" size={24} color={theme.colors.onSurface} />}
        />
        
        <Divider style={styles.divider} />
        
        <List.Item
          title="Export Data"
          description="Export your notes and statistics"
          left={() => <Icon name="export" size={24} color={theme.colors.onSurface} />}
          onPress={handleExportData}
        />
        
        <List.Item
          title="Reset to Sample Data"
          description="Replace inventory with sample items"
          left={() => <Icon name="refresh" size={24} color={theme.colors.onSurface} />}
          onPress={handleResetToDefaults}
        />
        
        <List.Item
          title="Clear All Data"
          description="Permanently delete all data"
          left={() => <Icon name="delete-forever" size={24} color={theme.colors.error} />}
          titleStyle={{ color: theme.colors.error }}
          onPress={handleResetAllData}
        />
      </Card.Content>
    </Card>
  );

  const renderAboutSection = () => (
    <Card style={styles.sectionCard}>
      <Card.Content>
        <Title style={styles.sectionTitle}>About</Title>
        
        <List.Item
          title="Household Inventory"
          description="Version 1.0.0"
          left={() => <Icon name="information-outline" size={24} color={theme.colors.onSurface} />}
        />
        
        <List.Item
          title="Features"
          description="Inventory tracking, shopping lists, notes, and more"
          left={() => <Icon name="feature-search-outline" size={24} color={theme.colors.onSurface} />}
        />
        
        <Paragraph style={styles.aboutText}>
          Keep track of your household items, generate smart shopping lists, and take notes - all in one place.
        </Paragraph>
      </Card.Content>
    </Card>
  );

  const renderTimePicker = () => {
    if (!timePickerVisible || !settings) return null;
    
    return (
      <DateTimePicker
        value={timePickerType === 'time1' ? settings.reminderTime1 : settings.reminderTime2}
        mode="time"
        is24Hour={false}
        onChange={(event, selectedDate) => {
          setTimePickerVisible(false);
          if (selectedDate) {
            handleTimePickerConfirm(selectedDate);
          }
        }}
      />
    );
  };

  const renderResetDialog = () => (
    <Portal>
      <Dialog visible={resetDialogVisible} onDismiss={() => setResetDialogVisible(false)}>
        <Dialog.Title>Reset to Sample Data</Dialog.Title>
        <Dialog.Content>
          <Paragraph>
            This will replace your current inventory items with sample data. Your notes and settings will remain unchanged.
          </Paragraph>
          <Paragraph style={[styles.warningText, { color: theme.colors.error }]}>
            This action cannot be undone.
          </Paragraph>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setResetDialogVisible(false)}>Cancel</Button>
          <Button onPress={handleConfirmResetToDefaults} mode="contained">
            Reset to Defaults
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  const renderExportDialog = () => (
    <Portal>
      <Dialog visible={exportDialogVisible} onDismiss={() => setExportDialogVisible(false)}>
        <Dialog.Title>Export Data</Dialog.Title>
        <Dialog.ScrollArea style={styles.exportScrollArea}>
          <ScrollView>
            <TextInput
              value={exportData}
              multiline
              numberOfLines={10}
              mode="outlined"
              editable={false}
              style={styles.exportTextInput}
            />
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={() => setExportDialogVisible(false)}>Close</Button>
          <Button 
            onPress={() => {
              // In a real app, you would implement sharing functionality here
              Alert.alert('Export', 'Copy the text above to save your data.');
            }}
            mode="contained"
          >
            Share
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  if (!settings) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.onBackground }}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderAppearanceSection()}
        {renderSecuritySection()}
        {renderNotificationsSection()}
        {renderDataSection()}
        {renderAboutSection()}
      </ScrollView>
      
      {renderTimePicker()}
      {renderResetDialog()}
      {renderExportDialog()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  sectionCard: {
    margin: commonStyles.spacing.md,
    borderRadius: commonStyles.borderRadius,
    ...commonStyles.shadow,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: commonStyles.spacing.sm,
  },
  divider: {
    marginVertical: commonStyles.spacing.sm,
  },
  securityNote: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: commonStyles.spacing.xs,
    marginLeft: 56, // Align with list item content
  },
  aboutText: {
    fontSize: 14,
    opacity: 0.8,
    marginTop: commonStyles.spacing.sm,
    lineHeight: 20,
  },
  warningText: {
    fontWeight: '500',
    marginTop: commonStyles.spacing.sm,
  },
  exportScrollArea: {
    maxHeight: 300,
  },
  exportTextInput: {
    fontFamily: 'Courier',
    fontSize: 12,
  },
});

export default SettingsScreen;