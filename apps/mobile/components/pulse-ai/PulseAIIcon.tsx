import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withRepeat, withTiming, Easing, withSequence } from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface PulseAIIconProps {
  size?: number;
  animate?: boolean;
}

export function PulseAIIcon({ size = 24, animate = false }: PulseAIIconProps) {
  const strokeDashoffset = useSharedValue(100);

  useEffect(() => {
    if (animate) {
      strokeDashoffset.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 1500, easing: Easing.linear }),
          withTiming(100, { duration: 0 })
        ),
        -1,
        false
      );
    } else {
      strokeDashoffset.value = withTiming(0);
    }
  }, [animate]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDasharray: 100,
    strokeDashoffset: strokeDashoffset.value,
  }));

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EFF6FF', borderRadius: 8, padding: 4 }}>
      <Svg viewBox="0 0 24 24" fill="none" width="100%" height="100%">
        <AnimatedPath
          d="M3 12h4l3-8 4 16 3-8h4"
          stroke="#2563EB"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          animatedProps={animatedProps as any}
        />
        <Path d="M19 5v4m-2-2h4" stroke="#2563EB" strokeWidth="1.5" strokeOpacity={0.6} />
      </Svg>
    </View>
  );
}
