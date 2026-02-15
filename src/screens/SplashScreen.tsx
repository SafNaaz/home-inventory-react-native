import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, StatusBar, Image } from 'react-native';
import { Title, useTheme } from 'react-native-paper';

interface SplashScreenProps {
  onAnimationFinish: () => void;
}

const { width, height } = Dimensions.get('window');

import DoodleBackground from '../components/DoodleBackground';

const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationFinish }) => {
  const theme = useTheme();
  
  // Animation values
  const [blur, setBlur] = React.useState(20);
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Listener to handle the blur effect
    const blurListener = animValue.addListener(({ value }) => {
      // Blur goes from 20 to 0 as value goes from 0 to 1
      setBlur(20 * (1 - value));
    });

    // Animation Sequence
    Animated.sequence([
      Animated.delay(400),
      Animated.timing(animValue, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false, // Required for blurRadius calculation via state
      }),
      Animated.delay(1000),
    ]).start(() => {
      onAnimationFinish();
    });

    return () => {
      animValue.removeListener(blurListener);
    };
  }, []);

  const iconOpacity = animValue;
  const iconScale = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle={theme.dark ? "light-content" : "dark-content"} />
      
      {/* Doodle Background */}
      <DoodleBackground />

      {/* Center Icon with Blur-to-Visible Effect */}
      <View style={styles.content}>
        <Animated.Image 
          source={require('../../assets/icon.png')} 
          style={[
            styles.icon,
            { 
              opacity: iconOpacity,
              transform: [{ scale: iconScale }]
            }
          ]}
          blurRadius={blur}
          resizeMode="contain"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 180,
    height: 180,
    borderRadius: 40,
  }
});

export default SplashScreen;
