import React from 'react';
import { View, ViewStyle, StyleSheet, StyleProp } from 'react-native';
import { Radius, Shadows } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Adds a colored left-border accent */
  accentColor?: string;
  /** Removes default padding */
  noPadding?: boolean;
  /** Disables shadow */
  flat?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  accentColor,
  noPadding = false,
  flat = false,
}) => {
  const { theme, isDark } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
        !flat && isDark ? { shadowOpacity: 0 } : !flat ? Shadows.card : undefined,
        accentColor ? { borderLeftColor: accentColor, borderLeftWidth: 2 } : undefined,
        noPadding ? { padding: 0 } : undefined,
        style,
      ]}
    >
      {children}
    </View>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({
  children,
  style,
}) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.cardHeader, { borderBottomColor: theme.border }, style]}>
      {children}
    </View>
  );
};

export const CardContent: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({
  children,
  style,
}) => <View style={[styles.cardContent, style]}>{children}</View>;

export const CardFooter: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({
  children,
  style,
}) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.cardFooter, { borderTopColor: theme.border }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16,
  },
  cardHeader: {
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
  },
  cardContent: {
    // no extra padding
  },
  cardFooter: {
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
