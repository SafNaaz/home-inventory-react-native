import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  InteractionManager
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Text,
  useTheme,
  Surface,
  ProgressBar,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { inventoryManager } from '../managers/InventoryManager';
import { settingsManager } from '../managers/SettingsManager';
import { InventoryItem, InventoryCategory } from '../models/Types';
import { CATEGORY_CONFIG, getAllCategories } from '../constants/CategoryConfig';
import { commonStyles } from '../themes/AppTheme';
import DoodleBackground from '../components/DoodleBackground';
import { tabBar as tabBarDims, rs, fontSize as fs, spacing as sp, radius as r, screen } from '../themes/Responsive';

// Theme-based icon shades: slight variation per category type
const getCategoryIconColor = (category: string, isDark: boolean): string => {
  const cat = category.toLowerCase();
  if (isDark) {
    switch (cat) {
      case 'fridge': return '#FFFFFF';
      case 'grocery': return '#D4D4D4';
      case 'hygiene': return '#BABABA';
      case 'personal care': case 'personalcare': return '#A0A0A0';
      default: return '#CCCCCC';
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

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const COLLAPSED_COUNT = 3;

// ─── Helpers ───────────────────────────────────────────────────────────────────

const daysSince = (date: Date): number => {
  const now = new Date();
  const diffMs = Math.abs(now.getTime() - new Date(date).getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

const formatDaysAgo = (days: number): string => {
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  if (days < 60) return '1 month ago';
  return `${Math.floor(days / 30)} months ago`;
};

const toggleAnimation = () => {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
};

// ─── Section Header Component ──────────────────────────────────────────────────

const SectionHeader: React.FC<{
  icon: string;
  title: string;
  subtitle: string;
  iconColor: string;
  badgeCount?: number;
  badgeColor?: string;
  rightElement?: React.ReactNode;
  theme: any;
}> = ({ icon, title, subtitle, iconColor, badgeCount, badgeColor, rightElement, theme }) => (
  <View style={[styles.sectionHeader, { borderBottomColor: theme.colors.outlineVariant }]}>
    <View style={{flexDirection: 'row', flex: 1}}>
        <View style={[styles.sectionIconWrap, { backgroundColor: iconColor + '18' }]}>
        <Icon name={icon as any} size={22} color={iconColor} />
        </View>
        <View style={styles.sectionHeaderText}>
        <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>{title}</Text>
            {badgeCount !== undefined && badgeCount > 0 && (
            <View style={[styles.countBadge, { backgroundColor: (badgeColor || iconColor) + '20' }]}>
                <Text style={[styles.countBadgeText, { color: badgeColor || iconColor }]}>{badgeCount}</Text>
            </View>
            )}
        </View>
        <Text style={[styles.sectionSubtitle, { color: theme.colors.onSurfaceVariant }]}>{subtitle}</Text>
        </View>
    </View>
    {rightElement && (
        <View style={{justifyContent: 'center', paddingLeft: 8}}>
            {rightElement}
        </View>
    )}
  </View>
);

// ─── Show More / Less Button ───────────────────────────────────────────────────

const ShowMoreButton: React.FC<{
  expanded: boolean;
  totalCount: number;
  onPress: () => void;
  accentColor: string;
  theme: any;
}> = ({ expanded, totalCount, onPress, accentColor, theme }) => {
  if (totalCount <= COLLAPSED_COUNT) return null;
  const remaining = totalCount - COLLAPSED_COUNT;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.showMoreBtn, { backgroundColor: accentColor + '10' }]}
      activeOpacity={0.7}
    >
      <Text style={[styles.showMoreText, { color: accentColor }]}>
        {expanded ? 'Show Less' : `Show ${remaining} More`}
      </Text>
      <Icon
        name={expanded ? 'chevron-up' : 'chevron-down'}
        size={18}
        color={accentColor}
      />
    </TouchableOpacity>
  );
};

// ─── Stale Item Row ────────────────────────────────────────────────────────────

const StaleItemRow: React.FC<{
  item: InventoryItem;
  daysStale: number;
  thresholdDays: number;
  theme: any;
}> = ({ item, daysStale, thresholdDays, theme }) => {
  const overdueDays = daysStale - thresholdDays;
  const urgency = overdueDays > thresholdDays ? 'critical' : overdueDays > thresholdDays / 2 ? 'warning' : 'mild';
  const urgencyColors = {
    critical: { bg: '#EF444420', text: '#EF4444', icon: 'alert-circle' },
    warning: { bg: '#F59E0B20', text: '#F59E0B', icon: 'alert' },
    mild: { bg: '#F9731620', text: '#F97316', icon: 'clock-alert-outline' },
  };
  const u = urgencyColors[urgency];

  return (
    <View style={[styles.staleRow, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}>
      <View style={[styles.staleUrgencyDot, { backgroundColor: u.text }]} />
      <View style={styles.staleRowInfo}>
        <Text style={[styles.staleItemName, { color: theme.colors.onSurface }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.staleItemMeta, { color: theme.colors.onSurfaceVariant }]}>
          Last updated {formatDaysAgo(daysStale)} · {overdueDays}d overdue
        </Text>
      </View>
      <View style={[styles.staleUrgencyBadge, { backgroundColor: u.bg }]}>
        <Icon name={u.icon as any} size={14} color={u.text} />
      </View>
    </View>
  );
};

// ─── Ranked Item Row ───────────────────────────────────────────────────────────

const RankedItemRow: React.FC<{
  item: InventoryItem;
  rank: number;
  metric: string;
  metricLabel: string;
  accentColor: string;
  theme: any;
}> = ({ item, rank, metric, metricLabel, accentColor, theme }) => {
  const isTop3 = rank <= 3;
  const medalColors: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };

  return (
    <View style={[styles.rankedRow, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}>
      <View style={[
        styles.rankBadge,
        { backgroundColor: isTop3 ? (medalColors[rank] || accentColor) + '25' : theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }
      ]}>
        <Text style={[
          styles.rankNumber,
          { color: isTop3 ? (medalColors[rank] || accentColor) : theme.colors.onSurfaceVariant }
        ]}>
          {rank}
        </Text>
      </View>
      <View style={styles.rankedInfo}>
        <Text style={[styles.rankedItemName, { color: theme.colors.onSurface }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.rankedItemMeta, { color: theme.colors.onSurfaceVariant }]}>{metricLabel}</Text>
      </View>
      <View style={[styles.metricBadge, { backgroundColor: accentColor + '15' }]}>
        <Text style={[styles.metricText, { color: accentColor }]}>{metric}</Text>
      </View>
    </View>
  );
};

// ─── Low Stock Item Row ────────────────────────────────────────────────────────

const LowStockRow: React.FC<{
  item: InventoryItem;
  theme: any;
}> = ({ item, theme }) => {
  const pct = Math.round(item.quantity * 100);
  const color = pct === 0 ? '#EF4444' : pct <= 10 ? '#F97316' : '#F59E0B';

  return (
    <View style={[styles.rankedRow, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}>
      <View style={[styles.lowStockIndicator, { backgroundColor: color + '20' }]}>
        <Icon name={pct === 0 ? 'close-circle' : 'arrow-down-bold'} size={16} color={color} />
      </View>
      <View style={styles.rankedInfo}>
        <Text style={[styles.rankedItemName, { color: theme.colors.onSurface }]} numberOfLines={1}>{item.name}</Text>
        <View style={styles.lowStockBarWrap}>
          <View style={[styles.lowStockBarBg, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            <View style={[styles.lowStockBarFill, { width: `${Math.max(pct, 3)}%`, backgroundColor: color }]} />
          </View>
        </View>
      </View>
      <View style={[styles.metricBadge, { backgroundColor: color + '15' }]}>
        <Text style={[styles.metricText, { color }]}>{pct}%</Text>
      </View>
    </View>
  );
};

// ─── Empty State ───────────────────────────────────────────────────────────────

const EmptyState: React.FC<{
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  theme: any;
}> = ({ icon, title, subtitle, color, theme }) => (
  <View style={styles.emptyState}>
    <View style={[styles.emptyIconWrap, { backgroundColor: color + '12' }]}>
      <Icon name={icon as any} size={32} color={color + '80'} />
    </View>
    <Text style={[styles.emptyTitle, { color: theme.colors.onSurfaceVariant }]}>{title}</Text>
    <Text style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant + 'AA' }]}>{subtitle}</Text>
  </View>
);

// ─── Quick Stat Tile ───────────────────────────────────────────────────────────



// ─── Main Screen ───────────────────────────────────────────────────────────────

const InsightsScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  
  const dynamicPadding = tabBarDims.height + (insets.bottom > 0 ? insets.bottom + rs(8) : tabBarDims.bottomOffset) + rs(20);
  const [refreshing, setRefreshing] = useState(false);

  // Expand/collapse state for each section
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const navigationObj = useNavigation();
  const insightScrollViewRef = useRef<ScrollView>(null);

  const toggleSection = (key: string) => {
    toggleAnimation();
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    loadInsightsData();
    const unsubInventory = inventoryManager.addListener(() => loadInsightsData());
    const unsubSettings = settingsManager.addListener(() => loadInsightsData());
    return () => { unsubInventory(); unsubSettings(); };
  }, []);

  // Scroll to top when tab is pressed while already focused
  useEffect(() => {
    const unsubscribeTabPress = (navigationObj as any).addListener('tabPress', (e: any) => {
      InteractionManager.runAfterInteractions(() => {
        insightScrollViewRef.current?.scrollTo({ y: 0, animated: true });
      });
    });

    return unsubscribeTabPress;
  }, [navigationObj]);

  const loadInsightsData = () => {
    const items = inventoryManager.getVisibleInventoryItems();
    setInventoryItems(items);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    toggleAnimation();
    loadInsightsData();
    setRefreshing(false);
  };

  // State for show hidden running low
  const [showHiddenRunLow, setShowHiddenRunLow] = useState(false);

  // ── Computed Data ──

  const thresholds = useMemo(() => settingsManager.getActivityThresholds(), [inventoryItems]);

  // Stale items grouped by category - Exclude hidden
  const staleByCategory = useMemo(() => {
    const staleItems = inventoryManager.getStaleItemsByThreshold(thresholds).filter(i => !i.isIgnored);
    const grouped: Record<string, { items: (InventoryItem & { daysStale: number; thresholdDays: number })[]; config: any; threshold: number }> = {};

    staleItems.forEach(item => {
      const config = inventoryManager.getSubcategoryConfig(item.subcategory);
      if (!config) return;
      if (item.quantity === 0) return;
      
      const category = config.category;
      const catConfig = CATEGORY_CONFIG[category as InventoryCategory];
      if (!grouped[category]) {
        grouped[category] = { items: [], config: catConfig, threshold: thresholds[category as InventoryCategory] };
      }
      const daysStale = daysSince(item.lastUpdated);
      grouped[category].items.push({ ...item, daysStale, thresholdDays: thresholds[category as InventoryCategory] });
    });

    Object.values(grouped).forEach(g => {
      g.items.sort((a, b) => (b.daysStale - b.thresholdDays) - (a.daysStale - a.thresholdDays));
    });

    return grouped;
  }, [inventoryItems, thresholds]);

  const totalStaleCount = useMemo(() => {
    return Object.values(staleByCategory).reduce((sum, g) => sum + g.items.length, 0);
  }, [staleByCategory]);

  // Set of stale item IDs — used to exclude them from other sections
  const staleItemIds = useMemo(() => {
    const ids = new Set<string>();
    Object.values(staleByCategory).forEach(g => g.items.forEach(item => ids.add(item.id)));
    return ids;
  }, [staleByCategory]);

  // Top 10 most used (by purchase history length) - Exclude hidden
  const topUsed = useMemo(() => {
    return [...inventoryItems]
      .filter(item => !item.isIgnored && (item.purchaseHistory?.length || 0) > 0)
      .sort((a, b) => (b.purchaseHistory?.length || 0) - (a.purchaseHistory?.length || 0))
      .slice(0, 10);
  }, [inventoryItems]);

  // Least used (by longest time since last update, top 10) — excludes stale items and hidden
  const leastUsed = useMemo(() => {
    return [...inventoryItems]
      .filter(item => !item.isIgnored && !staleItemIds.has(item.id))
      .sort((a, b) => new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime())
      .slice(0, 10);
  }, [inventoryItems, staleItemIds]);

  // Running low (quantity < 25%) — excludes stale items, respects showHiddenRunLow
  const lowStockItems = useMemo(() => {
    const thresholdPercent = 25;
    return inventoryItems
      .filter(item => {
        if (!showHiddenRunLow && item.isIgnored) return false;
        const pct = Math.round(item.quantity * 100);
        if (pct >= thresholdPercent || staleItemIds.has(item.id)) return false;
        // Respect hidden toggle
        return showHiddenRunLow ? true : !item.isIgnored;
      })
      .sort((a, b) => a.quantity - b.quantity);
  }, [inventoryItems, staleItemIds, showHiddenRunLow]);

  // Category health summary - Exclude hidden
  const categoryHealth = useMemo(() => {
    const allStaleItems = inventoryManager.getStaleItemsByThreshold(thresholds).filter(i => !i.isIgnored);
    return getAllCategories().map(category => {
      const config = CATEGORY_CONFIG[category];
      const categoryItems = inventoryItems.filter(item => {
        if (item.isIgnored) return false; // Exclude hidden
        const subcatConfig = inventoryManager.getSubcategoryConfig(item.subcategory);
        return subcatConfig?.category === category;
      });
      const staleCount = allStaleItems.filter(item => {
        const subcatConfig = inventoryManager.getSubcategoryConfig(item.subcategory);
        return subcatConfig?.category === category;
      }).length;
      const lowCount = categoryItems.filter(i => Math.round(i.quantity * 100) < 25).length;
      const avgStock = categoryItems.length > 0
        ? Math.round((categoryItems.reduce((s, i) => s + i.quantity, 0) / categoryItems.length) * 100)
        : 0;

      return {
        category,
        config,
        totalItems: categoryItems.length,
        staleCount,
        lowCount,
        avgStock,
        threshold: thresholds[category],
      };
    }).filter(c => c.totalItems > 0);
  }, [inventoryItems, thresholds]);

  // Never restocked items — excludes stale items and hidden
  const neverRestocked = useMemo(() => {
    return inventoryItems.filter(item => !item.isIgnored && (!item.purchaseHistory || item.purchaseHistory.length === 0) && !staleItemIds.has(item.id));
  }, [inventoryItems, staleItemIds]);

  // Quick stats - Exclude hidden
  const quickStats = useMemo(() => {
    const activeItems = inventoryItems.filter(i => !i.isIgnored);
    const totalRestocks = activeItems.reduce((sum, item) => sum + (item.purchaseHistory?.length || 0), 0);
    const avgStock = activeItems.length > 0
      ? Math.round((activeItems.reduce((s, i) => s + i.quantity, 0) / activeItems.length) * 100)
      : 0;

    // Most active category (most restocks)
    const catRestocks: Record<string, number> = {};
    activeItems.forEach(item => {
      const config = inventoryManager.getSubcategoryConfig(item.subcategory);
      if (config) {
        catRestocks[config.category] = (catRestocks[config.category] || 0) + (item.purchaseHistory?.length || 0);
      }
    });
    const mostActiveCat = Object.entries(catRestocks).sort((a, b) => b[1] - a[1])[0];

    // Oldest item (by lastUpdated)
    const oldest = activeItems.length > 0
      ? activeItems.reduce((prev, curr) =>
          new Date(prev.lastUpdated).getTime() < new Date(curr.lastUpdated).getTime() ? prev : curr
        )
      : null;

    return { totalRestocks, avgStock, mostActiveCat, oldest };
  }, [inventoryItems]);

  // ── Monthly Summary Data ──

  const monthlySummary = useMemo(() => {
    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Only active items for stats
    const activeItems = inventoryItems.filter(i => !i.isIgnored);

    // Collect ALL purchase dates across all items
    const allDates: Date[] = [];
    activeItems.forEach(item => {
      (item.purchaseHistory || []).forEach(d => allDates.push(new Date(d)));
    });

    // Build last 6 months data
    const months: {
      key: string;
      label: string;
      fullLabel: string;
      restocks: number;
      shoppingTrips: number;
      topItem: { name: string; count: number } | null;
    }[] = [];

    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = m.getFullYear();
      const month = m.getMonth();
      const key = `${year}-${month}`;
      const label = monthNames[month];
      const fullLabel = `${monthNames[month]} ${year}`;

      // Count restocks this month
      const monthDates = allDates.filter(d => d.getFullYear() === year && d.getMonth() === month);
      const restocks = monthDates.length;

      // Count shopping trips: unique dates (YYYY-MM-DD) = 1 trip per day
      const uniqueDays = new Set(monthDates.map(d =>
        `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      ));
      const shoppingTrips = uniqueDays.size;

      // Top restocked item this month
      const itemCounts: Record<string, number> = {};
      inventoryItems.forEach(item => {
        const count = (item.purchaseHistory || []).filter(d => {
          const dd = new Date(d);
          return dd.getFullYear() === year && dd.getMonth() === month;
        }).length;
        if (count > 0) itemCounts[item.name] = count;
      });
      const topEntry = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0];
      const topItem = topEntry ? { name: topEntry[0], count: topEntry[1] } : null;

      months.push({ key, label, fullLabel, restocks, shoppingTrips, topItem });
    }

    const maxRestocks = Math.max(...months.map(m => m.restocks), 1);
    const maxTrips = Math.max(...months.map(m => m.shoppingTrips), 1);
    const totalRestocks = months.reduce((s, m) => s + m.restocks, 0);
    const totalTrips = months.reduce((s, m) => s + m.shoppingTrips, 0);
    const avgRestocksPerMonth = months.length > 0 ? Math.round(totalRestocks / months.length) : 0;
    const avgTripsPerMonth = months.length > 0 ? (totalTrips / months.length).toFixed(1) : '0';

    // Busiest month
    const busiest = [...months].sort((a, b) => b.restocks - a.restocks)[0];

    // Current month
    const currentMonth = months[months.length - 1];

    // Trend: compare current vs previous month
    const prevMonth = months.length >= 2 ? months[months.length - 2] : null;
    let trend: 'up' | 'down' | 'same' = 'same';
    let trendPct = 0;
    if (prevMonth && prevMonth.restocks > 0) {
      trendPct = Math.round(((currentMonth.restocks - prevMonth.restocks) / prevMonth.restocks) * 100);
      trend = trendPct > 0 ? 'up' : trendPct < 0 ? 'down' : 'same';
    } else if (currentMonth.restocks > 0 && (!prevMonth || prevMonth.restocks === 0)) {
      trend = 'up';
      trendPct = 100;
    }

    return {
      months,
      maxRestocks,
      maxTrips,
      totalRestocks,
      totalTrips,
      avgRestocksPerMonth,
      avgTripsPerMonth,
      busiest,
      currentMonth,
      trend,
      trendPct: Math.abs(trendPct),
    };
  }, [inventoryItems]);

  // ── Render Helpers ──

  const renderItemList = <T,>(
    items: T[],
    sectionKey: string,
    renderItem: (item: T, index: number) => React.ReactNode,
    accentColor: string,
  ) => {
    const expanded = expandedSections[sectionKey] || false;
    const visibleItems = expanded ? items : items.slice(0, COLLAPSED_COUNT);

    return (
      <>
        {visibleItems.map((item, index) => renderItem(item, index))}
        <ShowMoreButton
          expanded={expanded}
          totalCount={items.length}
          onPress={() => toggleSection(sectionKey)}
          accentColor={accentColor}
          theme={theme}
        />
      </>
    );
  };

  const renderDivider = (index: number) => {
    if (index === 0) return null;
    return <View style={[styles.divider, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />;
  };

  const renderStaleSection = () => {
    const categoryEntries = Object.entries(staleByCategory);

    return (
      <View style={styles.sectionContainer}>
        <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={theme.dark ? 1 : 2}>
          <SectionHeader
            icon="alert-decagram"
            title="Stale Items"
            subtitle="Items not updated within their check-in threshold"
            iconColor={theme.dark ? '#FCA5A5' : '#EF4444'}
            badgeCount={totalStaleCount}
            badgeColor={theme.dark ? '#FCA5A5' : '#EF4444'}
            theme={theme}
          />

          {categoryEntries.length === 0 ? (
            <EmptyState
              icon="check-decagram"
              title="Everything's Fresh!"
              subtitle="All items are within their activity thresholds"
              color={theme.dark ? '#34D399' : '#10B981'}
              theme={theme}
            />
          ) : (
            categoryEntries.map(([category, group], i) => {
              const sectionKey = `stale_${category}`;
              return (
                <View key={category}>
                <View style={[styles.staleCategoryHeader, { borderTopWidth: i === 0 ? 0 : 1, borderTopColor: theme.colors.outlineVariant }]}>
                  <View style={[styles.staleCatIconWrap, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                    <Icon name={group.config.icon as any} size={20} color={getCategoryIconColor(category, theme.dark)} />
                  </View>
                  <View style={styles.staleCatInfo}>
                    <Text style={[styles.staleCatName, { color: theme.colors.onSurface }]}>{category}</Text>
                    <Text style={[styles.staleCatThreshold, { color: theme.colors.onSurfaceVariant }]}>
                      Threshold: every {group.threshold} days
                    </Text>
                  </View>
                  <View style={[styles.staleCatBadge, { backgroundColor: theme.dark ? 'rgba(239,68,68,0.2)' : '#FEE2E2' }]}>
                    <Text style={[styles.staleCatBadgeText, { color: theme.dark ? '#FCA5A5' : '#EF4444' }]}>
                      {group.items.length}
                    </Text>
                  </View>
                </View>
                <View style={styles.staleItemsContainer}>
                  {renderItemList(
                    group.items,
                    sectionKey,
                    (item, index) => (
                      <View key={item.id}>
                        {renderDivider(index)}
                        <StaleItemRow item={item} daysStale={item.daysStale} thresholdDays={item.thresholdDays} theme={theme} />
                      </View>
                    ),
                    theme.dark ? '#FCA5A5' : '#EF4444',
                  )}
                </View>
              </View>
            );
          })
        )}
        </Surface>
      </View>
    );
  };

  const renderTopUsedSection = () => {
    const accentColor = theme.dark ? '#FBBF24' : '#F59E0B';
    return (
      <View style={styles.sectionContainer}>
        <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={theme.dark ? 1 : 2}>
          <SectionHeader
            icon="trophy"
            title="Most Restocked"
            subtitle="Items you restock the most frequently"
            iconColor={accentColor}
            badgeCount={topUsed.length}
            badgeColor={accentColor}
            theme={theme}
          />
          {topUsed.length === 0 ? (
            <EmptyState icon="cart-off" title="No Restock Data Yet" subtitle="Complete a shopping trip to start tracking" color={accentColor} theme={theme} />
          ) : (
            <View style={styles.rankedList}>
              {renderItemList(topUsed, 'topUsed', (item, index) => (
                <View key={item.id}>
                  {renderDivider(index)}
                  <RankedItemRow
                    item={item}
                    rank={index + 1}
                    metric={`${item.purchaseHistory?.length || 0}×`}
                    metricLabel={`Restocked ${item.purchaseHistory?.length || 0} times`}
                    accentColor={accentColor}
                    theme={theme}
                  />
                </View>
              ), accentColor)}
            </View>
          )}
        </Surface>
      </View>
    );
  };

  const renderLeastUsedSection = () => {
    const accentColor = theme.dark ? '#94A3B8' : '#64748B';
    return (
      <View style={styles.sectionContainer}>
        <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={theme.dark ? 1 : 2}>
          <SectionHeader
            icon="sleep"
            title="Least Active"
            subtitle="Items untouched for the longest time"
            iconColor={accentColor}
            badgeCount={leastUsed.length > 0 ? leastUsed.length : undefined}
            badgeColor={accentColor}
            theme={theme}
          />
          {leastUsed.length === 0 ? (
            <EmptyState icon="package-variant" title="No Items Yet" subtitle="Add items to your inventory to see activity insights" color={accentColor} theme={theme} />
          ) : (
            <View style={styles.rankedList}>
              {renderItemList(leastUsed, 'leastUsed', (item, index) => {
                const days = daysSince(item.lastUpdated);
                return (
                  <View key={item.id}>
                    {renderDivider(index)}
                    <RankedItemRow
                      item={item}
                      rank={index + 1}
                      metric={days === 0 ? 'Today' : `${days}d`}
                      metricLabel={`Last updated ${formatDaysAgo(days)}`}
                      accentColor={accentColor}
                      theme={theme}
                    />
                  </View>
                );
              }, accentColor)}
            </View>
          )}
        </Surface>
      </View>
    );
  };

  const renderLowStockSection = () => {
    const accentColor = theme.dark ? '#FBBF24' : '#EF4444';
    return (
      <View style={styles.sectionContainer}>
        <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={theme.dark ? 1 : 2}>
          <SectionHeader
            icon="arrow-down-bold-circle"
            title="Running Low"
            subtitle="Items below 25% stock"
            iconColor={accentColor}
            badgeCount={lowStockItems.length}
            badgeColor={accentColor}
            theme={theme}
            rightElement={
              <TouchableOpacity 
                onPress={() => setShowHiddenRunLow(!showHiddenRunLow)} 
                style={{ padding: 8 }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                  <Icon 
                    name={showHiddenRunLow ? 'eye' : 'eye-off-outline'} 
                    size={24} 
                    color={showHiddenRunLow ? accentColor : theme.colors.onSurfaceVariant} 
                  />
              </TouchableOpacity>
            }
          />
          {lowStockItems.length === 0 ? (
            <EmptyState icon="check-circle" title="Fully Stocked!" subtitle="No items are running low right now" color={theme.dark ? '#34D399' : '#10B981'} theme={theme} />
          ) : (
            <View style={styles.rankedList}>
              {renderItemList(lowStockItems, 'lowStock', (item, index) => (
                <View key={item.id}>
                  {renderDivider(index)}
                  <LowStockRow item={item} theme={theme} />
                </View>
              ), accentColor)}
            </View>
          )}
        </Surface>
      </View>
    );
  };

  const renderCategoryHealthSection = () => {
    const accentColor = theme.dark ? '#818CF8' : '#6366F1';
    return (
      <View style={styles.sectionContainer}>
        <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={theme.dark ? 1 : 2}>
          <SectionHeader
            icon="view-grid"
            title="Category Health"
            subtitle="Staleness & stock levels per category"
            iconColor={accentColor}
            theme={theme}
          />
          {categoryHealth.length === 0 ? (
            <EmptyState icon="shape-outline" title="No Categories Yet" subtitle="Add items to see category-level insights" color={accentColor} theme={theme} />
          ) : (
            <View style={styles.categoryHealthList}>
              {categoryHealth.map((cat, index) => (
                <View key={cat.category}>
                  {index > 0 && <View style={[styles.divider, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />}
                  <View style={styles.catHealthRow}>
                    <View style={[styles.catHealthIcon, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                      <Icon name={cat.config.icon as any} size={20} color={getCategoryIconColor(cat.category, theme.dark)} />
                    </View>
                    <View style={styles.catHealthInfo}>
                      <View style={styles.catHealthNameRow}>
                        <Text style={[styles.catHealthName, { color: theme.colors.onSurface }]}>{cat.category}</Text>
                        <Text style={[styles.catHealthItemCount, { color: theme.colors.onSurfaceVariant }]}>{cat.totalItems} items</Text>
                      </View>
                      <ProgressBar
                        progress={cat.avgStock / 100}
                        color={getCategoryIconColor(cat.category, theme.dark)}
                        style={[styles.catHealthBar, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
                      />
                      <View style={styles.catHealthDetails}>
                        <Text style={[styles.catHealthDetailText, { color: theme.colors.onSurfaceVariant }]}>
                          Avg {cat.avgStock}%
                        </Text>
                        {cat.staleCount > 0 && (
                          <View style={[styles.catHealthBadge, { backgroundColor: theme.dark ? 'rgba(239,68,68,0.2)' : '#FEE2E2' }]}>
                            <Text style={[styles.catHealthBadgeText, { color: theme.dark ? '#FCA5A5' : '#EF4444' }]}>
                              {cat.staleCount} stale
                            </Text>
                          </View>
                        )}
                        {cat.lowCount > 0 && (
                          <View style={[styles.catHealthBadge, { backgroundColor: theme.dark ? 'rgba(251,191,36,0.2)' : '#FEF3C7' }]}>
                            <Text style={[styles.catHealthBadgeText, { color: theme.dark ? '#FBBF24' : '#D97706' }]}>
                              {cat.lowCount} low
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Surface>
      </View>
    );
  };

  const renderNeverRestockedSection = () => {
    const accentColor = theme.dark ? '#A78BFA' : '#7C3AED';
    return (
      <View style={styles.sectionContainer}>
        <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={theme.dark ? 1 : 2}>
          <SectionHeader
            icon="package-variant-closed"
            title="Never Restocked"
            subtitle="Items that have never been through a shopping trip"
            iconColor={accentColor}
            badgeCount={neverRestocked.length}
            badgeColor={accentColor}
            theme={theme}
          />
          {neverRestocked.length === 0 ? (
            <EmptyState icon="cart-check" title="All Restocked!" subtitle="Every item has been through at least one shopping trip" color={accentColor} theme={theme} />
          ) : (
            <View style={styles.rankedList}>
              {renderItemList(neverRestocked, 'neverRestocked', (item, index) => {
                const days = daysSince(item.lastUpdated);
                return (
                  <View key={item.id}>
                    {renderDivider(index)}
                    <View style={[styles.rankedRow, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}>
                      <View style={[styles.neverRestockedIcon, { backgroundColor: accentColor + '15' }]}>
                        <Icon name="package-variant-closed" size={16} color={accentColor} />
                      </View>
                      <View style={styles.rankedInfo}>
                        <Text style={[styles.rankedItemName, { color: theme.colors.onSurface }]} numberOfLines={1}>{item.name}</Text>
                        <Text style={[styles.rankedItemMeta, { color: theme.colors.onSurfaceVariant }]}>
                          Added {formatDaysAgo(days)} · {Math.round(item.quantity * 100)}% stock
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              }, accentColor)}
            </View>
          )}
        </Surface>
      </View>
    );
  };

  const renderMonthlySummarySection = () => {
    const { months, maxRestocks, maxTrips, totalRestocks, totalTrips, avgRestocksPerMonth, avgTripsPerMonth, busiest, currentMonth, trend, trendPct } = monthlySummary;
    const chartAccent = theme.dark ? '#818CF8' : '#6366F1';
    const tripsAccent = theme.dark ? '#34D399' : '#10B981';
    const trendColor = trend === 'up' ? (theme.dark ? '#34D399' : '#10B981') : trend === 'down' ? (theme.dark ? '#FCA5A5' : '#EF4444') : theme.colors.onSurfaceVariant;
    const trendIcon = trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'minus';

    return (
      <View style={styles.sectionContainer}>
        <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={theme.dark ? 1 : 2}>
          <SectionHeader
            icon="calendar-month"
            title="Monthly Summary"
            subtitle="Restocking activity over the last 6 months"
            iconColor={chartAccent}
            theme={theme}
          />

        {/* Restocks Bar Chart */}
          <View style={styles.chartSection}>
            <View style={styles.chartLegendRow}>
              <View style={styles.chartLegendItem}>
                <View style={[styles.chartLegendDot, { backgroundColor: chartAccent }]} />
                <Text style={[styles.chartLegendText, { color: theme.colors.onSurfaceVariant }]}>Restocks</Text>
              </View>
              <View style={styles.chartLegendItem}>
                <View style={[styles.chartLegendDot, { backgroundColor: tripsAccent }]} />
                <Text style={[styles.chartLegendText, { color: theme.colors.onSurfaceVariant }]}>Shopping Trips</Text>
              </View>
            </View>

            <View style={styles.chartContainer}>
              {months.map((m) => {
                const restockHeight = maxRestocks > 0 ? Math.max((m.restocks / maxRestocks) * 100, m.restocks > 0 ? 8 : 2) : 2;
                const tripHeight = maxTrips > 0 ? Math.max((m.shoppingTrips / maxTrips) * 100, m.shoppingTrips > 0 ? 8 : 2) : 2;
                const isCurrentMonth = m.key === currentMonth.key;

                return (
                  <View key={m.key} style={styles.chartBarGroup}>
                    <View style={styles.chartBarValues}>
                      {m.restocks > 0 && (
                        <Text style={[styles.chartBarValueText, { color: chartAccent }]}>{m.restocks}</Text>
                      )}
                    </View>
                    <View style={styles.chartBarsWrap}>
                      <View
                        style={[
                          styles.chartBar,
                          {
                            height: restockHeight,
                            backgroundColor: isCurrentMonth ? chartAccent : chartAccent + '60',
                            borderRadius: 4,
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.chartBar,
                          {
                            height: tripHeight,
                            backgroundColor: isCurrentMonth ? tripsAccent : tripsAccent + '60',
                            borderRadius: 4,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[
                      styles.chartLabel,
                      { color: isCurrentMonth ? theme.colors.onSurface : theme.colors.onSurfaceVariant, fontWeight: isCurrentMonth ? '800' : '500' }
                    ]}>
                      {m.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Monthly Insights */}
          <View style={[styles.monthlyInsights, { borderTopColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
            {/* Row 1: This month overview */}
            <View style={styles.monthlyInsightRow}>
              <View style={[styles.monthlyInsightIcon, { backgroundColor: chartAccent + '15' }]}>
                <Icon name="calendar-today" size={16} color={chartAccent} />
              </View>
              <View style={styles.monthlyInsightInfo}>
                <Text style={[styles.monthlyInsightLabel, { color: theme.colors.onSurfaceVariant }]}>This Month</Text>
                <Text style={[styles.monthlyInsightValue, { color: theme.colors.onSurface }]}>
                  {currentMonth.restocks} restocks · {currentMonth.shoppingTrips} trip{currentMonth.shoppingTrips !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={[styles.trendBadge, { backgroundColor: trendColor + '15' }]}>
                <Icon name={trendIcon as any} size={14} color={trendColor} />
                {trendPct > 0 && <Text style={[styles.trendText, { color: trendColor }]}>{trendPct}%</Text>}
              </View>
            </View>

            {/* Row 2: Busiest month */}
            {busiest && busiest.restocks > 0 && (
              <>
                <View style={[styles.monthlyDivider, { backgroundColor: theme.colors.outlineVariant }]} />
                <View style={styles.monthlyInsightRow}>
                  <View style={[styles.monthlyInsightIcon, { backgroundColor: '#F59E0B15' }]}>
                    <Icon name="fire" size={16} color={theme.dark ? '#FBBF24' : '#F59E0B'} />
                  </View>
                  <View style={styles.monthlyInsightInfo}>
                    <Text style={[styles.monthlyInsightLabel, { color: theme.colors.onSurfaceVariant }]}>Busiest Month</Text>
                    <Text style={[styles.monthlyInsightValue, { color: theme.colors.onSurface }]}>
                      {busiest.fullLabel} — {busiest.restocks} restocks
                    </Text>
                  </View>
                </View>
              </>
            )}

            {/* Row 3: Averages */}
            <View style={[styles.monthlyDivider, { backgroundColor: theme.colors.outlineVariant }]} />
            <View style={styles.monthlyInsightRow}>
              <View style={[styles.monthlyInsightIcon, { backgroundColor: tripsAccent + '15' }]}>
                <Icon name="chart-line" size={16} color={tripsAccent} />
              </View>
              <View style={styles.monthlyInsightInfo}>
                <Text style={[styles.monthlyInsightLabel, { color: theme.colors.onSurfaceVariant }]}>6-Month Average</Text>
                <Text style={[styles.monthlyInsightValue, { color: theme.colors.onSurface }]}>
                  {avgRestocksPerMonth} restocks · {avgTripsPerMonth} trips/month
                </Text>
              </View>
            </View>

            {/* Row 4: Top item this month */}
            {currentMonth.topItem && (
              <>
                <View style={[styles.monthlyDivider, { backgroundColor: theme.colors.outlineVariant }]} />
                <View style={styles.monthlyInsightRow}>
                  <View style={[styles.monthlyInsightIcon, { backgroundColor: '#EC489915' }]}>
                    <Icon name="star" size={16} color={theme.dark ? '#F472B6' : '#EC4899'} />
                  </View>
                  <View style={styles.monthlyInsightInfo}>
                    <Text style={[styles.monthlyInsightLabel, { color: theme.colors.onSurfaceVariant }]}>Top Item This Month</Text>
                    <Text style={[styles.monthlyInsightValue, { color: theme.colors.onSurface }]}>
                      {currentMonth.topItem.name} ({currentMonth.topItem.count}×)
                    </Text>
                  </View>
                </View>
              </>
            )}

            {/* Row 5: Total lifetime */}
            <View style={[styles.monthlyDivider, { backgroundColor: theme.colors.outlineVariant }]} />
            <View style={styles.monthlyInsightRow}>
              <View style={[styles.monthlyInsightIcon, { backgroundColor: '#6366F115' }]}>
                <Icon name="sigma" size={16} color={chartAccent} />
              </View>
              <View style={styles.monthlyInsightInfo}>
                <Text style={[styles.monthlyInsightLabel, { color: theme.colors.onSurfaceVariant }]}>Total (6 Months)</Text>
                <Text style={[styles.monthlyInsightValue, { color: theme.colors.onSurface }]}>
                  {totalRestocks} restocks across {totalTrips} shopping trip{totalTrips !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </View>
        </Surface>
      </View>
    );
  };



  // ── Main Render ──

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <DoodleBackground />
      <ScrollView
        ref={insightScrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: dynamicPadding }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Hero Summary */}
        <Surface
          style={[
            styles.heroCard,
            { backgroundColor: theme.colors.surface }
          ]}
          elevation={theme.dark ? 1 : 2}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroTextWrap}>
              <Text style={[styles.heroLabel, { color: theme.colors.onSurfaceVariant }]}>
                Inventory Health
              </Text>
              <Text style={[styles.heroValue, { color: theme.colors.primary }]}>
                {totalStaleCount === 0 ? 'All Good ✓' : `${totalStaleCount} Need${totalStaleCount === 1 ? 's' : ''} Attention`}
              </Text>
            </View>
            <View style={[styles.heroIconWrap, { backgroundColor: theme.colors.primary + '15' }]}>
              <Icon
                name={totalStaleCount === 0 ? 'shield-check' : 'alert-circle-outline'}
                size={32}
                color={theme.colors.primary}
              />
            </View>
          </View>
          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatValue, { color: theme.colors.onSurface }]}>
                {inventoryItems.length}
              </Text>
              <Text style={[styles.heroStatLabel, { color: theme.colors.onSurfaceVariant }]}>
                Total Items
              </Text>
            </View>
            <View style={[styles.heroStatDivider, { backgroundColor: theme.colors.outlineVariant }]} />
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatValue, { color: theme.colors.onSurface }]}>
                {totalStaleCount}
              </Text>
              <Text style={[styles.heroStatLabel, { color: theme.colors.onSurfaceVariant }]}>
                Stale
              </Text>
            </View>
            <View style={[styles.heroStatDivider, { backgroundColor: theme.colors.outlineVariant }]} />
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatValue, { color: theme.colors.onSurface }]}>
                {inventoryItems.length > 0 ? Math.round((1 - totalStaleCount / inventoryItems.length) * 100) : 100}%
              </Text>
              <Text style={[styles.heroStatLabel, { color: theme.colors.onSurfaceVariant }]}>
                Fresh
              </Text>
            </View>
          </View>
        </Surface>

        {renderStaleSection()}
        {renderTopUsedSection()}
        {renderLeastUsedSection()}
        {renderLowStockSection()}
        {renderCategoryHealthSection()}
        {renderNeverRestockedSection()}
        {renderMonthlySummarySection()}


        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: tabBarDims.height + tabBarDims.bottomOffset,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: sp.base,
    paddingTop: sp.sm,
  },

  // Hero
  heroCard: {
    padding: sp.base,
    borderRadius: r.xxl,
    marginBottom: 8,
    ...commonStyles.shadow,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: screen.isSmall ? 16 : 20,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroLabel: {
    fontSize: fs.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  heroValue: {
    fontSize: screen.isSmall ? fs.h2 : fs.h1,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  heroIconWrap: {
    width: screen.isSmall ? 48 : 56,
    height: screen.isSmall ? 48 : 56,
    borderRadius: screen.isSmall ? 24 : 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  heroStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  heroStatValue: {
    fontSize: screen.isSmall ? fs.xl : fs.h3,
    fontWeight: '800',
  },
  heroStatLabel: {
    fontSize: fs.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  heroStatDivider: {
    width: 1,
    height: 28,
  },

  // Section
  sectionContainer: {
    marginTop: screen.isSmall ? 16 : 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: sp.sm,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: fs.lg,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: fs.xs,
    fontWeight: '500',
    marginTop: 1,
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  sectionActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  // Card
  card: {
    borderRadius: 24,
    marginBottom: 12,
    overflow: 'hidden',
    ...commonStyles.shadow,
  },

  // Show more button
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 4,
    marginHorizontal: 4,
    borderRadius: 12,
    gap: 4,
  },
  showMoreText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Stale category header
  staleCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  staleCatIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  staleCatInfo: {
    flex: 1,
  },
  staleCatName: {
    fontSize: 15,
    fontWeight: '700',
  },
  staleCatThreshold: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  staleCatBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  staleCatBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },

  // Stale items container
  staleItemsContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },

  // Stale row
  staleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  staleUrgencyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 10,
  },
  staleRowInfo: {
    flex: 1,
  },
  staleItemName: {
    fontSize: fs.md,
    fontWeight: '600',
  },
  staleItemMeta: {
    fontSize: fs.xs,
    fontWeight: '500',
    marginTop: 2,
  },
  staleUrgencyBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  // Ranked list
  rankedList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rankedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: fs.md,
    fontWeight: '800',
  },
  rankedInfo: {
    flex: 1,
  },
  rankedItemName: {
    fontSize: fs.md,
    fontWeight: '600',
  },
  rankedItemMeta: {
    fontSize: fs.xs,
    fontWeight: '500',
    marginTop: 2,
  },
  metricBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 6,
  },
  metricText: {
    fontSize: fs.sm,
    fontWeight: '800',
  },

  // Low stock
  lowStockIndicator: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  lowStockBarWrap: {
    marginTop: 4,
  },
  lowStockBarBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  lowStockBarFill: {
    height: 4,
    borderRadius: 2,
  },

  // Never restocked icon
  neverRestockedIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  // Category health
  categoryHealthList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  catHealthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  catHealthIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  catHealthInfo: {
    flex: 1,
  },
  catHealthNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  catHealthName: {
    fontSize: fs.md,
    fontWeight: '700',
  },
  catHealthItemCount: {
    fontSize: fs.xs,
    fontWeight: '500',
  },
  catHealthBar: {
    height: 5,
    borderRadius: 3,
    marginBottom: 6,
  },
  catHealthDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catHealthDetailText: {
    fontSize: 11,
    fontWeight: '500',
  },
  catHealthBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catHealthBadgeText: {
    fontSize: fs.xs,
    fontWeight: '700',
  },

  // Monthly summary chart
  chartSection: {
    padding: 16,
  },
  chartLegendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  chartLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chartLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chartLegendText: {
    fontSize: fs.xs,
    fontWeight: '600',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: screen.isSmall ? 110 : 130,
    paddingHorizontal: 4,
  },
  chartBarGroup: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  chartBarValues: {
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartBarValueText: {
    fontSize: fs.xs,
    fontWeight: '800',
  },
  chartBarsWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    flex: 1,
  },
  chartBar: {
    width: 14,
    minHeight: 2,
  },
  chartLabel: {
    fontSize: fs.xs,
    marginTop: 5,
  },

  // Monthly insights
  monthlyInsights: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  monthlyInsightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  monthlyInsightIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  monthlyInsightInfo: {
    flex: 1,
  },
  monthlyInsightLabel: {
    fontSize: fs.xs,
    fontWeight: '600',
    marginBottom: 1,
  },
  monthlyInsightValue: {
    fontSize: fs.sm,
    fontWeight: '700',
  },
  monthlyDivider: {
    height: 1,
    marginLeft: 44,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Quick stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statTile: {
    flex: 1,
    minWidth: '45%',
    padding: screen.isSmall ? 12 : 16,
    borderRadius: r.xl,
    alignItems: 'center' as const,
    overflow: 'hidden' as const,
  },
  statTileIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statTileValue: {
    fontSize: screen.isSmall ? fs.xl : fs.h3,
    fontWeight: '800',
    marginBottom: 2,
  },
  statTileLabel: {
    fontSize: fs.xs,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Divider
  divider: {
    height: 1,
    marginHorizontal: 12,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default InsightsScreen;