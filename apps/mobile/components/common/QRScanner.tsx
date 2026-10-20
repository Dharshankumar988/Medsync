import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, Alert, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ScanLine, CheckCircle2, XCircle, Search, ShieldCheck } from 'lucide-react-native';
import { patientService } from '../../services/patient.service';
import { Colors } from '../../constants/theme';
import { Button } from './Button';

interface QRScannerProps {
  onVerify?: (result: any) => void;
  verifyHandler?: (token: string) => Promise<any>;
  role?: 'patient' | 'doctor' | 'pharmacy' | 'hospital' | 'admin';
}

export function QRScanner({ onVerify, verifyHandler, role = 'patient' }: QRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState<any | null>(null);

  const verifyToken = useCallback(
    async (token: string) => {
      const clean = token.trim();
      if (!clean) return;

      setVerifying(true);
      setResult(null);

      try {
        const verifyData = verifyHandler
          ? await verifyHandler(clean)
          : await patientService.verifyQrToken(clean);
        setResult(verifyData);
        if (onVerify) {
          onVerify(verifyData);
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.detail || err.message || 'QR verification failed.';
        setResult({
          is_valid: false,
          message: errorMsg,
          resource_id: clean,
          purpose: 'UNKNOWN',
        });
      } finally {
        setVerifying(false);
      }
    },
    [onVerify]
  );

  const handleBarCodeScanned = useCallback(
    ({ data }: { type: string; data: string }) => {
      if (scanned || verifying) return;
      setScanned(true);
      verifyToken(data);
    },
    [scanned, verifying, verifyToken]
  );

  return (
    <View style={styles.container}>
      {/* Camera Preview or Permission Request */}
      {permission?.granted ? (
        <View style={styles.cameraBox}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          />
          <View style={styles.overlayFrame}>
            <View style={styles.reticle} />
          </View>
          {scanned && (
            <TouchableOpacity
              style={styles.rescanBtn}
              onPress={() => {
                setScanned(false);
                setResult(null);
              }}
            >
              <Text style={styles.rescanText}>Tap to Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.permissionBox}>
          <ScanLine size={48} color={Colors.roles.patient.primary} />
          <Text style={styles.permTitle}>Camera Access Required</Text>
          <Text style={styles.permDesc}>
            Allow camera access to scan and verify authentic MedSync prescription and medical record QR codes.
          </Text>
          <Button
            title="Grant Camera Access"
            size="sm"
            onPress={requestPermission}
            style={styles.permBtn}
          />
        </View>
      )}

      {/* Manual Code Input (Allows testing & fallback) */}
      <View style={styles.manualSection}>
        <Text style={styles.manualLabel}>Or Verify Code / Token Manually</Text>
        <View style={styles.manualInputRow}>
          <TextInput
            style={styles.manualInput}
            value={manualCode}
            onChangeText={setManualCode}
            placeholder="e.g. MS-RX-UUID or QR-REC-UUID"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
          />
          <Button
            title="Verify"
            size="sm"
            loading={verifying}
            disabled={!manualCode.trim()}
            onPress={() => verifyToken(manualCode)}
            style={styles.manualVerifyBtn}
          />
        </View>
      </View>

      {/* Verification Result Card */}
      {verifying && (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.roles.patient.primary} size="small" />
          <Text style={styles.loadingText}>Verifying with MedSync Blockchain & Backend...</Text>
        </View>
      )}

      {result && !verifying && (
        <View style={[styles.resultCard, result.is_valid ? styles.resultCardValid : styles.resultCardInvalid]}>
          <View style={styles.resultHeader}>
            {result.is_valid ? (
              <CheckCircle2 size={22} color="#10B981" />
            ) : (
              <XCircle size={22} color="#EF4444" />
            )}
            <Text style={[styles.resultTitle, { color: result.is_valid ? '#10B981' : '#EF4444' }]}>
              {result.is_valid ? 'Authentic & Verified' : 'Verification Failed'}
            </Text>
          </View>

          <Text style={styles.resultMessage}>{result.message}</Text>
          {result.purpose ? (
            <Text style={styles.resultMeta}>Purpose: {result.purpose}</Text>
          ) : null}
          {result.resource_id ? (
            <Text style={styles.resultMeta}>Reference: {result.resource_id}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 14,
  },
  cameraBox: {
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000000',
  },
  overlayFrame: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticle: {
    width: 160,
    height: 160,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  rescanBtn: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  rescanText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  permissionBox: {
    height: 200,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    textAlign: 'center',
  },
  permTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 10,
  },
  permDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 12,
  },
  permBtn: {
    paddingHorizontal: 18,
  },
  manualSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  manualLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  manualInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  manualInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  manualVerifyBtn: {
    minWidth: 80,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  resultCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  resultCardValid: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  resultCardInvalid: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  resultMessage: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  resultMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
});
