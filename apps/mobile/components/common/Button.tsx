import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  TouchableOpacityProps,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { Colors, Radius, Shadows, Typography } from '../../constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?:  ButtonVariant;
  size?:     ButtonSize;
  loading?:  boolean;
  /** Override the primary background color (used for role-tinted buttons) */
  color?:    string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  style?:    StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button = React.memo(function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading,
  color,
  iconLeft,
  iconRight,
  style,
  textStyle,
  disabled,
  ...props
}: ButtonProps) {
  const containerStyle: ViewStyle = {
    ...styles.base,
    ...sizeStyles[size].container,
    ...(variant === 'primary'     ? { backgroundColor: color ?? Colors.roles.patient.primary, ...Shadows.button } : {}),
    ...(variant === 'secondary'   ? styles.secondary : {}),
    ...(variant === 'outline'     ? styles.outline   : {}),
    ...(variant === 'ghost'       ? styles.ghost     : {}),
    ...(variant === 'destructive' ? styles.destructive : {}),
    ...(disabled || loading       ? styles.disabled  : {}),
  };

  const textColor =
    variant === 'primary'     ? '#FFFFFF' :
    variant === 'destructive' ? Colors.red.text :
    variant === 'ghost'       ? Colors.textMuted :
                                Colors.text;

  return (
    <TouchableOpacity
      style={[containerStyle, style]}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#FFF' : Colors.roles.patient.primary}
          size="small"
        />
      ) : (
        <>
          {iconLeft}
          <Text
            style={[
              styles.text,
              sizeStyles[size].text,
              { color: textColor },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {iconRight}
        </>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  base: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.md,
  },
  text: {
    fontWeight: '600',
  },
  secondary: {
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  destructive: {
    backgroundColor: Colors.red.bg,
    borderWidth: 1,
    borderColor: Colors.red.border,
  },
  disabled: {
    opacity: 0.45,
  },
});

const sizeStyles: Record<ButtonSize, { container: ViewStyle; text: TextStyle }> = {
  sm: {
    container: { height: 36, paddingHorizontal: 14 },
    text:      { fontSize: 13, fontWeight: '600' },
  },
  md: {
    container: { height: 48, paddingHorizontal: 18 },
    text:      { fontSize: 15, fontWeight: '600' },
  },
  lg: {
    container: { height: 54, paddingHorizontal: 22 },
    text:      { fontSize: 16, fontWeight: '700' },
  },
};
