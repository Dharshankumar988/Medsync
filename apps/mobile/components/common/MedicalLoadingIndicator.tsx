import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Modal,
} from 'react-native';
import { Activity, ShieldCheck, HeartPulse } from 'lucide-react-native';

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
  icon = 'pulse',
  color = '#10B981',
  isModal = false,
}: MedicalLoadingIndicatorProps) {
  // Animation values
  const ring1Scale = useRef(new Animated.Value(0.8)).current;
  const ring1Opacity = useRef(new Animated.Value(0.7)).current;
  const ring2Scale = useRef(new Animated.Value(0.8)).current;
  const ring2Opacity = useRef(new Animated.Value(0.5)).current;
  const iconScale = useRef(new Animated.Value(1)).current;
  const textFade = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (!visible) return;

    // Concentric expanding ring 1
    const animRing1 = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ring1Scale, {
            toValue: 1.6,
            duration: 1800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(ring1Opacity, {
            toValue: 0,
            duration: 1800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(ring1Scale, {
            toValue: 0.8,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(ring1Opacity, {
            toValue: 0.7,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    // Staggered concentric expanding ring 2
    const animRing2 = Animated.loop(
      Animated.sequence([
        Animated.delay(600),
        Animated.parallel([
          Animated.timing(ring2Scale, {
            toValue: 1.8,
            duration: 1800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(ring2Opacity, {
            toValue: 0,
            duration: 1800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(ring2Scale, {
            toValue: 0.8,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(ring2Opacity, {
            toValue: 0.5,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    // Heartbeat icon pulse rhythm
    const animIcon = Animated.loop(
      Animated.sequence([
        Animated.timing(iconScale, {
          toValue: 1.18,
          duration: 350,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(iconScale, {
          toValue: 0.95,
          duration: 250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(iconScale, {
          toValue: 1.12,
          duration: 250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(iconScale, {
          toValue: 1.0,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(500),
      ])
    );

    // Subtle text glow/fade
    const animText = Animated.loop(
      Animated.sequence([
        Animated.timing(textFade, {
          toValue: 1.0,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(textFade, {
          toValue: 0.55,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );

    animRing1.start();
    animRing2.start();
    animIcon.start();
    animText.start();

    return () => {
      animRing1.stop();
      animRing2.stop();
      animIcon.stop();
      animText.stop();
    };
  }, [visible, ring1Scale, ring1Opacity, ring2Scale, ring2Opacity, iconScale, textFade]);

  if (!visible) return null;

  const renderIcon = () => {
    if (icon === 'shield') return <ShieldCheck size={28} color={color} />;
    if (icon === 'activity') return <Activity size={28} color={color} />;
    return <HeartPulse size={28} color={color} />;
  };

  const content = (
    <View style={styles.centerBox}>
      {/* Animated Ripple Rings Container */}
      <View style={styles.ringsContainer}>
        <Animated.View
          style={[
            styles.ring,
            {
              borderColor: color,
              transform: [{ scale: ring2Scale }],
              opacity: ring2Opacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.ring,
            {
              borderColor: color,
              transform: [{ scale: ring1Scale }],
              opacity: ring1Opacity,
            },
          ]}
        />
        {/* Core Pulsing Icon Badge */}
        <Animated.View
          style={[
            styles.coreBadge,
            {
              backgroundColor: `${color}18`,
              borderColor: color,
              transform: [{ scale: iconScale }],
            },
          ]}
        >
          {renderIcon()}
        </Animated.View>
      </View>

      {/* Animated Status Text */}
      {message ? (
        <Animated.Text style={[styles.message, { opacity: textFade }]}>
          {message}
        </Animated.Text>
      ) : null}

      {subMessage ? (
        <Text style={styles.subMessage}>{subMessage}</Text>
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
    backgroundColor: 'rgba(10, 15, 29, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  ringsContainer: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  ring: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
  },
  coreBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  message: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: 0.2,
    marginTop: 4,
  },
  subMessage: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
});
