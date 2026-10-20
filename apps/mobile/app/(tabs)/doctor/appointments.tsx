import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Clock3,
  CalendarDays,
  Pill,
  ChevronRight,
  AlertCircle,
  Phone,
  User,
} from 'lucide-react-native';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Colors } from '../../../constants/theme';
import {
  doctorService,
  DoctorAppointment,
} from '../../../services/doctor.service';
import { RescheduleAppointmentModal } from '../../../components/doctor/RescheduleAppointmentModal';
import { CreatePrescriptionModal } from '../../../components/doctor/CreatePrescriptionModal';

type StatusTab = 'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
type DateTab = 'TODAY' | 'UPCOMING' | 'ALL';

export default function DoctorAppointmentsScreen() {
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusTab>('ALL');
  const [dateFilter, setDateFilter] = useState<DateTab>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Modals
  const [rescheduleAppt, setRescheduleAppt] = useState<DoctorAppointment | null>(null);
  const [writeRxAppt, setWriteRxAppt] = useState<DoctorAppointment | null>(null);

  const fetchAppointments = useCallback(async () => {
    try {
      setError(null);
      const todayStr = new Date().toISOString().split('T')[0];
      let dateParam: string | undefined = undefined;
      if (dateFilter === 'TODAY') dateParam = todayStr;

      const data = await doctorService.getAppointments(statusFilter, dateParam);

      // In-memory filter for 'UPCOMING'
      let filtered = data;
      if (dateFilter === 'UPCOMING') {
        filtered = data.filter((a) => a.appointment_date > todayStr);
      }

      setAppointments(filtered);
    } catch (err: any) {
      console.error('Failed to load appointments queue:', err);
      setError(err.message || 'Failed to retrieve appointments queue.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, dateFilter]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAppointments();
  }, [fetchAppointments]);

  const handleUpdateStatus = async (
    appointmentId: string,
    status: 'CONFIRMED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED',
    reason?: string
  ) => {
    setUpdatingId(appointmentId);
    try {
      await doctorService.updateAppointmentStatus(appointmentId, status, reason);
      Alert.alert('Status Updated', `Appointment marked as ${status.toLowerCase()}.`);
      fetchAppointments();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to update status.';
      Alert.alert('Error', msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return { bg: '#EFF6FF', text: '#2563EB', label: 'Confirmed' };
      case 'COMPLETED':
        return { bg: '#ECFDF5', text: '#059669', label: 'Completed' };
      case 'PENDING':
        return { bg: '#FEF3C7', text: '#D97706', label: 'Pending' };
      case 'RESCHEDULED':
        return { bg: '#F5F3FF', text: '#7C3AED', label: 'Rescheduled' };
      case 'CANCELLED':
      case 'REJECTED':
        return { bg: '#FEE2E2', text: '#DC2626', label: status };
      default:
        return { bg: '#F1F5F9', text: '#64748B', label: status };
    }
  };

  return (
    <RoleGuard allowedRole="doctor">
      <View style={styles.container}>
        <ScreenHeader
          title="Clinic Schedule"
          subtitle="Patient visits, queue & booking actions"
        />

        {/* Date Filters */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, dateFilter === 'ALL' && styles.filterChipActive]}
            onPress={() => setDateFilter('ALL')}
          >
            <Text style={[styles.filterChipText, dateFilter === 'ALL' && styles.filterChipTextActive]}>
              All Dates
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, dateFilter === 'TODAY' && styles.filterChipActive]}
            onPress={() => setDateFilter('TODAY')}
          >
            <Text style={[styles.filterChipText, dateFilter === 'TODAY' && styles.filterChipTextActive]}>
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, dateFilter === 'UPCOMING' && styles.filterChipActive]}
            onPress={() => setDateFilter('UPCOMING')}
          >
            <Text style={[styles.filterChipText, dateFilter === 'UPCOMING' && styles.filterChipTextActive]}>
              Upcoming
            </Text>
          </TouchableOpacity>
        </View>

        {/* Status Tab Bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusTabScroll}>
          {(['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as StatusTab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.statusTab, statusFilter === tab && styles.statusTabActive]}
              onPress={() => setStatusFilter(tab)}
            >
              <Text style={[styles.statusTabText, statusFilter === tab && styles.statusTabTextActive]}>
                {tab === 'ALL' ? 'All Status' : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {error && (
          <View style={styles.errorBox}>
            <AlertCircle size={18} color="#EF4444" style={{ marginRight: 8 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={Colors.roles.doctor.primary} />
            <Text style={styles.loadingText}>Loading clinic schedule...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {appointments.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Calendar size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No Appointments Found</Text>
                <Text style={styles.emptySub}>
                  No appointments match the selected date and status filters.
                </Text>
              </View>
            ) : (
              appointments.map((appt) => {
                const badge = getStatusBadge(appt.status);
                const isUpdating = updatingId === appt.id;

                return (
                  <Card key={appt.id} style={styles.card}>
                    <CardContent>
                      {/* Top Header: Patient & Status */}
                      <View style={styles.cardHeader}>
                        <View style={styles.patientInfo}>
                          <Text style={styles.patientName}>{appt.patient_name || 'Patient'}</Text>
                          {appt.patient_phone ? (
                            <View style={styles.phoneRow}>
                              <Phone size={12} color="#64748B" style={{ marginRight: 4 }} />
                              <Text style={styles.phoneText}>{appt.patient_phone}</Text>
                            </View>
                          ) : null}
                        </View>
                        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                        </View>
                      </View>

                      {/* Date & Time Slot */}
                      <View style={styles.timeBox}>
                        <View style={styles.timeItem}>
                          <Calendar size={14} color={Colors.roles.doctor.primary} style={{ marginRight: 6 }} />
                          <Text style={styles.timeText}>{appt.appointment_date}</Text>
                        </View>
                        <View style={styles.timeItem}>
                          <Clock size={14} color={Colors.roles.doctor.primary} style={{ marginRight: 6 }} />
                          <Text style={styles.timeText}>
                            {appt.start_time ? appt.start_time.slice(0, 5) : '--:--'}
                            {appt.end_time ? ` - ${appt.end_time.slice(0, 5)}` : ''}
                          </Text>
                        </View>
                      </View>

                      {/* Notes / Reason */}
                      {appt.reason ? (
                        <Text style={styles.reasonText}>Reason: {appt.reason}</Text>
                      ) : null}

                      {/* Interactive Action Controls */}
                      <View style={styles.actionsRow}>
                        {appt.status === 'PENDING' && (
                          <>
                            <TouchableOpacity
                              style={[styles.btnAction, styles.btnConfirm]}
                              disabled={isUpdating}
                              onPress={() => handleUpdateStatus(appt.id, 'CONFIRMED')}
                            >
                              {isUpdating ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                              ) : (
                                <>
                                  <CheckCircle2 size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                                  <Text style={styles.btnConfirmText}>Accept</Text>
                                </>
                              )}
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.btnAction, styles.btnReject]}
                              disabled={isUpdating}
                              onPress={() =>
                                Alert.alert(
                                  'Decline Appointment',
                                  'Are you sure you want to decline this booking request?',
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                      text: 'Decline',
                                      style: 'destructive',
                                      onPress: () =>
                                        handleUpdateStatus(appt.id, 'REJECTED', 'Declined by doctor'),
                                    },
                                  ]
                                )
                              }
                            >
                              <XCircle size={14} color="#DC2626" style={{ marginRight: 4 }} />
                              <Text style={styles.btnRejectText}>Decline</Text>
                            </TouchableOpacity>
                          </>
                        )}

                        {appt.status === 'CONFIRMED' && (
                          <>
                            <TouchableOpacity
                              style={[styles.btnAction, styles.btnComplete]}
                              disabled={isUpdating}
                              onPress={() => handleUpdateStatus(appt.id, 'COMPLETED')}
                            >
                              <CheckCircle2 size={14} color="#059669" style={{ marginRight: 4 }} />
                              <Text style={styles.btnCompleteText}>Complete</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.btnAction, styles.btnReschedule]}
                              onPress={() => setRescheduleAppt(appt)}
                            >
                              <Clock3 size={14} color={Colors.roles.doctor.primary} style={{ marginRight: 4 }} />
                              <Text style={styles.btnRescheduleText}>Reschedule</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.btnAction, styles.btnRx]}
                              onPress={() => setWriteRxAppt(appt)}
                            >
                              <Pill size={14} color="#7C3AED" style={{ marginRight: 4 }} />
                              <Text style={styles.btnRxText}>Write Rx</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </ScrollView>
        )}

        {/* Reschedule Modal */}
        <RescheduleAppointmentModal
          visible={Boolean(rescheduleAppt)}
          appointment={rescheduleAppt}
          onClose={() => setRescheduleAppt(null)}
          onSuccess={() => {
            fetchAppointments();
          }}
        />

        {/* Prescription Creation Modal */}
        <CreatePrescriptionModal
          visible={Boolean(writeRxAppt)}
          preselectedAppointmentId={writeRxAppt?.id}
          preselectedPatientId={writeRxAppt?.patient_id}
          onClose={() => setWriteRxAppt(null)}
          onSuccess={() => {
            fetchAppointments();
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: Colors.roles.doctor.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statusTabScroll: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  statusTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusTabActive: {
    backgroundColor: Colors.roles.doctor.primary,
    borderColor: Colors.roles.doctor.primary,
    shadowColor: Colors.roles.doctor.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  statusTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.2,
  },
  statusTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    paddingBottom: 110,
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
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  phoneText: {
    fontSize: 12,
    color: '#64748B',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timeBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 8,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
  },
  reasonText: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    marginTop: 4,
  },
  btnAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  btnConfirm: {
    backgroundColor: Colors.roles.doctor.primary,
  },
  btnConfirmText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  btnReject: {
    backgroundColor: '#FEE2E2',
  },
  btnRejectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  btnComplete: {
    backgroundColor: '#ECFDF5',
  },
  btnCompleteText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  btnReschedule: {
    backgroundColor: '#E0F2FE',
  },
  btnRescheduleText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.roles.doctor.primary,
  },
  btnRx: {
    backgroundColor: '#F5F3FF',
  },
  btnRxText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
  },
});
