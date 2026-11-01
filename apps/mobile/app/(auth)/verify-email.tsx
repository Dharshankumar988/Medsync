import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  RotateCcw,
  Sun,
  Moon,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { authService } from '../../services/auth.service';
import { useTheme } from '../../context/ThemeContext';
import { formatErrorMessage } from '../../lib/api';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { theme, isDark, toggleTheme } = useTheme();

  const [email, setEmail] = useState(params.email || '');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (params.email) {
      setEmail(params.email);
    }
  }, [params.email]);

  // Resend Countdown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async () => {
    if (!email.trim()) {
      setError('Email address is missing.');
      return;
    }

    const cleanOtp = otpCode.trim();
    if (cleanOtp.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await authService.verifyEmailOtp(email.trim(), cleanOtp);
      setSuccess(true);
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 1500);
    } catch (err: any) {
      setError(formatErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending || !email.trim()) return;

    setResending(true);
    setError('');

    try {
      await authService.sendVerificationOtp(email.trim());
      setCountdown(45);
      Alert.alert('Code Sent', 'A fresh 6-digit verification code was sent to your email.');
    } catch (err: any) {
      setError(formatErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Bar with Back & Theme Switcher */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.replace('/(auth)/login')}
          style={[
            styles.backBtn,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
          accessibilityLabel="Back to Login"
        >
          <ArrowLeft size={18} color={theme.text} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={toggleTheme}
          style={[
            styles.themeToggleBtn,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
          activeOpacity={0.8}
        >
          {isDark ? (
            <Sun size={17} color="#FAFAFA" />
          ) : (
            <Moon size={17} color="#09090B" />
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
          {/* Brand Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.logoWrapper,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Image
                source={require('../../assets/images/app-logo.png')}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>
            <Text style={[styles.brandTitle, { color: theme.text }]}>
              Verify Your Email
            </Text>
            <Text style={[styles.brandTagline, { color: theme.textMuted }]}>
              Secure 6-digit activation for your MedSync Patient Vault
            </Text>
          </View>

          {/* Main Card */}
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View
              style={[
                styles.emailNoticeBox,
                {
                  backgroundColor: isDark ? '#121215' : '#F8FAFC',
                  borderColor: theme.border,
                },
              ]}
            >
              <Mail size={16} color="#38BDF8" style={{ marginRight: 8 }} />
              <Text
                style={[styles.emailNoticeText, { color: theme.text }]}
                numberOfLines={1}
              >
                Code sent to:{' '}
                <Text style={{ fontWeight: '800', color: isDark ? '#38BDF8' : '#0284C7' }}>
                  {email || 'your email'}
                </Text>
              </Text>
            </View>

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

            {success ? (
              <View
                style={[
                  styles.successBox,
                  {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
                    borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
                  },
                ]}
              >
                <CheckCircle2 size={18} color="#10B981" style={{ marginRight: 8 }} />
                <Text style={styles.successText}>
                  Email verified! Redirecting to sign in...
                </Text>
              </View>
            ) : null}

            {/* 6-Digit Code Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                6-Digit Verification Code
              </Text>
              <TextInput
                ref={inputRef}
                style={[
                  styles.codeTextInput,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.inputBorder,
                    color: theme.text,
                  },
                ]}
                value={otpCode}
                onChangeText={(text) =>
                  setOtpCode(text.replace(/[^0-9]/g, '').slice(0, 6))
                }
                keyboardType="number-pad"
                maxLength={6}
                placeholder="••••••"
                placeholderTextColor={theme.inputPlaceholder}
                autoFocus
              />
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: theme.primaryButton },
              ]}
              onPress={handleVerify}
              disabled={isLoading || otpCode.length !== 6 || success}
              activeOpacity={0.88}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.primaryButtonText} />
              ) : (
                <Text
                  style={[
                    styles.primaryButtonText,
                    { color: theme.primaryButtonText },
                  ]}
                >
                  Verify & Activate Vault
                </Text>
              )}
            </TouchableOpacity>

            {/* Resend Code Section */}
            <View style={styles.resendRow}>
              {countdown > 0 ? (
                <Text style={[styles.resendTimerText, { color: theme.textMuted }]}>
                  Resend code in <Text style={{ fontWeight: '700' }}>{countdown}s</Text>
                </Text>
              ) : (
                <TouchableOpacity
                  onPress={handleResend}
                  disabled={resending}
                  style={styles.resendBtn}
                >
                  <RotateCcw size={14} color={isDark ? '#38BDF8' : '#0284C7'} />
                  <Text
                    style={[
                      styles.resendLinkText,
                      { color: isDark ? '#38BDF8' : '#0284C7' },
                    ]}
                  >
                    {resending ? 'Sending...' : 'Resend Verification Code'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Compliance Footer */}
          <View style={styles.complianceRow}>
            <ShieldCheck size={14} color={theme.textMuted} />
            <Text style={[styles.complianceText, { color: theme.textMuted }]}>
              Protected by Brevo Transactional Auth & Polygon Vault
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  themeToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoWrapper: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  brandTagline: {
    fontSize: 12.5,
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 280,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
  },
  emailNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  emailNoticeText: {
    fontSize: 13,
    flex: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12.5,
    fontWeight: '600',
    flex: 1,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  successText: {
    color: '#10B981',
    fontSize: 12.5,
    fontWeight: '700',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 8,
  },
  codeTextInput: {
    height: 54,
    borderWidth: 1,
    borderRadius: 14,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 12,
  },
  primaryButton: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  resendRow: {
    marginTop: 18,
    alignItems: 'center',
  },
  resendTimerText: {
    fontSize: 12.5,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  resendLinkText: {
    fontSize: 13,
    fontWeight: '700',
  },
  complianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 6,
  },
  complianceText: {
    fontSize: 11,
  },
});
