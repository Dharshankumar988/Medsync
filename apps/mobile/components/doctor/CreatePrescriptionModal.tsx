import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Pill, Plus, Trash2, X, Shield, Lock, CheckCircle2, ChevronDown } from 'lucide-react-native';
import { Colors } from '../../constants/theme';
import { Button } from '../common/Button';
import {
  doctorService,
  DoctorPatient,
  MedicineCatalogItem,
  PharmacyItem,
  PrescriptionItemInput,
} from '../../services/doctor.service';

interface CreatePrescriptionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (prescription: any) => void;
  preselectedPatientId?: string;
  preselectedAppointmentId?: string;
}

export const CreatePrescriptionModal: React.FC<CreatePrescriptionModalProps> = ({
  visible,
  onClose,
  onSuccess,
  preselectedPatientId,
  preselectedAppointmentId,
}) => {
  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(preselectedPatientId || '');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PrescriptionItemInput[]>([
    { medicine_name: '', dosage: '500mg', frequency: '1-0-1', duration_days: 5, instructions: 'After meals' },
  ]);
  const [pharmacies, setPharmacies] = useState<PharmacyItem[]>([]);
  const [routedPharmacyId, setRoutedPharmacyId] = useState<string>('');

  // PIN Signing Modal state
  const [isPinPromptOpen, setIsPinPromptOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Medicine autocomplete
  const [catalog, setCatalog] = useState<MedicineCatalogItem[]>([]);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [medSearchQuery, setMedSearchQuery] = useState('');

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadInitialData();
      if (preselectedPatientId) {
        setSelectedPatientId(preselectedPatientId);
      }
    }
  }, [visible, preselectedPatientId]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [patientsData, catalogData, pharmsData] = await Promise.all([
        doctorService.getAuthorizedPatients(),
        doctorService.getMedicines(),
        doctorService.getPharmacies(),
      ]);
      setPatients(patientsData);
      setCatalog(catalogData);
      setPharmacies(pharmsData);
    } catch (err) {
      console.error('Failed to load prescription form dependencies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { medicine_name: '', dosage: '500mg', frequency: '1-0-1', duration_days: 5, instructions: 'After meals' },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      Alert.alert('Required', 'A prescription must contain at least one medicine.');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof PrescriptionItemInput, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleValidateForm = () => {
    if (!selectedPatientId) {
      Alert.alert('Validation Error', 'Please select a patient.');
      return;
    }
    if (!diagnosis.trim()) {
      Alert.alert('Validation Error', 'Please enter a clinical diagnosis.');
      return;
    }
    const invalidItems = items.filter((it) => !it.medicine_name.trim() || !it.dosage.trim());
    if (invalidItems.length > 0) {
      Alert.alert('Validation Error', 'All medication items must include a name and dosage.');
      return;
    }

    // Open PIN prompt to sign
    setPin('');
    setPinError('');
    setIsPinPromptOpen(true);
  };

  const handleConfirmSignAndSubmit = async () => {
    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      setPinError('Doctor Authorization PIN must be exactly 6 digits.');
      return;
    }

    setSubmitting(true);
    setPinError('');

    try {
      const rx = await doctorService.createPrescription({
        appointment_id: preselectedAppointmentId || undefined,
        patient_id: selectedPatientId,
        diagnosis: diagnosis.trim(),
        notes: notes.trim() || undefined,
        items,
        pin,
        routed_pharmacy_id: routedPharmacyId || undefined,
      });

      setIsPinPromptOpen(false);
      onSuccess(rx);
      onClose();
      Alert.alert(
        'Prescription Finalized',
        `Prescription successfully signed and sealed.\nVerification Token: ${rx.qr_token || 'MS-RX-GENERATED'}`
      );
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to issue prescription.';
      setPinError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCatalog = medSearchQuery.trim()
    ? catalog.filter((m) => m.name.toLowerCase().includes(medSearchQuery.toLowerCase()))
    : [];

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>New Digital Prescription</Text>
            <Text style={styles.subtitle}>Cryptographically signed & verified</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={22} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={Colors.roles.doctor.primary} />
            <Text style={styles.loadingText}>Loading clinical roster & medicine catalog...</Text>
          </View>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {/* Patient Selector */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Select Patient *</Text>
              {preselectedPatientId ? (
                <View style={styles.readOnlyBox}>
                  <Text style={styles.readOnlyText}>
                    {patients.find((p) => p.user_id === preselectedPatientId)?.full_name || 'Selected Patient'}
                  </Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.patientChipScroll}>
                  {patients.map((p) => {
                    const isSelected = p.user_id === selectedPatientId;
                    return (
                      <TouchableOpacity
                        key={p.user_id}
                        style={[styles.patientChip, isSelected && styles.patientChipActive]}
                        onPress={() => setSelectedPatientId(p.user_id)}
                      >
                        <Text style={[styles.patientChipText, isSelected && styles.patientChipTextActive]}>
                          {p.full_name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* Diagnosis */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Clinical Diagnosis *</Text>
              <TextInput
                style={styles.textInput}
                value={diagnosis}
                onChangeText={setDiagnosis}
                placeholder="e.g. Acute Pharyngitis, Type 2 Diabetes"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Clinical Instructions / Notes */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Doctor's Clinical Notes (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. Advised rest, review if fever persists past 3 days."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Routed Pharmacy (Optional) */}
            {pharmacies.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Route to Verified Pharmacy (Optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.patientChipScroll}>
                  <TouchableOpacity
                    style={[styles.patientChip, !routedPharmacyId && styles.patientChipActive]}
                    onPress={() => setRoutedPharmacyId('')}
                  >
                    <Text style={[styles.patientChipText, !routedPharmacyId && styles.patientChipTextActive]}>
                      Patient Choice (No Routing)
                    </Text>
                  </TouchableOpacity>
                  {pharmacies.map((pharm) => {
                    const isSelected = pharm.user_id === routedPharmacyId;
                    return (
                      <TouchableOpacity
                        key={pharm.user_id}
                        style={[styles.patientChip, isSelected && styles.patientChipActive]}
                        onPress={() => setRoutedPharmacyId(pharm.user_id)}
                      >
                        <Text style={[styles.patientChipText, isSelected && styles.patientChipTextActive]}>
                          {pharm.full_name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Medication Items */}
            <View style={styles.section}>
              <View style={styles.itemHeaderRow}>
                <Text style={styles.sectionLabel}>Medications ({items.length}) *</Text>
                <TouchableOpacity style={styles.addItemBtn} onPress={handleAddItem}>
                  <Plus size={16} color={Colors.roles.doctor.primary} />
                  <Text style={styles.addItemBtnText}>Add Item</Text>
                </TouchableOpacity>
              </View>

              {items.map((item, idx) => (
                <View key={idx} style={styles.itemCard}>
                  <View style={styles.itemCardHeader}>
                    <Text style={styles.itemNumber}>Medication #{idx + 1}</Text>
                    {items.length > 1 && (
                      <TouchableOpacity onPress={() => handleRemoveItem(idx)}>
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Medicine Name */}
                  <Text style={styles.fieldLabel}>Medicine Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={item.medicine_name}
                    onChangeText={(val) => {
                      handleItemChange(idx, 'medicine_name', val);
                      setMedSearchQuery(val);
                      setActiveItemIndex(idx);
                    }}
                    placeholder="e.g. Amoxicillin, Paracetamol"
                    placeholderTextColor="#94A3B8"
                  />

                  {/* Catalog Autocomplete Suggestions */}
                  {activeItemIndex === idx && filteredCatalog.length > 0 && (
                    <View style={styles.catalogDropdown}>
                      {filteredCatalog.slice(0, 4).map((cat) => (
                        <TouchableOpacity
                          key={cat.id}
                          style={styles.catalogItem}
                          onPress={() => {
                            handleItemChange(idx, 'medicine_name', cat.name);
                            if (cat.strength) {
                              handleItemChange(idx, 'dosage', cat.strength);
                            }
                            setActiveItemIndex(null);
                            setMedSearchQuery('');
                          }}
                        >
                          <Pill size={14} color={Colors.roles.doctor.primary} style={{ marginRight: 6 }} />
                          <Text style={styles.catalogText}>{cat.name}</Text>
                          {cat.strength ? <Text style={styles.catalogSub}>({cat.strength})</Text> : null}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <View style={styles.row}>
                    <View style={[styles.col, { marginRight: 8 }]}>
                      <Text style={styles.fieldLabel}>Dosage</Text>
                      <TextInput
                        style={styles.textInput}
                        value={item.dosage}
                        onChangeText={(val) => handleItemChange(idx, 'dosage', val)}
                        placeholder="e.g. 500mg"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                    <View style={styles.col}>
                      <Text style={styles.fieldLabel}>Frequency</Text>
                      <TextInput
                        style={styles.textInput}
                        value={item.frequency}
                        onChangeText={(val) => handleItemChange(idx, 'frequency', val)}
                        placeholder="e.g. 1-0-1"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.col, { marginRight: 8 }]}>
                      <Text style={styles.fieldLabel}>Duration (Days)</Text>
                      <TextInput
                        style={styles.textInput}
                        value={String(item.duration_days)}
                        onChangeText={(val) =>
                          handleItemChange(idx, 'duration_days', parseInt(val.replace(/[^0-9]/g, ''), 10) || 1)
                        }
                        keyboardType="numeric"
                        placeholder="5"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                    <View style={styles.col}>
                      <Text style={styles.fieldLabel}>Instructions</Text>
                      <TextInput
                        style={styles.textInput}
                        value={item.instructions || ''}
                        onChangeText={(val) => handleItemChange(idx, 'instructions', val)}
                        placeholder="e.g. After meals"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Submit Button */}
            <Button
              title="Sign & Finalize Prescription"
              onPress={handleValidateForm}
              style={styles.submitBtn}
            />
          </ScrollView>
        )}

        {/* PIN Authorization Modal */}
        <Modal visible={isPinPromptOpen} transparent animationType="fade" onRequestClose={() => setIsPinPromptOpen(false)}>
          <View style={styles.pinModalOverlay}>
            <View style={styles.pinModalBox}>
              <TouchableOpacity style={styles.pinCloseBtn} onPress={() => setIsPinPromptOpen(false)}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>

              <View style={styles.pinIconCircle}>
                <Lock size={22} color={Colors.roles.doctor.primary} />
              </View>

              <Text style={styles.pinModalTitle}>Doctor PIN Verification</Text>
              <Text style={styles.pinModalSub}>
                Enter your 6-digit Doctor Authorization PIN to sign this digital prescription.
              </Text>

              <TextInput
                style={[styles.pinInput, pinError ? styles.pinInputError : null]}
                value={pin}
                onChangeText={(t) => {
                  setPin(t.replace(/[^0-9]/g, '').slice(0, 6));
                  if (pinError) setPinError('');
                }}
                keyboardType="numeric"
                maxLength={6}
                secureTextEntry
                placeholder="••••••"
                placeholderTextColor="#94A3B8"
                autoFocus
              />

              {pinError ? <Text style={styles.pinErrorText}>{pinError}</Text> : null}

              <View style={styles.pinModalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setIsPinPromptOpen(false)}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title="Authorize"
                  loading={submitting}
                  disabled={pin.length !== 6}
                  onPress={handleConfirmSignAndSubmit}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  readOnlyBox: {
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  readOnlyText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
  },
  patientChipScroll: {
    flexDirection: 'row',
    marginTop: 4,
  },
  patientChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  patientChipActive: {
    backgroundColor: Colors.roles.doctor.primary,
    borderColor: Colors.roles.doctor.primary,
  },
  patientChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
  },
  patientChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  addItemBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.roles.doctor.primary,
    marginLeft: 4,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  fieldLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  col: {
    flex: 1,
  },
  catalogDropdown: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    marginTop: 4,
    overflow: 'hidden',
  },
  catalogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  catalogText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
  },
  catalogSub: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  submitBtn: {
    marginTop: 10,
  },
  pinModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pinModalBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  pinCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 6,
  },
  pinIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  pinModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  pinModalSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 18,
  },
  pinInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 12,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    color: '#0F172A',
    marginBottom: 8,
  },
  pinInputError: {
    borderColor: '#EF4444',
  },
  pinErrorText: {
    fontSize: 12,
    color: '#EF4444',
    marginBottom: 12,
  },
  pinModalActions: {
    flexDirection: 'row',
    marginTop: 12,
    width: '100%',
  },
});
