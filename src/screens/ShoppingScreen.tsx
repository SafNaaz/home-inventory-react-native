import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Animated,
  Dimensions,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  Searchbar,
  Snackbar,
  Divider,
  Surface,
} from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import { inventoryManager } from '../managers/InventoryManager';
import { settingsManager } from '../managers/SettingsManager';
import { tourManager } from '../managers/TourManager';
import { ShoppingListItem, ShoppingState, InventoryItem, InventoryCategory } from '../models/Types';
import { getCategoryConfig, getSubcategoryConfig } from '../constants/CategoryConfig';
import { getStockColor, getCategoryColor, commonStyles, getDialogTheme } from '../themes/AppTheme';
import DoodleBackground from '../components/DoodleBackground';
import BottomSheetDialog from '../components/BottomSheetDialog';
import { tabBar as tabBarDims, rs, fontSize as fs, spacing as sp, radius as r, screen } from '../themes/Responsive';

// Theme-based icon shades: slight variation per category type
const getCategoryIconColor = (category: string, isDark: boolean): string => {
  const cat = category.toLowerCase();
  if (isDark) {
    switch (cat) {
      case 'fridge': return '#94A3B8'; // Softer slate/blue instead of bright white
      case 'grocery': return '#CBD5E1'; // Neutral light slate instead of green
      case 'hygiene': return '#94A3B8';
      case 'personal care': case 'personalcare': return '#CBD5E1';
      default: return '#94A3B8';
    }
  } else {
    switch (cat) {
      case 'fridge': return '#1A1A1A';
      case 'grocery': return '#333333';
      case 'hygiene': return '#4D4D4D';
      case 'personal care': case 'personalcare': return '#666666';
      default: return '#444444';
    }
  }
};

// Get icon shade for a subcategory config based on its parent category
const getSubcategoryIconColor = (config: any, isDark: boolean): string => {
  return getCategoryIconColor(config.category, isDark);
};

const { height } = Dimensions.get('window');



const ShoppingScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const dynamicPadding = tabBarDims.height + (insets.bottom > 0 ? insets.bottom + rs(8) : tabBarDims.bottomOffset) + rs(24);
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

  // Loaders for opening dialogs
  const [isOpeningAdd, setIsOpeningAdd] = useState(false);
  const [isOpeningSearch, setIsOpeningSearch] = useState(false);

  useEffect(() => {
    // Load initial data
    loadShoppingData();

    // Set up listener for data changes
    const unsubscribe = inventoryManager.addListener(() => {
      loadShoppingData();
    });

    return unsubscribe;
  }, []);

  useFocusEffect(
    useCallback(() => {
      tourManager.onAction('SWITCHED_TO_SHOPPING');
    }, [])
  );

  const loadShoppingData = () => {
    const items = inventoryManager.getShoppingList();
    const state = inventoryManager.getShoppingState();
    const suggestions = settingsManager.getMiscItemSuggestions();
    
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShoppingList(items);
    setShoppingState(state);
    setMiscSuggestions(suggestions);
  };
  
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (addItemDialogVisible) {
          setAddItemDialogVisible(false);
          return true;
        }
        if (ignoredItemsDialogVisible) {
          setIgnoredItemsDialogVisible(false);
          return true;
        }
        if (searchItemsDialogVisible) {
          setSearchItemsDialogVisible(false);
          return true;
        }
        if (completeConfirmVisible) {
          setCompleteConfirmVisible(false);
          return true;
        }
        if (cancelConfirmVisible) {
          setCancelConfirmVisible(false);
          return true;
        }
        if (emptyListAlertVisible) {
          setEmptyListAlertVisible(false);
          return true;
        }
        if (invalidInputAlertVisible) {
          setInvalidInputAlertVisible(false);
          return true;
        }
        if (showSuccessDialog) {
          setShowSuccessDialog(false);
          return true;
        }
        return false;
      };

      const handler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => handler.remove();
    }, [addItemDialogVisible, ignoredItemsDialogVisible, searchItemsDialogVisible, completeConfirmVisible, cancelConfirmVisible, emptyListAlertVisible, invalidInputAlertVisible, showSuccessDialog])
  );

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
    tourManager.onAction('FINALIZED_LIST');
  };

  const handleStartShopping = async () => {
    await inventoryManager.startShopping();
    tourManager.onAction('STARTED_SHOPPING');
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
      tourManager.onAction('FINISHED_SHOPPING');

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
    setIsOpeningSearch(true);
    setTimeout(() => {
        setSearchLoading(true);
        const all = inventoryManager.getInventoryItems();
        const available = all.filter(item => 
          !shoppingList.some(sl => sl.inventoryItemId === item.id)
        );
        setAllItems(available);
        setFilteredAllItems(available);
        setItemSearchQuery('');
        setSearchItemsDialogVisible(true);
        
        // Wait for dialog animation to start before hiding the loader
        setTimeout(() => {
          setIsOpeningSearch(false);
          setSearchLoading(false);
        }, 300);
    }, 50);
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
                        color={subConfig ? getSubcategoryIconColor(subConfig, theme.dark) : theme.colors.onSurfaceVariant}
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
          <Surface style={[styles.categoryCard, { backgroundColor: theme.colors.surface, padding: 0 }]} elevation={theme.dark ? 1 : 2}>
              {categories.map((catKey, i) => {
                  const categoryItems = groups[catKey];
                  const isMisc = catKey === 'Misc';
                  const config = !isMisc ? getCategoryConfig(catKey as InventoryCategory) : null;
                  
                  return (
                      <View key={catKey}>
                          <View style={[styles.categoryHeader, { borderTopWidth: i === 0 ? 0 : 1, borderTopColor: theme.colors.outlineVariant }]}>
                              <Icon 
                                name={(config ? config.icon : 'tag-multiple') as any} 
                                size={20} 
                                color={config ? getCategoryIconColor(catKey, theme.dark) : theme.colors.onSurfaceVariant} 
                                style={{ marginRight: 8 }}
                              />
                              <Text style={[styles.categoryTitle, { color: config ? getCategoryIconColor(catKey, theme.dark) : theme.colors.onSurfaceVariant }]}>
                                  {isMisc ? 'Miscellaneous' : catKey.charAt(0).toUpperCase() + catKey.slice(1).toLowerCase().replace('_', ' ')}
                              </Text>
                          </View>
                          {categoryItems.map((item, idx) => (
                            <React.Fragment key={item.id}>
                              {renderShoppingListItem(item)}
                              {idx < categoryItems.length - 1 && <Divider style={{ marginHorizontal: sp.md, opacity: 0.5 }} />}
                            </React.Fragment>
                          ))}
                      </View>
                  );
              })}
          </Surface>
      );
  };

  const renderEmptyState = () => (
    <View style={[styles.emptyState, { paddingBottom: dynamicPadding + rs(20) }]}>
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
      <View style={[styles.secondaryActions, { backgroundColor: theme.colors.surface, padding: 6, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.outlineVariant, marginTop: 16, justifyContent: 'center' }]}>
        <IconButton
          icon="sleep"
          iconColor={theme.colors.onSurface}
          size={24}
          onPress={handleOpenIgnoredItemsDialog}
          mode="contained-tonal"
          containerColor={theme.colors.secondaryContainer}
        />
        {isOpeningSearch ? (
          <ActivityIndicator size={24} color={theme.colors.onSurface} style={{ margin: 12 }} />
        ) : (
          <IconButton
            icon="magnify"
            iconColor={theme.colors.onSurface}
            size={24}
            onPress={handleOpenSearchItemsDialog}
            mode="contained-tonal"
            containerColor={theme.colors.secondaryContainer}
          />
        )}
        <IconButton
          icon="tag-plus"
          iconColor={theme.colors.onSurface}
          size={24}
          onPress={() => setAddItemDialogVisible(true)}
          mode="contained-tonal"
          containerColor={theme.colors.secondaryContainer}
        />
      </View>
    </View>
  );

  const renderGeneratingState = () => (
    <View style={[styles.container, { paddingBottom: dynamicPadding }]}>
      <DoodleBackground />
      <Card style={[styles.statusCard, { backgroundColor: theme.colors.surface }]} mode="elevated">
        <Card.Content style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
          <View style={[styles.statusHeader, { justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="cart-plus" size={18} color={theme.colors.primary} />
              <Text style={[styles.statusTitle, { color: theme.colors.onSurface }]}>Editing Shopping List</Text>
            </View>
            <IconButton 
              icon={helpVisible ? "chevron-up" : "information-outline"} 
              size={18} 
              style={{ margin: 0, width: 32, height: 32 }}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setHelpVisible(!helpVisible);
              }}
            />
          </View>
          {helpVisible && (
            <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, fontSize: 13 }}>{getStateDescription()}</Text>
          )}
        </Card.Content>
      </Card>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {shoppingList.length > 0 ? (
          <View style={styles.listContainer}>
            {renderGroupedItems(shoppingList)}
          </View>
        ) : (
          <View style={[styles.emptyListState]}>
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
        
        <View style={[styles.secondaryActions, { backgroundColor: theme.colors.surface, padding: 6, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.outlineVariant, alignItems: 'center' }]}>
          <IconButton
            icon="sleep"
            iconColor={theme.colors.onSurface}
            size={22}
            onPress={handleOpenIgnoredItemsDialog}
            mode="contained-tonal"
            containerColor={theme.colors.secondaryContainer}
          />
          {isOpeningSearch ? (
            <ActivityIndicator size={22} color={theme.colors.onSurface} style={{ margin: 12 }} />
          ) : (
            <IconButton
              icon="magnify"
              iconColor={theme.colors.onSurface}
              size={22}
              onPress={handleOpenSearchItemsDialog}
              mode="contained-tonal"
              containerColor={theme.colors.secondaryContainer}
            />
          )}
          <IconButton
            icon="tag-plus"
            iconColor={theme.colors.onSurface}
            size={22}
            onPress={() => setAddItemDialogVisible(true)}
            mode="contained-tonal"
            containerColor={theme.colors.secondaryContainer}
          />
          <Button
            mode="outlined"
            onPress={handleCancelShopping}
            style={[styles.secondaryActionButton, { marginLeft: 8 }]}
            labelStyle={{ fontSize: 13 }}
          >
            Cancel
          </Button>
        </View>
      </View>
    </View>
  );

  const renderListReadyState = () => (
    <View style={[styles.container, { paddingBottom: dynamicPadding }]}>
      <DoodleBackground />
      <Card style={[styles.statusCard, { backgroundColor: theme.colors.surface }]} mode="elevated">
        <Card.Content style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
          <View style={[styles.statusHeader, { justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="clipboard-list" size={18} color={theme.colors.primary} />
              <Text style={[styles.statusTitle, { color: theme.colors.onSurface }]}>Shopping List Ready</Text>
            </View>
            <IconButton 
              icon={helpVisible ? "chevron-up" : "information-outline"} 
              size={18} 
              style={{ margin: 0, width: 32, height: 32 }}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setHelpVisible(!helpVisible);
              }}
            />
          </View>
          {helpVisible && (
            <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, fontSize: 13 }}>{getStateDescription()}</Text>
          )}
        </Card.Content>
      </Card>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.listContainer}>
          {renderGroupedItems(shoppingList)}
        </View>
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
    </View>
  );

  const renderShoppingState = () => {
    const checkedItems = getCheckedItems();
    const uncheckedItems = getUncheckedItems();

    return (
      <View style={[styles.container, { paddingBottom: dynamicPadding }]}>
        <DoodleBackground />
        <Card style={[styles.statusCard, { backgroundColor: theme.colors.surface }]} mode="elevated">
          <Card.Content style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
            <View style={[styles.statusHeader, { justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="cart" size={18} color={theme.colors.primary} />
                <Text style={[styles.statusTitle, { color: theme.colors.onSurface }]}>Shopping in Progress</Text>
              </View>
              <IconButton 
                icon={helpVisible ? "chevron-up" : "information-outline"} 
                size={18} 
                style={{ margin: 0, width: 32, height: 32 }}
                onPress={() => {
                   LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                   setHelpVisible(!helpVisible);
                }}
              />
            </View>
            {helpVisible && (
               <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, fontSize: 13 }}>{getStateDescription()}</Text>
            )}
            <View style={[styles.progressInfo, { marginTop: 4, padding: 6 }]}>
              <Text style={{ color: theme.colors.onSurface, fontWeight: '600', fontSize: 13 }}>
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
            <View style={styles.listContainer}>
              <Title style={styles.sectionTitle}>To Buy ({uncheckedItems.length} items)</Title>
              {renderGroupedItems(uncheckedItems)}
            </View>
          )}

          {checkedItems.length > 0 && (
            <View style={styles.listContainer}>
              <Title style={styles.sectionTitle}>In Cart ({checkedItems.length} items)</Title>
              {renderGroupedItems(checkedItems)}
            </View>
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
          
          <View style={[styles.secondaryActions, { backgroundColor: theme.colors.surface, padding: 6, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.outlineVariant, alignItems: 'center' }]}>
            <IconButton
              icon="sleep"
              iconColor={theme.colors.onSurface}
              size={22}
              onPress={handleOpenIgnoredItemsDialog}
              mode="contained-tonal"
              containerColor={theme.colors.secondaryContainer}
            />
            {isOpeningSearch ? (
              <ActivityIndicator size={22} color={theme.colors.onSurface} style={{ margin: 12 }} />
            ) : (
              <IconButton
                icon="magnify"
                iconColor={theme.colors.onSurface}
                size={22}
                onPress={handleOpenSearchItemsDialog}
                mode="contained-tonal"
                containerColor={theme.colors.secondaryContainer}
              />
            )}
            <IconButton
              icon="tag-plus"
              iconColor={theme.colors.onSurface}
              size={22}
              onPress={() => setAddItemDialogVisible(true)}
              mode="contained-tonal"
              containerColor={theme.colors.secondaryContainer}
            />
            <Button
              mode="outlined"
              onPress={handleCancelShopping}
              style={[styles.secondaryActionButton, { marginLeft: 8 }]}
              labelStyle={{ fontSize: 13 }}
            >
              Cancel
            </Button>
          </View>
        </View>
    </View>
  );
};

  const renderAddItemDialog = () => (
    <BottomSheetDialog 
      visible={addItemDialogVisible} 
      onDismiss={() => setAddItemDialogVisible(false)}
      title="Add Misc Item"
      theme={theme}
      insets={insets}
    >
        <AddShoppingItemInput 
          initialValue={newItemName}
          suggestions={miscSuggestions}
          onAdd={handleAddMiscItem}
          onCancel={() => setAddItemDialogVisible(false)}
        />
    </BottomSheetDialog>
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
    <BottomSheetDialog
      visible={ignoredItemsDialogVisible}
      onDismiss={() => setIgnoredItemsDialogVisible(false)}
      title="Hidden Items"
      theme={theme}
      insets={insets}
      maxHeight="80%"
    >
      <ScrollView style={{ maxHeight: 300 }}>
        {ignoredItems.length > 0 ? (
           ignoredItems.map(item => (
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
           ))
        ) : (
          <Text style={{ textAlign: 'center', marginVertical: 20, opacity: 0.6 }}>No hidden items</Text>
        )}
      </ScrollView>
       <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
          <Button onPress={() => setIgnoredItemsDialogVisible(false)}>Cancel</Button>
          <Button mode="contained" onPress={handleAddSelectedIgnoredItems} disabled={selectedIgnoredIds.size === 0} style={{ marginLeft: 8, borderRadius: 12 }}>
            Add Selected
          </Button>
        </View>
    </BottomSheetDialog>
  );

  const renderSearchInventoryDialog = () => (
    <BottomSheetDialog
      visible={searchItemsDialogVisible}
      onDismiss={() => setSearchItemsDialogVisible(false)}
      title="Search & Add Item"
      theme={theme}
      insets={insets}
      maxHeight="85%"
    >
      <Searchbar
        placeholder="Search items..."
        value={itemSearchQuery}
        onChangeText={setItemSearchQuery}
        mode="bar"
        style={{ marginBottom: 12, backgroundColor: theme.dark ? theme.colors.elevation?.level3 : theme.colors.surfaceVariant }}
        elevation={0}
      />
      <ScrollView style={{ maxHeight: 300 }} keyboardShouldPersistTaps="handled">
        {isSearchingItems ? (
          <ActivityIndicator style={{ margin: 20 }} />
        ) : (
          filteredAllItems.map(item => (
            <List.Item
              key={item.id}
              title={item.name}
              description={item.subcategory}
              onPress={() => handleAddAnyItem(item)}
              left={() => <List.Icon icon="package-variant" color={theme.colors.onSurfaceVariant} />}
              right={() => <IconButton icon="plus-circle-outline" />}
            />
          ))
        )}
        {!isSearchingItems && filteredAllItems.length === 0 && (
          <Text style={{ textAlign: 'center', marginVertical: 32, opacity: 0.6 }}>No items found</Text>
        )}
      </ScrollView>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
          <Button onPress={() => setSearchItemsDialogVisible(false)}>Close</Button>
      </View>
    </BottomSheetDialog>
  );

  const renderConfirmDialogs = () => (
    <Portal>
      {/* Cancel Shopping Dialog */}
      <Dialog theme={getDialogTheme(theme.dark)} visible={cancelConfirmVisible} onDismiss={() => setCancelConfirmVisible(false)} style={{ borderRadius: 28 }}>
        <Dialog.Title>Cancel Shopping</Dialog.Title>
        <Dialog.Content>
          <Text style={{ color: theme.colors.onSurface }}>This will clear your shopping list. Are you sure?</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setCancelConfirmVisible(false)}>No</Button>
          <Button onPress={onConfirmCancel} textColor={theme.colors.error}>Yes, Cancel</Button>
        </Dialog.Actions>
      </Dialog>

      {/* Complete Confirm Dialog */}
      <Dialog theme={getDialogTheme(theme.dark)} visible={completeConfirmVisible} onDismiss={() => setCompleteConfirmVisible(false)} style={{ borderRadius: 28 }}>
        <Dialog.Title>Complete Shopping</Dialog.Title>
        <Dialog.Content>
          <Text style={{ color: theme.colors.onSurface }}>Are you sure you want to finish shopping? This will update your inventory.</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setCompleteConfirmVisible(false)}>Cancel</Button>
          <Button onPress={onConfirmComplete} mode="contained">Finish</Button>
        </Dialog.Actions>
      </Dialog>

      {/* Success Dialog */}
      <Dialog theme={getDialogTheme(theme.dark)} visible={showSuccessDialog} onDismiss={() => setShowSuccessDialog(false)} style={{ borderRadius: 28 }}>
        <Dialog.Title>Shopping Complete!</Dialog.Title>
        <Dialog.Content>
          <Text style={{ color: theme.colors.onSurface }}>
            All purchased items have been restocked in your inventory.
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setShowSuccessDialog(false)}>Great!</Button>
        </Dialog.Actions>
      </Dialog>

      {/* Empty List Alert Dialog */}
      <Dialog theme={getDialogTheme(theme.dark)} visible={emptyListAlertVisible} onDismiss={() => setEmptyListAlertVisible(false)} style={{ borderRadius: 28 }}>
        <Dialog.Title>Empty List</Dialog.Title>
        <Dialog.Content>
          <Text style={{ color: theme.colors.onSurface }}>Add some items to your shopping list before finalizing.</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setEmptyListAlertVisible(false)}>OK</Button>
        </Dialog.Actions>
      </Dialog>

      {/* Invalid Input Alert Dialog */}
      <Dialog theme={getDialogTheme(theme.dark)} visible={invalidInputAlertVisible} onDismiss={() => setInvalidInputAlertVisible(false)} style={{ borderRadius: 28 }}>
        <Dialog.Title>Invalid Input</Dialog.Title>
        <Dialog.Content>
          <Text style={{ color: theme.colors.onSurface }}>Please enter an item name.</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setInvalidInputAlertVisible(false)}>OK</Button>
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
      {renderSearchInventoryDialog()}
      {renderConfirmDialogs()}
      {renderIgnoredItemsDialog()}
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
    marginHorizontal: sp.base,
    marginVertical: sp.xs,
    borderRadius: r.xl,
    ...commonStyles.shadow,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  statusTitle: {
    marginLeft: 6,
    fontSize: fs.md,
    fontWeight: '700',
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
    bottom: tabBarDims.height + tabBarDims.bottomOffset + 125,
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
  categoryCard: {
    margin: sp.md,
    marginBottom: sp.sm,
    padding: sp.sm,
    borderRadius: r.lg,
    ...commonStyles.shadow,
  },
  sectionContainer: {
    marginBottom: sp.lg,
  },
  listContainer: {
    paddingBottom: 20,
  },
  sectionTitle: {
    marginLeft: sp.md,
    marginTop: sp.md,
    marginBottom: sp.xs,
    fontSize: fs.lg,
    fontWeight: 'bold',
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
      paddingHorizontal: sp.base,
      paddingVertical: 12,
      backgroundColor: 'rgba(0,0,0,0.015)',
  },
  categoryTitle: {
      fontSize: fs.sm,
      fontWeight: '700',
      letterSpacing: 0.5,
  },
});

export default ShoppingScreen;