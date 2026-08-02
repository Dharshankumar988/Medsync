import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, Button, Alert } from 'react-native';
// Note: expo-camera would normally be used here
// import { Camera, CameraView } from 'expo-camera';
import { apiRequest } from '../../utils/api';

export function QRScanner({ onVerify }: { onVerify?: (result: any) => void }) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    // const getCameraPermissions = async () => {
    //   const { status } = await Camera.requestCameraPermissionsAsync();
    //   setHasPermission(status === 'granted');
    // };
    // getCameraPermissions();
    setHasPermission(true); // Mocking permission for now
  }, []);

  const handleBarCodeScanned = useCallback(async ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    setVerifying(true);
    try {
      // Expecting data to be a JSON string like: {"type":"PRESCRIPTION","id":"...","patient_id":"...","doctor_id":"..."}
      const payload = JSON.parse(data);
      if (payload.type === 'PRESCRIPTION' && payload.id) {
        const response = await apiRequest('GET', `/blockchain/prescription/${payload.id}/verify`);
        if (onVerify) {
          onVerify(response.data);
        } else {
          Alert.alert(
            response.data?.verified ? "Authentic Prescription" : "Verification Failed", 
            response.data?.blockchain_hash || "Mismatch or not found"
          );
        }
      } else {
        Alert.alert("Invalid QR Code", "This QR code is not a valid MedSync prescription.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to verify the QR code.");
    } finally {
      setVerifying(false);
    }
  }, [onVerify]);

  if (hasPermission === null) {
    return <Text>Requesting for camera permission</Text>;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      {/* 
        <CameraView
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          style={StyleSheet.absoluteFillObject}
        />
      */}
      <View style={styles.mockCamera}>
        <Text style={styles.mockText}>[Camera View Placeholder]</Text>
        <Button 
          title="Simulate Scan" 
          onPress={() => handleBarCodeScanned({ 
            type: 'qr', 
            data: JSON.stringify({ type: 'PRESCRIPTION', id: '123' }) 
          })} 
          disabled={scanned}
        />
      </View>
      {scanned && (
        <Button title={'Tap to Scan Again'} onPress={() => setScanned(false)} />
      )}
      {verifying && (
        <View style={styles.verifyingOverlay}>
          <Text style={styles.verifyingText}>Verifying on Blockchain...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  mockCamera: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockText: {
    color: '#fff',
    marginBottom: 20,
  },
  verifyingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  }
});
