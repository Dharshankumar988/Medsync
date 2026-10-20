import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export interface PharmacyQRScannerProps {
  onPharmacyScanned?: (pharmacyQrIdentifier: string) => void;
  onCancel?: () => void;
}

export const PharmacyQRScanner: React.FC<PharmacyQRScannerProps> = ({ onCancel }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pharmacy QR Scanner</Text>
      <Text style={styles.subtitle}>
        QR Scanner module is configured to use native Expo Camera.
      </Text>
      {onCancel && (
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#111827',
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  cancelButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PharmacyQRScanner;
