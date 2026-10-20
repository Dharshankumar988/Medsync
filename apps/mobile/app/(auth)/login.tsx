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
  Linking,
} from 'react-native';
import {
  Laptop,
  ExternalLink,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  HeartPulse,
  ChevronRight,
  AlertCircle,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { authService } from '../../services/auth.service';
import { InteractiveBackground } from '../../components/common/InteractiveBackground';
import { MedicalLoadingIndicator } from '../../components/common/MedicalLoadingIndicator';
import { formatErrorMessage } from '../../lib/api';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
      } else if (role === 'doctor') {
        router.replace('/(tabs)/doctor/dashboard');
      } else if (role === 'pharmacy') {
        router.replace('/(tabs)/pharmacy/dashboard');
      } else if (role === 'hospital') {
        router.replace('/(tabs)/hospital/dashboard');
      } else if (role === 'admin') {
        router.replace('/(tabs)/admin/dashboard');
      } else {
        setError(`Unrecognized role: ${role}`);
      }
    } catch (err: any) {
      setError(formatErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <InteractiveBackground theme="patient">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header & Logo */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <HeartPulse size={32} color="#10B981" />
            </View>
            <Text style={styles.brandTitle}>MedSync</Text>
            <Text style={styles.brandSubtitle}>Enterprise Health & Diagnostic Portal</Text>
          </View>

          {/* Glassmorphic Auth Card */}
          <View style={styles.card}>
            {/* Top Auth Tab Switcher */}
            <View style={styles.tabSwitcher}>
              <TouchableOpacity
                style={[styles.tabBtn, styles.tabBtnActive]}
                activeOpacity={1}
              >
                <Text style={[styles.tabText, styles.tabTextActive]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tabBtn}
                onPress={() => router.replace('/(auth)/register')}
                activeOpacity={0.8}
              >
                <Text style={styles.tabText}>Create Account</Text>
              </TouchableOpacity>
            </View>

            {/* Error Message Banner */}
            {error ? (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Input: Email Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Mail size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="name@example.com"
                  placeholderTextColor="#64748B"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Input: Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your account password"
                  placeholderTextColor="#64748B"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  {showPassword ? (
                    <EyeOff size={18} color="#94A3B8" />
                  ) : (
                    <Eye size={18} color="#94A3B8" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Loading Indicator or Submit Button */}
            {isLoading ? (
              <View style={styles.loadingWrapper}>
                <MedicalLoadingIndicator
                  message="Authenticating Session..."
                  subMessage="Verifying credentials against MedSync authority"
                  color="#10B981"
                />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleLogin}
                activeOpacity={0.88}
              >
                <Text style={styles.submitBtnText}>Sign In</Text>
                <ChevronRight size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            {/* Quick Link to Register */}
            <View style={styles.promptRow}>
              <Text style={styles.promptText}>Don't have an account?</Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/register')}>
                <Text style={styles.promptLink}>Create one now</Text>
              </TouchableOpacity>
            </View>

            {/* Pharmacy Desktop Portal Notice */}
            <TouchableOpacity
              style={styles.pharmacyBanner}
              onPress={() => Linking.openURL('https://medsync-web.vercel.app/login')}
              activeOpacity={0.8}
            >
              <Laptop size={15} color="#F59E0B" />
              <Text style={styles.pharmacyBannerText}>
                Pharmacy Staff? <Text style={styles.pharmacyBannerBold}>Desktop Web Recommended</Text>
              </Text>
              <ExternalLink size={13} color="#F59E0B" />
            </TouchableOpacity>
          </View>

          {/* Bottom Footer Note */}
          <View style={styles.footer}>
            <ShieldCheck size={14} color="#64748B" />
            <Text style={styles.footerText}>
              Protected by End-to-End Encryption & Polygon Amoy Blockchain
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </InteractiveBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 22,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 4,
    gap: 4,
    marginBottom: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#FCA5A5',
    lineHeight: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#F8FAFC',
  },
  eyeBtn: {
    padding: 6,
  },
  loadingWrapper: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#10B981',
    marginTop: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  promptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 2,
  },
  promptText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  promptLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  pharmacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  pharmacyBannerText: {
    fontSize: 12,
    color: '#FCD34D',
  },
  pharmacyBannerBold: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
    paddingHorizontal: 12,
  },
  footerText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 15,
  },
});
