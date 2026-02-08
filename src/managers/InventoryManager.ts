import { InventoryItem, ShoppingListItem, ShoppingState, InventoryCategory, InventorySubcategory, CustomSubcategory, SubcategoryConfig } from '../models/Types';
import { StorageService } from '../services/StorageService';
import { SUBCATEGORY_CONFIG } from '../constants/CategoryConfig';
import { v4 as uuidv4 } from 'uuid';

// MARK: - Inventory Manager Class
export class InventoryManager {
  private inventoryItems: InventoryItem[] = [];
  private customSubcategories: CustomSubcategory[] = [];
  private hiddenBuiltinSubs: string[] = [];
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
      
      const [items, shoppingItems, state, customSubs, hiddenSubs] = await Promise.all([
        StorageService.loadInventoryItems(),
        StorageService.loadShoppingList(),
        StorageService.loadShoppingState(),
        StorageService.loadCustomSubcategories(),
        StorageService.loadHiddenBuiltinSubs(),
      ]);

      this.inventoryItems = items;
      this.customSubcategories = customSubs;
      this.hiddenBuiltinSubs = hiddenSubs || [];
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
      const config = this.getSubcategoryConfigInternal(item.subcategory);
      return config?.category === category;
    });
  }

  getItemsForSubcategory(subcategory: InventorySubcategory): InventoryItem[] {
    return this.inventoryItems.filter(item => item.subcategory === subcategory);
  }

  private getSubcategoryConfigInternal(subcategory: InventorySubcategory): SubcategoryConfig | null {
    // Check built-in first, but only if not hidden
    // Note: If a built-in is hidden, we might have a custom one with the same name acting as an override
    if (SUBCATEGORY_CONFIG[subcategory] && !this.hiddenBuiltinSubs.includes(subcategory)) {
      return SUBCATEGORY_CONFIG[subcategory];
    }
    // Check custom
    const custom = this.customSubcategories.find(cs => cs.name === subcategory || cs.id === subcategory);
    if (custom) {
      return {
        icon: custom.icon,
        color: custom.color,
        category: custom.category,
        sampleItems: []
      };
    }
    // Fallback: if it's a hidden built-in but no custom override found (shouldn't happen in normal flow but possible)
    // we return the built-in config so at least it renders
    if (SUBCATEGORY_CONFIG[subcategory]) {
        return SUBCATEGORY_CONFIG[subcategory];
    }
    return null;
  }

  async promoteBuiltinToCustom(builtinName: string, newName: string, newIcon: string, color: string, category: InventoryCategory): Promise<void> {
    console.log(`✨ Promoting builtin ${builtinName} to custom ${newName}`);
    
    if (this.isSubcategoryNameTaken(newName, undefined, builtinName)) {
         throw new Error(`Category "${newName}" already exists.`);
    }

    // 1. Hide the builtin
    if (!this.hiddenBuiltinSubs.includes(builtinName)) {
        this.hiddenBuiltinSubs.push(builtinName);
        await StorageService.saveHiddenBuiltinSubs(this.hiddenBuiltinSubs);
    }

    // 2. Create the custom subcategory
    const newSub: CustomSubcategory = {
        id: uuidv4(),
        name: newName,
        icon: newIcon,
        color: color,
        category: category,
    };

    this.customSubcategories.push(newSub);
    await StorageService.saveCustomSubcategories(this.customSubcategories);

    // 3. Migrate items if the name changed
    if (builtinName !== newName) {
        let updatedCount = 0;
        this.inventoryItems.forEach(item => {
            if (item.subcategory === builtinName) {
                item.subcategory = newName;
                updatedCount++;
            }
        });
        
        if (updatedCount > 0) {
            await StorageService.saveInventoryItems(this.inventoryItems);
            console.log(`📦 Migrated ${updatedCount} items from ${builtinName} to ${newName}`);
        }
    } else {
        console.log(`📦 No item migration needed (name preserved)`);
    }

    this.notifyListeners();
  }

  private isSubcategoryNameTaken(name: string, excludeCustomId?: string, excludeBuiltinName?: string): boolean {
    const target = name.trim().toLowerCase();
    
    // Check Custom
    const customConflict = this.customSubcategories.some(c => 
        c.id !== excludeCustomId && c.name.trim().toLowerCase() === target
    );
    if (customConflict) return true;

    // Check Builtin
    const builtinConflict = Object.keys(SUBCATEGORY_CONFIG).some(b => {
        if (b === excludeBuiltinName) return false;
        if (this.hiddenBuiltinSubs.includes(b)) return false;
        return b.trim().toLowerCase() === target;
    });

    return builtinConflict;
  }

  async addCustomItem(name: string, subcategory: InventorySubcategory): Promise<void> {
    console.log(`➕ Adding custom item: ${name} to ${subcategory}`);
    
    if (this.inventoryItems.some(i => i.name.toLowerCase() === name.trim().toLowerCase())) {
        throw new Error(`Item "${name}" already exists.`);
    }

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

  async toggleItemIgnore(itemId: string): Promise<void> {
    const item = this.inventoryItems.find(item => item.id === itemId);
    if (!item) {
      console.error(`❌ Item not found: ${itemId}`);
      return;
    }

    item.isIgnored = !item.isIgnored;
    item.lastUpdated = new Date();

    await StorageService.saveInventoryItems(this.inventoryItems);
    console.log(`🔄 Toggled ignore status for ${item.name}: ${item.isIgnored}`);
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
      throw new Error('Item name cannot be empty');
    }
    
    if (this.inventoryItems.some(i => i.id !== itemId && i.name.toLowerCase() === trimmedName.toLowerCase())) {
        throw new Error(`Item "${trimmedName}" already exists.`);
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

  // MARK: - Subcategory Management
  getCustomSubcategories(): CustomSubcategory[] {
    return [...this.customSubcategories];
  }

  getSubcategoriesForCategory(category: InventoryCategory): InventorySubcategory[] {
    const builtin = Object.entries(SUBCATEGORY_CONFIG)
      .filter(([sub, config]) => config.category === category && !this.hiddenBuiltinSubs.includes(sub))
      .map(([sub, _]) => sub);
    
    const custom = this.customSubcategories
      .filter(cs => cs.category === category)
      .map(cs => cs.name);
      
    return [...builtin, ...custom];
  }

  getSubcategoryConfig(subcategory: InventorySubcategory): SubcategoryConfig | null {
    return this.getSubcategoryConfigInternal(subcategory);
  }

  async addCustomSubcategory(name: string, icon: string, color: string, category: InventoryCategory): Promise<void> {
    if (this.isSubcategoryNameTaken(name)) {
        throw new Error(`Category "${name}" already exists.`);
    }

    const newSub: CustomSubcategory = {
      id: uuidv4(),
      name: name.trim(),
      icon,
      color,
      category,
    };

    this.customSubcategories.push(newSub);
    await StorageService.saveCustomSubcategories(this.customSubcategories);
    this.notifyListeners();
  }

  async updateSubcategory(id: string, name: string, icon: string, color: string): Promise<void> {
    if (this.isSubcategoryNameTaken(name, id)) {
         throw new Error(`Category "${name}" already exists.`);
    }
  
    const subIndex = this.customSubcategories.findIndex(s => s.id === id);
    if (subIndex === -1) return;

    const oldName = this.customSubcategories[subIndex].name;
    const newName = name.trim();

    this.customSubcategories[subIndex] = {
      ...this.customSubcategories[subIndex],
      name: newName,
      icon,
      color,
    };

    // If name changed, update all items belonging to this subcategory
    if (oldName !== newName) {
      this.inventoryItems.forEach(item => {
        if (item.subcategory === oldName) {
          item.subcategory = newName;
        }
      });
      await StorageService.saveInventoryItems(this.inventoryItems);
    }

    await StorageService.saveCustomSubcategories(this.customSubcategories);
    this.notifyListeners();
  }

  async removeSubcategory(idOrName: string): Promise<void> {
    // Check if it's a builtin name first
    if (SUBCATEGORY_CONFIG[idOrName]) {
      if (!this.hiddenBuiltinSubs.includes(idOrName)) {
        this.hiddenBuiltinSubs.push(idOrName);
        await StorageService.saveHiddenBuiltinSubs(this.hiddenBuiltinSubs);
        
        // Remove all items belonging to this subcategory
        const itemsToRemove = this.inventoryItems.filter(item => item.subcategory === idOrName);
        for (const item of itemsToRemove) {
          await this.removeItem(item.id);
        }
        
        this.notifyListeners();
      }
      return;
    }

    const sub = this.customSubcategories.find(s => s.id === idOrName || s.name === idOrName);
    if (!sub) return;

    // Remove all items belonging to this subcategory
    const itemsToRemove = this.inventoryItems.filter(item => item.subcategory === sub.name);
    for (const item of itemsToRemove) {
      await this.removeItem(item.id);
    }

    this.customSubcategories = this.customSubcategories.filter(s => s.id !== sub.id);
    await StorageService.saveCustomSubcategories(this.customSubcategories);
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
      .filter(item => item.quantity <= 0.25 && !item.isIgnored)
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
      this.inventoryItems.map(item => this.getSubcategoryConfigInternal(item.subcategory)?.category)
        .filter(cat => cat !== undefined)
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
  // MARK: - Activity Analysis
  getStaleItemsByThreshold(thresholds: Record<InventoryCategory, number>): InventoryItem[] {
    const now = new Date();
    return this.inventoryItems.filter(item => {
      const config = this.getSubcategoryConfigInternal(item.subcategory);
      if (!config) return false;
      
      const thresholdDays = thresholds[config.category];
      if (thresholdDays === undefined) return false;

      const diffTime = Math.abs(now.getTime() - new Date(item.lastUpdated).getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays >= thresholdDays;
    });
  }
}

// Export singleton instance
export const inventoryManager = new InventoryManager();