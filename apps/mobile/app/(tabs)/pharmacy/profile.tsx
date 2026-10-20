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
  Store,
  Shield,
  Lock,
  Phone,
  Mail,
  MapPin,
  Clock,
  QrCode,
  LogOut,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Building,
} from 'lucide-react-native';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Colors } from '../../../constants/theme';
import {
  pharmacyService,
  PharmacyProfile,
  PinSecurityStatus,
} from '../../../services/pharmacy.service';
import { authService } from '../../../services/auth.service';
import { QRScanner } from '../../../components/common/QRScanner';

export default function PharmacyProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<PharmacyProfile>({
    user_id: '',
    business_name: '',
    license_number: '',
    gst_number: '',
    address: '',
    contact_number: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    operating_hours: '08:00 AM - 10:00 PM',
    working_days: 'Mon - Sat',
    is_24x7: false,
    owner_details: '',
    qr_identifier: '',
    qr_status: 'ACTIVE',
  });

  const [pinStatus, setPinStatus] = useState<PinSecurityStatus>({ has_pin: false, status: 'NOT_STARTED' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PIN Modal
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [password, setPassword] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinModalError, setPinModalError] = useState('');

  // Scanner Modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const fetchProfileData = useCallback(async () => {
    try {
      setError(null);
      const [phData, pStatus] = await Promise.all([
        pharmacyService.getProfile(),
        pharmacyService.getSecurityStatus(),
      ]);
      setProfile(phData);
      setPinStatus(pStatus);
    } catch (err: any) {
      console.error('Failed to load pharmacy profile:', err);
      setError(err.message || 'Failed to load pharmacy profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleFieldChange = (field: keyof PharmacyProfile, value: any) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggle24x7 = (value: boolean) => {
    handleFieldChange('is_24x7', value);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await pharmacyService.updateProfile(profile);
      Alert.alert('Profile Saved', 'Pharmacy credentials, branch information, and operating hours updated successfully.');
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
        await pharmacyService.resetPin(pin, confirmPin, password);
        Alert.alert('PIN Updated', 'Your 6-digit Pharmacy Authorization PIN has been reset successfully.');
      } else {
        await pharmacyService.enrollPin(pin, confirmPin, password);
        Alert.alert('PIN Enrolled', 'Your 6-digit Pharmacy Authorization PIN is now enrolled and active.');
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
    Alert.alert('Sign Out', 'Are you sure you want to log out of your pharmacy session?', [
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

  return (
    <RoleGuard allowedRole="pharmacy">
      <View style={styles.container}>
        <ScreenHeader
          title="Pharmacy Establishment"
          subtitle="License credentials, hours & branch security"
          rightElement={
            <TouchableOpacity
              style={styles.headerScannerBtn}
              onPress={() => setIsScannerOpen(true)}
            >
              <QrCode size={18} color={Colors.roles.pharmacy.primary} />
            </TouchableOpacity>
          }
        />

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={Colors.roles.pharmacy.primary} />
            <Text style={styles.loadingText}>Loading pharmacy establishment profile...</Text>
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
                    <Store size={26} color={Colors.roles.pharmacy.primary} />
                  </View>
                  <View style={styles.headerTextCol}>
                    <Text style={styles.businessName}>{profile.business_name || 'Pharmacy Branch'}</Text>
                    <Text style={styles.licenseSubtitle}>
                      Lic: {profile.license_number || 'Verification pending'} • {profile.city || 'India'}
                    </Text>
                    <View style={styles.statusRow}>
                      <View style={styles.statusDot} />
                      <Text style={styles.statusLabel}>Authorized Dispensing Pharmacy</Text>
                    </View>
                  </View>
                </View>
              </CardContent>
            </Card>

            {/* Counter QR Identifier Display */}
            {profile.qr_identifier ? (
              <Card style={styles.card}>
                <CardContent>
                  <View style={styles.qrHeaderRow}>
                    <View style={styles.qrIconCircle}>
                      <QrCode size={20} color={Colors.roles.pharmacy.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>Counter QR Routing Token</Text>
                      <Text style={styles.qrTokenText} numberOfLines={1}>
                        {profile.qr_identifier}
                      </Text>
                    </View>
                    <View style={styles.activePill}>
                      <Text style={styles.activePillText}>{profile.qr_status || 'ACTIVE'}</Text>
                    </View>
                  </View>
                  <Text style={styles.qrExplanation}>
                    Patients at your physical counter scan this QR code using their MedSync app to route digital prescriptions directly into your fulfillment queue.
                  </Text>
                </CardContent>
              </Card>
            ) : null}

            {/* 6-Digit Staff Authorization PIN Card */}
            <Card style={styles.card}>
              <CardContent>
                <View style={styles.pinHeaderRow}>
                  <View style={styles.pinIconCircle}>
                    <Lock size={20} color={Colors.roles.pharmacy.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>Staff Authorization PIN</Text>
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
                  Your 6-digit Authorization PIN is strictly required to dispense digital prescriptions, place restock supplier orders, and verify stock adjustments.
                </Text>
              </CardContent>
            </Card>

            {/* 24x7 Service Switch */}
            <Card style={styles.card}>
              <CardContent>
                <View style={styles.switchRow}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.switchTitle}>24x7 Emergency Service</Text>
                    <Text style={styles.switchSub}>
                      Display this pharmacy branch as open 24 hours for emergency prescription fulfillment.
                    </Text>
                  </View>
                  <Switch
                    value={profile.is_24x7 ?? false}
                    onValueChange={handleToggle24x7}
                    trackColor={{ false: '#CBD5E1', true: '#FEF3C7' }}
                    thumbColor={profile.is_24x7 ? Colors.roles.pharmacy.primary : '#94A3B8'}
                  />
                </View>
              </CardContent>
            </Card>

            {/* Regulatory & Registration Details */}
            <Card style={styles.card}>
              <CardContent>
                <Text style={styles.cardTitle}>Regulatory Credentials</Text>

                <Text style={styles.inputLabel}>Pharmacy Business Name *</Text>
                <TextInput
                  style={styles.input}
                  value={profile.business_name}
                  onChangeText={(v) => handleFieldChange('business_name', v)}
                />

                <Text style={styles.inputLabel}>Drug Dispensing License Number *</Text>
                <TextInput
                  style={styles.input}
                  value={profile.license_number || ''}
                  onChangeText={(v) => handleFieldChange('license_number', v)}
                  placeholder="e.g. DL-2026-KA-44129"
                  placeholderTextColor="#94A3B8"
                />

                <Text style={styles.inputLabel}>GSTIN / Tax Identification</Text>
                <TextInput
                  style={styles.input}
                  value={profile.gst_number || ''}
                  onChangeText={(v) => handleFieldChange('gst_number', v)}
                  placeholder="e.g. 29ABCDE1234F1Z5"
                  placeholderTextColor="#94A3B8"
                />

                <Text style={styles.inputLabel}>Registered Pharmacist / Owner</Text>
                <TextInput
                  style={styles.input}
                  value={profile.owner_details || ''}
                  onChangeText={(v) => handleFieldChange('owner_details', v)}
                  placeholder="e.g. Rahul Sharma (Reg: PH-9821)"
                  placeholderTextColor="#94A3B8"
                />
              </CardContent>
            </Card>

            {/* Location & Contact Information */}
            <Card style={styles.card}>
              <CardContent>
                <Text style={styles.cardTitle}>Location & Operating Details</Text>

                <Text style={styles.inputLabel}>Physical Pharmacy Address *</Text>
                <TextInput
                  style={styles.input}
                  value={profile.address || ''}
                  onChangeText={(v) => handleFieldChange('address', v)}
                  placeholder="Shop number, building, street..."
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
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Contact Phone</Text>
                    <TextInput
                      style={styles.input}
                      value={profile.contact_number || profile.phone_number || ''}
                      onChangeText={(v) => handleFieldChange('contact_number', v)}
                      placeholder="+91 98765 43210"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={[styles.col, { marginRight: 8 }]}>
                    <Text style={styles.inputLabel}>Operating Hours</Text>
                    <TextInput
                      style={styles.input}
                      value={profile.operating_hours || ''}
                      onChangeText={(v) => handleFieldChange('operating_hours', v)}
                      placeholder="08:00 AM - 10:00 PM"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Working Days</Text>
                    <TextInput
                      style={styles.input}
                      value={profile.working_days || ''}
                      onChangeText={(v) => handleFieldChange('working_days', v)}
                      placeholder="Mon - Sat"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                <Button
                  title="Save Pharmacy Profile"
                  loading={saving}
                  onPress={handleSaveProfile}
                  style={{ marginTop: 16 }}
                />
              </CardContent>
            </Card>

            {/* Blockchain Audit Status Card */}
            {profile.blockchain_status ? (
              <Card style={styles.card}>
                <CardContent>
                  <View style={styles.sectionHeaderBetween}>
                    <Text style={styles.cardTitle}>Blockchain Ledger Verification</Text>
                    <View style={styles.activePill}>
                      <Text style={styles.activePillText}>{profile.blockchain_status}</Text>
                    </View>
                  </View>
                  <Text style={styles.blockchainInfo}>
                    This pharmacy establishment is recorded on the tamper-proof MedSync healthcare ledger for verified prescription fulfillment and medicine pedigree tracking.
                  </Text>
                  {profile.blockchain_tx_hash ? (
                    <Text style={styles.txHashText} numberOfLines={1}>
                      Tx Hash: {profile.blockchain_tx_hash}
                    </Text>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            {/* Sign Out Button */}
            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
              <LogOut size={18} color="#DC2626" style={{ marginRight: 8 }} />
              <Text style={styles.signOutText}>Sign Out of Pharmacy Account</Text>
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
                <Lock size={22} color={Colors.roles.pharmacy.primary} />
              </View>

              <Text style={styles.modalTitle}>
                {pinStatus.has_pin ? 'Reset Authorization PIN' : 'Enroll 6-Digit PIN'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {pinStatus.has_pin
                  ? 'Enter your current account password along with your new 6-digit staff PIN.'
                  : 'Enroll a secure 6-digit PIN to authenticate prescription dispensing and restock orders.'}
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
              role="pharmacy"
              verifyHandler={(t) => pharmacyService.verifyPrescriptionQR(t)}
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
    backgroundColor: '#FEF3C7',
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
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  headerTextCol: {
    flex: 1,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  licenseSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  statusRow: {
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
  qrHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  qrIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  qrTokenText: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  activePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#D1FAE5',
    borderRadius: 6,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  qrExplanation: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginTop: 4,
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
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  pinStatusText: {
    fontSize: 12,
    color: '#64748B',
  },
  pinNote: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginTop: 4,
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
  inputLabel: {
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
  sectionHeaderBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  blockchainInfo: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginTop: 2,
  },
  txHashText: {
    fontSize: 11,
    color: '#0284C7',
    marginTop: 6,
    fontFamily: 'monospace',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginTop: 8,
    marginBottom: 20,
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
    backgroundColor: '#FEF3C7',
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
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 14,
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
    marginTop: 8,
  },
  modalPinInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 20,
    letterSpacing: 6,
    textAlign: 'center',
    color: '#0F172A',
  },
  modalPassInput: {
    backgroundColor: '#FFFFFF',
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
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 18,
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
