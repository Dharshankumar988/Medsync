import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { useRole } from '../../providers/role-provider';
import { useTheme } from '../../context/ThemeContext';
import {
  AlertCircle,
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react-native';
import api from '../../lib/api';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const { refresh } = useRole();
  const { theme, isDark } = useTheme();

  const [status, setStatus] = useState('Connecting to Google...');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Password Setup State for Google OAuth Users
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function handleCallback() {
      try {
        const rawUrl = (searchParams.rawUrl as string) || '';
        let targetUrl = rawUrl;

        if (!targetUrl) {
          const initialUrl = await Linking.getInitialURL();
          targetUrl = initialUrl || '';
        }

        let accessToken = (searchParams.access_token as string) || null;
        let refreshToken = (searchParams.refresh_token as string) || null;

        if (targetUrl) {
          const accessMatch = targetUrl.match(/[#?&]access_token=([^&#]+)/);
          const refreshMatch = targetUrl.match(/[#?&]refresh_token=([^&#]+)/);
          if (accessMatch) accessToken = decodeURIComponent(accessMatch[1]);
          if (refreshMatch) refreshToken = decodeURIComponent(refreshMatch[1]);
        }

        // Set session if tokens present
        if (accessToken && refreshToken) {
          setStatus('Establishing secure session...');
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
        }

        // Verify active session
        const {
          data: { session },
          error: getSessionError,
        } = await supabase.auth.getSession();
        if (getSessionError) throw getSessionError;

        if (!session?.user) {
          throw new Error('No active session found. Please try signing in again.');
        }

        const user = session.user;
        setStatus('Checking security credentials...');

        // Check if user already configured their account password
        const hasPassword = Boolean(user.user_metadata?.has_password);

        if (!hasPassword) {
          // Google user needs to configure their password before entering the app
          if (isMounted) {
            setNeedsPasswordSetup(true);
            setLoading(false);
          }
          return;
        }

        // If password is already configured, complete sync and enter vault
        await completeUserSetup(user);
      } catch (err: any) {
        console.error('Google callback error in mobile:', err);
        if (isMounted) {
          setErrorMsg(err.message || 'Google authentication could not be completed.');
          setLoading(false);
        }
      }
    }

    handleCallback();

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  const completeUserSetup = async (user: any) => {
    setStatus('Synchronizing patient vault...');
    try {
      const fullName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        (user.email ? user.email.split('@')[0] : 'Patient User');
      const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;

      await api.post('/auth/sync', {
        id: user.id,
        email: user.email,
        role: 'PATIENT',
        full_name: fullName,
        is_verified: true,
        auth_provider: 'google',
        profile_picture_url: avatarUrl || undefined,
      });

      if (!user.user_metadata?.role) {
        await supabase.auth.updateUser({
          data: { role: 'PATIENT' },
        });
      }
    } catch (syncErr) {
      console.warn('Backend sync warning during mobile Google callback:', syncErr);
    }

    await refresh();
    router.replace('/(tabs)/patient/dashboard');
  };

  const handleSavePassword = async () => {
    setPasswordError('');

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setIsSettingPassword(true);

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
        data: { has_password: true, role: 'PATIENT' },
      });

      if (error) throw error;
      if (!data.user) throw new Error('Could not update user password.');

      await completeUserSetup(data.user);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to set account password.');
      setIsSettingPassword(false);
    }
  };

  // 1. Error View
  if (errorMsg) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
            },
          ]}
        >
          <View style={styles.errorIconCircle}>
            <AlertCircle size={28} color="#EF4444" />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Sign-In Failed</Text>
          <Text style={[styles.errorSubtitle, { color: theme.textMuted }]}>{errorMsg}</Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.primaryButton }]}
            onPress={() => router.replace('/(auth)/login')}
            activeOpacity={0.85}
          >
            <ArrowLeft size={16} color={theme.primaryButtonText} style={{ marginRight: 6 }} />
            <Text style={[styles.primaryBtnText, { color: theme.primaryButtonText }]}>
              Back to Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 2. Password Setup View for Google OAuth Users
  if (needsPasswordSetup) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#F0F9FF',
                  borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : '#BAE6FD',
                },
              ]}
            >
              <ShieldCheck size={28} color="#38BDF8" />
            </View>

            <Text style={[styles.title, { color: theme.text }]}>Set Account Password</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              Welcome to MedSync! Because you signed in with Google, please create a password for
              your account. This is required to enroll your 6-digit PIN and authorize encrypted
              medical records.
            </Text>

            {passwordError ? (
              <View
                style={[
                  styles.errorBanner,
                  {
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                    borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
                  },
                ]}
              >
                <AlertCircle size={15} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={styles.errorBannerText}>{passwordError}</Text>
              </View>
            ) : null}

            {/* New Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>New Password</Text>
              <View
                style={[
                  styles.inputRow,
                  { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
                ]}
              >
                <Lock size={17} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Minimum 6 characters"
                  placeholderTextColor={theme.inputPlaceholder}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  {showPassword ? (
                    <EyeOff size={17} color={theme.textMuted} />
                  ) : (
                    <Eye size={17} color={theme.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Confirm Password
              </Text>
              <View
                style={[
                  styles.inputRow,
                  { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
                ]}
              >
                <Lock size={17} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter password"
                  placeholderTextColor={theme.inputPlaceholder}
                  secureTextEntry={!showConfirm}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirm(!showConfirm)}
                  style={styles.eyeBtn}
                >
                  {showConfirm ? (
                    <EyeOff size={17} color={theme.textMuted} />
                  ) : (
                    <Eye size={17} color={theme.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                { backgroundColor: theme.primaryButton, marginTop: 18 },
              ]}
              onPress={handleSavePassword}
              disabled={isSettingPassword}
              activeOpacity={0.88}
            >
              {isSettingPassword ? (
                <ActivityIndicator size="small" color={theme.primaryButtonText} />
              ) : (
                <Text style={[styles.primaryBtnText, { color: theme.primaryButtonText }]}>
                  Save Password & Enter Vault
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // 3. Loading View
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ActivityIndicator size="large" color="#38BDF8" style={{ marginBottom: 16 }} />
        <Text style={[styles.title, { color: theme.text }]}>Connecting to Google</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>{status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    width: '100%',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 22,
    borderWidth: 1,
    padding: 26,
    alignItems: 'center',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  errorSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  errorBannerText: {
    fontSize: 12.5,
    color: '#EF4444',
    flex: 1,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
  eyeBtn: {
    padding: 6,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 20,
    width: '100%',
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
