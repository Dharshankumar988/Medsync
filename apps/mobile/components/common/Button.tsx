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
import { Colors, Radius, Shadows } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

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
  const { theme, isDark } = useTheme();

  const containerStyle: ViewStyle = {
    ...styles.base,
    ...sizeStyles[size].container,
    ...(variant === 'primary'     ? { backgroundColor: color ?? theme.primaryButton, ...(!isDark ? Shadows.button : {}) } : {}),
    ...(variant === 'secondary'   ? { backgroundColor: theme.secondaryButton, borderWidth: 1, borderColor: theme.border } : {}),
    ...(variant === 'outline'     ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.border } : {}),
    ...(variant === 'ghost'       ? { backgroundColor: 'transparent' } : {}),
    ...(variant === 'destructive' ? { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2', borderWidth: 1, borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5' } : {}),
    ...(disabled || loading       ? styles.disabled  : {}),
  };

  const textColor =
    variant === 'primary'     ? theme.primaryButtonText :
    variant === 'destructive' ? '#EF4444' :
    variant === 'ghost'       ? theme.textMuted :
    variant === 'secondary'   ? theme.secondaryButtonText :
                                theme.text;

  return (
    <TouchableOpacity
      style={[containerStyle, style]}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={textColor}
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
