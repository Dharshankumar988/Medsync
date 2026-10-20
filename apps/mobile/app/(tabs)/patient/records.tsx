import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
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
  FileUp,
} from 'lucide-react-native';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { PinVerificationModal } from '../../../components/patient/PinVerificationModal';
import { UploadRecordModal } from '../../../components/patient/UploadRecordModal';
import { OrderMedicinesModal } from '../../../components/patient/OrderMedicinesModal';
import {
  patientService,
  MedicalRecordItem,
  PrescriptionItem,
  MedicineOrderItem,
} from '../../../services/patient.service';
import { Colors } from '../../../constants/theme';
import { formatErrorMessage } from '../../../lib/api';

type ViewTab = 'RECORDS' | 'PRESCRIPTIONS' | 'ORDERS';

export default function PatientRecordsScreen() {
  const [activeTab, setActiveTab] = useState<ViewTab>('RECORDS');
  const [records, setRecords] = useState<MedicalRecordItem[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [orders, setOrders] = useState<MedicineOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PIN modal state for record or prescription download
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedEntityType, setSelectedEntityType] = useState<'RECORD' | 'PRESCRIPTION'>('RECORD');
  const [pinModalVisible, setPinModalVisible] = useState(false);

  // Upload Record modal state
  const [uploadModalVisible, setUploadModalVisible] = useState(false);

  // Order Medicines modal state (triggered from Prescriptions or Pharmacy)
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [selectedPrescriptionForOrder, setSelectedPrescriptionForOrder] = useState<PrescriptionItem | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      if (activeTab === 'RECORDS') {
        const data = await patientService.getMedicalRecords();
        setRecords(data);
      } else if (activeTab === 'PRESCRIPTIONS') {
        const data = await patientService.getPrescriptions();
        setPrescriptions(data);
      } else if (activeTab === 'ORDERS') {
        const data = await patientService.getMedicineOrders();
        setOrders(data);
      }
    } catch (err: any) {
      console.warn('Failed to load records tab data:', err);
      setError(err.message || 'Could not retrieve data from server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleDownloadRecordPress = (recordId: string) => {
    setSelectedEntityId(recordId);
    setSelectedEntityType('RECORD');
    setPinModalVisible(true);
  };

  const handleDownloadPrescriptionPress = (prescriptionId: string) => {
    setSelectedEntityId(prescriptionId);
    setSelectedEntityType('PRESCRIPTION');
    setPinModalVisible(true);
  };

  const handleConfirmPinDownload = async (pin: string) => {
    if (!selectedEntityId) return;

    if (selectedEntityType === 'RECORD') {
      try {
        const data = await patientService.downloadRecordWithPin(selectedEntityId, pin);
        setPinModalVisible(false);
        setSelectedEntityId(null);

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
        Alert.alert('Download Failed', formatErrorMessage(err));
      }
    } else {
      try {
        const data = await patientService.authorizePrescriptionDownload(selectedEntityId, pin);
        setPinModalVisible(false);
        setSelectedEntityId(null);

        const downloadUrl = data?.download_url || data?.url || data?.signed_url || data?.pdf_url;
        if (downloadUrl) {
          const supported = await Linking.canOpenURL(downloadUrl).catch(() => false);
          if (supported) {
            await Linking.openURL(downloadUrl);
          } else {
            Alert.alert('Download Ready', `Prescription PDF link: ${downloadUrl}`);
          }
        } else {
          Alert.alert(
            'Prescription Authorized',
            `Authorization PIN confirmed. Access reference: ${data?.authorization_reference || 'CONFIRMED'}`
          );
        }
      } catch (err: any) {
        Alert.alert('Authorization Failed', formatErrorMessage(err));
      }
    }
  };

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

  const renderRecordItem = ({ item }: { item: MedicalRecordItem }) => {
    const isPublic = item.description?.includes('[PUBLIC]') ?? false;
    const cleanDescription = (item.description || '').replace('[PUBLIC]', '').trim();
    const formattedDate = item.created_at ? new Date(item.created_at).toLocaleDateString() : '—';

    return (
      <Card style={styles.cardItem}>
        <CardContent>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconBoxBlue}>
              <FileText size={20} color={Colors.roles.patient.primary} />
            </View>
            <View style={styles.titleColumn}>
              <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.itemSubtitle}>Uploaded: {formattedDate}</Text>
            </View>
            <View style={[styles.badge, isPublic ? styles.publicBadge : styles.privateBadge]}>
              {isPublic ? <Globe size={12} color="#10B981" /> : <Lock size={12} color="#64748B" />}
              <Text style={[styles.badgeText, isPublic ? styles.publicText : styles.privateText]}>
                {isPublic ? 'Public' : 'Private'}
              </Text>
            </View>
          </View>

          {cleanDescription ? (
            <Text style={styles.itemDesc}>{cleanDescription}</Text>
          ) : null}

          <View style={styles.actionsRow}>
            <Button
              title="Download"
              size="sm"
              iconLeft={<Download size={14} color="#FFFFFF" />}
              onPress={() => handleDownloadRecordPress(item.id)}
              style={styles.actionBtn}
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

  const renderPrescriptionItem = ({ item }: { item: PrescriptionItem }) => {
    const formattedDate = item.created_at ? new Date(item.created_at).toLocaleDateString() : '—';
    return (
      <Card style={styles.cardItem}>
        <CardContent>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconBoxAmber}>
              <Pill size={20} color="#D97706" />
            </View>
            <View style={styles.titleColumn}>
              <Text style={styles.itemTitle} numberOfLines={1}>{item.diagnosis || 'Clinical Prescription'}</Text>
              <Text style={styles.itemSubtitle}>Issued: {formattedDate}</Text>
            </View>
            <View style={[styles.badge, item.is_dispensed ? styles.publicBadge : styles.pendingBadge]}>
              <Text style={[styles.badgeText, item.is_dispensed ? styles.publicText : styles.pendingText]}>
                {item.is_dispensed ? 'Dispensed' : 'Active'}
              </Text>
            </View>
          </View>

          {Array.isArray(item.medications) && item.medications.length > 0 && (
            <View style={styles.medsBox}>
              <Text style={styles.medsLabel}>Medications:</Text>
              {item.medications.map((m: any, idx: number) => (
                <Text key={idx} style={styles.medItem}>
                  • {m.name || m.medicine_name || 'Medication'} {m.dosage ? `(${m.dosage})` : ''} — {m.frequency || m.instructions || ''}
                </Text>
              ))}
            </View>
          )}

          {item.notes ? (
            <Text style={styles.itemDesc}>{item.notes}</Text>
          ) : null}

          <View style={styles.actionsRow}>
            <Button
              title="Download PDF"
              size="sm"
              iconLeft={<Download size={14} color="#FFFFFF" />}
              onPress={() => handleDownloadPrescriptionPress(item.id)}
              style={styles.actionBtn}
            />
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
                <Text style={styles.orderDeliveryBtnText}>Order Delivery</Text>
              </TouchableOpacity>
            )}
          </View>
        </CardContent>
      </Card>
    );
  };

  const renderOrderItem = ({ item }: { item: MedicineOrderItem }) => {
    const formattedDate = item.created_at ? new Date(item.created_at).toLocaleDateString() : '—';
    return (
      <Card style={styles.cardItem}>
        <CardContent>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconBoxIndigo}>
              <Package size={20} color="#6366F1" />
            </View>
            <View style={styles.titleColumn}>
              <Text style={styles.itemTitle}>Order #{item.id.slice(0, 8)}</Text>
              <Text style={styles.itemSubtitle}>Ordered: {formattedDate}</Text>
            </View>
            <View style={[styles.badge, styles.pendingBadge]}>
              <Text style={[styles.badgeText, styles.pendingText]}>{item.status}</Text>
            </View>
          </View>

          {item.delivery_address && (
            <Text style={styles.itemDesc}>
              Delivery to: {item.delivery_address}
            </Text>
          )}

          {item.tracking_number && (
            <View style={styles.trackingRow}>
              <Truck size={14} color="#64748B" />
              <Text style={styles.trackingText}>Tracking: {item.tracking_number}</Text>
            </View>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <RoleGuard allowedRole="patient">
      <View style={styles.container}>
        <ScreenHeader
          title="Medical Records & Pharmacy"
          subtitle="Encrypted diagnostic files & prescriptions"
          rightElement={
            activeTab === 'RECORDS' ? (
              <TouchableOpacity
                style={styles.addRecordHeaderBtn}
                onPress={() => setUploadModalVisible(true)}
                activeOpacity={0.85}
                accessibilityLabel="Add Medical Document"
              >
                <Plus size={15} color="#FFFFFF" />
                <Text style={styles.addRecordHeaderBtnText}>Add</Text>
              </TouchableOpacity>
            ) : undefined
          }
        />

        {/* Tab Segment Controls */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'RECORDS' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('RECORDS')}
          >
            <FileText size={14} color={activeTab === 'RECORDS' ? Colors.roles.patient.primary : '#64748B'} />
            <Text style={[styles.segmentText, activeTab === 'RECORDS' && styles.segmentTextActive]}>
              Records
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'PRESCRIPTIONS' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('PRESCRIPTIONS')}
          >
            <Pill size={14} color={activeTab === 'PRESCRIPTIONS' ? Colors.roles.patient.primary : '#64748B'} />
            <Text style={[styles.segmentText, activeTab === 'PRESCRIPTIONS' && styles.segmentTextActive]}>
              Prescriptions
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'ORDERS' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('ORDERS')}
          >
            <ShoppingBag size={14} color={activeTab === 'ORDERS' ? Colors.roles.patient.primary : '#64748B'} />
            <Text style={[styles.segmentText, activeTab === 'ORDERS' && styles.segmentTextActive]}>
              Orders
            </Text>
          </TouchableOpacity>
        </View>

        {/* Document Action Subheader for Records tab */}
        {activeTab === 'RECORDS' && (
          <View style={styles.recordsActionBar}>
            <View style={styles.recordsCountBadge}>
              <FileText size={13} color="#2563EB" />
              <Text style={styles.recordsCountText}>
                {records.length} {records.length === 1 ? 'Record' : 'Records'} on Vault
              </Text>
            </View>
            <TouchableOpacity
              style={styles.uploadCtaBtn}
              onPress={() => setUploadModalVisible(true)}
              activeOpacity={0.85}
              accessibilityLabel="Upload Document"
            >
              <Plus size={14} color="#FFFFFF" />
              <Text style={styles.uploadCtaText}>Add Document</Text>
            </TouchableOpacity>
          </View>
        )}

        {error && (
          <View style={styles.errorBanner}>
            <AlertCircle size={16} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Data List based on activeTab */}
        <FlatList
          data={
            activeTab === 'RECORDS'
              ? (records as any[])
              : activeTab === 'PRESCRIPTIONS'
              ? (prescriptions as any[])
              : (orders as any[])
          }
          keyExtractor={(item) => item.id}
          renderItem={
            activeTab === 'RECORDS'
              ? (renderRecordItem as any)
              : activeTab === 'PRESCRIPTIONS'
              ? (renderPrescriptionItem as any)
              : (renderOrderItem as any)
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.roles.patient.primary]}
            />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBox}>
                  {activeTab === 'RECORDS' && <Shield size={36} color="#94A3B8" />}
                  {activeTab === 'PRESCRIPTIONS' && <Pill size={36} color="#94A3B8" />}
                  {activeTab === 'ORDERS' && <ShoppingBag size={36} color="#94A3B8" />}
                </View>
                <Text style={styles.emptyTitle}>
                  {activeTab === 'RECORDS'
                    ? 'No Medical Records Found'
                    : activeTab === 'PRESCRIPTIONS'
                    ? 'No Active Prescriptions'
                    : 'No Medicine Orders Found'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {activeTab === 'RECORDS'
                    ? 'Encrypted clinical records and diagnostic summaries will be listed here once uploaded.'
                    : activeTab === 'PRESCRIPTIONS'
                    ? 'Prescriptions issued by your consulting doctors will appear here for download.'
                    : 'Pharmacy orders placed from prescriptions will appear here with live tracking.'}
                </Text>

                {activeTab === 'RECORDS' && (
                  <Button
                    title="Upload Your First Medical Record"
                    size="sm"
                    iconLeft={<Plus size={15} color="#FFFFFF" />}
                    onPress={() => setUploadModalVisible(true)}
                    style={{ marginBottom: 12 }}
                  />
                )}

                <Button
                  title="Reload"
                  variant="outline"
                  size="sm"
                  iconLeft={<RefreshCw size={14} color={Colors.roles.patient.primary} />}
                  onPress={onRefresh}
                  style={styles.reloadBtn}
                />
              </View>
            ) : null
          }
        />

        {/* Universal PIN Authorization Modal for Downloads */}
        <PinVerificationModal
          visible={pinModalVisible}
          title={selectedEntityType === 'RECORD' ? 'Decrypt Medical Record' : 'Authorize Prescription'}
          subtitle="Enter your 6-digit Authorization PIN to decrypt and generate an authorized download link."
          onConfirm={handleConfirmPinDownload}
          onCancel={() => {
            setPinModalVisible(false);
            setSelectedEntityId(null);
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

        {/* Order Medicines & Prescriptions Modal with Payment Spoof */}
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
      </View>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  segmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  segmentBtnActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 120,
    gap: 12,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBoxBlue: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxAmber: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxIndigo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleColumn: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
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
    color: '#475569',
    marginTop: 10,
    lineHeight: 18,
  },
  medsBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  medsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  medItem: {
    fontSize: 12,
    color: '#475569',
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
    color: '#64748B',
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
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
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
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  recordsCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  recordsCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
  },
  uploadCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadCtaText: {
    color: '#FFFFFF',
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
});
