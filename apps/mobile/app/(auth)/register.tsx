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
  Alert,
} from 'react-native';
import {
  Laptop,
  ExternalLink,
  User,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  ShieldCheck,
  HeartPulse,
  Stethoscope,
  ChevronRight,
  AlertCircle,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { authService } from '../../services/auth.service';
import { InteractiveBackground } from '../../components/common/InteractiveBackground';
import { MedicalLoadingIndicator } from '../../components/common/MedicalLoadingIndicator';
import { formatErrorMessage } from '../../lib/api';

export default function RegisterScreen() {
  const router = useRouter();

  // Role selector: patient or doctor (pharmacy is desktop-only)
  const [role, setRole] = useState<'patient' | 'doctor'>('patient');

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
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

    try {
      const response = await authService.register({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        role,
        phone_number: phoneNumber.trim(),
      });

      // If user session is returned, route directly to role dashboard
      if (response?.session) {
        if (role === 'patient') {
          router.replace('/(tabs)/patient/dashboard');
        } else {
          router.replace('/(tabs)/doctor/dashboard');
        }
      } else {
        Alert.alert(
          'Registration Successful',
          'Your MedSync account has been created! Please sign in with your email and password.',
          [{ text: 'Sign In Now', onPress: () => router.replace('/(auth)/login') }]
        );
      }
    } catch (err: any) {
      setError(formatErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const isPatient = role === 'patient';
  const roleColor = isPatient ? '#10B981' : '#3B82F6';

  return (
    <InteractiveBackground theme={role}>
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
            <View style={[styles.logoBadge, { borderColor: roleColor }]}>
              <HeartPulse size={30} color={roleColor} />
            </View>
            <Text style={styles.brandTitle}>MedSync</Text>
            <Text style={styles.brandSubtitle}>Decentralized Medical Network</Text>
          </View>

          {/* Glassmorphic Auth Card */}
          <View style={styles.card}>
            {/* Top Auth Tab Switcher */}
            <View style={styles.tabSwitcher}>
              <TouchableOpacity
                style={styles.tabBtn}
                onPress={() => router.replace('/(auth)/login')}
                activeOpacity={0.8}
              >
                <Text style={styles.tabText}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, styles.tabBtnActive]}
                activeOpacity={1}
              >
                <Text style={[styles.tabText, styles.tabTextActive]}>Create Account</Text>
              </TouchableOpacity>
            </View>

            {/* Role Selector Pills */}
            <View style={styles.roleSelector}>
              <TouchableOpacity
                style={[styles.rolePill, isPatient && styles.rolePillActivePatient]}
                onPress={() => setRole('patient')}
                activeOpacity={0.85}
              >
                <User size={15} color={isPatient ? '#10B981' : '#94A3B8'} />
                <Text style={[styles.rolePillText, isPatient && styles.rolePillTextActivePatient]}>
                  Patient
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.rolePill, !isPatient && styles.rolePillActiveDoctor]}
                onPress={() => setRole('doctor')}
                activeOpacity={0.85}
              >
                <Stethoscope size={15} color={!isPatient ? '#3B82F6' : '#94A3B8'} />
                <Text style={[styles.rolePillText, !isPatient && styles.rolePillTextActiveDoctor]}>
                  Doctor / Clinic
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Message Banner */}
            {error ? (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Input: Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Legal Name *</Text>
              <View style={styles.inputWrapper}>
                <User size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder={isPatient ? 'e.g. Alex Johnson' : 'e.g. Dr. Sarah Jenkins'}
                  placeholderTextColor="#64748B"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Input: Email Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address *</Text>
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

            {/* Input: Contact Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={styles.inputWrapper}>
                <Phone size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="+91 98765 43210"
                  placeholderTextColor="#64748B"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Input: Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password *</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="At least 6 characters"
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

            {/* Input: Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Password *</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Re-enter password"
                  placeholderTextColor="#64748B"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
              </View>
            </View>

            {/* Loading Indicator or Submit Button */}
            {isLoading ? (
              <View style={styles.loadingWrapper}>
                <MedicalLoadingIndicator
                  message="Creating Blockchain Identity..."
                  subMessage="Enrolling user in MedSync cryptographic registry"
                  color={roleColor}
                />
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: roleColor }]}
                onPress={handleRegister}
                activeOpacity={0.88}
              >
                <Text style={styles.submitBtnText}>Create Account</Text>
                <ChevronRight size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}

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
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 22,
    gap: 14,
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
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  rolePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  rolePillActivePatient: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10B981',
  },
  rolePillActiveDoctor: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: '#3B82F6',
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  rolePillTextActivePatient: {
    color: '#10B981',
    fontWeight: '700',
  },
  rolePillTextActiveDoctor: {
    color: '#3B82F6',
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
    height: 48,
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
    marginTop: 6,
    shadowColor: '#000',
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
    marginTop: 4,
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
    marginTop: 20,
    paddingHorizontal: 12,
  },
  footerText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 15,
  },
});
