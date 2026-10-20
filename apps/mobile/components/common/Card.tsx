import React from 'react';
import { View, ViewStyle, StyleSheet, StyleProp } from 'react-native';
import { Colors, Radius, Shadows } from '../../constants/theme';

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
  return (
    <View
      style={[
        styles.card,
        !flat && Shadows.card,
        accentColor && { borderLeftColor: accentColor, borderLeftWidth: 2 },
        noPadding && { padding: 0 },
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
}) => <View style={[styles.cardHeader, style]}>{children}</View>;

export const CardContent: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({
  children,
  style,
}) => <View style={[styles.cardContent, style]}>{children}</View>;

export const CardFooter: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({
  children,
  style,
}) => <View style={[styles.cardFooter, style]}>{children}</View>;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    padding: 16,
  },
  cardHeader: {
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  cardContent: {
    // no extra padding — used to wrap card body sections
  },
  cardFooter: {
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
