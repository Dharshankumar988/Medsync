import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {
  Users,
  Search,
  FileText,
  Pill,
  ChevronRight,
  Phone,
  Droplet,
  Calendar,
  AlertCircle,
  Plus,
} from 'lucide-react-native';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Colors } from '../../../constants/theme';
import {
  doctorService,
  DoctorPatient,
} from '../../../services/doctor.service';
import { PatientDetailModal } from '../../../components/doctor/PatientDetailModal';
import { CreatePrescriptionModal } from '../../../components/doctor/CreatePrescriptionModal';

export default function DoctorPatientsScreen() {
  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [selectedPatient, setSelectedPatient] = useState<DoctorPatient | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [writeRxPatientId, setWriteRxPatientId] = useState<string | null>(null);

  const fetchPatients = useCallback(async (query?: string) => {
    try {
      setError(null);
      const data = await doctorService.getAuthorizedPatients(query);
      setPatients(data);
    } catch (err: any) {
      console.error('Failed to load doctor patients:', err);
      setError(err.message || 'Failed to retrieve authorized patient roster.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients(search);
  }, [fetchPatients, search]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPatients(search);
  }, [fetchPatients, search]);

  const handleOpenPatientDetail = (patient: DoctorPatient) => {
    setSelectedPatient(patient);
    setIsDetailModalOpen(true);
  };

  return (
    <RoleGuard allowedRole="doctor">
      <View style={styles.container}>
        <ScreenHeader
          title="Patient Directory"
          subtitle="Authorized clinical roster & records"
          rightElement={
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{patients.length} Patients</Text>
            </View>
          }
        />

        {/* Search Box */}
        <View style={styles.searchSection}>
          <View style={styles.searchBox}>
            <Search size={18} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search by patient name, phone or blood group..."
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
            />
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <AlertCircle size={18} color="#EF4444" style={{ marginRight: 8 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={Colors.roles.doctor.primary} />
            <Text style={styles.loadingText}>Retrieving authorized patients...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {patients.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Users size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>
                  {search ? 'No Matching Patients' : 'No Authorized Patients Yet'}
                </Text>
                <Text style={styles.emptySub}>
                  {search
                    ? 'No patient records match your current search query.'
                    : 'Patients will appear here automatically once an appointment is scheduled, a prescription is written, or patient consent permissions are granted.'}
                </Text>
              </View>
            ) : (
              patients.map((patient) => (
                <Card key={patient.user_id} style={styles.patientCard}>
                  <CardContent>
                    <TouchableOpacity
                      style={styles.patientHeaderRow}
                      onPress={() => handleOpenPatientDetail(patient)}
                    >
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>
                          {patient.full_name
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </Text>
                      </View>

                      <View style={styles.patientMainInfo}>
                        <Text style={styles.patientName}>{patient.full_name}</Text>
                        <Text style={styles.patientSub}>
                          {patient.gender || 'Patient'} • DOB: {patient.date_of_birth || 'Not specified'}
                        </Text>
                      </View>

                      <ChevronRight size={18} color="#94A3B8" />
                    </TouchableOpacity>

                    {/* Quick Metadata Row */}
                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <Phone size={13} color="#64748B" style={{ marginRight: 4 }} />
                        <Text style={styles.metaText}>
                          {patient.phone_number || patient.contact_number || 'No phone'}
                        </Text>
                      </View>

                      {patient.blood_group ? (
                        <View style={styles.metaItem}>
                          <Droplet size={13} color="#DC2626" style={{ marginRight: 4 }} />
                          <Text style={styles.metaText}>{patient.blood_group}</Text>
                        </View>
                      ) : null}

                      {patient.last_visit_date ? (
                        <View style={styles.metaItem}>
                          <Calendar size={13} color="#059669" style={{ marginRight: 4 }} />
                          <Text style={styles.metaText}>Visit: {patient.last_visit_date}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Action Buttons Row */}
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        style={styles.cardActionBtn}
                        onPress={() => handleOpenPatientDetail(patient)}
                      >
                        <FileText size={14} color={Colors.roles.doctor.primary} />
                        <Text style={styles.cardActionText}>Clinical Records</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.cardActionBtn, styles.cardActionBtnRx]}
                        onPress={() => setWriteRxPatientId(patient.user_id)}
                      >
                        <Pill size={14} color="#059669" />
                        <Text style={[styles.cardActionText, { color: '#059669' }]}>Write Rx</Text>
                      </TouchableOpacity>
                    </View>
                  </CardContent>
                </Card>
              ))
            )}
          </ScrollView>
        )}

        {/* Patient Detail Modal */}
        <PatientDetailModal
          visible={isDetailModalOpen}
          patient={selectedPatient}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedPatient(null);
          }}
        />

        {/* Quick Prescription Modal */}
        <CreatePrescriptionModal
          visible={Boolean(writeRxPatientId)}
          onClose={() => setWriteRxPatientId(null)}
          preselectedPatientId={writeRxPatientId || undefined}
          onSuccess={() => {
            fetchPatients(search);
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
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.roles.doctor.primary,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    flex: 1,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
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
    marginTop: 6,
    lineHeight: 18,
  },
  patientCard: {
    marginBottom: 12,
  },
  patientHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.roles.doctor.primary,
  },
  patientMainInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  patientSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 12,
    color: '#475569',
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
    marginLeft: 8,
  },
  cardActionBtnRx: {
    backgroundColor: '#ECFDF5',
  },
  cardActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.roles.doctor.primary,
    marginLeft: 4,
  },
});
