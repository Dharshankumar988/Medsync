import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FaceAuthCamera } from './FaceAuthCamera';
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
  const [step, setStep] = useState<'PIN' | 'FACE' | 'PROCESSING'>('PIN');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handlePinSubmit = () => {
    if (pin.length !== 6) {
      setError('PIN must be 6 digits.');
      return;
    }
    setError('');
    setStep('FACE');
  };

  const handleFaceDetected = async (photoPath: string, livenessPassed: boolean, challengeType?: string) => {
    if (!livenessPassed) {
      setError('Liveness check failed. Please try again.');
      setStep('PIN');
      return;
    }

    setStep('PROCESSING');
    
    try {
      const formData = new FormData();
      formData.append('pin', pin);
      if (challengeType) {
        formData.append('challenge_type', challengeType);
      }
      
      const filename = photoPath.split('/').pop() || 'face.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;
      
      // @ts-ignore
      formData.append('face_image', { uri: photoPath, name: filename, type });

      const response = await api.post(`/prescriptions/${prescriptionId}/authorize-download`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data?.data?.authorization_reference) {
        onUnlockSuccess(response.data.data.authorization_reference);
      } else {
        throw new Error('Authorization reference not found in response.');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Authorization failed.');
      setStep('PIN');
      setPin('');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        
        {step === 'PIN' && (
          <View style={styles.content}>
            <Text style={styles.title}>Secure Prescription Access</Text>
            <Text style={styles.subtitle}>Enter your 6-digit PIN to proceed to Face Authentication.</Text>
            
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TextInput
              style={styles.input}
              placeholder="6-Digit Authorization PIN"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              value={pin}
              onChangeText={(text) => { setPin(text); setError(''); }}
            />

            <TouchableOpacity style={styles.primaryButton} onPress={handlePinSubmit}>
              <Text style={styles.primaryButtonText}>Next: Face Scan</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryButton} onPress={onCancel}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'FACE' && (
          <FaceAuthCamera 
            onFaceDetected={handleFaceDetected}
            onCancel={() => setStep('PIN')} 
          />
        )}

        {step === 'PROCESSING' && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.processingText}>Verifying credentials and liveness...</Text>
          </View>
        )}
        
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
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#1f2937',
    color: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
    textAlign: 'center',
    letterSpacing: 2,
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#f9fafb',
    fontSize: 16,
    marginTop: 16,
  }
});
