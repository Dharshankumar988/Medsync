import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Heart,
  Calendar,
  FileText,
  Pill,
  ChevronRight,
  AlertCircle,
  Scan,
  Bell,
  Sparkles,
  QrCode,
  Truck,
  Sun,
  Moon,
  ShieldCheck,
  Stethoscope,
  Activity,
  Plus,
  ArrowUpRight,
} from 'lucide-react-native';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { Avatar } from '../../../components/common/Avatar';
import { patientService, PatientDashboardSummary } from '../../../services/patient.service';
import { useRole } from '../../../providers/role-provider';
import { useTheme } from '../../../context/ThemeContext';
import { PaymentStyleQRScanner } from '../../../components/patient/PaymentStyleQRScanner';
import { CompleteHealthProfileModal } from '../../../components/patient/CompleteHealthProfileModal';
import { HealthProfilePromptModal } from '../../../components/patient/HealthProfilePromptModal';
import { AppointmentsAndOrdersOverview } from '../../../components/patient/AppointmentsAndOrdersOverview';
import { DeliveryTrackingModal } from '../../../components/patient/DeliveryTrackingModal';
import { UploadRecordModal } from '../../../components/patient/UploadRecordModal';
import { OrderMedicinesModal } from '../../../components/patient/OrderMedicinesModal';
import { PrescriptionQRModal } from '../../../components/patient/PrescriptionQRModal';
import { AppointmentItem, MedicineOrderItem } from '../../../services/patient.service';

// Web parity: Session storage cache for dismissed profile prompt
const sessionDismissedProfiles = new Set<string>();

export default function PatientDashboard() {
  const router = useRouter();
  const { user } = useRole();
  const { theme, isDark, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile & Vitals
  const [profile, setProfile] = useState<any>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showProfileEditorModal, setShowProfileEditorModal] = useState(false);

  // Modals
  const [qrScannerVisible, setQrScannerVisible] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [passportQrVisible, setPassportQrVisible] = useState(false);

  // Notifications
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Appointments & Orders Overview
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [orders, setOrders] = useState<MedicineOrderItem[]>([]);
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<MedicineOrderItem | null>(null);

  // Summary
  const [summary, setSummary] = useState<PatientDashboardSummary>({
    upcomingAppointmentsCount: 0,
    totalRecordsCount: 0,
    activePrescriptionsCount: 0,
    ongoingOrdersCount: 0,
    nextAppointment: null,
    recentRecords: [],
    recentPrescriptions: [],
    recentOrders: [],
  });

  // Time-aware greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const patientDisplayName = useMemo(() => {
    if (profile?.full_name) return profile.full_name;
    if (user?.full_name) return user.full_name;
    if (user?.email) return user.email.split('@')[0];
    return 'Patient';
  }, [profile, user]);

  const userAvatarUrl = useMemo(() => {
    return (
      profile?.profile_picture_url ||
      (user as any)?.profile_picture_url ||
      (user as any)?.profile_image_url ||
      (user?.user_metadata as any)?.avatar_url ||
      (user?.user_metadata as any)?.picture ||
      null
    );
  }, [profile, user]);

  const userInitials = useMemo(() => {
    const name = patientDisplayName || 'Patient';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }, [patientDisplayName]);

  const loadDashboardData = useCallback(async () => {
    try {
      setError(null);
      const [sumData, profData, notifs, appts, orderList] = await Promise.all([
        patientService.getDashboardSummary(),
        user?.id ? patientService.getProfile(user.id).catch(() => null) : null,
        patientService.getNotifications(true).catch(() => []),
        patientService.getAppointments().catch(() => []),
        patientService.getMedicineOrders().catch(() => []),
      ]);

      setSummary(sumData);
      setProfile(profData);
      setUnreadNotifCount(Array.isArray(notifs) ? notifs.length : 0);
      setAppointments(appts || []);
      setOrders(orderList || []);

      // Web parity: Prompt to complete profile if DOB, Gender, or Blood Group is missing
      const isMissingMandatoryInfo =
        !profData || !profData.date_of_birth || !profData.gender || !profData.blood_group;
      const isDismissed = user?.id ? sessionDismissedProfiles.has(user.id) : false;

      if (isMissingMandatoryInfo && !isDismissed) {
        setShowPromptModal(true);
      }
    } catch (err: any) {
      console.warn('Dashboard fetch error:', err);
      setError(err?.message || 'Unable to load live records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  const handleDismissPrompt = useCallback(() => {
    if (user?.id) {
      sessionDismissedProfiles.add(user.id);
    }
    setShowPromptModal(false);
  }, [user?.id]);

  const handleCompleteNow = useCallback(() => {
    setShowPromptModal(false);
    setShowProfileEditorModal(true);
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  const nextAppt = summary.nextAppointment;

  return (
    <RoleGuard allowedRole="patient">
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* ── Top Header Bar (Payment App Style) ── */}
        <View
          style={[
            styles.headerBar,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <TouchableOpacity
            style={styles.profileRow}
            onPress={() => router.push('/(tabs)/patient/profile')}
            activeOpacity={0.8}
          >
            <Avatar src={userAvatarUrl} fallback={userInitials} size={44} />
            <View style={{ marginLeft: 12, flexShrink: 1 }}>
              <Text style={[styles.greetingText, { color: theme.textMuted }]}>
                {greeting},
              </Text>
              <Text
                style={[styles.patientNameText, { color: theme.text }]}
                numberOfLines={1}
              >
                {patientDisplayName}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.headerRightActions}>
            {/* Theme Switcher Button */}
            <TouchableOpacity
              style={[
                styles.iconButton,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              onPress={toggleTheme}
              activeOpacity={0.8}
              accessibilityLabel="Toggle Theme"
            >
              {isDark ? (
                <Sun size={18} color="#FAFAFA" />
              ) : (
                <Moon size={18} color="#09090B" />
              )}
            </TouchableOpacity>

            {/* Notification Bell */}
            <TouchableOpacity
              style={[
                styles.iconButton,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              onPress={() => router.push('/(tabs)/patient/profile')}
              activeOpacity={0.8}
            >
              <Bell size={18} color={theme.text} />
              {unreadNotifCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
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
          {error && (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
                },
              ]}
            >
              <AlertCircle size={16} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* ── 1. Digital Health Card (Hero Card - Apple/GPay Wallet Style) ── */}
          <View
            style={[
              styles.healthCard,
              {
                backgroundColor: isDark ? '#141418' : '#09090B',
                borderColor: isDark ? '#27272A' : '#18181B',
              },
            ]}
          >
            {/* Card Top Row */}
            <View style={styles.healthCardHeader}>
              <View style={styles.cardBrandBadge}>
                <Image
                  source={require('../../../assets/images/app-logo.png')}
                  style={styles.cardLogoIcon}
                  resizeMode="contain"
                />
                <Text style={styles.cardBrandText}>MEDSYNC HEALTH PASS</Text>
              </View>
              <View style={styles.verifiedBadge}>
                <ShieldCheck size={13} color="#38BDF8" />
                <Text style={styles.verifiedText}>Polygon Verified</Text>
              </View>
            </View>

            {/* Card Middle: Patient Info */}
            <View style={styles.cardBody}>
              <Text style={styles.cardPatientName}>
                {patientDisplayName.toUpperCase()}
              </Text>
              <View style={styles.cardMetaRow}>
                <View style={styles.metaPill}>
                  <Text style={styles.metaPillLabel}>Blood:</Text>
                  <Text style={styles.metaPillValue}>
                    {profile?.blood_group || 'O+'}
                  </Text>
                </View>
                <View style={styles.metaPill}>
                  <Text style={styles.metaPillLabel}>Gender:</Text>
                  <Text style={styles.metaPillValue}>
                    {profile?.gender ? profile.gender.toUpperCase() : 'MALE'}
                  </Text>
                </View>
                <View style={styles.metaPill}>
                  <Text style={styles.metaPillLabel}>ABHA:</Text>
                  <Text style={styles.metaPillValue}>
                    {profile?.id ? `91-${profile.id.substring(0, 8)}` : '91-8842-9912'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Card Actions: 2 Quick Touch Buttons */}
            <View style={styles.cardActionRow}>
              <TouchableOpacity
                style={styles.cardPrimaryBtn}
                onPress={() => setQrScannerVisible(true)}
                activeOpacity={0.88}
              >
                <Scan size={16} color="#09090B" strokeWidth={2.5} />
                <Text style={styles.cardPrimaryBtnText}>Scan Hospital / Rx</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cardSecondaryBtn}
                onPress={() => setPassportQrVisible(true)}
                activeOpacity={0.8}
              >
                <QrCode size={16} color="#FAFAFA" />
                <Text style={styles.cardSecondaryBtnText}>My Health QR</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── 2. Primary Quick Actions Grid (Payment App 4-Key Services) ── */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Quick Services
            </Text>
          </View>

          <View style={styles.servicesGrid}>
            {/* Action 1: Book Doctor Visit */}
            <TouchableOpacity
              style={[
                styles.serviceTile,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              onPress={() => router.push('/(tabs)/patient/appointments')}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.serviceIconBox,
                  { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.12)' : '#F0F9FF' },
                ]}
              >
                <Calendar size={22} color={isDark ? '#38BDF8' : '#0284C7'} />
              </View>
              <Text style={[styles.serviceTitle, { color: theme.text }]}>
                Book Visit
              </Text>
              <Text style={[styles.serviceDesc, { color: theme.textMuted }]}>
                Doctors & Clinics
              </Text>
            </TouchableOpacity>

            {/* Action 2: Order Medicines */}
            <TouchableOpacity
              style={[
                styles.serviceTile,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              onPress={() => setOrderModalVisible(true)}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.serviceIconBox,
                  { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.12)' : '#ECFDF5' },
                ]}
              >
                <Pill size={22} color={isDark ? '#34D399' : '#059669'} />
              </View>
              <Text style={[styles.serviceTitle, { color: theme.text }]}>
                Order Meds
              </Text>
              <Text style={[styles.serviceDesc, { color: theme.textMuted }]}>
                Pharmacy Delivery
              </Text>
            </TouchableOpacity>

            {/* Action 3: Pulse AI Copilot */}
            <TouchableOpacity
              style={[
                styles.serviceTile,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              onPress={() => router.push('/(tabs)/patient/pulse-ai')}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.serviceIconBox,
                  { backgroundColor: isDark ? 'rgba(168, 85, 247, 0.12)' : '#FAF5FF' },
                ]}
              >
                <Sparkles size={22} color={isDark ? '#C084FC' : '#7C3AED'} />
              </View>
              <Text style={[styles.serviceTitle, { color: theme.text }]}>
                Pulse AI
              </Text>
              <Text style={[styles.serviceDesc, { color: theme.textMuted }]}>
                Symptom Triage
              </Text>
            </TouchableOpacity>

            {/* Action 4: Upload EHR Records */}
            <TouchableOpacity
              style={[
                styles.serviceTile,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              onPress={() => setUploadModalVisible(true)}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.serviceIconBox,
                  { backgroundColor: isDark ? 'rgba(251, 146, 60, 0.12)' : '#FFF7ED' },
                ]}
              >
                <FileText size={22} color={isDark ? '#FB923C' : '#EA580C'} />
              </View>
              <Text style={[styles.serviceTitle, { color: theme.text }]}>
                Upload EHR
              </Text>
              <Text style={[styles.serviceDesc, { color: theme.textMuted }]}>
                Encrypt to Vault
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── 3. Next Appointment Banner (if scheduled) ── */}
          {nextAppt && (
            <TouchableOpacity
              style={[
                styles.upcomingApptCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              onPress={() => router.push('/(tabs)/patient/appointments')}
              activeOpacity={0.85}
            >
              <View style={styles.apptIconBox}>
                <Stethoscope size={20} color="#2563EB" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.apptLabel, { color: theme.textMuted }]}>
                  UPCOMING APPOINTMENT
                </Text>
                <Text style={[styles.apptDoctorName, { color: theme.text }]}>
                  {nextAppt.doctor_name || 'Medical Specialist'}
                </Text>
                <Text style={[styles.apptTime, { color: theme.textSecondary }]}>
                  {new Date(nextAppt.appointment_date).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  at {nextAppt.time_slot}
                </Text>
              </View>
              <ChevronRight size={18} color={theme.textMuted} />
            </TouchableOpacity>
          )}

          {/* ── 4. Appointments & Orders Overview (Interactive Schedule Calendar with Legend & Orders) ── */}
          <AppointmentsAndOrdersOverview
            appointments={appointments}
            orders={orders}
            onSelectOrderForTracking={(ord) => setSelectedOrderForTracking(ord)}
            onRefresh={loadDashboardData}
          />

          {/* ── 5. Quick Access to Records & Prescriptions Hub ── */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Clinical Hub
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/patient/records')}>
              <Text style={[styles.sectionLink, { color: theme.text }]}>
                View All <ArrowUpRight size={13} color={theme.text} />
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.hubActionCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
            onPress={() => router.push('/(tabs)/patient/records')}
            activeOpacity={0.85}
          >
            <View style={styles.hubIconBox}>
              <FileText size={22} color={theme.text} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.hubTitle, { color: theme.text }]}>
                Prescriptions & Documents
              </Text>
              <Text style={[styles.hubDesc, { color: theme.textMuted }]}>
                {summary.activePrescriptionsCount} Active Rx • PIN-Protected Vault
              </Text>
            </View>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </ScrollView>

        {/* ── Modals ── */}
        <PaymentStyleQRScanner
          visible={qrScannerVisible}
          onClose={() => setQrScannerVisible(false)}
        />

        {/* ── Health Profile Prompt Modal (First Login / Incomplete Mandatory Info) ── */}
        <HealthProfilePromptModal
          visible={showPromptModal}
          onClose={handleDismissPrompt}
          onCompleteNow={handleCompleteNow}
        />

        {/* ── Complete Health Profile Full Editor Modal ── */}
        <CompleteHealthProfileModal
          visible={showProfileEditorModal}
          userId={user?.id || ''}
          initialData={profile}
          onClose={() => setShowProfileEditorModal(false)}
          onCompleted={() => {
            setShowProfileEditorModal(false);
            if (user?.id) {
              sessionDismissedProfiles.add(user.id);
            }
            loadDashboardData();
          }}
        />

        <UploadRecordModal
          visible={uploadModalVisible}
          onClose={() => setUploadModalVisible(false)}
          onSuccess={() => {
            setUploadModalVisible(false);
            loadDashboardData();
          }}
        />

        <OrderMedicinesModal
          visible={orderModalVisible}
          onClose={() => setOrderModalVisible(false)}
          onSuccess={() => {
            setOrderModalVisible(false);
            loadDashboardData();
          }}
        />

        {/* ── Live Delivery Tracking Modal ── */}
        <DeliveryTrackingModal
          visible={!!selectedOrderForTracking}
          orderId={selectedOrderForTracking?.id}
          trackingNumber={selectedOrderForTracking?.tracking_number}
          onClose={() => setSelectedOrderForTracking(null)}
        />

        <PrescriptionQRModal
          visible={passportQrVisible}
          onClose={() => setPassportQrVisible(false)}
          prescription={{
            id: profile?.id || 'MEDSYNC-PASS',
            diagnosis: 'MedSync Verified Health Passport',
            patient_id: profile?.id,
            doctor_name: 'MedSync Sovereign Protocol',
            created_at: new Date().toISOString(),
            medications: [],
          }}
        />
      </View>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    paddingTop: Platform.OS === 'ios' ? 56 : 38,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  greetingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  patientNameText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
    flex: 1,
  },

  /* ── Digital Health Card ── */
  healthCard: {
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
    marginBottom: 24,
  },
  healthCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardBrandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardLogoIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  cardBrandText: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  verifiedText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
  },
  cardBody: {
    marginBottom: 20,
  },
  cardPatientName: {
    color: '#FAFAFA',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  cardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  metaPillLabel: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '500',
  },
  metaPillValue: {
    color: '#FAFAFA',
    fontSize: 11,
    fontWeight: '700',
  },
  cardActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cardPrimaryBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  cardPrimaryBtnText: {
    color: '#09090B',
    fontSize: 13,
    fontWeight: '700',
  },
  cardSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  cardSecondaryBtnText: {
    color: '#FAFAFA',
    fontSize: 13,
    fontWeight: '600',
  },

  /* ── Section Header ── */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
    flexDirection: 'row',
    alignItems: 'center',
  },

  /* ── Services Grid ── */
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  serviceTile: {
    width: '48%',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  serviceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  serviceDesc: {
    fontSize: 11,
    fontWeight: '500',
  },

  /* ── Upcoming Appt Card ── */
  upcomingApptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 24,
  },
  apptIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  apptLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  apptDoctorName: {
    fontSize: 14,
    fontWeight: '700',
  },
  apptTime: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },

  /* ── Vitals Scroll ── */
  vitalsScroll: {
    gap: 12,
    paddingRight: 10,
    marginBottom: 24,
  },
  vitalCard: {
    width: 145,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  vitalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  vitalIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vitalStatusBadge: {
    fontSize: 11,
    fontWeight: '700',
  },
  vitalLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  vitalValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  vitalUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: '#A1A1AA',
  },

  /* ── Hub Card ── */
  hubActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
  },
  hubIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  hubDesc: {
    fontSize: 12,
    fontWeight: '500',
  },
});
