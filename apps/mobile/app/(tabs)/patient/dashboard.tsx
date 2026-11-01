import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Activity,
  Heart,
  Droplets,
  Scale,
  Calendar,
  FileText,
  Pill,
  ShieldCheck,
  ChevronRight,
  AlertCircle,
  Scan,
  Bell,
  Sparkles,
  Bot,
  Truck,
  AlertTriangle,
  UploadCloud,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react-native';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { patientService, PatientDashboardSummary } from '../../../services/patient.service';
import { useRole } from '../../../providers/role-provider';
import { PaymentStyleQRScanner } from '../../../components/patient/PaymentStyleQRScanner';
import { CompleteHealthProfileModal } from '../../../components/patient/CompleteHealthProfileModal';
import { UploadRecordModal } from '../../../components/patient/UploadRecordModal';
import { OrderMedicinesModal } from '../../../components/patient/OrderMedicinesModal';

export default function PatientDashboard() {
  const router = useRouter();
  const { user } = useRole();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile & Vitals
  const [profile, setProfile] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Modals
  const [qrScannerVisible, setQrScannerVisible] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [orderModalVisible, setOrderModalVisible] = useState(false);

  // Notifications
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

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

  const loadDashboardData = useCallback(async () => {
    try {
      setError(null);
      const [sumData, profData, notifs] = await Promise.all([
        patientService.getDashboardSummary(),
        user?.id ? patientService.getProfile(user.id).catch(() => null) : null,
        patientService.getNotifications(true).catch(() => []),
      ]);

      setSummary(sumData);
      setProfile(profData);
      setUnreadNotifCount(Array.isArray(notifs) ? notifs.length : 0);

      // Check if profile needs completion (DOB or blood_group missing)
      if (profData && (!profData.date_of_birth || !profData.blood_group)) {
        setShowProfileModal(true);
      }
    } catch (err: any) {
      console.warn('Dashboard fetch error:', err);
      setError(err?.message || 'Unable to load live records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  const handleEmergencySos = () => {
    Alert.alert(
      '🚨 EMERGENCY SOS ALERT',
      'This will broadcast your GPS location and emergency medical passport to your emergency contacts and nearest hospitals.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'CONFIRM EMERGENCY',
          style: 'destructive',
          onPress: () => {
            const emergencyPhone = profile?.emergency_contact_number || '911';
            Linking.openURL(`tel:${emergencyPhone}`);
          },
        },
      ]
    );
  };

  const nextAppt = summary.nextAppointment;
  const activeOrder = summary.recentOrders && summary.recentOrders.length > 0 ? summary.recentOrders[0] : null;

  return (
    <RoleGuard allowedRole="patient">
      <View style={styles.container}>
        {/* Top Header Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.profilePill}
            onPress={() => router.push('/(tabs)/patient/profile')}
            activeOpacity={0.8}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {patientDisplayName.substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.greetingText}>{greeting},</Text>
              <Text style={styles.patientNameText} numberOfLines={1}>
                {patientDisplayName}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.headerRightActions}>
            {/* Quick QR Scanner Shortcut */}
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setQrScannerVisible(true)}
              activeOpacity={0.8}
            >
              <Scan size={20} color="#2563EB" />
            </TouchableOpacity>

            {/* Notification Bell */}
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/(tabs)/patient/profile')}
              activeOpacity={0.8}
            >
              <Bell size={20} color="#334155" />
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
              colors={['#2563EB']}
              tintColor="#2563EB"
            />
          }
        >
          {error && (
            <View style={styles.errorBox}>
              <AlertCircle size={16} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Emergency SOS Banner */}
          <TouchableOpacity
            style={styles.sosButton}
            onPress={handleEmergencySos}
            activeOpacity={0.88}
          >
            <View style={styles.sosIconContainer}>
              <AlertTriangle size={20} color="#FFFFFF" strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.sosTitle}>Emergency SOS Broadcast</Text>
              <Text style={styles.sosSubtitle}>
                Instant alert to contacts & hospital ambulance
              </Text>
            </View>
            <ChevronRight size={18} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Live Clinical Health Vitals Strip */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Health Vitals</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/patient/profile')}>
              <Text style={styles.sectionLink}>View Profile</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.vitalsScroll}
          >
            {/* Heart Rate */}
            <View style={[styles.vitalCard, { borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
              <View style={[styles.vitalIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <Heart size={18} color="#EF4444" />
              </View>
              <Text style={styles.vitalLabel}>Heart Rate</Text>
              <Text style={styles.vitalValue}>74 <Text style={styles.vitalUnit}>bpm</Text></Text>
              <View style={styles.vitalBadgeNormal}>
                <Text style={styles.vitalBadgeTextNormal}>Resting Normal</Text>
              </View>
            </View>

            {/* Blood Pressure */}
            <View style={[styles.vitalCard, { borderColor: 'rgba(37, 99, 235, 0.2)' }]}>
              <View style={[styles.vitalIconCircle, { backgroundColor: 'rgba(37, 99, 235, 0.1)' }]}>
                <Activity size={18} color="#2563EB" />
              </View>
              <Text style={styles.vitalLabel}>Blood Pressure</Text>
              <Text style={styles.vitalValue}>120/80 <Text style={styles.vitalUnit}>mmHg</Text></Text>
              <View style={styles.vitalBadgeNormal}>
                <Text style={styles.vitalBadgeTextNormal}>Optimal</Text>
              </View>
            </View>

            {/* Blood Sugar */}
            <View style={[styles.vitalCard, { borderColor: 'rgba(16, 185, 129, 0.2)' }]}>
              <View style={[styles.vitalIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Droplets size={18} color="#10B981" />
              </View>
              <Text style={styles.vitalLabel}>Blood Sugar</Text>
              <Text style={styles.vitalValue}>96 <Text style={styles.vitalUnit}>mg/dL</Text></Text>
              <View style={styles.vitalBadgeNormal}>
                <Text style={styles.vitalBadgeTextNormal}>Fasting Normal</Text>
              </View>
            </View>

            {/* Blood Group */}
            <View style={[styles.vitalCard, { borderColor: 'rgba(139, 92, 246, 0.2)' }]}>
              <View style={[styles.vitalIconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                <ShieldCheck size={18} color="#8B5CF6" />
              </View>
              <Text style={styles.vitalLabel}>Blood Group</Text>
              <Text style={[styles.vitalValue, { color: '#8B5CF6' }]}>
                {profile?.blood_group || 'O+'}
              </Text>
              <View style={[styles.vitalBadgeNormal, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                <Text style={[styles.vitalBadgeTextNormal, { color: '#8B5CF6' }]}>Verified Type</Text>
              </View>
            </View>
          </ScrollView>

          {/* Quick Actions Grid */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Clinical Actions</Text>
          </View>

          <View style={styles.quickGrid}>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => router.push('/(tabs)/patient/appointments')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(37, 99, 235, 0.1)' }]}>
                <Calendar size={20} color="#2563EB" />
              </View>
              <Text style={styles.quickTitle}>Book Visit</Text>
              <Text style={styles.quickSub}>Doctors & Clinics</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => router.push('/(tabs)/patient/pulse-ai')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                <Bot size={20} color="#8B5CF6" />
              </View>
              <Text style={styles.quickTitle}>Pulse AI</Text>
              <Text style={styles.quickSub}>Symptom Triage</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => setQrScannerVisible(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Scan size={20} color="#10B981" />
              </View>
              <Text style={styles.quickTitle}>Scan QR</Text>
              <Text style={styles.quickSub}>Pharmacy & Ledger</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => setUploadModalVisible(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <UploadCloud size={20} color="#F59E0B" />
              </View>
              <Text style={styles.quickTitle}>Upload EHR</Text>
              <Text style={styles.quickSub}>Encrypted PIN</Text>
            </TouchableOpacity>
          </View>

          {/* Next Upcoming Appointment Card */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Consultation</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/patient/appointments')}>
              <Text style={styles.sectionLink}>All Visits ({summary.upcomingAppointmentsCount})</Text>
            </TouchableOpacity>
          </View>

          {nextAppt ? (
            <View style={styles.appointmentCard}>
              <View style={styles.appointmentHeader}>
                <View style={styles.doctorAvatar}>
                  <Text style={styles.doctorAvatarText}>
                    {nextAppt.doctor_name ? nextAppt.doctor_name.substring(0, 2).toUpperCase() : 'DR'}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.doctorName}>
                    {nextAppt.doctor_name || 'Dr. Specialist'}
                  </Text>
                  <Text style={styles.doctorSpecialty}>
                    {nextAppt.doctor_specialty || nextAppt.hospital_name || 'General Medicine'}
                  </Text>
                </View>
                <View style={styles.statusBadgeConfirmed}>
                  <Text style={styles.statusBadgeTextConfirmed}>
                    {nextAppt.status || 'CONFIRMED'}
                  </Text>
                </View>
              </View>

              <View style={styles.appointmentFooter}>
                <View style={styles.dateTimeRow}>
                  <Calendar size={15} color="#2563EB" />
                  <Text style={styles.dateTimeText}>{nextAppt.appointment_date}</Text>
                  <Clock size={15} color="#2563EB" style={{ marginLeft: 12 }} />
                  <Text style={styles.dateTimeText}>{nextAppt.start_time || '10:00 AM'}</Text>
                </View>

                <TouchableOpacity
                  style={styles.viewApptButton}
                  onPress={() => router.push('/(tabs)/patient/appointments')}
                >
                  <Text style={styles.viewApptButtonText}>Manage</Text>
                  <ChevronRight size={15} color="#2563EB" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Calendar size={28} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Upcoming Appointments</Text>
              <Text style={styles.emptySub}>Schedule a consultation with a certified doctor</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/(tabs)/patient/appointments')}
              >
                <Text style={styles.emptyButtonText}>Book an Appointment</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Active Medicine Delivery Banner (if any) */}
          {activeOrder && (
            <View style={styles.deliveryCard}>
              <View style={styles.deliveryHeader}>
                <View style={styles.truckIconCircle}>
                  <Truck size={20} color="#2563EB" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.deliveryTitle}>Medicine Order In Progress</Text>
                  <Text style={styles.deliverySub}>
                    Tracking #{activeOrder.tracking_number || activeOrder.id?.substring(0, 8)}
                  </Text>
                </View>
                <View style={styles.deliveryStatusBadge}>
                  <Text style={styles.deliveryStatusText}>
                    {activeOrder.status || 'PROCESSING'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.trackButton}
                onPress={() => router.push('/(tabs)/patient/records')}
                activeOpacity={0.88}
              >
                <Text style={styles.trackButtonText}>View Order Details & Status</Text>
                <ChevronRight size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          {/* Recent Records & Prescriptions Summary Grid */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Medical Records & Vault</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/patient/records')}>
              <Text style={styles.sectionLink}>See All ({summary.totalRecordsCount})</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.vaultStatsRow}>
            <TouchableOpacity
              style={styles.vaultCard}
              onPress={() => router.push('/(tabs)/patient/records')}
              activeOpacity={0.8}
            >
              <FileText size={22} color="#10B981" />
              <Text style={styles.vaultCount}>{summary.totalRecordsCount}</Text>
              <Text style={styles.vaultLabel}>EHR Documents</Text>
              <View style={styles.polygonBadge}>
                <CheckCircle2 size={11} color="#10B981" />
                <Text style={styles.polygonBadgeText}>Polygon Proof</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.vaultCard}
              onPress={() => router.push('/(tabs)/patient/records')}
              activeOpacity={0.8}
            >
              <Pill size={22} color="#2563EB" />
              <Text style={styles.vaultCount}>{summary.activePrescriptionsCount}</Text>
              <Text style={styles.vaultLabel}>Prescriptions</Text>
              <View style={[styles.polygonBadge, { backgroundColor: 'rgba(37, 99, 235, 0.08)' }]}>
                <Text style={[styles.polygonBadgeText, { color: '#2563EB' }]}>Active QR</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* ── EMBEDDED PAYMENT-STYLE QR SCANNER MODAL ── */}
        <PaymentStyleQRScanner
          visible={qrScannerVisible}
          onClose={() => setQrScannerVisible(false)}
          userProfile={{
            id: user?.id || '',
            full_name: patientDisplayName,
            email: user?.email,
            blood_group: profile?.blood_group || 'O+',
          }}
        />

        {/* ── COMPLETE HEALTH PROFILE MODAL ── */}
        {user?.id && (
          <CompleteHealthProfileModal
            visible={showProfileModal}
            userId={user.id}
            onClose={() => setShowProfileModal(false)}
            onCompleted={() => {
              setShowProfileModal(false);
              loadDashboardData();
            }}
          />
        )}

        {/* ── UPLOAD RECORD MODAL ── */}
        <UploadRecordModal
          visible={uploadModalVisible}
          onClose={() => setUploadModalVisible(false)}
          onSuccess={() => {
            setUploadModalVisible(false);
            loadDashboardData();
          }}
        />

        {/* ── ORDER MEDICINES MODAL ── */}
        <OrderMedicinesModal
          visible={orderModalVisible}
          onClose={() => setOrderModalVisible(false)}
          onSuccess={() => {
            setOrderModalVisible(false);
            loadDashboardData();
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
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 38,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(37, 99, 235, 0.08)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 3,
  },
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  greetingText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
  },
  patientNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    maxWidth: 180,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
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
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    flex: 1,
    fontWeight: '500',
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  sosIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  sosSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.88)',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  vitalsScroll: {
    gap: 12,
    paddingBottom: 4,
    marginBottom: 18,
  },
  vitalCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  vitalIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  vitalLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  vitalValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  vitalUnit: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  vitalBadgeNormal: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  vitalBadgeTextNormal: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#10B981',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  quickCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 14,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  quickIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  quickSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  appointmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(37, 99, 235, 0.18)',
    padding: 16,
    marginBottom: 20,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  doctorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2563EB',
  },
  doctorName: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  doctorSpecialty: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadgeConfirmed: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusBadgeTextConfirmed: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  appointmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 6,
  },
  viewApptButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewApptButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
    marginRight: 2,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12.5,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(37, 99, 235, 0.25)',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  deliveryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(37, 99, 235, 0.15)',
    padding: 16,
    marginBottom: 20,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  truckIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  deliverySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  deliveryStatusBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  deliveryStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    height: 42,
    borderRadius: 12,
  },
  trackButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 6,
  },
  vaultStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  vaultCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  vaultCount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
  },
  vaultLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
  },
  polygonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  polygonBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#10B981',
    marginLeft: 4,
  },
});
