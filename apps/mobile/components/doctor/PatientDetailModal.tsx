import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import {
  X,
  FileText,
  Pill,
  User,
  Phone,
  Droplet,
  Calendar,
  ShieldCheck,
  MessageSquare,
  Plus,
  Clock,
  ChevronRight,
} from 'lucide-react-native';
import { Colors } from '../../constants/theme';
import { Button } from '../common/Button';
import { Card, CardContent } from '../common/Card';
import {
  doctorService,
  DoctorPatient,
  DoctorAccessibleRecord,
} from '../../services/doctor.service';
import { supabase } from '../../lib/supabase';
import { CreatePrescriptionModal } from './CreatePrescriptionModal';

interface PatientDetailModalProps {
  visible: boolean;
  patient: DoctorPatient | null;
  onClose: () => void;
}

export const PatientDetailModal: React.FC<PatientDetailModalProps> = ({
  visible,
  patient,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'records' | 'prescriptions'>('records');
  const [records, setRecords] = useState<DoctorAccessibleRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New Clinical Note State
  const [noteRecordId, setNoteRecordId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Prescription creation modal
  const [isWriteRxOpen, setIsWriteRxOpen] = useState(false);

  const fetchPatientData = useCallback(async () => {
    if (!patient) return;
    setLoading(true);
    try {
      const [recsData, rxRes] = await Promise.all([
        doctorService.getAccessibleRecords(patient.user_id),
        supabase
          .from('prescriptions')
          .select('*, prescription_items(*)')
          .eq('patient_id', patient.user_id)
          .order('created_at', { ascending: false }),
      ]);
      setRecords(recsData);
      setPrescriptions(rxRes.data || []);
    } catch (err) {
      console.error('Failed to load patient records or prescriptions:', err);
    } finally {
      setLoading(false);
    }
  }, [patient]);

  useEffect(() => {
    if (visible && patient) {
      fetchPatientData();
    }
  }, [visible, patient, fetchPatientData]);

  const handleAddNote = async (recordId: string) => {
    if (!noteText.trim()) {
      Alert.alert('Required', 'Please enter clinical note text.');
      return;
    }

    setSubmittingNote(true);
    try {
      const newNote = await doctorService.addClinicalNote(recordId, noteText);
      setRecords((prev) =>
        prev.map((rec) => {
          if (rec.id === recordId) {
            return {
              ...rec,
              doctor_notes: [newNote, ...(rec.doctor_notes || [])],
            };
          }
          return rec;
        })
      );
      setNoteRecordId(null);
      setNoteText('');
      Alert.alert('Saved', 'Clinical note successfully added to this medical record.');
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to add clinical note.';
      Alert.alert('Error', msg);
    } finally {
      setSubmittingNote(false);
    }
  };

  if (!patient) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.patientName}>{patient.full_name}</Text>
            <Text style={styles.patientSub}>
              {patient.gender || 'Unknown gender'} • {patient.blood_group || 'Blood group not specified'}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={22} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {/* Patient Demographics Card */}
        <View style={styles.demographicsCard}>
          <View style={styles.demoRow}>
            <View style={styles.demoItem}>
              <Text style={styles.demoLabel}>Phone</Text>
              <Text style={styles.demoValue}>{patient.phone_number || patient.contact_number || 'None'}</Text>
            </View>
            <View style={styles.demoItem}>
              <Text style={styles.demoLabel}>DOB</Text>
              <Text style={styles.demoValue}>{patient.date_of_birth || 'Not recorded'}</Text>
            </View>
            <View style={styles.demoItem}>
              <Text style={styles.demoLabel}>Blood Group</Text>
              <Text style={styles.demoValue}>{patient.blood_group || 'N/A'}</Text>
            </View>
          </View>
          {patient.allergies ? (
            <View style={styles.allergyBanner}>
              <Text style={styles.allergyTitle}>Allergies: </Text>
              <Text style={styles.allergyText}>{patient.allergies}</Text>
            </View>
          ) : null}
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'records' && styles.tabActive]}
            onPress={() => setActiveTab('records')}
          >
            <FileText size={16} color={activeTab === 'records' ? Colors.roles.doctor.primary : '#64748B'} />
            <Text style={[styles.tabText, activeTab === 'records' && styles.tabTextActive]}>
              Clinical Records ({records.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'prescriptions' && styles.tabActive]}
            onPress={() => setActiveTab('prescriptions')}
          >
            <Pill size={16} color={activeTab === 'prescriptions' ? Colors.roles.doctor.primary : '#64748B'} />
            <Text style={[styles.tabText, activeTab === 'prescriptions' && styles.tabTextActive]}>
              Prescriptions ({prescriptions.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={Colors.roles.doctor.primary} />
            <Text style={styles.loadingText}>Retrieving authorized patient data...</Text>
          </View>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {activeTab === 'records' ? (
              records.length === 0 ? (
                <View style={styles.emptyBox}>
                  <FileText size={48} color="#CBD5E1" />
                  <Text style={styles.emptyTitle}>No Clinical Records Found</Text>
                  <Text style={styles.emptySub}>
                    This patient has not shared any medical records or none have been uploaded yet.
                  </Text>
                </View>
              ) : (
                records.map((rec) => (
                  <View key={rec.id} style={styles.recordCard}>
                    <View style={styles.recordHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.recordTitle}>{rec.title}</Text>
                        <Text style={styles.recordDate}>
                          Uploaded: {new Date(rec.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={[styles.consentBadge, rec.is_public ? styles.badgePublic : styles.badgeShared]}>
                        <ShieldCheck size={12} color={rec.is_public ? '#059669' : '#0284C7'} />
                        <Text style={[styles.consentText, { color: rec.is_public ? '#059669' : '#0284C7' }]}>
                          {rec.is_public ? 'Public Consent' : 'Direct Shared'}
                        </Text>
                      </View>
                    </View>

                    {rec.description ? (
                      <Text style={styles.recordDesc}>{rec.description}</Text>
                    ) : null}

                    {/* Doctor Clinical Notes */}
                    <View style={styles.notesSection}>
                      <Text style={styles.notesTitle}>Doctor Clinical Notes</Text>
                      {(rec.doctor_notes || []).length === 0 ? (
                        <Text style={styles.noNotesText}>No clinical notes entered yet.</Text>
                      ) : (
                        rec.doctor_notes.map((note) => (
                          <View key={note.id} style={styles.noteItem}>
                            <Text style={styles.noteDate}>
                              {new Date(note.created_at).toLocaleString([], {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </Text>
                            <Text style={styles.noteContent}>{note.note_text}</Text>
                          </View>
                        ))
                      )}

                      {/* Add Note Trigger / Form */}
                      {noteRecordId === rec.id ? (
                        <View style={styles.addNoteForm}>
                          <TextInput
                            style={styles.noteInput}
                            value={noteText}
                            onChangeText={setNoteText}
                            placeholder="Type observation, clinical impression or referral note..."
                            placeholderTextColor="#94A3B8"
                            multiline
                            numberOfLines={3}
                          />
                          <View style={styles.noteActionRow}>
                            <Button
                              title="Cancel"
                              variant="outline"
                              size="sm"
                              onPress={() => {
                                setNoteRecordId(null);
                                setNoteText('');
                              }}
                              style={{ marginRight: 8 }}
                            />
                            <Button
                              title="Save Note"
                              size="sm"
                              loading={submittingNote}
                              onPress={() => handleAddNote(rec.id)}
                            />
                          </View>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.addNoteBtn}
                          onPress={() => {
                            setNoteRecordId(rec.id);
                            setNoteText('');
                          }}
                        >
                          <Plus size={14} color={Colors.roles.doctor.primary} />
                          <Text style={styles.addNoteBtnText}>Add Clinical Note</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))
              )
            ) : (
              <View>
                <Button
                  title="Issue New Prescription"
                  onPress={() => setIsWriteRxOpen(true)}
                  style={{ marginBottom: 16 }}
                />

                {prescriptions.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Pill size={48} color="#CBD5E1" />
                    <Text style={styles.emptyTitle}>No Prescriptions Issued</Text>
                    <Text style={styles.emptySub}>
                      No digital prescriptions have been issued to this patient by your clinic yet.
                    </Text>
                  </View>
                ) : (
                  prescriptions.map((rx) => (
                    <View key={rx.id} style={styles.rxCard}>
                      <View style={styles.rxHeader}>
                        <View>
                          <Text style={styles.rxDiagnosis}>{rx.diagnosis || 'Prescription'}</Text>
                          <Text style={styles.rxDate}>
                            Date: {new Date(rx.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                        <View style={[styles.rxBadge, rx.is_dispensed ? styles.badgeDispensed : styles.badgeActive]}>
                          <Text style={[styles.rxBadgeText, { color: rx.is_dispensed ? '#059669' : '#D97706' }]}>
                            {rx.is_dispensed ? 'Dispensed' : 'Active'}
                          </Text>
                        </View>
                      </View>

                      {rx.notes ? <Text style={styles.rxNotes}>Notes: {rx.notes}</Text> : null}

                      {/* Items */}
                      <View style={styles.rxItemsList}>
                        {(rx.prescription_items || []).map((it: any) => (
                          <View key={it.id} style={styles.rxItemRow}>
                            <Text style={styles.rxItemName}>• {it.medicine_name}</Text>
                            <Text style={styles.rxItemDosage}>
                              {it.dosage} • {it.frequency} ({it.duration_days} days)
                            </Text>
                          </View>
                        ))}
                      </View>

                      {rx.qr_token ? (
                        <Text style={styles.rxToken}>Verification Token: {rx.qr_token}</Text>
                      ) : null}
                    </View>
                  ))
                )}
              </View>
            )}
          </ScrollView>
        )}

        {/* Prescription Creation Modal */}
        <CreatePrescriptionModal
          visible={isWriteRxOpen}
          onClose={() => setIsWriteRxOpen(false)}
          preselectedPatientId={patient.user_id}
          onSuccess={() => {
            fetchPatientData();
          }}
        />
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
  headerInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  patientSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  demographicsCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  demoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  demoItem: {
    flex: 1,
  },
  demoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  demoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
    marginTop: 2,
  },
  allergyBanner: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  allergyTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  allergyText: {
    fontSize: 12,
    color: '#B91C1C',
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#F0F9FF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginLeft: 6,
  },
  tabTextActive: {
    color: Colors.roles.doctor.primary,
    fontWeight: '600',
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
    padding: 16,
    paddingBottom: 40,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  recordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  recordDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  consentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgePublic: {
    backgroundColor: '#ECFDF5',
  },
  badgeShared: {
    backgroundColor: '#F0F9FF',
  },
  consentText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  recordDesc: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 12,
    lineHeight: 18,
  },
  notesSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  noNotesText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  noteItem: {
    borderLeftWidth: 2,
    borderLeftColor: Colors.roles.doctor.primary,
    paddingLeft: 8,
    marginBottom: 8,
  },
  noteDate: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
  },
  noteContent: {
    fontSize: 12,
    color: '#1E293B',
  },
  addNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    marginTop: 4,
  },
  addNoteBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.roles.doctor.primary,
    marginLeft: 4,
  },
  addNoteForm: {
    marginTop: 8,
  },
  noteInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    padding: 8,
    fontSize: 13,
    color: '#0F172A',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  noteActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  rxCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  rxDiagnosis: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  rxDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  rxBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeDispensed: {
    backgroundColor: '#ECFDF5',
  },
  badgeActive: {
    backgroundColor: '#FEF3C7',
  },
  rxBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  rxNotes: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 8,
  },
  rxItemsList: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginTop: 4,
  },
  rxItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rxItemName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1E293B',
  },
  rxItemDosage: {
    fontSize: 12,
    color: '#64748B',
  },
  rxToken: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 8,
    fontFamily: 'monospace',
  },
});
