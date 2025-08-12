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
} from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { settingsManager } from '../managers/SettingsManager';

const NotificationSettingsScreen: React.FC = () => {
  const theme = useTheme();
  const [isInventoryReminderEnabled, setIsInventoryReminderEnabled] = useState(false);
  const [isSecondReminderEnabled, setIsSecondReminderEnabled] = useState(false);
  const [reminderTime1, setReminderTime1] = useState(new Date());
  const [reminderTime2, setReminderTime2] = useState(new Date());

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
    setReminderTime1(settings.reminderTime1);
    setReminderTime2(settings.reminderTime2);
  };

  const handleInventoryReminderToggle = async () => {
    await settingsManager.toggleInventoryReminder();
  };

  const handleSecondReminderToggle = async () => {
    await settingsManager.toggleSecondReminder();
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
                onPress={() => {
                  // TODO: Open time picker for first reminder
                  console.log('Open time picker for first reminder');
                }}
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
                    onPress={() => {
                      // TODO: Open time picker for second reminder
                      console.log('Open time picker for second reminder');
                    }}
                  />
                </>
              )}
            </>
          )}
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
              onPress={() => {
                console.log('Test notification sent (demo mode)');
                // TODO: Send test notification
              }}
              icon="bell-ring"
              style={styles.testButton}
            >
              Send Test Notification
            </Button>
          </View>
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
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  testButton: {
    marginTop: 8,
  },
});

export default NotificationSettingsScreen;