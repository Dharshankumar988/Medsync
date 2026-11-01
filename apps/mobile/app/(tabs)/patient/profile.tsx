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
  ActivityIndicator,
  Image,
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
  Sun,
  Moon,
  Camera,
  MapPin,
  Scale,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { useRole } from '../../../providers/role-provider';
import { useTheme } from '../../../context/ThemeContext';
import { patientService, SecurityStatusInfo } from '../../../services/patient.service';
import { biometricsService } from '../../../lib/biometrics';
import { CompleteHealthProfileModal } from '../../../components/patient/CompleteHealthProfileModal';
import { formatErrorMessage } from '../../../lib/api';
import api from '../../../lib/api';

export default function PatientProfileScreen() {
  const router = useRouter();
  const { user, logout } = useRole();
  const { theme, isDark, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [securityStatus, setSecurityStatus] = useState<SecurityStatusInfo | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);

  // Biometrics
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  // Profile Picture Upload
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Health Profile Modal (Comprehensive)
  const [healthModalVisible, setHealthModalVisible] = useState(false);

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
      const auth = await biometricsService.authenticate(
        'Confirm Face ID / Fingerprint to enable biometric sign-in'
      );
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

  // Profile Picture Upload Handler
  const handlePhotoUploadPress = () => {
    Alert.alert(
      'Profile Photo',
      'Choose a picture for your MedSync clinical profile',
      [
        {
          text: 'Choose from Gallery',
          onPress: () => pickImage(false),
        },
        {
          text: 'Take Photo',
          onPress: () => pickImage(true),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const pickImage = async (useCamera: boolean) => {
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is required to take a photo.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Photo library permission is required.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85,
        });
      }

      if (!result.canceled && result.assets?.[0]?.uri) {
        setUploadingPhoto(true);
        const asset = result.assets[0];
        const res = await patientService.uploadProfileImage(
          asset.uri,
          asset.fileName || 'avatar.jpg',
          asset.mimeType || 'image/jpeg'
        );

        if (res?.profile_image_url) {
          setProfile((prev: any) => ({
            ...prev,
            profile_picture_url: res.profile_image_url,
          }));
        }
        Alert.alert('Success', 'Profile photo updated successfully!');
        loadProfileData();
      }
    } catch (err: any) {
      console.warn('Photo upload failed:', err);
      Alert.alert('Upload Failed', err?.message || 'Could not upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSavePin = async () => {
    if (newPin.length !== 6) {
      setPinError('PIN must be exactly 6 digits');
      return;
    }
    if (isResetMode && !currentPassword) {
      setPinError('Password is required to reset your PIN');
      return;
    }

    setPinSaving(true);
    setPinError('');

    try {
      if (isResetMode) {
        await patientService.resetPin({
          password: currentPassword,
          new_pin: newPin,
        });
      } else {
        await patientService.setPin({ pin: newPin });
      }

      setPinModalVisible(false);
      setNewPin('');
      setCurrentPassword('');
      Alert.alert(
        'PIN Saved',
        isResetMode
          ? 'Your Authorization PIN has been reset successfully.'
          : 'Your Authorization PIN has been configured.'
      );
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

  const avatarUrl =
    profile?.profile_picture_url ||
    user?.profile_image_url ||
    (user?.user_metadata as any)?.avatar_url;
  const userInitials = (profile?.full_name || user?.full_name || 'PT').substring(0, 2).toUpperCase();

  return (
    <RoleGuard allowedRole="patient">
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenHeader
          title="Patient Vault"
          subtitle="Account credentials, PIN security & vitals"
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.accent]}
              tintColor={theme.accent}
            />
          }
        >
          {/* ── 1. IDENTITY & HEALTH BADGE CARD ── */}
          <View
            style={[
              styles.cardBox,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.identityHeader}>
              {/* Avatar with Camera Overlay */}
              <TouchableOpacity
                style={styles.avatarWrapper}
                onPress={handlePhotoUploadPress}
                activeOpacity={0.8}
                disabled={uploadingPhoto}
              >
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.avatarFallback,
                      { backgroundColor: isDark ? '#27272A' : '#E4E4E7' },
                    ]}
                  >
                    <Text style={[styles.avatarInitials, { color: theme.text }]}>
                      {userInitials}
                    </Text>
                  </View>
                )}

                {/* Camera upload badge */}
                <View
                  style={[
                    styles.cameraBadge,
                    {
                      backgroundColor: theme.primaryButton,
                      borderColor: theme.card,
                    },
                  ]}
                >
                  {uploadingPhoto ? (
                    <ActivityIndicator size="small" color={theme.primaryButtonText} />
                  ) : (
                    <Camera size={13} color={theme.primaryButtonText} />
                  )}
                </View>
              </TouchableOpacity>

              <View style={styles.identityText}>
                <Text style={[styles.fullName, { color: theme.text }]} numberOfLines={1}>
                  {profile?.full_name || user?.full_name || 'MedSync Patient'}
                </Text>
                <Text style={[styles.emailText, { color: theme.textMuted }]} numberOfLines={1}>
                  {user?.email}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: isDark
                        ? 'rgba(16, 185, 129, 0.15)'
                        : '#ECFDF5',
                      borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
                    },
                  ]}
                >
                  <CheckCircle2 size={11} color="#10B981" />
                  <Text style={styles.statusBadgeText}>VERIFIED PATIENT VAULT</Text>
                </View>
              </View>

              {/* Edit Health Profile Button */}
              <TouchableOpacity
                style={[
                  styles.editBtn,
                  {
                    backgroundColor: isDark ? '#27272A' : '#F4F4F5',
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => setHealthModalVisible(true)}
                accessibilityLabel="Edit Profile"
              >
                <Edit2 size={16} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Quick Clinical Info Row */}
            <View style={[styles.infoGrid, { borderTopColor: theme.border }]}>
              <View style={styles.infoRow}>
                <Phone size={15} color={theme.textMuted} />
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Contact:</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {profile?.phone_number || profile?.contact_number || 'Not provided'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Heart size={15} color="#EF4444" />
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Blood Group:</Text>
                <Text
                  style={[
                    styles.infoValue,
                    { fontWeight: '700', color: isDark ? '#38BDF8' : '#0284C7' },
                  ]}
                >
                  {profile?.blood_group || 'O+'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <AlertCircle size={15} color="#F59E0B" />
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Allergies:</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {profile?.allergies || 'None documented'}
                </Text>
              </View>

              {profile?.chronic_diseases ? (
                <View style={styles.infoRow}>
                  <Shield size={15} color="#10B981" />
                  <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Conditions:</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>
                    {profile.chronic_diseases}
                  </Text>
                </View>
              ) : null}

              {profile?.emergency_contact_number ? (
                <View
                  style={[
                    styles.emergencyContactCard,
                    {
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2',
                      borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FECACA',
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.emergencyLabel}>Emergency Contact</Text>
                    <Text style={[styles.emergencyName, { color: theme.text }]}>
                      {profile?.emergency_contact_name || 'Designated Contact'}
                    </Text>
                    <Text style={[styles.emergencyPhone, { color: theme.textMuted }]}>
                      {profile.emergency_contact_number}
                    </Text>
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
          </View>

          {/* ── 2. APP APPEARANCE SETTING ── */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>App Appearance</Text>
          <View
            style={[
              styles.cardBox,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.biometricRow}>
              <View
                style={[
                  styles.iconBoxSquare,
                  {
                    backgroundColor: isDark ? '#27272A' : '#F4F4F5',
                    borderColor: theme.border,
                  },
                ]}
              >
                {isDark ? (
                  <Moon size={20} color="#FAFAFA" />
                ) : (
                  <Sun size={20} color="#09090B" />
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.cardRowTitle, { color: theme.text }]}>Dark Mode</Text>
                <Text style={[styles.cardRowSub, { color: theme.textMuted }]}>
                  {isDark ? 'Shadcn Dark zinc mode active' : 'Shadcn Light clean mode active'}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: '#E2E8F0', true: '#27272A' }}
                thumbColor={isDark ? '#FAFAFA' : '#09090B'}
              />
            </View>
          </View>

          {/* ── 3. DEVICE BIOMETRICS ── */}
          {biometricsAvailable && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Biometric Authentication
              </Text>
              <View
                style={[
                  styles.cardBox,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.biometricRow}>
                  <View
                    style={[
                      styles.iconBoxSquare,
                      {
                        backgroundColor: isDark ? 'rgba(56, 189, 248, 0.12)' : '#F0F9FF',
                        borderColor: isDark ? 'rgba(56, 189, 248, 0.25)' : '#BAE6FD',
                      },
                    ]}
                  >
                    <Fingerprint size={20} color={isDark ? '#38BDF8' : '#0284C7'} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.cardRowTitle, { color: theme.text }]}>
                      Device Biometrics
                    </Text>
                    <Text style={[styles.cardRowSub, { color: theme.textMuted }]}>
                      Sign in instantly with your phone&apos;s Face ID or Fingerprint
                    </Text>
                  </View>
                  <Switch
                    value={biometricsEnabled}
                    onValueChange={handleToggleBiometrics}
                    trackColor={{ false: '#E2E8F0', true: isDark ? '#38BDF8' : '#0284C7' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
            </>
          )}

          {/* ── 4. SECURITY & PIN ── */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Security & Access Protection
          </Text>
          <View
            style={[
              styles.cardBox,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.securityHeader}>
              <View
                style={[
                  styles.iconBoxSquare,
                  {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
                    borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
                  },
                ]}
              >
                <Shield size={20} color="#10B981" />
              </View>
              <View style={styles.securityDetails}>
                <Text style={[styles.cardRowTitle, { color: theme.text }]}>
                  6-Digit Authorization PIN
                </Text>
                <Text style={[styles.cardRowSub, { color: theme.textMuted }]}>
                  {securityStatus?.has_pin
                    ? 'Your PIN is active and protects record downloads & bookings.'
                    : 'You have not enrolled an Authorization PIN yet.'}
                </Text>
              </View>
            </View>

            <View style={styles.pinActionsRow}>
              {securityStatus?.has_pin ? (
                <TouchableOpacity
                  style={[
                    styles.outlineButton,
                    {
                      borderColor: theme.border,
                      backgroundColor: isDark ? '#27272A' : '#F4F4F5',
                    },
                  ]}
                  onPress={() => {
                    setIsResetMode(true);
                    setPinError('');
                    setNewPin('');
                    setCurrentPassword('');
                    setPinModalVisible(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Key size={14} color={theme.text} style={{ marginRight: 6 }} />
                  <Text style={[styles.outlineButtonText, { color: theme.text }]}>
                    Change Authorization PIN
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: theme.primaryButton },
                  ]}
                  onPress={() => {
                    setIsResetMode(false);
                    setPinError('');
                    setNewPin('');
                    setCurrentPassword('');
                    setPinModalVisible(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Key size={14} color={theme.primaryButtonText} style={{ marginRight: 6 }} />
                  <Text
                    style={[
                      styles.primaryButtonText,
                      { color: theme.primaryButtonText },
                    ]}
                  >
                    Enroll Authorization PIN
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── 5. DOCTOR REFERRALS ── */}
          {referrals.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Doctor Referrals</Text>
              <View
                style={[
                  styles.cardBox,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                {referrals.map((ref, i) => (
                  <View
                    key={ref.id || i}
                    style={[
                      styles.referralItem,
                      { borderBottomColor: theme.border },
                      i === referrals.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <Stethoscope size={18} color="#38BDF8" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.referralDoc, { color: theme.text }]}>
                        {ref.referred_to_doctor_name || 'Specialist Referral'}
                      </Text>
                      <Text style={[styles.referralSub, { color: theme.textMuted }]}>
                        From: {ref.referring_doctor_name || 'Primary Physician'} •{' '}
                        {ref.specialization || 'Clinical Consult'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.referralBadge,
                        {
                          backgroundColor: isDark
                            ? 'rgba(56, 189, 248, 0.15)'
                            : '#F0F9FF',
                        },
                      ]}
                    >
                      <Text style={styles.referralBadgeText}>{ref.status || 'ACTIVE'}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* ── 6. NOTIFICATIONS CENTER ── */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Notifications Center</Text>
          <View
            style={[
              styles.cardBox,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            {notifications.length > 0 ? (
              notifications.slice(0, 5).map((notif, idx) => (
                <TouchableOpacity
                  key={notif.id || idx}
                  style={[
                    styles.notifRow,
                    { borderBottomColor: theme.border },
                    idx === Math.min(notifications.length, 5) - 1 && styles.notifRowLast,
                  ]}
                  onPress={() => !notif.is_read && handleMarkNotificationRead(notif.id)}
                >
                  <View
                    style={[
                      styles.notifDot,
                      {
                        backgroundColor: notif.is_read
                          ? isDark
                            ? '#3F3F46'
                            : '#CBD5E1'
                          : '#38BDF8',
                      },
                    ]}
                  />
                  <View style={styles.notifTextContainer}>
                    <Text style={[styles.notifTitle, { color: theme.text }]}>{notif.title}</Text>
                    <Text style={[styles.notifBody, { color: theme.textMuted }]}>
                      {notif.body || notif.message}
                    </Text>
                    <Text style={[styles.notifTime, { color: theme.textMuted }]}>
                      {notif.created_at ? new Date(notif.created_at).toLocaleDateString() : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyNotifications}>
                <Bell size={24} color={theme.textMuted} />
                <Text style={[styles.emptyNotifTitle, { color: theme.text }]}>
                  No New Notifications
                </Text>
                <Text style={[styles.emptyNotifSub, { color: theme.textMuted }]}>
                  System alerts and clinic updates will appear here.
                </Text>
              </View>
            )}
          </View>

          {/* ── 7. SIGN OUT ── */}
          <TouchableOpacity
            style={[
              styles.signOutButton,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2',
                borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
              },
            ]}
            onPress={handleLogout}
            activeOpacity={0.88}
          >
            <LogOut size={16} color="#EF4444" style={{ marginRight: 8 }} />
            <Text style={styles.signOutButtonText}>Sign Out of MedSync</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* ── COMPREHENSIVE HEALTH PROFILE MODAL ── */}
        <CompleteHealthProfileModal
          visible={healthModalVisible}
          userId={user?.id || ''}
          initialData={profile}
          onClose={() => setHealthModalVisible(false)}
          onCompleted={(updated) => {
            if (updated) setProfile(updated);
            loadProfileData();
          }}
        />

        {/* ── PIN CONFIGURATION MODAL ── */}
        <Modal
          visible={pinModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setPinModalVisible(false)}
        >
          <View style={styles.pinModalOverlay}>
            <View
              style={[
                styles.pinModalDialog,
                {
                  backgroundColor: isDark ? '#141418' : '#FFFFFF',
                  borderColor: theme.border,
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.pinCloseBtn, { borderColor: theme.border }]}
                onPress={() => setPinModalVisible(false)}
              >
                <X size={18} color={theme.textMuted} />
              </TouchableOpacity>

              <View
                style={[
                  styles.pinIconBox,
                  {
                    backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#F0F9FF',
                    borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : '#BAE6FD',
                  },
                ]}
              >
                <Lock size={22} color="#38BDF8" />
              </View>

              <Text style={[styles.pinDialogTitle, { color: theme.text }]}>
                {isResetMode ? 'Reset Authorization PIN' : 'Enroll 6-Digit PIN'}
              </Text>
              <Text style={[styles.pinDialogSubtitle, { color: theme.textMuted }]}>
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
                <View style={{ marginBottom: 12 }}>
                  <Text style={[styles.pinInputLabel, { color: theme.textSecondary }]}>
                    Account Password
                  </Text>
                  <TextInput
                    style={[
                      styles.modalTextInput,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                        color: theme.text,
                      },
                    ]}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry
                    placeholder="Enter current password"
                    placeholderTextColor={theme.inputPlaceholder}
                  />
                </View>
              )}

              <Text style={[styles.pinInputLabel, { color: theme.textSecondary }]}>
                {isResetMode ? 'New 6-Digit PIN' : 'Enter 6-Digit PIN'}
              </Text>
              <TextInput
                style={[
                  styles.modalTextInput,
                  styles.pinCodeInput,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={newPin}
                onChangeText={(t) => setNewPin(t.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="numeric"
                maxLength={6}
                secureTextEntry
                placeholder="••••••"
                placeholderTextColor={theme.inputPlaceholder}
              />

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: theme.primaryButton,
                    marginTop: 14,
                    height: 48,
                  },
                ]}
                onPress={handleSavePin}
                disabled={pinSaving || newPin.length !== 6 || (isResetMode && !currentPassword)}
              >
                <Text
                  style={[
                    styles.primaryButtonText,
                    { color: theme.primaryButtonText },
                  ]}
                >
                  {pinSaving ? 'Saving...' : isResetMode ? 'Verify & Reset PIN' : 'Enroll PIN'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  cardBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  identityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: '800',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityText: {
    flex: 1,
  },
  fullName: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  emailText: {
    fontSize: 12.5,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
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
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoGrid: {
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    minWidth: 85,
  },
  infoValue: {
    fontSize: 13,
    flex: 1,
  },
  emergencyContactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
  },
  emergencyLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#EF4444',
    textTransform: 'uppercase',
  },
  emergencyName: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  emergencyPhone: {
    fontSize: 12,
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
    fontSize: 14,
    fontWeight: '800',
    marginTop: 6,
    paddingHorizontal: 2,
    letterSpacing: 0.2,
  },
  biometricRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBoxSquare: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardRowTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardRowSub: {
    fontSize: 12,
    marginTop: 2,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  securityDetails: {
    flex: 1,
  },
  pinActionsRow: {
    marginTop: 2,
  },
  primaryButton: {
    height: 42,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  outlineButton: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  outlineButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  referralItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  referralDoc: {
    fontSize: 14,
    fontWeight: '700',
  },
  referralSub: {
    fontSize: 12,
    marginTop: 2,
  },
  referralBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  referralBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#38BDF8',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  notifRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  notifTextContainer: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  notifBody: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  notifTime: {
    fontSize: 11,
    marginTop: 4,
  },
  emptyNotifications: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyNotifTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyNotifSub: {
    fontSize: 12,
    marginTop: 2,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 14,
    height: 48,
    marginTop: 4,
  },
  signOutButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#EF4444',
  },
  pinModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pinModalDialog: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  pinCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pinDialogTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  pinDialogSubtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
  },
  pinErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 8,
    padding: 8,
    gap: 6,
    marginBottom: 12,
    width: '100%',
  },
  pinErrorText: {
    fontSize: 12,
    color: '#EF4444',
    flex: 1,
  },
  pinInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  modalTextInput: {
    width: '100%',
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  pinCodeInput: {
    letterSpacing: 10,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
});
