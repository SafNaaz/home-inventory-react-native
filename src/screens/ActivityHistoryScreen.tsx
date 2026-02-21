import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { Text, Surface, IconButton, ActivityIndicator, Divider, Button, Dialog, Portal, Paragraph } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { inventoryManager } from '../managers/InventoryManager';
import { settingsManager } from '../managers/SettingsManager';
import { ActivityLog, ActivityAction } from '../models/Types';
import { rs, fontSize, spacing } from '../themes/Responsive';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme } from '../themes/AppTheme';

const ActivityHistoryScreen: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmUndo, setShowConfirmUndo] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const navigation = useNavigation();

  const systemColorScheme = useColorScheme();
  const settings = settingsManager.getSettings();
  const isDark = settings.themeMode === 'system' ? systemColorScheme === 'dark' : settings.themeMode === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          icon="delete-sweep"
          iconColor={theme.colors.error}
          onPress={() => setShowConfirmClear(true)}
        />
      ),
    });
  }, [navigation, theme.colors.error]);

  useEffect(() => {
    loadLogs();
    const unsubscribeInventory = inventoryManager.addListener(loadLogs);
    const unsubscribeSettings = settingsManager.addListener(() => {
      // Re-render to update theme if settings changed
      setLogs(prev => [...prev]);
    });
    
    return () => {
      unsubscribeInventory();
      unsubscribeSettings();
    };
  }, []);

  const loadLogs = () => {
    const activityLogs = inventoryManager.getActivityLogs();
    // Sort by most recent
    setLogs([...activityLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    setIsLoading(false);
  };

  const handleUndoPress = (log: ActivityLog) => {
    setSelectedLog(log);
    setShowConfirmUndo(true);
  };

  const confirmUndo = async () => {
    if (selectedLog) {
      await inventoryManager.undoActivity(selectedLog.id);
      setShowConfirmUndo(false);
      setSelectedLog(null);
    }
  };

  const handleClearHistory = async () => {
    await inventoryManager.clearActivityLogs();
    setShowConfirmClear(false);
  };


  const getActionTitle = (action: ActivityAction) => {
    switch (action) {
      case ActivityAction.UPDATE_QUANTITY: return 'Updated Quantity';
      case ActivityAction.UPDATE_NAME: return 'Renamed Item';
      case ActivityAction.RESTOCK: return 'Restocked Item';
      case ActivityAction.REMOVE_ITEM: return 'Deleted Item';
      case ActivityAction.ADD_ITEM: return 'Added Item';
      case ActivityAction.TOGGLE_IGNORE: return 'Toggled Visibility';
      default: return 'Action';
    }
  };

  const formatTimestamp = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleString([], { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
  };

  const renderLogItem = ({ item }: { item: ActivityLog }) => {
    const isUndone = item.isUndone;

    return (
      <Surface style={[styles.logCard, { backgroundColor: theme.colors.surface }, isUndone && styles.undoneCard]} elevation={1}>
        <View style={styles.cardHeader}>
          <View style={styles.headerText}>
            <Text style={[styles.actionTitle, { color: theme.colors.onSurface }]}>
              {getActionTitle(item.action)}
            </Text>
            <Text style={[styles.timestamp, { color: theme.colors.onSurface, opacity: 0.7, fontWeight: '700' }]}>
              {formatTimestamp(item.timestamp)}
            </Text>
          </View>
          {!isUndone && (
            <IconButton
              icon="undo"
              size={20}
              iconColor={theme.colors.secondary}
              onPress={() => handleUndoPress(item)}
            />
          )}
          {isUndone && (
             <View style={styles.undoneBadge}>
                <Text style={styles.undoneText}>UNDONE</Text>
             </View>
          )}
        </View>

        <Divider style={styles.divider} />

        <View style={styles.cardBody}>
          <Text style={[styles.itemName, { color: theme.colors.onSurface, fontWeight: '700' }]}>
            Item: {item.itemName}
          </Text>

          {item.details.itemSnapshot && (
            <Text style={[styles.locationText, { color: theme.colors.primary, fontWeight: '800' }]}>
              {inventoryManager.getSubcategoryConfig(item.details.itemSnapshot.subcategory)?.category} • {item.details.itemSnapshot.subcategory}
            </Text>
          )}
          
          {item.action === ActivityAction.UPDATE_QUANTITY && (
            <Text style={[styles.detailText, { color: theme.colors.onSurface, fontWeight: '600' }]}>
              Changed from {Math.round(item.details.previousValue * 100)}% to {Math.round(item.details.newValue * 100)}%
            </Text>
          )}

          {item.action === ActivityAction.UPDATE_NAME && (
            <Text style={[styles.detailText, { color: theme.colors.onSurface, fontWeight: '600' }]}>
              Renamed from "{item.details.previousValue}" to "{item.details.newValue}"
            </Text>
          )}

          {item.action === ActivityAction.ADD_ITEM && (
            <Text style={[styles.detailText, { color: theme.colors.onSurface, fontWeight: '600' }]}>
              Added to {item.details.newValue}
            </Text>
          )}

          {item.action === ActivityAction.REMOVE_ITEM && (
            <Text style={[styles.detailText, { color: theme.colors.onSurface, fontWeight: '600' }]}>
              Permanently removed
            </Text>
          )}

          {item.action === ActivityAction.TOGGLE_IGNORE && (
             <Text style={[styles.detailText, { color: theme.colors.onSurface, fontWeight: '600' }]}>
               Status changed to {item.details.newValue ? 'Hidden' : 'Visible'}
             </Text>
          )}
        </View>
      </Surface>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={logs}
        renderItem={renderLogItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="history" size={64} color={theme.colors.outline} />
            <Text style={[styles.emptyText, { color: theme.colors.outline }]}>
              No recent activity found.
            </Text>
          </View>
        }
      />

      <Portal>
        <Dialog visible={showConfirmUndo} onDismiss={() => setShowConfirmUndo(false)}>
          <Dialog.Title>Confirm Undo</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              Are you sure you want to revert this action for "{selectedLog?.itemName}"?
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowConfirmUndo(false)}>Cancel</Button>
            <Button onPress={confirmUndo} textColor={theme.colors.error}>Confirm Undo</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={showConfirmClear} onDismiss={() => setShowConfirmClear(false)}>
          <Dialog.Title>Clear History</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              Are you sure you want to permanently delete all activity history? This cannot be undone.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowConfirmClear(false)}>Cancel</Button>
            <Button onPress={handleClearHistory} textColor={theme.colors.error}>Clear All</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.md,
  },
  logCard: {
    borderRadius: rs(12),
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  undoneCard: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: fontSize.sm,
  },
  undoneBadge: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: rs(2),
    borderRadius: rs(4),
  },
  undoneText: {
    fontSize: fontSize.xs,
    fontWeight: 'bold',
    color: '#888',
  },
  divider: {
    marginVertical: spacing.sm,
  },
  cardBody: {
    paddingLeft: spacing.xs,
  },
  itemName: {
    fontSize: fontSize.md,
    marginBottom: rs(2),
  },
  detailText: {
    fontSize: fontSize.sm,
    fontStyle: 'italic',
  },
  locationText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    marginBottom: rs(4),
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  emptyContainer: {
    flex: 1,
    marginTop: rs(100),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    textAlign: 'center',
  },
});

export default ActivityHistoryScreen;
