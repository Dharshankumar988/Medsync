import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { Calendar, Clock, Plus, AlertCircle, X, Check, User, XCircle } from 'lucide-react-native';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { patientService, AppointmentItem } from '../../../services/patient.service';
import { Colors } from '../../../constants/theme';
import { formatErrorMessage } from '../../../lib/api';

export default function PatientAppointmentsScreen() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  // Booking modal state
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [startTime, setStartTime] = useState('10:00:00');
  const [reason, setReason] = useState('');
  const [pin, setPin] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');

  const loadAppointments = useCallback(async () => {
    try {
      setError(null);
      const data = await patientService.getAppointments(statusFilter);
      setAppointments(data);
    } catch (err: any) {
      console.warn('Failed to load appointments:', err);
      setError(err.message || 'Could not load appointments.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAppointments();
  }, [loadAppointments]);

  const openBookingModal = async () => {
    setBookingError('');
    setBookingModalVisible(true);
    try {
      const docList = await patientService.getAvailableDoctors();
      setDoctors(docList);
      if (docList.length > 0) {
        setSelectedDoctorId(docList[0].id);
      }
      // Default to tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setAppointmentDate(tomorrow.toISOString().split('T')[0]);
    } catch (err: any) {
      console.warn('Could not fetch doctors:', err);
    }
  };

  const handleCancelAppointment = (appointment: AppointmentItem) => {
    Alert.alert(
      'Cancel Appointment',
      `Are you sure you want to cancel your appointment on ${appointment.appointment_date}?`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Visit',
          style: 'destructive',
          onPress: async () => {
            try {
              await patientService.cancelAppointment(appointment.id, 'Patient cancelled via mobile app');
              Alert.alert('Visit Cancelled', 'Your appointment has been cancelled.');
              loadAppointments();
            } catch (err: any) {
              Alert.alert('Action Failed', formatErrorMessage(err));
            }
          },
        },
      ]
    );
  };

  const handleBookSubmit = async () => {
    if (!selectedDoctorId) {
      setBookingError('Please select a doctor.');
      return;
    }
    if (!appointmentDate || !/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) {
      setBookingError('Please enter a valid date in YYYY-MM-DD format.');
      return;
    }
    if (!pin || pin.length !== 6) {
      setBookingError('6-digit Authorization PIN is required to confirm booking.');
      return;
    }

    setBookingLoading(true);
    setBookingError('');

    try {
      await patientService.bookAppointment({
        doctor_id: selectedDoctorId,
        appointment_date: appointmentDate,
        start_time: startTime,
        reason: reason.trim() || 'General Consultation',
        pin,
      });

      setBookingModalVisible(false);
      setPin('');
      setReason('');
      Alert.alert('Success', 'Your appointment request has been submitted to the clinic.');
      loadAppointments();
    } catch (err: any) {
      setBookingError(formatErrorMessage(err));
    } finally {
      setBookingLoading(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    const isConfirmed = status === 'CONFIRMED';
    const isPending = status === 'PENDING';
    const isCompleted = status === 'COMPLETED';
    const isCancelled = status === 'CANCELLED';

    const bg = isConfirmed
      ? 'rgba(16, 185, 129, 0.1)'
      : isPending
      ? 'rgba(245, 158, 11, 0.1)'
      : isCompleted
      ? 'rgba(59, 130, 246, 0.1)'
      : 'rgba(239, 68, 68, 0.1)';

    const color = isConfirmed
      ? '#10B981'
      : isPending
      ? '#D97706'
      : isCompleted
      ? '#3B82F6'
      : '#EF4444';

    return (
      <View style={[styles.statusBadge, { backgroundColor: bg }]}>
        <Text style={[styles.statusText, { color }]}>{status}</Text>
      </View>
    );
  };

  const renderAppointmentItem = ({ item }: { item: AppointmentItem }) => {
    const canCancel = item.status === 'PENDING' || item.status === 'CONFIRMED';

    return (
      <Card style={styles.apptCard}>
        <CardContent>
          <View style={styles.cardHeaderRow}>
            <View style={styles.doctorIconBox}>
              <User size={20} color={Colors.roles.patient.primary} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.reasonTitle} numberOfLines={1}>
                {item.reason || 'Medical Consultation'}
              </Text>
              <Text style={styles.doctorName}>
                {item.doctor_name ? `Dr. ${item.doctor_name}` : 'Practitioner Consultation'}
              </Text>
            </View>
            {renderStatusBadge(item.status)}
          </View>

          <View style={styles.timeRow}>
            <Calendar size={14} color="#64748B" />
            <Text style={styles.timeText}>{item.appointment_date}</Text>
            <Clock size={14} color="#64748B" style={{ marginLeft: 8 }} />
            <Text style={styles.timeText}>{item.start_time}</Text>
          </View>

          {canCancel && (
            <View style={styles.actionsRow}>
              <Button
                title="Cancel Consultation"
                size="sm"
                variant="destructive"
                iconLeft={<XCircle size={14} color="#EF4444" />}
                onPress={() => handleCancelAppointment(item)}
                style={styles.cancelBtn}
              />
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
          title="Appointments"
          subtitle="Clinic visits & schedule"
          rightElement={
            <TouchableOpacity
              style={styles.headerBookBtn}
              onPress={openBookingModal}
              activeOpacity={0.85}
            >
              <Plus size={15} color="#FFFFFF" />
              <Text style={styles.headerBookBtnText}>Book</Text>
            </TouchableOpacity>
          }
        />

        {/* Filter bar */}
        <View style={styles.filterRow}>
          {['ALL', 'CONFIRMED', 'PENDING', 'CANCELLED'].map((tab) => {
            const isSelected = (tab === 'ALL' && !statusFilter) || statusFilter === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setStatusFilter(tab === 'ALL' ? undefined : tab)}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <AlertCircle size={16} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id}
          renderItem={renderAppointmentItem}
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
                  <Calendar size={36} color="#94A3B8" />
                </View>
                <Text style={styles.emptyTitle}>No Appointments Scheduled</Text>
                <Text style={styles.emptySubtitle}>
                  You do not have any {statusFilter ? statusFilter.toLowerCase() : ''} clinic consultations on record.
                </Text>
                <TouchableOpacity
                  style={styles.emptyBookBtn}
                  onPress={openBookingModal}
                  activeOpacity={0.85}
                >
                  <Plus size={16} color="#FFFFFF" />
                  <Text style={styles.emptyBookBtnText}>Schedule Consultation</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />

        {/* Booking Modal */}
        <Modal
          visible={bookingModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setBookingModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Book Consultation</Text>
              <TouchableOpacity onPress={() => setBookingModalVisible(false)}>
                <X size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {bookingError ? (
                <View style={styles.modalErrorBanner}>
                  <AlertCircle size={16} color="#EF4444" />
                  <Text style={styles.modalErrorText}>{bookingError}</Text>
                </View>
              ) : null}

              <Text style={styles.inputLabel}>Select Doctor</Text>
              {doctors.length > 0 ? (
                <View style={styles.doctorsList}>
                  {doctors.map((doc) => {
                    const isSelected = selectedDoctorId === doc.id;
                    const rawName = doc.full_name || doc.user?.full_name || 'Practitioner';
                    const docName = rawName.replace(/^Dr\.?\s*/i, '');
                    return (
                      <TouchableOpacity
                        key={doc.id}
                        style={[styles.doctorOption, isSelected && styles.doctorOptionSelected]}
                        onPress={() => setSelectedDoctorId(doc.id)}
                      >
                        <View style={styles.doctorOptionInfo}>
                          <Text style={[styles.doctorOptionName, isSelected && styles.doctorOptionTextActive]}>
                            Dr. {docName}
                          </Text>
                          <Text style={styles.doctorOptionSub}>
                            {doc.clinic_name || doc.specialization || 'Clinical Care'} • {doc.clinic_phone || 'Available'}
                          </Text>
                        </View>
                        {isSelected && <Check size={18} color={Colors.roles.patient.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.noDoctorsText}>No practitioners currently available for online booking.</Text>
              )}

              <Text style={styles.inputLabel}>Appointment Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.textInput}
                value={appointmentDate}
                onChangeText={setAppointmentDate}
                placeholder="2026-10-25"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>Preferred Time</Text>
              <TextInput
                style={styles.textInput}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="10:00:00"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>Reason for Consultation</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={reason}
                onChangeText={setReason}
                placeholder="Describe your symptoms or consultation reason"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>6-Digit Authorization PIN</Text>
              <TextInput
                style={styles.textInput}
                value={pin}
                onChangeText={(text) => setPin(text.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder="••••••"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                secureTextEntry
                maxLength={6}
              />

              <Button
                title="Confirm Appointment"
                loading={bookingLoading}
                onPress={handleBookSubmit}
                style={styles.confirmBookingBtn}
              />
            </ScrollView>
          </View>
        </Modal>
      </View>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563EB',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  headerBookBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.2,
  },
  filterChipTextActive: {
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
    margin: 16,
    padding: 12,
    gap: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    flex: 1,
  },
  apptCard: {
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
  doctorIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  reasonTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  doctorName: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  timeText: {
    fontSize: 12,
    color: '#475569',
    marginLeft: 4,
    fontWeight: '500',
  },
  actionsRow: {
    marginTop: 12,
  },
  cancelBtn: {
    width: '100%',
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
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
  },
  emptyBookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginTop: 14,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  emptyBookBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  modalErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  modalErrorText: {
    color: '#EF4444',
    fontSize: 13,
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 12,
  },
  doctorsList: {
    gap: 8,
    marginBottom: 8,
  },
  doctorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  doctorOptionSelected: {
    borderColor: Colors.roles.patient.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  doctorOptionInfo: {
    flex: 1,
  },
  doctorOptionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  doctorOptionTextActive: {
    color: Colors.roles.patient.primary,
  },
  doctorOptionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  noDoctorsText: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 8,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  confirmBookingBtn: {
    marginTop: 24,
  },
});
