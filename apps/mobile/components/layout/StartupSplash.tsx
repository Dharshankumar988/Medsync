import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

const APP_LOGO = require('../../assets/images/app-logo.png');

interface StartupSplashProps {
  onFinish?: () => void;
}

/**
 * Glitch-free startup splash animation that matches the native #00040D splash
 * background and smoothly hands off to the app UI.
 */
export const StartupSplash: React.FC<StartupSplashProps> = ({ onFinish }) => {
  const [visible, setVisible] = useState(true);
  const [dismissing, setDismissing] = useState(false);

  const containerOpacity = useRef(new Animated.Value(1)).current;
  const containerScale = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.86)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.85)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(12)).current;
  const barScaleX = useRef(new Animated.Value(0.05)).current;

  useEffect(() => {
    let mounted = true;

    const intro = Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 340,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 7,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity, {
          toValue: 0.75,
          duration: 420,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(ringScale, {
          toValue: 1.08,
          friction: 6,
          tension: 45,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(barScaleX, {
          toValue: 1,
          duration: 550,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]);

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ringScale, {
          toValue: 1.16,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ringScale, {
          toValue: 1.04,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    intro.start(() => {
      if (mounted) pulseLoop.start();
    });

    const hideTimer = setTimeout(() => {
      if (!mounted) return;
      setDismissing(true);
      Animated.parallel([
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 340,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(containerScale, {
          toValue: 1.03,
          duration: 340,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        pulseLoop.stop();
        if (mounted) {
          setVisible(false);
          onFinish?.();
        }
      });
    }, 1450);

    return () => {
      mounted = false;
      clearTimeout(hideTimer);
      intro.stop();
      pulseLoop.stop();
    };
  }, [
    barScaleX,
    containerOpacity,
    containerScale,
    logoOpacity,
    logoScale,
    onFinish,
    ringOpacity,
    ringScale,
    textOpacity,
    textTranslateY,
  ]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents={dismissing ? 'none' : 'auto'}
      style={[
        styles.overlay,
        {
          opacity: containerOpacity,
          transform: [{ scale: containerScale }],
        },
      ]}
    >
      <View style={styles.centerStage}>
        <Animated.View
          style={[
            styles.glowRing,
            {
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.logoFrame,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image
            source={APP_LOGO}
            style={styles.logoImage}
            resizeMode="cover"
            fadeDuration={0}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.textBlock,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text style={styles.brandName}>MedSync</Text>
          <Text style={styles.tagline}>SECURE CLINICAL & PHARMACY NETWORK</Text>

          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                { transform: [{ scaleX: barScaleX }] },
              ]}
            />
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#00040D',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  centerStage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  glowRing: {
    position: 'absolute',
    top: -12,
    width: 148,
    height: 148,
    borderRadius: 42,
    borderWidth: 1.5,
    borderColor: 'rgba(34, 211, 238, 0.35)',
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  logoFrame: {
    width: 124,
    height: 124,
    borderRadius: 34,
    backgroundColor: '#00040D',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  logoImage: {
    width: 124,
    height: 124,
    borderRadius: 34,
  },
  textBlock: {
    alignItems: 'center',
    marginTop: 24,
  },
  brandName: {
    fontSize: 30,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.6,
  },
  tagline: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#38BDF8',
    letterSpacing: 1.8,
    marginTop: 6,
  },
  progressTrack: {
    width: 140,
    height: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(56, 189, 248, 0.16)',
    overflow: 'hidden',
    marginTop: 22,
  },
  progressFill: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#22D3EE',
  },
});

