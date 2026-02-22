import { InventoryItem, ShoppingListItem, ShoppingState, InventoryCategory, InventorySubcategory, CustomSubcategory, SubcategoryConfig, ActivityLog, ActivityAction } from '../models/Types';
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
  private subcategoryOrder: Record<string, string[]> = {};
  private activityLogs: ActivityLog[] = [];
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
      
      const [items, shoppingItems, state, customSubs, hiddenSubs, subOrder, loadedLogs] = await Promise.all([
        StorageService.loadInventoryItems(),
        StorageService.loadShoppingList(),
        StorageService.loadShoppingState(),
        StorageService.loadCustomSubcategories(),
        StorageService.loadHiddenBuiltinSubs(),
        StorageService.loadSubcategoryOrder(),
        StorageService.loadActivityLogs(),
      ]);

      this.inventoryItems = items;
      this.customSubcategories = customSubs;
      this.hiddenBuiltinSubs = hiddenSubs || [];
      this.shoppingList = shoppingItems;
      this.shoppingState = state;
      this.subcategoryOrder = subOrder || {};
      this.activityLogs = loadedLogs || [];

      // Initialize order for legacy items
      // We group by subcategory and assign order to ensure stable sorting
      const itemsBySub: Record<string, InventoryItem[]> = {};
      this.inventoryItems.forEach(item => {
        if (!itemsBySub[item.subcategory as string]) itemsBySub[item.subcategory as string] = [];
        itemsBySub[item.subcategory as string].push(item);
      });

      Object.values(itemsBySub).forEach(subItems => {
        // Sort by name initially if no order exists to have a deterministic default
        subItems.sort((a, b) => {
            if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
            if (a.order !== undefined) return -1;
            if (b.order !== undefined) return 1;
            return a.name.localeCompare(b.name);
        });
        
        // Assign order if missing or normalized
        subItems.forEach((item, index) => {
             if (item.order === undefined) {
                 item.order = index;
             }
        });
      });

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

  getVisibleInventoryItems(): InventoryItem[] {
    return this.inventoryItems.filter(item => {
        return this.isSubcategoryVisible(item.subcategory);
    });
  }

  getItemsForCategory(category: InventoryCategory): InventoryItem[] {
    return this.inventoryItems.filter(item => {
      // Check visibility first
      if (!this.isSubcategoryVisible(item.subcategory)) return false;

      const config = this.getSubcategoryConfigInternal(item.subcategory);
      return config?.category === category;
    });
  }

  getItemsForSubcategory(subcategory: InventorySubcategory): InventoryItem[] {
    return this.inventoryItems
      .filter(item => item.subcategory === subcategory)
      .sort((a, b) => (a.order ?? 999999) - (b.order ?? 999999));
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
    
    const conflict = this.findSubcategoryNameConflict(newName, undefined, builtinName);
    if (conflict) {
         throw new Error(`"${newName}" already exists in ${conflict}.`);
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

  private findSubcategoryNameConflict(name: string, excludeCustomId?: string, excludeBuiltinName?: string): string | null {
    const target = name.trim().toLowerCase();
    
    // Check Custom
    const customMatch = this.customSubcategories.find(c => 
        c.id !== excludeCustomId && c.name.trim().toLowerCase() === target
    );
    if (customMatch) return `${customMatch.category} > ${customMatch.name}`;

    // Check Builtin
    const builtinKey = Object.keys(SUBCATEGORY_CONFIG).find(b => {
        if (b === excludeBuiltinName) return false;
        if (this.hiddenBuiltinSubs.includes(b)) return false;
        return b.trim().toLowerCase() === target;
    });
    if (builtinKey) {
      const cfg = SUBCATEGORY_CONFIG[builtinKey];
      return `${cfg.category} > ${builtinKey}`;
    }

    return null;
  }

  private isSubcategoryNameTaken(name: string, excludeCustomId?: string, excludeBuiltinName?: string): boolean {
    return this.findSubcategoryNameConflict(name, excludeCustomId, excludeBuiltinName) !== null;
  }

  isSubcategoryVisible(subcategory: string): boolean {
    // 1. If it's a custom subcategory, it's visible
    const custom = this.customSubcategories.some(c => c.name === subcategory || c.id === subcategory);
    if (custom) return true;

    // 2. If it's a built-in, check if it's hidden
    if (SUBCATEGORY_CONFIG[subcategory]) {
        return !this.hiddenBuiltinSubs.includes(subcategory);
    }

    // 3. Fallback for unknown: assume visible unless explicitly hidden?
    // Actually, if it's unknown and not custom, it might be a legacy or glitch.
    // But for safety, we return true so we don't lose data, unless it matches a known hidden format?
    return true;
  }

  async addCustomItem(name: string, subcategory: InventorySubcategory): Promise<InventoryItem> {
    console.log(`➕ Adding custom item: ${name} to ${subcategory}`);
    
    const existingItem = this.inventoryItems.find(i => i.name.toLowerCase() === name.trim().toLowerCase());
    if (existingItem) {
      const config = this.getSubcategoryConfigInternal(existingItem.subcategory);
      const location = config ? `${config.category} > ${existingItem.subcategory}` : existingItem.subcategory;
      throw new Error(`"${name}" already exists in ${location}.`);
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
    
    await this.addActivityLog({
      action: ActivityAction.ADD_ITEM,
      itemId: newItem.id,
      itemName: newItem.name,
      details: {
        newValue: subcategory,
        itemSnapshot: { ...newItem }
      }
    });

    this.notifyListeners();
    return newItem;
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
    
    await this.addActivityLog({
      action: ActivityAction.REMOVE_ITEM,
      itemId: itemId,
      itemName: item.name,
      details: {
        itemSnapshot: { ...item }
      }
    });

    this.notifyListeners();
  }

  async updateItemQuantity(itemId: string, quantity: number): Promise<void> {
    const item = this.inventoryItems.find(item => item.id === itemId);
    if (!item) {
      console.error(`❌ Item not found: ${itemId}`);
      return;
    }

    const clampedQuantity = Math.max(0.0, Math.min(1.0, quantity));
    const oldQuantity = item.quantity;
    const oldItemSnapshot = { ...item };
    item.quantity = clampedQuantity;
    item.lastUpdated = new Date();

    await StorageService.saveInventoryItems(this.inventoryItems);
    console.log(`🔄 Updated ${item.name} quantity to ${Math.round(clampedQuantity * 100)}%`);
    
    await this.addActivityLog({
      action: ActivityAction.UPDATE_QUANTITY,
      itemId: itemId,
      itemName: item.name,
      details: {
        previousValue: oldQuantity,
        newValue: clampedQuantity,
        itemSnapshot: oldItemSnapshot
      }
    });

    this.notifyListeners();
  }

  async toggleItemIgnore(itemId: string): Promise<void> {
    const item = this.inventoryItems.find(item => item.id === itemId);
    if (!item) {
      console.error(`❌ Item not found: ${itemId}`);
      return;
    }

    const oldItemSnapshot = { ...item };
    item.isIgnored = !item.isIgnored;
    item.lastUpdated = new Date();

    await StorageService.saveInventoryItems(this.inventoryItems);
    console.log(`🔄 Toggled ignore status for ${item.name}: ${item.isIgnored}`);
    
    await this.addActivityLog({
      action: ActivityAction.TOGGLE_IGNORE,
      itemId: itemId,
      itemName: item.name,
      details: {
        previousValue: !item.isIgnored,
        newValue: item.isIgnored,
        itemSnapshot: oldItemSnapshot
      }
    });

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
    
    const existingItem = this.inventoryItems.find(i => i.id !== itemId && i.name.toLowerCase() === trimmedName.toLowerCase());
    if (existingItem) {
      const config = this.getSubcategoryConfigInternal(existingItem.subcategory);
      const location = config ? `${config.category} > ${existingItem.subcategory}` : existingItem.subcategory;
      throw new Error(`"${trimmedName}" already exists in ${location}.`);
    }

    const oldName = item.name;
    const oldItemSnapshot = { ...item };
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
    
    await this.addActivityLog({
      action: ActivityAction.UPDATE_NAME,
      itemId: itemId,
      itemName: oldName,
      details: {
        previousValue: oldName,
        newValue: trimmedName,
        itemSnapshot: oldItemSnapshot
      }
    });

    this.notifyListeners();
  }

  async restockItem(itemId: string): Promise<void> {
    const item = this.inventoryItems.find(item => item.id === itemId);
    if (!item) {
      console.error(`❌ Item not found: ${itemId}`);
      return;
    }

    const oldQuantity = item.quantity;
    const oldItemSnapshot = { ...item };
    item.quantity = 1.0;
    item.purchaseHistory.push(new Date());
    item.lastUpdated = new Date();

    await StorageService.saveInventoryItems(this.inventoryItems);
    console.log(`🔄 Restocked ${item.name} to 100%`);
    
    await this.addActivityLog({
      action: ActivityAction.RESTOCK,
      itemId: itemId,
      itemName: item.name,
      details: {
        previousValue: oldQuantity,
        newValue: 1.0,
        itemSnapshot: oldItemSnapshot
      }
    });

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
      
    const all = [...builtin, ...custom];
    const order = this.subcategoryOrder[category] || [];
    
    // Sort based on saved order
    const ordered = all.filter(s => order.includes(s)).sort((a, b) => order.indexOf(a) - order.indexOf(b));
    const unordered = all.filter(s => !order.includes(s));
    
    return [...ordered, ...unordered];
  }

  async updateItemOrder(updates: {id: string, order: number}[]): Promise<void> {
    let hasChanges = false;
    updates.forEach(u => {
      const item = this.inventoryItems.find(i => i.id === u.id);
      if (item && item.order !== u.order) {
        item.order = u.order;
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      this.notifyListeners(); // Notify UI immediately for optimistic update
      await StorageService.saveInventoryItems(this.inventoryItems);
    }
  }

  async updateSubcategoryOrder(category: InventoryCategory, newOrder: string[]): Promise<void> {
    this.subcategoryOrder[category] = newOrder;
    this.notifyListeners(); // Notify UI immediately
    await StorageService.saveSubcategoryOrder(this.subcategoryOrder);
  }

  getSubcategoryConfig(subcategory: InventorySubcategory): SubcategoryConfig | null {
    return this.getSubcategoryConfigInternal(subcategory);
  }

  async addCustomSubcategory(name: string, icon: string, color: string, category: InventoryCategory): Promise<void> {
    const conflict = this.findSubcategoryNameConflict(name);
    if (conflict) {
        throw new Error(`"${name}" already exists in ${conflict}.`);
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
    const conflict = this.findSubcategoryNameConflict(name, id);
    if (conflict) {
         throw new Error(`"${name}" already exists in ${conflict}.`);
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
    
    // Add items that need attention (<25%) - sorted by urgency
    const attentionItems = this.inventoryItems
      .filter(item => Math.round(item.quantity * 100) < 25 && !item.isIgnored)
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
          
          // Un-hide if it was hidden, since it's now freshly stocked
          if (inventoryItem.isIgnored) {
            inventoryItem.isIgnored = false;
            console.log(`👁️ Un-ignored ${inventoryItem.name} as it was restocked`);
          }

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
    if (this.shoppingState === ShoppingState.EMPTY) {
      this.shoppingState = ShoppingState.GENERATING;
    } else if (this.shoppingState !== ShoppingState.GENERATING && this.shoppingState !== ShoppingState.SHOPPING) {
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
    if (this.shoppingState === ShoppingState.EMPTY) {
      this.shoppingState = ShoppingState.GENERATING;
    } else if (this.shoppingState !== ShoppingState.GENERATING && this.shoppingState !== ShoppingState.SHOPPING) {
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
    return this.getVisibleInventoryItems().filter(item => Math.round(item.quantity * 100) < 25).length;
  }

  getAverageStockLevel(): number {
    const visibleItems = this.getVisibleInventoryItems();
    if (visibleItems.length === 0) return 0;
    const totalStock = visibleItems.reduce((sum, item) => sum + item.quantity, 0);
    return totalStock / visibleItems.length;
  }

  getItemsNeedingAttention(): InventoryItem[] {
    return this.getVisibleInventoryItems()
      .filter(item => Math.round(item.quantity * 100) < 25)
      .sort((a, b) => a.quantity - b.quantity);
  }

  getIgnoredItems(): InventoryItem[] {
    return this.inventoryItems.filter(item => item.isIgnored);
  }

  async addIgnoredItemsToShoppingList(itemIds: string[]): Promise<void> {
    if (this.shoppingState === ShoppingState.EMPTY) {
        // If empty, start a new list first
        this.shoppingList = [];
        this.shoppingState = ShoppingState.GENERATING;
    }

    let addedCount = 0;
    
    for (const itemId of itemIds) {
      const item = this.inventoryItems.find(i => i.id === itemId);
      if (!item) continue;
      
      // Check if already in shopping list
      const existing = this.shoppingList.find(sl => sl.inventoryItemId === itemId);
      if (existing) continue;

      const shoppingItem: ShoppingListItem = {
        id: uuidv4(),
        name: item.name,
        isChecked: false, // Default to unchecked so they are "to buy"
        isTemporary: false,
        inventoryItemId: item.id,
      };
      
      this.shoppingList.push(shoppingItem);
      addedCount++;
      console.log(`➕ Added ignored item to shopping list: ${item.name}`);
    }

    if (addedCount > 0) {
        await Promise.all([
            StorageService.saveShoppingList(this.shoppingList),
            StorageService.saveShoppingState(this.shoppingState),
        ]);
        this.notifyListeners();
    }
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
    this.customSubcategories = [];
    // Hide ALL built-in subcategories to start fresh
    this.hiddenBuiltinSubs = Object.keys(SUBCATEGORY_CONFIG);
    this.subcategoryOrder = {};
    
    await Promise.all([
      StorageService.clearAllData(),
      StorageService.saveCustomSubcategories([]),
      StorageService.saveHiddenBuiltinSubs(this.hiddenBuiltinSubs),
      StorageService.saveSubcategoryOrder({}),
    ]);
    
    console.log('🗑️ All inventory data cleared and built-in subcategories hidden');
    this.notifyListeners();
  }

  getExportData() {
    // Enrich items with resolved category names for readability/portability
    const enrichedItems = this.inventoryItems.map(item => {
        const config = this.getSubcategoryConfigInternal(item.subcategory);
        return {
            ...item,
            _category: config?.category || 'Unknown',
            _subcategoryName: item.subcategory, // Just for clarity as it's the key
        };
    });

    return {
      inventoryItems: enrichedItems,
      customSubcategories: this.customSubcategories,
      // hiddenBuiltinSubs excluded as per request (user wants to start fresh or manages visibility differently)
      shoppingList: this.shoppingList,
      subcategoryOrder: this.subcategoryOrder,
    };
  }

  async importData(data: any): Promise<void> {
    if (!data) return;

    // 1. Update In-Memory State
    if (Array.isArray(data.inventoryItems)) {
        // Restore dates
        this.inventoryItems = data.inventoryItems.map((item: any) => ({
            ...item,
            lastUpdated: new Date(item.lastUpdated),
            purchaseHistory: item.purchaseHistory?.map((d: string) => new Date(d)) || []
        }));
    }
    
    if (Array.isArray(data.customSubcategories)) {
        this.customSubcategories = data.customSubcategories;
    } else {
        // Reset to empty if not provided, to ensure clean state
        this.customSubcategories = [];
    }

    if (Array.isArray(data.hiddenBuiltinSubs)) {
        this.hiddenBuiltinSubs = data.hiddenBuiltinSubs;
    } else {
        // If not provided in export (which we just removed), it means user wants CLEAN state.
        // So we should HIDE ALL built-in subs by default, just like "Clear All Data".
        // Otherwise they will all show up because empty hidden list = all visible.
        this.hiddenBuiltinSubs = Object.keys(SUBCATEGORY_CONFIG);
    }

    // Intelligent Unhide:
    // Since we default to hiding EVERYTHING if hiddenBuiltinSubs is missing,
    // we must ensure that subcategories containing the imported items are REVEALED.
    // Otherwise the user will see items but no tabs for them (or worse, items hidden).
    if (!Array.isArray(data.hiddenBuiltinSubs)) { 
        const importedSubcategories = new Set(this.inventoryItems.map(i => i.subcategory));
        
        // Ensure we don't unhide built-ins that have custom overrides
        const customSubNames = new Set(this.customSubcategories.map(c => c.name));
        
        // Remove from hidden list ONLY if:
        // 1. It is used by an imported item
        // 2. AND it is NOT overridden by a custom subcategory
        this.hiddenBuiltinSubs = this.hiddenBuiltinSubs.filter(sub => {
            const isUsed = importedSubcategories.has(sub);
            const isOverridden = customSubNames.has(sub);
            
            // If used and not overridden, unhide it (return false)
            if (isUsed && !isOverridden) {
                return false; 
            }
            
            // Otherwise keep it hidden (return true)
            return true;
        });
    }

    if (Array.isArray(data.shoppingList)) {
        this.shoppingList = data.shoppingList;
    }
    
    if (data.subcategoryOrder) {
        this.subcategoryOrder = data.subcategoryOrder;
    }

    // 2. Persist to Storage
    await Promise.all([
        StorageService.saveInventoryItems(this.inventoryItems),
        StorageService.saveCustomSubcategories(this.customSubcategories),
        StorageService.saveHiddenBuiltinSubs(this.hiddenBuiltinSubs),
        StorageService.saveShoppingList(this.shoppingList),
        StorageService.saveSubcategoryOrder(this.subcategoryOrder),
    ]);

    console.log('📥 Data imported successfully');
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
    // Since we are resetting to defaults, we want all built-in categories to be visible
    this.hiddenBuiltinSubs = []; 
    
    await Promise.all([
      StorageService.saveInventoryItems(this.inventoryItems),
      StorageService.saveHiddenBuiltinSubs(this.hiddenBuiltinSubs),
    ]);
    
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

  // MARK: - Activity Tracking Internal
  private async addActivityLog(log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<void> {
    const newLog: ActivityLog = {
      ...log,
      id: uuidv4(),
      timestamp: new Date(),
    };

    // Keep logs for the last 4 weeks (28 days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 28);

    // Filter out ANY previous logs for the same item (always keep only the LATEST action per item)
    // AND filter by date
    this.activityLogs = [
      newLog,
      ...this.activityLogs.filter(l => 
        l.itemId !== log.itemId && 
        new Date(l.timestamp) > cutoffDate
      )
    ].slice(0, 100);

    await StorageService.saveActivityLogs(this.activityLogs);
    this.notifyListeners();
  }

  async clearActivityLogs(): Promise<void> {
    this.activityLogs = [];
    await StorageService.saveActivityLogs([]);
    this.notifyListeners();
  }

  getActivityLogs(): ActivityLog[] {
    return [...this.activityLogs];
  }

  async undoActivity(logId: string): Promise<void> {
    const logIndex = this.activityLogs.findIndex(l => l.id === logId);
    if (logIndex === -1) return;

    const log = this.activityLogs[logIndex];
    if (log.isUndone) return;

    console.log(`⏪ Undoing activity: ${log.action} for ${log.itemName}`);

    try {
      switch (log.action) {
        case ActivityAction.UPDATE_QUANTITY:
        case ActivityAction.UPDATE_NAME:
        case ActivityAction.RESTOCK:
        case ActivityAction.TOGGLE_IGNORE:
          if (log.details.itemSnapshot) {
            const itemIndex = this.inventoryItems.findIndex(i => i.id === log.itemId);
            if (itemIndex !== -1) {
              this.inventoryItems[itemIndex] = { ...log.details.itemSnapshot };
            } else {
              console.warn('Item not found for undo, re-adding it');
              this.inventoryItems.push({ ...log.details.itemSnapshot });
            }
          }
          break;

        case ActivityAction.REMOVE_ITEM:
          if (log.details.itemSnapshot) {
            // Re-add the item
            this.inventoryItems.push({ ...log.details.itemSnapshot });
          }
          break;

        case ActivityAction.ADD_ITEM:
          // Remove the added item
          this.inventoryItems = this.inventoryItems.filter(i => i.id !== log.itemId);
          break;
      }

      log.isUndone = true;
      await Promise.all([
        StorageService.saveInventoryItems(this.inventoryItems),
        StorageService.saveActivityLogs(this.activityLogs),
      ]);

      this.notifyListeners();
      console.log('✅ Undo successful');
    } catch (error) {
      console.error('❌ Error undoing activity:', error);
    }
  }
}

// Export singleton instance
export const inventoryManager = new InventoryManager();