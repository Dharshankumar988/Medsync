import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CheckCircle2, Eye, EyeOff, Lock, LogOut } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { formatErrorMessage } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { patientService } from '../../services/patient.service';
import { Button } from '../common/Button';
import { MedSyncLogo } from '../common/MedSyncLogo';

interface MandatoryPinSetupModalProps {
  visible: boolean;
  role?: string | null;
  userEmail?: string | null;
  onCompleted: () => void;
  onSignOut: () => Promise<void>;
}

const ROLE_COPY: Record<string, { badge: string; desc: string }> = {
  patient: {
    badge: 'PATIENT VAULT',
    desc: 'Set up your 6-digit Authorization PIN before uploading or downloading medical records, booking visits, or placing medicine orders.',
  },
  pharmacy: {
    badge: 'PHARMACY NODE',
    desc: 'Set up your 6-digit Pharmacy Authorization PIN before verifying prescriptions, dispensing orders, or updating inventory.',
  },
  doctor: {
    badge: 'CLINICAL PRACTITIONER',
    desc: 'Set up your 6-digit Clinical Authorization PIN to sign digital prescriptions and authorize patient care.',
  },
};

export const MandatoryPinSetupModal: React.FC<MandatoryPinSetupModalProps> = ({
  visible,
  role,
  userEmail,
  onCompleted,
  onSignOut,
}) => {
  const { theme, isDark } = useTheme();
  const [accountPassword, setAccountPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isOAuthWithoutPassword, setIsOAuthWithoutPassword] = useState(false);

  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (!visible) return;
    setAccountPassword('');
    setNewPin('');
    setConfirmPin('');
    setError('');
    setSuccess(false);

    cardOpacity.setValue(0);
    cardScale.setValue(0.92);
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 7,
        tension: 110,
        useNativeDriver: true,
      }),
    ]).start();

    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (user) {
          const provider = String(user.app_metadata?.provider || '').toLowerCase();
          const hasPassword = Boolean(user.user_metadata?.has_password);
          setIsOAuthWithoutPassword(provider === 'google' && !hasPassword);
        }
      })
      .catch(() => { });
  }, [visible, cardOpacity, cardScale]);

  const normalizedRole = (role || 'patient').toLowerCase();
  const copy = ROLE_COPY[normalizedRole] || ROLE_COPY.patient;
  const pinsMatch = confirmPin.length === 6 && newPin === confirmPin;
  const isFormValid =
    accountPassword.trim().length > 0 &&
    newPin.length === 6 &&
    confirmPin.length === 6 &&
    newPin === confirmPin;

  const handleSubmit = async () => {
    if (!accountPassword.trim()) {
      setError(
        isOAuthWithoutPassword
          ? 'Please create an account password to protect your PIN.'
          : 'Please enter your MedSync account password.'
      );
      return;
    }
    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
      setError('Authorization PIN must be exactly 6 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('PIN confirmation does not match.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      if (isOAuthWithoutPassword) {
        try {
          await supabase.auth.updateUser({
            password: accountPassword.trim(),
            data: { has_password: true },
          });
        } catch {
          // Non-blocking
        }
      }

      await patientService.enrollPin(newPin, accountPassword.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      setSuccess(true);

      setTimeout(() => {
        setLoading(false);
        onCompleted();
      }, 950);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => { });
      setError(formatErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={() => {
        // Mandatory setup: block hardware back dismissal until PIN is configured
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <ScrollView
          contentContainerStyle={styles.scrollCenter}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? '#14161D' : '#FFFFFF',
                borderColor: isDark ? 'rgba(56, 189, 248, 0.25)' : '#E2E8F0',
                opacity: cardOpacity,
                transform: [{ scale: cardScale }],
              },
            ]}
          >
            {success ? (
              <View style={styles.successBox}>
                <View style={styles.successCircle}>
                  <CheckCircle2 size={40} color="#10B981" />
                </View>
                <Text style={[styles.title, { color: theme.text }]}>
                  Authorization PIN Active
                </Text>
                <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                  Your 6-digit PIN is configured. Unlocking your MedSync workspace...
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.brandRow}>
                  <MedSyncLogo size={40} borderRadius={12} />
                  <View style={styles.requiredBadge}>
                    <Text style={styles.requiredBadgeText}>
                      REQUIRED • {copy.badge}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.title, { color: theme.text }]}>
                  Set Your 6-Digit Auth PIN
                </Text>
                <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                  {copy.desc}
                </Text>
                {userEmail ? (
                  <Text style={[styles.emailCaption, { color: theme.textSecondary }]}>
                    {userEmail}
                  </Text>
                ) : null}

                {error ? (
                  <View
                    style={[
                      styles.errorBanner,
                      {
                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.14)' : '#FEF2F2',
                        borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
                      },
                    ]}
                  >
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                {/* Account Password */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                    {isOAuthWithoutPassword ? 'Create Account Password' : 'MedSync Account Password'}
                  </Text>
                  <View
                    style={[
                      styles.inputRow,
                      {
                        backgroundColor: isDark ? '#0B0D12' : '#F8FAFC',
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <TextInput
                      style={[styles.inputField, { color: theme.text }]}
                      value={accountPassword}
                      onChangeText={(t) => {
                        setAccountPassword(t);
                        if (error) setError('');
                      }}
                      secureTextEntry={!showPassword}
                      placeholder={
                        isOAuthWithoutPassword
                          ? 'Create password for your account'
                          : 'Enter account password to verify'
                      }
                      placeholderTextColor={isDark ? '#52525B' : '#94A3B8'}
                      autoCapitalize="none"
                      autoFocus
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

                {/* New PIN */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                    New 6-Digit Authorization PIN
                  </Text>
                  <TextInput
                    style={[
                      styles.pinInput,
                      {
                        backgroundColor: isDark ? '#0B0D12' : '#F8FAFC',
                        borderColor: theme.border,
                        color: theme.text,
                      },
                    ]}
                    value={newPin}
                    onChangeText={(t) => {
                      setNewPin(t.replace(/[^0-9]/g, '').slice(0, 6));
                      if (error) setError('');
                    }}
                    keyboardType="numeric"
                    maxLength={6}
                    secureTextEntry
                    placeholder="••••••"
                    placeholderTextColor={isDark ? '#52525B' : '#94A3B8'}
                  />
                </View>

                {/* Confirm PIN */}
                <View style={styles.fieldGroup}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginBottom: 0 }]}>
                      Confirm 6-Digit PIN
                    </Text>
                    {confirmPin.length === 6 ? (
                      <Text
                        style={{
                          fontSize: 11.5,
                          fontWeight: '700',
                          color: pinsMatch ? '#10B981' : '#EF4444',
                        }}
                      >
                        {pinsMatch ? '✓ Matches' : '✗ Does not match'}
                      </Text>
                    ) : null}
                  </View>
                  <TextInput
                    style={[
                      styles.pinInput,
                      {
                        backgroundColor: isDark ? '#0B0D12' : '#F8FAFC',
                        borderColor:
                          confirmPin.length === 6
                            ? pinsMatch
                              ? '#10B981'
                              : '#EF4444'
                            : theme.border,
                        color: theme.text,
                      },
                    ]}
                    value={confirmPin}
                    onChangeText={(t) => {
                      setConfirmPin(t.replace(/[^0-9]/g, '').slice(0, 6));
                      if (error) setError('');
                    }}
                    keyboardType="numeric"
                    maxLength={6}
                    secureTextEntry
                    placeholder="••••••"
                    placeholderTextColor={isDark ? '#52525B' : '#94A3B8'}
                  />
                </View>

                <Button
                  title="Save Authorization PIN & Continue"
                  iconLeft={<Lock size={15} color={theme.primaryButtonText} />}
                  onPress={handleSubmit}
                  loading={loading}
                  disabled={!isFormValid || loading}
                  style={styles.submitBtn}
                />

                <TouchableOpacity
                  onPress={() => {
                    onSignOut().catch(() => { });
                  }}
                  style={styles.signOutLink}
                  activeOpacity={0.75}
                >
                  <LogOut size={13} color={theme.textMuted} />
                  <Text style={[styles.signOutText, { color: theme.textMuted }]}>
                    Sign out & switch account
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 4, 13, 0.92)',
  },
  scrollCenter: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 14,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 14,
  },
  requiredBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  requiredBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 6,
  },
  emailCaption: {
    fontSize: 11.5,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorBanner: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  fieldGroup: {
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 12,
  },
  inputField: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
  eyeBtn: {
    padding: 6,
  },
  pinInput: {
    width: '100%',
    height: 50,
    borderWidth: 1.5,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 12,
    fontWeight: '800',
  },
  submitBtn: {
    marginTop: 6,
    height: 48,
    borderRadius: 12,
  },
  signOutLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 6,
  },
  signOutText: {
    fontSize: 12,
    fontWeight: '600',
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
});

