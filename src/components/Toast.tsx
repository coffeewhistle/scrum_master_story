import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, { SlideInUp, FadeOut } from 'react-native-reanimated';
import { useUIStore } from '../stores/uiStore';
import { colors } from '../constants/theme';

const Toast: React.FC = () => {
  const toastMessage = useUIStore((s) => s.toastMessage);
  const clearToast = useUIStore((s) => s.clearToast);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => clearToast(), 2500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage, clearToast]);

  if (!toastMessage) return null;

  return (
    <Animated.View
      entering={SlideInUp.springify().damping(14)}
      exiting={FadeOut.duration(300)}
      style={styles.container}
      key={toastMessage}  // Force re-mount on new message
    >
      <Text style={styles.text}>{toastMessage}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 24,
    right: 24,
    backgroundColor: colors.danger,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  text: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default Toast;
