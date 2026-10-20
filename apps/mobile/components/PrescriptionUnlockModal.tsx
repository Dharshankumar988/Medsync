import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { api } from '../lib/api';

interface PrescriptionUnlockModalProps {
  visible: boolean;
  prescriptionId: string;
  onUnlockSuccess: (authorizationReference: string) => void;
  onCancel: () => void;
}

export const PrescriptionUnlockModal: React.FC<PrescriptionUnlockModalProps> = ({
  visible,
  prescriptionId,
  onUnlockSuccess,
  onCancel,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePinSubmit = async () => {
    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      setError('PIN must be exactly 6 digits.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('pin', pin);

      const response = await api.post(`/prescriptions/${prescriptionId}/authorize-download`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data?.data?.authorization_reference) {
        setPin('');
        onUnlockSuccess(response.data.data.authorization_reference);
      } else {
        throw new Error('Authorization reference not found in response.');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Authorization failed.');
      setPin('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Secure Prescription Access</Text>
          <Text style={styles.subtitle}>Enter your 6-digit Authorization PIN to access this prescription.</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TextInput
            style={styles.input}
            placeholder="6-Digit Authorization PIN"
            placeholderTextColor="#9ca3af"
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            value={pin}
            editable={!isSubmitting}
            onChangeText={(text) => {
              setPin(text);
              setError('');
            }}
          />

          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={handlePinSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Unlock Prescription</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={onCancel} disabled={isSubmitting}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f9fafb',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#1f2937',
    color: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 14,
  },
});
