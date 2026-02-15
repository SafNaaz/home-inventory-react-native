import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
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
  Snackbar,
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';

import { settingsManager } from '../managers/SettingsManager';
import { inventoryManager } from '../managers/InventoryManager';
import { notesManager } from '../managers/NotesManager';
import { AppSettings, SecurityLockTimeout } from '../models/Types';
import { commonStyles } from '../themes/AppTheme';
import DoodleBackground from '../components/DoodleBackground';
import { useNavigation } from '@react-navigation/native';

const SettingsScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timePickerType, setTimePickerType] = useState<'time1' | 'time2'>('time1');
  const [resetDialogVisible, setResetDialogVisible] = useState(false);
  const [exportDialogVisible, setExportDialogVisible] = useState(false);
  const [importDialogVisible, setImportDialogVisible] = useState(false);
  const [exportData, setExportData] = useState('');
  const [importDataText, setImportDataText] = useState('');
  const [clearAllConfirmVisible, setClearAllConfirmVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [errorAlertVisible, setErrorAlertVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lockTimeoutDialogVisible, setLockTimeoutDialogVisible] = useState(false);

  const handleLockTimeoutSelect = async (timeout: number) => {
    await settingsManager.setSecurityLockTimeout(timeout);
    setLockTimeoutDialogVisible(false);
  };

  const getLockTimeoutLabel = (timeout: number) => {
    switch(timeout) {
      case SecurityLockTimeout.IMMEDIATELY: return 'Immediately';
      case SecurityLockTimeout.ONE_MINUTE: return 'After 1 minute';
      case SecurityLockTimeout.FIVE_MINUTES: return 'After 5 minutes';
      case SecurityLockTimeout.FIFTEEN_MINUTES: return 'After 15 minutes';
      case SecurityLockTimeout.THIRTY_MINUTES: return 'After 30 minutes';
      default: return 'Immediately';
    }
  };

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

  const handleThemeChange = async (mode: 'light' | 'dark' | 'system') => {
    await settingsManager.setThemeMode(mode);
    setSnackbarMessage(`Theme set to ${mode === 'system' ? 'Auto' : (mode === 'dark' ? 'Night' : 'Day')}.`);
    setSnackbarVisible(true);
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
    setClearAllConfirmVisible(true);
  };

  const onConfirmClearAll = async () => {
    setClearAllConfirmVisible(false);
    await Promise.all([
      inventoryManager.clearAllData(),
      notesManager.clearAllNotes(),
      settingsManager.resetToDefaults(),
    ]);
    setSnackbarMessage('All data has been cleared successfully.');
    setSnackbarVisible(true);
  };

  const handleResetToDefaults = () => {
    setResetDialogVisible(true);
  };

  const handleConfirmResetToDefaults = async () => {
    await inventoryManager.resetToDefaults();
    setResetDialogVisible(false);
    setSnackbarMessage('Your inventory has been reset with sample items.');
    setSnackbarVisible(true);
  };

  const handleExportData = async () => {
    try {
      const notesData = notesManager.exportNotesToJSON();
      const inventoryData = inventoryManager.getExportData();
      
      const exportData = {
        version: 1,
        exportDate: new Date().toISOString(),
        notes: JSON.parse(notesData),
        inventory: inventoryData,
        settings: settingsManager.getSettings(),
      };

      setExportData(JSON.stringify(exportData, null, 2));
      setExportDialogVisible(true);
    } catch (error) {
      setErrorMessage('Failed to export data. Please try again.');
      setErrorAlertVisible(true);
    }
  };

  const shareDataAsFile = async () => {
    try {
        const fileName = `inventory_backup_${new Date().toISOString().split('T')[0]}.json`;
        const fileUri = FileSystem.documentDirectory + fileName;
        
        await FileSystem.writeAsStringAsync(fileUri, exportData);
        
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri);
        } else {
            setSnackbarMessage('Sharing is not available on this device');
            setSnackbarVisible(true);
        }
    } catch (error) {
        setErrorMessage('Failed to share file.');
        setErrorAlertVisible(true);
    }
  };

  const handleImportData = () => {
    setImportDataText('');
    setImportDialogVisible(true);
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const fileUri = result.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      
      setImportDataText(fileContent);
      // Optional: Auto-import or just fill the text box? 
      // User might want to review, so filling text box is safer.
      setSnackbarMessage('File loaded successfully.');
      setSnackbarVisible(true);
    } catch (err) {
      setErrorMessage('Failed to read the file.');
      setErrorAlertVisible(true);
    }
  };

  const confirmImportData = async () => {
    try {
      setImportDialogVisible(false);
      const parsed = JSON.parse(importDataText);

      // Basic structure validation
      if (!parsed || typeof parsed !== 'object' || !parsed.inventory) {
        throw new Error('Invalid backup file structure. Missing "inventory" data.');
      }
      
      // Clear existing data first
      await Promise.all([
        inventoryManager.clearAllData(),
        notesManager.clearAllNotes(),
      ]);

      // Import new data
      if (parsed.inventory) {
        await inventoryManager.importData(parsed.inventory);
      }
      
      if (parsed.notes) {
        // NotesManager expects a JSON string structure
        await notesManager.importNotesFromJSON(JSON.stringify(parsed.notes));
      }
      
      if (parsed.settings) {
        await settingsManager.importSettings(parsed.settings);
      }

      setSnackbarMessage('Data imported and restored successfully.');
      setSnackbarVisible(true);
    } catch (error) {
      setErrorMessage('Failed to import data. Invalid format.');
      setErrorAlertVisible(true);
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
        <Paragraph style={[styles.sectionDescription, { color: theme.colors.onSurfaceVariant }]}>
          Choose how the app looks on your device.
        </Paragraph>
        
        <View style={styles.themeSelector}>
          <Button 
            mode={settings?.themeMode === 'light' ? "contained" : "outlined"}
            onPress={() => handleThemeChange('light')}
            style={styles.themeButton}
            icon="weather-sunny"
            compact
          > Day </Button>
          <Button 
            mode={settings?.themeMode === 'dark' ? "contained" : "outlined"}
            onPress={() => handleThemeChange('dark')}
            style={styles.themeButton}
            icon="weather-night"
            compact
          > Night </Button>
          <Button 
            mode={settings?.themeMode === 'system' ? "contained" : "outlined"}
            onPress={() => handleThemeChange('system')}
            style={styles.themeButton}
            icon="theme-light-dark"
            compact
          > Auto </Button>
        </View>
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
          <List.Item
            title="Auto-Lock"
            description={getLockTimeoutLabel(settings.securityLockTimeout)}
            left={() => <Icon name="timer-outline" size={24} color={theme.colors.onSurface} />}
            onPress={() => setLockTimeoutDialogVisible(true)}
          />
        )}
        

      </Card.Content>
    </Card>
  );

  const renderLockTimeoutDialog = () => (
    <Portal>
      <Dialog visible={lockTimeoutDialogVisible} onDismiss={() => setLockTimeoutDialogVisible(false)}>
        <Dialog.Title>Auto-Lock Timeout</Dialog.Title>
        <Dialog.Content>
          <List.Section>
            {[
              SecurityLockTimeout.IMMEDIATELY,
              SecurityLockTimeout.ONE_MINUTE,
              SecurityLockTimeout.FIVE_MINUTES,
              SecurityLockTimeout.FIFTEEN_MINUTES,
              SecurityLockTimeout.THIRTY_MINUTES
            ].map((timeout) => (
              <List.Item
                key={timeout}
                title={getLockTimeoutLabel(timeout)}
                right={() => settings?.securityLockTimeout === timeout ? <List.Icon icon="check" /> : null}
                onPress={() => handleLockTimeoutSelect(timeout)}
              />
            ))}
          </List.Section>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setLockTimeoutDialogVisible(false)}>Cancel</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
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
        
        <Divider style={styles.divider} />
        <List.Item
          title="Advanced Settings"
          description="Edit health tracking, specific times, and more"
          left={() => <Icon name="tune" size={24} color={theme.colors.primary} />}
          right={() => <List.Icon icon="chevron-right" />}
          onPress={() => navigation.navigate('NotificationSettings')}
        />
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
          title="Import Data"
          description="Restore your data from backup"
          left={() => <Icon name="import" size={24} color={theme.colors.onSurface} />}
          onPress={handleImportData}
        />
        
        {__DEV__ && (
          <List.Item
            title="Reset to Sample Data"
            description="Replace inventory with sample items"
            left={() => <Icon name="refresh" size={24} color={theme.colors.onSurface} />}
            onPress={handleResetToDefaults}
          />
        )}
        
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
        <Dialog.Content>
            <Paragraph style={{marginBottom: 10}}>
                Copy the text below to save your backup.
            </Paragraph>
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
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setExportDialogVisible(false)}>Close</Button>
          <Button 
            onPress={async () => {
              await Clipboard.setStringAsync(exportData);
              setSnackbarMessage('Data copied to clipboard!');
              setSnackbarVisible(true);
            }}
            style={{marginRight: 8}}
          >
            Copy
          </Button>
          <Button 
            onPress={shareDataAsFile}
            mode="contained"
            icon="share-variant"
          >
            Share File
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  const renderImportDialog = () => (
    <Portal>
      <Dialog visible={importDialogVisible} onDismiss={() => setImportDialogVisible(false)}>
        <Dialog.Title>Import Data</Dialog.Title>
        <Dialog.Content>
            <Paragraph style={{marginBottom: 10}}>
                Paste your backup data below. This will replace all current data.
            </Paragraph>
            <Dialog.ScrollArea style={styles.exportScrollArea}>
            <ScrollView>
                <TextInput
                value={importDataText}
                onChangeText={setImportDataText}
                multiline
                numberOfLines={10}
                placeholder="Paste JSON data here..."
                mode="outlined"
                style={styles.exportTextInput}
                />
            </ScrollView>
            </Dialog.ScrollArea>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setImportDialogVisible(false)}>Cancel</Button>
          <Button 
            onPress={pickDocument}
            icon="file-document-outline"
            style={{marginRight: 8}}
          >
            File
          </Button>
          <Button 
            onPress={confirmImportData}
            mode="contained"
            disabled={!importDataText.trim()}
          >
            Import
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  if (!settings) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <DoodleBackground />
        <Text style={{ color: theme.colors.onBackground }}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <DoodleBackground />
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderNotificationsSection()}
        {renderSecuritySection()}
        {renderAppearanceSection()}
        {renderDataSection()}
        {renderAboutSection()}
      </ScrollView>
      
      {renderTimePicker()}
      {renderLockTimeoutDialog()}
      {renderResetDialog()}
      {renderExportDialog()}
      {renderImportDialog()}

      {/* Clear All Confirmation Dialog */}
      <Portal>
        <Dialog visible={clearAllConfirmVisible} onDismiss={() => setClearAllConfirmVisible(false)}>
          <Dialog.Title>Reset All Data</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: theme.colors.onSurface }}>This will permanently delete all your inventory items, shopping lists, notes, and settings. This action cannot be undone.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setClearAllConfirmVisible(false)}>Cancel</Button>
            <Button onPress={onConfirmClearAll} textColor={theme.colors.error}>Reset All Data</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Error Alert Dialog */}
      <Portal>
        <Dialog visible={errorAlertVisible} onDismiss={() => setErrorAlertVisible(false)}>
          <Dialog.Title>Error</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: theme.colors.onSurface }}>{errorMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setErrorAlertVisible(false)}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
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
    margin: 16,
    borderRadius: 24,
    ...commonStyles.shadow,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
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
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  themeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  themeButton: {
    flex: 1,
    borderRadius: 12,
  },
});

export default SettingsScreen;