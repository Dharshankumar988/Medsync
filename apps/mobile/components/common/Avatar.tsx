import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface AvatarProps {
  src?: string | null;
  fallback: string;
  size?: number;
}

export const Avatar = React.memo(function Avatar({ src, fallback, size = 40 }: AvatarProps) {
  const [error, setError] = React.useState(false);
  const { theme, isDark } = useTheme();

  // Reset error when src changes
  React.useEffect(() => {
    setError(false);
  }, [src]);

  const dynamicContainerStyle = React.useMemo(
    () => ({
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: isDark ? '#27272A' : '#E4E4E7',
      borderColor: theme.border,
      borderWidth: 1,
    }),
    [size, isDark, theme.border]
  );

  const dynamicImageStyle = React.useMemo(
    () => ({ width: size, height: size, borderRadius: size / 2 }),
    [size]
  );
  const dynamicTextStyle = React.useMemo(
    () => ({ fontSize: size * 0.38, color: theme.text }),
    [size, theme.text]
  );

  return (
    <View style={[styles.container, dynamicContainerStyle]}>
      {src && !error ? (
        <Image
          source={{ uri: src }}
          style={dynamicImageStyle}
          onError={() => setError(true)}
          resizeMode="cover"
        />
      ) : (
        <Text style={[styles.text, dynamicTextStyle]}>
          {fallback.substring(0, 2).toUpperCase()}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
