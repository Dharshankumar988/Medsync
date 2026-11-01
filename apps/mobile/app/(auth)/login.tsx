import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Linking,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  AlertCircle,
  Fingerprint,
  Laptop,
  ExternalLink,
  ShieldCheck,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { authService } from '../../services/auth.service';
import { biometricsService } from '../../lib/biometrics';
import { useTheme } from '../../context/ThemeContext';
import { formatErrorMessage } from '../../lib/api';
import { MedicalLoadingIndicator } from '../../components/common/MedicalLoadingIndicator';
import { GoogleIcon } from '../../components/common/GoogleIcon';

export default function LoginScreen() {
  const router = useRouter();
  const { theme, isDark, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // Biometrics
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsLabel, setBiometricsLabel] = useState('Biometrics');

  // Provider Notice Modal (shown if doctor/pharmacy/admin logs in)
  const [providerRole, setProviderRole] = useState<string | null>(null);

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    const { available, biometryType } = await biometricsService.isAvailable();
    if (available) {
      setBiometricsAvailable(true);
      if (biometryType === 'FACIAL_RECOGNITION') {
        setBiometricsLabel('Face ID');
      } else {
        setBiometricsLabel('Fingerprint');
      }
    }
  };

  const handleBiometricAuth = async () => {
    setError('');
    const result = await biometricsService.authenticate(
      'Sign in to MedSync with your device biometrics'
    );
    if (result.success) {
      try {
        const user = await authService.me();
        if (user) {
          if (user.role === 'patient') {
            router.replace('/(tabs)/patient/dashboard');
          } else {
            setProviderRole(user.role);
          }
        }
      } catch (err) {
        setError('Session expired. Please sign in with your password.');
      }
    } else if (result.error && result.error !== 'Authentication cancelled') {
      setError(result.error);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError('');
    try {
      const res = await authService.signInWithGoogle();
      if (res?.url) {
        router.push({
          pathname: '/(auth)/callback',
          params: { rawUrl: res.url },
        });
      }
    } catch (err: any) {
      setError(formatErrorMessage(err));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authService.login({
        email: email.trim(),
        password,
      });
      const role = String(response.data?.role ?? '').toLowerCase();

      if (role === 'patient') {
        router.replace('/(tabs)/patient/dashboard');
      } else {
        // Non-patient role logged in -> show provider notice modal
        setProviderRole(role);
      }
    } catch (err: any) {
      const errCode = (err as any).code;
      const detail = err.response?.data?.detail || err.message || '';

      if (errCode === 'EMAIL_NOT_VERIFIED' || detail.includes('EMAIL_NOT_VERIFIED')) {
        // Auto-dispatch verification code and prompt user to enter it
        try {
          await authService.sendVerificationOtp(email.trim());
        } catch {
          // ignore if already dispatched
        }

        Alert.alert(
          'Email Verification Required',
          'Your email has not been verified yet. We have sent a 6-digit verification code to your email.',
          [
            {
              text: 'Enter Code',
              onPress: () =>
                router.push(`/(auth)/verify-email?email=${encodeURIComponent(email.trim())}`),
            },
          ]
        );
        return;
      }

      setError(formatErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Bar with Theme Toggle */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={toggleTheme}
          style={[
            styles.themeToggleBtn,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
          activeOpacity={0.8}
          accessibilityLabel="Toggle Dark/Light Mode"
        >
          {isDark ? (
            <Sun size={17} color="#FAFAFA" strokeWidth={2} />
          ) : (
            <Moon size={17} color="#09090B" strokeWidth={2} />
          )}
          <Text style={[styles.themeToggleText, { color: theme.textSecondary }]}>
            {isDark ? 'Dark' : 'Light'}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Brand Badge with Small Custom Icon on Top */}
          <View style={styles.header}>
            <View
              style={[
                styles.logoWrapper,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <Image
                source={require('../../assets/images/app-logo.png')}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>
            <Text style={[styles.brandTitle, { color: theme.text }]}>MedSync</Text>
          </View>

          {/* Shadcn UI Card */}
          <View
            style={[
              styles.shadcnCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            {/* Tab Switcher */}
            <View
              style={[
                styles.tabContainer,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  { backgroundColor: theme.primaryButton },
                ]}
                activeOpacity={0.9}
              >
                <Text
                  style={[
                    styles.tabTextActive,
                    { color: theme.primaryButtonText },
                  ]}
                >
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tabButton}
                onPress={() => router.replace('/(auth)/register')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabTextInactive,
                    { color: theme.textMuted },
                  ]}
                >
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Message */}
            {error ? (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                    borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
                  },
                ]}
              >
                <AlertCircle size={16} color="#EF4444" style={styles.errorIcon} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Input: Email */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Email Address
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.inputBorder,
                  },
                ]}
              >
                <Mail size={18} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  placeholder="name@example.com"
                  placeholderTextColor={theme.inputPlaceholder}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Input: Password */}
            <View style={styles.inputGroup}>
              <View style={styles.passwordHeaderRow}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  Password
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/forgot-password')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.forgotPasswordLink, { color: isDark ? '#38BDF8' : '#0284C7' }]}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.inputBorder,
                  },
                ]}
              >
                <Lock size={18} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  placeholder="Enter your account password"
                  placeholderTextColor={theme.inputPlaceholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={theme.textMuted} />
                  ) : (
                    <Eye size={18} color={theme.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Primary Action: Sign In */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <MedicalLoadingIndicator
                  message="Securing Session..."
                  subMessage="Verifying credentials"
                  color={theme.accent}
                />
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: theme.primaryButton },
                ]}
                onPress={handleLogin}
                activeOpacity={0.88}
              >
                <Text
                  style={[
                    styles.primaryButtonText,
                    { color: theme.primaryButtonText },
                  ]}
                >
                  Sign In
                </Text>
                <ChevronRight
                  size={18}
                  color={theme.primaryButtonText}
                  strokeWidth={2.5}
                />
              </TouchableOpacity>
            )}

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.textMuted }]}>or continue with</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            {/* Google Sign-In Button */}
            <TouchableOpacity
              style={[
                styles.googleButton,
                {
                  backgroundColor: isDark ? '#141417' : '#F8FAFC',
                  borderColor: theme.border,
                },
              ]}
              onPress={handleGoogleSignIn}
              disabled={isGoogleLoading}
              activeOpacity={0.82}
            >
              {isGoogleLoading ? (
                <ActivityIndicator size="small" color={theme.text} />
              ) : (
                <>
                  <GoogleIcon size={18} />
                  <Text style={[styles.googleButtonText, { color: theme.text }]}>
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Biometric Quick Sign-In */}
            {biometricsAvailable && (
              <TouchableOpacity
                style={[
                  styles.biometricButton,
                  {
                    backgroundColor: theme.secondaryButton,
                    borderColor: theme.border,
                  },
                ]}
                onPress={handleBiometricAuth}
                activeOpacity={0.8}
              >
                <Fingerprint size={19} color={theme.accent} />
                <Text
                  style={[
                    styles.biometricText,
                    { color: theme.secondaryButtonText },
                  ]}
                >
                  Quick Sign-In with {biometricsLabel}
                </Text>
              </TouchableOpacity>
            )}

            {/* Footer Prompt */}
            <View style={styles.footerPrompt}>
              <Text style={[styles.footerPromptText, { color: theme.textMuted }]}>
                New to MedSync?{' '}
              </Text>
              <TouchableOpacity
                onPress={() => router.replace('/(auth)/register')}
              >
                <Text style={[styles.createAccountLink, { color: theme.text }]}>
                  Create a Patient Account
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Trust & Compliance Badge */}
          <View style={styles.complianceRow}>
            <ShieldCheck size={14} color={theme.textMuted} />
            <Text style={[styles.complianceText, { color: theme.textMuted }]}>
              256-Bit Encrypted & Polygon Health Verification
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Non-Patient Provider Notice Modal ── */}
      <Modal
        visible={!!providerRole}
        transparent
        animationType="fade"
        onRequestClose={() => setProviderRole(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.providerModal,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <View
              style={[
                styles.providerModalIcon,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Laptop size={32} color={theme.accent} />
            </View>

            <Text style={[styles.providerModalTitle, { color: theme.text }]}>
              {providerRole?.toUpperCase()} PORTAL
            </Text>

            <Text
              style={[
                styles.providerModalDescription,
                { color: theme.textSecondary },
              ]}
            >
              The MedSync Mobile App is exclusively dedicated to Patients. Clinical, Pharmacy, and Hospital administration workflows require the full desktop portal.
            </Text>

            <TouchableOpacity
              style={[
                styles.providerPrimaryButton,
                { backgroundColor: theme.primaryButton },
              ]}
              onPress={() => {
                Linking.openURL('https://medsync-web.vercel.app').catch(() => {});
                setProviderRole(null);
                authService.logout();
              }}
              activeOpacity={0.88}
            >
              <ExternalLink size={18} color={theme.primaryButtonText} />
              <Text
                style={[
                  styles.providerPrimaryText,
                  { color: theme.primaryButtonText },
                ]}
              >
                Open Desktop Web Portal
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.providerSecondaryButton,
                {
                  backgroundColor: theme.secondaryButton,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => {
                setProviderRole(null);
                authService.logout();
              }}
              activeOpacity={0.8}
            >
              <LogOut size={16} color={theme.textMuted} />
              <Text
                style={[
                  styles.providerSecondaryText,
                  { color: theme.secondaryButtonText },
                ]}
              >
                Sign In With Patient Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 10,
  },
  themeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  themeToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingBottom: 36,
    paddingTop: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  logoImage: {
    width: 64,
    height: 64,
    borderRadius: 20,
  },
  brandTitle: {
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  brandTagline: {
    fontSize: 13,
    fontWeight: '500',
  },
  shadcnCard: {
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabTextActive: {
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextInactive: {
    fontSize: 13,
    fontWeight: '500',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 7,
    letterSpacing: 0.2,
  },
  passwordHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  forgotPasswordLink: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  eyeButton: {
    padding: 6,
  },
  loadingContainer: {
    marginVertical: 14,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    height: 48,
    marginTop: 6,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11.5,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
    gap: 10,
  },
  googleButtonText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 46,
    marginTop: 10,
    gap: 10,
  },
  biometricText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footerPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    flexWrap: 'wrap',
  },
  footerPromptText: {
    fontSize: 12,
  },
  createAccountLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  complianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    gap: 6,
  },
  complianceText: {
    fontSize: 11,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  providerModal: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 26,
    alignItems: 'center',
  },
  providerModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  providerModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  providerModalDescription: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  providerPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    width: '100%',
    height: 48,
    gap: 8,
    marginBottom: 12,
  },
  providerPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
  },
  providerSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
    height: 46,
    gap: 8,
  },
  providerSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
