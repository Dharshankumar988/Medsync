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
  Linking,
  Modal,
} from 'react-native';
import {
  HeartPulse,
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
  Sparkles,
  LogOut,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { authService } from '../../services/auth.service';
import { biometricsService } from '../../lib/biometrics';
import { Colors } from '../../constants/theme';
import { formatErrorMessage } from '../../lib/api';
import { MedicalLoadingIndicator } from '../../components/common/MedicalLoadingIndicator';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
    const result = await biometricsService.authenticate('Sign in to MedSync with your device biometrics');
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
      setError(formatErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background ambient lighting */}
      <View style={styles.ambientTop} />
      <View style={styles.ambientBottom} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Brand Badge */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <HeartPulse size={36} color="#FFFFFF" strokeWidth={2.5} />
              </View>
              <View style={styles.sparkleBadge}>
                <Sparkles size={12} color="#2563EB" />
              </View>
            </View>
            <Text style={styles.brandTitle}>MedSync</Text>
            <Text style={styles.brandTagline}>Patient Health & Clinical Vault</Text>
          </View>

          {/* Glassmorphic Auth Card */}
          <View style={styles.glassCard}>
            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, styles.tabActive]}
                activeOpacity={0.9}
              >
                <Text style={styles.tabTextActive}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tabButton}
                onPress={() => router.replace('/(auth)/register')}
                activeOpacity={0.8}
              >
                <Text style={styles.tabTextInactive}>Create Account</Text>
              </TouchableOpacity>
            </View>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color="#EF4444" style={styles.errorIcon} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Input: Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Mail size={18} color="#2563EB" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="name@example.com"
                  placeholderTextColor="#94A3B8"
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
                <Text style={styles.inputLabel}>Password</Text>
              </View>
              <View style={styles.inputWrapper}>
                <Lock size={18} color="#2563EB" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your account password"
                  placeholderTextColor="#94A3B8"
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
                    <EyeOff size={18} color="#64748B" />
                  ) : (
                    <Eye size={18} color="#64748B" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Actions: Sign In or Loading */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <MedicalLoadingIndicator
                  message="Securing Session..."
                  subMessage="Verifying cryptographic credentials"
                  color="#2563EB"
                />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleLogin}
                activeOpacity={0.88}
              >
                <Text style={styles.primaryButtonText}>Sign In</Text>
                <ChevronRight size={18} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            )}

            {/* Biometric Quick Sign-In (if phone already has Face ID / Fingerprint) */}
            {biometricsAvailable && (
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricAuth}
                activeOpacity={0.8}
              >
                <Fingerprint size={20} color="#2563EB" />
                <Text style={styles.biometricText}>
                  Quick Sign-In with {biometricsLabel}
                </Text>
              </TouchableOpacity>
            )}

            {/* Link to Register */}
            <View style={styles.footerPrompt}>
              <Text style={styles.footerPromptText}>New to MedSync?</Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/register')}>
                <Text style={styles.footerPromptLink}> Create a Patient Account</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Security Notice */}
          <View style={styles.securityBadge}>
            <ShieldCheck size={15} color="#2563EB" />
            <Text style={styles.securityText}>
              256-Bit Encrypted & Polygon Health Verification
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Provider Desktop Notice Modal */}
      <Modal
        visible={!!providerRole}
        transparent
        animationType="fade"
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.providerCard}>
            <View style={styles.providerIconCircle}>
              <Laptop size={32} color="#2563EB" />
            </View>
            <Text style={styles.providerTitle}>Provider Portal Access</Text>
            <Text style={styles.providerSub}>
              Signed in as{' '}
              <Text style={{ fontWeight: '700', textTransform: 'capitalize', color: '#2563EB' }}>
                {providerRole}
              </Text>
            </Text>
            <Text style={styles.providerDescription}>
              The MedSync Mobile app is tailored exclusively for Patients. Clinical management, pharmacy inventory, and diagnostic tools are hosted on our desktop web portal.
            </Text>

            <TouchableOpacity
              style={styles.webPortalButton}
              onPress={() => Linking.openURL('https://medsync-web.vercel.app')}
              activeOpacity={0.88}
            >
              <ExternalLink size={18} color="#FFFFFF" />
              <Text style={styles.webPortalButtonText}>Open Desktop Web Portal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={async () => {
                await authService.logout();
                setProviderRole(null);
              }}
            >
              <LogOut size={16} color="#64748B" />
              <Text style={styles.modalCancelText}>Sign Out & Switch Account</Text>
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
    backgroundColor: '#F8FAFC',
  },
  ambientTop: {
    position: 'absolute',
    top: -100,
    left: -50,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  ambientBottom: {
    position: 'absolute',
    bottom: -80,
    right: -40,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'ios' ? 65 : 45,
    paddingBottom: 36,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 26,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 14,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  sparkleBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(37, 99, 235, 0.2)',
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 13.5,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 4,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(37, 99, 235, 0.15)',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 22,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tabTextActive: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  tabTextInactive: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    flex: 1,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  passwordHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 7,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14.5,
    color: '#0F172A',
    fontWeight: '500',
  },
  eyeButton: {
    padding: 6,
  },
  loadingContainer: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    height: 52,
    borderRadius: 16,
    marginTop: 6,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 6,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(37, 99, 235, 0.2)',
    height: 48,
    borderRadius: 14,
    marginTop: 12,
  },
  biometricText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#2563EB',
    marginLeft: 8,
  },
  footerPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerPromptText: {
    fontSize: 13.5,
    color: '#64748B',
  },
  footerPromptLink: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  securityText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginLeft: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  providerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
  },
  providerIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  providerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  providerSub: {
    fontSize: 13.5,
    color: '#64748B',
    marginBottom: 12,
  },
  providerDescription: {
    fontSize: 13.5,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  webPortalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    width: '100%',
    height: 48,
    borderRadius: 14,
    marginBottom: 10,
  },
  webPortalButtonText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  modalCancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 6,
  },
});
