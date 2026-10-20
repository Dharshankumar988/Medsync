import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, Alert, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ScanLine, CheckCircle2, XCircle, Search, ShieldCheck, ShoppingBag } from 'lucide-react-native';
import { patientService } from '../../services/patient.service';
import { Colors } from '../../constants/theme';
import { Button } from './Button';
import { formatErrorMessage } from '../../lib/api';
import { MedicalLoadingIndicator } from './MedicalLoadingIndicator';
import { OrderMedicinesModal } from '../patient/OrderMedicinesModal';

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
  const [orderModalVisible, setOrderModalVisible] = useState(false);

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
        const errorMsg = formatErrorMessage(err);
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
          <MedicalLoadingIndicator
            message="Verifying with MedSync Blockchain..."
            subMessage="Validating Polygon Amoy Testnet & Smart Contract Proof"
            color={Colors.roles.patient.primary}
          />
        </View>
      )}

      {result && !verifying && (
        <View style={[styles.resultCard, result.is_valid ? styles.resultCardValid : styles.resultCardInvalid]}>
          <View style={styles.resultHeader}>
            {result.is_valid ? (
              <ShieldCheck size={24} color="#10B981" />
            ) : (
              <XCircle size={24} color="#EF4444" />
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.resultTitle, { color: result.is_valid ? '#047857' : '#EF4444' }]}>
                {result.is_valid ? 'Authentic & Blockchain Verified' : 'Verification Failed'}
              </Text>
              <Text style={styles.resultSubtitle}>
                {result.type === 'PHARMACY'
                  ? 'Official MedSync Licensed Dispensary'
                  : result.type === 'BLOCKCHAIN'
                  ? 'Immutable Medical Blockchain Record'
                  : 'MedSync Cryptographic Record'}
              </Text>
            </View>
          </View>

          {/* Business / Entity Name if available */}
          {result.business_name && (
            <View style={styles.entityBox}>
              <Text style={styles.entityName}>{result.business_name}</Text>
              {result.address ? (
                <Text style={styles.entityDetail}>
                  📍 {result.address}{result.city ? `, ${result.city}` : ''}
                </Text>
              ) : null}
              {result.phone ? (
                <Text style={styles.entityDetail}>📞 {result.phone}</Text>
              ) : null}
            </View>
          )}

          {/* Blockchain & Security Badge */}
          {result.verified_on_blockchain && (
            <View style={styles.blockchainBadge}>
              <Text style={styles.blockchainBadgeText}>
                ⛓️ Verified on {result.network || 'Polygon Amoy Testnet'}
              </Text>
              {result.transaction_hash && (
                <Text style={styles.blockchainHash} numberOfLines={1}>
                  Tx: {result.transaction_hash}
                </Text>
              )}
            </View>
          )}

          <Text style={styles.resultMessage}>{result.message}</Text>
          {result.purpose ? (
            <Text style={styles.resultMeta}>Purpose: {result.purpose}</Text>
          ) : null}
          {result.resource_id ? (
            <Text style={styles.resultMeta}>Reference: {result.resource_id}</Text>
          ) : null}

          {/* Actionable Workflow: Order Medicines from this Scanned Pharmacy */}
          {result.is_valid && (result.type === 'PHARMACY' || result.business_name || result.purpose === 'LICENSED_PHARMACY') && (
            <TouchableOpacity
              style={styles.orderCtaBtn}
              onPress={() => setOrderModalVisible(true)}
              activeOpacity={0.88}
              accessibilityLabel="Order Medicines from this Pharmacy"
            >
              <ShoppingBag size={18} color="#FFFFFF" />
              <Text style={styles.orderCtaText}>Order Medicines from this Pharmacy</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Interactive Order Medicines Modal */}
      <OrderMedicinesModal
        visible={orderModalVisible}
        pharmacyData={result}
        onClose={() => setOrderModalVisible(false)}
        onOrderSuccess={() => {
          setOrderModalVisible(false);
        }}
      />
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
  resultSubtitle: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '500',
    marginTop: 1,
  },
  entityBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  entityName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  entityDetail: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  blockchainBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
  },
  blockchainBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  blockchainHash: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#64748B',
    marginTop: 2,
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
  orderCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  orderCtaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
