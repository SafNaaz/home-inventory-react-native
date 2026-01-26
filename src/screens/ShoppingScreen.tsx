import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
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
import { ShoppingListItem, ShoppingState } from '../models/Types';
import { commonStyles } from '../themes/AppTheme';

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
    setSnackbarMessage('Your inventory has been updated with purchased items.');
    setSnackbarVisible(true);
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
        left={() => (
          <Checkbox
            status={item.isChecked ? 'checked' : 'unchecked'}
            onPress={() => canToggle && handleToggleItem(item)}
            disabled={!canToggle}
          />
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
      <Icon name="cart-outline" size={64} color={theme.colors.onSurfaceVariant} />
      <Title style={[styles.emptyTitle, { color: theme.colors.onBackground }]}>No Shopping List</Title>
      <Paragraph style={[styles.emptyText, { color: theme.colors.onBackground }]}>
        Generate a shopping list based on your low stock items to get started.
      </Paragraph>
      <Button
        mode="contained"
        onPress={handleStartGenerating}
        style={styles.generateButton}
      >
        Generate Shopping List
      </Button>
    </View>
  );

  const renderGeneratingState = () => (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={styles.statusCard}>
        <Card.Content>
          <View style={styles.statusHeader}>
            <Icon name="cart-plus" size={24} color={theme.colors.primary} />
            <Title style={styles.statusTitle}>Editing Shopping List</Title>
          </View>
          <Paragraph>{getStateDescription()}</Paragraph>
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
        style={styles.fab}
        color={theme.dark ? '#000' : '#fff'}
        onPress={() => setAddItemDialogVisible(true)}
      />
    </View>
  );

  const renderListReadyState = () => (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={styles.statusCard}>
        <Card.Content>
          <View style={styles.statusHeader}>
            <Icon name="clipboard-list" size={24} color={theme.colors.primary} />
            <Title style={styles.statusTitle}>Shopping List Ready</Title>
          </View>
          <Paragraph>{getStateDescription()}</Paragraph>
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
        <Card style={styles.statusCard}>
          <Card.Content>
            <View style={styles.statusHeader}>
              <Icon name="cart" size={24} color={theme.colors.primary} />
              <Title style={styles.statusTitle}>Shopping in Progress</Title>
            </View>
            <Paragraph>{getStateDescription()}</Paragraph>
            <View style={styles.progressInfo}>
              <Text style={{ color: theme.colors.onSurface }}>Progress: {checkedItems.length} of {shoppingList.length} items</Text>
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
                    style={styles.suggestionChip}
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
          <Button onPress={handleAddMiscItem}>Add Item</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  const renderConfirmDialogs = () => (
    <Portal>
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
  },
  statusCard: {
    margin: commonStyles.spacing.md,
    borderRadius: commonStyles.borderRadius,
    ...commonStyles.shadow,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: commonStyles.spacing.sm,
  },
  statusTitle: {
    marginLeft: commonStyles.spacing.sm,
    fontSize: 18,
  },
  progressInfo: {
    marginTop: commonStyles.spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  listCard: {
    margin: commonStyles.spacing.md,
    marginTop: 0,
    borderRadius: commonStyles.borderRadius,
    ...commonStyles.shadow,
  },
  listItem: {
    paddingVertical: commonStyles.spacing.xs,
  },
  checkedItem: {
    opacity: 0.6,
  },
  checkedText: {
    textDecorationLine: 'line-through',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: commonStyles.spacing.md,
    gap: commonStyles.spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    margin: commonStyles.spacing.md,
    right: 0,
    bottom: 80, // Above action buttons
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: commonStyles.spacing.xl,
  },
  emptyTitle: {
    marginTop: commonStyles.spacing.md,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
    marginTop: commonStyles.spacing.sm,
    marginBottom: commonStyles.spacing.lg,
  },
  generateButton: {
    marginTop: commonStyles.spacing.md,
  },
  emptyListState: {
    padding: commonStyles.spacing.xl,
    alignItems: 'center',
  },
  suggestions: {
    marginTop: commonStyles.spacing.md,
  },
  suggestionsTitle: {
    fontSize: 14,
    marginBottom: commonStyles.spacing.sm,
    opacity: 0.7,
  },
  suggestionChip: {
    marginRight: commonStyles.spacing.sm,
  },
});

export default ShoppingScreen;