import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Shield, Lock, X, Eye, EyeOff, KeyRound, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../common/Button';
import { formatErrorMessage } from '../../lib/api';
import { patientService } from '../../services/patient.service';

interface PinVerificationModalProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  initialMode?: 'VERIFY' | 'SETUP';
  onConfirm: (pin: string) => Promise<void>;
  onCancel: () => void;
}

export const PinVerificationModal: React.FC<PinVerificationModalProps> = ({
  visible,
  title = 'Authorization Required',
  subtitle = 'Enter your 6-digit Authorization PIN to decrypt and access this protected medical record.',
  initialMode = 'VERIFY',
  onConfirm,
  onCancel,
}) => {
  const { theme, isDark } = useTheme();

  // Mode: 'VERIFY' or 'SETUP'
  const [mode, setMode] = useState<'VERIFY' | 'SETUP'>(initialMode);

  // Verify PIN state
  const [pin, setPin] = useState('');

  // Setup PIN state
  const [accountPassword, setAccountPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleVerifySubmit = async () => {
    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      setError('PIN must be exactly 6 digits.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await onConfirm(pin);
      setPin('');
      setError('');
    } catch (err: any) {
      const msg = formatErrorMessage(err);
      // If patient does not have a PIN enrolled yet, prompt them to set one up
      if (
        msg.toLowerCase().includes('pin not') ||
        msg.toLowerCase().includes('not enrolled') ||
        msg.toLowerCase().includes('no pin') ||
        msg.toLowerCase().includes('invalid credential')
      ) {
        setError('No Authorization PIN found. Please set up your 6-digit PIN below.');
        setMode('SETUP');
      } else {
        setError(msg);
      }
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupSubmit = async () => {
    if (!accountPassword.trim()) {
      setError('Please enter your account password to authorize PIN setup.');
      return;
    }
    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
      setError('New PIN must be exactly 6 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('PIN confirmation does not match.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await patientService.enrollPin(newPin, accountPassword.trim());
      setSuccessMsg('Authorization PIN configured successfully!');

      // Automatically attempt authorization with newly created PIN
      setTimeout(async () => {
        try {
          await onConfirm(newPin);
          handleClose();
        } catch (authErr: any) {
          // If onConfirm fails or user needs to re-enter, return to verify mode
          setMode('VERIFY');
          setPin(newPin);
          setSuccessMsg('');
          setError(formatErrorMessage(authErr));
        } finally {
          setLoading(false);
        }
      }, 700);
    } catch (err: any) {
      setError(formatErrorMessage(err));
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPin('');
    setAccountPassword('');
    setNewPin('');
    setConfirmPin('');
    setError('');
    setSuccessMsg('');
    setMode('VERIFY');
    onCancel();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View
          style={[
            styles.dialog,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={20} color={theme.textMuted} />
          </TouchableOpacity>

          {/* Icon Badge */}
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#F0F9FF',
                borderColor: isDark ? 'rgba(56, 189, 248, 0.25)' : '#BAE6FD',
              },
            ]}
          >
            {mode === 'SETUP' ? (
              <KeyRound size={24} color="#38BDF8" />
            ) : (
              <Lock size={24} color="#38BDF8" />
            )}
          </View>

          {/* Header Texts */}
          <Text style={[styles.title, { color: theme.text }]}>
            {mode === 'SETUP' ? 'Set Up Authorization PIN' : title}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {mode === 'SETUP'
              ? 'Configure your 6-digit PIN using your account password to authorize downloads & clinic visits.'
              : subtitle}
          </Text>

          {/* Success Banner */}
          {successMsg ? (
            <View
              style={[
                styles.successBanner,
                {
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
                },
              ]}
            >
              <CheckCircle2 size={16} color="#10B981" />
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          ) : null}

          {/* Error Banner */}
          {error ? (
            <View
              style={[
                styles.errorBanner,
                {
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
                },
              ]}
            >
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* ── MODE 1: VERIFY PIN ── */}
          {mode === 'VERIFY' ? (
            <View style={{ width: '100%' }}>
              <TextInput
                style={[
                  styles.pinInput,
                  {
                    backgroundColor: isDark ? '#141416' : '#F8FAFC',
                    borderColor: error ? '#EF4444' : theme.border,
                    color: theme.text,
                  },
                ]}
                value={pin}
                onChangeText={(text) => {
                  setPin(text.replace(/[^0-9]/g, '').slice(0, 6));
                  if (error) setError('');
                }}
                keyboardType="numeric"
                maxLength={6}
                secureTextEntry
                placeholder="••••••"
                placeholderTextColor={isDark ? '#52525B' : '#94A3B8'}
                autoFocus
              />

              <TouchableOpacity
                style={styles.switchModeLink}
                onPress={() => {
                  setError('');
                  setMode('SETUP');
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.switchModeText, { color: '#38BDF8' }]}>
                  First time or forgot PIN? Set up with account password →
                </Text>
              </TouchableOpacity>

              <View style={styles.actions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={handleClose}
                  style={styles.cancelBtn}
                  textStyle={{ color: theme.text }}
                />
                <Button
                  title="Authorize"
                  onPress={handleVerifySubmit}
                  loading={loading}
                  disabled={pin.length !== 6 || loading}
                  style={styles.confirmBtn}
                />
              </View>
            </View>
          ) : (
            /* ── MODE 2: SETUP PIN WITH ACCOUNT PASSWORD ── */
            <View style={{ width: '100%' }}>
              {/* Account Password Field */}
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                MedSync Account Password
              </Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: isDark ? '#141416' : '#F8FAFC',
                    borderColor: theme.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.inputField, { color: theme.text }]}
                  value={accountPassword}
                  onChangeText={setAccountPassword}
                  secureTextEntry={!showPassword}
                  placeholder="Enter account password"
                  placeholderTextColor={isDark ? '#52525B' : '#94A3B8'}
                  autoCapitalize="none"
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

              {/* New 6-Digit PIN */}
              <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: 10 }]}>
                New 6-Digit Authorization PIN
              </Text>
              <TextInput
                style={[
                  styles.textInputFull,
                  {
                    backgroundColor: isDark ? '#141416' : '#F8FAFC',
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={newPin}
                onChangeText={(text) => setNewPin(text.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="numeric"
                maxLength={6}
                secureTextEntry
                placeholder="6 digits (e.g. 123456)"
                placeholderTextColor={isDark ? '#52525B' : '#94A3B8'}
              />

              {/* Confirm 6-Digit PIN */}
              <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: 10 }]}>
                Confirm 6-Digit PIN
              </Text>
              <TextInput
                style={[
                  styles.textInputFull,
                  {
                    backgroundColor: isDark ? '#141416' : '#F8FAFC',
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={confirmPin}
                onChangeText={(text) => setConfirmPin(text.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="numeric"
                maxLength={6}
                secureTextEntry
                placeholder="Confirm 6 digits"
                placeholderTextColor={isDark ? '#52525B' : '#94A3B8'}
              />

              <TouchableOpacity
                style={styles.switchModeLink}
                onPress={() => {
                  setError('');
                  setMode('VERIFY');
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.switchModeText, { color: '#38BDF8' }]}>
                  Already have a PIN? Enter PIN instead →
                </Text>
              </TouchableOpacity>

              <View style={styles.actions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={handleClose}
                  style={styles.cancelBtn}
                  textStyle={{ color: theme.text }}
                />
                <Button
                  title="Save & Authorize"
                  onPress={handleSetupSubmit}
                  loading={loading}
                  disabled={!accountPassword || newPin.length !== 6 || confirmPin.length !== 6 || loading}
                  style={styles.confirmBtn}
                />
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 22,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 18,
    right: 18,
    padding: 6,
    zIndex: 10,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  pinInput: {
    width: '100%',
    height: 54,
    borderWidth: 1.5,
    borderRadius: 14,
    textAlign: 'center',
    fontSize: 28,
    letterSpacing: 12,
    fontWeight: '800',
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 12,
  },
  inputField: {
    flex: 1,
    height: '100%',
    fontSize: 13.5,
  },
  eyeBtn: {
    padding: 6,
  },
  textInputFull: {
    width: '100%',
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  switchModeLink: {
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  switchModeText: {
    fontSize: 11.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    width: '100%',
  },
  successText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  errorBanner: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    width: '100%',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
  },
  confirmBtn: {
    flex: 1,
  },
});
