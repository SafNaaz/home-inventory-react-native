// MARK: - Inventory Categories
export enum InventoryCategory {
  FRIDGE = 'Fridge',
  GROCERY = 'Grocery',
  HYGIENE = 'Hygiene',
  PERSONAL_CARE = 'Personal Care',
}

// MARK: - Inventory Subcategories
export enum BuiltinSubcategory {
  // Fridge subcategories
  DOOR_BOTTLES = 'Door Bottles',
  TRAY = 'Tray Section',
  MAIN = 'Main Section',
  VEGETABLE = 'Vegetable Section',
  FREEZER = 'Freezer',
  MINI_COOLER = 'Mini Cooler',
  
  // Grocery subcategories
  RICE = 'Rice Items',
  PULSES = 'Pulses',
  CEREALS = 'Cereals',
  CONDIMENTS = 'Condiments',
  OILS = 'Oils',
  
  // Hygiene subcategories
  WASHING = 'Washing',
  DISHWASHING = 'Dishwashing',
  TOILET_CLEANING = 'Toilet Cleaning',
  KIDS = 'Kids',
  GENERAL_CLEANING = 'General Cleaning',
  
  // Personal Care subcategories
  FACE = 'Face',
  BODY = 'Body',
  HEAD = 'Head',
}

export type InventorySubcategory = BuiltinSubcategory | string;

// MARK: - Custom Subcategory Interface
export interface CustomSubcategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  category: InventoryCategory;
}

// MARK: - Shopping States
export enum ShoppingState {
  EMPTY = 'empty',
  GENERATING = 'generating',
  LIST_READY = 'listReady',
  SHOPPING = 'shopping',
}

// MARK: - Recommendation Priority
export enum RecommendationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

// MARK: - Inventory Item Interface
export interface InventoryItem {
  id: string;
  name: string;
  quantity: number; // 0.0 to 1.0 (0% to 100%)
  subcategory: InventorySubcategory;
  isCustom: boolean;
  purchaseHistory: Date[];
  lastUpdated: Date;
}

// MARK: - Shopping List Item Interface
export interface ShoppingListItem {
  id: string;
  name: string;
  isChecked: boolean;
  isTemporary: boolean; // For misc items that don't update inventory
  inventoryItemId?: string; // Reference to inventory item if not temporary
}

// MARK: - Shopping List Interface
export interface ShoppingList {
  items: ShoppingListItem[];
  createdDate: Date;
}

// MARK: - Note Interface
export interface Note {
  id: string;
  title: string;
  content: string;
  createdDate: Date;
  lastModified: Date;
}

// MARK: - Smart Recommendation Interface
export interface SmartRecommendation {
  title: string;
  description: string;
  icon: string;
  color: string;
  priority: RecommendationPriority;
}

// MARK: - Settings Interface
export interface AppSettings {
  isDarkMode: boolean;
  isSecurityEnabled: boolean;
  isAuthenticated: boolean;
  isInventoryReminderEnabled: boolean;
  isSecondReminderEnabled: boolean;
  reminderTime1: Date;
  reminderTime2: Date;
  miscItemHistory: string[];
}

// MARK: - Category Configuration
export interface CategoryConfig {
  icon: string;
  color: string;
  subcategories: InventorySubcategory[];
}

// MARK: - Subcategory Configuration
export interface SubcategoryConfig {
  icon: string;
  color: string;
  category: InventoryCategory;
  sampleItems: string[];
}