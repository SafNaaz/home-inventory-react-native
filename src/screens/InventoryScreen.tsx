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
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Keyboard,
  InteractionManager,
  Alert,
  TextInput as RNTextInput,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Swipeable, GestureHandlerRootView, ScrollView as GHScrollView, PanGestureHandler, State } from 'react-native-gesture-handler';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
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
  Checkbox,
  Searchbar,
} from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { settingsManager } from '../managers/SettingsManager';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { inventoryManager } from '../managers/InventoryManager';
import { InventoryItem, InventoryCategory, InventorySubcategory, ShoppingState } from '../models/Types';
import { CATEGORY_CONFIG, SUBCATEGORY_CONFIG, getAllCategories, getCategoryConfig, getSubcategoryConfig } from '../constants/CategoryConfig';
import { getStockColor, getCategoryColor, commonStyles } from '../themes/AppTheme';
import DoodleBackground from '../components/DoodleBackground';
import { tabBar as tabBarDims, fontSize as fs, spacing as sp, radius as r, iconSize as is, card as cardDims, fab as fabDims, screen } from '../themes/Responsive';

const { width, height } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp.base,
    paddingVertical: sp.sm,
  },
  headerTitle: {
    fontSize: fs.lg,
    fontWeight: '700',
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: sp.base,
    paddingVertical: sp.md,
    marginBottom: sp.sm,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: fs.sm,
    marginBottom: 3,
  },
  statValue: {
    fontSize: fs.h3,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  categoriesGrid: {
    padding: sp.base,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: sp.base,
  },
  categoryCard: {
    minHeight: cardDims.categoryMinHeight,
    borderRadius: cardDims.borderRadius,
    ...commonStyles.shadow,
  },
  categoryCardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: cardDims.padding,
  },
  categoryIcon: {
    marginBottom: sp.sm,
  },
  categoryTitle: {
    fontSize: fs.base,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  categoryStats: {
    alignItems: 'center',
  },
  categoryStatsText: {
    fontSize: fs.xs,
    marginBottom: 2,
  },
  subcategoriesList: {
    padding: sp.base,
  },
  subcategoryCard: {
    marginVertical: 6,
    marginHorizontal: 4,
    borderRadius: r.xl,
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
    padding: sp.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: sp.md,
  },
  subcategoryInfo: {
    flex: 1,
  },
  subcategoryTitle: {
    fontSize: fs.base,
    fontWeight: '600',
    marginBottom: 3,
  },
  subcategoryStats: {
    fontSize: fs.sm,
    marginBottom: 2,
  },
  itemsList: {
    padding: sp.base,
  },
  itemCard: {
    marginVertical: 6,
    marginHorizontal: 4,
    borderRadius: r.xl,
    ...commonStyles.shadow,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sp.sm,
  },
  itemTitle: {
    fontSize: fs.base,
    fontWeight: '600',
    flex: 1,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemPercentage: {
    fontSize: fs.md,
    fontWeight: '700',
    marginLeft: 6,
  },
  stockSliderContainer: {
    marginBottom: 6,
  },
  stockLabel: {
    fontSize: fs.sm,
    marginBottom: 6,
  },
  stockControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockValue: {
    fontSize: fs.md,
    fontWeight: '600',
    marginRight: sp.sm,
    minWidth: 36,
  },
  sliderContainer: {
    flex: 1,
    height: 36,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 10,
    borderRadius: 5,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  sliderProgress: {
    height: 10,
    borderRadius: 5,
    position: 'absolute',
    left: 0,
    top: -1,
  },
  sliderThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    position: 'absolute',
    top: -9,
    marginLeft: -13,
    ...commonStyles.shadow,
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 4,
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: 6,
  },
  progressBar: {
    height: 5,
    borderRadius: 3,
  },
  lowStockWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  lowStockText: {
    fontSize: fs.sm,
    marginLeft: 4,
  },
  // Compact item styles
  compactItemContent: {
    paddingVertical: sp.md,
    paddingHorizontal: sp.base,
  },
  itemHeaderCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stockControlsCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quantityButton: {
    margin: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  sliderWrapper: {
    flex: 1,
    marginHorizontal: 2,
  },
  lowStockWarningCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  lowStockTextCompact: {
    fontSize: fs.xs,
    marginLeft: 4,
  },
  // Swipe action styles
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginVertical: 6,
  },
  deleteAction: {
    backgroundColor: '#FF3B30',
    borderTopRightRadius: r.xl,
    borderBottomRightRadius: r.xl,
    marginRight: 4,
    marginLeft: -20,
    paddingLeft: 20,
    width: 100,
  },
  editAction: {
    backgroundColor: '#007AFF',
    borderTopLeftRadius: r.xl,
    borderBottomLeftRadius: r.xl,
    marginLeft: 4,
    marginRight: -20,
    paddingRight: 20,
    width: 100,
  },
  swipeActionButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  swipeActionText: {
    color: '#fff',
    fontSize: fs.xs,
    fontWeight: '600',
    marginTop: 3,
  },
  fab: {
    position: 'absolute',
    margin: fabDims.margin,
    right: 0,
    bottom: tabBarDims.height + tabBarDims.bottomOffset + 10,
    borderRadius: 28,
  },
  searchBar: {
    borderRadius: r.lg,
    backgroundColor: '#fff',
  },
  searchPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp.base,
    height: 52,
    borderRadius: r.lg,
    ...commonStyles.shadow,
    elevation: 2,
  },
});
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
    'egg', 'cheese', 'ice-cream', 'fish', 'food-steak', 'fruit-grapes', 'food-apple', 'food-drumstick'
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

  useEffect(() => {
    if (!dragging) setValue(initialValue);
  }, [initialValue, dragging]);

  const clamp = (v: number) => Math.max(0, Math.min(1, v));

  const onGestureEvent = (event: any) => {
    const { x } = event.nativeEvent;
    const w = trackWidth.current || 200;
    const pct = clamp(x / w);
    setValue(pct);
  };

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      setDragging(true);
    } else if (event.nativeEvent.state === State.END || event.nativeEvent.state === State.CANCELLED) {
      const { x } = event.nativeEvent;
      const w = trackWidth.current || 200;
      const finalPct = clamp(x / w);
      
      // Ensure we submit the final value
      setValue(finalPct);
      setDragging(false);
      onComplete(finalPct);
    } else if (event.nativeEvent.state === State.FAILED) {
      setDragging(false);
      setValue(initialValue);
    }
  };

  return (
    <View style={styles.sliderContainer}>
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={[-10, 10]}
        failOffsetY={[-10, 10]}
      >
        <View
          style={[styles.sliderTrack, { backgroundColor: trackColor, opacity: 0.8 }]}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            trackWidth.current = w || 200;
          }}
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
      </PanGestureHandler>
    </View>
  );
};

interface ItemRowProps {
  item: InventoryItem;
  theme: any;
  onIncrement: (item: InventoryItem) => void;
  onDecrement: (item: InventoryItem) => void;
  onUpdate: (item: InventoryItem, q: number) => void;
  onDelete: (item: InventoryItem) => void;
  onEdit: (item: InventoryItem) => void;
  onToggleIgnore: (item: InventoryItem) => void;
  isSearch?: boolean;
}

const InventoryItemRow = React.memo(({ item, theme, onIncrement, onDecrement, onUpdate, onDelete, onEdit, onToggleIgnore, isSearch }: ItemRowProps) => {
  const stockColor = getStockColor(item.quantity, theme.dark);

  const swipeableRef = useRef<Swipeable>(null);

  const closeSwipeable = () => {
    swipeableRef.current?.close();
  };

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
          onPress={() => {
            closeSwipeable();
            onDelete(item);
          }}
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
          onPress={() => {
            closeSwipeable();
            onEdit(item);
          }}
        >
          <Icon name="pencil" size={20} color="#fff" />
          <Text style={styles.swipeActionText}>Edit</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const card = (
    <View 
      collapsable={false}
      renderToHardwareTextureAndroid={true}
      style={[
        styles.itemCard, 
        { 
          elevation: item.isIgnored ? 0 : 2,
          backgroundColor: theme.colors.surface,
          borderRadius: 24,
        }
      ]}
    >
      <View style={styles.compactItemContent}>
        <View style={styles.itemHeaderCompact}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
            {!isSearch && (
              <Checkbox.Android
                status={item.isIgnored ? 'checked' : 'unchecked'}
                onPress={() => onToggleIgnore(item)}
                color={theme.colors.error}
                uncheckedColor={theme.colors.onSurfaceVariant}
              />
            )}
            <Text 
              style={[
                styles.itemTitle, 
                { 
                  color: theme.colors.onSurface,
                  textDecorationLine: 'none',
                  opacity: item.isIgnored ? 0.5 : 1,
                  marginLeft: isSearch ? 4 : 0
                }
              ]}
              numberOfLines={2}
            >
              {item.name}
            </Text>
          </View>
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
            onPress={() => onDecrement(item)}
          />
          <View style={styles.sliderWrapper}>
            <SliderControl
              initialValue={item.quantity}
              onComplete={(q) => onUpdate(item, q)}
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
            onPress={() => onIncrement(item)}
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
      </View>
    </View>
  );

  if (isSearch) {
    return card;
  }

  return (
    <Swipeable
      ref={swipeableRef}
      key={item.id}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      overshootRight={false}
      overshootLeft={false}
      activeOffsetX={[-50, 50]}
      containerStyle={{ overflow: 'visible' }}
      childrenContainerStyle={{ overflow: 'visible' }}
    >
      <View collapsable={false} style={{ overflow: 'visible' }}>
        {card}
      </View>
    </Swipeable>
  );
});
const EditItemInput = ({ initialValue, onSave, onCancel }: { initialValue: string, onSave: (val: string) => void, onCancel: () => void }) => {
  const [isValid, setIsValid] = useState(!!initialValue.trim());
  const textRef = useRef(initialValue);

  // Update ref when typing, update valid state
  const handleChangeText = (text: string) => {
    textRef.current = text;
    setIsValid(!!text.trim());
  };

  const handleSave = () => {
    if (textRef.current.trim()) {
      onSave(textRef.current.trim());
    }
  };

  return (
    <>
      <TextInput
        label="Item Name"
        defaultValue={initialValue}
        onChangeText={handleChangeText}
        mode="outlined"
        onSubmitEditing={handleSave}
        returnKeyType="done"
        autoFocus={true}
        key={initialValue} // Force remount if initial value changes (e.g. reused component instance)
      />
      
      <Dialog.Actions style={{ paddingHorizontal: 0, marginTop: 10 }}>
        <Button onPress={onCancel}>Cancel</Button>
        <Button onPress={handleSave} disabled={!isValid}>
          Save
        </Button>
      </Dialog.Actions>
    </>
  );
};



const InventoryScreen: React.FC = () => {
  const theme = useTheme();
  const navigationObj = useNavigation();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const pendingUpdatesRef = useRef<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [navigation, setNavigation] = useState<NavigationContext>({ state: 'home' });
  const [showIgnoredOnly, setShowIgnoredOnly] = useState(false);
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
  const [isReordering, setIsReordering] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isFabVisible, setIsFabVisible] = useState(true);
  const [hidingItem, setHidingItem] = useState<InventoryItem | null>(null);
  const lastScrollY = useRef(0);
  const itemsRef = useRef(inventoryItems);
  const sheetTranslateY = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<RNTextInput>(null);
  const isSearchVisibleRef = useRef(isSearchVisible);

  useEffect(() => {
    isSearchVisibleRef.current = isSearchVisible;
  }, [isSearchVisible]);

  const fabAnimation = useRef(new Animated.Value(1)).current;

  const handleScroll = useCallback((event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    if (currentScrollY <= 0) {
      if (!isFabVisible) {
        setIsFabVisible(true);
        Animated.spring(fabAnimation, {
          toValue: 1,
          useNativeDriver: true,
          tension: 40,
          friction: 7
        }).start();
        // Restore tabs
        navigationObj.getParent()?.setOptions({
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopWidth: 0,
            height: 65,
            paddingBottom: 10,
            paddingTop: 10,
            position: 'absolute',
            bottom: 20,
            left: 20,
            right: 20,
            borderRadius: 32,
            elevation: 8,
          }
        });
      }
      return;
    }

    const diff = currentScrollY - lastScrollY.current;
    if (Math.abs(diff) < 5) return; // Ignore small noise

    if (diff > 20 && isFabVisible) {
      setIsFabVisible(false);
      Animated.timing(fabAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }).start();
      navigationObj.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });
    } else if (diff < -20 && !isFabVisible) {
      setIsFabVisible(true);
      Animated.spring(fabAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 40,
        friction: 7
      }).start();
      navigationObj.getParent()?.setOptions({
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 0,
          height: 65,
          paddingBottom: 10,
          paddingTop: 10,
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          borderRadius: 32,
          elevation: 8,
        }
      });
    }
    
    lastScrollY.current = currentScrollY;
  }, [isFabVisible, theme, fabAnimation]);

  useEffect(() => {
    loadInventoryData();

    const unsubscribeInventory = inventoryManager.addListener(() => {
      loadInventoryData();
    });

    const unsubscribeSettings = settingsManager.addListener(() => {
      loadInventoryData();
    });

    // Handle Android back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Use ref to check visibility without stale closures
      if (isSearchVisibleRef.current) {
        closeSearch();
        return true;
      }
      if (isReordering) {
        setIsReordering(false);
        return true;
      }
      if (navigation.state === 'subcategory') {
        // Go back to category view
        setNavigationFluid({ state: 'category', category: navigation.category });
        return true; 
      } else if (navigation.state === 'category') {
        // Go back to home view
        setNavigationFluid({ state: 'home' });
        return true; 
      }
      // If we're on home, let the default behavior happen (close app or go to previous screen)
      return false;
    });

    return () => {
      unsubscribeInventory();
      unsubscribeSettings();
      backHandler.remove();
    };
  }, [navigation]); // Only depend on navigation, back handler uses refs for other dynamic state

  const setNavigationFluid = (newNav: NavigationContext | ((prev: NavigationContext) => NavigationContext)) => {
    Keyboard.dismiss();
    setShowIgnoredOnly(false); // Immediate reset
    setIsReordering(false);
    
    if (isSearchVisible) {
      setIsSearchVisible(false);
      setSearchQuery('');
    }
    
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setNavigation(newNav);
  };

  // Extra safety: reset filters when navigation state changes
  useEffect(() => {
    setShowIgnoredOnly(false);
    setIsReordering(false);
  }, [navigation.state, navigation.category]);

  // Reset to home view when Inventory tab is pressed
  useEffect(() => {
    const unsubscribe = (navigationObj as any).addListener('tabPress', (e: any) => {
      // Use InteractionManager to wait for the tab press interaction to settle
      InteractionManager.runAfterInteractions(() => {
        setNavigationFluid(prevNav => {
          if (prevNav.state !== 'home') {
             // Force restore tab bar when jumping home
             navigationObj.getParent()?.setOptions({
               tabBarStyle: {
                 backgroundColor: theme.colors.surface,
                 borderTopWidth: 0,
                 height: 65,
                 paddingBottom: 10,
                 paddingTop: 10,
                 position: 'absolute',
                 bottom: 20,
                 left: 20,
                 right: 20,
                 borderRadius: 32,
                 elevation: 8,
               }
             });
             return { state: 'home' };
          }
          setIsReordering(false);
          return prevNav;
        });
      });
    });

    return unsubscribe;
  }, [navigationObj, theme]);

  const loadInventoryData = () => {
    const items = inventoryManager.getVisibleInventoryItems().map(it => {
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

  const getTotalItems = () => inventoryItems.filter(item => !item.isIgnored).length;
  
  const getLowStockCount = () => inventoryItems.filter(item => !item.isIgnored && item.quantity <= 0.25).length;

  const getItemsForCategory = (category: InventoryCategory): InventoryItem[] => {
    return inventoryItems.filter(item => {
      const subcategoryConfig = SUBCATEGORY_CONFIG[item.subcategory];
      return subcategoryConfig.category === category;
    });
  };

  const handleAddSubcategory = async () => {
    try {
      if (!newSubName.trim() || !newSubIcon || !navigation.category) return;

      if (editingSubId) {
        if (editingSubId.startsWith('builtin:')) {
          const builtinName = editingSubId.replace('builtin:', '');
          // Promote builtin to custom (migrates items)
          await inventoryManager.promoteBuiltinToCustom(
            builtinName,
            newSubName,
            newSubIcon,
            theme.colors.primary,
            navigation.category
          );
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
    } catch (err: any) {
      setSnackbarMessage(err.message);
      setSnackbarVisible(true);
    }
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
    const subItems = inventoryItems
      .filter(item => item.subcategory === subcategory)
      .sort((a, b) => (a.order ?? 999999) - (b.order ?? 999999));
      
    if (showIgnoredOnly) {
      return subItems.filter(item => item.isIgnored);
    }
    return subItems.filter(item => !item.isIgnored);
  };

  const handleToggleIgnore = useCallback((item: InventoryItem) => {
    setHidingItem(item);
  }, []);

  const onConfirmToggleIgnore = async () => {
    if (!hidingItem) return;
    try {
      const itemId = hidingItem.id;
      setHidingItem(null);
      
      // Use InteractionManager to ensure the dialog unmounting finishes 
      // before starting the list removal animation to prevent shadow collisions
      InteractionManager.runAfterInteractions(async () => {
        LayoutAnimation.configureNext({
          duration: 200,
          update: { type: LayoutAnimation.Types.easeInEaseOut },
          delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
        });
        await inventoryManager.toggleItemIgnore(itemId);
      });
    } catch (err: any) {
      setSnackbarMessage(err.message);
      setSnackbarVisible(true);
      setHidingItem(null);
    }
  };

  const handleQuantityUpdate = useCallback(async (item: InventoryItem, newQuantity: number) => {
    pendingUpdatesRef.current[item.id] = newQuantity;
    setInventoryItems(prev => prev.map(it => it.id === item.id ? { ...it, quantity: newQuantity } : it));

    try {
      await inventoryManager.updateItemQuantity(item.id, newQuantity);
      delete pendingUpdatesRef.current[item.id];
    } catch (err) {
      delete pendingUpdatesRef.current[item.id];
      loadInventoryData();
    }
  }, []);



  const handleAddItem = async () => {
    try {
      if (!newItemName.trim() || !navigation.subcategory) return;
      
      await inventoryManager.addCustomItem(newItemName.trim(), navigation.subcategory);
      setNewItemName('');
      setShowingAddDialog(false);
    } catch (err: any) {
      setSnackbarMessage(err.message);
      setSnackbarVisible(true);
    }
  };

  const handleEditItem = async (id: string, name: string) => {
    try {
      if (!name.trim()) return;
      
      await inventoryManager.updateItemName(id, name.trim());
      setEditingItem(null);
      setEditedName('');
    } catch (err: any) {
      setSnackbarMessage(err.message);
      setSnackbarVisible(true);
    }
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

  const renderCategoryCard = useCallback((category: InventoryCategory) => {
    const config = CATEGORY_CONFIG[category];
    const subcategories = inventoryManager.getSubcategoriesForCategory(category);
    const allCategoryItems = inventoryManager.getItemsForCategory(category).filter(item => !item.isIgnored);
    const itemsCount = allCategoryItems.length;
    const lowStockCount = allCategoryItems.filter(it => it.quantity <= 0.25).length;

    return (
      <Card
        key={category}
        style={[styles.categoryCard, { width: cardWidth }]}
        onPress={() => setNavigationFluid({ state: 'category', category })}
      >
        <Card.Content style={styles.categoryCardContent}>
          <Icon
            name={config.icon as any}
            size={screen.isSmall ? 36 : screen.isMedium ? 40 : 44}
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
          {lowStockCount > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
              <Icon name="alert-circle" size={14} color={theme.colors.error} />
              <Text style={{ marginLeft: 3, fontSize: fs.xs, color: theme.colors.error, fontWeight: '600' }}>
                {lowStockCount} need restock
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  }, [cardWidth, theme]);

const SubcategoryRow = React.memo(({ subName, navigation, theme, activeCount, hiddenCount, lowStockCount, config, onDelete, onEdit, setNavigationFluid }: any) => {
  const swipeableRef = useRef<Swipeable>(null);

  const closeSwipeable = () => {
    swipeableRef.current?.close();
  };

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    const trans = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 80],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.swipeAction, styles.deleteAction, { transform: [{ translateX: trans }] }]}>
        <TouchableOpacity style={styles.swipeActionButton} onPress={() => {
          closeSwipeable();
          onDelete(subName);
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
        <TouchableOpacity style={styles.swipeActionButton} onPress={() => {
          closeSwipeable();
          onEdit(subName);
        }}>
          <Icon name="pencil" size={20} color="#fff" />
          <Text style={styles.swipeActionText}>Edit</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      key={subName}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      overshootRight={false}
      overshootLeft={false}
      activeOffsetX={[-50, 50]}
      containerStyle={{ overflow: 'visible' }}
      childrenContainerStyle={{ overflow: 'visible' }}
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
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.subcategoryStats, { color: theme.colors.onSurfaceVariant }]}>
                {activeCount} items
              </Text>
            </View>
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
});

  const handleIncrementQuantity = useCallback(async (item: InventoryItem) => {
    const newQuantity = Math.min(1, item.quantity + 0.01); 
    await handleQuantityUpdate(item, newQuantity);
  }, [handleQuantityUpdate]);

  const handleDecrementQuantity = useCallback(async (item: InventoryItem) => {
    const newQuantity = Math.max(0, item.quantity - 0.01); 
    await handleQuantityUpdate(item, newQuantity);
  }, [handleQuantityUpdate]);

  const confirmDelete = useCallback((item: InventoryItem) => {
    setDeleteConfirmItem(item);
  }, []);

  const confirmEdit = useCallback((item: InventoryItem) => {
    setEditingItem(item);
    setEditedName(item.name);
  }, []);

  const handleConfirmDelete = async () => {
    if (deleteConfirmItem) {
      await inventoryManager.removeItem(deleteConfirmItem.id);
      setDeleteConfirmItem(null);
    }
  };

  const renderItemRow = (item: InventoryItem, isSearch: boolean = false) => {
    return (
      <InventoryItemRow
        key={item.id}
        item={item}
        theme={theme}
        onIncrement={handleIncrementQuantity}
        onDecrement={handleDecrementQuantity}
        onUpdate={handleQuantityUpdate}
        onDelete={confirmDelete}
        onEdit={confirmEdit}
        onToggleIgnore={handleToggleIgnore}
        isSearch={isSearch}
      />
    );
  };

  const searchOpacity = useRef(new Animated.Value(0)).current;

  const openSearch = () => {
    setIsSearchVisible(true);
    sheetTranslateY.setValue(height);
    searchOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(searchOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(sheetTranslateY, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true })
    ]).start();
  };

  const closeSearch = () => {
    Animated.parallel([
      Animated.timing(searchOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(sheetTranslateY, { toValue: height, duration: 200, useNativeDriver: true })
    ]).start(() => {
      setIsSearchVisible(false);
      setSearchQuery('');
    });
  };

  useEffect(() => {
    if (isSearchVisible) {
      const handle = InteractionManager.runAfterInteractions(() => {
        const focusInput = () => {
          if (searchInputRef.current) searchInputRef.current.focus();
        };
        focusInput();
        setTimeout(focusInput, 100);
      });
      return () => handle.cancel();
    }
  }, [isSearchVisible]);

  useEffect(() => { itemsRef.current = inventoryItems; }, [inventoryItems]);

  const filterItems = (query: string, items: InventoryItem[]) => {
    return items.filter(item => 
      item.name.toLowerCase().includes(query.toLowerCase()) || 
      (item.isIgnored && item.name.toLowerCase().includes(query.toLowerCase()))
    );
  };

  // Debounced search on query change
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      // Use ref to get latest items to avoid stale closures if data updates during debounce
      setSearchResults(filterItems(searchQuery, itemsRef.current));
      setIsSearching(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]); 

  // Immediate update on data change (silent, no loader)
  useEffect(() => {
    if (searchQuery.trim()) {
      setSearchResults(filterItems(searchQuery, inventoryItems));
    }
  }, [inventoryItems]); // Removed searchQuery from deps to prevent re-run on typing (already handled above)


  const renderHomeScreen = () => {
    return (
      <View 
        key="home-screen" 
        style={{ flex: 1, backgroundColor: theme.colors.background }} 
        collapsable={false}
        needsOffscreenAlphaCompositing={true}
      >
        <DoodleBackground />
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
          <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={openSearch}
            style={[
              styles.searchPlaceholder, 
              { 
                backgroundColor: theme.dark ? theme.colors.elevation.level2 : '#fff',
                elevation: 1, // Keep it minimal to avoid flash on transition
              }
            ]}
          >
             <Icon name="magnify" size={24} color={theme.colors.onSurfaceVariant} />
             <Text style={{ marginLeft: 12, color: theme.colors.onSurfaceVariant, fontSize: 16 }}>Search items...</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: 110 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          keyboardShouldPersistTaps="handled"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          removeClippedSubviews={true}
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
      </View>
    );
  };

  const renderCategoryScreen = () => {
    if (!navigation.category) return null;
    
    const config = getCategoryConfig(navigation.category);
    const subcategories = inventoryManager.getSubcategoriesForCategory(navigation.category);

    const renderDraggableSubcategory = ({ item, drag, isActive }: RenderItemParams<InventorySubcategory>) => {
      const subName = item;
      const subItems = getItemsForSubcategory(subName as InventorySubcategory);
      const lowStockCount = subItems.filter(it => it.quantity <= 0.25).length;
      const config = inventoryManager.getSubcategoryConfig(subName as InventorySubcategory);

      return (
        <ScaleDecorator>
          <TouchableOpacity
            onLongPress={drag}
            disabled={isActive}
            style={[
              styles.subcategoryCard, 
              { backgroundColor: isActive ? theme.colors.elevation.level3 : theme.colors.surface, transform: isActive ? [{scale: 1.05}] : [] }
            ]}
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
                  {subItems.length} items
                </Text>
                {lowStockCount > 0 && (
                  <Text style={[styles.subcategoryStats, { color: theme.colors.error, fontWeight: '600' }]}>
                    {lowStockCount} need restocking
                  </Text>
                )}
              </View>
              <Icon name="drag" size={24} color={theme.colors.onSurfaceVariant} />
            </Card.Content>
          </TouchableOpacity>
        </ScaleDecorator>
      );
    };
    
    return (
      <View 
        key={`category-${navigation.category}`} 
        style={[styles.container, { backgroundColor: theme.colors.background }]} 
        collapsable={false}
        needsOffscreenAlphaCompositing={true}
      >
        <DoodleBackground />
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => setNavigationFluid({ state: 'home' })}
          />
          <Title style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
            {navigation.category}
          </Title>
          <View style={{ flexDirection: 'row' }}>
            <IconButton
              icon={isReordering ? "check" : "sort-variant"}
              size={24}
              onPress={() => setIsReordering(!isReordering)}
            />
            {!isReordering && (
              <IconButton
                icon="plus"
                size={24}
                onPress={openSubAddDialog}
              />
            )}
          </View>
        </View>
        {isReordering ? (
          <DraggableFlatList
            data={subcategories}
            onDragEnd={({ data }) => {
              if (navigation.category) {
                 inventoryManager.updateSubcategoryOrder(navigation.category, data as string[]);
              }
            }}
            keyExtractor={(item) => item}
            renderItem={renderDraggableSubcategory}
            containerStyle={styles.container}
            contentContainerStyle={{ paddingBottom: 110, padding: 16 }}
          />
        ) : (
          <ScrollView
            style={styles.scrollView}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            removeClippedSubviews={true}
            contentContainerStyle={{ paddingBottom: 180 }}
          >
            <View style={styles.subcategoriesList}>
              {subcategories.map(subName => {
                const allSubItems = inventoryItems.filter(item => item.subcategory === subName);
                const activeCount = allSubItems.filter(it => !it.isIgnored).length;
                const hiddenCount = allSubItems.filter(it => it.isIgnored).length;
                const items = getItemsForSubcategory(subName as InventorySubcategory);
                const lowStockCount = allSubItems.filter(it => !it.isIgnored && it.quantity <= 0.25).length;
                const config = inventoryManager.getSubcategoryConfig(subName as InventorySubcategory);
                return (
                  <SubcategoryRow
                    key={subName}
                    subName={subName}
                    navigation={navigation}
                    theme={theme}
                    items={items}
                    activeCount={activeCount}
                    hiddenCount={hiddenCount}
                    lowStockCount={lowStockCount}
                    config={config}
                    onDelete={setSubToDeleteId}
                    onEdit={openSubEditDialog}
                    setNavigationFluid={setNavigationFluid}
                  />
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>
    );
  };

  const renderSubcategoryScreen = () => {
    if (!navigation.subcategory) return null;

    const items = getItemsForSubcategory(navigation.subcategory);

    const renderDraggableItem = ({ item, drag, isActive }: RenderItemParams<InventoryItem>) => {
      const stockColor = getStockColor(item.quantity, theme.dark);
      return (
        <ScaleDecorator>
             <TouchableOpacity
               onLongPress={drag}
               disabled={isActive}
               style={[
                 styles.itemCard, 
                 { 
                   backgroundColor: isActive ? theme.colors.elevation.level3 : theme.colors.surface,
                   transform: isActive ? [{scale: 1.05}] : [] 
                 }
               ]}
             >
               <Card.Content style={styles.compactItemContent}>
                 <View style={styles.itemHeaderCompact}>
                   <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                     <Icon name="drag" size={24} color={theme.colors.onSurfaceVariant} style={{marginRight: 12}} />
                     <Text 
                       style={[
                         styles.itemTitle, 
                         { 
                           color: theme.colors.onSurface,
                            textDecorationLine: 'none',
                            opacity: item.isIgnored ? 0.5 : 1
                         }
                       ]}
                       numberOfLines={2}
                     >
                       {item.name}
                     </Text>
                   </View>
                   <Text style={[styles.itemPercentage, { color: stockColor }]}>
                     {Math.round(item.quantity * 100)}%
                   </Text>
                 </View>
                {/* Simplified controls for drag mode */}
               </Card.Content>
             </TouchableOpacity>
        </ScaleDecorator>
      );
    };

    return (
      <View 
        key={`subcat-${navigation.subcategory}`} 
        style={[styles.container, { backgroundColor: theme.colors.background }]} 
        collapsable={false}
        needsOffscreenAlphaCompositing={true}
      >
        <DoodleBackground />
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => {
              setNavigationFluid({ state: 'category', category: navigation.category });
              setShowIgnoredOnly(false); // Reset ignored filter when going back
            }}
          />
          <Title style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
            {navigation.subcategory}
          </Title>
          <View style={{ flexDirection: 'row' }}>
            <IconButton
              icon={isReordering ? "check" : "sort-variant"}
              size={24}
              onPress={() => setIsReordering(!isReordering)}
            />
            {!isReordering && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <IconButton
                    icon={showIgnoredOnly ? "eye-off" : "eye-off-outline"}
                    size={24}
                    iconColor={showIgnoredOnly ? theme.colors.error : theme.colors.onSurfaceVariant}
                    onPress={() => setShowIgnoredOnly(!showIgnoredOnly)}
                    style={{ marginRight: -4 }}
                  />
                  {(() => {
                    const subItems = inventoryItems.filter(it => it.subcategory === navigation.subcategory);
                    const hiddenCount = subItems.filter(it => it.isIgnored).length;
                    return hiddenCount > 0 ? (
                      <Text style={{ 
                        fontSize: 12, 
                        color: showIgnoredOnly ? theme.colors.error : theme.colors.onSurfaceVariant,
                        fontWeight: '600',
                        marginRight: 4
                      }}>
                        {hiddenCount}
                      </Text>
                    ) : null;
                  })()}
                </View>
                <IconButton
                  icon="plus"
                  size={24}
                  onPress={() => setShowingAddDialog(true)}
                />
              </View>
            )}
          </View>
        </View>
        {isReordering ? (
          <DraggableFlatList
            data={items}
            onDragEnd={({ data }) => {
              const updates = data.map((item, index) => ({ id: item.id, order: index }));
              inventoryManager.updateItemOrder(updates);
            }}
            keyExtractor={(item) => item.id}
            renderItem={renderDraggableItem}
            containerStyle={styles.container}
            contentContainerStyle={{ paddingBottom: 110, padding: 16 }}
          />
        ) : (
          <ScrollView
            key="items-scroll"
            style={styles.scrollView}
            contentContainerStyle={{ paddingBottom: 180, padding: 16 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            removeClippedSubviews={false} // Disable clipping to prevent shadow artifacts during removal
          >
            {items.map(item => renderItemRow(item))}
          </ScrollView>
        )}
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



  const renderEditItemDialog = () => {
    // We use a ref and uncontrolled input to prevent cursor jumping issues during typing
    // caused by re-renders of the parent component.
    const editNameRef = useRef('');
    
    // We need a wrapper component to hold the ref and logic, 
    // ensuring it persists across parent re-renders but resets on new item.
    // However, since we are inside the parent render function, we can't define a component here.
    // We can use a key on the TextInput to force a reset when the item changes.
    // But we need to capture the text for saving.
    
    // Better approach: Use a variable that persists current text if the ID matches?
    // No, simplest is: Uncontrolled with callback updating a Ref that is stored in the Parent (InventoryScreen).
    // Let's create a Ref in InventoryScreen scope? 
    // Actually, `editedName` STATE causes the re-render loop.
    // If we remove `editedName` FROM STATE and use a Ref, NO RE-RENDER happens on typing!
    
    // So, I will remove `editedName` state usage from `TextInput`.
    // I will use `newItemName` style but with a Ref.
    
    // Wait, `InventoryScreen` has `editedName` State.
    // I should change `editedName` to NOT be state, but just a variable/ref?
    // But I need to know if "Save" button is disabled (empty string).
    // So I need state for "isSaveEnabled".
    
    return (
      <Portal>
        <Dialog visible={!!editingItem} onDismiss={() => setEditingItem(null)}>
          <Dialog.Title>Edit Item</Dialog.Title>
          <Dialog.Content>
             {/* We use an internal component or just a key-ed TextInput to reset state */}
             <EditItemInput 
                initialValue={editingItem?.name || ''} 
                onSave={(newName) => {
                   if (editingItem) {
                     handleEditItem(editingItem.id, newName);
                   }
                }}
                onCancel={() => setEditingItem(null)}
             />
          </Dialog.Content>
        </Dialog>
      </Portal>
    );
  };

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
        <View style={{ padding: 16, gap: 12 }}>
          <Button 
            mode="contained" 
            onPress={handleContinueShopping}
            style={{ borderRadius: 8 }}
          >
            Continue Current Trip
          </Button>
          <Button 
            mode="outlined" 
            onPress={handleStartFreshShopping} 
            textColor={theme.colors.error}
            style={{ borderRadius: 8, borderColor: theme.colors.error }}
          >
            Start New List
          </Button>
          <Button 
            mode="text" 
            onPress={() => setShowingShoppingDialog(false)}
            textColor={theme.colors.onSurfaceVariant}
          >
            Cancel
          </Button>
        </View>
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
    const scale = fabAnimation;
    const translateY = fabAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [100, 0]
    });

    const onFabGestureEvent = (event: any) => {
      const { translationY } = event.nativeEvent;
      if (translationY > 20 && isFabVisible) {
        // Swipe Down -> Hide
        setIsFabVisible(false);
        Animated.timing(fabAnimation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true
        }).start();
        navigationObj.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });
      } else if (translationY < -20 && !isFabVisible) {
        // Swipe Up -> Show
        setIsFabVisible(true);
        Animated.spring(fabAnimation, {
          toValue: 1,
          useNativeDriver: true,
          tension: 40,
          friction: 7
        }).start();
        navigationObj.getParent()?.setOptions({
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopWidth: 0,
            height: 65,
            paddingBottom: 10,
            paddingTop: 10,
            position: 'absolute',
            bottom: 20,
            left: 20,
            right: 20,
            borderRadius: 32,
            elevation: 8,
          }
        });
      }
    };

    return (
      <PanGestureHandler onGestureEvent={onFabGestureEvent} activeOffsetY={[-10, 10]}>
        <View 
          style={{ 
              position: 'absolute', 
              right: fabDims.right - 10, // Extend hit area slightly
              bottom: fabDims.bottom - 10,
              width: 80, // Fixed width hit area
              height: 160, // Fixed height hit area covering both FABs positions
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: 10, // Compensate for right offset
              paddingBottom: 10,
              zIndex: 90, // Ensure it's above content but below dialogs
              // backgroundColor: 'rgba(255,0,0,0.2)', // Debug color
          }}
        >
          <Animated.View 
            style={{ 
                alignItems: 'center',
                transform: [{ translateY }, { scale }]
            }}
          >
            {/* Search FAB */}
            <FAB
              icon="magnify"
              style={{ 
                backgroundColor: theme.colors.surface, 
                marginBottom: 12, 
                borderRadius: 28,
                elevation: 4
              }}
              color={theme.colors.onSurface}
              onPress={openSearch}
              small
            />
            {/* Shopping Cart FAB */}
            <FAB
              icon="auto-fix"
              style={{ 
                backgroundColor: theme.colors.primary, 
                borderRadius: 28,
                elevation: 4
              }}
              color={theme.dark ? '#000' : '#fff'}
              onPress={handleStartShopping}
            />
          </Animated.View>
        </View>
      </PanGestureHandler>
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
            Are you sure you want to delete "{subToDeleteId}"? All items inside it will also be deleted.
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setSubToDeleteId(null)}>Cancel</Button>
          <Button onPress={handleConfirmSubDelete} textColor={theme.colors.error}>Delete</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );



  const renderHideConfirmDialog = () => {
    if (!hidingItem) return null;
    const action = hidingItem.isIgnored ? 'Unhide' : 'Hide';
    const message = hidingItem.isIgnored
      ? `Are you sure you want to unhide "${hidingItem.name}"? It will appear in your active inventory and restocking alerts.`
      : `Are you sure you want to hide "${hidingItem.name}"? It will no longer appear in your active inventory or restocking alerts.`;
    
    return (
      <Portal>
        <Dialog visible={!!hidingItem} onDismiss={() => setHidingItem(null)}>
          <Dialog.Title>{action} Item</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: theme.colors.onSurface }}>{message}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setHidingItem(null)}>Cancel</Button>
            <Button 
              onPress={onConfirmToggleIgnore} 
              textColor={hidingItem.isIgnored ? theme.colors.primary : theme.colors.error}
            >
              {action}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    );
  };

  const renderSearchOverlay = () => {
    if (!isSearchVisible) return null;

    const onHandlerStateChange = (event: any) => {
      if (event.nativeEvent.state === State.END) {
        if (event.nativeEvent.translationY > 80) {
          closeSearch();
        } else {
          // Snap back if not dragged enough
          Animated.spring(sheetTranslateY, { toValue: 0, useNativeDriver: true }).start();
        }
      }
    };

    return (
      <Portal>
        <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 1000, opacity: searchOpacity }]}>
          <TouchableOpacity 
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} 
            activeOpacity={1} 
            onPress={closeSearch}
          />
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <GestureHandlerRootView style={{ height: '94%' }}>
             <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
              <Animated.View style={{ 
                flex: 1, 
                backgroundColor: theme.colors.elevation?.level1 || theme.colors.surface, 
                borderTopLeftRadius: 28, 
                borderTopRightRadius: 28,
                transform: [{ translateY: sheetTranslateY }],
                ...commonStyles.shadow,
                elevation: 16, // Reduced from 24 to minimize Android residue
                overflow: 'hidden' // Important for clipping clean edges
              }}>
                <PanGestureHandler
                  onGestureEvent={Animated.event([{ nativeEvent: { translationY: sheetTranslateY } }], { useNativeDriver: true })}
                  onHandlerStateChange={onHandlerStateChange}
                  activeOffsetY={[-10, 10]}
                >
                  <View>
                    <View style={{ alignItems: 'center', paddingVertical: 18, width: '100%' }}>
                      <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: theme.colors.onSurfaceVariant, opacity: 0.3 }} />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 }}>
                      <Searchbar
                        ref={searchInputRef}
                        autoFocus={true}
                        placeholder="Search items..."
                        onChangeText={setSearchQuery}
                        value={searchQuery}
                        style={[styles.searchBar, { flex: 1, backgroundColor: theme.dark ? theme.colors.elevation?.level3 : theme.colors.surfaceVariant }]}
                        elevation={0}
                      />
                      <IconButton icon="close-circle-outline" size={24} onPress={closeSearch} style={{ marginLeft: 4 }} />
                    </View>
                  </View>
                </PanGestureHandler>
                
                <GHScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
                  {isSearching ? (
                            <View style={{ padding: 32, alignItems: 'center' }}>
                              <ActivityIndicator size="large" color={theme.colors.primary} />
                              <Text style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>Searching...</Text>
                            </View>
                          ) : (
                    searchQuery.trim() ? (
                      <>
                        <Text style={{ marginVertical: 8, color: theme.colors.onSurfaceVariant }}>Found {searchResults.length} results</Text>
                        {searchResults.map(item => renderItemRow(item, true))}
                      </>
                    ) : (
                      <View style={{ alignItems: 'center', marginTop: 60, opacity: 0.3 }}>
                        <Icon name="magnify" size={64} color={theme.colors.onSurfaceVariant} />
                        <Text style={{ marginTop: 12 }}>Search your inventory</Text>
                      </View>
                    )
                  )}
                </GHScrollView>
              </Animated.View>
             </KeyboardAvoidingView>
            </GestureHandlerRootView>
          </View>
        </Animated.View>
      </Portal>
    );
  };

  const mainContent = React.useMemo(() => {
    // Return the appropriate screen content based on navigation state
    // We memoize this to prevent re-rendering the heavy list when dialogs (like edit item) update state
    if (navigation.state === 'home') return renderHomeScreen();
    if (navigation.state === 'category') return renderCategoryScreen();
    if (navigation.state === 'subcategory') return renderSubcategoryScreen();
    return null;
  }, [navigation.state, navigation.category, navigation.subcategory, inventoryItems, refreshing, isReordering, theme, searchQuery, isSearchVisible, showIgnoredOnly, isFabVisible]);

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {mainContent}

      {renderSearchOverlay()}

      {renderFloatingActionButton()}
      {renderAddItemDialog()}
      {renderEditItemDialog()}
      {renderDeleteConfirmDialog()}
      {renderShoppingConfirmDialog()}
      {renderSuccessDialog()}
      {renderSubAddDialog()}
      {renderSubDeleteConfirmDialog()}
      {renderHideConfirmDialog()}
      <Portal>
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
          action={{
            label: 'OK',
            onPress: () => setSnackbarVisible(false),
          }}
          style={{ zIndex: 10000, elevation: 100, marginBottom: 120 }}
        >
          {snackbarMessage}
        </Snackbar>
      </Portal>
    </GestureHandlerRootView>
  );
};


export default InventoryScreen;