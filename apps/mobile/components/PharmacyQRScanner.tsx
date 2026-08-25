import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';

interface PharmacyQRScannerProps {
  onPharmacyScanned: (pharmacyQrIdentifier: string) => void;
  onCancel: () => void;
}

export const PharmacyQRScanner: React.FC<PharmacyQRScannerProps> = ({ onPharmacyScanned, onCancel }) => {
  const device = useCameraDevice('back');
  const [hasPermission, setHasPermission] = useState(false);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (isScanning && codes.length > 0) {
        const value = codes[0].value;
        if (value && value.startsWith('QR-PHM-')) {
          setIsScanning(false);
          // E.g. QR-PHM-1-ABC -> this is a valid pharmacy identifier for our system
          onPharmacyScanned(value);
        } else {
          // Ignore invalid QRs, but you could show an alert or toast
          // setIsScanning(false);
          // Alert.alert('Invalid QR', 'This does not appear to be a valid Pharmacy QR code.', [{ text: 'OK', onPress: () => setIsScanning(true) }]);
        }
      }
    },
  });

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera permission is required.</Text>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No back camera found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        codeScanner={codeScanner}
      />
      
      <View style={styles.overlay}>
        <View style={styles.qrMask} />
        <Text style={styles.instructionText}>Scan the Pharmacy's QR Code</Text>
      </View>

      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  text: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  qrMask: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#4ade80',
    backgroundColor: 'transparent',
    borderRadius: 16,
  },
  instructionText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 24,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  }
});
