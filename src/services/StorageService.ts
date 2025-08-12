import AsyncStorage from '@react-native-async-storage/async-storage';
import { InventoryItem, ShoppingListItem, Note, AppSettings, ShoppingState } from '../models/Types';

// MARK: - Storage Keys
const STORAGE_KEYS = {
  INVENTORY_ITEMS: 'inventory_items',
  SHOPPING_LIST: 'shopping_list',
  SHOPPING_STATE: 'shopping_state',
  NOTES: 'notes',
  SETTINGS: 'app_settings',
} as const;

// MARK: - Storage Service Class
export class StorageService {
  // MARK: - Inventory Items
  static async saveInventoryItems(items: InventoryItem[]): Promise<void> {
    try {
      const serializedItems = JSON.stringify(items, (key, value) => {
        if (key === 'lastUpdated' || key === 'purchaseHistory') {
          return value instanceof Date ? value.toISOString() : 
                 Array.isArray(value) ? value.map(date => date instanceof Date ? date.toISOString() : date) : value;
        }
        return value;
      });
      await AsyncStorage.setItem(STORAGE_KEYS.INVENTORY_ITEMS, serializedItems);
      console.log('✅ Inventory items saved to storage');
    } catch (error) {
      console.error('❌ Error saving inventory items:', error);
      throw error;
    }
  }

  static async loadInventoryItems(): Promise<InventoryItem[]> {
    try {
      const serializedItems = await AsyncStorage.getItem(STORAGE_KEYS.INVENTORY_ITEMS);
      if (!serializedItems) {
        console.log('📂 No inventory items found in storage');
        return [];
      }

      const items = JSON.parse(serializedItems, (key, value) => {
        if (key === 'lastUpdated') {
          return new Date(value);
        }
        if (key === 'purchaseHistory') {
          return Array.isArray(value) ? value.map(date => new Date(date)) : [];
        }
        return value;
      });

      console.log(`📦 Loaded ${items.length} inventory items from storage`);
      return items;
    } catch (error) {
      console.error('❌ Error loading inventory items:', error);
      return [];
    }
  }

  // MARK: - Shopping List
  static async saveShoppingList(items: ShoppingListItem[]): Promise<void> {
    try {
      const serializedItems = JSON.stringify(items);
      await AsyncStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, serializedItems);
      console.log('✅ Shopping list saved to storage');
    } catch (error) {
      console.error('❌ Error saving shopping list:', error);
      throw error;
    }
  }

  static async loadShoppingList(): Promise<ShoppingListItem[]> {
    try {
      const serializedItems = await AsyncStorage.getItem(STORAGE_KEYS.SHOPPING_LIST);
      if (!serializedItems) {
        console.log('📂 No shopping list found in storage');
        return [];
      }

      const items = JSON.parse(serializedItems);
      console.log(`🛒 Loaded ${items.length} shopping list items from storage`);
      return items;
    } catch (error) {
      console.error('❌ Error loading shopping list:', error);
      return [];
    }
  }

  // MARK: - Shopping State
  static async saveShoppingState(state: ShoppingState): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SHOPPING_STATE, state);
      console.log(`✅ Shopping state saved: ${state}`);
    } catch (error) {
      console.error('❌ Error saving shopping state:', error);
      throw error;
    }
  }

  static async loadShoppingState(): Promise<ShoppingState> {
    try {
      const state = await AsyncStorage.getItem(STORAGE_KEYS.SHOPPING_STATE);
      if (!state) {
        console.log('📂 No shopping state found in storage, defaulting to empty');
        return ShoppingState.EMPTY;
      }

      console.log(`📱 Loaded shopping state: ${state}`);
      return state as ShoppingState;
    } catch (error) {
      console.error('❌ Error loading shopping state:', error);
      return ShoppingState.EMPTY;
    }
  }

  // MARK: - Notes
  static async saveNotes(notes: Note[]): Promise<void> {
    try {
      const serializedNotes = JSON.stringify(notes, (key, value) => {
        if (key === 'createdDate' || key === 'lastModified') {
          return value instanceof Date ? value.toISOString() : value;
        }
        return value;
      });
      await AsyncStorage.setItem(STORAGE_KEYS.NOTES, serializedNotes);
      console.log('✅ Notes saved to storage');
    } catch (error) {
      console.error('❌ Error saving notes:', error);
      throw error;
    }
  }

  static async loadNotes(): Promise<Note[]> {
    try {
      const serializedNotes = await AsyncStorage.getItem(STORAGE_KEYS.NOTES);
      if (!serializedNotes) {
        console.log('📂 No notes found in storage');
        return [];
      }

      const notes = JSON.parse(serializedNotes, (key, value) => {
        if (key === 'createdDate' || key === 'lastModified') {
          return new Date(value);
        }
        return value;
      });

      console.log(`📝 Loaded ${notes.length} notes from storage`);
      return notes;
    } catch (error) {
      console.error('❌ Error loading notes:', error);
      return [];
    }
  }

  // MARK: - Settings
  static async saveSettings(settings: AppSettings): Promise<void> {
    try {
      const serializedSettings = JSON.stringify(settings, (key, value) => {
        if (key === 'reminderTime1' || key === 'reminderTime2') {
          return value instanceof Date ? value.toISOString() : value;
        }
        return value;
      });
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, serializedSettings);
      console.log('✅ Settings saved to storage');
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      throw error;
    }
  }

  static async loadSettings(): Promise<AppSettings> {
    try {
      const serializedSettings = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!serializedSettings) {
        console.log('📂 No settings found in storage, using defaults');
        return StorageService.getDefaultSettings();
      }

      const settings = JSON.parse(serializedSettings, (key, value) => {
        if (key === 'reminderTime1' || key === 'reminderTime2') {
          return new Date(value);
        }
        return value;
      });

      console.log('⚙️ Settings loaded from storage');
      return settings;
    } catch (error) {
      console.error('❌ Error loading settings:', error);
      return StorageService.getDefaultSettings();
    }
  }

  private static getDefaultSettings(): AppSettings {
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

  // MARK: - Clear All Data
  static async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.INVENTORY_ITEMS,
        STORAGE_KEYS.SHOPPING_LIST,
        STORAGE_KEYS.SHOPPING_STATE,
        STORAGE_KEYS.NOTES,
        STORAGE_KEYS.SETTINGS,
      ]);
      console.log('🗑️ All data cleared from storage');
    } catch (error) {
      console.error('❌ Error clearing all data:', error);
      throw error;
    }
  }

  // MARK: - Utility Methods
  static async getStorageInfo(): Promise<{[key: string]: number}> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const storageInfo: {[key: string]: number} = {};
      
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        storageInfo[key] = value ? value.length : 0;
      }
      
      return storageInfo;
    } catch (error) {
      console.error('❌ Error getting storage info:', error);
      return {};
    }
  }
}