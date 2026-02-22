import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {
  Text,
  Switch,
  List,
  Divider,
  useTheme,
  Button,
  Portal,
  Dialog,
  TextInput as PaperTextInput,
} from 'react-native-paper';
import Slider from '@react-native-community/slider';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { settingsManager } from '../managers/SettingsManager';
import { InventoryCategory } from '../models/Types';
import { CATEGORY_CONFIG } from '../constants/CategoryConfig';
import DoodleBackground from '../components/DoodleBackground';
import { commonStyles } from '../themes/AppTheme';
import { tabBar as tabBarDims, rs, fontSize as fs, spacing as sp, radius as r, screen } from '../themes/Responsive';

import { useNavigation } from '@react-navigation/native';

const NotificationSettingsScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [isInventoryReminderEnabled, setIsInventoryReminderEnabled] = useState(false);
  const [isSecondReminderEnabled, setIsSecondReminderEnabled] = useState(false);
  const [reminderTime1, setReminderTime1] = useState(new Date());
  const [reminderTime2, setReminderTime2] = useState(new Date());
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timePickerType, setTimePickerType] = useState<'time1' | 'time2' | 'health'>('time1');
  const [thresholds, setThresholds] = useState<Record<string, number>>({});
  const [isHealthAlertsEnabled, setIsHealthAlertsEnabled] = useState(true);
  const [healthAlertTime, setHealthAlertTime] = useState(new Date());

  const dynamicPadding = tabBarDims.height + (insets.bottom > 0 ? insets.bottom + rs(8) : tabBarDims.bottomOffset) + rs(20);

  useEffect(() => {
    loadSettings();

    const unsubscribe = settingsManager.addListener(() => {
      loadSettings();
    });

    return unsubscribe;
  }, []);

  const loadSettings = () => {
    const settings = settingsManager.getSettings();
    setIsInventoryReminderEnabled(settings.isInventoryReminderEnabled);
    setIsSecondReminderEnabled(settings.isSecondReminderEnabled);
    setReminderTime1(new Date(settings.reminderTime1));
    setReminderTime2(new Date(settings.reminderTime2));
    setThresholds(settings.activityThresholds);
    setIsHealthAlertsEnabled(settings.isHealthAlertsEnabled);
    setHealthAlertTime(new Date(settings.healthAlertTime));
  };

  const handleInventoryReminderToggle = async () => {
    setIsInventoryReminderEnabled(prev => !prev);
    await settingsManager.toggleInventoryReminder();
  };

  const handleSecondReminderToggle = async () => {
    setIsSecondReminderEnabled(prev => !prev);
    await settingsManager.toggleSecondReminder();
  };

  const handleHealthAlertsToggle = async () => {
    setIsHealthAlertsEnabled(prev => !prev);
    await settingsManager.toggleHealthAlerts();
  };

  const handleTestHealthAlert = async () => {
    await settingsManager.sendTestHealthNotification();
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleTimePickerOpen = (type: 'time1' | 'time2' | 'health') => {
    setTimePickerType(type);
    setTimePickerVisible(true);
  };

  const handleTimePickerConfirm = async (date: Date) => {
    if (timePickerType === 'time1') {
      setReminderTime1(date);
      await settingsManager.updateReminderTime1(date);
    } else if (timePickerType === 'time2') {
      setReminderTime2(date);
      await settingsManager.updateReminderTime2(date);
    } else {
      // Clamp to 8 AM - 10 PM
      const hour = date.getHours();
      if (hour < 8) date.setHours(8, 0, 0, 0);
      if (hour >= 22) date.setHours(21, 55, 0, 0);
      setHealthAlertTime(date);
      await settingsManager.updateHealthAlertTime(date);
    }
    setTimePickerVisible(false);
  };

  const handleTestNotification = async () => {
    await settingsManager.sendTestNotification();
  };

  return (
    <View style={styles.container}>
      <DoodleBackground />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: dynamicPadding }}
      >
        {/* Inventory Reminders Section */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
              Inventory Reminders
            </Text>
            <Text style={[styles.sectionDescription, { color: theme.colors.onSurfaceVariant }]}>
              Get reminded to check your inventory and restock low items.
            </Text>
          </View>

          <List.Section style={styles.listSection}>
            {isInventoryReminderEnabled ? (
              <>
                <List.Item
                  title="Enable Second Reminder"
                  description="Standard second reminder for inventory updates"
                  left={(props) => <List.Icon {...props} icon="bell-plus" />}
                  right={() => (
                    <Switch
                      value={isSecondReminderEnabled}
                      onValueChange={handleSecondReminderToggle}
                      color={theme.colors.primary}
                    />
                  )}
                />

                {isSecondReminderEnabled && (
                  <>
                    <Divider />
                    <List.Item
                      title="Second Reminder Time"
                      description={`Daily at ${formatTime(reminderTime2)}`}
                      left={(props) => <List.Icon {...props} icon="clock-outline" />}
                      right={(props) => <List.Icon {...props} icon="chevron-right" />}
                      onPress={() => handleTimePickerOpen('time2')}
                    />
                  </>
                )}
              </>
            ) : (
              <List.Item
                title="Reminders Disabled"
                description="Enable Inventory Reminders in the main settings to configure multiple reminders."
                left={(props) => <List.Icon {...props} icon="bell-off-outline" />}
                onPress={() => navigation.goBack()}
              />
            )}
          </List.Section>
        </View>

        {/* Inventory Health Section */}
        {isInventoryReminderEnabled && (
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
                Health Notifications
              </Text>
              <Text style={[styles.sectionDescription, { color: theme.colors.onSurfaceVariant }]}>
                Get a daily health check notification about stale items, low stock, and items needing attention. Fires once daily between 8 AM — 10 PM.
              </Text>
            </View>

            <List.Section style={styles.listSection}>
              <List.Item
                title="Enable Health Notifications"
                description="Daily inventory health report"
                left={(props) => <List.Icon {...props} icon="heart-pulse" />}
                right={() => (
                  <Switch
                    value={isHealthAlertsEnabled}
                    onValueChange={handleHealthAlertsToggle}
                    color={theme.colors.primary}
                  />
                )}
              />

              <Divider />

              {isHealthAlertsEnabled && (
                <>
                  <List.Item
                    title="Health Alert Time"
                    description={`Daily at ${formatTime(healthAlertTime)}`}
                    left={(props) => <List.Icon {...props} icon="clock-outline" />}
                    right={(props) => <List.Icon {...props} icon="chevron-right" />}
                    onPress={() => handleTimePickerOpen('health')}
                  />

                  <Divider />

                  {Object.values(InventoryCategory).map((category, index, array) => {
                    const config = CATEGORY_CONFIG[category];
                    const days = thresholds[category] || 0;
                    
                    return (
                      <React.Fragment key={category}>
                        <View style={styles.thresholdItem}>
                          <View style={styles.thresholdHeader}>
                            <View style={styles.thresholdTitleRow}>
                              <Icon name={config.icon as any} size={24} color={config.color} />
                              <Text style={[styles.thresholdLabel, { color: theme.colors.onSurface }]}>{category}</Text>
                            </View>
                            <Text style={[styles.thresholdValue, { color: theme.colors.primary }]}>
                              Every {days} {days === 1 ? 'day' : 'days'}
                            </Text>
                          </View>
                          <Slider
                            style={styles.slider}
                            minimumValue={1}
                            maximumValue={30}
                            step={1}
                            value={days}
                            onValueChange={(val) => setThresholds(prev => ({ ...prev, [category]: val }))}
                            onSlidingComplete={(value: number) => settingsManager.updateActivityThreshold(category, value)}
                            minimumTrackTintColor={theme.colors.primary}
                            maximumTrackTintColor={theme.colors.surfaceVariant}
                            thumbTintColor={theme.colors.primary}
                          />
                        </View>
                        {index < array.length - 1 && <Divider />}
                      </React.Fragment>
                    );
                  })}
                </>
              )}
            </List.Section>
          </View>
        )}

        {/* Information Section */}
        <View style={styles.card}>
          <View style={[styles.infoCard, { backgroundColor: theme.colors.surfaceVariant, borderWidth: 1, borderColor: theme.colors.outlineVariant }]}>
            <Icon name="information" size={24} color={theme.colors.primary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: theme.colors.onSurface }]}>
                About Notifications
              </Text>
              <Text style={[styles.infoDescription, { color: theme.colors.onSurfaceVariant }]}>
                Inventory reminders help you stay on top of your supplies.{' '}
                Health notifications alert you when items cross their staleness thresholds or run low on stock.
              </Text>
            </View>
          </View>
        </View>

        {/* Test Buttons - Only shown in development mode */}
        {__DEV__ && (isInventoryReminderEnabled || isHealthAlertsEnabled) && (
          <View style={styles.testSection}>
            {isInventoryReminderEnabled && (
              <Button
                mode="contained-tonal"
                onPress={handleTestNotification}
                icon="bell-ring"
                style={styles.testButton}
              >
                Send Test Reminder
              </Button>
            )}
            {isHealthAlertsEnabled && (
              <Button
                mode="contained-tonal"
                onPress={handleTestHealthAlert}
                icon="heart-pulse"
                style={[styles.testButton, { marginTop: isInventoryReminderEnabled ? 8 : 0 }]}
              >
                Send Test Health Alert
              </Button>
            )}
          </View>
        )}

        {timePickerVisible && (
          <DateTimePicker
            value={timePickerType === 'time1' ? reminderTime1 : timePickerType === 'time2' ? reminderTime2 : healthAlertTime}
            mode="time"
            is24Hour={false}
            onChange={(event, selectedDate) => {
              setTimePickerVisible(false);
              if (selectedDate) {
                handleTimePickerConfirm(selectedDate);
              }
            }}
          />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: sp.base,
    marginBottom: sp.sm,
  },
  card: {
    marginHorizontal: sp.base,
    marginTop: sp.base,
    borderRadius: r.xxl,
    overflow: 'hidden',
    ...commonStyles.shadow,
  },
  sectionHeader: {
    padding: sp.base,
    paddingBottom: 0,
  },
  listSection: {
    marginVertical: 0,
  },
  testSection: {
    padding: sp.base,
    paddingBottom: sp.xl,
  },
  sectionTitle: {
    fontSize: screen.isSmall ? fs.xl : fs.h3,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  sectionDescription: {
    fontSize: fs.sm,
    lineHeight: 20,
    opacity: 0.8,
  },
  infoCard: {
    flexDirection: 'row',
    padding: sp.base,
    borderRadius: r.xxl,
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: sp.base,
  },
  infoTitle: {
    fontSize: fs.lg,
    fontWeight: '700',
    marginBottom: 5,
  },
  infoDescription: {
    fontSize: fs.sm,
    lineHeight: 20,
    opacity: 0.8,
  },
  testButton: {
    marginTop: sp.sm,
    borderRadius: r.lg,
  },
  thresholdItem: {
    padding: sp.base,
    paddingBottom: sp.xl,
  },
  thresholdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sp.base,
  },
  thresholdTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
  },
  thresholdLabel: {
    fontSize: fs.base,
    fontWeight: '600',
  },
  thresholdValue: {
    fontSize: fs.sm,
    fontWeight: '700',
  },
  slider: {
    width: '100%',
    height: 40,
  },
});

export default NotificationSettingsScreen;