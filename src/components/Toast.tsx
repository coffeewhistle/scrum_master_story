import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useUIStore } from '../stores/uiStore';
import { colors } from '../constants/theme';

const Toast: React.FC = () => {
  const toastMessage = useUIStore((s) => s.toastMessage);
  const clearToast = useUIStore((s) => s.clearToast);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => clearToast(), 1800);
      return () => clearTimeout(timer);
    }
  }, [toastMessage, clearToast]);

  if (!toastMessage) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
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
    bottom: 80,
    left: 24,
    right: 24,
    backgroundColor: colors.bgCard,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: colors.danger,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  text: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default Toast;
