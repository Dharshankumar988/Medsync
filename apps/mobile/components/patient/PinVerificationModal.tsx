import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Shield, Lock, X } from 'lucide-react-native';
import { Colors } from '../../constants/theme';
import { Button } from '../common/Button';

interface PinVerificationModalProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  onConfirm: (pin: string) => Promise<void>;
  onCancel: () => void;
}

export const PinVerificationModal: React.FC<PinVerificationModalProps> = ({
  visible,
  title = 'Authorization Required',
  subtitle = 'Enter your 6-digit Authorization PIN to decrypt and access this protected medical record.',
  onConfirm,
  onCancel,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
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
      const detail = err.response?.data?.detail || err.message || 'Authorization failed.';
      setError(detail);
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPin('');
    setError('');
    onCancel();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <X size={20} color="#64748B" />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <Lock size={24} color={Colors.roles.patient.primary} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <TextInput
            style={[styles.pinInput, error ? styles.pinInputError : null]}
            value={pin}
            onChangeText={(text) => {
              setPin(text.replace(/[^0-9]/g, '').slice(0, 6));
              if (error) setError('');
            }}
            keyboardType="numeric"
            maxLength={6}
            secureTextEntry
            placeholder="••••••"
            placeholderTextColor="#94A3B8"
            autoFocus
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.actions}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={handleClose}
              style={styles.cancelBtn}
            />
            <Button
              title="Authorize"
              onPress={handleSubmit}
              loading={loading}
              disabled={pin.length !== 6}
              style={styles.confirmBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  pinInput: {
    width: '100%',
    height: 52,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 28,
    letterSpacing: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
  },
  pinInputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
  },
  confirmBtn: {
    flex: 1,
  },
});
