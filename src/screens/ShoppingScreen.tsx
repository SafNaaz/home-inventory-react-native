import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
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

import { inventoryManager } from '../managers/InventoryManager';
import { settingsManager } from '../managers/SettingsManager';
import { ShoppingListItem, ShoppingState, InventoryItem } from '../models/Types';
import { commonStyles } from '../themes/AppTheme';
import DoodleBackground from '../components/DoodleBackground';

const ShoppingScreen: React.FC = () => {
  const theme = useTheme();
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
    setCompleteConfirmVisible(false);
    await inventoryManager.completeAndRestoreShopping();
    setShowSuccessDialog(true);
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

  const handleAddMiscItem = async () => {
    const trimmedName = newItemName.trim();
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
    
    // If we were empty, we are now generating.
    // The listener will update the state, but we can also force a refresh if needed.
    // InventoryManager.addIgnoredItemsToShoppingList handles state update to GENERATING if it was EMPTY.
    // However, if we are in empty state, we might need to handle the transition UX if not auto-handled.
    // The listener loadShoppingData should handle it.
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

  const renderShoppingListItem = (item: ShoppingListItem) => {
    const canToggle = shoppingState === ShoppingState.SHOPPING;
    const canRemove = shoppingState === ShoppingState.GENERATING;

    return (
      <List.Item
        key={item.id}
        title={item.name}
        description={item.isTemporary ? 'Misc Item' : 'Inventory Item'}
        left={() => canToggle ? (
          <Checkbox
            status={item.isChecked ? 'checked' : 'unchecked'}
            onPress={() => canToggle && handleToggleItem(item)}
          />
        ) : (
          <List.Icon icon={item.isTemporary ? "tag-outline" : "package-variant-closed"} />
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
        onPress={() => canToggle && handleToggleItem(item)}
        style={[
          styles.listItem,
          item.isChecked && styles.checkedItem,
        ]}
        titleStyle={[
          item.isChecked && styles.checkedText,
        ]}
      />
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
        style={{ marginTop: 16 }}
        textColor={theme.colors.secondary}
      >
        Add Ignored Items
      </Button>
    </View>
  );

  const renderGeneratingState = () => (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <DoodleBackground />
      <Card style={[styles.statusCard, { backgroundColor: theme.colors.surface }]} mode="elevated">
        <Card.Content>
          <View style={styles.statusHeader}>
            <Icon name="cart-plus" size={24} color={theme.colors.primary} />
            <Text style={[styles.statusTitle, { color: theme.colors.onSurface }]}>Editing Shopping List</Text>
          </View>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>{getStateDescription()}</Text>
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
              {shoppingList.map(renderShoppingListItem)}
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
          mode="text"
          onPress={handleOpenIgnoredItemsDialog}
          style={styles.actionButton}
          textColor={theme.colors.secondary}
        >
          Add Ignored
        </Button>
        <Button
          mode="outlined"
          onPress={handleCancelShopping}
          style={styles.actionButton}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleFinalizeList}
          style={styles.actionButton}
          disabled={shoppingList.length === 0}
        >
          Finalize List
        </Button>
      </View>

      <FAB
        icon="plus"
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
          <View style={styles.statusHeader}>
            <Icon name="clipboard-list" size={24} color={theme.colors.primary} />
            <Text style={[styles.statusTitle, { color: theme.colors.onSurface }]}>Shopping List Ready</Text>
          </View>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>{getStateDescription()}</Text>
        </Card.Content>
      </Card>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Card style={styles.listCard}>
          <Card.Content>
            <Title>Shopping List ({shoppingList.length} items)</Title>
            {shoppingList.map(renderShoppingListItem)}
          </Card.Content>
        </Card>
      </ScrollView>

      <View style={styles.actionButtons}>
        <Button
          mode="outlined"
          onPress={handleCancelShopping}
          style={styles.actionButton}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleStartShopping}
          style={styles.actionButton}
        >
          Start Shopping
        </Button>
      </View>
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
            <View style={styles.statusHeader}>
              <Icon name="cart" size={24} color={theme.colors.primary} />
              <Text style={[styles.statusTitle, { color: theme.colors.onSurface }]}>Shopping in Progress</Text>
            </View>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>{getStateDescription()}</Text>
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
                {uncheckedItems.map(renderShoppingListItem)}
              </Card.Content>
            </Card>
          )}

          {checkedItems.length > 0 && (
            <Card style={styles.listCard}>
              <Card.Content>
                <Title>In Cart ({checkedItems.length} items)</Title>
                {checkedItems.map(renderShoppingListItem)}
              </Card.Content>
            </Card>
          )}
        </ScrollView>

        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            onPress={handleCancelShopping}
            style={styles.actionButton}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleCompleteAndRestore}
            style={styles.actionButton}
            disabled={checkedItems.length === 0}
          >
            Complete Shopping
          </Button>
        </View>
        <Button
          mode="text"
          onPress={handleOpenIgnoredItemsDialog}
          style={{ marginBottom: 16, marginHorizontal: 16 }}
          textColor={theme.colors.secondary}
        >
          Add Ignored Items
        </Button>
      </View>
    );
  };

  const renderAddItemDialog = () => (
    <Portal>
      <Dialog visible={addItemDialogVisible} onDismiss={() => setAddItemDialogVisible(false)}>
        <Dialog.Title>Add Misc Item</Dialog.Title>
        <Dialog.Content>
          <TextInput
            label="Item Name"
            value={newItemName}
            onChangeText={setNewItemName}
            mode="outlined"
            autoFocus
            onSubmitEditing={handleAddMiscItem}
            returnKeyType="done"
          />
          
          {miscSuggestions.length > 0 && (
            <View style={styles.suggestions}>
              <Text style={[styles.suggestionsTitle, { color: theme.colors.onSurface }]}>Recent items:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {miscSuggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    mode="outlined"
                    compact
                    onPress={() => handleSuggestionPress(suggestion)}
                    style={[
                      styles.suggestionChip, 
                      { 
                        backgroundColor: theme.colors.primary + '15',
                        borderColor: theme.colors.primary + '30'
                      }
                    ]}
                  >
                    {suggestion}
                  </Button>
                ))}
              </ScrollView>
            </View>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setAddItemDialogVisible(false)}>Cancel</Button>
          <Button 
            mode="contained" 
            onPress={handleAddMiscItem}
            style={{ borderRadius: 12 }}
          >
            Add Item
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  const renderIgnoredItemsDialog = () => (
    <Portal>
      <Dialog visible={ignoredItemsDialogVisible} onDismiss={() => setIgnoredItemsDialogVisible(false)} style={{ maxHeight: '80%' }}>
        <Dialog.Title>Add Ignored Items</Dialog.Title>
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
      <Dialog visible={showSuccessDialog} onDismiss={() => setShowSuccessDialog(false)}>
        <Dialog.Title>Inventory Updated</Dialog.Title>
        <Dialog.Content>
          <Text style={{ color: theme.colors.onSurface }}>Your inventory has been successfully updated with the purchased items.</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setShowSuccessDialog(false)}>Great!</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  // Render based on current state
  if (shoppingState === ShoppingState.EMPTY) {
    return (
      <>
        {renderEmptyState()}
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
  } else if (shoppingState === ShoppingState.GENERATING) {
    return (
      <>
        {renderGeneratingState()}
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
  } else if (shoppingState === ShoppingState.LIST_READY) {
    return (
      <>
        {renderListReadyState()}
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
  } else if (shoppingState === ShoppingState.SHOPPING) {
    return (
      <>
        {renderShoppingState()}
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
  }

  return <View />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 85, // Space for floating tab bar
  },
  statusCard: {
    margin: 16,
    borderRadius: 24,
    ...commonStyles.shadow,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    marginLeft: 12,
    fontSize: 20,
    fontWeight: '800',
  },
  progressInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 12,
  },
  scrollView: {
    flex: 1,
  },
  listCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 24,
    ...commonStyles.shadow,
  },
  listItem: {
    paddingVertical: 8,
    borderRadius: 16,
    marginVertical: 2,
  },
  checkedItem: {
    opacity: 0.5,
    backgroundColor: '#f1f5f9',
  },
  checkedText: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: 'transparent',
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 4,
  },
  fab: {
    position: 'absolute',
    margin: 20,
    right: 0,
    bottom: 150, // Above tab bar and action buttons
    borderRadius: 28,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    paddingBottom: 120,
  },
  emptyTitle: {
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 24,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
    marginTop: 8,
    marginBottom: 24,
    fontSize: 16,
    lineHeight: 24,
  },
  generateButton: {
    marginTop: 16,
    borderRadius: 16,
    paddingHorizontal: 24,
  },
  emptyListState: {
    padding: 32,
    alignItems: 'center',
  },
  suggestions: {
    marginTop: 16,
  },
  suggestionsTitle: {
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.7,
    fontWeight: '600',
  },
  suggestionChip: {
    marginRight: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
});

export default ShoppingScreen;