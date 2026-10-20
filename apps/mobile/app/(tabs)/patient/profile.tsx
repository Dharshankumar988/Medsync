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
} from 'lucide-react-native';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { QRScanner } from '../../../components/common/QRScanner';
import { useRole } from '../../../providers/role-provider';
import { patientService, SecurityStatusInfo } from '../../../services/patient.service';
import { Colors } from '../../../constants/theme';

export default function PatientProfileScreen() {
  const { user } = useRole();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [securityStatus, setSecurityStatus] = useState<SecurityStatusInfo | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [qrModalVisible, setQrModalVisible] = useState(false);

  // Edit profile state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [editEmergencyName, setEditEmergencyName] = useState('');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState('');
  const [editBloodGroup, setEditBloodGroup] = useState('');
  const [editAllergies, setEditAllergies] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // PIN modal state
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [pinSaving, setPinSaving] = useState(false);
  const [pinError, setPinError] = useState('');

  const loadProfileData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [profData, secData, notifData] = await Promise.all([
        patientService.getProfile(user.id),
        patientService.getSecurityStatus().catch(() => null),
        patientService.getNotifications(false).catch(() => []),
      ]);

      setProfile(profData);
      setSecurityStatus(secData);
      setNotifications(notifData);

      if (profData) {
        setEditPhone(profData.phone_number || profData.contact_number || '');
        setEditEmergencyName(profData.emergency_contact_name || '');
        setEditEmergencyPhone(profData.emergency_contact_number || '');
        setEditBloodGroup(profData.blood_group || '');
        setEditAllergies(profData.allergies || '');
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
      Alert.alert('Profile Saved', 'Your medical profile has been updated in the database.');
      loadProfileData();
    } catch (err: any) {
      Alert.alert('Save Failed', err.response?.data?.detail || err.message || 'Could not update profile.');
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
        Alert.alert('PIN Reset', 'Your 6-digit Authorization PIN has been reset successfully.');
      } else {
        await patientService.enrollPin(newPin);
        Alert.alert('PIN Enrolled', 'Your 6-digit Authorization PIN has been configured.');
      }
      setPinModalVisible(false);
      setNewPin('');
      setCurrentPassword('');
      loadProfileData();
    } catch (err: any) {
      setPinError(err.response?.data?.detail || err.message || 'PIN configuration failed.');
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
      console.warn('Could not mark notification as read:', err);
    }
  };

  return (
    <RoleGuard allowedRole="patient">
      <View style={styles.container}>
        <ScreenHeader title="Patient Profile" subtitle="Account, credentials & security PIN" />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.roles.patient.primary]} />}
        >
          {/* Identity Card */}
          <Card style={styles.card}>
            <CardContent>
              <View style={styles.identityHeader}>
                <View style={styles.avatarCircle}>
                  <User size={30} color={Colors.roles.patient.primary} />
                </View>
                <View style={styles.identityText}>
                  <Text style={styles.fullName}>
                    {profile?.full_name || user?.full_name || user?.email?.split('@')[0] || 'Patient'}
                  </Text>
                  <Text style={styles.emailText}>{user?.email}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>ACTIVE PATIENT</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => setEditModalVisible(true)}
                  accessibilityLabel="Edit Profile"
                >
                  <Edit2 size={16} color={Colors.roles.patient.primary} />
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
                  <Text style={styles.infoValue}>
                    {profile?.blood_group || 'Not specified'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <AlertCircle size={15} color="#F59E0B" />
                  <Text style={styles.infoLabel}>Allergies:</Text>
                  <Text style={styles.infoValue}>
                    {profile?.allergies || 'None documented'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <User size={15} color="#8B5CF6" />
                  <Text style={styles.infoLabel}>Emergency:</Text>
                  <Text style={styles.infoValue}>
                    {profile?.emergency_contact_name
                      ? `${profile.emergency_contact_name} (${profile.emergency_contact_number || 'No phone'})`
                      : 'None configured'}
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>

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
                    iconLeft={<Key size={14} color={Colors.roles.patient.primary} />}
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

          {/* QR Verification Section */}
          <Text style={styles.sectionTitle}>QR Verification & Authenticity</Text>
          <Card style={styles.card}>
            <CardContent>
              <View style={styles.securityHeader}>
                <View style={[styles.securityIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                  <ScanLine size={22} color={Colors.roles.patient.primary} />
                </View>
                <View style={styles.securityDetails}>
                  <Text style={styles.securityTitle}>Verify Prescription & Record QR</Text>
                  <Text style={styles.securitySubtitle}>
                    Scan or manually verify MedSync cryptographic QR tokens directly against the backend.
                  </Text>
                </View>
              </View>

              <Button
                title="Scan or Verify QR"
                variant="outline"
                size="sm"
                iconLeft={<ScanLine size={14} color={Colors.roles.patient.primary} />}
                onPress={() => setQrModalVisible(true)}
                style={styles.pinBtn}
              />
            </CardContent>
          </Card>

          {/* In-App Notifications Section */}
          <Text style={styles.sectionTitle}>Recent Notifications</Text>
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

          <View style={{ height: 32 }} />
        </ScrollView>

        {/* Edit Profile Modal */}
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

        {/* PIN Management Modal */}
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
                <Lock size={24} color={Colors.roles.patient.primary} />
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

        {/* QR Verification Modal */}
        <Modal
          visible={qrModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setQrModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>QR Verification</Text>
              <TouchableOpacity onPress={() => setQrModalVisible(false)}>
                <X size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
              <QRScanner />
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
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityText: {
    flex: 1,
  },
  fullName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  emailText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 6,
    paddingHorizontal: 2,
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
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityDetails: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 15,
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
    backgroundColor: Colors.roles.patient.primary,
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
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
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
