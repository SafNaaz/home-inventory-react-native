import { AppSettings } from '../models/Types';
import { StorageService } from '../services/StorageService';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// MARK: - Settings Manager Class
export class SettingsManager {
  private settings: AppSettings;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.settings = this.getDefaultSettings();
    this.loadSettings();
    this.initializePushNotifications();
  }

  // MARK: - Event Listeners
  addListener(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback());
  }

  // MARK: - Settings Loading
  private async loadSettings(): Promise<void> {
    try {
      this.settings = await StorageService.loadSettings();
      this.notifyListeners();
    } catch (error) {
      console.error('❌ Error loading settings:', error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await StorageService.saveSettings(this.settings);
      this.notifyListeners();
    } catch (error) {
      console.error('❌ Error saving settings:', error);
    }
  }

  private getDefaultSettings(): AppSettings {
    const now = new Date();
    const morning = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0);
    const evening = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0);

    return {
      isDarkMode: false,
      isSecurityEnabled: false,
      isAuthenticated: false,
      isInventoryReminderEnabled: false,
      isSecondReminderEnabled: false,
      reminderTime1: morning,
      reminderTime2: evening,
      miscItemHistory: [],
    };
  }

  // MARK: - Settings Getters
  getSettings(): AppSettings {
    return { ...this.settings };
  }

  isDarkModeEnabled(): boolean {
    return this.settings.isDarkMode;
  }

  isSecurityEnabled(): boolean {
    return this.settings.isSecurityEnabled;
  }

  isAuthenticated(): boolean {
    return this.settings.isAuthenticated;
  }

  isInventoryReminderEnabled(): boolean {
    return this.settings.isInventoryReminderEnabled;
  }

  isSecondReminderEnabled(): boolean {
    return this.settings.isSecondReminderEnabled;
  }

  getReminderTime1(): Date {
    return this.settings.reminderTime1;
  }

  getReminderTime2(): Date {
    return this.settings.reminderTime2;
  }

  getMiscItemHistory(): string[] {
    return [...this.settings.miscItemHistory];
  }

  // MARK: - Settings Management
  async toggleDarkMode(): Promise<void> {
    this.settings.isDarkMode = !this.settings.isDarkMode;
    await this.saveSettings();
    console.log(`🌓 Dark mode ${this.settings.isDarkMode ? 'enabled' : 'disabled'}`);
  }

  async toggleSecurity(): Promise<void> {
    if (!this.settings.isSecurityEnabled) {
      // Enabling security - authenticate first
      const success = await this.authenticateUser();
      if (success) {
        this.settings.isSecurityEnabled = true;
        this.settings.isAuthenticated = true;
        await this.saveSettings();
        console.log('🔒 Security enabled');
      }
    } else {
      // Disabling security
      this.settings.isSecurityEnabled = false;
      this.settings.isAuthenticated = false;
      await this.saveSettings();
      console.log('🔓 Security disabled');
    }
  }

  async setAuthenticated(authenticated: boolean): Promise<void> {
    this.settings.isAuthenticated = authenticated;
    await this.saveSettings();
  }

  // MARK: - Biometric Authentication
  async authenticateUser(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        console.warn('🔒 Biometric hardware not available or not enrolled');
        return true; // Fallback or handle differently in production
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access Home Inventory',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (error) {
      console.error('❌ Authentication error:', error);
      return false;
    }
  }

  async checkAuthenticationIfNeeded(): Promise<boolean> {
    if (this.settings.isSecurityEnabled && !this.settings.isAuthenticated) {
      const success = await this.authenticateUser();
      if (success) {
        this.settings.isAuthenticated = true;
        this.notifyListeners();
        // Note: Not saving to storage as authentication status is runtime only
      }
      return success;
    }
    return true;
  }

  // MARK: - Push Notifications
  private initializePushNotifications(): void {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }

  async toggleInventoryReminder(): Promise<void> {
    this.settings.isInventoryReminderEnabled = !this.settings.isInventoryReminderEnabled;
    
    if (this.settings.isInventoryReminderEnabled) {
      const hasPermission = await this.requestNotificationPermission();
      if (hasPermission) {
        await this.scheduleInventoryReminders();
        await this.saveSettings();
        console.log('🔔 Inventory reminders enabled');
      } else {
        this.settings.isInventoryReminderEnabled = false;
        console.log('❌ Notification permission denied');
      }
    } else {
      await this.cancelInventoryReminders();
      await this.saveSettings();
      console.log('🔕 Inventory reminders disabled');
    }
  }

  async toggleSecondReminder(): Promise<void> {
    this.settings.isSecondReminderEnabled = !this.settings.isSecondReminderEnabled;
    
    if (this.settings.isInventoryReminderEnabled) {
      await this.scheduleInventoryReminders();
    }
    
    await this.saveSettings();
    console.log(`🔔 Second reminder ${this.settings.isSecondReminderEnabled ? 'enabled' : 'disabled'}`);
  }

  async updateReminderTime1(time: Date): Promise<void> {
    this.settings.reminderTime1 = time;
    
    if (this.settings.isInventoryReminderEnabled) {
      await this.scheduleInventoryReminders();
    }
    
    await this.saveSettings();
    console.log(`⏰ First reminder time updated: ${time.toLocaleTimeString()}`);
  }

  async updateReminderTime2(time: Date): Promise<void> {
    this.settings.reminderTime2 = time;
    
    if (this.settings.isInventoryReminderEnabled) {
      await this.scheduleInventoryReminders();
    }
    
    await this.saveSettings();
    console.log(`⏰ Second reminder time updated: ${time.toLocaleTimeString()}`);
  }

  private async requestNotificationPermission(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return true;
  }

  private async scheduleInventoryReminders(): Promise<void> {
    // Cancel existing notifications
    await this.cancelInventoryReminders();
    
    // Schedule first reminder
    await this.scheduleDailyReminder(
      this.settings.reminderTime1, 
      'Time to check your inventory!',
      'Stay on top of your supplies and restock low items.'
    );
    
    // Schedule second reminder only if enabled
    if (this.settings.isSecondReminderEnabled) {
      await this.scheduleDailyReminder(
        this.settings.reminderTime2,
        'Evening inventory check!',
        'Any items running low today? Update your list now.'
      );
    }
    
    console.log(`✅ Reminders scheduled`);
  }

  private async scheduleDailyReminder(time: Date, title: string, body: string): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: {
        hour: time.getHours(),
        minute: time.getMinutes(),
        repeats: true,
      },
    });
  }

  async sendTestNotification(): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Test Notification 🔔",
        body: "Inventory reminders are working correctly!",
        data: { data: 'test' },
      },
      trigger: null, // Send immediately
    });
  }

  private async cancelInventoryReminders(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('🗑️ All notifications cancelled');
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // MARK: - Misc Item History
  async addMiscItemToHistory(itemName: string): Promise<void> {
    const trimmedName = itemName.trim();
    if (!trimmedName) return;
    
    // Remove if already exists to avoid duplicates
    this.settings.miscItemHistory = this.settings.miscItemHistory.filter(
      item => item.toLowerCase() !== trimmedName.toLowerCase()
    );
    
    // Add to beginning of array
    this.settings.miscItemHistory.unshift(trimmedName);
    
    // Keep only last 20 items
    if (this.settings.miscItemHistory.length > 20) {
      this.settings.miscItemHistory = this.settings.miscItemHistory.slice(0, 20);
    }
    
    await this.saveSettings();
    console.log(`📝 Added to misc item history: ${trimmedName}`);
  }

  getMiscItemSuggestions(): string[] {
    return this.settings.miscItemHistory.slice(0, 10); // Return top 10 suggestions
  }

  // MARK: - Data Management
  async clearAllData(): Promise<void> {
    this.settings.miscItemHistory = [];
    await this.saveSettings();
    console.log('🗑️ Settings data cleared');
  }

  async resetToDefaults(): Promise<void> {
    this.cancelInventoryReminders();
    this.settings = this.getDefaultSettings();
    await this.saveSettings();
    console.log('🔄 Settings reset to defaults');
  }
}

// Export singleton instance
export const settingsManager = new SettingsManager();