import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen = React.memo(function LoadingScreen({
  message = 'Loading MedSync...',
}: LoadingScreenProps) {
  const { theme, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.logoBadge,
          {
            backgroundColor: isDark ? '#18181B' : '#09090B',
            borderColor: theme.border,
          },
        ]}
      >
        <Text style={[styles.logoText, { color: '#38BDF8' }]}>M</Text>
      </View>
      <ActivityIndicator size="large" color={theme.accent} style={styles.indicator} />
      <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 24,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
  },
  indicator: {
    marginBottom: 16,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
