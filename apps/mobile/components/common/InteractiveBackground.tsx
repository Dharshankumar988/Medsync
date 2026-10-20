import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Easing,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface InteractiveBackgroundProps {
  children?: React.ReactNode;
  theme?: 'patient' | 'doctor' | 'default';
}

export function InteractiveBackground({
  children,
  theme = 'patient',
}: InteractiveBackgroundProps) {
  // Primary interactive orb that responds to touch/drag
  const orb1Pos = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH * 0.2, y: SCREEN_HEIGHT * 0.25 })).current;
  const orb1Scale = useRef(new Animated.Value(1)).current;

  // Secondary ambient orbs that continuously float
  const orb2Pos = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH * 0.65, y: SCREEN_HEIGHT * 0.4 })).current;
  const orb3Pos = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH * 0.3, y: SCREEN_HEIGHT * 0.75 })).current;
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  // Determine accent colors
  const primaryColor = theme === 'doctor' ? 'rgba(37, 99, 235, 0.18)' : 'rgba(16, 185, 129, 0.16)';
  const secondaryColor = theme === 'doctor' ? 'rgba(99, 102, 241, 0.14)' : 'rgba(14, 165, 233, 0.14)';
  const tertiaryColor = theme === 'doctor' ? 'rgba(147, 51, 234, 0.10)' : 'rgba(52, 211, 153, 0.12)';

  // Pan responder for interactive touch reaction
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        // Only respond to deliberate touches/drags
        return Math.abs(gesture.dx) > 10 || Math.abs(gesture.dy) > 10;
      },
      onPanResponderMove: (_, gesture) => {
        Animated.spring(orb1Pos, {
          toValue: {
            x: Math.max(20, Math.min(SCREEN_WIDTH - 120, gesture.moveX - 100)),
            y: Math.max(40, Math.min(SCREEN_HEIGHT - 120, gesture.moveY - 100)),
          },
          friction: 7,
          tension: 40,
          useNativeDriver: false,
        }).start();

        Animated.spring(orb1Scale, {
          toValue: 1.25,
          friction: 6,
          useNativeDriver: false,
        }).start();
      },
      onPanResponderRelease: () => {
        Animated.spring(orb1Scale, {
          toValue: 1,
          friction: 6,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  // Continuous subtle organic ambient floating animation
  useEffect(() => {
    const floatOrb2 = Animated.loop(
      Animated.sequence([
        Animated.timing(orb2Pos, {
          toValue: { x: SCREEN_WIDTH * 0.75, y: SCREEN_HEIGHT * 0.35 },
          duration: 5500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(orb2Pos, {
          toValue: { x: SCREEN_WIDTH * 0.55, y: SCREEN_HEIGHT * 0.48 },
          duration: 6000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(orb2Pos, {
          toValue: { x: SCREEN_WIDTH * 0.65, y: SCREEN_HEIGHT * 0.4 },
          duration: 5000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );

    const floatOrb3 = Animated.loop(
      Animated.sequence([
        Animated.timing(orb3Pos, {
          toValue: { x: SCREEN_WIDTH * 0.45, y: SCREEN_HEIGHT * 0.68 },
          duration: 7000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(orb3Pos, {
          toValue: { x: SCREEN_WIDTH * 0.2, y: SCREEN_HEIGHT * 0.8 },
          duration: 6500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(orb3Pos, {
          toValue: { x: SCREEN_WIDTH * 0.3, y: SCREEN_HEIGHT * 0.75 },
          duration: 6000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    );

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.75,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );

    floatOrb2.start();
    floatOrb3.start();
    pulse.start();

    return () => {
      floatOrb2.stop();
      floatOrb3.stop();
      pulse.stop();
    };
  }, [orb2Pos, orb3Pos, pulseAnim]);

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* Subtle geometric dot grid pattern */}
      <View style={styles.meshGrid} pointerEvents="none">
        <View style={styles.radialHighlight} />
      </View>

      {/* Primary interactive glowing orb */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glowOrb,
          styles.orb1,
          {
            backgroundColor: primaryColor,
            left: orb1Pos.x,
            top: orb1Pos.y,
            transform: [{ scale: orb1Scale }],
            opacity: pulseAnim,
          },
        ]}
      />

      {/* Secondary ambient floating orb */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glowOrb,
          styles.orb2,
          {
            backgroundColor: secondaryColor,
            left: orb2Pos.x,
            top: orb2Pos.y,
          },
        ]}
      />

      {/* Tertiary bottom-ambient orb */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glowOrb,
          styles.orb3,
          {
            backgroundColor: tertiaryColor,
            left: orb3Pos.x,
            top: orb3Pos.y,
          },
        ]}
      />

      {/* Foreground Content */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F1D', // Ultra-premium deep slate/navy background
    overflow: 'hidden',
  },
  meshGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
  radialHighlight: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  glowOrb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orb1: {
    width: 280,
    height: 280,
    borderRadius: 140,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 80,
  },
  orb2: {
    width: 240,
    height: 240,
    borderRadius: 120,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 70,
  },
  orb3: {
    width: 320,
    height: 320,
    borderRadius: 160,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 90,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});
