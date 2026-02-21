import { AppSettings, InventoryCategory, SecurityLockTimeout } from '../models/Types';
import { StorageService } from '../services/StorageService';
import { inventoryManager } from './InventoryManager';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// MARK: - Settings Manager Class
export class SettingsManager {
  private settings: AppSettings;
  private listeners: Set<() => void> = new Set();

  private initializationPromise: Promise<void>;

  constructor() {
    this.settings = this.getDefaultSettings();
    this.initializationPromise = this.loadSettings();
    this.initializePushNotifications();
  }

  async waitForInitialization(): Promise<void> {
    await this.initializationPromise;
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
      const loaded = await StorageService.loadSettings();
      // Merge defaults with loaded settings to ensure new keys exist
      this.settings = {
        ...this.getDefaultSettings(),
        ...loaded,
        isAuthenticated: false, // Always require authentication on startup
        activityThresholds: {
          ...this.getDefaultSettings().activityThresholds,
          ...(loaded?.activityThresholds || {}),
        }
      };

      if (this.settings.isInventoryReminderEnabled) {
        this.scheduleInventoryReminders();
      }

      if (this.settings.isHealthAlertsEnabled) {
        this.scheduleHealthNotification();
      }

      this.notifyListeners();
    } catch (error) {
      console.error('❌ Error loading settings:', error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      // Don't persist authentication status
      const settingsToSave = {
        ...this.settings,
        isAuthenticated: false
      };
      await StorageService.saveSettings(settingsToSave);
      this.notifyListeners();
    } catch (error) {
      console.error('❌ Error saving settings:', error);
    }
  }

  private getDefaultSettings(): AppSettings {
    const now = new Date();
    const morning = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0);
    const evening = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0);
    const healthTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0);

    return {
      themeMode: 'system',
      isSecurityEnabled: false,
      isAuthenticated: false,
      isInventoryReminderEnabled: false,
      isSecondReminderEnabled: false,
      reminderTime1: morning,
      reminderTime2: evening,
      miscItemHistory: [],
      activityThresholds: {
        [InventoryCategory.FRIDGE]: 3,
        [InventoryCategory.GROCERY]: 7,
        [InventoryCategory.HYGIENE]: 15,
        [InventoryCategory.PERSONAL_CARE]: 30,
      },
      isHealthAlertsEnabled: true,
      healthAlertTime: healthTime,
      securityLockTimeout: SecurityLockTimeout.IMMEDIATELY,
    };
  }

  // MARK: - App State Management
  private isAuthenticating: boolean = false;

  // MARK: - App State Management
  private backgroundTimestamp: number | null = null;

  recordBackgroundTime(): void {
    this.backgroundTimestamp = Date.now();
  }

  shouldLockApp(): boolean {
    if (!this.settings.isSecurityEnabled) return false;
    if (this.isAuthenticating) return false; // Don't lock if currently authenticating
    
    if (this.settings.securityLockTimeout === SecurityLockTimeout.IMMEDIATELY) return true;
    if (!this.backgroundTimestamp) return false;

    const elapsed = Date.now() - this.backgroundTimestamp;
    return elapsed >= this.settings.securityLockTimeout;
  }
  
  async authenticateUser(): Promise<boolean> {
    if (this.isAuthenticating) return false; // Prevent concurrent auth requests
    this.isAuthenticating = true;
    
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        console.warn('🔒 Biometric hardware not available or not enrolled');
        return true; 
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
    } finally {
      // Small delay to allow AppState to settle after auth dialog closes
      setTimeout(() => {
        this.isAuthenticating = false;
      }, 1000);
    }
  }

  clearBackgroundTime(): void {
    this.backgroundTimestamp = null;
  }

  // MARK: - Settings Getters
  getSettings(): AppSettings {
    return { ...this.settings };
  }

  getSecurityLockTimeout(): number {
    return this.settings.securityLockTimeout;
  }

  getThemeMode(): string {
    return this.settings.themeMode;
  }

  isDarkModeEnabled(): boolean {
    return this.settings.themeMode === 'dark';
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

  isHealthAlertsEnabled(): boolean {
    return this.settings.isHealthAlertsEnabled;
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

  getActivityThresholds(): Record<InventoryCategory, number> {
    return { ...this.settings.activityThresholds };
  }

  getActivityThreshold(category: InventoryCategory): number {
    return this.settings.activityThresholds[category] || 30;
  }

  // MARK: - Settings Management
  async toggleDarkMode(): Promise<void> {
    const newMode = this.settings.themeMode === 'dark' ? 'light' : 'dark';
    await this.setThemeMode(newMode as any);
  }

  async setThemeMode(mode: 'light' | 'dark' | 'system'): Promise<void> {
    this.settings.themeMode = mode;
    await this.saveSettings();
    console.log(`🌓 Theme mode set to: ${mode}`);
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

  async setSecurityLockTimeout(timeout: number): Promise<void> {
    this.settings.securityLockTimeout = timeout;
    await this.saveSettings();
    console.log(`⏱️ Security lock timeout set to: ${timeout}ms`);
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
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Listen for notification responses (user tapping on a notification)
    Notifications.addNotificationResponseReceivedListener(async (response) => {
      console.log('🔔 Notification response received, clearing all notifications');
      await Notifications.dismissAllNotificationsAsync();
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

  async toggleHealthAlerts(): Promise<void> {
    this.settings.isHealthAlertsEnabled = !this.settings.isHealthAlertsEnabled;
    
    if (this.settings.isHealthAlertsEnabled) {
      const hasPermission = await this.requestNotificationPermission();
      if (hasPermission) {
        await this.scheduleHealthNotification();
        console.log('💚 Health notifications enabled');
      } else {
        this.settings.isHealthAlertsEnabled = false;
        console.log('❌ Notification permission denied for health alerts');
      }
    } else {
      await this.cancelHealthNotification();
      console.log('💔 Health notifications disabled');
    }
    
    await this.saveSettings();
  }

  async updateHealthAlertTime(time: Date): Promise<void> {
    this.settings.healthAlertTime = time;
    
    if (this.settings.isHealthAlertsEnabled) {
      await this.scheduleHealthNotification();
    }
    
    await this.saveSettings();
    console.log(`⏰ Health alert time updated: ${time.toLocaleTimeString()}`);
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
        name: 'Inventory Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
      await Notifications.setNotificationChannelAsync('health', {
        name: 'Health Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 100, 200],
        lightColor: '#34D399',
      });
    }

    return true;
  }

  private async scheduleInventoryReminders(): Promise<void> {
    // Cancel existing inventory notifications
    await this.cancelInventoryReminders();
    
    // Schedule first reminder
    await this.scheduleDailyReminder(
      'inv-1',
      this.settings.reminderTime1, 
      'Time to check your inventory!',
      this.getInventoryReminderBody()
    );
    
    // Schedule second reminder only if enabled
    if (this.settings.isSecondReminderEnabled) {
      await this.scheduleDailyReminder(
        'inv-2',
        this.settings.reminderTime2,
        'Evening inventory check!',
        'Any items running low today? Update your list now.'
      );
    }
    
    console.log(`✅ Reminders scheduled`);
  }

  private async scheduleDailyReminder(identifier: string, time: Date, title: string, body: string): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title,
        body,
        sound: true,
      },
      trigger: {
        type: 'calendar',
        hour: time.getHours(),
        minute: time.getMinutes(),
        repeats: true,
      } as any,
    });
  }

  async sendTestNotification(): Promise<void> {
    const body = this.getInventoryReminderBody();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Inventory Check 🔔",
        body,
        data: { type: 'reminder' },
      },
      trigger: null, // Send immediately
    });
  }

  async sendTestHealthNotification(): Promise<void> {
    const summary = this.getHealthSummary();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: summary.title,
        body: summary.body,
        data: { type: 'health' },
        ...(Platform.OS === 'android' ? { channelId: 'health' } : {}),
      },
      trigger: null, // Send immediately
    });
  }

  private getInventoryReminderBody(): string {
    const items = inventoryManager.getVisibleInventoryItems().filter(i => !i.isIgnored);

    if (items.length === 0) {
      return 'Start adding items to track your home inventory!';
    }

    const lowCount = items.filter(i => i.quantity <= 0.25).length;
    const outOfStock = items.filter(i => i.quantity === 0).length;

    // Items not updated in 3+ days — simple staleness check
    const now = new Date();
    const needUpdateCount = items.filter(i => {
      const diff = Math.floor((now.getTime() - new Date(i.lastUpdated).getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 3;
    }).length;

    const parts: string[] = [];

    if (outOfStock > 0) {
      parts.push(`${outOfStock} out of stock`);
    } else if (lowCount > 0) {
      parts.push(`${lowCount} running low`);
    }

    if (needUpdateCount > 0) {
      parts.push(`${needUpdateCount} need a status update`);
    }

    if (parts.length > 0) {
      return `${parts.join(', ')}. Update your inventory to keep it accurate!`;
    }

    return `All ${items.length} items are up to date. Tap to review your stock levels.`;
  }

  private async cancelInventoryReminders(): Promise<void> {
    // Cancel only inventory reminder notifications (identifiers starting with 'inv-')
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.identifier.startsWith('inv-')) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
    console.log('🗑️ Inventory reminders cancelled');
  }

  // MARK: - Health Notifications (separate system)
  private async scheduleHealthNotification(): Promise<void> {
    await this.cancelHealthNotification();

    const time = new Date(this.settings.healthAlertTime);
    const hour = time.getHours();
    
    // Only schedule if between 8 AM and 10 PM
    if (hour < 8 || hour >= 22) {
      console.log('⚠️ Health alert time outside allowed window (8 AM - 10 PM), adjusting to 10 AM');
      time.setHours(10, 0, 0, 0);
    }

    const summary = this.getHealthSummary();

    await Notifications.scheduleNotificationAsync({
      identifier: 'health-daily',
      content: {
        title: summary.title,
        body: summary.body,
        sound: true,
        ...(Platform.OS === 'android' ? { channelId: 'health' } : {}),
      },
      trigger: {
        type: 'calendar',
        hour: time.getHours(),
        minute: time.getMinutes(),
        repeats: true,
      } as any,
    });

    console.log(`💚 Health notification scheduled at ${this.formatTime(time)}`);
  }

  private async cancelHealthNotification(): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync('health-daily');
    } catch {
      // May not exist yet, ignore
    }
    console.log('🗑️ Health notification cancelled');
  }

  private getHealthSummary(): { title: string; body: string } {
    const thresholds = this.settings.activityThresholds;
    const items = inventoryManager.getVisibleInventoryItems().filter(i => !i.isIgnored);
    
    if (items.length === 0) {
      return {
        title: '🏠 Inventory Health',
        body: 'Start adding items to get health insights!',
      };
    }

    const staleItems = inventoryManager.getStaleItemsByThreshold(thresholds);
    const lowStockItems = items.filter(i => i.quantity <= 0.25);
    const criticalItems = items.filter(i => i.quantity === 0);

    // Build smart title
    let title = '🏠 Inventory Health';
    if (criticalItems.length > 0) {
      title = `🚨 ${criticalItems.length} Item${criticalItems.length > 1 ? 's' : ''} Out of Stock!`;
    } else if (staleItems.length > 0 && lowStockItems.length > 0) {
      title = `⚠️ ${staleItems.length} Stale · ${lowStockItems.length} Low Stock`;
    } else if (staleItems.length > 0) {
      title = `⚠️ ${staleItems.length} Item${staleItems.length > 1 ? 's' : ''} Need Review`;
    } else if (lowStockItems.length > 0) {
      title = `📦 ${lowStockItems.length} Item${lowStockItems.length > 1 ? 's' : ''} Running Low`;
    } else {
      title = '✅ Inventory Looking Good!';
    }

    // Build smart body
    const parts: string[] = [];

    if (criticalItems.length > 0) {
      const names = criticalItems.slice(0, 3).map(i => i.name).join(', ');
      parts.push(`Out of stock: ${names}${criticalItems.length > 3 ? ` +${criticalItems.length - 3} more` : ''}`);
    }

    if (staleItems.length > 0 && criticalItems.length === 0) {
      const categories = new Set(staleItems.map(item => {
        const config = inventoryManager.getSubcategoryConfig(item.subcategory);
        return config?.category;
      }).filter(Boolean));
      parts.push(`${staleItems.length} items in ${Array.from(categories).join(', ')} haven't been updated`);
    }

    if (lowStockItems.length > 0 && criticalItems.length === 0) {
      const names = lowStockItems.slice(0, 3).map(i => `${i.name} (${Math.round(i.quantity * 100)}%)`).join(', ');
      parts.push(`Low: ${names}${lowStockItems.length > 3 ? ` +${lowStockItems.length - 3} more` : ''}`);
    }

    if (parts.length === 0) {
      const avgStock = Math.round((items.reduce((s, i) => s + i.quantity, 0) / items.length) * 100);
      parts.push(`All ${items.length} items are up to date. Average stock: ${avgStock}%`);
    }

    return { title, body: parts.join(' · ') };
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // MARK: - Activity Thresholds Management
  async updateActivityThreshold(category: InventoryCategory, days: number): Promise<void> {
    this.settings.activityThresholds[category] = days;
    await this.saveSettings();
    console.log(`⏱️ Updated ${category} activity threshold to ${days} days`);
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

  async importSettings(data: any): Promise<void> {
    if (!data) return;
    
    // Validate schema roughly by checking keys or just merge carefully
    const defaultSettings = this.getDefaultSettings();
    
    // Merge imported data with defaults to ensure all keys exist
    this.settings = {
        ...defaultSettings,
        ...data,
        // Restore dates if they are strings
        reminderTime1: data.reminderTime1 ? new Date(data.reminderTime1) : defaultSettings.reminderTime1,
        reminderTime2: data.reminderTime2 ? new Date(data.reminderTime2) : defaultSettings.reminderTime2,
        healthAlertTime: data.healthAlertTime ? new Date(data.healthAlertTime) : defaultSettings.healthAlertTime,
        // Ensure critical flags are respected or reset if needed (e.g. auth)
        isAuthenticated: false, 
    };

    if (this.settings.isInventoryReminderEnabled) {
        this.scheduleInventoryReminders();
    }
    
    if (this.settings.isHealthAlertsEnabled) {
        this.scheduleHealthNotification();
    }

    await this.saveSettings();
    console.log('📥 Settings imported successfully');
    this.notifyListeners();
  }
}

// Export singleton instance
export const settingsManager = new SettingsManager();