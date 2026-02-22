import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
} from 'react-native';
import { Portal, Title } from 'react-native-paper';
import { commonStyles } from '../themes/AppTheme';

const { height } = Dimensions.get('window');

interface BottomSheetDialogProps {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  children: React.ReactNode;
  theme: any;
  insets: any;
  maxHeight?: string | number;
}

const BottomSheetDialog: React.FC<BottomSheetDialogProps> = ({ 
  visible, 
  onDismiss, 
  title, 
  children, 
  theme, 
  insets, 
  maxHeight 
}) => {
  const [show, setShow] = useState(visible);
  const translateY = useRef(new Animated.Value(height)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShow(true);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: height, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setShow(false));
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      const backAction = () => {
        onDismiss();
        return true;
      };
      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => backHandler.remove();
    }
  }, [visible, onDismiss]);

  if (!show) return null;

  return (
    <Portal>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', opacity }]} />
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1} 
          onPress={onDismiss}
        />
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <Animated.View style={{ 
            backgroundColor: (theme.dark === false && theme.colors.surface === '#FFFFFF') ? '#FFFFFF' : theme.colors.surface, 
            borderRadius: 28,
            marginBottom: insets.bottom > 0 ? insets.bottom : 8,
            marginHorizontal: 8,
            paddingBottom: 20,
            maxHeight: (maxHeight as any) || '92%',
            transform: [{ translateY }],
            ...commonStyles.shadow,
            elevation: 16,
            overflow: 'hidden'
          }}>
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.onSurfaceVariant, opacity: 0.3 }} />
            </View>
            <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
              {title && <Title style={{ marginBottom: 12, fontWeight: '800', color: theme.colors.onSurface }}>{title}</Title>}
              <View style={{ minHeight: 20 }}>
                {children}
              </View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Portal>
  );
};

export default BottomSheetDialog;
