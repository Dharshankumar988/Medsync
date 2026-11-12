import React, { useState } from 'react';
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
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  Sun,
  Moon,
  ChevronRight,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { authService } from '../../services/auth.service';
import { useTheme } from '../../context/ThemeContext';
import { formatErrorMessage } from '../../lib/api';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { theme, isDark, toggleTheme } = useTheme();

  // Steps: 'ENTER_EMAIL' | 'ENTER_OTP_AND_PASSWORD' | 'SUCCESS'
  const [step, setStep] = useState<'ENTER_EMAIL' | 'ENTER_OTP_AND_PASSWORD' | 'SUCCESS'>('ENTER_EMAIL');

  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendResetCode = async () => {
    if (!email.trim()) {
      setError('Please enter your account email.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await authService.sendResetOtp(email.trim());
      setStep('ENTER_OTP_AND_PASSWORD');
    } catch (err: any) {
      setError(formatErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setError('Please enter the 6-digit reset code.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await authService.verifyResetOtp({
        email: email.trim(),
        otp_code: otpCode.trim(),
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setStep('SUCCESS');
    } catch (err: any) {
      setError(formatErrorMessage(err));
    } finally {
      setIsLoading(false);
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
                { backgroundColor: '#00040D', borderColor: 'rgba(56, 189, 248, 0.3)' },
              ]}
            >
              <Image
                source={require('../../assets/images/app-logo.png')}
                style={styles.logoImage}
                resizeMode="cover"
                fadeDuration={0}
              />
            </View>
            <Text style={[styles.brandTitle, { color: theme.text }]}>
              {step === 'SUCCESS' ? 'Password Reset' : 'Reset Password'}
            </Text>
            <Text style={[styles.brandTagline, { color: theme.textMuted }]}>
              {step === 'ENTER_EMAIL'
                ? 'Enter your account email to receive a secure 6-digit reset code'
                : step === 'ENTER_OTP_AND_PASSWORD'
                ? 'Enter the 6-digit code sent to your email and your new password'
                : 'Your credentials have been securely updated'}
            </Text>
          </View>

          {/* Form Card */}
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
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

            {/* STEP 1: Enter Email */}
            {step === 'ENTER_EMAIL' && (
              <View>
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
                      autoFocus
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: theme.primaryButton },
                  ]}
                  onPress={handleSendResetCode}
                  disabled={isLoading || !email.trim()}
                  activeOpacity={0.88}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={theme.primaryButtonText} />
                  ) : (
                    <View style={styles.btnRow}>
                      <Text
                        style={[
                          styles.primaryButtonText,
                          { color: theme.primaryButtonText },
                        ]}
                      >
                        Send Reset Code
                      </Text>
                      <ChevronRight size={17} color={theme.primaryButtonText} />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 2: Enter OTP & New Password */}
            {step === 'ENTER_OTP_AND_PASSWORD' && (
              <View>
                <View
                  style={[
                    styles.noticeBox,
                    {
                      backgroundColor: isDark ? '#121215' : '#F8FAFC',
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <KeyRound size={15} color="#38BDF8" style={{ marginRight: 8 }} />
                  <Text style={[styles.noticeText, { color: theme.text }]}>
                    Enter the 6-digit code sent to <Text style={{ fontWeight: '800' }}>{email}</Text>
                  </Text>
                </View>

                {/* 6-Digit Code */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    6-Digit Verification Code
                  </Text>
                  <TextInput
                    style={[
                      styles.codeInput,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.inputBorder,
                        color: theme.text,
                      },
                    ]}
                    value={otpCode}
                    onChangeText={(t) => setOtpCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="••••••"
                    placeholderTextColor={theme.inputPlaceholder}
                    autoFocus
                  />
                </View>

                {/* New Password */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    New Password
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
                    <Lock size={18} color={theme.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, { color: theme.text }]}
                      placeholder="At least 6 characters"
                      placeholderTextColor={theme.inputPlaceholder}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeBtn}
                    >
                      {showPassword ? (
                        <EyeOff size={18} color={theme.textMuted} />
                      ) : (
                        <Eye size={18} color={theme.textMuted} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    Confirm New Password
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
                    <Lock size={18} color={theme.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, { color: theme.text }]}
                      placeholder="Re-enter new password"
                      placeholderTextColor={theme.inputPlaceholder}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showPassword}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: theme.primaryButton },
                  ]}
                  onPress={handleResetPassword}
                  disabled={isLoading || otpCode.length !== 6 || !newPassword}
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
                      Confirm New Password
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 3: Success Confirmation */}
            {step === 'SUCCESS' && (
              <View style={styles.successContainer}>
                <View
                  style={[
                    styles.successIconCircle,
                    {
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
                      borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
                    },
                  ]}
                >
                  <CheckCircle2 size={36} color="#10B981" />
                </View>

                <Text style={[styles.successTitle, { color: theme.text }]}>
                  Password Reset Complete
                </Text>
                <Text style={[styles.successSub, { color: theme.textMuted }]}>
                  Your MedSync account credentials have been updated. You can now sign in with your new password.
                </Text>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: theme.primaryButton, width: '100%', marginTop: 14 },
                  ]}
                  onPress={() => router.replace('/(auth)/login')}
                  activeOpacity={0.88}
                >
                  <Text
                    style={[
                      styles.primaryButtonText,
                      { color: theme.primaryButtonText },
                    ]}
                  >
                    Return to Sign In
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Compliance Badge */}
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
    maxWidth: 290,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  noticeText: {
    fontSize: 12.5,
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
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
  },
  eyeBtn: {
    padding: 4,
  },
  codeInput: {
    height: 52,
    borderWidth: 1,
    borderRadius: 14,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 10,
  },
  primaryButton: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  successSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
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
