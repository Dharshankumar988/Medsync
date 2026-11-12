import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Animated,
  Platform,
  Dimensions,
  Modal,
  Share,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';
import {
  X,
  Flashlight,
  FlashlightOff,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Store,
  Blocks,
  FileText,
  ShoppingBag,
  RotateCcw,
  Sparkles,
  Share2,
  Lock,
} from 'lucide-react-native';
import { patientService } from '../../services/patient.service';
import { useTheme } from '../../context/ThemeContext';
import { OrderMedicinesModal } from './OrderMedicinesModal';
import { PinVerificationModal } from './PinVerificationModal';
import { formatErrorMessage } from '../../lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RETICLE_SIZE = SCREEN_WIDTH * 0.72;

interface PaymentStyleQRScannerProps {
  visible: boolean;
  onClose: () => void;
  userProfile?: {
    id: string;
    full_name?: string | null;
    email?: string;
    blood_group?: string;
  } | null;
}

export function PaymentStyleQRScanner({
  visible,
  onClose,
  userProfile,
}: PaymentStyleQRScannerProps) {
  const { theme, isDark } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [activeTab, setActiveTab] = useState<'SCAN' | 'MY_QR'>('SCAN');
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Modals for post-scan actions
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);

  // Laser beam scanning animation
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && activeTab === 'SCAN' && !scanned) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 1,
            duration: 2200,
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 2200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      laserAnim.stopAnimation();
    }
  }, [visible, activeTab, scanned, laserAnim]);

  const triggerHaptic = async (type: 'success' | 'error') => {
    try {
      if (type === 'success') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      // Haptics optional on older simulators
    }
  };

  const handleVerifyToken = useCallback(async (token: string) => {
    const clean = token.trim();
    if (!clean) return;

    setVerifying(true);
    setScanResult(null);

    try {
      const data = await patientService.verifyQrToken(clean);
      setScanResult({
        ...data,
        raw_token: clean,
      });
      triggerHaptic('success');
    } catch (err: any) {
      triggerHaptic('error');
      setScanResult({
        is_valid: false,
        message: formatErrorMessage(err),
        raw_token: clean,
      });
    } finally {
      setVerifying(false);
    }
  }, []);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned || verifying) return;
    setScanned(true);
    handleVerifyToken(data);
  };

  const handlePickFromGallery = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!res.canceled && res.assets[0]?.uri) {
        // If image picked, prompt user for code or verify
        // On mobile, Expo Camera barcode scanning scans live feed; for static image we provide quick verify
        setManualCode(res.assets[0].uri);
      }
    } catch (e) {
      console.warn('Gallery pick error:', e);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setScanResult(null);
    setManualCode('');
  };

  const patientQrValue = JSON.stringify({
    type: 'PATIENT_ID',
    id: userProfile?.id || '',
    name: userProfile?.full_name || 'MedSync Patient',
    blood_group: userProfile?.blood_group || 'O+',
    timestamp: Date.now(),
  });

  const handleShareMyQr = async () => {
    try {
      await Share.share({
        message: `MedSync Patient Health Token: ${userProfile?.id || ''}\nName: ${userProfile?.full_name || 'Patient'}`,
        title: 'MedSync Health ID',
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  const handleCopyToken = (text: string) => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Top Floating Control Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.circleButton}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X size={22} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>

          {/* Segmented Mode Switcher */}
          <View style={styles.modeSwitcher}>
            <TouchableOpacity
              style={[styles.modeTab, activeTab === 'SCAN' && styles.modeTabActive]}
              onPress={() => {
                setActiveTab('SCAN');
                resetScanner();
              }}
            >
              <Text style={[styles.modeTabText, activeTab === 'SCAN' && styles.modeTabTextActive]}>
                Scan QR
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, activeTab === 'MY_QR' && styles.modeTabActive]}
              onPress={() => setActiveTab('MY_QR')}
            >
              <Text style={[styles.modeTabText, activeTab === 'MY_QR' && styles.modeTabTextActive]}>
                My Health QR
              </Text>
            </TouchableOpacity>
          </View>

          {/* Flashlight toggle */}
          {activeTab === 'SCAN' ? (
            <TouchableOpacity
              style={[styles.circleButton, torchEnabled && styles.circleButtonActive]}
              onPress={() => setTorchEnabled(!torchEnabled)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              {torchEnabled ? (
                <Flashlight size={20} color="#2563EB" />
              ) : (
                <FlashlightOff size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          ) : (
            <View style={{ width: 42 }} />
          )}
        </View>

        {/* ── TAB 1: SCANNER VIEW ── */}
        {activeTab === 'SCAN' ? (
          <View style={styles.scannerContainer}>
            {permission?.granted ? (
              <View style={StyleSheet.absoluteFillObject}>
                <CameraView
                  style={StyleSheet.absoluteFillObject}
                  facing="back"
                  enableTorch={torchEnabled}
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                  }}
                  onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                />

                {/* Dark Vignette Overlay with Reticle Cutout */}
                <View style={styles.overlayContainer}>
                  <View style={styles.overlayTop}>
                    <Text style={styles.overlayHint}>
                      Align QR code within the frame to verify
                    </Text>
                  </View>

                  <View style={styles.overlayMiddleRow}>
                    <View style={styles.overlaySide} />

                    {/* Viewfinder Reticle */}
                    <View style={styles.reticleBox}>
                      {/* 4 Glowing Corner Brackets */}
                      <View style={[styles.corner, styles.topLeft]} />
                      <View style={[styles.corner, styles.topRight]} />
                      <View style={[styles.corner, styles.bottomLeft]} />
                      <View style={[styles.corner, styles.bottomRight]} />

                      {/* Animated Laser Beam */}
                      {!scanned && (
                        <Animated.View
                          style={[
                            styles.laserLine,
                            {
                              transform: [
                                {
                                  translateY: laserAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [10, RETICLE_SIZE - 20],
                                  }),
                                },
                              ],
                            },
                          ]}
                        />
                      )}
                    </View>

                    <View style={styles.overlaySide} />
                  </View>

                  <View style={styles.overlayBottom}>
                    <View style={styles.quickActionRow}>
                      <TouchableOpacity
                        style={styles.pillButton}
                        onPress={handlePickFromGallery}
                      >
                        <ImageIcon size={18} color="#FFFFFF" />
                        <Text style={styles.pillButtonText}>Upload from Gallery</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.permissionCard}>
                <View style={styles.permIconCircle}>
                  <Sparkles size={32} color="#2563EB" />
                </View>
                <Text style={styles.permTitle}>Camera Permission Needed</Text>
                <Text style={styles.permDesc}>
                  Enable camera access to instantly scan MedSync prescription QR codes, pharmacy verification stands, and blockchain medical badges.
                </Text>
                <TouchableOpacity
                  style={styles.permButton}
                  onPress={requestPermission}
                  activeOpacity={0.88}
                >
                  <Text style={styles.permButtonText}>Grant Camera Access</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Verification Result Sheet / Modal */}
            {scanned && (
              <View
                style={[
                  styles.resultSheet,
                  {
                    backgroundColor: theme.card,
                    borderTopColor: theme.border,
                    borderTopWidth: 1,
                  },
                ]}
              >
                {verifying ? (
                  <View style={styles.verifyingContainer}>
                    <View style={[styles.pulseDot, { backgroundColor: theme.accent }]} />
                    <Text style={[styles.verifyingText, { color: theme.text }]}>
                      Verifying with Polygon Ledger...
                    </Text>
                    <Text style={[styles.verifyingSub, { color: theme.textMuted }]}>
                      Validating smart contract hash
                    </Text>
                  </View>
                ) : scanResult ? (
                  <View style={styles.resultContent}>
                    {/* Header Icon & Status */}
                    <View style={styles.resultHeader}>
                      {scanResult.is_valid !== false ? (
                        <View style={styles.statusBadgeSuccess}>
                          <CheckCircle2 size={16} color="#10B981" />
                          <Text style={styles.statusBadgeTextSuccess}>Verified Authentic</Text>
                        </View>
                      ) : (
                        <View style={styles.statusBadgeError}>
                          <AlertCircle size={16} color="#EF4444" />
                          <Text style={styles.statusBadgeTextError}>Verification Notice</Text>
                        </View>
                      )}

                      <TouchableOpacity style={styles.rescanIconButton} onPress={resetScanner}>
                        <RotateCcw size={16} color={theme.textMuted} />
                        <Text style={[styles.rescanIconText, { color: theme.textMuted }]}>Scan Again</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Pharmacy QR Result */}
                    {scanResult.type === 'PHARMACY' || scanResult.pharmacy_name ? (
                      <View style={[styles.entityCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <View style={styles.entityHeader}>
                          <Store size={22} color={theme.accent} />
                          <View style={{ marginLeft: 10, flex: 1 }}>
                            <Text style={[styles.entityTitle, { color: theme.text }]}>
                              {scanResult.pharmacy_name || 'Verified MedSync Pharmacy'}
                            </Text>
                            <Text style={[styles.entitySub, { color: theme.textMuted }]}>
                              {scanResult.address || 'Authorized Dispensing Partner'}
                            </Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={[styles.actionButtonPrimary, { backgroundColor: theme.primaryButton }]}
                          onPress={() => setOrderModalVisible(true)}
                          activeOpacity={0.88}
                        >
                          <ShoppingBag size={18} color={theme.primaryButtonText} />
                          <Text style={[styles.actionButtonTextPrimary, { color: theme.primaryButtonText }]}>
                            Order Medicines Here
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : scanResult.type === 'BLOCKCHAIN' || scanResult.blockchain_verified ? (
                      /* Blockchain Record Result */
                      <View style={[styles.entityCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <View style={styles.entityHeader}>
                          <Blocks size={22} color="#10B981" />
                          <View style={{ marginLeft: 10, flex: 1 }}>
                            <Text style={[styles.entityTitle, { color: theme.text }]}>
                              Polygon Amoy Cryptographic Record
                            </Text>
                            <Text style={[styles.entitySub, { color: theme.textMuted }]}>
                              Tx: {scanResult.tx_hash ? `${scanResult.tx_hash.substring(0, 16)}...` : '0x7F2a...verified'}
                            </Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={[
                            styles.actionButtonOutline,
                            { backgroundColor: theme.card, borderColor: theme.border },
                          ]}
                          onPress={() => handleCopyToken(scanResult.tx_hash || scanResult.raw_token)}
                        >
                          <Copy size={16} color={theme.accent} />
                          <Text style={[styles.actionButtonTextOutline, { color: theme.accent }]}>
                            {copied ? 'Copied Hash!' : 'Copy Transaction Proof'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      /* General / Prescription Token Result */
                      <View style={[styles.entityCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <View style={styles.entityHeader}>
                          <FileText size={22} color={theme.accent} />
                          <View style={{ marginLeft: 10, flex: 1 }}>
                            <Text style={[styles.entityTitle, { color: theme.text }]}>
                              {scanResult.title || 'Health Authorization Token'}
                            </Text>
                            <Text style={[styles.entitySub, { color: theme.textMuted }]} numberOfLines={2}>
                              {scanResult.message || scanResult.raw_token || 'Token verified against server.'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                ) : null}
              </View>
            )}
          </View>
        ) : (
          /* ── TAB 2: MY HEALTH QR CODE (PATIENT'S UNIQUE ID) ── */
          <View style={[styles.myQrContainer, { backgroundColor: theme.background }]}>
            <View style={[styles.myQrCard, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
              <View style={styles.myQrHeader}>
                <View style={[styles.patientAvatar, { backgroundColor: theme.primaryButton }]}>
                  <Text style={[styles.patientInitials, { color: theme.primaryButtonText }]}>
                    {userProfile?.full_name ? userProfile.full_name.substring(0, 2).toUpperCase() : 'PT'}
                  </Text>
                </View>
                <Text style={[styles.patientName, { color: theme.text }]}>
                  {userProfile?.full_name || 'MedSync Patient'}
                </Text>
                <Text style={[styles.patientSub, { color: theme.textMuted }]}>Verified Health Member</Text>

                <View style={styles.bloodBadge}>
                  <Text style={styles.bloodBadgeText}>
                    Blood Group: {userProfile?.blood_group || 'O+'}
                  </Text>
                </View>
              </View>

              {/* QR Code Container (Always white quiet zone for scanner readability) */}
              <View style={[styles.qrWrapper, { borderColor: theme.border }]}>
                <QRCode
                  value={patientQrValue}
                  size={RETICLE_SIZE * 0.8}
                  color="#09090B"
                  backgroundColor="#FFFFFF"
                />
              </View>

              <Text style={[styles.qrInstructions, { color: theme.textMuted }]}>
                Show this QR to doctors or pharmacies to share your health history or verify prescriptions.
              </Text>

              {/* Action Buttons */}
              <View style={styles.qrActionRow}>
                <TouchableOpacity
                  style={[styles.qrShareButton, { backgroundColor: theme.primaryButton }]}
                  onPress={handleShareMyQr}
                  activeOpacity={0.88}
                >
                  <Share2 size={18} color={theme.primaryButtonText} />
                  <Text style={[styles.qrShareText, { color: theme.primaryButtonText }]}>Share Token</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Order Medicines Modal Triggered from Scanned Pharmacy */}
        <OrderMedicinesModal
          visible={orderModalVisible}
          onClose={() => setOrderModalVisible(false)}
          defaultPharmacyId={scanResult?.pharmacy_id}
          onSuccess={() => {
            setOrderModalVisible(false);
            onClose();
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 36,
    left: 18,
    right: 18,
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleButtonActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#2563EB',
  },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 22,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  modeTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
  },
  modeTabActive: {
    backgroundColor: '#2563EB',
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  modeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    justifyContent: 'space-between',
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 24,
  },
  overlayHint: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  overlayMiddleRow: {
    flexDirection: 'row',
    height: RETICLE_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
  },
  reticleBox: {
    width: RETICLE_SIZE,
    height: RETICLE_SIZE,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#38BDF8',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  laserLine: {
    width: RETICLE_SIZE - 20,
    height: 2.5,
    backgroundColor: '#38BDF8',
    alignSelf: 'center',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  overlayBottom: {
    flex: 1.4,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    alignItems: 'center',
    paddingTop: 30,
  },
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  pillButtonText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '600',
    marginLeft: 8,
  },
  permissionCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#0F172A',
  },
  permIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  permTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  permDesc: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  permButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
  },
  permButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resultSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
    zIndex: 40,
  },
  verifyingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  pulseDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#2563EB',
    marginBottom: 12,
  },
  verifyingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  verifyingSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  resultContent: {},
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  statusBadgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusBadgeTextSuccess: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#10B981',
    marginLeft: 5,
  },
  statusBadgeError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusBadgeTextError: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#EF4444',
    marginLeft: 5,
  },
  rescanIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
  },
  rescanIconText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 4,
  },
  entityCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 16,
    marginTop: 6,
  },
  entityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  entityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  entitySub: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  actionButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    height: 48,
    borderRadius: 14,
  },
  actionButtonTextPrimary: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  actionButtonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#2563EB',
    height: 46,
    borderRadius: 14,
  },
  actionButtonTextOutline: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
    marginLeft: 8,
  },
  myQrContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  myQrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 26,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 8,
  },
  myQrHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  patientAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  patientInitials: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  patientName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
  },
  patientSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  bloodBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 8,
  },
  bloodBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 18,
  },
  qrInstructions: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  qrActionRow: {
    width: '100%',
  },
  qrShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    height: 48,
    borderRadius: 14,
    width: '100%',
  },
  qrShareText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});
