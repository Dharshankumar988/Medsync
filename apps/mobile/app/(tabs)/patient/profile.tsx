import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Switch,
  Linking,
  Platform,
} from 'react-native';
import {
  User,
  Shield,
  Key,
  Bell,
  CheckCircle2,
  AlertCircle,
  Phone,
  Heart,
  Edit2,
  X,
  Lock,
  ScanLine,
  Fingerprint,
  PhoneCall,
  LogOut,
  Stethoscope,
  ChevronRight,
  ExternalLink,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { useRole } from '../../../providers/role-provider';
import { patientService, SecurityStatusInfo } from '../../../services/patient.service';
import { biometricsService } from '../../../lib/biometrics';
import { PaymentStyleQRScanner } from '../../../components/patient/PaymentStyleQRScanner';
import { Colors } from '../../../constants/theme';
import { formatErrorMessage } from '../../../lib/api';
import api from '../../../lib/api';

export default function PatientProfileScreen() {
  const router = useRouter();
  const { user, logout } = useRole();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [securityStatus, setSecurityStatus] = useState<SecurityStatusInfo | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);

  // Biometrics
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  // Modals
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [editEmergencyName, setEditEmergencyName] = useState('');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState('');
  const [editBloodGroup, setEditBloodGroup] = useState('');
  const [editAllergies, setEditAllergies] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // PIN modal
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [pinSaving, setPinSaving] = useState(false);
  const [pinError, setPinError] = useState('');

  const loadProfileData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [profData, secData, notifData, bioAvail, bioEnab] = await Promise.all([
        patientService.getProfile(user.id),
        patientService.getSecurityStatus().catch(() => null),
        patientService.getNotifications(false).catch(() => []),
        biometricsService.isAvailable(),
        biometricsService.isEnabled(),
      ]);

      setProfile(profData);
      setSecurityStatus(secData);
      setNotifications(Array.isArray(notifData) ? notifData : []);
      setBiometricsAvailable(bioAvail.available);
      setBiometricsEnabled(bioEnab);

      if (profData) {
        setEditPhone(profData.phone_number || profData.contact_number || '');
        setEditEmergencyName(profData.emergency_contact_name || '');
        setEditEmergencyPhone(profData.emergency_contact_number || '');
        setEditBloodGroup(profData.blood_group || '');
        setEditAllergies(profData.allergies || '');
      }

      // Fetch Referrals
      try {
        const refRes = await api.get('/doctor-collaboration/patient/referrals');
        if (Array.isArray(refRes.data?.data)) {
          setReferrals(refRes.data.data);
        }
      } catch {
        // Fallback: empty referrals
      }
    } catch (err) {
      console.warn('Error loading patient profile:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfileData();
  }, [loadProfileData]);

  const handleToggleBiometrics = async (value: boolean) => {
    if (value) {
      const auth = await biometricsService.authenticate('Confirm Face ID / Fingerprint to enable biometric sign-in');
      if (auth.success) {
        await biometricsService.setEnabled(true);
        setBiometricsEnabled(true);
        Alert.alert('Biometrics Enabled', 'You can now sign in using your device biometrics.');
      }
    } else {
      await biometricsService.setEnabled(false);
      setBiometricsEnabled(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setEditSaving(true);
    try {
      await patientService.updateProfile(user.id, {
        phone_number: editPhone.trim(),
        emergency_contact_name: editEmergencyName.trim(),
        emergency_contact_number: editEmergencyPhone.trim(),
        blood_group: editBloodGroup.trim(),
        allergies: editAllergies.trim(),
      });
      setEditModalVisible(false);
      Alert.alert('Profile Saved', 'Your medical profile has been updated.');
      loadProfileData();
    } catch (err: any) {
      Alert.alert('Save Failed', formatErrorMessage(err));
    } finally {
      setEditSaving(false);
    }
  };

  const handleSavePin = async () => {
    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
      setPinError('PIN must be exactly 6 numeric digits.');
      return;
    }

    if (isResetMode && !currentPassword) {
      setPinError('Current account password is required to reset PIN.');
      return;
    }

    setPinSaving(true);
    setPinError('');

    try {
      if (isResetMode) {
        await patientService.resetPinWithPassword(currentPassword, newPin);
        Alert.alert('PIN Reset', 'Your 6-digit Authorization PIN has been updated.');
      } else {
        await patientService.enrollPin(newPin);
        Alert.alert('PIN Enrolled', 'Your 6-digit Authorization PIN has been activated.');
      }
      setPinModalVisible(false);
      setNewPin('');
      setCurrentPassword('');
      loadProfileData();
    } catch (err: any) {
      setPinError(formatErrorMessage(err));
    } finally {
      setPinSaving(false);
    }
  };

  const handleMarkNotificationRead = async (notifId: string) => {
    try {
      await patientService.markNotificationRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.warn('Could not mark notification read:', err);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of MedSync Vault?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <RoleGuard allowedRole="patient">
      <View style={styles.container}>
        <ScreenHeader
          title="Patient Vault"
          subtitle="Account credentials, PIN security & vitals"
          rightElement={
            <TouchableOpacity
              style={styles.headerQrBtn}
              onPress={() => setQrModalVisible(true)}
              activeOpacity={0.85}
            >
              <ScanLine size={16} color="#FFFFFF" />
              <Text style={styles.headerQrText}>My QR</Text>
            </TouchableOpacity>
          }
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#2563EB']}
              tintColor="#2563EB"
            />
          }
        >
          {/* Identity Card */}
          <Card style={styles.card}>
            <CardContent>
              <View style={styles.identityHeader}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitials}>
                    {(profile?.full_name || user?.full_name || 'PT').substring(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.identityText}>
                  <Text style={styles.fullName}>
                    {profile?.full_name || user?.full_name || 'MedSync Patient'}
                  </Text>
                  <Text style={styles.emailText}>{user?.email}</Text>
                  <View style={styles.statusBadge}>
                    <CheckCircle2 size={11} color="#10B981" />
                    <Text style={styles.statusBadgeText}>VERIFIED PATIENT VAULT</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => setEditModalVisible(true)}
                  accessibilityLabel="Edit Profile"
                >
                  <Edit2 size={16} color="#2563EB" />
                </TouchableOpacity>
              </View>

              <View style={styles.infoGrid}>
                <View style={styles.infoRow}>
                  <Phone size={15} color="#64748B" />
                  <Text style={styles.infoLabel}>Contact:</Text>
                  <Text style={styles.infoValue}>
                    {profile?.phone_number || profile?.contact_number || 'Not provided'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Heart size={15} color="#EF4444" />
                  <Text style={styles.infoLabel}>Blood Group:</Text>
                  <Text style={[styles.infoValue, { fontWeight: '700', color: '#2563EB' }]}>
                    {profile?.blood_group || 'O+'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <AlertCircle size={15} color="#F59E0B" />
                  <Text style={styles.infoLabel}>Allergies:</Text>
                  <Text style={styles.infoValue}>
                    {profile?.allergies || 'None documented'}
                  </Text>
                </View>

                {profile?.emergency_contact_number ? (
                  <View style={styles.emergencyContactCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.emergencyLabel}>Emergency Contact</Text>
                      <Text style={styles.emergencyName}>
                        {profile?.emergency_contact_name || 'Designated Contact'}
                      </Text>
                      <Text style={styles.emergencyPhone}>{profile.emergency_contact_number}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.callEmergencyBtn}
                      onPress={() => Linking.openURL(`tel:${profile.emergency_contact_number}`)}
                    >
                      <PhoneCall size={14} color="#FFFFFF" />
                      <Text style={styles.callEmergencyText}>Call</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </CardContent>
          </Card>

          {/* Device Biometrics Setting */}
          {biometricsAvailable && (
            <>
              <Text style={styles.sectionTitle}>Biometric Authentication</Text>
              <Card style={styles.card}>
                <CardContent>
                  <View style={styles.biometricRow}>
                    <View style={styles.biometricIconBox}>
                      <Fingerprint size={22} color="#2563EB" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.biometricTitle}>Device Biometrics</Text>
                      <Text style={styles.biometricSub}>
                        Sign in instantly with your phone&apos;s Face ID or Fingerprint
                      </Text>
                    </View>
                    <Switch
                      value={biometricsEnabled}
                      onValueChange={handleToggleBiometrics}
                      trackColor={{ false: '#E2E8F0', true: '#2563EB' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </CardContent>
              </Card>
            </>
          )}

          {/* Security & PIN Card */}
          <Text style={styles.sectionTitle}>Security & Access Protection</Text>
          <Card style={styles.card}>
            <CardContent>
              <View style={styles.securityHeader}>
                <View style={styles.securityIconBox}>
                  <Shield size={22} color="#10B981" />
                </View>
                <View style={styles.securityDetails}>
                  <Text style={styles.securityTitle}>6-Digit Authorization PIN</Text>
                  <Text style={styles.securitySubtitle}>
                    {securityStatus?.has_pin
                      ? 'Your PIN is active and protects record downloads & bookings.'
                      : 'You have not enrolled an Authorization PIN yet.'}
                  </Text>
                </View>
              </View>

              <View style={styles.pinActionsRow}>
                {securityStatus?.has_pin ? (
                  <Button
                    title="Change Authorization PIN"
                    variant="outline"
                    size="sm"
                    iconLeft={<Key size={14} color="#2563EB" />}
                    onPress={() => {
                      setIsResetMode(true);
                      setPinError('');
                      setNewPin('');
                      setCurrentPassword('');
                      setPinModalVisible(true);
                    }}
                    style={styles.pinBtn}
                  />
                ) : (
                  <Button
                    title="Enroll Authorization PIN"
                    size="sm"
                    iconLeft={<Key size={14} color="#FFFFFF" />}
                    onPress={() => {
                      setIsResetMode(false);
                      setPinError('');
                      setNewPin('');
                      setCurrentPassword('');
                      setPinModalVisible(true);
                    }}
                    style={styles.pinBtn}
                  />
                )}
              </View>
            </CardContent>
          </Card>

          {/* Doctor Referrals (if any) */}
          {referrals.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Doctor Referrals</Text>
              <Card style={styles.card}>
                <CardContent>
                  {referrals.map((ref, i) => (
                    <View key={ref.id || i} style={styles.referralItem}>
                      <Stethoscope size={18} color="#2563EB" />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.referralDoc}>
                          {ref.referred_to_doctor_name || 'Specialist Referral'}
                        </Text>
                        <Text style={styles.referralSub}>
                          From: {ref.referring_doctor_name || 'Primary Physician'} • {ref.specialization || 'Clinical Consult'}
                        </Text>
                      </View>
                      <View style={styles.referralBadge}>
                        <Text style={styles.referralBadgeText}>{ref.status || 'ACTIVE'}</Text>
                      </View>
                    </View>
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          {/* In-App Notifications Section */}
          <Text style={styles.sectionTitle}>Notifications Center</Text>
          <Card style={styles.card}>
            <CardContent>
              {notifications.length > 0 ? (
                notifications.slice(0, 5).map((notif, idx) => (
                  <TouchableOpacity
                    key={notif.id || idx}
                    style={[
                      styles.notifRow,
                      idx === Math.min(notifications.length, 5) - 1 && styles.notifRowLast,
                    ]}
                    onPress={() => !notif.is_read && handleMarkNotificationRead(notif.id)}
                  >
                    <View style={[styles.notifDot, notif.is_read && styles.notifDotRead]} />
                    <View style={styles.notifTextContainer}>
                      <Text style={styles.notifTitle}>{notif.title}</Text>
                      <Text style={styles.notifBody}>{notif.body || notif.message}</Text>
                      <Text style={styles.notifTime}>
                        {notif.created_at ? new Date(notif.created_at).toLocaleDateString() : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyNotifications}>
                  <Bell size={24} color="#94A3B8" />
                  <Text style={styles.emptyNotifTitle}>No New Notifications</Text>
                  <Text style={styles.emptyNotifSub}>System alerts and clinic updates will appear here.</Text>
                </View>
              )}
            </CardContent>
          </Card>

          {/* Sign Out Button */}
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleLogout}
            activeOpacity={0.88}
          >
            <LogOut size={18} color="#EF4444" />
            <Text style={styles.signOutButtonText}>Sign Out of MedSync</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* ── EDIT PROFILE MODAL ── */}
        <Modal
          visible={editModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setEditModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Edit Health Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <X size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="+1 555-0199"
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Blood Group</Text>
              <TextInput
                style={styles.input}
                value={editBloodGroup}
                onChangeText={setEditBloodGroup}
                placeholder="O+, A-, B+, AB+"
                autoCapitalize="characters"
              />

              <Text style={styles.label}>Emergency Contact Name</Text>
              <TextInput
                style={styles.input}
                value={editEmergencyName}
                onChangeText={setEditEmergencyName}
                placeholder="Jane Doe"
              />

              <Text style={styles.label}>Emergency Contact Phone</Text>
              <TextInput
                style={styles.input}
                value={editEmergencyPhone}
                onChangeText={setEditEmergencyPhone}
                placeholder="+1 555-0198"
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Known Allergies</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editAllergies}
                onChangeText={setEditAllergies}
                placeholder="e.g. Penicillin, Peanuts, Latex"
                multiline
              />

              <Button
                title="Save Changes"
                loading={editSaving}
                onPress={handleSaveProfile}
                style={styles.saveBtn}
              />
            </ScrollView>
          </View>
        </Modal>

        {/* ── PIN MODAL ── */}
        <Modal
          visible={pinModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setPinModalVisible(false)}
        >
          <View style={styles.pinModalOverlay}>
            <View style={styles.pinModalDialog}>
              <TouchableOpacity
                style={styles.pinCloseBtn}
                onPress={() => setPinModalVisible(false)}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>

              <View style={styles.pinIconBox}>
                <Lock size={24} color="#2563EB" />
              </View>

              <Text style={styles.pinDialogTitle}>
                {isResetMode ? 'Reset Authorization PIN' : 'Enroll 6-Digit PIN'}
              </Text>
              <Text style={styles.pinDialogSubtitle}>
                {isResetMode
                  ? 'Verify your account password to configure a new Authorization PIN.'
                  : 'Configure a secure 6-digit PIN used to authorize downloads and appointments.'}
              </Text>

              {pinError ? (
                <View style={styles.pinErrorBanner}>
                  <AlertCircle size={14} color="#EF4444" />
                  <Text style={styles.pinErrorText}>{pinError}</Text>
                </View>
              ) : null}

              {isResetMode && (
                <>
                  <Text style={styles.pinInputLabel}>Account Password</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry
                    placeholder="Enter current password"
                    placeholderTextColor="#94A3B8"
                  />
                </>
              )}

              <Text style={styles.pinInputLabel}>
                {isResetMode ? 'New 6-Digit PIN' : 'Enter 6-Digit PIN'}
              </Text>
              <TextInput
                style={[styles.modalTextInput, styles.pinCodeInput]}
                value={newPin}
                onChangeText={(t) => setNewPin(t.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="numeric"
                maxLength={6}
                secureTextEntry
                placeholder="••••••"
                placeholderTextColor="#94A3B8"
              />

              <Button
                title={isResetMode ? 'Verify & Reset PIN' : 'Enroll PIN'}
                loading={pinSaving}
                onPress={handleSavePin}
                disabled={newPin.length !== 6 || (isResetMode && !currentPassword)}
                style={styles.pinSubmitBtn}
              />
            </View>
          </View>
        </Modal>

        {/* ── PAYMENT-STYLE QR SCANNER ── */}
        <PaymentStyleQRScanner
          visible={qrModalVisible}
          onClose={() => setQrModalVisible(false)}
          userProfile={{
            id: user?.id || '',
            full_name: profile?.full_name || user?.full_name || 'Patient',
            email: user?.email,
            blood_group: profile?.blood_group || 'O+',
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
  headerQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  headerQrText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  identityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  identityText: {
    flex: 1,
  },
  fullName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  emailText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
    marginLeft: 4,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoGrid: {
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    minWidth: 85,
  },
  infoValue: {
    fontSize: 13,
    color: '#0F172A',
    flex: 1,
  },
  emergencyContactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.18)',
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
  },
  emergencyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
    textTransform: 'uppercase',
  },
  emergencyName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  emergencyPhone: {
    fontSize: 12,
    color: '#64748B',
  },
  callEmergencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
  },
  callEmergencyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  biometricRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  biometricIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  biometricSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  securityIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityDetails: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  securitySubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  pinActionsRow: {
    marginTop: 4,
  },
  pinBtn: {
    width: '100%',
  },
  referralItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  referralDoc: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  referralSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  referralBadge: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  referralBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  notifRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
    marginTop: 6,
  },
  notifDotRead: {
    backgroundColor: '#CBD5E1',
  },
  notifTextContainer: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  notifBody: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
    lineHeight: 16,
  },
  notifTime: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  emptyNotifications: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyNotifTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginTop: 8,
  },
  emptyNotifSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    height: 50,
    borderRadius: 16,
    marginTop: 10,
    gap: 8,
  },
  signOutButtonText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#EF4444',
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
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalBody: {
    padding: 20,
    gap: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginTop: 6,
  },
  input: {
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
    height: 72,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  saveBtn: {
    marginTop: 20,
  },
  pinModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  pinModalDialog: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  pinCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  pinIconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  pinDialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 4,
  },
  pinDialogSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  pinErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    gap: 8,
    width: '100%',
  },
  pinErrorText: {
    color: '#EF4444',
    fontSize: 12,
    flex: 1,
  },
  pinInputLabel: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    marginTop: 6,
  },
  modalTextInput: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    marginBottom: 10,
  },
  pinCodeInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 10,
    fontWeight: '700',
  },
  pinSubmitBtn: {
    width: '100%',
    marginTop: 14,
  },
});
