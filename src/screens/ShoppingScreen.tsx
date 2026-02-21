import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import {
  Card,
  Title,
  Paragraph,
  Button,
  List,
  Checkbox,
  IconButton,
  FAB,
  Text,
  useTheme,
  Portal,
  Dialog,
  TextInput,
  Snackbar,
} from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { inventoryManager } from '../managers/InventoryManager';
import { settingsManager } from '../managers/SettingsManager';
import { ShoppingListItem, ShoppingState, InventoryItem, InventoryCategory } from '../models/Types';
import { getCategoryConfig, getSubcategoryConfig } from '../constants/CategoryConfig';
import { commonStyles, getCategoryColor } from '../themes/AppTheme';
import DoodleBackground from '../components/DoodleBackground';
import { tabBar as tabBarDims, fontSize as fs, spacing as sp, radius as r, screen } from '../themes/Responsive';

const ShoppingScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [shoppingState, setShoppingState] = useState<ShoppingState>(ShoppingState.EMPTY);
  const [refreshing, setRefreshing] = useState(false);
  const [addItemDialogVisible, setAddItemDialogVisible] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [miscSuggestions, setMiscSuggestions] = useState<string[]>([]);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [completeConfirmVisible, setCompleteConfirmVisible] = useState(false);
  const [cancelConfirmVisible, setCancelConfirmVisible] = useState(false);
  const [emptyListAlertVisible, setEmptyListAlertVisible] = useState(false);
  const [invalidInputAlertVisible, setInvalidInputAlertVisible] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [ignoredItemsDialogVisible, setIgnoredItemsDialogVisible] = useState(false);
  const [ignoredItems, setIgnoredItems] = useState<InventoryItem[]>([]);
  const [selectedIgnoredIds, setSelectedIgnoredIds] = useState<Set<string>>(new Set());
  const [searchItemsDialogVisible, setSearchItemsDialogVisible] = useState(false);
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [filteredAllItems, setFilteredAllItems] = useState<InventoryItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSearchingItems, setIsSearchingItems] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);

  useEffect(() => {
    // Load initial data
    loadShoppingData();

    // Set up listener for data changes
    const unsubscribe = inventoryManager.addListener(() => {
      loadShoppingData();
    });

    return unsubscribe;
  }, []);

  const loadShoppingData = () => {
    const items = inventoryManager.getShoppingList();
    const state = inventoryManager.getShoppingState();
    const suggestions = settingsManager.getMiscItemSuggestions();
    
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShoppingList(items);
    setShoppingState(state);
    setMiscSuggestions(suggestions);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    loadShoppingData();
    setRefreshing(false);
  };

  const handleStartGenerating = async () => {
    await inventoryManager.startGeneratingShoppingList();
  };

  const handleFinalizeList = async () => {
    if (shoppingList.length === 0) {
      setEmptyListAlertVisible(true);
      return;
    }
    await inventoryManager.finalizeShoppingList();
  };

  const handleStartShopping = async () => {
    await inventoryManager.startShopping();
  };

  const handleCompleteAndRestore = async () => {
    setCompleteConfirmVisible(true);
  };

  const onConfirmComplete = async () => {
    setCompleteConfirmVisible(false); // Close confirm dialog immediately
    try {
      // 1. Give time for confirm dialog to close animation
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 2. Perform the logic (will trigger state update to EMPTY)
      await inventoryManager.completeAndRestoreShopping();

      // 3. Show success dialog AFTER the state has settled and View re-rendered
      setTimeout(() => {
        setShowSuccessDialog(true);
      }, 500); 
    } catch (e) {
      console.error('Error completing shopping:', e);
    }
  };

  const handleCancelShopping = async () => {
    setCancelConfirmVisible(true);
  };

  const onConfirmCancel = async () => {
    setCancelConfirmVisible(false);
    await inventoryManager.cancelShopping();
  };

  const handleToggleItem = async (item: ShoppingListItem) => {
    await inventoryManager.toggleShoppingItemChecked(item.id);
  };

  const handleRemoveItem = async (item: ShoppingListItem) => {
    await inventoryManager.removeItemFromShoppingList(item.id);
  };

  const handleAddMiscItem = async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setInvalidInputAlertVisible(true);
      return;
    }

    await inventoryManager.addTemporaryItemToShoppingList(trimmedName);
    await settingsManager.addMiscItemToHistory(trimmedName);
    
    setNewItemName('');
    setAddItemDialogVisible(false);
  };

  const handleSuggestionPress = (suggestion: string) => {
    setNewItemName(suggestion);
  };

  const handleOpenIgnoredItemsDialog = () => {
    const ignored = inventoryManager.getIgnoredItems();
    // Filter out items already in the shopping list
    const availableIgnored = ignored.filter(item => 
      !shoppingList.some(sl => sl.inventoryItemId === item.id)
    );
    
    setIgnoredItems(availableIgnored);
    setSelectedIgnoredIds(new Set()); // Start with none selected
    setIgnoredItemsDialogVisible(true);
  };

  const toggleIgnoredItemSelection = (id: string) => {
    const newSet = new Set(selectedIgnoredIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIgnoredIds(newSet);
  };

  const handleAddSelectedIgnoredItems = async () => {
    if (selectedIgnoredIds.size === 0) return;
    
    await inventoryManager.addIgnoredItemsToShoppingList(Array.from(selectedIgnoredIds));
    setIgnoredItemsDialogVisible(false);
  };

  const handleOpenSearchItemsDialog = () => {
    setSearchLoading(true);
    // Use timeout to allow UI to update with spinner before heavy processing/rendering
    setTimeout(() => {
        const all = inventoryManager.getInventoryItems();
        const available = all.filter(item => 
          !shoppingList.some(sl => sl.inventoryItemId === item.id)
        );
        setAllItems(available);
        setFilteredAllItems(available);
        setItemSearchQuery('');
        setSearchItemsDialogVisible(true);
        // Clean up loading state slightly after dialog opens to ensure smooth transition
        requestAnimationFrame(() => {
          setSearchLoading(false);
        });
    }, 100);
  };

  useEffect(() => {
    if (!itemSearchQuery.trim()) {
      setFilteredAllItems(allItems);
      setIsSearchingItems(false);
    } else {
      setIsSearchingItems(true);
      const timer = setTimeout(() => {
        const filtered = allItems.filter(item => 
          item.name.toLowerCase().includes(itemSearchQuery.toLowerCase())
        );
        setFilteredAllItems(filtered);
        setIsSearchingItems(false);
      }, 500); // Debounce
      return () => clearTimeout(timer);
    }
  }, [itemSearchQuery, allItems]);

  const handleAddAnyItem = async (item: InventoryItem) => {
    await inventoryManager.addIgnoredItemsToShoppingList([item.id]); 
    setSearchItemsDialogVisible(false);
    setSnackbarMessage(`Added ${item.name} to list`);
    setSnackbarVisible(true);
  };

  const getStateDescription = (): string => {
    switch (shoppingState) {
      case ShoppingState.EMPTY:
        return 'No active shopping list. Generate one based on low stock items.';
      case ShoppingState.GENERATING:
        return 'Edit your shopping list by adding or removing items.';
      case ShoppingState.LIST_READY:
        return 'Your shopping list is ready. Start shopping to enable checking off items.';
      case ShoppingState.SHOPPING:
        return 'Shopping in progress. Check off items as you add them to your cart.';
      default:
        return '';
    }
  };

  const getCheckedItems = () => shoppingList.filter(item => item.isChecked);
  const getUncheckedItems = () => shoppingList.filter(item => !item.isChecked);

  // Helper to get item details efficiently
  const getItemDetails = (item: ShoppingListItem) => {
    if (item.isTemporary || !item.inventoryItemId) {
      return { category: 'Misc', subConfig: null, categoryConfig: null };
    }
    const invItem = inventoryManager.getInventoryItems().find(i => i.id === item.inventoryItemId);
    if (!invItem) return { category: 'Misc', subConfig: null, categoryConfig: null }; // Fallback

    const subConfig = inventoryManager.getSubcategoryConfig(invItem.subcategory);
    const category = subConfig ? subConfig.category : 'Misc';
    const categoryConfig = category !== 'Misc' ? getCategoryConfig(category as InventoryCategory) : null;
    
    return { category, subConfig, categoryConfig };
  };

  const renderShoppingListItem = (item: ShoppingListItem) => {
    const canToggle = shoppingState === ShoppingState.SHOPPING;
    const canRemove = shoppingState === ShoppingState.GENERATING;
    const { subConfig } = getItemDetails(item);

    return (
      <List.Item
        key={item.id}
        title={item.name}
        description={item.isTemporary ? 'Misc Item' : undefined}
        left={() => (
            <View style={{ flexDirection: 'row', alignItems: 'center', minWidth: 24 }}>
                {canToggle ? (
                   <Checkbox
                     status={item.isChecked ? 'checked' : 'unchecked'}
                     onPress={() => canToggle && handleToggleItem(item)}
                     color={theme.colors.primary}
                     uncheckedColor={theme.colors.onSurfaceVariant}
                   />
                ) : null}
                {/* Always show icon if not temporary (or minimal icon for temp) */}
                <View style={{ marginLeft: canToggle ? 0 : 8, width: 32, alignItems: 'center', justifyContent: 'center' }}>
                     <Icon 
                        name={(subConfig ? subConfig.icon : (item.isTemporary ? "tag-outline" : "package-variant")) as any} 
                        size={20} 
                        color={subConfig ? (getCategoryColor(subConfig.category, theme.dark)) : theme.colors.onSurfaceVariant}
                     />
                </View>
            </View>
        )}
        right={() => (
            canRemove ? (
                <IconButton
                  icon="close"
                  size={20}
                  onPress={() => handleRemoveItem(item)}
                />
              ) : null
        )}
        onPress={() => {
          if (canToggle) {
             handleToggleItem(item);
          } else if (canRemove && item.isTemporary) {
             setNewItemName(item.name);
             setAddItemDialogVisible(true);
          }
        }}
        style={[
          styles.listItem,
          item.isChecked && { 
            backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
            opacity: 0.7 
          },
        ]}
        titleStyle={[
          item.isChecked && { 
            color: theme.colors.onSurfaceDisabled || theme.colors.onSurfaceVariant 
          },
        ]}
      />
    );
  };

  const renderGroupedItems = (items: ShoppingListItem[]) => {
      // Group items
      const groups: Record<string, ShoppingListItem[]> = {};
      const categories: string[] = []; // To keep order

      items.forEach(item => {
          const { category } = getItemDetails(item);
          const catKey = category.toString();
          if (!groups[catKey]) {
              groups[catKey] = [];
              categories.push(catKey);
          }
          groups[catKey].push(item);
      });

      // Sort categories: defined ones first, then Misc
      categories.sort((a, b) => {
          if (a === 'Misc') return 1;
          if (b === 'Misc') return -1;
          return a.localeCompare(b);
      });

      return (
          <View>
              {categories.map(catKey => {
                  const categoryItems = groups[catKey];
                  const isMisc = catKey === 'Misc';
                  const config = !isMisc ? getCategoryConfig(catKey as InventoryCategory) : null;
                  
                  return (
                      <View key={catKey} style={styles.categoryGroup}>
                          <View style={styles.categoryHeader}>
                              <Icon 
                                name={(config ? config.icon : 'tag-multiple') as any} 
                                size={20} 
                                color={config ? getCategoryColor(catKey as InventoryCategory, theme.dark) : theme.colors.secondary} 
                                style={{ marginRight: 8 }}
                              />
                              <Text style={[styles.categoryTitle, { color: config ? getCategoryColor(catKey as InventoryCategory, theme.dark) : theme.colors.secondary }]}>
                                  {isMisc ? 'Miscellaneous' : catKey.charAt(0).toUpperCase() + catKey.slice(1).toLowerCase().replace('_', ' ')}
                              </Text>
                          </View>
                          {categoryItems.map(renderShoppingListItem)}
                      </View>
                  );
              })}
          </View>
      );
  };

  const renderEmptyState = () => (
    <View style={[styles.emptyState, { backgroundColor: theme.colors.background }]}>
      <DoodleBackground />
      <Icon name="cart-outline" size={64} color={theme.colors.onSurfaceVariant} />
      <Text variant="headlineSmall" style={[styles.emptyTitle, { color: theme.colors.onBackground }]}>No Shopping List</Text>
      <Text variant="bodyLarge" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
        Generate a shopping list based on your low stock items to get started.
      </Text>
      <Button
        mode="contained"
        onPress={handleStartGenerating}
        style={styles.generateButton}
        icon="plus"
      >
        Generate Shopping List
      </Button>
      <Button
        mode="text"
        onPress={handleOpenIgnoredItemsDialog}
        style={{ marginTop: 8 }}
        textColor={theme.colors.secondary}
      >
        Add from hidden items
      </Button>
      <Button
        mode="text"
        onPress={handleOpenSearchItemsDialog}
        style={{ marginTop: 0 }}
        textColor={theme.colors.primary}
        icon={searchLoading ? undefined : "magnify"}
        loading={searchLoading}
        disabled={searchLoading}
      >
        {searchLoading ? "Loading Items..." : "Search & Add from all items"}
      </Button>
      <FAB
        icon="tag-plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.dark ? '#000' : '#fff'}
        onPress={() => setAddItemDialogVisible(true)}
      />
    </View>
  );

  const renderGeneratingState = () => (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <DoodleBackground />
      <Card style={[styles.statusCard, { backgroundColor: theme.colors.surface }]} mode="elevated">
        <Card.Content>
          <View style={[styles.statusHeader, { justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="cart-plus" size={24} color={theme.colors.primary} />
              <Text style={[styles.statusTitle, { color: theme.colors.onSurface }]}>Editing Shopping List</Text>
            </View>
            <IconButton 
              icon={helpVisible ? "chevron-up" : "information-outline"} 
              size={20} 
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setHelpVisible(!helpVisible);
              }}
            />
          </View>
          {helpVisible && (
            <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>{getStateDescription()}</Text>
          )}
        </Card.Content>
      </Card>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {shoppingList.length > 0 ? (
          <Card style={styles.listCard}>
            <Card.Content>
              <Title>Shopping List ({shoppingList.length} items)</Title>
              {renderGroupedItems(shoppingList)}
            </Card.Content>
          </Card>
        ) : (
          <View style={[styles.emptyListState, { backgroundColor: theme.colors.background }]}>
            <Text style={{ color: theme.colors.onBackground }}>No items in shopping list. Add some items to get started.</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.actionButtons}>
        <Button
          mode="contained"
          onPress={handleFinalizeList}
          style={styles.mainActionButton}
          contentStyle={styles.actionButtonContent}
          disabled={shoppingList.length === 0}
        >
          Finalize List
        </Button>
        
        <View style={styles.secondaryActions}>
          <Button
            mode="outlined"
            onPress={handleOpenIgnoredItemsDialog}
            style={styles.secondaryActionButton}
            textColor={theme.colors.secondary}
            labelStyle={{ fontSize: 11 }}
          >
            Hidden
          </Button>
          <Button
            mode="outlined"
            onPress={handleOpenSearchItemsDialog}
            style={styles.secondaryActionButton}
            textColor={theme.colors.primary}
            labelStyle={{ fontSize: 11 }}
            icon={searchLoading ? undefined : "magnify"}
            loading={searchLoading}
            disabled={searchLoading}
          >
            Search
          </Button>
          <Button
            mode="outlined"
            onPress={handleCancelShopping}
            style={styles.secondaryActionButton}
            labelStyle={{ fontSize: 11 }}
          >
            Cancel
          </Button>
        </View>
      </View>

      <FAB
        icon="tag-plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.dark ? '#000' : '#fff'}
        onPress={() => setAddItemDialogVisible(true)}
      />
    </View>
  );

  const renderListReadyState = () => (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <DoodleBackground />
      <Card style={[styles.statusCard, { backgroundColor: theme.colors.surface }]} mode="elevated">
        <Card.Content>
          <View style={[styles.statusHeader, { justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="clipboard-list" size={24} color={theme.colors.primary} />
              <Text style={[styles.statusTitle, { color: theme.colors.onSurface }]}>Shopping List Ready</Text>
            </View>
            <IconButton 
              icon={helpVisible ? "chevron-up" : "information-outline"} 
              size={20} 
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setHelpVisible(!helpVisible);
              }}
            />
          </View>
          {helpVisible && (
            <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>{getStateDescription()}</Text>
          )}
        </Card.Content>
      </Card>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Card style={styles.listCard}>
          <Card.Content>
            <Title>Shopping List ({shoppingList.length} items)</Title>
            {renderGroupedItems(shoppingList)}
          </Card.Content>
        </Card>
      </ScrollView>

      <View style={styles.actionButtons}>
        <Button
          mode="contained"
          onPress={handleStartShopping}
          style={styles.mainActionButton}
          contentStyle={styles.actionButtonContent}
        >
          Start Shopping
        </Button>
        <Button
          mode="outlined"
          onPress={handleCancelShopping}
          style={styles.secondaryActionButtonFull}
        >
          Cancel
        </Button>
      </View>
      <FAB
        icon="tag-plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.dark ? '#000' : '#fff'}
        onPress={() => setAddItemDialogVisible(true)}
      />
    </View>
  );

  const renderShoppingState = () => {
    const checkedItems = getCheckedItems();
    const uncheckedItems = getUncheckedItems();

    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <DoodleBackground />
        <Card style={[styles.statusCard, { backgroundColor: theme.colors.surface }]} mode="elevated">
          <Card.Content>
            <View style={[styles.statusHeader, { justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="cart" size={24} color={theme.colors.primary} />
                <Text style={[styles.statusTitle, { color: theme.colors.onSurface }]}>Shopping in Progress</Text>
              </View>
              <IconButton 
                icon={helpVisible ? "chevron-up" : "information-outline"} 
                size={20} 
                onPress={() => {
                   LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                   setHelpVisible(!helpVisible);
                }}
              />
            </View>
            {helpVisible && (
               <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>{getStateDescription()}</Text>
            )}
            <View style={styles.progressInfo}>
              <Text style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                Progress: {checkedItems.length} of {shoppingList.length} items
              </Text>
            </View>
          </Card.Content>
        </Card>

        <ScrollView 
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {uncheckedItems.length > 0 && (
            <Card style={styles.listCard}>
              <Card.Content>
                <Title>To Buy ({uncheckedItems.length} items)</Title>
                {renderGroupedItems(uncheckedItems)}
              </Card.Content>
            </Card>
          )}

          {checkedItems.length > 0 && (
            <Card style={styles.listCard}>
              <Card.Content>
                <Title>In Cart ({checkedItems.length} items)</Title>
                {renderGroupedItems(checkedItems)}
              </Card.Content>
            </Card>
          )}
        </ScrollView>

        <View style={styles.actionButtons}>
          <Button
            mode="contained"
            onPress={handleCompleteAndRestore}
            style={styles.mainActionButton}
            contentStyle={styles.actionButtonContent}
            disabled={checkedItems.length === 0}
          >
            Complete Shopping
          </Button>
          
          <View style={styles.secondaryActions}>
            <Button
              mode="text"
              onPress={handleOpenIgnoredItemsDialog}
              style={styles.secondaryActionButton}
              textColor={theme.colors.secondary}
              labelStyle={{ fontSize: 11 }}
            >
              Hidden
            </Button>
            <Button
              mode="text"
              onPress={handleOpenSearchItemsDialog}
              style={styles.secondaryActionButton}
              textColor={theme.colors.primary}
              labelStyle={{ fontSize: 11 }}
              icon={searchLoading ? undefined : "magnify"}
              loading={searchLoading}
              disabled={searchLoading}
            >
              Search
            </Button>
            <Button
              mode="outlined"
              onPress={handleCancelShopping}
              style={styles.secondaryActionButton}
              labelStyle={{ fontSize: 11 }}
            >
              Cancel
            </Button>
          </View>
        </View>
      <FAB
        icon="tag-plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.dark ? '#000' : '#fff'}
        onPress={() => setAddItemDialogVisible(true)}
      />
    </View>
  );
};

  const renderAddItemDialog = () => (
    <Portal>
      <Dialog visible={addItemDialogVisible} onDismiss={() => setAddItemDialogVisible(false)}>
        <Dialog.Title>Add Misc Item</Dialog.Title>
        <Dialog.Content>
           <AddShoppingItemInput 
              initialValue={newItemName}
              suggestions={miscSuggestions}
              onAdd={handleAddMiscItem}
              onCancel={() => setAddItemDialogVisible(false)}
           />
        </Dialog.Content>
      </Dialog>
    </Portal>
  );

const AddShoppingItemInput = ({ initialValue, onAdd, onCancel, suggestions }: { 
  initialValue: string, 
  onAdd: (name: string) => void, 
  onCancel: () => void,
  suggestions: string[]
}) => {
  const theme = useTheme();
  const [isValid, setIsValid] = useState(!!initialValue.trim());
  const [text, setText] = useState(initialValue);

  const handleChangeText = (val: string) => {
    setText(val);
    setIsValid(!!val.trim());
  };

  const handleAdd = () => {
    if (text.trim()) {
      onAdd(text.trim());
    }
  };

  return (
    <>
      <TextInput
        label="Item Name"
        value={text}
        onChangeText={handleChangeText}
        mode="outlined"
        autoFocus
        onSubmitEditing={handleAdd}
        returnKeyType="done"
      />
      
      {suggestions.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 12, marginBottom: 8, opacity: 0.7, fontWeight: '600', color: theme.colors.onSurface }}>Recent items:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {suggestions.map((suggestion, index) => (
              <Button
                key={index}
                mode="outlined"
                compact
                onPress={() => handleChangeText(suggestion)}
                style={{
                   marginRight: 6,
                   borderRadius: 8,
                   backgroundColor: theme.colors.primary + '10',
                   borderColor: theme.colors.primary + '30'
                }}
              >
                {suggestion}
              </Button>
            ))}
          </ScrollView>
        </View>
      )}
      
      <Dialog.Actions style={{ paddingHorizontal: 0, marginTop: 16 }}>
        <Button onPress={onCancel}>Cancel</Button>
        <Button mode="contained" onPress={handleAdd} disabled={!isValid} style={{ borderRadius: 12 }}>Add Item</Button>
      </Dialog.Actions>
    </>
  );
};

  const renderIgnoredItemsDialog = () => (
    <Portal>
      <Dialog visible={ignoredItemsDialogVisible} onDismiss={() => setIgnoredItemsDialogVisible(false)} style={{ maxHeight: '80%' }}>
        <Dialog.Title>Add from Hidden Items</Dialog.Title>
        <Dialog.Content>
          {ignoredItems.length > 0 ? (
             <ScrollView style={{ maxHeight: 300 }}>
             {ignoredItems.map(item => (
               <List.Item
                 key={item.id}
                 title={item.name}
                 description={`${Math.round(item.quantity * 100)}% stock`}
                 left={() => (
                   <Checkbox
                     status={selectedIgnoredIds.has(item.id) ? 'checked' : 'unchecked'}
                     onPress={() => toggleIgnoredItemSelection(item.id)}
                     color={theme.colors.primary}
                     uncheckedColor={theme.colors.onSurfaceVariant}
                   />
                 )}
                 onPress={() => toggleIgnoredItemSelection(item.id)}
               />
             ))}
           </ScrollView>
          ) : (
            <Text style={{ color: theme.colors.onSurfaceVariant }}>No ignored items available to add.</Text>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setIgnoredItemsDialogVisible(false)}>Cancel</Button>
          <Button onPress={handleAddSelectedIgnoredItems} disabled={selectedIgnoredIds.size === 0}>Add Selected</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  const renderConfirmDialogs = () => (
    <Portal>
      {renderIgnoredItemsDialog()}
      
      {/* Search and Add Dialog */}
      <Portal>
        <Dialog visible={searchItemsDialogVisible} onDismiss={() => setSearchItemsDialogVisible(false)} style={{ maxHeight: '80%' }}>
          <Dialog.Content>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{maxHeight:'100%'}}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title>Search & Add Item</Title>
                <IconButton icon="close" size={24} onPress={() => setSearchItemsDialogVisible(false)} />
              </View>
              <TextInput
                label="Search items..."
                value={itemSearchQuery}
                onChangeText={(text) => {
                  setItemSearchQuery(text);
                  if (text.trim().length > 0) {
                    setIsSearchingItems(true);
                  }
                }}
                mode="outlined"
                style={{ marginBottom: 8 }}
                right={<TextInput.Icon icon="magnify" />}
                autoFocus
              />
              <ScrollView style={{ maxHeight: 300, flexShrink: 1 }} keyboardShouldPersistTaps="handled">
                {isSearchingItems ? (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  </View>
                ) : filteredAllItems.length > 0 ? (
                  filteredAllItems.map(item => (
                    <List.Item
                      key={item.id}
                      title={item.name}
                      description={`${item.subcategory} • ${Math.round(item.quantity * 100)}% stock`}
                      onPress={() => handleAddAnyItem(item)}
                      right={() => <IconButton icon="plus-circle-outline" />}
                    />
                  ))
                ) : (
                  <Text style={{ textAlign: 'center', marginTop: 16, color: theme.colors.onSurfaceVariant }}>
                    No items found
                  </Text>
                )}
              </ScrollView>
            </KeyboardAvoidingView>
          </Dialog.Content>
          {/* Actions removed as Close is now in header */}
        </Dialog>
      </Portal>
      {/* Complete Shopping Dialog */}
      <Dialog visible={completeConfirmVisible} onDismiss={() => setCompleteConfirmVisible(false)}>
        <Dialog.Title>Complete Shopping</Dialog.Title>
        <Dialog.Content>
          <Text style={{ color: theme.colors.onSurface }}>This will mark checked items as restocked and clear your shopping list. Continue?</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setCompleteConfirmVisible(false)}>Cancel</Button>
          <Button onPress={onConfirmComplete}>Complete</Button>
        </Dialog.Actions>
      </Dialog>

      {/* Cancel Shopping Dialog */}
      <Dialog visible={cancelConfirmVisible} onDismiss={() => setCancelConfirmVisible(false)}>
        <Dialog.Title>Cancel Shopping</Dialog.Title>
        <Dialog.Content>
          <Text style={{ color: theme.colors.onSurface }}>This will clear your shopping list. Are you sure?</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setCancelConfirmVisible(false)}>No</Button>
          <Button onPress={onConfirmCancel} textColor={theme.colors.error}>Yes, Cancel</Button>
        </Dialog.Actions>
      </Dialog>

      {/* Empty List Alert Dialog */}
      <Dialog visible={emptyListAlertVisible} onDismiss={() => setEmptyListAlertVisible(false)}>
        <Dialog.Title>Empty List</Dialog.Title>
        <Dialog.Content>
          <Text style={{ color: theme.colors.onSurface }}>Add some items to your shopping list before finalizing.</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setEmptyListAlertVisible(false)}>OK</Button>
        </Dialog.Actions>
      </Dialog>

      {/* Invalid Input Alert Dialog */}
      <Dialog visible={invalidInputAlertVisible} onDismiss={() => setInvalidInputAlertVisible(false)}>
        <Dialog.Title>Invalid Input</Dialog.Title>
        <Dialog.Content>
          <Text style={{ color: theme.colors.onSurface }}>Please enter an item name.</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setInvalidInputAlertVisible(false)}>OK</Button>
        </Dialog.Actions>
      </Dialog>

      {/* Inventory Updated Success Dialog */}
      <Dialog visible={showSuccessDialog} onDismiss={() => setShowSuccessDialog(false)} dismissable={false}>
        <Dialog.Title>Shopping Complete</Dialog.Title>
        <Dialog.Content>
          <Text style={{ color: theme.colors.onSurface }}>
            All purchased items have been restocked to 100% and updated in your inventory.
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setShowSuccessDialog(false)}>Great!</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  // Render based on current state
  // Render content based on current state
  const renderContent = () => {
    switch (shoppingState) {
      case ShoppingState.EMPTY:
        return renderEmptyState();
      case ShoppingState.GENERATING:
        return renderGeneratingState();
      case ShoppingState.LIST_READY:
        return renderListReadyState();
      case ShoppingState.SHOPPING:
        return renderShoppingState();
      default:
        return <View />;
    }
  };

  return (
    <>
      {renderContent()}
      {renderAddItemDialog()}
      {renderConfirmDialogs()}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: tabBarDims.height + tabBarDims.bottomOffset,
  },
  statusCard: {
    margin: sp.base,
    borderRadius: r.xxl,
    ...commonStyles.shadow,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusTitle: {
    marginLeft: sp.sm,
    fontSize: screen.isSmall ? fs.xl : fs.xxl,
    fontWeight: '800',
  },
  progressInfo: {
    marginTop: sp.sm,
    padding: sp.sm,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: r.md,
  },
  scrollView: {
    flex: 1,
  },
  listCard: {
    margin: sp.base,
    marginTop: 0,
    borderRadius: r.xxl,
    ...commonStyles.shadow,
  },
  listItem: {
    paddingVertical: 0,
    borderRadius: r.sm,
    marginVertical: 0,
  },
  // removed checkedItem and checkedText as we handle them inline for theme support
  actionButtons: {
    padding: sp.base,
    paddingTop: sp.sm,
    gap: sp.sm,
    backgroundColor: 'transparent',
  },
  mainActionButton: {
    borderRadius: r.lg,
    elevation: 2,
  },
  actionButtonContent: {
    paddingVertical: screen.isSmall ? 4 : 6,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: sp.sm,
  },
  secondaryActionButton: {
    flex: 1,
    borderRadius: r.lg,
  },
  secondaryActionButtonFull: {
    width: '100%',
    borderRadius: r.lg,
  },
  fab: {
    position: 'absolute',
    margin: screen.isSmall ? 12 : 16,
    right: 0,
    bottom: tabBarDims.height + tabBarDims.bottomOffset + 60,
    borderRadius: 28,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: screen.isSmall ? 24 : 32,
    paddingBottom: 100,
  },
  emptyTitle: {
    marginTop: sp.base,
    textAlign: 'center',
    fontWeight: '800',
    fontSize: screen.isSmall ? fs.xxl : fs.h2,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
    marginTop: 6,
    marginBottom: sp.xl,
    fontSize: fs.base,
    lineHeight: 22,
  },
  generateButton: {
    marginTop: sp.base,
    borderRadius: r.lg,
    paddingHorizontal: sp.xl,
  },
  emptyListState: {
    padding: sp.xl,
    alignItems: 'center',
  },
  suggestions: {
    marginTop: sp.base,
  },
  suggestionsTitle: {
    fontSize: fs.sm,
    marginBottom: 6,
    opacity: 0.7,
    fontWeight: '600',
  },
  suggestionChip: {
    marginRight: 6,
    borderRadius: r.md,
    borderWidth: 1,
  },
  categoryGroup: {
      marginBottom: 0,
  },
  categoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: sp.sm,
      paddingVertical: 6,
      marginTop: 6,
  },
  categoryTitle: {
      fontSize: fs.sm,
      fontWeight: '700',
      letterSpacing: 0.5,
  },
});

export default ShoppingScreen;