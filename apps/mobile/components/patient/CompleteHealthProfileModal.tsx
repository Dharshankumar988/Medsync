import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import {
  ShieldAlert,
  Heart,
  Calendar,
  User,
  Phone,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react-native';
import { patientService } from '../../services/patient.service';

interface CompleteHealthProfileModalProps {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onCompleted: () => void;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['MALE', 'FEMALE', 'OTHER'];

export function CompleteHealthProfileModal({
  visible,
  userId,
  onClose,
  onCompleted,
}: CompleteHealthProfileModalProps) {
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('MALE');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!dateOfBirth.trim()) {
      setError('Please provide your date of birth (YYYY-MM-DD).');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await patientService.updateProfile(userId, {
        date_of_birth: dateOfBirth.trim(),
        gender,
        blood_group: bloodGroup,
        emergency_contact_name: emergencyName.trim() || null,
        emergency_contact_number: emergencyPhone.trim() || null,
        profile_completion_percentage: 100,
      });

      onCompleted();
    } catch (err: any) {
      setError(err?.message || 'Failed to update health profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.sheetCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.iconCircle}>
              <Heart size={24} color="#2563EB" />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Complete Your Health Vault</Text>
          <Text style={styles.subtitle}>
            Critical medical vitals used by doctors and emergency responders.
          </Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
            {/* Date of Birth */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date of Birth (YYYY-MM-DD)</Text>
              <View style={styles.inputWrapper}>
                <Calendar size={18} color="#2563EB" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="1995-08-15"
                  placeholderTextColor="#94A3B8"
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                />
              </View>
            </View>

            {/* Gender Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.pillRow}>
                {GENDERS.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.pill, gender === g && styles.pillActive]}
                    onPress={() => setGender(g)}
                  >
                    <Text style={[styles.pillText, gender === g && styles.pillTextActive]}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Blood Group Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Blood Group</Text>
              <View style={styles.pillGrid}>
                {BLOOD_GROUPS.map((bg) => (
                  <TouchableOpacity
                    key={bg}
                    style={[styles.bloodPill, bloodGroup === bg && styles.bloodPillActive]}
                    onPress={() => setBloodGroup(bg)}
                  >
                    <Text style={[styles.bloodPillText, bloodGroup === bg && styles.bloodPillTextActive]}>
                      {bg}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Emergency Contact */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Emergency Contact Person</Text>
              <View style={styles.inputWrapper}>
                <User size={18} color="#2563EB" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Spouse / Parent Name"
                  placeholderTextColor="#94A3B8"
                  value={emergencyName}
                  onChangeText={setEmergencyName}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Emergency Phone Number</Text>
              <View style={styles.inputWrapper}>
                <Phone size={18} color="#2563EB" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="+1 (555) 987-6543"
                  placeholderTextColor="#94A3B8"
                  value={emergencyPhone}
                  onChangeText={setEmergencyPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </ScrollView>

          {/* Submit */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.88}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save & Secure Profile'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={onClose}>
            <Text style={styles.skipButtonText}>Set Up Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12.5,
    marginBottom: 10,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  pillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bloodPill: {
    width: '22%',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  bloodPillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  bloodPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  bloodPillTextActive: {
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#2563EB',
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  skipButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
});
