import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  FAB,
  IconButton,
  Text,
  useTheme,
  Button,
  Portal,
  Dialog,
  TextInput,
  ProgressBar,
} from 'react-native-paper';
import { settingsManager } from '../managers/SettingsManager';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { inventoryManager } from '../managers/InventoryManager';
import { InventoryItem, InventoryCategory, InventorySubcategory, ShoppingState } from '../models/Types';
import { CATEGORY_CONFIG, SUBCATEGORY_CONFIG, getAllCategories } from '../constants/CategoryConfig';
import { getStockColor, getCategoryColor, commonStyles } from '../themes/AppTheme';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 2 columns with padding

type NavigationState = 'home' | 'category' | 'subcategory';

interface NavigationContext {
  state: NavigationState;
  category?: InventoryCategory;
  subcategory?: InventorySubcategory;
}

const InventoryScreen: React.FC = () => {
  const theme = useTheme();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [navigation, setNavigation] = useState<NavigationContext>({ state: 'home' });
  const [showingAddDialog, setShowingAddDialog] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editedName, setEditedName] = useState('');

  useEffect(() => {
    loadInventoryData();

    const unsubscribe = inventoryManager.addListener(() => {
      loadInventoryData();
    });

    return unsubscribe;
  }, []);

  const loadInventoryData = () => {
    const items = inventoryManager.getInventoryItems();
    setInventoryItems(items);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    loadInventoryData();
    setRefreshing(false);
  };

  const getTotalItems = () => inventoryItems.length;
  
  const getLowStockCount = () => inventoryItems.filter(item => item.quantity <= 0.25).length;

  const getItemsForCategory = (category: InventoryCategory): InventoryItem[] => {
    return inventoryItems.filter(item => {
      const subcategoryConfig = SUBCATEGORY_CONFIG[item.subcategory];
      return subcategoryConfig.category === category;
    });
  };

  const getItemsForSubcategory = (subcategory: InventorySubcategory): InventoryItem[] => {
    return inventoryItems.filter(item => item.subcategory === subcategory);
  };

  const handleQuantityUpdate = async (item: InventoryItem, newQuantity: number) => {
    await inventoryManager.updateItemQuantity(item.id, newQuantity);
  };

  const handleDeleteItem = (item: InventoryItem) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => inventoryManager.removeItem(item.id),
        },
      ]
    );
  };

  const handleAddItem = async () => {
    if (!newItemName.trim() || !navigation.subcategory) return;
    
    await inventoryManager.addCustomItem(newItemName.trim(), navigation.subcategory);
    setNewItemName('');
    setShowingAddDialog(false);
  };

  const handleEditItem = async () => {
    if (!editingItem || !editedName.trim()) return;
    
    await inventoryManager.updateItemName(editingItem.id, editedName.trim());
    setEditingItem(null);
    setEditedName('');
  };

  const handleStartShopping = async () => {
    // Check if there's already an active shopping flow
    const currentState = inventoryManager.getShoppingState();
    
    if (currentState !== ShoppingState.EMPTY) {
      Alert.alert(
        'Start New Shopping Trip?',
        getShoppingStateMessage(currentState),
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue Current',
            onPress: () => {
              // Switch to shopping tab - would need navigation prop
              Alert.alert('Info', 'Switch to Shopping tab to continue current trip.');
            },
          },
          {
            text: 'Start New',
            style: 'destructive',
            onPress: async () => {
              await inventoryManager.cancelShopping();
              await inventoryManager.startGeneratingShoppingList();
              Alert.alert('Success', 'New shopping list started! Check the Shopping tab.');
            },
          },
        ]
      );
    } else {
      await inventoryManager.startGeneratingShoppingList();
      Alert.alert('Success', 'Shopping list generated! Check the Shopping tab.');
    }
  };

  const getShoppingStateMessage = (state: string): string => {
    switch (state) {
      case 'GENERATING':
        return "You're currently creating a shopping list. Would you like to continue with it or start fresh?";
      case 'LIST_READY':
        return "You have a shopping list ready to go. Would you like to continue with it or create a new one?";
      case 'SHOPPING':
        return "You're currently shopping! Would you like to continue your current trip or start a new shopping list?";
      default:
        return "You have an active shopping session. Continue or start new?";
    }
  };

  

  const renderStatsHeader = () => (
    <View style={[styles.statsHeader, { backgroundColor: theme.colors.surfaceVariant }]}>
      <View style={styles.statItem}>
        <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>Total Items</Text>
        <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>{getTotalItems()}</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>Low Stock</Text>
        <Text style={[
          styles.statValue,
          { color: getLowStockCount() > 0 ? theme.colors.error : theme.colors.primary }
        ]}>
          {getLowStockCount()}
        </Text>
      </View>
    </View>
  );

  const renderCategoryCard = (category: InventoryCategory) => {
    const config = CATEGORY_CONFIG[category];
    const items = getItemsForCategory(category);
    const lowStockCount = items.filter(item => item.quantity <= 0.25).length;

    return (
      <Card
        key={category}
        style={[styles.categoryCard, { width: cardWidth }]}
        onPress={() => setNavigation({ state: 'category', category })}
      >
        <Card.Content style={styles.categoryCardContent}>
          <Icon
            name={config.icon as any}
            size={50}
            color={getCategoryColor(category, theme.dark)}
            style={styles.categoryIcon}
          />
          <Title style={[styles.categoryTitle, { color: theme.colors.onSurface }]}>
            {category}
          </Title>
          <View style={styles.categoryStats}>
            <Text style={[styles.categoryStatsText, { color: theme.colors.onSurfaceVariant }]}>
              {items.length} items
            </Text>
            {lowStockCount > 0 && (
              <Text style={[styles.categoryStatsText, { color: theme.colors.error }]}>
                {lowStockCount} need restocking
              </Text>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderSubcategoryRow = (subcategory: InventorySubcategory) => {
    const config = SUBCATEGORY_CONFIG[subcategory];
    const items = getItemsForSubcategory(subcategory);
    const lowStockCount = items.filter(item => item.quantity <= 0.25).length;

    return (
      <Card
        key={subcategory}
        style={styles.subcategoryCard}
        onPress={() => setNavigation({ ...navigation, state: 'subcategory', subcategory })}
      >
        <Card.Content style={styles.subcategoryContent}>
          <Icon
            name={config.icon as any}
            size={30}
            color={getCategoryColor(config.category, theme.dark)}
            style={styles.subcategoryIcon}
          />
          <View style={styles.subcategoryInfo}>
            <Title style={[styles.subcategoryTitle, { color: theme.colors.onSurface }]}>
              {subcategory}
            </Title>
            <Text style={[styles.subcategoryStats, { color: theme.colors.onSurfaceVariant }]}>
              {items.length} items
            </Text>
            {lowStockCount > 0 && (
              <Text style={[styles.subcategoryStats, { color: theme.colors.error }]}>
                {lowStockCount} need restocking
              </Text>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderItemRow = (item: InventoryItem) => {
    const subcategoryConfig = SUBCATEGORY_CONFIG[item.subcategory];
    const stockColor = getStockColor(item.quantity, theme.dark);

    return (
      <Card key={item.id} style={styles.itemCard}>
        <Card.Content>
          <View style={styles.itemHeader}>
            <Text style={[styles.itemTitle, { color: theme.colors.onSurface }]}>
              {item.name}
            </Text>
            <View style={styles.itemActions}>
              <IconButton
                icon="pencil"
                size={16}
                onPress={() => {
                  setEditingItem(item);
                  setEditedName(item.name);
                }}
              />
              <Text style={[styles.itemPercentage, { color: stockColor }]}>
                {Math.round(item.quantity * 100)}%
              </Text>
            </View>
          </View>

          <View style={styles.stockSliderContainer}>
            <Text style={[styles.stockLabel, { color: theme.colors.onSurfaceVariant }]}>
              Stock Level
            </Text>
            <View style={styles.stockControls}>
              <Text style={[styles.stockValue, { color: theme.colors.onSurface }]}>
                {Math.round(item.quantity * 100)}%
              </Text>
              <View style={styles.sliderContainer}>
                <TouchableOpacity
                  style={[styles.sliderTrack, { backgroundColor: theme.colors.outline }]}
                  onPress={(event) => {
                    const { locationX } = event.nativeEvent;
                    const percentage = Math.max(0, Math.min(100, (locationX / 200) * 100));
                    handleQuantityUpdate(item, percentage / 100);
                  }}
                >
                  <View
                    style={[
                      styles.sliderProgress,
                      {
                        width: `${item.quantity * 100}%`,
                        backgroundColor: stockColor,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.sliderThumb,
                      {
                        left: `${item.quantity * 100}%`,
                        backgroundColor: theme.colors.primary,
                      },
                    ]}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {item.quantity <= 0.25 && (
            <View style={styles.lowStockWarning}>
              <Icon name="alert-circle" size={16} color={theme.colors.error} />
              <Text style={[styles.lowStockText, { color: theme.colors.error }]}>
                Needs restocking
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderHomeScreen = () => (
    <ScrollView
      style={styles.scrollView}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {renderStatsHeader()}
      <View style={styles.categoriesGrid}>
        <View style={styles.categoryRow}>
          {getAllCategories().slice(0, 2).map(renderCategoryCard)}
        </View>
        <View style={styles.categoryRow}>
          {getAllCategories().slice(2, 4).map(renderCategoryCard)}
        </View>
      </View>
    </ScrollView>
  );

  const renderCategoryScreen = () => {
    if (!navigation.category) return null;
    
    const config = CATEGORY_CONFIG[navigation.category];
    
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => setNavigation({ state: 'home' })}
          />
          <Title style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
            {navigation.category}
          </Title>
          <View style={{ width: 48 }} />
        </View>
        <ScrollView
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.subcategoriesList}>
            {config.subcategories.map(renderSubcategoryRow)}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderSubcategoryScreen = () => {
    if (!navigation.subcategory) return null;
    
    const items = getItemsForSubcategory(navigation.subcategory);
    
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => setNavigation({ state: 'category', category: navigation.category })}
          />
          <Title style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
            {navigation.subcategory}
          </Title>
          <IconButton
            icon="plus"
            size={24}
            onPress={() => setShowingAddDialog(true)}
          />
        </View>
        <ScrollView
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.itemsList}>
            {items.map(renderItemRow)}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderAddItemDialog = () => (
    <Portal>
      <Dialog visible={showingAddDialog} onDismiss={() => setShowingAddDialog(false)}>
        <Dialog.Title>Add New Item</Dialog.Title>
        <Dialog.Content>
          <Text style={{ marginBottom: 16 }}>Adding to {navigation.subcategory}</Text>
          <TextInput
            label="Item Name"
            value={newItemName}
            onChangeText={setNewItemName}
            mode="outlined"
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setShowingAddDialog(false)}>Cancel</Button>
          <Button onPress={handleAddItem} disabled={!newItemName.trim()}>
            Add
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  const renderEditItemDialog = () => (
    <Portal>
      <Dialog visible={!!editingItem} onDismiss={() => setEditingItem(null)}>
        <Dialog.Title>Edit Item</Dialog.Title>
        <Dialog.Content>
          <TextInput
            label="Item Name"
            value={editedName}
            onChangeText={setEditedName}
            mode="outlined"
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setEditingItem(null)}>Cancel</Button>
          <Button onPress={handleEditItem} disabled={!editedName.trim()}>
            Save
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  const renderFloatingActionButton = () => {
    if (navigation.state !== 'home') return null;
    
    return (
      <FAB
        icon="auto-fix"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={handleStartShopping}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {navigation.state === 'home' && renderHomeScreen()}
      {navigation.state === 'category' && renderCategoryScreen()}
      {navigation.state === 'subcategory' && renderSubcategoryScreen()}
      
      {renderFloatingActionButton()}
      {renderAddItemDialog()}
      {renderEditItemDialog()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  categoriesGrid: {
    padding: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  categoryCard: {
    minHeight: 160,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  categoryCardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  categoryIcon: {
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  categoryStats: {
    alignItems: 'center',
  },
  categoryStatsText: {
    fontSize: 12,
    marginBottom: 2,
  },
  subcategoriesList: {
    padding: 16,
  },
  subcategoryCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  subcategoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  subcategoryIcon: {
    marginRight: 16,
  },
  subcategoryInfo: {
    flex: 1,
  },
  subcategoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  subcategoryStats: {
    fontSize: 12,
    marginBottom: 2,
  },
  itemsList: {
    padding: 16,
  },
  itemCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemPercentage: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  stockSliderContainer: {
    marginBottom: 8,
  },
  stockLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  stockControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockValue: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
    minWidth: 40,
  },
  sliderContainer: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    position: 'relative',
  },
  sliderProgress: {
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  sliderThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
    top: -7,
    marginLeft: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  lowStockWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  lowStockText: {
    fontSize: 12,
    marginLeft: 4,
  },
  fab: {
    position: 'absolute',
    margin: 20,
    right: 0,
    bottom: 0,
    borderRadius: 28,
  },
});

export default InventoryScreen;