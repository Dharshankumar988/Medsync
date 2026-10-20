import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Calendar, Clock, X } from 'lucide-react-native';
import { Colors } from '../../constants/theme';
import { Button } from '../common/Button';
import { doctorService, DoctorAppointment } from '../../services/doctor.service';

interface RescheduleAppointmentModalProps {
  visible: boolean;
  appointment: DoctorAppointment | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const RescheduleAppointmentModal: React.FC<RescheduleAppointmentModalProps> = ({
  visible,
  appointment,
  onClose,
  onSuccess,
}) => {
  const [newDate, setNewDate] = useState(
    appointment?.appointment_date || new Date().toISOString().split('T')[0]
  );
  const [newStartTime, setNewStartTime] = useState(appointment?.start_time || '10:00:00');
  const [newEndTime, setNewEndTime] = useState(appointment?.end_time || '10:30:00');
  const [reason, setReason] = useState('Rescheduled by doctor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleReschedule = async () => {
    if (!appointment) return;
    if (!newDate.trim() || !newStartTime.trim()) {
      setError('New date and start time are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await doctorService.rescheduleAppointment(
        appointment.id,
        newDate.trim(),
        newStartTime.trim(),
        newEndTime.trim() || newStartTime.trim(),
        reason.trim()
      );
      Alert.alert('Rescheduled', 'Appointment successfully rescheduled with updated schedule confirmation.');
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to reschedule appointment.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!appointment) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={18} color="#64748B" />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <Calendar size={22} color={Colors.roles.doctor.primary} />
          </View>

          <Text style={styles.title}>Reschedule Visit</Text>
          <Text style={styles.subtitle}>
            Patient: {appointment.patient_name || 'Patient'}
          </Text>

          <Text style={styles.label}>New Date (YYYY-MM-DD) *</Text>
          <TextInput
            style={styles.input}
            value={newDate}
            onChangeText={setNewDate}
            placeholder="2026-10-25"
            placeholderTextColor="#94A3B8"
          />

          <View style={styles.row}>
            <View style={[styles.col, { marginRight: 8 }]}>
              <Text style={styles.label}>Start Time *</Text>
              <TextInput
                style={styles.input}
                value={newStartTime}
                onChangeText={setNewStartTime}
                placeholder="10:00:00"
                placeholderTextColor="#94A3B8"
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>End Time</Text>
              <TextInput
                style={styles.input}
                value={newEndTime}
                onChangeText={setNewEndTime}
                placeholder="10:30:00"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          <Text style={styles.label}>Reason for Rescheduling</Text>
          <TextInput
            style={styles.input}
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Doctor in surgery, clinic hours updated"
            placeholderTextColor="#94A3B8"
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.actions}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={onClose}
              style={{ flex: 1, marginRight: 8 }}
            />
            <Button
              title="Confirm"
              loading={loading}
              onPress={handleReschedule}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 6,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  row: {
    flexDirection: 'row',
  },
  col: {
    flex: 1,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 20,
  },
});
