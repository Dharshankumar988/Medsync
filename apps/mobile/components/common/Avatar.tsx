import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

interface AvatarProps {
  src?: string;
  fallback: string;
  size?: number;
}

export const Avatar = React.memo(function Avatar({ src, fallback, size = 40 }: AvatarProps) {
  const [error, setError] = React.useState(false);

  const dynamicContainerStyle = React.useMemo(() => ({ width: size, height: size, borderRadius: size / 2 }), [size]);
  const dynamicImageStyle = React.useMemo(() => ({ width: size, height: size, borderRadius: size / 2 }), [size]);
  const dynamicTextStyle = React.useMemo(() => ({ fontSize: size * 0.4 }), [size]);

  return (
    <View style={[styles.container, dynamicContainerStyle]}>
      {src && !error ? (
        <Image 
          source={{ uri: src }} 
          style={dynamicImageStyle} 
          onError={() => setError(true)}
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
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: {
    fontWeight: '600',
    color: '#64748B',
  }
});
