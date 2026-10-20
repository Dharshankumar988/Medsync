import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRole } from '../../providers/role-provider';
import { getRoleTheme } from '../../constants/theme';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen = React.memo(function LoadingScreen({
  message = 'Loading MedSync...',
}: LoadingScreenProps) {
  const { role } = useRole();
  const theme = getRoleTheme(role);

  return (
    <View style={styles.container}>
      <View style={[styles.logoBadge, { backgroundColor: theme.bg, borderColor: theme.badgeBorder }]}>
        <Text style={[styles.logoText, { color: theme.primary }]}>M</Text>
      </View>
      <ActivityIndicator size="large" color={theme.primary} style={styles.indicator} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
    color: '#64748B',
    textAlign: 'center',
  },
});
