import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated, PanResponder, Dimensions, Text, Alert } from 'react-native';
import { Title, Paragraph, Button, useTheme, Surface } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { tourManager, TourGuide } from '../managers/TourManager';
import { commonStyles } from '../themes/AppTheme';

export const TourBubble: React.FC = () => {
  const [guide, setGuide] = useState<TourGuide | null>(null);
  const theme = useTheme();
  const slideAnim = useRef(new Animated.Value(100)).current;
  const pan = useRef(new Animated.ValueXY()).current;
  const dragHint = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 10,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      }
    })
  ).current;

  useEffect(() => {
    const handleUpdate = () => {
      const current = tourManager.currentGuide;
      setGuide(current);
      
      if (current) {
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: false,
        }).start();
      } else {
        Animated.timing(slideAnim, {
          toValue: 200,
          duration: 300,
          useNativeDriver: false,
        }).start();
      }
    };

    handleUpdate();
    return tourManager.addListener(handleUpdate);
  }, []);

  // Reset pan offset and restart drag hint animation on every step change
  useEffect(() => {
    pan.setValue({ x: 0, y: 0 });
    pan.setOffset({ x: 0, y: 0 });

    // Subtle looping nudge on the drag handle
    dragHint.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dragHint, { toValue: -5, duration: 400, useNativeDriver: true }),
        Animated.timing(dragHint, { toValue: 5, duration: 400, useNativeDriver: true }),
        Animated.timing(dragHint, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(1500),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [guide?.step]);

  if (!guide) return null;

  const SCREEN_HEIGHT = Dimensions.get('window').height;
  const shoppingSteps = ['finalize_list', 'start_shopping', 'finish_shopping'];
  const bottomValue =
    (guide.step === 'existing_cart' || guide.step === 'go_shopping') ? SCREEN_HEIGHT - 200 :
    guide.step === 'magic_cart' ? 280 :
    shoppingSteps.includes(guide.step) ? Math.round(SCREEN_HEIGHT / 2) - 100 : 110;

  const ICON_TOKENS: Record<string, string> = {
    '{{eye}}':        'eye-off-outline',
    '{{search}}':     'magnify',
    '{{wand}}':       'auto-fix',
    '{{hidden}}':     'sleep',
    '{{misc}}':       'tag-plus',
    '{{swipe_left}}': 'gesture-swipe-left',
    '{{plus}}':       'plus-circle-outline',
  };

  const renderMessage = () => {
    const parts: { text?: string; icon?: string }[] = [];
    const tokenRegex = /\{\{(eye|search|wand|hidden|misc|swipe_left|plus)\}\}/g;
    let lastIndex = 0;
    let match;
    while ((match = tokenRegex.exec(guide.message)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: guide.message.slice(lastIndex, match.index) });
      }
      parts.push({ icon: ICON_TOKENS[match[0]] });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < guide.message.length) {
      parts.push({ text: guide.message.slice(lastIndex) });
    }
    return (
      <Text style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
        {parts.map((p, i) =>
          p.icon ? (
            <Text key={i}> <Icon name={p.icon as any} size={15} color={theme.colors.primary} />{' '}</Text>
          ) : (
            <Text key={i}>{p.text}</Text>
          )
        )}
      </Text>
    );
  };

  return (
    <Animated.View 
      {...panResponder.panHandlers}
      style={[
      styles.container,
      { 
        bottom: bottomValue,
        transform: [{ translateY: Animated.add(slideAnim, pan.y) }],
        opacity: guide ? 1 : 0
      }
    ]}>
      <Surface style={[styles.bubble, { backgroundColor: theme.colors.primaryContainer, ...commonStyles.shadow }]}>
        <View style={styles.header}>
          <Animated.View style={{ transform: [{ translateY: dragHint }] }}>
            <Icon name="drag-horizontal-variant" size={24} color={theme.colors.primary} />
          </Animated.View>
          <Title style={[styles.title, { color: theme.colors.onSurface }]}>{guide.title}</Title>
          <Button mode="text" compact onPress={() => {
            if (guide.step === 'completed') {
              tourManager.quitTour();
            } else {
              Alert.alert(
                'Skip Tour?',
                'You can restart the tour anytime from Settings → App Walkthrough Tour.',
                [
                  { text: 'Keep Going', style: 'cancel' },
                  { text: 'Skip', style: 'destructive', onPress: () => tourManager.quitTour() },
                ]
              );
            }
          }} labelStyle={{ fontSize: 12 }}>
            {guide.step === 'completed' ? 'End Tour' : 'Skip Tour'}
          </Button>
        </View>
        {renderMessage()}
        <Paragraph style={{ fontSize: 10, color: theme.colors.onSurfaceVariant, opacity: 0.5, textAlign: 'right', marginTop: 4 }}>
          drag to move
        </Paragraph>
      </Surface>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 9999,
    elevation: 10,
  },
  bubble: {
    padding: 16,
    borderRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    fontWeight: 'bold',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  }
});
