import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

const { width, height } = Dimensions.get('window');

const DOODLE_ICONS = [
  'food-apple-outline',
  'fridge-outline',
  'shopping-outline',
  'cart-outline',
  'bottle-wine-outline',
  'bread-slice-outline',
  'carrot',
  'cheese',
  'coffee-outline',
  'cupcake',
  'egg-outline',
  'fish',
  'hamburger',
  'ice-cream',
  'leaf',
  'muffin',
  'pizza',
  'pot-steam-outline',
  'silverware-variant',
  'water-outline',
];

interface DoodleProps {
  id: number;
  name: string;
  top: number;
  left: number;
  rotation: string;
  size: number;
}

const DoodleBackground: React.FC = () => {
  const theme = useTheme();
  
  const doodles = useMemo(() => {
    const items: DoodleProps[] = [];
    const count = 15; // Number of doodles to show
    
    for (let i = 0; i < count; i++) {
      items.push({
        id: i,
        name: DOODLE_ICONS[Math.floor(Math.random() * DOODLE_ICONS.length)],
        top: Math.random() * height,
        left: Math.random() * width,
        rotation: `${Math.random() * 360}deg`,
        size: 24 + Math.random() * 32,
      });
    }
    return items;
  }, []);

  const doodleColor = theme.dark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';

  return (
    <View style={[StyleSheet.absoluteFill, styles.container]} pointerEvents="none">
      {doodles.map((doodle) => (
        <View
          key={doodle.id}
          style={[
            styles.doodle,
            {
              top: doodle.top,
              left: doodle.left,
              transform: [{ rotate: doodle.rotation }],
            },
          ]}
        >
          <Icon name={doodle.name as any} size={doodle.size} color={doodleColor} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  doodle: {
    position: 'absolute',
  },
});

export default DoodleBackground;
