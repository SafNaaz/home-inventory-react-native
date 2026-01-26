import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
  PanResponder,
  BackHandler,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Swipeable } from 'react-native-gesture-handler';
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
  Snackbar,
} from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { settingsManager } from '../managers/SettingsManager';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { inventoryManager } from '../managers/InventoryManager';
import { InventoryItem, InventoryCategory, InventorySubcategory, ShoppingState } from '../models/Types';
import { CATEGORY_CONFIG, SUBCATEGORY_CONFIG, getAllCategories, getCategoryConfig, getSubcategoryConfig } from '../constants/CategoryConfig';
import { getStockColor, getCategoryColor, commonStyles } from '../themes/AppTheme';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 2 columns with padding

type NavigationState = 'home' | 'category' | 'subcategory';

interface NavigationContext {
  state: NavigationState;
  category?: InventoryCategory;
  subcategory?: InventorySubcategory;
}

const CATEGORY_ICONS: Record<InventoryCategory, string[]> = {
  [InventoryCategory.FRIDGE]: [
    'fridge', 'snowflake', 'bottle-wine', 'tray', 'carrot', 'cube-outline', 
    'egg', 'cheese', 'ice-cream', 'fish', 'meat', 'fruit-grapes', 'food-apple', 'food-drumstick'
  ],
  [InventoryCategory.GROCERY]: [
    'basket', 'rice', 'bowl', 'bottle-soda', 'oil', 'leaf', 'grain', 
    'bread-slice', 'cookie', 'coffee', 'tea', 'candy', 'corn', 'peanut'
  ],
  [InventoryCategory.HYGIENE]: [
    'water', 'tshirt-crew', 'silverware-fork-knife', 'toilet', 'baby-face', 
    'spray', 'soap', 'shower', 'mop', 'trash-can'
  ],
  [InventoryCategory.PERSONAL_CARE]: [
    'account-heart', 'face-woman', 'human', 'head-outline', 'brush', 
    'lipstick', 'mirror', 'spa', 'tooth-outline', 'medical-bag'
  ],
};

const InventoryScreen: React.FC = () => {
  const theme = useTheme();
  const navigationObj = useNavigation();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const pendingUpdatesRef = useRef<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [navigation, setNavigation] = useState<NavigationContext>({ state: 'home' });
  const [showingAddDialog, setShowingAddDialog] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editedName, setEditedName] = useState('');
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<InventoryItem | null>(null);
  const [showingShoppingDialog, setShowingShoppingDialog] = useState(false);
  const [shoppingDialogState, setShoppingDialogState] = useState<ShoppingState | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [showingSuccessDialog, setShowingSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showingSubAddDialog, setShowingSubAddDialog] = useState(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');
  const [newSubIcon, setNewSubIcon] = useState('');
  const [subToDeleteId, setSubToDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadInventoryData();

    const unsubscribe = inventoryManager.addListener(() => {
      loadInventoryData();
    });

    // Handle Android back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (navigation.state === 'subcategory') {
        // Go back to category view
        setNavigation({ state: 'category', category: navigation.category });
        return true; // Prevent default behavior (closing app)
      } else if (navigation.state === 'category') {
        // Go back to home view
        setNavigation({ state: 'home' });
        return true; // Prevent default behavior (closing app)
      }
      // If we're on home, let the default behavior happen (close app or go to previous screen)
      return false;
    });

    return () => {
      unsubscribe();
      backHandler.remove();
    };
  }, [navigation]);

  const setNavigationFluid = (newNav: NavigationContext | ((prev: NavigationContext) => NavigationContext)) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setNavigation(newNav);
  };

  // Reset to home view when Inventory tab is pressed
  useEffect(() => {
    const unsubscribe = (navigationObj as any).addListener('tabPress', (e: any) => {
      // Reset to home if not already there
      setNavigationFluid(prevNav => {
        if (prevNav.state !== 'home') {
          return { state: 'home' };
        }
        return prevNav;
      });
    });

    return unsubscribe;
  }, [navigationObj]);

  const loadInventoryData = () => {
    const items = inventoryManager.getInventoryItems().map(it => {
      const pending = pendingUpdatesRef.current[it.id];
      if (pending !== undefined) {
        return { ...it, quantity: pending };
      }
      return it;
    });
    setInventoryItems(items);
  };

  const onRefresh = async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRefreshing(true);
    await loadInventoryData();
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

  const handleAddSubcategory = async () => {
    if (!newSubName.trim() || !newSubIcon || !navigation.category) return;

    if (editingSubId) {
      if (editingSubId.startsWith('builtin:')) {
        const builtinName = editingSubId.replace('builtin:', '');
        // Hide builtin and add as custom
        await inventoryManager.removeSubcategory(builtinName);
        await inventoryManager.addCustomSubcategory(newSubName, newSubIcon, theme.colors.primary, navigation.category);
      } else {
        await inventoryManager.updateSubcategory(editingSubId, newSubName, newSubIcon, theme.colors.primary);
      }
    } else {
      await inventoryManager.addCustomSubcategory(newSubName, newSubIcon, theme.colors.primary, navigation.category);
    }

    setShowingSubAddDialog(false);
    setNewSubName('');
    setNewSubIcon('');
    setEditingSubId(null);
  };

  const handleConfirmSubDelete = async () => {
    if (subToDeleteId) {
      await inventoryManager.removeSubcategory(subToDeleteId);
      setSubToDeleteId(null);
    }
  };

  const openSubAddDialog = () => {
    setEditingSubId(null);
    setNewSubName('');
    if (navigation.category) {
      setNewSubIcon(CATEGORY_ICONS[navigation.category][0]);
    }
    setShowingSubAddDialog(true);
  };

  const openSubEditDialog = (sub: string) => {
    const customSubs = inventoryManager.getCustomSubcategories();
    const subObj = customSubs.find(cs => cs.name === sub);
    
    if (subObj) {
      setEditingSubId(subObj.id);
      setNewSubName(subObj.name);
      setNewSubIcon(subObj.icon);
    } else {
      // It's a builtin, convert to dynamic edit
      const config = getSubcategoryConfig(sub as any);
      setEditingSubId(`builtin:${sub}`);
      setNewSubName(sub);
      setNewSubIcon(config?.icon || 'help-circle');
    }
    setShowingSubAddDialog(true);
  };

  const getItemsForSubcategory = (subcategory: InventorySubcategory): InventoryItem[] => {
    return inventoryItems.filter(item => item.subcategory === subcategory);
  };

  const handleQuantityUpdate = async (item: InventoryItem, newQuantity: number) => {
    // Optimistic UI update with pending marker
    pendingUpdatesRef.current[item.id] = newQuantity;
    setInventoryItems(prev => prev.map(it => it.id === item.id ? { ...it, quantity: newQuantity } : it));

    try {
      const res = await inventoryManager.updateItemQuantity(item.id, newQuantity);
      // clear pending and refresh data
      delete pendingUpdatesRef.current[item.id];
      loadInventoryData();
      return res;
    } catch (err) {
      // Revert local UI to stored values
      delete pendingUpdatesRef.current[item.id];
      loadInventoryData();
      throw err;
    }
  };


  // Slider control that allows dragging and only updates the DB on release
  const SliderControl: React.FC<{
    initialValue: number;
    onComplete: (value: number) => void;
    trackColor: string;
    progressColor: string;
    thumbColor: string;
  }> = ({ initialValue, onComplete, trackColor, progressColor, thumbColor }) => {
    const [value, setValue] = useState<number>(initialValue);
    const [dragging, setDragging] = useState(false);
    const trackWidth = useRef<number>(200);
    const trackRef = useRef<any>(null);

    useEffect(() => {
      if (!dragging) setValue(initialValue);
    }, [initialValue, dragging]);

    const clamp = (v: number) => Math.max(0, Math.min(1, v));

    const handleMove = (nativeEvent: any, gestureState?: any) => {
      const w = trackWidth.current || 200;

      // Prefer pageX + measure for reliable global coords
      const pageX = nativeEvent.pageX ?? gestureState?.moveX;

      if (pageX != null && trackRef.current && trackRef.current.measure) {
        trackRef.current.measure((fx: number, fy: number, width: number, height: number, px: number, py: number) => {
          const pct = clamp((pageX - px) / (width || w));
          setValue(pct);
        });
        return;
      }

      // Fallback to locationX
      const locationX = nativeEvent.locationX ?? gestureState?.x0 ?? 0;
      const pct = clamp(locationX / w);
      setValue(pct);
    };

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e, gs) => {
          setDragging(true);
          handleMove(e.nativeEvent, gs);
        },
        onPanResponderMove: (e, gs) => handleMove(e.nativeEvent, gs),
        onPanResponderRelease: (e, gs) => {
          // compute final percentage from event and track position to avoid stale coords
          const computeFinalPct = (): Promise<number> => {
            return new Promise((resolve) => {
              const pageX = e.nativeEvent.pageX ?? gs?.moveX;
              if (pageX != null && trackRef.current && trackRef.current.measure) {
                trackRef.current.measure((fx: number, fy: number, width: number, height: number, px: number, py: number) => {
                  const pct = clamp((pageX - px) / (width || trackWidth.current));
                  resolve(pct);
                });
                return;
              }
              const locationX = e.nativeEvent.locationX ?? gs?.moveX ?? 0;
              resolve(clamp(locationX / trackWidth.current));
            });
          };

          computeFinalPct().then((finalPct) => {
            setValue(finalPct);
            const result: any = onComplete(finalPct);
            if (result && typeof result.then === 'function') {
              result.then(() => setDragging(false)).catch(() => setDragging(false));
            } else {
              setDragging(false);
            }
          });
        },
        onPanResponderTerminate: (e, gs) => {
          const computeFinalPct = (): Promise<number> => {
            return new Promise((resolve) => {
              const pageX = e.nativeEvent.pageX ?? gs?.moveX;
              if (pageX != null && trackRef.current && trackRef.current.measure) {
                trackRef.current.measure((fx: number, fy: number, width: number, height: number, px: number, py: number) => {
                  const pct = clamp((pageX - px) / (width || trackWidth.current));
                  resolve(pct);
                });
                return;
              }
              const locationX = e.nativeEvent.locationX ?? gs?.moveX ?? 0;
              resolve(clamp(locationX / trackWidth.current));
            });
          };

          computeFinalPct().then((finalPct) => {
            setValue(finalPct);
            const result: any = onComplete(finalPct);
            if (result && typeof result.then === 'function') {
              result.then(() => setDragging(false)).catch(() => setDragging(false));
            } else {
              setDragging(false);
            }
          });
        },
      })
    ).current;

    return (
      <View style={styles.sliderContainer}>
        <View
          ref={trackRef}
          style={[styles.sliderTrack, { backgroundColor: trackColor }]}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            trackWidth.current = w || 200;
          }}
          {...panResponder.panHandlers}
        >
          <View
            style={[
              styles.sliderProgress,
              { width: `${value * 100}%`, backgroundColor: progressColor },
            ]}
          />
          <View
            style={[
              styles.sliderThumb,
              { left: `${value * 100}%`, backgroundColor: thumbColor },
            ]}
          />
        </View>
      </View>
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
      setShoppingDialogState(currentState);
      setShowingShoppingDialog(true);
    } else {
      await inventoryManager.startGeneratingShoppingList();
      setSuccessMessage('Shopping list generated successfully!');
      setShowingSuccessDialog(true);
    }
  };

  const handleContinueShopping = () => {
    setShowingShoppingDialog(false);
    (navigationObj as any).navigate('Shopping');
  };

  const handleStartFreshShopping = async () => {
    setShowingShoppingDialog(false);
    await inventoryManager.cancelShopping();
    await inventoryManager.startGeneratingShoppingList();
    setSuccessMessage('New shopping list started!');
    setShowingSuccessDialog(true);
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
    const subcategories = inventoryManager.getSubcategoriesForCategory(category);
    const itemsCount = inventoryManager.getItemsForCategory(category).length;

    return (
      <Card
        key={category}
        style={[styles.categoryCard, { width: cardWidth }]}
        onPress={() => setNavigationFluid({ state: 'category', category })}
      >
        <Card.Content style={styles.categoryCardContent}>
          <Icon
            name={config.icon as any}
            size={48}
            color={config.color}
            style={styles.categoryIcon}
          />
          <Title style={[styles.categoryTitle, { color: theme.colors.onSurface }]}>
            {category}
          </Title>
          <View style={styles.categoryStats}>
            <Text style={[styles.categoryStatsText, { color: theme.colors.onSurfaceVariant }]}>
              {subcategories.length} sections
            </Text>
            <Text style={[styles.categoryStatsText, { color: theme.colors.onSurfaceVariant }]}>
              {itemsCount} items total
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderSubcategoryRow = (subName: string) => {
    const items = getItemsForSubcategory(subName as InventorySubcategory);
    const lowStockCount = items.filter(it => it.quantity <= 0.25).length;
    const config = inventoryManager.getSubcategoryConfig(subName as InventorySubcategory);
    
    const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
      const trans = dragX.interpolate({
        inputRange: [-80, 0],
        outputRange: [0, 80],
        extrapolate: 'clamp',
      });

      return (
        <Animated.View style={[styles.swipeAction, styles.deleteAction, { transform: [{ translateX: trans }] }]}>
          <TouchableOpacity style={styles.swipeActionButton} onPress={() => {
            setSubToDeleteId(subName);
          }}>
            <Icon name="delete" size={20} color="#fff" />
            <Text style={styles.swipeActionText}>Delete</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    };

    const renderLeftActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
      const trans = dragX.interpolate({
        inputRange: [0, 80],
        outputRange: [-80, 0],
        extrapolate: 'clamp',
      });

      return (
        <Animated.View style={[styles.swipeAction, styles.editAction, { transform: [{ translateX: trans }] }]}>
          <TouchableOpacity style={styles.swipeActionButton} onPress={() => openSubEditDialog(subName)}>
            <Icon name="pencil" size={20} color="#fff" />
            <Text style={styles.swipeActionText}>Edit</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    };

    return (
      <Swipeable
        key={subName}
        renderRightActions={renderRightActions}
        renderLeftActions={renderLeftActions}
        overshootRight={false}
        overshootLeft={false}
      >
        <Card
          style={styles.subcategoryCard}
          onPress={() => setNavigationFluid({ state: 'subcategory', category: navigation.category, subcategory: subName as InventorySubcategory })}
        >
          <Card.Content style={styles.subcategoryContent}>
            <View style={[styles.iconContainer, { backgroundColor: (config?.color || theme.colors.primary) + '15' }]}>
              <Icon name={(config?.icon || 'help-circle') as any} size={24} color={config?.color || theme.colors.primary} />
            </View>
            <View style={styles.subcategoryInfo}>
              <Title style={[styles.subcategoryTitle, { color: theme.colors.onSurface }]}>
                {subName}
              </Title>
              <Text style={[styles.subcategoryStats, { color: theme.colors.onSurfaceVariant }]}>
                {items.length} items
              </Text>
              {lowStockCount > 0 && (
                <Text style={[styles.subcategoryStats, { color: theme.colors.error, fontWeight: '600' }]}>
                  {lowStockCount} need restocking
                </Text>
              )}
            </View>
            <Icon name="chevron-right" size={24} color={theme.colors.outline} />
          </Card.Content>
        </Card>
      </Swipeable>
    );
  };

  const handleIncrementQuantity = async (item: InventoryItem) => {
    const newQuantity = Math.min(1, item.quantity + 0.01); // Increment by 1%, max 100%
    await handleQuantityUpdate(item, newQuantity);
  };

  const handleDecrementQuantity = async (item: InventoryItem) => {
    const newQuantity = Math.max(0, item.quantity - 0.01); // Decrement by 1%, min 0%
    await handleQuantityUpdate(item, newQuantity);
  };

  const confirmDelete = (item: InventoryItem) => {
    setDeleteConfirmItem(item);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmItem) {
      await inventoryManager.removeItem(deleteConfirmItem.id);
      setDeleteConfirmItem(null);
    }
  };

  const confirmEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setEditedName(item.name);
  };

  const renderItemRow = (item: InventoryItem) => {
    const subcategoryConfig = SUBCATEGORY_CONFIG[item.subcategory];
    const stockColor = getStockColor(item.quantity, theme.dark);

    const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
      const trans = dragX.interpolate({
        inputRange: [-80, 0],
        outputRange: [0, 80],
        extrapolate: 'clamp',
      });

      return (
        <Animated.View
          style={[
            styles.swipeAction,
            styles.deleteAction,
            { transform: [{ translateX: trans }] },
          ]}
        >
          <TouchableOpacity
            style={styles.swipeActionButton}
            onPress={() => confirmDelete(item)}
          >
            <Icon name="delete" size={20} color="#fff" />
            <Text style={styles.swipeActionText}>Delete</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    };

    const renderLeftActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
      const trans = dragX.interpolate({
        inputRange: [0, 80],
        outputRange: [-80, 0],
        extrapolate: 'clamp',
      });

      return (
        <Animated.View
          style={[
            styles.swipeAction,
            styles.editAction,
            { transform: [{ translateX: trans }] },
          ]}
        >
          <TouchableOpacity
            style={styles.swipeActionButton}
            onPress={() => confirmEdit(item)}
          >
            <Icon name="pencil" size={20} color="#fff" />
            <Text style={styles.swipeActionText}>Edit</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    };

    return (
      <Swipeable
        key={item.id}
        renderRightActions={renderRightActions}
        renderLeftActions={renderLeftActions}
        overshootRight={false}
        overshootLeft={false}
      >
        <Card style={styles.itemCard}>
          <Card.Content style={styles.compactItemContent}>
            <View style={styles.itemHeaderCompact}>
              <Text style={[styles.itemTitle, { color: theme.colors.onSurface }]}>
                {item.name}
              </Text>
              <Text style={[styles.itemPercentage, { color: stockColor }]}>
                {Math.round(item.quantity * 100)}%
              </Text>
            </View>

            <View style={styles.stockControlsCompact}>
              <IconButton
                icon="minus"
                size={20}
                iconColor={theme.colors.primary}
                style={styles.quantityButton}
                onPress={() => handleDecrementQuantity(item)}
              />
              <View style={styles.sliderWrapper}>
                <SliderControl
                  initialValue={item.quantity}
                  onComplete={(q) => handleQuantityUpdate(item, q)}
                  trackColor={theme.colors.outline}
                  progressColor={stockColor}
                  thumbColor={theme.colors.primary}
                />
              </View>
              <IconButton
                icon="plus"
                size={20}
                iconColor={theme.colors.primary}
                style={styles.quantityButton}
                onPress={() => handleIncrementQuantity(item)}
              />
            </View>

            {item.quantity <= 0.25 && (
              <View style={styles.lowStockWarningCompact}>
                <Icon name="alert-circle" size={14} color={theme.colors.error} />
                <Text style={[styles.lowStockTextCompact, { color: theme.colors.error }]}>
                  Low stock
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      </Swipeable>
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
    
    const config = getCategoryConfig(navigation.category);
    const subcategories = inventoryManager.getSubcategoriesForCategory(navigation.category);
    
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
          <IconButton
            icon="plus"
            size={24}
            onPress={openSubAddDialog}
          />
        </View>
        <ScrollView
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.subcategoriesList}>
            {subcategories.map(renderSubcategoryRow)}
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
            onSubmitEditing={handleAddItem}
            returnKeyType="done"
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
            onSubmitEditing={handleEditItem}
            returnKeyType="done"
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

  const renderDeleteConfirmDialog = () => (
    <Portal>
      <Dialog visible={!!deleteConfirmItem} onDismiss={() => setDeleteConfirmItem(null)}>
        <Dialog.Title>Delete Item</Dialog.Title>
        <Dialog.Content>
          <Text>Are you sure you want to delete "{deleteConfirmItem?.name}"?</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setDeleteConfirmItem(null)}>Cancel</Button>
          <Button onPress={handleConfirmDelete} textColor={theme.colors.error}>
            Delete
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  const renderShoppingConfirmDialog = () => (
    <Portal>
      <Dialog visible={showingShoppingDialog} onDismiss={() => setShowingShoppingDialog(false)}>
        <Dialog.Title>Start New Shopping Trip?</Dialog.Title>
        <Dialog.Content>
          <Text>{shoppingDialogState ? getShoppingStateMessage(shoppingDialogState) : ''}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setShowingShoppingDialog(false)}>Cancel</Button>
          <Button onPress={handleContinueShopping}>Continue Current</Button>
          <Button onPress={handleStartFreshShopping} textColor={theme.colors.error}>Start New</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  const renderSuccessDialog = () => (
    <Portal>
      <Dialog visible={showingSuccessDialog} onDismiss={() => setShowingSuccessDialog(false)}>
        <Dialog.Title>Success</Dialog.Title>
        <Dialog.Content>
          <Text style={{ color: theme.colors.onSurface }}>{successMessage}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setShowingSuccessDialog(false)}>Later</Button>
          <Button 
            onPress={() => {
              setShowingSuccessDialog(false);
              (navigationObj as any).navigate('Shopping');
            }}
            mode="contained"
          >
            Go There
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  const renderFloatingActionButton = () => {
    return (
      <FAB
        icon="auto-fix"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.dark ? '#000' : '#fff'}
        onPress={handleStartShopping}
      />
    );
  };
  const renderSubAddDialog = () => (
    <Portal>
      <Dialog visible={showingSubAddDialog} onDismiss={() => setShowingSubAddDialog(false)}>
        <Dialog.Title>{editingSubId ? 'Edit Type' : 'Add New Type'}</Dialog.Title>
        <Dialog.Content>
          <TextInput
            label="Type Name"
            value={newSubName}
            onChangeText={setNewSubName}
            mode="outlined"
            style={{ marginBottom: 16 }}
            onSubmitEditing={handleAddSubcategory}
            returnKeyType="done"
          />
          <Text style={{ marginBottom: 8, color: theme.colors.onSurface }}>Select Icon:</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {navigation.category && CATEGORY_ICONS[navigation.category].map(icon => (
              <IconButton
                key={icon}
                icon={icon}
                mode={newSubIcon === icon ? 'contained' : 'outlined'}
                onPress={() => setNewSubIcon(icon)}
                size={24}
                iconColor={newSubIcon === icon ? theme.colors.onPrimary : theme.colors.primary}
                containerColor={newSubIcon === icon ? theme.colors.primary : undefined}
              />
            ))}
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setShowingSubAddDialog(false)}>Cancel</Button>
          <Button onPress={handleAddSubcategory} disabled={!newSubName.trim()}>
            {editingSubId ? 'Save' : 'Add'}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  const renderSubDeleteConfirmDialog = () => (
    <Portal>
      <Dialog visible={!!subToDeleteId} onDismiss={() => setSubToDeleteId(null)}>
        <Dialog.Title>Delete Type</Dialog.Title>
        <Dialog.Content>
          <Text style={{ color: theme.colors.onSurface }}>
            Are you sure you want to delete this type? All items inside it will also be deleted.
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setSubToDeleteId(null)}>Cancel</Button>
          <Button onPress={handleConfirmSubDelete} textColor={theme.colors.error}>Delete</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {navigation.state === 'home' && renderHomeScreen()}
      {navigation.state === 'category' && renderCategoryScreen()}
      {navigation.state === 'subcategory' && renderSubcategoryScreen()}
      
      {renderFloatingActionButton()}
      {renderAddItemDialog()}
      {renderEditItemDialog()}
      {renderDeleteConfirmDialog()}
      {renderShoppingConfirmDialog()}
      {renderSuccessDialog()}
      {renderSubAddDialog()}
      {renderSubDeleteConfirmDialog()}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: 'OK',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
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
    minHeight: 180,
    borderRadius: 32,
    ...commonStyles.shadow,
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
    marginBottom: 16,
    borderRadius: 24,
    ...commonStyles.shadow,
  },
  addSubCard: {
    borderStyle: 'dashed',
    borderWidth: 1,
    elevation: 0,
    backgroundColor: 'transparent',
  },
  subcategoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 16,
    borderRadius: 24,
    ...commonStyles.shadow,
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
    height: 10,
    borderRadius: 5,
    position: 'relative',
  },
  sliderProgress: {
    height: 10,
    borderRadius: 5,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  sliderThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    position: 'absolute',
    top: -7,
    marginLeft: -12,
    ...commonStyles.shadow,
    borderWidth: 2,
    borderColor: '#fff',
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
  // New compact styles
  compactItemContent: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  itemHeaderCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stockControlsCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    margin: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  sliderWrapper: {
    flex: 1,
    marginHorizontal: 4,
  },
  lowStockWarningCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  lowStockTextCompact: {
    fontSize: 11,
    marginLeft: 4,
  },
  // Swipe action styles
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 12,
  },
  deleteAction: {
    backgroundColor: '#FF3B30',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  editAction: {
    backgroundColor: '#007AFF',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  swipeActionButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  swipeActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    margin: 20,
    right: 0,
    bottom: 100,
    borderRadius: 28,
  },
});

export default InventoryScreen;