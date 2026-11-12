import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { MedSyncLogo } from '../common/MedSyncLogo';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen = React.memo(function LoadingScreen({
  message = 'Loading MedSync...',
}: LoadingScreenProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <MedSyncLogo size={72} borderRadius={22} style={styles.logoBadge} />
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
    marginBottom: 24,
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
