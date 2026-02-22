import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { Text, Surface, IconButton, ActivityIndicator, Divider, Button, Dialog, Portal, Paragraph } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { inventoryManager } from '../managers/InventoryManager';
import { settingsManager } from '../managers/SettingsManager';
import { ActivityLog, ActivityAction } from '../models/Types';
import { tabBar as tabBarDims, rs, fontSize, spacing } from '../themes/Responsive';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, commonStyles, getDialogTheme } from '../themes/AppTheme';
import DoodleBackground from '../components/DoodleBackground';

const ActivityHistoryScreen: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmUndo, setShowConfirmUndo] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const systemColorScheme = useColorScheme();
  const settings = settingsManager.getSettings();
  const isDark = settings.themeMode === 'system' ? systemColorScheme === 'dark' : settings.themeMode === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  const dynamicPadding = tabBarDims.height + (insets.bottom > 0 ? insets.bottom + rs(8) : tabBarDims.bottomOffset) + rs(20);

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
    const actionTitle = getActionTitle(item.action);
    const isError = item.action === ActivityAction.REMOVE_ITEM;
    
    return (
      <Surface style={[styles.logItem, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <View style={styles.logHeader}>
          <View style={[styles.actionIcon, { backgroundColor: isError ? theme.colors.errorContainer : theme.colors.primaryContainer }]}>
            <Icon 
              name={isError ? 'delete' : 'history'} 
              size={20} 
              color={isError ? theme.colors.error : theme.colors.primary} 
            />
          </View>
          <View style={styles.logHeaderText}>
            <Text style={[styles.actionTitle, { color: theme.colors.onSurface }]}>{actionTitle}</Text>
            <Text style={[styles.timestamp, { color: theme.colors.onSurfaceVariant }]}>{formatTimestamp(item.timestamp)}</Text>
          </View>
          {item.isUndone ? (
            <View style={[styles.undoneBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Icon name="undo-variant" size={14} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.undoneText, { color: theme.colors.onSurfaceVariant }]}>Undone</Text>
            </View>
          ) : (
            <IconButton
              icon="undo"
              size={20}
              onPress={() => handleUndoPress(item)}
              iconColor={theme.colors.primary}
            />
          )}
        </View>

        <View style={styles.logContent}>
          <Text style={[styles.itemName, { color: theme.colors.onSurface }]}>{item.itemName}</Text>
          
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
        {item.isUndone && (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.03)', pointerEvents: 'none' }]} />
        )}
      </Surface>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <DoodleBackground />
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DoodleBackground />
      <FlatList
        data={logs}
        renderItem={renderLogItem}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: dynamicPadding }]}
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

      <Portal theme={getDialogTheme(isDark)}>
        <Dialog visible={showConfirmUndo} onDismiss={() => setShowConfirmUndo(false)} style={{ borderRadius: 28 }}>
          <Dialog.Title style={{ fontWeight: '800' }}>Confirm Undo</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={{ color: theme.colors.onSurfaceVariant }}>
              Are you sure you want to revert this action for "{selectedLog?.itemName}"?
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowConfirmUndo(false)} labelStyle={{ fontWeight: '700' }}>Cancel</Button>
            <Button onPress={confirmUndo} textColor={theme.colors.error} labelStyle={{ fontWeight: '800' }}>Confirm Undo</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={showConfirmClear} onDismiss={() => setShowConfirmClear(false)} style={{ borderRadius: 28 }}>
          <Dialog.Title style={{ fontWeight: '800' }}>Clear History</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={{ color: theme.colors.onSurfaceVariant }}>
              Are you sure you want to permanently delete all activity history? This cannot be undone.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowConfirmClear(false)} labelStyle={{ fontWeight: '700' }}>Cancel</Button>
            <Button onPress={handleClearHistory} textColor={theme.colors.error} labelStyle={{ fontWeight: '800' }}>Clear All</Button>
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
  logItem: {
    marginBottom: spacing.md,
    borderRadius: rs(20),
    overflow: 'hidden',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingBottom: spacing.xs,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  logHeaderText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  timestamp: {
    fontSize: fontSize.xs,
    opacity: 0.7,
  },
  logContent: {
    padding: spacing.md,
    paddingTop: 0,
  },
  itemName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailText: {
    fontSize: fontSize.sm,
    opacity: 0.9,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: fontSize.lg,
    marginTop: spacing.md,
    fontWeight: '600',
  },
  undoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  undoneText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});

export default ActivityHistoryScreen;
