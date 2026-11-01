import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogOut } from 'lucide-react-native';
import { useRole } from '../../providers/role-provider';
import { useTheme } from '../../context/ThemeContext';
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
  const { theme, isDark } = useTheme();
  const router = useRouter();

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
  const userAvatar = (user as any)?.profile_picture_url || (user as any)?.profile_image_url || (user?.user_metadata as any)?.avatar_url;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          borderBottomColor: theme.border,
          paddingTop: Math.max(insets.top, 16),
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.titleColumn}>
          {role && (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: isDark ? 'rgba(56, 189, 248, 0.12)' : '#F0F9FF',
                  borderColor: isDark ? 'rgba(56, 189, 248, 0.25)' : '#BAE6FD',
                },
              ]}
            >
              <View
                style={[
                  styles.badgeDot,
                  { backgroundColor: isDark ? '#38BDF8' : '#0284C7' },
                ]}
              />
              <Text
                style={[
                  styles.badgeText,
                  { color: isDark ? '#38BDF8' : '#0284C7' },
                ]}
                numberOfLines={1}
              >
                {getRoleDisplayName(role).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: theme.textMuted }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.actionsRow}>
          {rightElement}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/patient/profile')}
            activeOpacity={0.8}
          >
            <Avatar src={userAvatar} fallback={userInitials} size={36} />
          </TouchableOpacity>

          {showLogout && (
            <TouchableOpacity
              onPress={handleLogout}
              style={[
                styles.logoutButton,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              accessibilityLabel="Sign Out"
              accessibilityRole="button"
            >
              <LogOut size={16} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
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
    marginRight: 12,
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
    flexWrap: 'nowrap',
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
    flexShrink: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: '400',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
