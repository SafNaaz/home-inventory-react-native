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

import { settingsManager } from '../managers/SettingsManager';
import { InventoryCategory } from '../models/Types';
import { CATEGORY_CONFIG } from '../constants/CategoryConfig';

const NotificationSettingsScreen: React.FC = () => {
  const theme = useTheme();
  const [isInventoryReminderEnabled, setIsInventoryReminderEnabled] = useState(false);
  const [isSecondReminderEnabled, setIsSecondReminderEnabled] = useState(false);
  const [reminderTime1, setReminderTime1] = useState(new Date());
  const [reminderTime2, setReminderTime2] = useState(new Date());
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timePickerType, setTimePickerType] = useState<'time1' | 'time2'>('time1');
  const [thresholds, setThresholds] = useState<Record<string, number>>({});
  const [isHealthAlertsEnabled, setIsHealthAlertsEnabled] = useState(true);

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
  };

  const handleInventoryReminderToggle = async () => {
    await settingsManager.toggleInventoryReminder();
  };

  const handleSecondReminderToggle = async () => {
    await settingsManager.toggleSecondReminder();
  };

  const handleHealthAlertsToggle = async () => {
    await settingsManager.toggleHealthAlerts();
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleTimePickerOpen = (type: 'time1' | 'time2') => {
    setTimePickerType(type);
    setTimePickerVisible(true);
  };

  const handleTimePickerConfirm = async (date: Date) => {
    if (timePickerType === 'time1') {
      await settingsManager.updateReminderTime1(date);
    } else {
      await settingsManager.updateReminderTime2(date);
    }
    setTimePickerVisible(false);
  };

  const handleTestNotification = async () => {
    await settingsManager.sendTestNotification();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView}>
        {/* Inventory Reminders Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Inventory Reminders
          </Text>
          <Text style={[styles.sectionDescription, { color: theme.colors.onSurfaceVariant }]}>
            Get reminded to check your inventory and restock low items.
          </Text>
        </View>

        <List.Section>
          <List.Item
            title="Enable Inventory Reminders"
            description="Receive notifications to check your inventory"
            left={(props) => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch
                value={isInventoryReminderEnabled}
                onValueChange={handleInventoryReminderToggle}
                color={theme.colors.primary}
              />
            )}
          />
          
          <Divider />

          {isInventoryReminderEnabled && (
            <>
              <List.Item
                title="First Reminder"
                description={`Daily at ${formatTime(reminderTime1)}`}
                left={(props) => <List.Icon {...props} icon="clock-outline" />}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => handleTimePickerOpen('time1')}
              />

              <Divider />

              <List.Item
                title="Second Reminder"
                description={isSecondReminderEnabled ? `Daily at ${formatTime(reminderTime2)}` : 'Disabled'}
                left={(props) => <List.Icon {...props} icon="clock-outline" />}
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
          )}
        </List.Section>

        {/* Inventory Health Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Health Tracking Settings
          </Text>
          <Text style={[styles.sectionDescription, { color: theme.colors.onSurfaceVariant }]}>
            Define when an item should be flagged for health review based on its last update.
          </Text>
        </View>

        <List.Section>
          <List.Item
            title="Enable Health Notifications"
            description="Include health analysis in your reminders"
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

          {isHealthAlertsEnabled && Object.values(InventoryCategory).map((category) => {
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
                <Divider />
              </React.Fragment>
            );
          })}
        </List.Section>

        {/* Information Section */}
        <View style={styles.section}>
          <View style={[styles.infoCard, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Icon name="information" size={24} color={theme.colors.primary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: theme.colors.onSurface }]}>
                About Inventory Reminders
              </Text>
              <Text style={[styles.infoDescription, { color: theme.colors.onSurfaceVariant }]}>
                Inventory reminders help you stay on top of your household supplies. 
                You'll receive notifications at your chosen times to check items that are running low.
              </Text>
            </View>
          </View>
        </View>

        {/* Test Notification Button */}
        {isInventoryReminderEnabled && (
          <View style={styles.section}>
            <Button
              mode="outlined"
              onPress={handleTestNotification}
              icon="bell-ring"
              style={styles.testButton}
            >
              Send Test Notification
            </Button>
          </View>
        )}

        {timePickerVisible && (
          <DateTimePicker
            value={timePickerType === 'time1' ? reminderTime1 : reminderTime2}
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
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.8,
  },
  infoCard: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 24,
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  infoDescription: {
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.8,
  },
  testButton: {
    marginTop: 12,
    borderRadius: 16,
  },
  thresholdItem: {
    padding: 16,
    paddingBottom: 24,
  },
  thresholdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  thresholdTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thresholdLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  thresholdValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  slider: {
    width: '100%',
    height: 40,
  },
});

export default NotificationSettingsScreen;