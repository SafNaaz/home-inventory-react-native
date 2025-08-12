import { AppSettings } from '../models/Types';
import { StorageService } from '../services/StorageService';

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
    // For now, return true as biometric authentication is not implemented
    // This can be enhanced later with proper authentication
    console.log('🔐 Authentication requested (simplified for demo)');
    return true;
  }

  async checkAuthenticationIfNeeded(): Promise<boolean> {
    if (this.settings.isSecurityEnabled && !this.settings.isAuthenticated) {
      const success = await this.authenticateUser();
      if (success) {
        this.settings.isAuthenticated = true;
        await this.saveSettings();
      }
      return success;
    }
    return true;
  }

  // MARK: - Push Notifications (Simplified for demo)
  private initializePushNotifications(): void {
    console.log('📱 Push notifications initialized (demo mode)');
  }

  async toggleInventoryReminder(): Promise<void> {
    this.settings.isInventoryReminderEnabled = !this.settings.isInventoryReminderEnabled;
    
    if (this.settings.isInventoryReminderEnabled) {
      const hasPermission = await this.requestNotificationPermission();
      if (hasPermission) {
        this.scheduleInventoryReminders();
        await this.saveSettings();
        console.log('🔔 Inventory reminders enabled');
      } else {
        this.settings.isInventoryReminderEnabled = false;
        console.log('❌ Notification permission denied');
      }
    } else {
      this.cancelInventoryReminders();
      await this.saveSettings();
      console.log('🔕 Inventory reminders disabled');
    }
  }

  async toggleSecondReminder(): Promise<void> {
    this.settings.isSecondReminderEnabled = !this.settings.isSecondReminderEnabled;
    
    if (this.settings.isInventoryReminderEnabled) {
      this.scheduleInventoryReminders();
    }
    
    await this.saveSettings();
    console.log(`🔔 Second reminder ${this.settings.isSecondReminderEnabled ? 'enabled' : 'disabled'}`);
  }

  async updateReminderTime1(time: Date): Promise<void> {
    this.settings.reminderTime1 = time;
    
    if (this.settings.isInventoryReminderEnabled) {
      this.scheduleInventoryReminders();
    }
    
    await this.saveSettings();
    console.log(`⏰ First reminder time updated: ${time.toLocaleTimeString()}`);
  }

  async updateReminderTime2(time: Date): Promise<void> {
    this.settings.reminderTime2 = time;
    
    if (this.settings.isInventoryReminderEnabled) {
      this.scheduleInventoryReminders();
    }
    
    await this.saveSettings();
    console.log(`⏰ Second reminder time updated: ${time.toLocaleTimeString()}`);
  }

  private async requestNotificationPermission(): Promise<boolean> {
    // Simplified for demo - always return true
    console.log('📱 Notification permission requested (demo mode)');
    return true;
  }

  private scheduleInventoryReminders(): void {
    // Cancel existing notifications
    this.cancelInventoryReminders();
    
    // Schedule first reminder
    this.scheduleReminder(this.settings.reminderTime1, 'inventoryReminder1');
    
    // Schedule second reminder only if enabled
    if (this.settings.isSecondReminderEnabled) {
      this.scheduleReminder(this.settings.reminderTime2, 'inventoryReminder2');
      console.log(`✅ Inventory reminders scheduled for ${this.formatTime(this.settings.reminderTime1)} and ${this.formatTime(this.settings.reminderTime2)}`);
    } else {
      console.log(`✅ Inventory reminder scheduled for ${this.formatTime(this.settings.reminderTime1)}`);
    }
  }

  private scheduleReminder(time: Date, id: string): void {
    const now = new Date();
    let scheduleDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      time.getHours(),
      time.getMinutes()
    );
    
    // If the time has already passed today, schedule for tomorrow
    if (scheduleDate <= now) {
      scheduleDate.setDate(scheduleDate.getDate() + 1);
    }
    
    console.log(`📅 Reminder scheduled for ${this.formatTime(time)} (demo mode)`);
  }

  private cancelInventoryReminders(): void {
    console.log('🗑️ Inventory reminders cancelled (demo mode)');
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