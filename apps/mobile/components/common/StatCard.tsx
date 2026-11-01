import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Radius, Shadows, Typography } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  /** The icon container background color (e.g. Colors.blue.bg) */
  iconBg?: string;
  /** Optional value text color override */
  valueColor?: string;
  /** Pulsing red dot (for alerts) */
  pulsing?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  valueColor,
  onPress,
  style,
}) => {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const defaultIconBg = isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(59, 130, 246, 0.10)';

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => { scale.value = withTiming(0.97, { duration: 80 }); }}
      onPressOut={() => { scale.value = withTiming(1, { duration: 120 }); }}
      onPress={onPress}
      style={[animStyle, styles.wrapper, style]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
          !isDark ? Shadows.cardSubtle : undefined,
        ]}
      >
        {/* Top row: label + icon */}
        <View style={styles.topRow}>
          <Text style={[styles.title, { color: theme.textMuted }]} numberOfLines={1}>{title}</Text>
          <View style={[styles.iconCircle, { backgroundColor: iconBg || defaultIconBg }]}>
            {icon}
          </View>
        </View>

        {/* Value */}
        <Text style={[styles.value, { color: valueColor || theme.text }]}>
          {value}
        </Text>

        {/* Subtitle */}
        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.textMuted }]} numberOfLines={2}>{subtitle}</Text>
        ) : null}
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 14,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    ...Typography.captionMedium,
    flex: 1,
    marginRight: 8,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    ...Typography.statValue,
    marginBottom: 4,
  },
  subtitle: {
    ...Typography.caption,
    lineHeight: 16,
  },
});
