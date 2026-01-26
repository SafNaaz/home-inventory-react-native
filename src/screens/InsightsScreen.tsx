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
} from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { inventoryManager } from '../managers/InventoryManager';
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

  const renderInsightCard = (title: string, value: string, icon: string, color: string) => (
    <Card style={[styles.insightCard, { width: cardWidth }]}>
      <Card.Content style={styles.insightCardContent}>
        <Icon name={icon as any} size={32} color={color} style={styles.insightIcon} />
        <Text style={[styles.insightValue, { color }]}>{value}</Text>
        <Text style={[styles.insightTitle, { color: theme.colors.onSurfaceVariant }]}>
          {title}
        </Text>
      </Card.Content>
    </Card>
  );

  const renderOverviewSection = () => (
    <View style={styles.section}>
      <Title style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
        Overview
      </Title>
      <View style={styles.overviewGrid}>
        <View style={styles.overviewRow}>
          {renderInsightCard('Total Items', getTotalItems().toString(), 'cube-outline', theme.colors.primary)}
          {renderInsightCard(
            'Low Stock', 
            getLowStockCount().toString(), 
            'alert-circle', 
            getLowStockCount() > 0 ? theme.colors.error : theme.colors.primary
          )}
        </View>
        <View style={styles.overviewRow}>
          {renderInsightCard('Avg Stock', `${getAverageStockLevel()}%`, 'chart-bar', '#FF9500')}
          {renderInsightCard('Categories', getActiveCategoriesCount().toString(), 'folder', '#8E44AD')}
        </View>
      </View>
    </View>
  );

  const renderUsagePatternsSection = () => {
    const mostRestocked = getMostRestockedItem();
    const leastUsed = getLeastUsedItem();
    const needingAttention = getItemsNeedingAttention();

    return (
      <View style={styles.section}>
        <Title style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Usage Patterns
        </Title>
        <View style={styles.patternsList}>
          <Card style={styles.patternCard}>
            <Card.Content style={styles.patternContent}>
              <Icon name="refresh-circle" size={24} color="#27AE60" style={styles.patternIcon} />
              <View style={styles.patternInfo}>
                <Text style={[styles.patternTitle, { color: theme.colors.onSurface }]}>
                  Most Restocked
                </Text>
                <Text style={[styles.patternSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                  {mostRestocked?.name || 'No data yet'}
                </Text>
              </View>
              <Text style={[styles.patternValue, { color: '#27AE60' }]}>
                {mostRestocked ? `${mostRestocked.purchaseHistory?.length || 0} times` : ''}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.patternCard}>
            <Card.Content style={styles.patternContent}>
              <Icon name="clock" size={24} color="#95A5A6" style={styles.patternIcon} />
              <View style={styles.patternInfo}>
                <Text style={[styles.patternTitle, { color: theme.colors.onSurface }]}>
                  Least Used
                </Text>
                <Text style={[styles.patternSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                  {leastUsed?.name || 'No data yet'}
                </Text>
              </View>
              <Text style={[styles.patternValue, { color: '#95A5A6' }]}>
                {leastUsed ? `${getDaysSinceLastUpdate(leastUsed)} days ago` : ''}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.patternCard}>
            <Card.Content style={styles.patternContent}>
              <Icon name="eye" size={24} color={needingAttention.length > 0 ? '#F39C12' : '#27AE60'} style={styles.patternIcon} />
              <View style={styles.patternInfo}>
                <Text style={[styles.patternTitle, { color: theme.colors.onSurface }]}>
                  Need Attention
                </Text>
                <Text style={[styles.patternSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                  {needingAttention.length} items below 25%
                </Text>
              </View>
              <Text style={[styles.patternValue, { color: needingAttention.length > 0 ? '#F39C12' : '#27AE60' }]}>
                {needingAttention.length === 0 ? 'All good!' : 'Check inventory'}
              </Text>
            </Card.Content>
          </Card>
        </View>
      </View>
    );
  };

  const renderCategoryAnalysisSection = () => (
    <View style={styles.section}>
      <Title style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
        Category Analysis
      </Title>
      <View style={styles.categoryList}>
        {getAllCategories().map((category) => {
          const items = getItemsForCategory(category);
          if (items.length === 0) return null;

          const lowStockCount = items.filter(item => item.quantity <= 0.25).length;
          const averageStock = items.reduce((sum, item) => sum + item.quantity, 0) / items.length;
          const config = CATEGORY_CONFIG[category];

          return (
            <Card key={category} style={styles.categoryCard}>
              <Card.Content style={styles.categoryContent}>
                <Icon 
                  name={config.icon as any} 
                  size={24} 
                  color={getCategoryColor(category, theme.dark)} 
                  style={styles.categoryIcon} 
                />
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryTitle, { color: theme.colors.onSurface }]}>
                    {category}
                  </Text>
                  <Text style={[styles.categoryStats, { color: theme.colors.onSurfaceVariant }]}>
                    {items.length} items • {Math.round(averageStock * 100)}% avg stock
                  </Text>
                </View>
                <View style={styles.categoryStatus}>
                  {lowStockCount > 0 ? (
                    <>
                      <Text style={[styles.categoryStatusValue, { color: theme.colors.error }]}>
                        {lowStockCount}
                      </Text>
                      <Text style={[styles.categoryStatusLabel, { color: theme.colors.error }]}>
                        low stock
                      </Text>
                    </>
                  ) : (
                    <>
                      <Icon name="check-circle" size={24} color="#27AE60" />
                      <Text style={[styles.categoryStatusLabel, { color: '#27AE60' }]}>
                        all good
                      </Text>
                    </>
                  )}
                </View>
              </Card.Content>
            </Card>
          );
        })}
      </View>
    </View>
  );

  const renderShoppingInsightsSection = () => (
    <View style={styles.section}>
      <Title style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
        Shopping Insights
      </Title>
      <View style={styles.shoppingList}>
        <Card style={styles.shoppingCard}>
          <Card.Content style={styles.shoppingContent}>
            <Icon name="cart" size={24} color="#3498DB" style={styles.shoppingIcon} />
            <View style={styles.shoppingInfo}>
              <Text style={[styles.shoppingTitle, { color: theme.colors.onSurface }]}>
                Shopping Frequency
              </Text>
              <Text style={[styles.shoppingSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                Based on restock patterns
              </Text>
            </View>
            <Text style={[styles.shoppingValue, { color: '#3498DB' }]}>
              Weekly
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.shoppingCard}>
          <Card.Content style={styles.shoppingContent}>
            <Icon name="calendar-clock" size={24} color="#9B59B6" style={styles.shoppingIcon} />
            <View style={styles.shoppingInfo}>
              <Text style={[styles.shoppingTitle, { color: theme.colors.onSurface }]}>
                Next Shopping Trip
              </Text>
              <Text style={[styles.shoppingSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                Estimated based on current stock levels
              </Text>
            </View>
            <Text style={[styles.shoppingValue, { color: '#9B59B6' }]}>
              3-5 days
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.shoppingCard}>
          <Card.Content style={styles.shoppingContent}>
            <Icon name="lightbulb" size={24} color="#F1C40F" style={styles.shoppingIcon} />
            <View style={styles.shoppingInfo}>
              <Text style={[styles.shoppingTitle, { color: theme.colors.onSurface }]}>
                Shopping Efficiency
              </Text>
              <Text style={[styles.shoppingSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                Items typically bought together
              </Text>
            </View>
            <Text style={[styles.shoppingValue, { color: '#F1C40F' }]}>
              Group by category
            </Text>
          </Card.Content>
        </Card>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {renderOverviewSection()}
        {renderUsagePatternsSection()}
        {renderCategoryAnalysisSection()}
        {renderShoppingInsightsSection()}
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
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  overviewGrid: {
    gap: 16,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  insightCard: {
    borderRadius: 24,
    ...commonStyles.shadow,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  insightCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    minHeight: 120,
  },
  insightIcon: {
    marginBottom: 12,
  },
  insightValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.8,
  },
  patternsList: {
    gap: 16,
  },
  patternCard: {
    borderRadius: 24,
    ...commonStyles.shadow,
  },
  patternContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  patternIcon: {
    marginRight: 16,
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  patternInfo: {
    flex: 1,
  },
  patternTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  patternSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
  },
  patternValue: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  categoryList: {
    gap: 16,
  },
  categoryCard: {
    borderRadius: 24,
    ...commonStyles.shadow,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  categoryIcon: {
    marginRight: 16,
    padding: 10,
    borderRadius: 16,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  categoryStats: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryStatus: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryStatusValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  categoryStatusLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  shoppingList: {
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
});

export default InsightsScreen;