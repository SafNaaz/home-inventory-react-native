import { InventoryItem, ShoppingListItem, ShoppingState, InventoryCategory, InventorySubcategory } from '../models/Types';
import { StorageService } from '../services/StorageService';
import { SUBCATEGORY_CONFIG } from '../constants/CategoryConfig';
import { v4 as uuidv4 } from 'uuid';

// MARK: - Inventory Manager Class
export class InventoryManager {
  private inventoryItems: InventoryItem[] = [];
  private shoppingList: ShoppingListItem[] = [];
  private shoppingState: ShoppingState = ShoppingState.EMPTY;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadData();
  }

  // MARK: - Event Listeners
  addListener(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback());
  }

  // MARK: - Data Loading
  private async loadData(): Promise<void> {
    try {
      console.log('📂 Loading data from storage...');
      
      const [items, shoppingItems, state] = await Promise.all([
        StorageService.loadInventoryItems(),
        StorageService.loadShoppingList(),
        StorageService.loadShoppingState(),
      ]);

      this.inventoryItems = items;
      this.shoppingList = shoppingItems;
      this.shoppingState = state;

      console.log(`📦 Loaded ${items.length} inventory items`);
      console.log(`🛒 Loaded ${shoppingItems.length} shopping items`);
      console.log(`📱 Shopping state: ${state}`);

      this.notifyListeners();
    } catch (error) {
      console.error('❌ Error loading data:', error);
    }
  }

  // MARK: - Inventory Items Management
  getInventoryItems(): InventoryItem[] {
    return [...this.inventoryItems];
  }

  getItemsForCategory(category: InventoryCategory): InventoryItem[] {
    return this.inventoryItems.filter(item => {
      const subcategoryConfig = SUBCATEGORY_CONFIG[item.subcategory];
      return subcategoryConfig.category === category;
    });
  }

  getItemsForSubcategory(subcategory: InventorySubcategory): InventoryItem[] {
    return this.inventoryItems.filter(item => item.subcategory === subcategory);
  }

  async addCustomItem(name: string, subcategory: InventorySubcategory): Promise<void> {
    console.log(`➕ Adding custom item: ${name} to ${subcategory}`);
    
    const newItem: InventoryItem = {
      id: uuidv4(),
      name: name.trim(),
      quantity: 0.0,
      subcategory,
      isCustom: true,
      purchaseHistory: [],
      lastUpdated: new Date(),
    };

    this.inventoryItems.push(newItem);
    await StorageService.saveInventoryItems(this.inventoryItems);
    
    console.log(`✅ Added custom item: ${name}`);
    this.notifyListeners();
  }

  async removeItem(itemId: string): Promise<void> {
    console.log(`🗑️ Removing item with ID: ${itemId}`);
    
    const itemIndex = this.inventoryItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      console.error(`❌ Item not found: ${itemId}`);
      return;
    }

    const item = this.inventoryItems[itemIndex];
    this.inventoryItems.splice(itemIndex, 1);

    // Remove any shopping list items that reference this inventory item
    this.shoppingList = this.shoppingList.filter(shoppingItem => 
      shoppingItem.inventoryItemId !== itemId
    );

    // Check if shopping list is now empty and stop shopping flow if needed
    if (this.shoppingList.length === 0 && this.shoppingState !== ShoppingState.EMPTY) {
      console.log('🛑 Shopping list is now empty, stopping shopping flow');
      this.shoppingState = ShoppingState.EMPTY;
      await StorageService.saveShoppingState(this.shoppingState);
    }

    await Promise.all([
      StorageService.saveInventoryItems(this.inventoryItems),
      StorageService.saveShoppingList(this.shoppingList),
    ]);

    console.log(`✅ Removed item: ${item.name}`);
    this.notifyListeners();
  }

  async updateItemQuantity(itemId: string, quantity: number): Promise<void> {
    const item = this.inventoryItems.find(item => item.id === itemId);
    if (!item) {
      console.error(`❌ Item not found: ${itemId}`);
      return;
    }

    const clampedQuantity = Math.max(0.0, Math.min(1.0, quantity));
    item.quantity = clampedQuantity;
    item.lastUpdated = new Date();

    await StorageService.saveInventoryItems(this.inventoryItems);
    console.log(`🔄 Updated ${item.name} quantity to ${Math.round(clampedQuantity * 100)}%`);
    this.notifyListeners();
  }

  async updateItemName(itemId: string, newName: string): Promise<void> {
    const item = this.inventoryItems.find(item => item.id === itemId);
    if (!item) {
      console.error(`❌ Item not found: ${itemId}`);
      return;
    }

    const trimmedName = newName.trim();
    if (!trimmedName) {
      console.error('❌ Item name cannot be empty');
      return;
    }

    const oldName = item.name;
    item.name = trimmedName;
    item.lastUpdated = new Date();

    // Update any shopping list items that reference this inventory item
    this.shoppingList.forEach(shoppingItem => {
      if (shoppingItem.inventoryItemId === itemId) {
        shoppingItem.name = trimmedName;
      }
    });

    await Promise.all([
      StorageService.saveInventoryItems(this.inventoryItems),
      StorageService.saveShoppingList(this.shoppingList),
    ]);

    console.log(`✏️ Updated item name: ${oldName} -> ${trimmedName}`);
    this.notifyListeners();
  }

  async restockItem(itemId: string): Promise<void> {
    const item = this.inventoryItems.find(item => item.id === itemId);
    if (!item) {
      console.error(`❌ Item not found: ${itemId}`);
      return;
    }

    item.quantity = 1.0;
    item.purchaseHistory.push(new Date());
    item.lastUpdated = new Date();

    await StorageService.saveInventoryItems(this.inventoryItems);
    console.log(`🔄 Restocked ${item.name} to 100%`);
    
    this.notifyListeners();
  }

  // MARK: - Shopping List Management
  getShoppingList(): ShoppingListItem[] {
    return [...this.shoppingList];
  }

  getShoppingState(): ShoppingState {
    return this.shoppingState;
  }

  async startGeneratingShoppingList(): Promise<void> {
    console.log('🛒 Starting shopping list generation...');
    
    // Clear existing shopping list
    this.shoppingList = [];
    
    // Add items that need attention (≤25%) - sorted by urgency
    const attentionItems = this.inventoryItems
      .filter(item => item.quantity <= 0.25)
      .sort((a, b) => a.quantity - b.quantity);
    
    console.log(`⚠️ Found ${attentionItems.length} items needing attention`);
    
    for (const item of attentionItems) {
      const shoppingItem: ShoppingListItem = {
        id: uuidv4(),
        name: item.name,
        isChecked: false,
        isTemporary: false,
        inventoryItemId: item.id,
      };
      this.shoppingList.push(shoppingItem);
      console.log(`➕ Added attention item: ${item.name} (${Math.round(item.quantity * 100)}%)`);
    }
    
    this.shoppingState = ShoppingState.GENERATING;
    
    await Promise.all([
      StorageService.saveShoppingList(this.shoppingList),
      StorageService.saveShoppingState(this.shoppingState),
    ]);
    
    console.log(`✅ Shopping list generation started with ${this.shoppingList.length} items`);
    this.notifyListeners();
  }

  async finalizeShoppingList(): Promise<void> {
    console.log('📋 Finalizing shopping list...');
    this.shoppingState = ShoppingState.LIST_READY;
    await StorageService.saveShoppingState(this.shoppingState);
    console.log('✅ Shopping list finalized - now read-only');
    this.notifyListeners();
  }

  async startShopping(): Promise<void> {
    console.log('🛍️ Starting shopping trip...');
    this.shoppingState = ShoppingState.SHOPPING;
    await StorageService.saveShoppingState(this.shoppingState);
    console.log('✅ Shopping started - checklist unlocked');
    this.notifyListeners();
  }

  async completeAndRestoreShopping(): Promise<void> {
    console.log('✅ Completing shopping trip and restoring items...');
    
    // Update inventory items that were purchased
    for (const shoppingItem of this.shoppingList) {
      if (shoppingItem.isChecked && !shoppingItem.isTemporary && shoppingItem.inventoryItemId) {
        const inventoryItem = this.inventoryItems.find(item => item.id === shoppingItem.inventoryItemId);
        if (inventoryItem) {
          inventoryItem.quantity = 1.0;
          inventoryItem.purchaseHistory.push(new Date());
          inventoryItem.lastUpdated = new Date();
          console.log(`🔄 Restored ${inventoryItem.name} to 100%`);
        }
      }
    }
    
    // Clear shopping list and reset state
    this.shoppingList = [];
    this.shoppingState = ShoppingState.EMPTY;
    
    await Promise.all([
      StorageService.saveInventoryItems(this.inventoryItems),
      StorageService.saveShoppingList(this.shoppingList),
      StorageService.saveShoppingState(this.shoppingState),
    ]);
    
    console.log('✅ Shopping completed and inventory restored');
    this.notifyListeners();
  }

  async cancelShopping(): Promise<void> {
    console.log('❌ Cancelling shopping...');
    this.shoppingList = [];
    this.shoppingState = ShoppingState.EMPTY;
    
    await Promise.all([
      StorageService.saveShoppingList(this.shoppingList),
      StorageService.saveShoppingState(this.shoppingState),
    ]);
    
    console.log('✅ Shopping cancelled');
    this.notifyListeners();
  }

  async addTemporaryItemToShoppingList(name: string): Promise<void> {
    if (this.shoppingState !== ShoppingState.GENERATING && this.shoppingState !== ShoppingState.SHOPPING) {
      console.error('❌ Cannot add items when not in generating or shopping state');
      return;
    }
    
    console.log(`➕ Adding temporary item: ${name}`);
    
    const tempItem: ShoppingListItem = {
      id: uuidv4(),
      name: name.trim(),
      isChecked: false,
      isTemporary: true,
    };
    
    this.shoppingList.push(tempItem);
    await StorageService.saveShoppingList(this.shoppingList);
    
    console.log(`✅ Temporary item added: ${name}`);
    this.notifyListeners();
  }

  async addInventoryItemToShoppingList(itemId: string): Promise<void> {
    if (this.shoppingState !== ShoppingState.GENERATING && this.shoppingState !== ShoppingState.SHOPPING) {
      console.error('❌ Cannot add items when not in generating or shopping state');
      return;
    }
    
    const item = this.inventoryItems.find(item => item.id === itemId);
    if (!item) {
      console.error(`❌ Item not found: ${itemId}`);
      return;
    }
    
    // Check if already in shopping list
    const existingItem = this.shoppingList.find(shoppingItem => shoppingItem.inventoryItemId === itemId);
    if (existingItem) {
      console.log(`⚠️ Item already in shopping list: ${item.name}`);
      return;
    }
    
    console.log(`➕ Adding inventory item to shopping list: ${item.name}`);
    
    const shoppingItem: ShoppingListItem = {
      id: uuidv4(),
      name: item.name,
      isChecked: false,
      isTemporary: false,
      inventoryItemId: itemId,
    };
    
    this.shoppingList.push(shoppingItem);
    await StorageService.saveShoppingList(this.shoppingList);
    
    console.log(`✅ Inventory item added to shopping list: ${item.name}`);
    this.notifyListeners();
  }

  async removeItemFromShoppingList(shoppingItemId: string): Promise<void> {
    if (this.shoppingState !== ShoppingState.GENERATING) {
      console.error('❌ Cannot remove items when not in generating state');
      return;
    }
    
    const itemIndex = this.shoppingList.findIndex(item => item.id === shoppingItemId);
    if (itemIndex === -1) {
      console.error(`❌ Shopping item not found: ${shoppingItemId}`);
      return;
    }
    
    const item = this.shoppingList[itemIndex];
    this.shoppingList.splice(itemIndex, 1);
    
    await StorageService.saveShoppingList(this.shoppingList);
    console.log(`➖ Removed item from shopping list: ${item.name}`);
    this.notifyListeners();
  }

  async toggleShoppingItemChecked(shoppingItemId: string): Promise<void> {
    if (this.shoppingState !== ShoppingState.SHOPPING) {
      console.error('❌ Cannot toggle items when not in shopping state');
      return;
    }
    
    const item = this.shoppingList.find(item => item.id === shoppingItemId);
    if (!item) {
      console.error(`❌ Shopping item not found: ${shoppingItemId}`);
      return;
    }
    
    item.isChecked = !item.isChecked;
    await StorageService.saveShoppingList(this.shoppingList);
    
    console.log(`🔄 Toggled ${item.name}: ${item.isChecked ? 'checked' : 'unchecked'}`);
    this.notifyListeners();
  }

  // MARK: - Statistics
  getTotalItems(): number {
    return this.inventoryItems.length;
  }

  getLowStockItemsCount(): number {
    return this.inventoryItems.filter(item => item.quantity <= 0.25).length;
  }

  getAverageStockLevel(): number {
    if (this.inventoryItems.length === 0) return 0;
    const totalStock = this.inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
    return totalStock / this.inventoryItems.length;
  }

  getItemsNeedingAttention(): InventoryItem[] {
    return this.inventoryItems
      .filter(item => item.quantity <= 0.25)
      .sort((a, b) => a.quantity - b.quantity);
  }

  getActiveCategoriesCount(): number {
    const activeCategories = new Set(
      this.inventoryItems.map(item => SUBCATEGORY_CONFIG[item.subcategory].category)
    );
    return activeCategories.size;
  }

  getMostFrequentlyRestockedItem(): InventoryItem | null {
    if (this.inventoryItems.length === 0) return null;
    
    return this.inventoryItems.reduce((mostFrequent, current) => 
      current.purchaseHistory.length > mostFrequent.purchaseHistory.length ? current : mostFrequent
    );
  }

  // MARK: - Data Management
  async clearAllData(): Promise<void> {
    this.inventoryItems = [];
    this.shoppingList = [];
    this.shoppingState = ShoppingState.EMPTY;
    
    await StorageService.clearAllData();
    console.log('🗑️ All inventory data cleared');
    this.notifyListeners();
  }

  async resetToDefaults(): Promise<void> {
    await this.clearAllData();
    
    // Create sample items for all subcategories
    const sampleItems: InventoryItem[] = [];
    
    Object.entries(SUBCATEGORY_CONFIG).forEach(([subcategory, config]) => {
      config.sampleItems.forEach(itemName => {
        const item: InventoryItem = {
          id: uuidv4(),
          name: itemName,
          quantity: Math.random() * 0.8 + 0.2, // Random between 20% and 100%
          subcategory: subcategory as InventorySubcategory,
          isCustom: false,
          purchaseHistory: [],
          lastUpdated: new Date(),
        };
        sampleItems.push(item);
      });
    });
    
    this.inventoryItems = sampleItems;
    await StorageService.saveInventoryItems(this.inventoryItems);
    
    console.log(`🔄 Reset to defaults with ${sampleItems.length} sample items`);
    this.notifyListeners();
  }
}

// Export singleton instance
export const inventoryManager = new InventoryManager();