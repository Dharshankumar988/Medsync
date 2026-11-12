import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Modal,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface MedicalLoadingIndicatorProps {
  visible?: boolean;
  message?: string;
  subMessage?: string;
  icon?: 'activity' | 'shield' | 'pulse';
  color?: string;
  isModal?: boolean;
}

export function MedicalLoadingIndicator({
  visible = true,
  message = 'Securing Connection...',
  subMessage = 'Validating cryptographic credentials',
  color = '#38BDF8',
  isModal = false,
}: MedicalLoadingIndicatorProps) {
  const { theme } = useTheme();
  const barTranslate = useRef(new Animated.Value(-110)).current;
  const textFade = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (!visible) return;

    barTranslate.setValue(-110);
    const animBar = Animated.loop(
      Animated.timing(barTranslate, {
        toValue: 220,
        duration: 1150,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      })
    );

    const animText = Animated.loop(
      Animated.sequence([
        Animated.timing(textFade, {
          toValue: 1,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(textFade, {
          toValue: 0.65,
          duration: 850,
          useNativeDriver: true,
        }),
      ])
    );

    animBar.start();
    animText.start();

    return () => {
      animBar.stop();
      animText.stop();
    };
  }, [visible, barTranslate, textFade]);

  if (!visible) return null;

  const content = (
    <View style={styles.centerBox}>
      {/* Sleek Animated Loadbar */}
      <View style={[styles.loadBarTrack, { borderColor: `${color}30` }]}>
        <Animated.View
          style={[
            styles.loadBarFill,
            {
              backgroundColor: color,
              transform: [{ translateX: barTranslate }],
            },
          ]}
        />
      </View>

      {message ? (
        <Animated.Text
          style={[
            styles.message,
            { opacity: textFade, color: isModal ? '#F8FAFC' : theme.text },
          ]}
        >
          {message}
        </Animated.Text>
      ) : null}

      {subMessage ? (
        <Text style={[styles.subMessage, { color: isModal ? '#94A3B8' : theme.textMuted }]}>
          {subMessage}
        </Text>
      ) : null}
    </View>
  );

  if (isModal) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>{content}</View>
      </Modal>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 29, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 320,
  },
  loadBarTrack: {
    width: 210,
    height: 6,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
    overflow: 'hidden',
    marginBottom: 16,
  },
  loadBarFill: {
    width: 96,
    height: '100%',
    borderRadius: 999,
  },
  message: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
    letterSpacing: 0.1,
    marginTop: 2,
  },
  subMessage: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
});
