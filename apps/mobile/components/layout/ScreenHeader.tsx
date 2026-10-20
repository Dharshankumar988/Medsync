import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogOut } from 'lucide-react-native';
import { useRole } from '../../providers/role-provider';
import { Colors, getRoleTheme } from '../../constants/theme';
import { getRoleDisplayName } from '../../navigation/routes';
import { Avatar } from '../common/Avatar';
import { useRouter } from 'expo-router';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showLogout?: boolean;
  rightElement?: React.ReactNode;
}

export const ScreenHeader = React.memo(function ScreenHeader({
  title,
  subtitle,
  showLogout = true,
  rightElement,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const { role, user, logout } = useRole();
  const router = useRouter();
  const roleTheme = getRoleTheme(role);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of MedSync?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const userInitials = (user?.full_name || user?.email || 'User').substring(0, 2).toUpperCase();

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      <View style={styles.content}>
        <View style={styles.titleColumn}>
          {role && (
            <View style={[styles.badge, { backgroundColor: roleTheme.bg, borderColor: roleTheme.badgeBorder }]}>
              <View style={[styles.badgeDot, { backgroundColor: roleTheme.primary }]} />
              <Text style={[styles.badgeText, { color: roleTheme.primary }]}>
                {getRoleDisplayName(role).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          ) : null}
        </View>

        <View style={styles.actionsRow}>
          {rightElement}
          <Avatar fallback={userInitials} size={36} />
          {showLogout && (
            <TouchableOpacity
              onPress={handleLogout}
              style={styles.logoutButton}
              accessibilityLabel="Sign Out"
              accessibilityRole="button"
            >
              <LogOut size={18} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleColumn: {
    flex: 1,
    marginRight: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 4,
    gap: 5,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoutButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
});
