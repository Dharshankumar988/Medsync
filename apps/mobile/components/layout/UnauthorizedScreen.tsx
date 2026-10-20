import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldAlert } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Role, useRole } from '../../providers/role-provider';
import { getRoleDisplayName } from '../../navigation/routes';
import { Button } from '../common/Button';
import { ScreenHeader } from './ScreenHeader';

interface UnauthorizedScreenProps {
  requiredRole: Role;
  currentRole: Role | null;
}

export const UnauthorizedScreen = React.memo(function UnauthorizedScreen({
  requiredRole,
  currentRole,
}: UnauthorizedScreenProps) {
  const router = useRouter();
  const { logout } = useRole();

  const handleReturn = () => {
    if (currentRole) {
      router.replace(`/(tabs)/${currentRole}/dashboard` as any);
    } else {
      router.replace('/(auth)/login');
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Access Restricted" showLogout={false} />

      <View style={styles.body}>
        <View style={styles.iconContainer}>
          <ShieldAlert size={48} color="#EF4444" />
        </View>

        <Text style={styles.title}>Unauthorized Destination</Text>
        <Text style={styles.description}>
          This section requires <Text style={styles.highlight}>{getRoleDisplayName(requiredRole)}</Text> authorization. 
          Your active account is registered as <Text style={styles.highlight}>{getRoleDisplayName(currentRole)}</Text>.
        </Text>

        <View style={styles.buttonContainer}>
          <Button
            title={currentRole ? `Return to ${getRoleDisplayName(currentRole)} Dashboard` : 'Sign In'}
            onPress={handleReturn}
            style={styles.primaryButton}
          />
          <Button
            title="Switch Account"
            variant="outline"
            onPress={async () => {
              await logout();
              router.replace('/(auth)/login');
            }}
            style={styles.secondaryButton}
          />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    maxWidth: 320,
  },
  highlight: {
    fontWeight: '700',
    color: '#0F172A',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 12,
  },
  primaryButton: {
    width: '100%',
  },
  secondaryButton: {
    width: '100%',
  },
});
