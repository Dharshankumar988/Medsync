import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  Shield,
  Lock,
  Building2,
  Phone,
  Mail,
  MapPin,
  Clock,
  DollarSign,
  Briefcase,
  Award,
  Store,
  QrCode,
  LogOut,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
} from 'lucide-react-native';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Colors } from '../../../constants/theme';
import {
  doctorService,
  DoctorProfile,
  PharmacyItem,
  PinSecurityStatus,
} from '../../../services/doctor.service';
import { authService } from '../../../services/auth.service';
import { QRScanner } from '../../../components/common/QRScanner';

export default function DoctorProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<DoctorProfile>({
    user_id: '',
    full_name: '',
    specialization: '',
    experience_years: 0,
    bio: '',
    qualifications: '',
    medical_council_reg_number: '',
    license_number: '',
    consultation_fee: 500,
    consultation_hours: '09:00 AM - 05:00 PM',
    clinic_name: '',
    clinic_address: '',
    clinic_phone: '',
    clinic_email: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    is_accepting_appointments: true,
    doctor_status: 'ACTIVE',
  });

  const [pinStatus, setPinStatus] = useState<PinSecurityStatus>({ has_pin: false, status: 'NOT_STARTED' });
  const [pharmacies, setPharmacies] = useState<PharmacyItem[]>([]);
  const [pharmacySearch, setPharmacySearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [password, setPassword] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinModalError, setPinModalError] = useState('');

  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const fetchProfileData = useCallback(async () => {
    try {
      setError(null);
      const [docData, pinData, pharmsData] = await Promise.all([
        doctorService.getDoctorProfile(),
        doctorService.getPinSecurityStatus(),
        doctorService.getPharmacies(),
      ]);
      setProfile(docData);
      setPinStatus(pinData);
      setPharmacies(pharmsData);
    } catch (err: any) {
      console.error('Failed to load doctor profile:', err);
      setError(err.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleFieldChange = (field: keyof DoctorProfile, value: any) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleAppointments = async (value: boolean) => {
    handleFieldChange('is_accepting_appointments', value);
    try {
      await doctorService.setAcceptingAppointments(value);
      Alert.alert('Status Updated', `Appointment acceptance set to ${value ? 'ACTIVE' : 'PAUSED'}.`);
    } catch (err: any) {
      handleFieldChange('is_accepting_appointments', !value);
      Alert.alert('Update Failed', err.message || 'Could not update availability.');
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await doctorService.updateDoctorProfile(profile);
      Alert.alert('Success', 'Doctor credentials and clinic settings updated successfully.');
    } catch (err: any) {
      Alert.alert('Save Failed', err.response?.data?.detail || err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleManagePin = async () => {
    if (pin.length !== 6 || confirmPin.length !== 6) {
      setPinModalError('PIN must be exactly 6 digits.');
      return;
    }
    if (pin !== confirmPin) {
      setPinModalError('PIN and Confirm PIN do not match.');
      return;
    }
    if (!password) {
      setPinModalError('Account password is required for security verification.');
      return;
    }

    setPinLoading(true);
    setPinModalError('');

    try {
      if (pinStatus.has_pin) {
        await doctorService.resetPin(pin, confirmPin, password);
        Alert.alert('PIN Updated', 'Your 6-digit Doctor Authorization PIN has been reset successfully.');
      } else {
        await doctorService.enrollPin(pin, confirmPin, password);
        Alert.alert('PIN Enrolled', 'Your 6-digit Doctor Authorization PIN is now enrolled and active.');
      }
      setIsPinModalOpen(false);
      setPin('');
      setConfirmPin('');
      setPassword('');
      fetchProfileData();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to update PIN.';
      setPinModalError(msg);
    } finally {
      setPinLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of your clinical session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await authService.logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const filteredPharmacies = pharmacySearch.trim()
    ? pharmacies.filter(
        (p) =>
          p.full_name.toLowerCase().includes(pharmacySearch.toLowerCase()) ||
          (p.city && p.city.toLowerCase().includes(pharmacySearch.toLowerCase()))
      )
    : pharmacies;

  return (
    <RoleGuard allowedRole="doctor">
      <View style={styles.container}>
        <ScreenHeader
          title="Practitioner Profile"
          subtitle="License credentials, clinic & security"
          rightElement={
            <TouchableOpacity
              style={styles.headerScannerBtn}
              onPress={() => setIsScannerOpen(true)}
            >
              <QrCode size={18} color={Colors.roles.doctor.primary} />
            </TouchableOpacity>
          }
        />

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={Colors.roles.doctor.primary} />
            <Text style={styles.loadingText}>Loading practitioner record...</Text>
          </View>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {error && (
              <View style={styles.errorBox}>
                <AlertCircle size={18} color="#EF4444" style={{ marginRight: 8 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Profile Header Card */}
            <Card style={styles.headerCard}>
              <CardContent>
                <View style={styles.headerRow}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>
                      {(profile.full_name || 'Dr')
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.headerTextCol}>
                    <Text style={styles.docName}>{profile.full_name}</Text>
                    <Text style={styles.docSpecialty}>
                      {profile.specialization || 'General Physician'} • {profile.experience_years || 0} yrs exp
                    </Text>
                    <View style={styles.docStatusRow}>
                      <View style={styles.statusDot} />
                      <Text style={styles.statusLabel}>
                        {profile.doctor_status === 'ACTIVE' || profile.doctor_status === 'APPROVED'
                          ? 'Verified Practitioner'
                          : 'Verification Pending'}
                      </Text>
                    </View>
                  </View>
                </View>
              </CardContent>
            </Card>

            {/* Availability Switch */}
            <Card style={styles.card}>
              <CardContent>
                <View style={styles.switchRow}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.switchTitle}>Accept New Appointments</Text>
                    <Text style={styles.switchSub}>
                      Allow registered patients to view your clinic schedule and book consultation slots.
                    </Text>
                  </View>
                  <Switch
                    value={profile.is_accepting_appointments}
                    onValueChange={handleToggleAppointments}
                    trackColor={{ false: '#CBD5E1', true: '#BAE6FD' }}
                    thumbColor={profile.is_accepting_appointments ? Colors.roles.doctor.primary : '#94A3B8'}
                  />
                </View>
              </CardContent>
            </Card>

            {/* 6-Digit Authorization PIN Security Card */}
            <Card style={styles.card}>
              <CardContent>
                <View style={styles.pinHeaderRow}>
                  <View style={styles.pinIconCircle}>
                    <Lock size={20} color={Colors.roles.doctor.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>Doctor Authorization PIN</Text>
                    <Text style={styles.pinStatusText}>
                      Status: {pinStatus.has_pin ? 'Active & Enrolled' : 'Not Enrolled'}
                    </Text>
                  </View>
                  <Button
                    title={pinStatus.has_pin ? 'Reset PIN' : 'Enroll PIN'}
                    size="sm"
                    variant={pinStatus.has_pin ? 'outline' : 'primary'}
                    onPress={() => {
                      setPin('');
                      setConfirmPin('');
                      setPassword('');
                      setPinModalError('');
                      setIsPinModalOpen(true);
                    }}
                  />
                </View>
                <Text style={styles.pinNote}>
                  Your 6-digit PIN is strictly required to cryptographically sign digital prescriptions and authorize patient clinical notes.
                </Text>
              </CardContent>
            </Card>

            {/* Medical Credentials Section */}
            <Card style={styles.card}>
              <CardContent>
                <Text style={styles.cardTitle}>Medical Registration & Credentials</Text>

                <Text style={styles.inputLabel}>Full Legal Name</Text>
                <TextInput
                  style={styles.input}
                  value={profile.full_name}
                  onChangeText={(v) => handleFieldChange('full_name', v)}
                />

                <Text style={styles.inputLabel}>Medical Council Registration No.</Text>
                <TextInput
                  style={styles.input}
                  value={profile.medical_council_reg_number || ''}
                  onChangeText={(v) => handleFieldChange('medical_council_reg_number', v)}
                  placeholder="e.g. MCI-2018-98421"
                  placeholderTextColor="#94A3B8"
                />

                <Text style={styles.inputLabel}>State Medical License Number</Text>
                <TextInput
                  style={styles.input}
                  value={profile.license_number || ''}
                  onChangeText={(v) => handleFieldChange('license_number', v)}
                  placeholder="e.g. TN-MED-44219"
                  placeholderTextColor="#94A3B8"
                />

                <Text style={styles.inputLabel}>Specialization</Text>
                <TextInput
                  style={styles.input}
                  value={profile.specialization || ''}
                  onChangeText={(v) => handleFieldChange('specialization', v)}
                  placeholder="e.g. Cardiologist, General Medicine"
                  placeholderTextColor="#94A3B8"
                />

                <View style={styles.row}>
                  <View style={[styles.col, { marginRight: 8 }]}>
                    <Text style={styles.inputLabel}>Experience (Years)</Text>
                    <TextInput
                      style={styles.input}
                      value={String(profile.experience_years || 0)}
                      onChangeText={(v) =>
                        handleFieldChange('experience_years', parseInt(v.replace(/[^0-9]/g, ''), 10) || 0)
                      }
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Consultation Fee (₹)</Text>
                    <TextInput
                      style={styles.input}
                      value={String(profile.consultation_fee || 500)}
                      onChangeText={(v) =>
                        handleFieldChange('consultation_fee', parseInt(v.replace(/[^0-9]/g, ''), 10) || 0)
                      }
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <Text style={styles.inputLabel}>Qualifications</Text>
                <TextInput
                  style={styles.input}
                  value={profile.qualifications || ''}
                  onChangeText={(v) => handleFieldChange('qualifications', v)}
                  placeholder="e.g. MBBS, MD (Internal Medicine)"
                  placeholderTextColor="#94A3B8"
                />

                <Text style={styles.inputLabel}>Professional Bio</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={profile.bio || ''}
                  onChangeText={(v) => handleFieldChange('bio', v)}
                  placeholder="Clinical background, affiliations and patient care philosophy..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                />
              </CardContent>
            </Card>

            {/* Clinic & Practice Location Section */}
            <Card style={styles.card}>
              <CardContent>
                <Text style={styles.cardTitle}>Practice Location & Clinic Details</Text>

                <Text style={styles.inputLabel}>Clinic / Practice Name</Text>
                <TextInput
                  style={styles.input}
                  value={profile.clinic_name || ''}
                  onChangeText={(v) => handleFieldChange('clinic_name', v)}
                  placeholder="e.g. MedSync Family Health Clinic"
                  placeholderTextColor="#94A3B8"
                />

                <Text style={styles.inputLabel}>Clinic Physical Address</Text>
                <TextInput
                  style={styles.input}
                  value={profile.clinic_address || ''}
                  onChangeText={(v) => handleFieldChange('clinic_address', v)}
                  placeholder="Street address, building, floor"
                  placeholderTextColor="#94A3B8"
                />

                <View style={styles.row}>
                  <View style={[styles.col, { marginRight: 8 }]}>
                    <Text style={styles.inputLabel}>City</Text>
                    <TextInput
                      style={styles.input}
                      value={profile.city || ''}
                      onChangeText={(v) => handleFieldChange('city', v)}
                      placeholder="e.g. Bangalore"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>State</Text>
                    <TextInput
                      style={styles.input}
                      value={profile.state || ''}
                      onChangeText={(v) => handleFieldChange('state', v)}
                      placeholder="e.g. Karnataka"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={[styles.col, { marginRight: 8 }]}>
                    <Text style={styles.inputLabel}>Pincode</Text>
                    <TextInput
                      style={styles.input}
                      value={profile.pincode || ''}
                      onChangeText={(v) => handleFieldChange('pincode', v)}
                      placeholder="560001"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Consultation Hours</Text>
                    <TextInput
                      style={styles.input}
                      value={profile.consultation_hours || ''}
                      onChangeText={(v) => handleFieldChange('consultation_hours', v)}
                      placeholder="09:00 AM - 05:00 PM"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={[styles.col, { marginRight: 8 }]}>
                    <Text style={styles.inputLabel}>Clinic Phone</Text>
                    <TextInput
                      style={styles.input}
                      value={profile.clinic_phone || ''}
                      onChangeText={(v) => handleFieldChange('clinic_phone', v)}
                      placeholder="+91 98765 43210"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Clinic Email</Text>
                    <TextInput
                      style={styles.input}
                      value={profile.clinic_email || ''}
                      onChangeText={(v) => handleFieldChange('clinic_email', v)}
                      placeholder="clinic@medsync.in"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <Button
                  title="Save Professional Profile"
                  loading={saving}
                  onPress={handleSaveProfile}
                  style={{ marginTop: 16 }}
                />
              </CardContent>
            </Card>

            {/* Connected Verified Pharmacies Directory */}
            <Card style={styles.card}>
              <CardContent>
                <View style={styles.sectionHeaderBetween}>
                  <Text style={styles.cardTitle}>Verified Pharmacy Network</Text>
                  <Text style={styles.networkCountText}>{pharmacies.length} Available</Text>
                </View>

                <View style={styles.pharmSearchBox}>
                  <Search size={16} color="#94A3B8" style={{ marginRight: 6 }} />
                  <TextInput
                    style={styles.pharmSearchInput}
                    value={pharmacySearch}
                    onChangeText={setPharmacySearch}
                    placeholder="Search pharmacies by name or city..."
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                {filteredPharmacies.length === 0 ? (
                  <Text style={styles.noPharmText}>
                    No registered pharmacies match your search query.
                  </Text>
                ) : (
                  filteredPharmacies.slice(0, 5).map((pharm) => (
                    <View key={pharm.user_id} style={styles.pharmRow}>
                      <View style={styles.pharmIcon}>
                        <Store size={18} color={Colors.roles.doctor.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pharmName}>{pharm.full_name}</Text>
                        <Text style={styles.pharmAddress}>
                          {pharm.address || 'Address not listed'} • {pharm.city || 'India'}
                        </Text>
                      </View>
                      {pharm.isLinked ? (
                        <View style={styles.linkedBadge}>
                          <Text style={styles.linkedText}>Clinic Partner</Text>
                        </View>
                      ) : null}
                    </View>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Sign Out Button */}
            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
              <LogOut size={18} color="#DC2626" style={{ marginRight: 8 }} />
              <Text style={styles.signOutText}>Sign Out of Clinical Account</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* PIN Management Modal */}
        <Modal
          visible={isPinModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsPinModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsPinModalOpen(false)}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>

              <View style={styles.modalIconCircle}>
                <Lock size={22} color={Colors.roles.doctor.primary} />
              </View>

              <Text style={styles.modalTitle}>
                {pinStatus.has_pin ? 'Reset Authorization PIN' : 'Enroll 6-Digit PIN'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {pinStatus.has_pin
                  ? 'Enter your current account password along with your new 6-digit PIN.'
                  : 'Enroll a secure 6-digit PIN to authenticate prescription signing and record actions.'}
              </Text>

              <Text style={styles.modalFieldLabel}>New 6-Digit PIN *</Text>
              <TextInput
                style={styles.modalPinInput}
                value={pin}
                onChangeText={(t) => setPin(t.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="numeric"
                maxLength={6}
                secureTextEntry
                placeholder="••••••"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.modalFieldLabel}>Confirm 6-Digit PIN *</Text>
              <TextInput
                style={styles.modalPinInput}
                value={confirmPin}
                onChangeText={(t) => setConfirmPin(t.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="numeric"
                maxLength={6}
                secureTextEntry
                placeholder="••••••"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.modalFieldLabel}>Current Account Password *</Text>
              <TextInput
                style={styles.modalPassInput}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Enter password"
                placeholderTextColor="#94A3B8"
              />

              {pinModalError ? <Text style={styles.modalError}>{pinModalError}</Text> : null}

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setIsPinModalOpen(false)}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title="Confirm PIN"
                  loading={pinLoading}
                  onPress={handleManagePin}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* QR Scanner Modal */}
        <Modal
          visible={isScannerOpen}
          animationType="slide"
          onRequestClose={() => setIsScannerOpen(false)}
        >
          <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
            <View style={styles.scannerModalHeader}>
              <Text style={styles.scannerModalTitle}>Universal QR Scanner</Text>
              <TouchableOpacity onPress={() => setIsScannerOpen(false)}>
                <X size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>
            <QRScanner
              role="doctor"
              verifyHandler={(t) => doctorService.verifyQR(t)}
            />
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
  headerScannerBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
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
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    flex: 1,
  },
  headerCard: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.roles.doctor.primary,
  },
  headerTextCol: {
    flex: 1,
  },
  docName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  docSpecialty: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  docStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  card: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  switchSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  pinHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pinIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  pinStatusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  pinNote: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
    marginTop: 10,
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
  textArea: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  col: {
    flex: 1,
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  networkCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.roles.doctor.primary,
  },
  pharmSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  pharmSearchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  noPharmText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  pharmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pharmIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  pharmName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  pharmAddress: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  linkedBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  linkedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  modalOverlay: {
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
  modalCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 6,
  },
  modalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    alignSelf: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 16,
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
    marginTop: 8,
  },
  modalPinInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 10,
    fontSize: 20,
    letterSpacing: 6,
    textAlign: 'center',
    color: '#0F172A',
  },
  modalPassInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  modalError: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 8,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 20,
  },
  scannerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  scannerModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
});
