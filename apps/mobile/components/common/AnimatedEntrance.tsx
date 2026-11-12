import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleProp,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native';

interface AnimatedEntranceProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  translateY?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Smoothly fades and slides content into view on mount.
 */
export const AnimatedEntrance: React.FC<AnimatedEntranceProps> = ({
  children,
  delay = 0,
  duration = 320,
  translateY = 14,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const offset = useRef(new Animated.Value(translateY)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(offset, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [delay, duration, opacity, offset]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateY: offset }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

interface AnimatedScaleButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  scaleTo?: number;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Touchable wrapper with a responsive spring press scale animation.
 */
export const AnimatedScaleButton: React.FC<AnimatedScaleButtonProps> = ({
  children,
  scaleTo = 0.96,
  containerStyle,
  style,
  onPressIn,
  onPressOut,
  ...rest
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn: TouchableOpacityProps['onPressIn'] = (e) => {
    Animated.spring(scale, {
      toValue: scaleTo,
      friction: 7,
      tension: 180,
      useNativeDriver: true,
    }).start();
    onPressIn?.(e);
  };

  const handlePressOut: TouchableOpacityProps['onPressOut'] = (e) => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 160,
      useNativeDriver: true,
    }).start();
    onPressOut?.(e);
  };

  return (
    <Animated.View style={[containerStyle, { transform: [{ scale }] }]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={style}
        {...rest}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

