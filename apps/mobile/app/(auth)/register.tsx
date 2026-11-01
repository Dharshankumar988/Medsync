import React, { useState } from 'react';
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
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  User,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  ChevronRight,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Sun,
  Moon,
  Calendar,
  Heart,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { authService } from '../../services/auth.service';
import { MedicalLoadingIndicator } from '../../components/common/MedicalLoadingIndicator';
import { GoogleIcon } from '../../components/common/GoogleIcon';
import { formatErrorMessage } from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];

export default function RegisterScreen() {
  const router = useRouter();
  const { theme, isDark, toggleTheme } = useTheme();

  // Patient Registration Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    setError('');
    try {
      await authService.signInWithGoogle();
    } catch (err: any) {
      setError(formatErrorMessage(err));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in your name, email, and password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError('');

    const cleanEmail = email.trim().toLowerCase();

    try {
      await authService.register({
        email: cleanEmail,
        password,
        full_name: fullName.trim(),
        role: 'patient',
        phone_number: phoneNumber.trim(),
        blood_group: bloodGroup || undefined,
        gender: gender || undefined,
        date_of_birth: dateOfBirth.trim() || undefined,
      });

      // Show alert and redirect directly to 6-digit OTP verification screen
      Alert.alert(
        'Verification Code Sent',
        `A 6-digit verification code has been dispatched to ${cleanEmail}. Please enter it to activate your Patient Vault.`,
        [
          {
            text: 'Verify Email Now',
            onPress: () =>
              router.replace(`/(auth)/verify-email?email=${encodeURIComponent(cleanEmail)}`),
          },
        ]
      );
    } catch (err: any) {
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
          {/* Header with Small Custom Icon on Top */}
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
              Join MedSync
            </Text>
            <Text style={[styles.brandTagline, { color: theme.textMuted }]}>
              Create your secure Patient Vault
            </Text>
          </View>

          {/* Form Card */}
          <View
            style={[
              styles.shadcnCard,
              { backgroundColor: theme.card, borderColor: theme.border },
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
                style={styles.tabButton}
                onPress={() => router.replace('/(auth)/login')}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabTextInactive, { color: theme.textMuted }]}>
                  Sign In
                </Text>
              </TouchableOpacity>
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

            {/* Google Sign-Up Quick Button */}
            <TouchableOpacity
              style={[
                styles.googleButton,
                {
                  backgroundColor: isDark ? '#141417' : '#F8FAFC',
                  borderColor: theme.border,
                },
              ]}
              onPress={handleGoogleSignUp}
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

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.textMuted }]}>or register with email</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Full Name *
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
                ]}
              >
                <User size={18} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  placeholder="e.g. John Doe"
                  placeholderTextColor={theme.inputPlaceholder}
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Email Address *
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
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

            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Phone / WhatsApp (Optional)
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
                ]}
              >
                <Phone size={18} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  placeholder="+91 98765 43210"
                  placeholderTextColor={theme.inputPlaceholder}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Date of Birth */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Date of Birth (Optional)
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
                ]}
              >
                <Calendar size={18} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  placeholder="YYYY-MM-DD (e.g. 1995-08-24)"
                  placeholderTextColor={theme.inputPlaceholder}
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                />
              </View>
            </View>

            {/* Gender Chips */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Gender (Optional)
              </Text>
              <View style={styles.chipsRow}>
                {GENDERS.map((item) => {
                  const isSelected = gender === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected ? theme.primaryButton : theme.surface,
                          borderColor: isSelected ? theme.primaryButton : theme.border,
                        },
                      ]}
                      onPress={() => setGender(isSelected ? '' : item.value)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isSelected ? theme.primaryButtonText : theme.textSecondary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Blood Group Chips */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Blood Group (Optional)
              </Text>
              <View style={styles.chipsRow}>
                {BLOOD_GROUPS.map((bg) => {
                  const isSelected = bloodGroup === bg;
                  return (
                    <TouchableOpacity
                      key={bg}
                      style={[
                        styles.bloodChip,
                        {
                          backgroundColor: isSelected ? theme.primaryButton : theme.surface,
                          borderColor: isSelected ? theme.primaryButton : theme.border,
                        },
                      ]}
                      onPress={() => setBloodGroup(isSelected ? '' : bg)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.bloodChipText,
                          {
                            color: isSelected ? theme.primaryButtonText : theme.textSecondary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {bg}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Password *
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
                ]}
              >
                <Lock size={18} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  placeholder="At least 6 characters"
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

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Confirm Password *
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
                ]}
              >
                <Lock size={18} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  placeholder="Repeat your password"
                  placeholderTextColor={theme.inputPlaceholder}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
                {confirmPassword && password === confirmPassword ? (
                  <CheckCircle2 size={18} color="#10B981" />
                ) : null}
              </View>
            </View>

            {/* Register Action */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <MedicalLoadingIndicator
                  message="Creating Patient Vault..."
                  subMessage="Initializing zero-knowledge encryption"
                  color={theme.accent}
                />
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: theme.primaryButton },
                ]}
                onPress={handleRegister}
                activeOpacity={0.88}
              >
                <Text
                  style={[
                    styles.primaryButtonText,
                    { color: theme.primaryButtonText },
                  ]}
                >
                  Create Patient Account
                </Text>
                <ChevronRight
                  size={18}
                  color={theme.primaryButtonText}
                  strokeWidth={2.5}
                />
              </TouchableOpacity>
            )}

            {/* Footer */}
            <View style={styles.footerPrompt}>
              <Text style={[styles.footerPromptText, { color: theme.textMuted }]}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                <Text style={[styles.signInLink, { color: theme.text }]}>
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Compliance */}
          <View style={styles.complianceRow}>
            <ShieldCheck size={14} color={theme.textMuted} />
            <Text style={[styles.complianceText, { color: theme.textMuted }]}>
              Protected by MedSync Encrypted Patient Security Protocol
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
    marginBottom: 20,
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
    marginBottom: 18,
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
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
    gap: 10,
    marginBottom: 4,
  },
  googleButtonText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
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
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.2,
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
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12.5,
  },
  bloodChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 44,
    alignItems: 'center',
  },
  bloodChipText: {
    fontSize: 12,
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
  signInLink: {
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
});
