import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Dimensions,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Text,
  useTheme,
  ProgressBar,
  Surface,
  List,
} from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { inventoryManager } from '../managers/InventoryManager';
import { settingsManager } from '../managers/SettingsManager';
import { InventoryItem, InventoryCategory } from '../models/Types';
import { CATEGORY_CONFIG, getAllCategories } from '../constants/CategoryConfig';
import { getCategoryColor, commonStyles } from '../themes/AppTheme';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 2 columns with padding

const InsightsScreen: React.FC = () => {
  const theme = useTheme();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadInventoryData();

    const unsubscribeInventory = inventoryManager.addListener(() => {
      loadInventoryData();
    });

    const unsubscribeSettings = settingsManager.addListener(() => {
      loadInventoryData();
    });

    return () => {
      unsubscribeInventory();
      unsubscribeSettings();
    };
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

  // Analytics calculations
  const getTotalItems = () => inventoryItems.length;
  
  const getLowStockCount = () => inventoryItems.filter(item => item.quantity <= 0.25).length;
  
  const getAverageStockLevel = () => {
    if (inventoryItems.length === 0) return 0;
    const total = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
    return Math.round((total / inventoryItems.length) * 100);
  };
  
  const getActiveCategoriesCount = () => {
    const categories = new Set(
      inventoryItems.map(item => {
        const subcategoryConfig = CATEGORY_CONFIG[Object.keys(CATEGORY_CONFIG).find(cat => 
          CATEGORY_CONFIG[cat as InventoryCategory].subcategories.includes(item.subcategory)
        ) as InventoryCategory];
        return subcategoryConfig;
      }).filter(Boolean)
    );
    return categories.size;
  };

  const getMostRestockedItem = () => {
    if (inventoryItems.length === 0) return null;
    return inventoryItems.reduce((prev, current) => 
      (prev.purchaseHistory?.length || 0) > (current.purchaseHistory?.length || 0) ? prev : current
    );
  };

  const getLeastUsedItem = () => {
    if (inventoryItems.length === 0) return null;
    return inventoryItems.reduce((prev, current) => 
      prev.lastUpdated < current.lastUpdated ? prev : current
    );
  };

  const getDaysSinceLastUpdate = (item: InventoryItem) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - item.lastUpdated.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getItemsNeedingAttention = () => inventoryItems.filter(item => item.quantity <= 0.25);

  const getItemsForCategory = (category: InventoryCategory): InventoryItem[] => {
    const config = CATEGORY_CONFIG[category];
    return inventoryItems.filter(item => config.subcategories.includes(item.subcategory));
  };

  const renderOverviewSection = () => {
    const avgStock = getAverageStockLevel();
    const lowStock = getLowStockCount();
    const thresholds = settingsManager.getActivityThresholds();
    const staleItems = inventoryManager.getStaleItemsByThreshold(thresholds);
    
    // Group stale items by category
    const staleCategories = new Set();
    staleItems.forEach(item => {
      const config = inventoryManager.getSubcategoryConfig(item.subcategory);
      if (config) staleCategories.add(config.category);
    });
    
    return (
      <View style={[styles.section, { paddingHorizontal: 16, marginBottom: 12 }]}>
        <Text variant="headlineSmall" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Inventory Overview
        </Text>
        
        <Surface 
          style={[
            styles.summaryCard, 
            { backgroundColor: theme.dark ? theme.colors.surfaceVariant : theme.colors.primary, marginBottom: 16 }
          ]} 
          elevation={theme.dark ? 1 : 4}
        >
          <View style={styles.summaryHeader}>
            <View>
              <Text style={[styles.summaryLabel, { color: theme.dark ? theme.colors.onSurfaceVariant : 'rgba(255,255,255,0.8)' }]}>
                Overall Stock Health
              </Text>
              <Text style={[styles.summaryValue, { color: theme.dark ? theme.colors.primary : '#FFFFFF' }]}>
                {avgStock}%
              </Text>
            </View>
            <Icon 
              name="chart-arc" 
              size={48} 
              color={theme.dark ? theme.colors.primary + '40' : 'rgba(255,255,255,0.8)'} 
            />
          </View>
          <ProgressBar 
            progress={avgStock / 100} 
            color={theme.dark ? theme.colors.primary : '#FFFFFF'} 
            style={[styles.summaryProgress, { backgroundColor: theme.dark ? theme.colors.surface : 'rgba(255,255,255,0.2)' }]} 
          />
          <View style={styles.summaryStats}>
            <View style={styles.summaryStatItem}>
              <Text style={[styles.summaryStatValue, { color: theme.dark ? theme.colors.onSurface : '#FFFFFF' }]}>
                {getTotalItems()}
              </Text>
              <Text style={[styles.summaryStatLabel, { color: theme.dark ? theme.colors.onSurfaceVariant : 'rgba(255,255,255,0.7)' }]}>
                Total Items
              </Text>
            </View>
            <View style={[styles.summaryStatDivider, { backgroundColor: theme.dark ? theme.colors.outlineVariant : 'rgba(255,255,255,0.2)' }]} />
            <View style={styles.summaryStatItem}>
              <Text style={[styles.summaryStatValue, { color: theme.dark ? theme.colors.onSurface : '#FFFFFF' }]}>
                {lowStock}
              </Text>
              <Text style={[styles.summaryStatLabel, { color: theme.dark ? theme.colors.onSurfaceVariant : 'rgba(255,255,255,0.7)' }]}>
                Low Stock
              </Text>
            </View>
            <View style={[styles.summaryStatDivider, { backgroundColor: theme.dark ? theme.colors.outlineVariant : 'rgba(255,255,255,0.2)' }]} />
            <View style={styles.summaryStatItem}>
              <Text style={[styles.summaryStatValue, { color: theme.dark ? theme.colors.onSurface : '#FFFFFF' }]}>
                {getActiveCategoriesCount()}
              </Text>
              <Text style={[styles.summaryStatLabel, { color: theme.dark ? theme.colors.onSurfaceVariant : 'rgba(255,255,255,0.7)' }]}>
                Categories
              </Text>
            </View>
          </View>
        </Surface>

        <Surface 
          style={[
            styles.summaryCard, 
            { backgroundColor: theme.dark ? theme.colors.surfaceVariant : theme.colors.secondary }
          ]} 
          elevation={theme.dark ? 1 : 4}
        >
          <View style={styles.summaryHeader}>
            <View>
              <Text style={[styles.summaryLabel, { color: theme.dark ? theme.colors.onSurfaceVariant : 'rgba(255,255,255,0.8)' }]}>
                Integrity & Freshness
              </Text>
              <Text style={[styles.summaryValue, { color: theme.dark ? theme.colors.secondary : '#FFFFFF' }]}>
                {staleItems.length > 0 ? 'Attention' : 'Healthy'}
              </Text>
            </View>
            <Icon 
              name="heart-pulse" 
              size={48} 
              color={theme.dark ? theme.colors.secondary + '40' : 'rgba(255,255,255,0.8)'} 
            />
          </View>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStatItem}>
              <Text style={[styles.summaryStatValue, { color: theme.dark ? theme.colors.onSurface : '#FFFFFF' }]}>
                {staleItems.length}
              </Text>
              <Text style={[styles.summaryStatLabel, { color: theme.dark ? theme.colors.onSurfaceVariant : 'rgba(255,255,255,0.7)' }]}>
                Stale Items
              </Text>
            </View>
            <View style={[styles.summaryStatDivider, { backgroundColor: theme.dark ? theme.colors.outlineVariant : 'rgba(255,255,255,0.2)' }]} />
            <View style={styles.summaryStatItem}>
              <Text style={[styles.summaryStatValue, { color: theme.dark ? theme.colors.onSurface : '#FFFFFF' }]}>
                {staleCategories.size}
              </Text>
              <Text style={[styles.summaryStatLabel, { color: theme.dark ? theme.colors.onSurfaceVariant : 'rgba(255,255,255,0.7)' }]}>
                Stale Cats
              </Text>
            </View>
            <View style={[styles.summaryStatDivider, { backgroundColor: theme.dark ? theme.colors.outlineVariant : 'rgba(255,255,255,0.2)' }]} />
            <View style={styles.summaryStatItem}>
              <Text style={[styles.summaryStatValue, { color: theme.dark ? theme.colors.onSurface : '#FFFFFF' }]}>
                {Math.round((1 - (staleItems.length / (inventoryItems.length || 1))) * 100)}%
              </Text>
              <Text style={[styles.summaryStatLabel, { color: theme.dark ? theme.colors.onSurfaceVariant : 'rgba(255,255,255,0.7)' }]}>
                Freshness
              </Text>
            </View>
          </View>
        </Surface>
      </View>
    );
  };

  const renderUsagePatternsSection = () => {
    const mostRestocked = getMostRestockedItem();
    const leastUsed = getLeastUsedItem();

    return (
      <View style={styles.patternsList}>
        <Card style={styles.patternCard} mode="contained">
          <Card.Content style={styles.patternContent}>
            <View style={[styles.patternIconContainer, { backgroundColor: theme.dark ? 'rgba(46, 125, 50, 0.2)' : '#E8F5E9' }]}>
              <Icon name="trending-up" size={24} color={theme.dark ? '#81C784' : '#2E7D32'} />
            </View>
            <View style={styles.patternInfo}>
              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>Most Restocked</Text>
              <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                {mostRestocked?.name || 'No data yet'}
              </Text>
            </View>
            <View style={[styles.patternBadge, { backgroundColor: theme.dark ? 'rgba(46, 125, 50, 0.3)' : '#E8F5E9' }]}>
              <Text style={[styles.patternBadgeText, { color: theme.dark ? '#81C784' : '#2E7D32' }]}>
                {mostRestocked ? `${mostRestocked.purchaseHistory?.length || 0}x` : '-'}
              </Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.patternCard} mode="contained">
          <Card.Content style={styles.patternContent}>
            <View style={[styles.patternIconContainer, { backgroundColor: theme.dark ? 'rgba(239, 108, 0, 0.2)' : '#FFF3E0' }]}>
              <Icon name="clock-alert-outline" size={24} color={theme.dark ? '#FFB74D' : '#EF6C00'} />
            </View>
            <View style={styles.patternInfo}>
              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>Least Used</Text>
              <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                {leastUsed?.name || 'No data yet'}
              </Text>
            </View>
            <Text variant="bodySmall" style={{ color: theme.dark ? '#FFB74D' : '#EF6C00', fontWeight: '700' }}>
              {leastUsed ? `${getDaysSinceLastUpdate(leastUsed)}d` : ''}
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  };

  const renderFreshnessAnalysisSection = () => {
    const thresholds = settingsManager.getActivityThresholds();
    const staleItems = inventoryManager.getStaleItemsByThreshold(thresholds);
    
    const staleByCategory: Record<string, InventoryItem[]> = {};
    staleItems.forEach(item => {
      const config = inventoryManager.getSubcategoryConfig(item.subcategory);
      if (config) {
        if (!staleByCategory[config.category]) {
          staleByCategory[config.category] = [];
        }
        staleByCategory[config.category].push(item);
      }
    });

    return (
      <View style={styles.freshnessContainer}>
        {Object.values(InventoryCategory).map(category => {
          const items = staleByCategory[category] || [];
          const config = CATEGORY_CONFIG[category];
          const threshold = thresholds[category];
          
          return (
            <Card key={category} style={styles.freshnessCard} mode="contained">
              <Card.Content style={styles.freshnessContent}>
                <View style={[styles.freshnessIconContainer, { backgroundColor: config.color + '15' }]}>
                  <Icon name={config.icon as any} size={24} color={config.color} />
                </View>
                <View style={styles.freshnessInfo}>
                  <Text style={[styles.freshnessTitle, { color: theme.colors.onSurface }]}>{category}</Text>
                  <Text style={[styles.freshnessSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                    Check every {threshold} days
                  </Text>
                </View>
                <View style={styles.freshnessStatus}>
                  {items.length > 0 ? (
                    <View style={[styles.staleBadge, { backgroundColor: theme.dark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2' }]}>
                      <Text style={[styles.staleBadgeText, { color: theme.dark ? '#FCA5A5' : '#EF4444' }]}>{items.length} stale</Text>
                    </View>
                  ) : (
                    <Icon name="check-circle" size={24} color={theme.dark ? '#81C784' : theme.colors.secondary} />
                  )}
                </View>
              </Card.Content>
              {items.length > 0 && (
                <Card.Actions style={styles.freshnessActions}>
                  <View style={[styles.staleItemsList, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                    <Text style={[styles.staleItemsText, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                      Needs update: {items.map(it => it.name).join(', ')}
                    </Text>
                  </View>
                </Card.Actions>
              )}
            </Card>
          );
        })}
      </View>
    );
  };

  const renderCategoryAnalysisSection = () => (
    <View style={styles.categoryList}>
      {getAllCategories().map((category) => {
        const items = getItemsForCategory(category);
        if (items.length === 0) return null;

        const lowStockCount = items.filter(item => item.quantity <= 0.25).length;
        const averageStock = items.reduce((sum, item) => sum + item.quantity, 0) / items.length;
        const config = CATEGORY_CONFIG[category];

        return (
          <Card key={category} style={styles.categoryCard} mode="outlined">
            <Card.Content style={styles.categoryContent}>
              <View style={[styles.categoryIconBox, { backgroundColor: config.color + '15' }]}>
                <Icon name={config.icon as any} size={24} color={config.color} />
              </View>
              <View style={styles.categoryInfo}>
                <View style={styles.categoryHeaderRow}>
                  <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>{category}</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{items.length} items</Text>
                </View>
                <ProgressBar 
                  progress={averageStock} 
                  color={config.color} 
                  style={styles.categoryProgress} 
                />
                <View style={styles.categoryFooterRow}>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Avg Stock: {Math.round(averageStock * 100)}%</Text>
                  {lowStockCount > 0 && (
                    <Text variant="labelSmall" style={{ color: theme.colors.error, fontWeight: '700' }}>
                      {lowStockCount} Low
                    </Text>
                  )}
                </View>
              </View>
            </Card.Content>
          </Card>
        );
      })}
    </View>
  );

  const renderShoppingInsightsSection = () => (
    <View style={styles.shoppingList}>
      <Card style={styles.shoppingCard} mode="contained">
        <Card.Content style={styles.shoppingContent}>
          <Icon name="cart" size={24} color={theme.dark ? '#64B5F6' : '#3498DB'} style={styles.shoppingIcon} />
          <View style={styles.shoppingInfo}>
            <Text style={[styles.shoppingTitle, { color: theme.colors.onSurface }]}>
              Shopping Frequency
            </Text>
            <Text style={[styles.shoppingSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              Based on restock patterns
            </Text>
          </View>
          <Text style={[styles.shoppingValue, { color: theme.dark ? '#64B5F6' : '#3498DB' }]}>
            Weekly
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.shoppingCard} mode="contained">
        <Card.Content style={styles.shoppingContent}>
          <Icon name="calendar-clock" size={24} color={theme.dark ? '#CE93D8' : '#9B59B6'} style={styles.shoppingIcon} />
          <View style={styles.shoppingInfo}>
            <Text style={[styles.shoppingTitle, { color: theme.colors.onSurface }]}>
              Next Shopping Trip
            </Text>
            <Text style={[styles.shoppingSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              Estimated based on current stock levels
            </Text>
          </View>
          <Text style={[styles.shoppingValue, { color: theme.dark ? '#CE93D8' : '#9B59B6' }]}>
            3-5 days
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.shoppingCard} mode="contained">
        <Card.Content style={styles.shoppingContent}>
          <Icon name="lightbulb" size={24} color={theme.dark ? '#FFF176' : '#F1C40F'} style={styles.shoppingIcon} />
          <View style={styles.shoppingInfo}>
            <Text style={[styles.shoppingTitle, { color: theme.colors.onSurface }]}>
              Shopping Efficiency
            </Text>
            <Text style={[styles.shoppingSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              Items typically bought together
            </Text>
          </View>
          <Text style={[styles.shoppingValue, { color: theme.dark ? '#FFF176' : '#F1C40F' }]}>
            Group by category
          </Text>
        </Card.Content>
      </Card>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {renderOverviewSection()}
        
        <List.AccordionGroup>
          <List.Accordion
            title="Health Analysis"
            left={props => <List.Icon {...props} icon="heart-pulse" color={theme.colors.primary} />}
            id="1"
            style={styles.accordionHeader}
            titleStyle={styles.accordionTitle}
          >
            {renderFreshnessAnalysisSection()}
          </List.Accordion>

          <List.Accordion
            title="Usage Patterns"
            left={props => <List.Icon {...props} icon="trending-up" color={theme.colors.primary} />}
            id="2"
            style={styles.accordionHeader}
            titleStyle={styles.accordionTitle}
          >
            {renderUsagePatternsSection()}
          </List.Accordion>

          <List.Accordion
            title="Category Deep Dive"
            left={props => <List.Icon {...props} icon="chart-donut" color={theme.colors.primary} />}
            id="3"
            style={styles.accordionHeader}
            titleStyle={styles.accordionTitle}
          >
            {renderCategoryAnalysisSection()}
          </List.Accordion>

          <List.Accordion
            title="Smart Tips"
            left={props => <List.Icon {...props} icon="lightbulb-on" color={theme.colors.primary} />}
            id="4"
            style={styles.accordionHeader}
            titleStyle={styles.accordionTitle}
          >
            {renderShoppingInsightsSection()}
          </List.Accordion>
        </List.AccordionGroup>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 85, // Space for floating tab bar
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingVertical: 8,
  },
  sectionTitle: {
    fontWeight: '900',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  summaryCard: {
    padding: 24,
    borderRadius: 32,
    ...commonStyles.shadow,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '900',
  },
  summaryProgress: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 24,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryStatItem: {
    alignItems: 'center',
  },
  summaryStatValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  summaryStatLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  summaryStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  patternsList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  patternCard: {
    borderRadius: 20,
    ...commonStyles.shadow,
  },
  patternContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  patternIconContainer: {
    padding: 12,
    borderRadius: 16,
    marginRight: 16,
  },
  patternInfo: {
    flex: 1,
  },
  patternBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  patternBadgeText: {
    color: '#2E7D32',
    fontWeight: '800',
    fontSize: 14,
  },
  categoryList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  categoryCard: {
    borderRadius: 20,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  categoryIconBox: {
    padding: 12,
    borderRadius: 16,
    marginRight: 16,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryProgress: {
    height: 6,
    borderRadius: 3,
    marginBottom: 8,
  },
  categoryFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shoppingList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  shoppingCard: {
    borderRadius: 24,
    ...commonStyles.shadow,
  },
  shoppingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  shoppingIcon: {
    marginRight: 16,
  },
  shoppingInfo: {
    flex: 1,
  },
  shoppingTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  shoppingSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
  },
  shoppingValue: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  freshnessContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  freshnessCard: {
    borderRadius: 24,
    ...commonStyles.shadow,
    marginBottom: 8,
  },
  freshnessContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  freshnessIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  freshnessInfo: {
    flex: 1,
  },
  freshnessTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  freshnessSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  freshnessStatus: {
    marginLeft: 8,
  },
  staleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  staleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  freshnessActions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
  staleItemsList: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    width: '100%',
  },
  staleItemsText: {
    fontSize: 12,
    fontWeight: '500',
  },
  accordionHeader: {
    backgroundColor: 'transparent',
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  accordionTitle: {
    fontWeight: '800',
    fontSize: 18,
  },
});

export default InsightsScreen;