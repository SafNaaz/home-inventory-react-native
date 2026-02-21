import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, StatusBar, Image, Platform } from 'react-native';
import { Title, useTheme, Text } from 'react-native-paper';
import { rs } from '../themes/Responsive';
import * as ExpoSplashScreen from 'expo-splash-screen';

interface SplashScreenProps {
  onAnimationFinish: () => void;
  isDark: boolean;
}

const { width, height } = Dimensions.get('window');

import DoodleBackground from '../components/DoodleBackground';

const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationFinish, isDark }) => {
  const theme = useTheme();
  
  // High-performance Native Animation Values
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Initial Reveal
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      })
    ]).start();

    // Hide native splash screen as soon as our custom one is ready to animate
    ExpoSplashScreen.hideAsync().catch(() => {});

    // 2. Subtitle Reveal
    Animated.timing(taglineOpacity, {
      toValue: 1,
      duration: 1000,
      delay: 600,
      useNativeDriver: true,
    }).start();

    // 3. Complete Sequence
    const timer = setTimeout(() => {
      // Final fade out before revealing app
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        onAnimationFinish();
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const bgColor = isDark ? '#020617' : '#F8FAFC';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle={isDark ? "light-content" : "dark-content"} />
      
      <DoodleBackground />

      <View style={styles.content}>
        <Animated.View 
          style={{
            opacity: opacity,
            transform: [{ scale: scale }],
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Text 
            style={[
              styles.brandText, 
              { 
                color: isDark ? '#FFF' : theme.colors.primary,
              }
            ]}
          >
            HiHome
          </Text>
          
          <Animated.View 
             style={{ 
               marginLeft: rs(8),
               transform: [{ 
                 rotate: scale.interpolate({
                   inputRange: [0.95, 1],
                   outputRange: ['-10deg', '0deg']
                 })
               }]
             }}
          >
            <Image 
              source={require('../../assets/icon.png')} 
              style={styles.smallIcon}
              resizeMode="contain"
            />
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  brandText: {
    fontSize: rs(54),
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -1,
    // Using fun, rounded fonts that feel "funky" but stable
    fontFamily: Platform.OS === 'ios' ? 'Chalkboard SE' : 'monospace',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  smallIcon: {
    width: rs(58),
    height: rs(58),
    borderRadius: rs(12),
  }
});

export default SplashScreen;
