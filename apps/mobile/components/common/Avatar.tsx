import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

interface AvatarProps {
  src?: string;
  fallback: string;
  size?: number;
}

export function Avatar({ src, fallback, size = 40 }: AvatarProps) {
  const [error, setError] = React.useState(false);

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
      {src && !error ? (
        <Image 
          source={{ uri: src }} 
          style={{ width: size, height: size, borderRadius: size / 2 }} 
          onError={() => setError(true)}
        />
      ) : (
        <Text style={[styles.text, { fontSize: size * 0.4 }]}>
          {fallback.substring(0, 2).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

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
