import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Alert,
  Animated,
  Easing,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  FileText,
  Download,
  Lock,
  Globe,
  Shield,
  AlertCircle,
  RefreshCw,
  Pill,
  ShoppingBag,
  Package,
  Truck,
  CheckCircle2,
  Plus,
  ScanLine,
  Calendar,
  Stethoscope,
  Eye,
  UserCheck,
  UserX,
  Activity,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react-native';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { PinVerificationModal } from '../../../components/patient/PinVerificationModal';
import { UploadRecordModal } from '../../../components/patient/UploadRecordModal';
import { OrderMedicinesModal } from '../../../components/patient/OrderMedicinesModal';
import { PrescriptionQRModal } from '../../../components/patient/PrescriptionQRModal';
import { DeliveryTrackingModal } from '../../../components/patient/DeliveryTrackingModal';
import {
  patientService,
  MedicalRecordItem,
  PrescriptionItem,
  MedicineOrderItem,
} from '../../../services/patient.service';
import { formatErrorMessage } from '../../../lib/api';
import { useTheme } from '../../../context/ThemeContext';

export type ViewTab = 'RECORDS' | 'PRESCRIPTIONS' | 'ORDERS' | 'CONSULTATIONS' | 'PRIVACY';

export default function PatientRecordsScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<ViewTab>('RECORDS');

  // Main collections
  const [records, setRecords] = useState<MedicalRecordItem[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [orders, setOrders] = useState<MedicineOrderItem[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);

  // Privacy & Access collections
  const [activeDoctorAccess, setActiveDoctorAccess] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [doctorAccessLogs, setDoctorAccessLogs] = useState<any[]>([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [revokingPermissionId, setRevokingPermissionId] = useState<string | null>(null);

  // Tab animations
  const tabFadeAnim = useRef(new Animated.Value(1)).current;
  const tabSlideAnim = useRef(new Animated.Value(0)).current;

  const switchViewTab = useCallback((nextTab: ViewTab) => {
    setActiveTab((prev) => {
      if (prev === nextTab) return prev;
      tabFadeAnim.setValue(0);
      tabSlideAnim.setValue(10);
      Animated.parallel([
        Animated.timing(tabFadeAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(tabSlideAnim, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return nextTab;
    });
  }, [tabFadeAnim, tabSlideAnim]);

  useEffect(() => {
    const requested = (params?.tab || '').toUpperCase();
    if (
      requested === 'RECORDS' ||
      requested === 'PRESCRIPTIONS' ||
      requested === 'ORDERS' ||
      requested === 'CONSULTATIONS' ||
      requested === 'PRIVACY'
    ) {
      switchViewTab(requested as ViewTab);
    }
  }, [params?.tab, switchViewTab]);

  // PIN modal state for Record or Prescription
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedEntityType, setSelectedEntityType] = useState<'RECORD' | 'PRESCRIPTION'>('RECORD');
  const [selectedCachedUri, setSelectedCachedUri] = useState<string | null>(null);
  const [pinAction, setPinAction] = useState<'OPEN' | 'DOWNLOAD'>('DOWNLOAD');
  const [pinModalTitle, setPinModalTitle] = useState('Authorization Required');
  const [pinModalSubtitle, setPinModalSubtitle] = useState('Enter your 6-digit PIN to proceed.');
  const [pinModalVisible, setPinModalVisible] = useState(false);

  // Upload Record modal state
  const [uploadModalVisible, setUploadModalVisible] = useState(false);

  // Order Medicines modal state
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [selectedPrescriptionForOrder, setSelectedPrescriptionForOrder] = useState<PrescriptionItem | null>(null);

  // Prescription QR Modal state
  const [selectedPrescriptionForQr, setSelectedPrescriptionForQr] = useState<PrescriptionItem | null>(null);

  // Delivery Tracking Modal state
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<MedicineOrderItem | null>(null);

  // Offline / Local Cached File URIs: populated on probe so downloaded files are marked & opened directly
  const [downloadedRxUris, setDownloadedRxUris] = useState<Record<string, string>>({});
  const [downloadedRecordUris, setDownloadedRecordUris] = useState<Record<string, string>>({});

  const refreshCachedFiles = useCallback(
    async (recsList: MedicalRecordItem[], rxList: PrescriptionItem[]) => {
      try {
        if (recsList.length > 0) {
          const recEntries = await Promise.all(
            recsList.map(async (r) => {
              const uri = await patientService.getCachedRecordUri(r.id, r.file_metadata?.mime_type);
              return uri ? ([r.id, uri] as const) : null;
            })
          );
          const recMap: Record<string, string> = {};
          recEntries.forEach((e) => {
            if (e) recMap[e[0]] = e[1];
          });
          setDownloadedRecordUris((prev) => ({ ...prev, ...recMap }));
        }
        if (rxList.length > 0) {
          const rxEntries = await Promise.all(
            rxList.map(async (rx) => {
              const uri = await patientService.getCachedPrescriptionPdfUri(rx.id);
              return uri ? ([rx.id, uri] as const) : null;
            })
          );
          const rxMap: Record<string, string> = {};
          rxEntries.forEach((e) => {
            if (e) rxMap[e[0]] = e[1];
          });
          setDownloadedRxUris((prev) => ({ ...prev, ...rxMap }));
        }
      } catch {
        // Ignore cache probe failures
      }
    },
    []
  );

  const loadData = useCallback(async () => {
    try {
      setError(null);
      if (activeTab === 'RECORDS') {
        const data = await patientService.getMedicalRecords();
        setRecords(data);
        refreshCachedFiles(data, []);
      } else if (activeTab === 'PRESCRIPTIONS') {
        const data = await patientService.getPrescriptions();
        setPrescriptions(data);
        refreshCachedFiles([], data);
      } else if (activeTab === 'ORDERS') {
        const data = await patientService.getMedicineOrders();
        setOrders(data);
      } else if (activeTab === 'CONSULTATIONS') {
        const data = await patientService.getConsultationsHistory();
        setConsultations(data);
      } else if (activeTab === 'PRIVACY') {
        const [docAccess, reqs] = await Promise.all([
          patientService.getDoctorAccess(),
          patientService.getPendingRecordRequests(),
        ]);
        setActiveDoctorAccess(docAccess.active_permissions || []);
        setDoctorAccessLogs(docAccess.access_logs || []);
        setPendingRequests(reqs || []);
      }
    } catch (err: any) {
      console.warn('Failed to load records tab data:', err);
      setError(err.message || 'Could not retrieve data from server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, refreshCachedFiles]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // ── Record Opening / Downloading with Auth PIN ─────────────────────────────
  const handleOpenCachedOrDownloadRecord = async (record: MedicalRecordItem) => {
    const cachedUri =
      downloadedRecordUris[record.id] ||
      (await patientService.getCachedRecordUri(record.id, record.file_metadata?.mime_type));

    setSelectedEntityId(record.id);
    setSelectedEntityType('RECORD');

    if (cachedUri) {
      // Document is already downloaded or was uploaded on this device!
      // Require PIN before opening the protected document.
      setSelectedCachedUri(cachedUri);
      setPinAction('OPEN');
      setPinModalTitle('Open Protected Document');
      setPinModalSubtitle('Enter your 6-digit PIN to securely view this medical record on your device.');
      setPinModalVisible(true);
    } else {
      // Document not detected on device (e.g. uploaded from web); require PIN to download
      setSelectedCachedUri(null);
      setPinAction('DOWNLOAD');
      setPinModalTitle('Decrypt & Download Record');
      setPinModalSubtitle('Enter your 6-digit PIN to authorize cryptographic download from your health vault.');
      setPinModalVisible(true);
    }
  };

  // ── Prescription Opening / Downloading with Auth PIN ─────────────────────────
  const handleOpenCachedOrDownloadPrescription = async (prescriptionId: string) => {
    const cachedUri =
      downloadedRxUris[prescriptionId] ||
      (await patientService.getCachedPrescriptionPdfUri(prescriptionId));

    setSelectedEntityId(prescriptionId);
    setSelectedEntityType('PRESCRIPTION');

    if (cachedUri) {
      setSelectedCachedUri(cachedUri);
      setPinAction('OPEN');
      setPinModalTitle('Open Prescription PDF');
      setPinModalSubtitle('Enter your 6-digit PIN to securely view this verified prescription PDF.');
      setPinModalVisible(true);
    } else {
      setSelectedCachedUri(null);
      setPinAction('DOWNLOAD');
      setPinModalTitle('Download Prescription PDF');
      setPinModalSubtitle('Enter your 6-digit PIN to decrypt and download your official prescription PDF.');
      setPinModalVisible(true);
    }
  };

  // ── Universal PIN Confirmation Handler ──────────────────────────────────────
  const handleConfirmPinDownload = async (pin: string) => {
    if (!selectedEntityId) return;
    const entityId = selectedEntityId;
    const cachedUri = selectedCachedUri;

    // 1. If action is OPEN: validate PIN directly and open the local file without re-downloading
    if (pinAction === 'OPEN' && cachedUri) {
      const isValid = await patientService.validatePin(pin);
      if (!isValid) {
        throw new Error('Incorrect 6-digit PIN. Please verify your PIN and try again.');
      }

      setPinModalVisible(false);
      setSelectedEntityId(null);
      setSelectedCachedUri(null);

      const opened = await patientService.openLocalFile(cachedUri);
      if (!opened) {
        Alert.alert(
          'Viewer Unavailable',
          'Could not open document. Please ensure a PDF or image viewer application is installed.'
        );
      }
      return;
    }

    // 2. If action is DOWNLOAD: call authorized endpoint, save to cache directory, then open
    if (selectedEntityType === 'RECORD') {
      try {
        const data = await patientService.downloadRecordWithPin(entityId, pin);
        setPinModalVisible(false);
        setSelectedEntityId(null);
        setSelectedCachedUri(null);

        if (data?.localUri) {
          setDownloadedRecordUris((prev) => ({ ...prev, [entityId]: data.localUri }));
          const opened = await patientService.openLocalFile(data.localUri);
          if (opened) return;
        }

        const downloadUrl = data?.url || data?.signed_url || data?.download_url;
        if (downloadUrl) {
          const supported = await Linking.canOpenURL(downloadUrl).catch(() => false);
          if (supported) {
            await Linking.openURL(downloadUrl);
          } else {
            Alert.alert('Download Ready', `File link generated: ${downloadUrl}`);
          }
        } else {
          Alert.alert('Notice', 'Authorized download URL could not be resolved.');
        }
      } catch (err: any) {
        throw new Error(formatErrorMessage(err) || 'Download failed. Please check your PIN.');
      }
    } else {
      try {
        const data = await patientService.authorizePrescriptionDownload(entityId, pin);
        setPinModalVisible(false);
        setSelectedEntityId(null);
        setSelectedCachedUri(null);

        if (data?.localUri) {
          setDownloadedRxUris((prev) => ({ ...prev, [entityId]: data.localUri }));
          const opened = await patientService.openLocalFile(data.localUri);
          if (opened) return;
        }

        const downloadUrl = data?.download_url || data?.url || data?.signed_url || data?.pdf_url;
        if (downloadUrl) {
          const supported = await Linking.canOpenURL(downloadUrl).catch(() => false);
          if (supported) {
            await Linking.openURL(downloadUrl);
          } else {
            Alert.alert('Prescription PDF Ready', `Saved locally or open at: ${downloadUrl}`);
          }
        } else {
          Alert.alert('Download Incomplete', 'PIN verified, but the prescription PDF could not be retrieved.');
        }
      } catch (err: any) {
        throw new Error(formatErrorMessage(err) || 'Authorization failed. Please check your PIN.');
      }
    }
  };

  // ── Record Privacy Consent Toggle ───────────────────────────────────────────
  const handleToggleConsent = async (record: MedicalRecordItem) => {
    const isCurrentlyPublic = record.description?.includes('[PUBLIC]') ?? false;
    const newStatus = !isCurrentlyPublic;

    try {
      await patientService.updateRecordConsent(record.id, newStatus);
      Alert.alert(
        'Privacy Updated',
        `This record has been marked as ${newStatus ? 'PUBLIC (accessible to consulting doctors)' : 'PRIVATE (restricted to you)'}.`
      );
      loadData();
    } catch (err: any) {
      Alert.alert('Update Failed', formatErrorMessage(err));
    }
  };

  // ── Privacy & Doctor Access Actions ─────────────────────────────────────────
  const handleApproveRequest = async (requestId: string) => {
    setProcessingRequestId(requestId);
    try {
      await patientService.approveRecordRequest(requestId);
      Alert.alert('Access Granted', 'The attending doctor now has authorized permission to view this medical document.');
      await loadData();
    } catch (err: any) {
      Alert.alert('Approval Failed', formatErrorMessage(err));
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setProcessingRequestId(requestId);
    try {
      await patientService.rejectRecordRequest(requestId);
      Alert.alert('Access Declined', 'Doctor document access request declined.');
      await loadData();
    } catch (err: any) {
      Alert.alert('Action Failed', formatErrorMessage(err));
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRevokeDoctorAccess = async (doctorId: string, recordId?: string | null) => {
    setRevokingPermissionId(`${doctorId}_${recordId || 'all'}`);
    try {
      await patientService.revokeDoctorAccess(doctorId, recordId);
      Alert.alert('Access Revoked', 'Doctor clinical access has been revoked immediately.');
      await loadData();
    } catch (err: any) {
      Alert.alert('Revocation Failed', formatErrorMessage(err));
    } finally {
      setRevokingPermissionId(null);
    }
  };

  // ── Render Item: Medical Record ─────────────────────────────────────────────
  const renderRecordItem = ({ item }: { item: MedicalRecordItem }) => {
    const isPublic = item.description?.includes('[PUBLIC]') ?? false;
    const isConsultationPdf = Boolean(item.description?.includes('[CONSULTATION:'));
    const isDownloaded = Boolean(downloadedRecordUris[item.id]);
    const cleanDescription = (item.description || '')
      .replace(/\[CONSULTATION:[^\]]+\]/g, '')
      .replace('[PUBLIC]', '')
      .trim();
    const formattedDate = item.created_at ? new Date(item.created_at).toLocaleDateString() : '—';

    return (
      <Card style={[styles.cardItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <CardContent>
          <View style={styles.cardHeaderRow}>
            <View
              style={[
                styles.iconBoxBlue,
                {
                  backgroundColor: isConsultationPdf
                    ? isDark
                      ? 'rgba(16, 185, 129, 0.14)'
                      : '#ECFDF5'
                    : isDark
                    ? 'rgba(56, 189, 248, 0.12)'
                    : '#F0F9FF',
                  borderColor: isConsultationPdf
                    ? isDark
                      ? 'rgba(16, 185, 129, 0.3)'
                      : '#A7F3D0'
                    : isDark
                    ? 'rgba(56, 189, 248, 0.25)'
                    : '#BAE6FD',
                  borderWidth: 1,
                },
              ]}
            >
              <FileText
                size={20}
                color={isConsultationPdf ? '#10B981' : isDark ? '#38BDF8' : '#0284C7'}
              />
            </View>
            <View style={styles.titleColumn}>
              <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.subtitleRow}>
                <Text style={[styles.itemSubtitle, { color: theme.textMuted }]}>
                  {isConsultationPdf ? 'Doctor Consultation Note • ' : 'Uploaded: '}
                  {formattedDate}
                </Text>
                {isDownloaded && (
                  <View style={styles.downloadedChip}>
                    <CheckCircle2 size={11} color="#059669" />
                    <Text style={styles.downloadedChipText}>Downloaded</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={[styles.badge, isPublic ? styles.publicBadge : styles.privateBadge]}>
              {isPublic ? <Globe size={11} color="#10B981" /> : <Lock size={11} color="#64748B" />}
              <Text style={[styles.badgeText, isPublic ? styles.publicText : styles.privateText]}>
                {isPublic ? 'Public' : 'Private'}
              </Text>
            </View>
          </View>

          {cleanDescription ? (
            <Text style={[styles.itemDesc, { color: theme.textSecondary }]}>
              {cleanDescription}
            </Text>
          ) : null}

          <View style={styles.actionsRow}>
            <Button
              title={isDownloaded ? 'Open Document' : 'Download'}
              size="sm"
              iconLeft={
                isDownloaded ? (
                  <FileText size={14} color="#FFFFFF" />
                ) : (
                  <Download size={14} color={theme.primaryButtonText} />
                )
              }
              onPress={() => handleOpenCachedOrDownloadRecord(item)}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: isDownloaded ? '#059669' : theme.primaryButton,
                },
              ]}
            />
            <TouchableOpacity
              style={[
                styles.consentBtn,
                isPublic ? styles.consentBtnPrivate : styles.consentBtnPublic,
              ]}
              onPress={() => handleToggleConsent(item)}
              activeOpacity={0.8}
            >
              {isPublic ? (
                <Lock size={14} color="#DC2626" />
              ) : (
                <Globe size={14} color="#059669" />
              )}
              <Text
                style={[
                  styles.consentBtnText,
                  isPublic ? styles.consentTextPrivate : styles.consentTextPublic,
                ]}
              >
                {isPublic ? 'Make Private' : 'Make Public'}
              </Text>
            </TouchableOpacity>
          </View>
        </CardContent>
      </Card>
    );
  };

  // ── Render Item: Prescription ───────────────────────────────────────────────
  const renderPrescriptionItem = ({ item }: { item: PrescriptionItem }) => {
    const formattedDate = item.created_at ? new Date(item.created_at).toLocaleDateString() : '—';
    const isDownloaded = Boolean(downloadedRxUris[item.id]);

    return (
      <Card style={[styles.cardItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <CardContent>
          <View style={styles.cardHeaderRow}>
            <View
              style={[
                styles.iconBoxAmber,
                {
                  backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FEF3C7',
                  borderColor: isDark ? 'rgba(245, 158, 11, 0.25)' : '#FDE68A',
                  borderWidth: 1,
                },
              ]}
            >
              <Pill size={20} color="#D97706" />
            </View>
            <View style={styles.titleColumn}>
              <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>
                {item.diagnosis || 'Clinical Prescription'}
              </Text>
              <View style={styles.subtitleRow}>
                <Text style={[styles.itemSubtitle, { color: theme.textMuted }]}>
                  Issued: {formattedDate}
                </Text>
                {isDownloaded && (
                  <View style={styles.downloadedChip}>
                    <CheckCircle2 size={11} color="#059669" />
                    <Text style={styles.downloadedChipText}>Downloaded</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={[styles.badge, item.is_dispensed ? styles.publicBadge : styles.pendingBadge]}>
              <Text style={[styles.badgeText, item.is_dispensed ? styles.publicText : styles.pendingText]}>
                {item.is_dispensed ? 'Dispensed' : 'Active'}
              </Text>
            </View>
          </View>

          {Array.isArray(item.medications) && item.medications.length > 0 && (
            <View
              style={[
                styles.medsBox,
                {
                  backgroundColor: isDark ? '#18181B' : '#F8FAFC',
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.medsLabel, { color: theme.textSecondary }]}>Medications:</Text>
              {item.medications.map((m: any, idx: number) => (
                <Text key={idx} style={[styles.medItem, { color: theme.text }]}>
                  • {m.name || m.medicine_name || 'Medication'} {m.dosage ? `(${m.dosage})` : ''} — {m.frequency || m.instructions || ''}
                </Text>
              ))}
            </View>
          )}

          {item.notes ? (
            <Text style={[styles.itemDesc, { color: theme.textSecondary }]}>{item.notes}</Text>
          ) : null}

          <View style={styles.actionsRow}>
            <Button
              title={isDownloaded ? 'Open PDF' : 'Download PDF'}
              size="sm"
              iconLeft={
                isDownloaded ? (
                  <FileText size={14} color="#FFFFFF" />
                ) : (
                  <Download size={14} color={theme.primaryButtonText} />
                )
              }
              onPress={() => handleOpenCachedOrDownloadPrescription(item.id)}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: isDownloaded ? '#059669' : theme.primaryButton,
                },
              ]}
            />
            <TouchableOpacity
              style={[
                styles.showQrBtn,
                {
                  backgroundColor: isDark ? '#27272A' : '#F4F4F5',
                  borderColor: theme.border,
                },
              ]}
              onPress={() => setSelectedPrescriptionForQr(item)}
              activeOpacity={0.8}
            >
              <ScanLine size={14} color={isDark ? '#FAFAFA' : '#09090B'} />
              <Text style={[styles.showQrBtnText, { color: theme.text }]}>Show QR</Text>
            </TouchableOpacity>
            {!item.is_dispensed && (
              <TouchableOpacity
                style={styles.orderDeliveryBtn}
                onPress={() => {
                  setSelectedPrescriptionForOrder(item);
                  setOrderModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <ShoppingBag size={14} color="#FFFFFF" />
                <Text style={styles.orderDeliveryBtnText}>Order</Text>
              </TouchableOpacity>
            )}
          </View>
        </CardContent>
      </Card>
    );
  };

  // ── Render Item: Medicine Order ─────────────────────────────────────────────
  const renderOrderItem = ({ item }: { item: MedicineOrderItem }) => {
    const formattedDate = item.created_at ? new Date(item.created_at).toLocaleDateString() : '—';
    const statusUpper = String(item.status || 'PENDING').toUpperCase();
    const isDelivered = statusUpper === 'DELIVERED';
    const isCancelled = statusUpper === 'CANCELLED';
    const isInTransit = ['SHIPPED', 'OUT_FOR_DELIVERY', 'DISPATCHED', 'IN_TRANSIT'].includes(statusUpper);

    const badgeBg = isDelivered
      ? 'rgba(16, 185, 129, 0.14)'
      : isCancelled
      ? 'rgba(239, 68, 68, 0.14)'
      : isInTransit
      ? 'rgba(59, 130, 246, 0.14)'
      : 'rgba(245, 158, 11, 0.14)';
    const badgeColor = isDelivered
      ? '#10B981'
      : isCancelled
      ? '#EF4444'
      : isInTransit
      ? '#3B82F6'
      : '#D97706';

    return (
      <Card style={[styles.cardItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <CardContent>
          <View style={styles.cardHeaderRow}>
            <View
              style={[
                styles.iconBoxIndigo,
                {
                  backgroundColor: isDelivered
                    ? isDark
                      ? 'rgba(16, 185, 129, 0.12)'
                      : '#ECFDF5'
                    : isDark
                    ? 'rgba(99, 102, 241, 0.12)'
                    : '#EEF2FF',
                  borderColor: isDelivered
                    ? isDark
                      ? 'rgba(16, 185, 129, 0.25)'
                      : '#A7F3D0'
                    : isDark
                    ? 'rgba(99, 102, 241, 0.25)'
                    : '#C7D2FE',
                  borderWidth: 1,
                },
              ]}
            >
              {isDelivered ? (
                <CheckCircle2 size={20} color="#10B981" />
              ) : (
                <Package size={20} color="#6366F1" />
              )}
            </View>
            <View style={styles.titleColumn}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>Order #{item.id.slice(0, 8)}</Text>
              <Text style={[styles.itemSubtitle, { color: theme.textMuted }]}>Ordered: {formattedDate}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: badgeBg }]}>
              <Text style={[styles.badgeText, { color: badgeColor }]}>{statusUpper}</Text>
            </View>
          </View>

          {item.delivery_address && (
            <Text style={[styles.itemDesc, { color: theme.textSecondary }]}>
              Delivery to: {item.delivery_address}
            </Text>
          )}

          {item.tracking_number && !isDelivered && !isCancelled && (
            <View style={styles.trackingRow}>
              <Truck size={14} color={theme.textMuted} />
              <Text style={[styles.trackingText, { color: theme.textSecondary }]}>
                Tracking: {item.tracking_number}
              </Text>
            </View>
          )}

          {!isCancelled && (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[
                  styles.trackDeliveryBtn,
                  isDelivered && {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.14)' : '#ECFDF5',
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0',
                  },
                ]}
                onPress={() => setSelectedOrderForTracking(item)}
                activeOpacity={0.85}
              >
                {isDelivered ? (
                  <CheckCircle2 size={14} color="#10B981" />
                ) : (
                  <Truck size={14} color="#FFFFFF" />
                )}
                <Text
                  style={[
                    styles.trackDeliveryBtnText,
                    isDelivered && { color: '#10B981' },
                  ]}
                >
                  {isDelivered ? 'Delivered • View Summary' : 'Live Delivery Tracking'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </CardContent>
      </Card>
    );
  };

  // ── Render Item: Consultation Note ─────────────────────────────────────────
  const renderConsultationItem = ({ item }: { item: any }) => {
    const doctorName =
      item.doctor_name ||
      item.appointments?.doctors?.full_name ||
      (item.doctor_id ? `Doctor (${item.doctor_id.slice(0, 8)})` : 'Attending Physician');
    const doctorSpec =
      item.doctor_specialization ||
      item.appointments?.doctors?.specialization ||
      'Medical Practitioner';
    const clinicName =
      item.clinic_or_hospital ||
      item.appointments?.doctors?.clinic_name ||
      item.appointments?.doctors?.hospital_name;
    const formattedDate = item.completed_at || item.created_at
      ? new Date(item.completed_at || item.created_at).toLocaleDateString()
      : '—';
    const isPublic = Boolean(item.is_public);

    return (
      <Card style={[styles.cardItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <CardContent>
          <View style={styles.cardHeaderRow}>
            <View
              style={[
                styles.iconBoxGreen,
                {
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5',
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#A7F3D0',
                  borderWidth: 1,
                },
              ]}
            >
              <Stethoscope size={20} color="#10B981" />
            </View>
            <View style={styles.titleColumn}>
              <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>
                {doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`}
              </Text>
              <Text style={[styles.itemSubtitle, { color: theme.textMuted }]}>
                {doctorSpec} {clinicName ? `• ${clinicName}` : ''}
              </Text>
            </View>
            <View style={[styles.badge, isPublic ? styles.publicBadge : styles.privateBadge]}>
              {isPublic ? <Globe size={11} color="#10B981" /> : <Lock size={11} color="#64748B" />}
              <Text style={[styles.badgeText, isPublic ? styles.publicText : styles.privateText]}>
                {isPublic ? 'Public' : 'Private'}
              </Text>
            </View>
          </View>

          <View style={styles.consultationMetaRow}>
            <Clock size={12} color={theme.textMuted} />
            <Text style={[styles.consultationDateText, { color: theme.textMuted }]}>
              Consultation Date: {formattedDate}
            </Text>
          </View>

          {(item.diagnosis || item.symptoms) && (
            <View
              style={[
                styles.clinicalBox,
                { backgroundColor: isDark ? '#18181B' : '#F8FAFC', borderColor: theme.border },
              ]}
            >
              {item.diagnosis ? (
                <View style={styles.clinicalLine}>
                  <Text style={[styles.clinicalLineLabel, { color: theme.text }]}>Diagnosis: </Text>
                  <Text style={[styles.clinicalLineValue, { color: theme.textSecondary }]}>
                    {item.diagnosis}
                  </Text>
                </View>
              ) : null}
              {item.symptoms ? (
                <View style={styles.clinicalLine}>
                  <Text style={[styles.clinicalLineLabel, { color: theme.text }]}>Symptoms: </Text>
                  <Text style={[styles.clinicalLineValue, { color: theme.textSecondary }]}>
                    {item.symptoms}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {item.treatment_plan ? (
            <View style={styles.clinicalSection}>
              <Text style={[styles.clinicalSectionHeader, { color: theme.textMuted }]}>
                Treatment Plan
              </Text>
              <Text style={[styles.clinicalBodyText, { color: theme.text }]}>
                {item.treatment_plan}
              </Text>
            </View>
          ) : null}

          {item.clinical_notes ? (
            <View style={styles.clinicalSection}>
              <Text style={[styles.clinicalSectionHeader, { color: theme.textMuted }]}>
                Clinical Observations & Notes
              </Text>
              <Text
                style={[
                  styles.clinicalNotesItalic,
                  {
                    color: theme.textSecondary,
                    backgroundColor: isDark ? '#141416' : '#F1F5F9',
                    borderColor: theme.border,
                  },
                ]}
              >
                &ldquo;{item.clinical_notes}&rdquo;
              </Text>
            </View>
          ) : null}

          {item.follow_up_date ? (
            <View style={styles.followUpRow}>
              <Calendar size={13} color="#2563EB" />
              <Text style={[styles.followUpText, { color: isDark ? '#93C5FD' : '#1D4ED8' }]}>
                Recommended Follow-up: {new Date(item.follow_up_date).toLocaleDateString()}
              </Text>
            </View>
          ) : null}
        </CardContent>
      </Card>
    );
  };

  // ── Render Item: Privacy & Access View ──────────────────────────────────────
  const renderPrivacyView = () => {
    return (
      <View style={styles.privacyContainer}>
        {/* Section 1: Pending Doctor Requests */}
        <View style={styles.privacySection}>
          <View style={styles.sectionHeaderRow}>
            <ShieldAlert size={18} color="#D97706" />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Pending Doctor Access Requests ({pendingRequests.length})
            </Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
            Attending physicians requesting clinical access to your private diagnostic records.
          </Text>

          {pendingRequests.length === 0 ? (
            <View
              style={[
                styles.emptySubBox,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <CheckCircle2 size={24} color="#10B981" />
              <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>
                No pending requests. Your medical records are currently secure and private.
              </Text>
            </View>
          ) : (
            pendingRequests.map((req) => {
              const isProcessing = processingRequestId === req.id;
              const docName = req.requesting_doctor_name || req.doctors?.full_name || 'Doctor';
              return (
                <View
                  key={req.id}
                  style={[
                    styles.requestCard,
                    { backgroundColor: theme.card, borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A' },
                  ]}
                >
                  <View style={styles.requestHeader}>
                    <View style={styles.docAvatarBox}>
                      <Text style={styles.docAvatarText}>DR</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.docNameText, { color: theme.text }]}>
                        {docName.startsWith('Dr.') ? docName : `Dr. ${docName}`}
                      </Text>
                      <Text style={[styles.docSpecText, { color: theme.textMuted }]}>
                        {req.specialization || req.doctors?.specialization || 'Physician'}
                        {req.hospital_name || req.doctors?.hospital_name ? ` • ${req.hospital_name || req.doctors?.hospital_name}` : ''}
                      </Text>
                    </View>
                    <View style={styles.pendingBadgeMini}>
                      <Text style={styles.pendingBadgeMiniText}>Pending Review</Text>
                    </View>
                  </View>

                  {req.reason ? (
                    <Text style={[styles.requestReasonText, { color: theme.textSecondary }]}>
                      Reason: &ldquo;{req.reason}&rdquo;
                    </Text>
                  ) : null}

                  <View style={styles.requestActionRow}>
                    <TouchableOpacity
                      style={[styles.approveBtn, isProcessing && { opacity: 0.6 }]}
                      onPress={() => handleApproveRequest(req.id)}
                      disabled={isProcessing}
                      activeOpacity={0.85}
                    >
                      {isProcessing ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <UserCheck size={14} color="#FFFFFF" />
                          <Text style={styles.approveBtnText}>Approve Access</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.declineBtn, isProcessing && { opacity: 0.6 }]}
                      onPress={() => handleRejectRequest(req.id)}
                      disabled={isProcessing}
                      activeOpacity={0.85}
                    >
                      <UserX size={14} color="#EF4444" />
                      <Text style={styles.declineBtnText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Section 2: Active Doctor Permissions */}
        <View style={styles.privacySection}>
          <View style={styles.sectionHeaderRow}>
            <ShieldCheck size={18} color="#10B981" />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Doctors with Active Document Access ({activeDoctorAccess.length})
            </Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
            Healthcare practitioners currently authorized to view your diagnostic files.
          </Text>

          {activeDoctorAccess.length === 0 ? (
            <View
              style={[
                styles.emptySubBox,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Shield size={24} color={isDark ? '#71717A' : '#94A3B8'} />
              <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>
                No external doctors currently have access to your documents.
              </Text>
            </View>
          ) : (
            activeDoctorAccess.map((perm) => {
              const isRevoking = revokingPermissionId === `${perm.doctor_id}_${perm.record_id || 'all'}`;
              return (
                <View
                  key={perm.id || perm.permission_id}
                  style={[
                    styles.activeDoctorCard,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <View style={styles.activeDocRow}>
                    <View style={styles.docAvatarGreen}>
                      <Text style={styles.docAvatarGreenText}>DR</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.docNameText, { color: theme.text }]}>
                        {perm.doctor_name || 'Attending Doctor'}
                      </Text>
                      <Text style={[styles.docSpecText, { color: theme.textMuted }]}>
                        Document: <Text style={{ color: theme.text, fontWeight: '600' }}>{perm.record_title || 'All Records'}</Text>
                      </Text>
                      {perm.hospital_name ? (
                        <Text style={[styles.docHospitalText, { color: theme.textMuted }]}>
                          {perm.hospital_name}
                        </Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.revokeBtn,
                        isRevoking && { opacity: 0.6 },
                      ]}
                      onPress={() => handleRevokeDoctorAccess(perm.doctor_id, perm.record_id)}
                      disabled={isRevoking}
                      activeOpacity={0.85}
                    >
                      {isRevoking ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <>
                          <Lock size={12} color="#EF4444" />
                          <Text style={styles.revokeBtnText}>Revoke</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Section 3: Access Activity Audit Log */}
        <View style={styles.privacySection}>
          <View style={styles.sectionHeaderRow}>
            <Activity size={18} color="#2563EB" />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Doctor Review Audit Log
            </Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
            Cryptographic log of doctors who have viewed or verified your records.
          </Text>

          {doctorAccessLogs.length === 0 ? (
            <View
              style={[
                styles.emptySubBox,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Activity size={22} color={isDark ? '#71717A' : '#94A3B8'} />
              <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>
                No review activity events logged yet.
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.auditBox,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              {doctorAccessLogs.map((log) => (
                <View key={log.id} style={[styles.auditRow, { borderBottomColor: theme.border }]}>
                  <Eye size={14} color="#2563EB" style={{ marginTop: 2, marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.auditMainText, { color: theme.text }]}>
                      <Text style={{ fontWeight: '700' }}>{log.doctor_name || 'Doctor'}</Text> reviewed{' '}
                      <Text style={{ fontWeight: '600' }}>{log.record_title || 'Document'}</Text>
                    </Text>
                    <Text style={[styles.auditDateText, { color: theme.textMuted }]}>
                      {log.accessed_at ? new Date(log.accessed_at).toLocaleString() : 'Recent'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <RoleGuard allowedRole="patient">
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenHeader
          title="Medical Vault"
          subtitle="Records, prescriptions, consults & consent"
          rightElement={
            <TouchableOpacity
              style={[
                styles.addRecordHeaderBtn,
                { backgroundColor: '#059669', marginRight: 0, paddingHorizontal: 12 },
              ]}
              onPress={() => {
                setSelectedPrescriptionForOrder(null);
                setOrderModalVisible(true);
              }}
              activeOpacity={0.85}
            >
              <ShoppingBag size={12} color="#FFFFFF" />
              <Text style={styles.addRecordHeaderBtnText}>Order Meds</Text>
            </TouchableOpacity>
          }
        />

        {/* 5-Tab Horizontal Segment Controls */}
        <View
          style={[
            styles.segmentWrapper,
            { backgroundColor: theme.background, borderBottomColor: theme.border },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.segmentScrollContent}
          >
            {/* Records Tab */}
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                {
                  backgroundColor:
                    activeTab === 'RECORDS'
                      ? isDark
                        ? '#FAFAFA'
                        : '#09090B'
                      : theme.card,
                  borderColor:
                    activeTab === 'RECORDS'
                      ? isDark
                        ? '#FAFAFA'
                        : '#09090B'
                      : theme.border,
                },
              ]}
              onPress={() => switchViewTab('RECORDS')}
            >
              <FileText
                size={14}
                color={
                  activeTab === 'RECORDS'
                    ? isDark
                      ? '#09090B'
                      : '#FFFFFF'
                    : theme.textMuted
                }
              />
              <Text
                style={[
                  styles.segmentText,
                  {
                    color:
                      activeTab === 'RECORDS'
                        ? isDark
                          ? '#09090B'
                          : '#FFFFFF'
                        : theme.textMuted,
                  },
                ]}
              >
                Records ({records.length})
              </Text>
            </TouchableOpacity>

            {/* Prescriptions Tab */}
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                {
                  backgroundColor:
                    activeTab === 'PRESCRIPTIONS'
                      ? isDark
                        ? '#FAFAFA'
                        : '#09090B'
                      : theme.card,
                  borderColor:
                    activeTab === 'PRESCRIPTIONS'
                      ? isDark
                        ? '#FAFAFA'
                        : '#09090B'
                      : theme.border,
                },
              ]}
              onPress={() => switchViewTab('PRESCRIPTIONS')}
            >
              <Pill
                size={14}
                color={
                  activeTab === 'PRESCRIPTIONS'
                    ? isDark
                      ? '#09090B'
                      : '#FFFFFF'
                    : theme.textMuted
                }
              />
              <Text
                style={[
                  styles.segmentText,
                  {
                    color:
                      activeTab === 'PRESCRIPTIONS'
                        ? isDark
                          ? '#09090B'
                          : '#FFFFFF'
                        : theme.textMuted,
                  },
                ]}
              >
                Prescriptions ({prescriptions.length})
              </Text>
            </TouchableOpacity>

            {/* Orders Tab */}
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                {
                  backgroundColor:
                    activeTab === 'ORDERS'
                      ? isDark
                        ? '#FAFAFA'
                        : '#09090B'
                      : theme.card,
                  borderColor:
                    activeTab === 'ORDERS'
                      ? isDark
                        ? '#FAFAFA'
                        : '#09090B'
                      : theme.border,
                },
              ]}
              onPress={() => switchViewTab('ORDERS')}
            >
              <ShoppingBag
                size={14}
                color={
                  activeTab === 'ORDERS'
                    ? isDark
                      ? '#09090B'
                      : '#FFFFFF'
                    : theme.textMuted
                }
              />
              <Text
                style={[
                  styles.segmentText,
                  {
                    color:
                      activeTab === 'ORDERS'
                        ? isDark
                          ? '#09090B'
                          : '#FFFFFF'
                        : theme.textMuted,
                  },
                ]}
              >
                Orders ({orders.length})
              </Text>
            </TouchableOpacity>

            {/* Consultations Tab */}
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                {
                  backgroundColor:
                    activeTab === 'CONSULTATIONS'
                      ? isDark
                        ? '#FAFAFA'
                        : '#09090B'
                      : theme.card,
                  borderColor:
                    activeTab === 'CONSULTATIONS'
                      ? isDark
                        ? '#FAFAFA'
                        : '#09090B'
                      : theme.border,
                },
              ]}
              onPress={() => switchViewTab('CONSULTATIONS')}
            >
              <Stethoscope
                size={14}
                color={
                  activeTab === 'CONSULTATIONS'
                    ? isDark
                      ? '#09090B'
                      : '#FFFFFF'
                    : theme.textMuted
                }
              />
              <Text
                style={[
                  styles.segmentText,
                  {
                    color:
                      activeTab === 'CONSULTATIONS'
                        ? isDark
                          ? '#09090B'
                          : '#FFFFFF'
                        : theme.textMuted,
                  },
                ]}
              >
                Consultations ({consultations.length})
              </Text>
            </TouchableOpacity>

            {/* Privacy & Doctor Access Tab */}
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                {
                  backgroundColor:
                    activeTab === 'PRIVACY'
                      ? isDark
                        ? '#FAFAFA'
                        : '#09090B'
                      : theme.card,
                  borderColor:
                    activeTab === 'PRIVACY'
                      ? isDark
                        ? '#FAFAFA'
                        : '#09090B'
                      : theme.border,
                },
              ]}
              onPress={() => switchViewTab('PRIVACY')}
            >
              <ShieldCheck
                size={14}
                color={
                  activeTab === 'PRIVACY'
                    ? isDark
                      ? '#09090B'
                      : '#FFFFFF'
                    : pendingRequests.length > 0
                    ? '#D97706'
                    : theme.textMuted
                }
              />
              <Text
                style={[
                  styles.segmentText,
                  {
                    color:
                      activeTab === 'PRIVACY'
                        ? isDark
                          ? '#09090B'
                          : '#FFFFFF'
                        : pendingRequests.length > 0
                        ? '#D97706'
                        : theme.textMuted,
                  },
                ]}
              >
                Doctor Access {pendingRequests.length > 0 ? `(${pendingRequests.length} new)` : ''}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Subheader for Records tab */}
        {activeTab === 'RECORDS' && (
          <View
            style={[
              styles.recordsActionBar,
              { backgroundColor: theme.background, borderBottomColor: theme.border },
            ]}
          >
            <View
              style={[
                styles.recordsCountBadge,
                {
                  backgroundColor: isDark ? 'rgba(56, 189, 248, 0.12)' : '#EFF6FF',
                  borderColor: isDark ? 'rgba(56, 189, 248, 0.25)' : '#BAE6FD',
                  borderWidth: 1,
                },
              ]}
            >
              <FileText size={13} color={isDark ? '#38BDF8' : '#2563EB'} />
              <Text style={[styles.recordsCountText, { color: isDark ? '#38BDF8' : '#1E40AF' }]}>
                {records.length} {records.length === 1 ? 'Record' : 'Records'} on Vault
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.uploadCtaBtn, { backgroundColor: theme.primaryButton }]}
              onPress={() => setUploadModalVisible(true)}
              activeOpacity={0.85}
              accessibilityLabel="Upload Document"
            >
              <Plus size={14} color={theme.primaryButtonText} />
              <Text style={[styles.uploadCtaText, { color: theme.primaryButtonText }]}>
                Add Document
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Subheader for Prescriptions tab */}
        {activeTab === 'PRESCRIPTIONS' && (
          <View
            style={[
              styles.recordsActionBar,
              { backgroundColor: theme.background, borderBottomColor: theme.border },
            ]}
          >
            <View
              style={[
                styles.recordsCountBadge,
                {
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5',
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#A7F3D0',
                  borderWidth: 1,
                },
              ]}
            >
              <Pill size={13} color="#10B981" />
              <Text style={[styles.recordsCountText, { color: isDark ? '#34D399' : '#047857' }]}>
                {prescriptions.length} {prescriptions.length === 1 ? 'Prescription' : 'Prescriptions'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.uploadCtaBtn, { backgroundColor: '#059669' }]}
              onPress={() => {
                setSelectedPrescriptionForOrder(null);
                setOrderModalVisible(true);
              }}
              activeOpacity={0.85}
            >
              <ShoppingBag size={14} color="#FFFFFF" />
              <Text style={[styles.uploadCtaText, { color: '#FFFFFF' }]}>
                Order Medicines
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Subheader for Consultations tab */}
        {activeTab === 'CONSULTATIONS' && (
          <View
            style={[
              styles.recordsActionBar,
              { backgroundColor: theme.background, borderBottomColor: theme.border },
            ]}
          >
            <View
              style={[
                styles.recordsCountBadge,
                {
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5',
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#A7F3D0',
                  borderWidth: 1,
                },
              ]}
            >
              <Stethoscope size={13} color="#10B981" />
              <Text style={[styles.recordsCountText, { color: isDark ? '#34D399' : '#047857' }]}>
                {consultations.length} {consultations.length === 1 ? 'Consultation' : 'Consultations'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.uploadCtaBtn, { backgroundColor: theme.primaryButton }]}
              onPress={() => router.push('/(tabs)/patient/appointments?tab=DISCOVERY')}
              activeOpacity={0.85}
            >
              <Calendar size={14} color={theme.primaryButtonText} />
              <Text style={[styles.uploadCtaText, { color: theme.primaryButtonText }]}>
                Book Doctor
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Subheader for Privacy tab */}
        {activeTab === 'PRIVACY' && (
          <View
            style={[
              styles.recordsActionBar,
              { backgroundColor: theme.background, borderBottomColor: theme.border },
            ]}
          >
            <View
              style={[
                styles.recordsCountBadge,
                {
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5',
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#A7F3D0',
                  borderWidth: 1,
                },
              ]}
            >
              <ShieldCheck size={13} color="#10B981" />
              <Text style={[styles.recordsCountText, { color: isDark ? '#34D399' : '#047857' }]}>
                {activeDoctorAccess.length} Doctor{activeDoctorAccess.length === 1 ? '' : 's'} Authorized
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.uploadCtaBtn, { backgroundColor: isDark ? '#27272A' : '#F1F5F9', borderWidth: 1, borderColor: theme.border }]}
              onPress={onRefresh}
              activeOpacity={0.85}
            >
              <RefreshCw size={13} color={theme.text} />
              <Text style={[styles.uploadCtaText, { color: theme.text }]}>Sync Permissions</Text>
            </TouchableOpacity>
          </View>
        )}

        {error && (
          <View
            style={[
              styles.errorBanner,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
              },
            ]}
          >
            <AlertCircle size={16} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Tab Content Rendering */}
        <Animated.View
          style={{
            flex: 1,
            opacity: tabFadeAnim,
            transform: [{ translateY: tabSlideAnim }],
          }}
        >
          {activeTab === 'PRIVACY' ? (
            <ScrollView
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[theme.accent]}
                  tintColor={theme.accent}
                />
              }
            >
              {renderPrivacyView()}
            </ScrollView>
          ) : (
            <FlatList
              data={
                activeTab === 'RECORDS'
                  ? (records as any[])
                  : activeTab === 'PRESCRIPTIONS'
                  ? (prescriptions as any[])
                  : activeTab === 'ORDERS'
                  ? (orders as any[])
                  : (consultations as any[])
              }
              keyExtractor={(item) => item.id}
              renderItem={
                activeTab === 'RECORDS'
                  ? (renderRecordItem as any)
                  : activeTab === 'PRESCRIPTIONS'
                  ? (renderPrescriptionItem as any)
                  : activeTab === 'ORDERS'
                  ? (renderOrderItem as any)
                  : (renderConsultationItem as any)
              }
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[theme.accent]}
                  tintColor={theme.accent}
                />
              }
              ListEmptyComponent={
                !loading ? (
                  <View style={styles.emptyContainer}>
                    <View
                      style={[
                        styles.emptyIconBox,
                        {
                          backgroundColor: isDark ? '#18181B' : '#F1F5F9',
                          borderColor: theme.border,
                          borderWidth: 1,
                        },
                      ]}
                    >
                      {activeTab === 'RECORDS' && (
                        <Shield size={36} color={isDark ? '#71717A' : '#94A3B8'} />
                      )}
                      {activeTab === 'PRESCRIPTIONS' && (
                        <Pill size={36} color={isDark ? '#71717A' : '#94A3B8'} />
                      )}
                      {activeTab === 'ORDERS' && (
                        <ShoppingBag size={36} color={isDark ? '#71717A' : '#94A3B8'} />
                      )}
                      {activeTab === 'CONSULTATIONS' && (
                        <Stethoscope size={36} color={isDark ? '#71717A' : '#94A3B8'} />
                      )}
                    </View>
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>
                      {activeTab === 'RECORDS'
                        ? 'No Medical Records Found'
                        : activeTab === 'PRESCRIPTIONS'
                        ? 'No Active Prescriptions'
                        : activeTab === 'ORDERS'
                        ? 'No Medicine Orders Found'
                        : 'No Consultation History Yet'}
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                      {activeTab === 'RECORDS'
                        ? 'Encrypted clinical records and diagnostic summaries will be listed here once uploaded.'
                        : activeTab === 'PRESCRIPTIONS'
                        ? 'Prescriptions issued by your consulting doctors will appear here for download.'
                        : activeTab === 'ORDERS'
                        ? 'Pharmacy orders placed from prescriptions will appear here with live tracking.'
                        : 'Doctor clinical observations, diagnosis and notes will automatically appear here once consultations complete.'}
                    </Text>

                    {activeTab === 'RECORDS' && (
                      <Button
                        title="Upload Your First Medical Record"
                        size="sm"
                        iconLeft={<Plus size={15} color={theme.primaryButtonText} />}
                        onPress={() => setUploadModalVisible(true)}
                        style={{ marginBottom: 12 }}
                      />
                    )}

                    {activeTab === 'CONSULTATIONS' && (
                      <Button
                        title="Book Doctor Appointment"
                        size="sm"
                        iconLeft={<Calendar size={15} color={theme.primaryButtonText} />}
                        onPress={() => router.push('/(tabs)/patient/appointments?tab=DISCOVERY')}
                        style={{ marginBottom: 12 }}
                      />
                    )}

                    <Button
                      title="Reload"
                      variant="outline"
                      size="sm"
                      iconLeft={<RefreshCw size={14} color={theme.text} />}
                      onPress={onRefresh}
                      style={styles.reloadBtn}
                    />
                  </View>
                ) : null
              }
            />
          )}
        </Animated.View>

        {/* Universal PIN Verification Modal (Supports both Open and Download actions) */}
        <PinVerificationModal
          visible={pinModalVisible}
          title={pinModalTitle}
          subtitle={pinModalSubtitle}
          onConfirm={handleConfirmPinDownload}
          onCancel={() => {
            setPinModalVisible(false);
            setSelectedEntityId(null);
            setSelectedCachedUri(null);
          }}
        />

        {/* Upload Medical Document Modal */}
        <UploadRecordModal
          visible={uploadModalVisible}
          onClose={() => setUploadModalVisible(false)}
          onSuccess={() => {
            loadData();
          }}
        />

        {/* Order Medicines & Prescriptions Modal */}
        <OrderMedicinesModal
          visible={orderModalVisible}
          pharmacyData={null}
          initialPrescriptionId={selectedPrescriptionForOrder?.id}
          onClose={() => {
            setOrderModalVisible(false);
            setSelectedPrescriptionForOrder(null);
          }}
          onOrderSuccess={() => {
            setOrderModalVisible(false);
            setSelectedPrescriptionForOrder(null);
            loadData();
            setActiveTab('ORDERS');
          }}
        />

        {/* Prescription QR Modal */}
        <PrescriptionQRModal
          visible={!!selectedPrescriptionForQr}
          prescription={selectedPrescriptionForQr}
          onClose={() => setSelectedPrescriptionForQr(null)}
        />

        {/* Delivery Tracking Modal */}
        <DeliveryTrackingModal
          visible={!!selectedOrderForTracking}
          order={selectedOrderForTracking}
          orderId={selectedOrderForTracking?.id}
          trackingNumber={selectedOrderForTracking?.tracking_number}
          orderStatus={selectedOrderForTracking?.status}
          deliveryAddress={selectedOrderForTracking?.delivery_address}
          onClose={() => setSelectedOrderForTracking(null)}
        />
      </View>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  segmentWrapper: {
    borderBottomWidth: 1,
  },
  segmentScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  segmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  segmentText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 145,
    gap: 12,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    gap: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    flex: 1,
  },
  cardItem: {
    borderRadius: 14,
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBoxBlue: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxAmber: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxIndigo: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxGreen: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleColumn: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  itemSubtitle: {
    fontSize: 12,
  },
  downloadedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.3)',
  },
  downloadedChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#059669',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  publicBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  privateBadge: {
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
  },
  pendingBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  publicText: {
    color: '#10B981',
  },
  privateText: {
    color: '#64748B',
  },
  pendingText: {
    color: '#D97706',
  },
  itemDesc: {
    fontSize: 13,
    marginTop: 10,
    lineHeight: 18,
  },
  medsBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  medsLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  medItem: {
    fontSize: 12,
    lineHeight: 18,
  },
  trackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  trackingText: {
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  reloadBtn: {
    paddingHorizontal: 20,
  },
  addRecordHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 18,
    marginRight: 8,
  },
  addRecordHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  recordsActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  recordsCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  recordsCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  uploadCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  uploadCtaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  consentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
  },
  consentBtnPublic: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  consentBtnPrivate: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  consentBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  consentTextPublic: {
    color: '#059669',
  },
  consentTextPrivate: {
    color: '#DC2626',
  },
  orderDeliveryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#059669',
  },
  orderDeliveryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  showQrBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
  },
  showQrBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  trackDeliveryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#2563EB',
  },
  trackDeliveryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  // Consultations styles
  consultationMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  consultationDateText: {
    fontSize: 12,
  },
  clinicalBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  clinicalLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  clinicalLineLabel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  clinicalLineValue: {
    fontSize: 12.5,
  },
  clinicalSection: {
    marginTop: 10,
  },
  clinicalSectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  clinicalBodyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  clinicalNotesItalic: {
    fontSize: 12.5,
    lineHeight: 18,
    fontStyle: 'italic',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  followUpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(37, 99, 235, 0.15)',
  },
  followUpText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Privacy styles
  privacyContainer: {
    gap: 20,
    paddingBottom: 20,
  },
  privacySection: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  emptySubBox: {
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  emptySubText: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
  },
  requestCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    marginTop: 6,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  docAvatarBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docAvatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
  },
  docNameText: {
    fontSize: 14,
    fontWeight: '700',
  },
  docSpecText: {
    fontSize: 12,
    marginTop: 1,
  },
  docHospitalText: {
    fontSize: 11.5,
    marginTop: 1,
  },
  pendingBadgeMini: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  pendingBadgeMiniText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#D97706',
  },
  requestReasonText: {
    fontSize: 12.5,
    fontStyle: 'italic',
  },
  requestActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#059669',
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  declineBtnText: {
    color: '#EF4444',
    fontSize: 12.5,
    fontWeight: '700',
  },
  activeDoctorCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 6,
  },
  activeDocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  docAvatarGreen: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docAvatarGreenText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
  },
  revokeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  revokeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  auditBox: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 6,
  },
  auditRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderBottomWidth: 1,
  },
  auditMainText: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  auditDateText: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'monospace',
  },
});
