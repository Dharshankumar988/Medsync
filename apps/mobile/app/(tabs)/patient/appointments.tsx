import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
  Linking,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  Calendar,
  Clock,
  Plus,
  AlertCircle,
  X,
  Check,
  User,
  XCircle,
  Search,
  MapPin,
  Building2,
  Stethoscope,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Award,
  Navigation,
} from 'lucide-react-native';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Avatar } from '../../../components/common/Avatar';
import { PinVerificationModal } from '../../../components/patient/PinVerificationModal';
import { patientService, AppointmentItem } from '../../../services/patient.service';
import { formatErrorMessage } from '../../../lib/api';
import { useTheme } from '../../../context/ThemeContext';

type MainTab = 'UPCOMING' | 'PAST' | 'DISCOVERY';
type DiscoverySubTab = 'DOCTORS' | 'HOSPITALS';

const SPECIALTY_OPTIONS = [
  'All',
  'General Physician',
  'Cardiology',
  'Dermatology',
  'Pediatrics',
  'Orthopedics',
  'Neurology',
  'Gynecology',
];

const QUICK_TIME_SLOTS = ['09:30 AM', '11:00 AM', '02:30 PM', '04:30 PM', '06:00 PM'];
const QUICK_REASONS = ['General Consultation', 'Routine Follow-up', 'Fever & Flu', 'Prescription Refill', 'Diagnostic Review'];

export default function PatientAppointmentsScreen() {
  const { theme, isDark } = useTheme();
  const params = useLocalSearchParams<{ tab?: string }>();

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<MainTab>('UPCOMING');
  const [discoveryTab, setDiscoveryTab] = useState<DiscoverySubTab>('DOCTORS');
  const tabFadeAnim = useRef(new Animated.Value(1)).current;
  const tabSlideAnim = useRef(new Animated.Value(0)).current;

  const switchMainTab = useCallback((nextTab: MainTab) => {
    setActiveTab((prev) => {
      if (prev === nextTab) return prev;
      tabFadeAnim.setValue(0);
      tabSlideAnim.setValue(10);
      Animated.parallel([
        Animated.timing(tabFadeAnim, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(tabSlideAnim, {
          toValue: 0,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return nextTab;
    });
  }, [tabFadeAnim, tabSlideAnim]);

  useEffect(() => {
    const requested = (params?.tab || '').toUpperCase();
    if (requested === 'DISCOVERY' || requested === 'UPCOMING' || requested === 'PAST') {
      switchMainTab(requested as MainTab);
    }
  }, [params?.tab, switchMainTab]);

  // Appointments
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Doctors & Hospitals
  const [doctors, setDoctors] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [expandedHospitalId, setExpandedHospitalId] = useState<string | null>(null);
  const [hospitalDoctors, setHospitalDoctors] = useState<{ [hospitalId: string]: any[] }>({});
  const [loadingHospitalDoctors, setLoadingHospitalDoctors] = useState(false);

  // Booking Modal State
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [startTime, setStartTime] = useState('10:00:00');
  const [reason, setReason] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');

  // PIN Authorization Modal State (triggered upon Confirm Booking)
  const [pinModalVisible, setPinModalVisible] = useState(false);

  const loadAppointments = useCallback(async () => {
    try {
      setError(null);
      const data = await patientService.getAppointments();
      setAppointments(data || []);
    } catch (err: any) {
      console.warn('Failed to load appointments:', err);
      setError(err.message || 'Could not load clinic consultations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadDiscoveryData = useCallback(async () => {
    try {
      const [docList, hospList] = await Promise.all([
        patientService.getAvailableDoctors().catch(() => []),
        patientService.getHospitals().catch(() => []),
      ]);
      setDoctors(docList || []);
      setHospitals(hospList || []);
    } catch (err) {
      console.warn('Could not load discovery data:', err);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
    loadDiscoveryData();
  }, [loadAppointments, loadDiscoveryData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAppointments();
    loadDiscoveryData();
  }, [loadAppointments, loadDiscoveryData]);

  // Separate upcoming vs past appointments
  const { upcomingList, pastList } = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const upcoming: AppointmentItem[] = [];
    const past: AppointmentItem[] = [];

    appointments.forEach((appt) => {
      const isCancelled = appt.status === 'CANCELLED';
      const isCompleted = appt.status === 'COMPLETED';
      const apptDate = appt.appointment_date ? appt.appointment_date.split('T')[0] : '';

      if (isCancelled || isCompleted || (apptDate && apptDate < todayStr)) {
        past.push(appt);
      } else {
        upcoming.push(appt);
      }
    });

    return { upcomingList: upcoming, pastList: past };
  }, [appointments]);

  // Filtered Doctors
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      const name = (doc.full_name || doc.user?.full_name || '').toLowerCase();
      const spec = (doc.specialization || '').toLowerCase();
      const clinic = (doc.clinic_name || '').toLowerCase();
      const q = searchQuery.toLowerCase();

      const matchesSearch = !q || name.includes(q) || spec.includes(q) || clinic.includes(q);
      const matchesSpec =
        selectedSpecialty === 'All' ||
        spec.toLowerCase().includes(selectedSpecialty.toLowerCase());

      return matchesSearch && matchesSpec;
    });
  }, [doctors, searchQuery, selectedSpecialty]);

  // Filtered Hospitals
  const filteredHospitals = useMemo(() => {
    return hospitals.filter((hosp) => {
      const name = (hosp.name || '').toLowerCase();
      const address = (hosp.address || '').toLowerCase();
      const city = (hosp.city || '').toLowerCase();
      const q = searchQuery.toLowerCase();
      return !q || name.includes(q) || address.includes(q) || city.includes(q);
    });
  }, [hospitals, searchQuery]);

  // Start Booking with a preselected doctor
  const handleStartBookingWithDoctor = (doc: any, prefillReason?: string) => {
    setSelectedDoctor(doc);
    setBookingError('');
    setReason(prefillReason || 'General Consultation');

    // Default to tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const d = String(tomorrow.getDate()).padStart(2, '0');
    setAppointmentDate(`${y}-${m}-${d}`);
    setStartTime('10:00:00');

    setBookingModalVisible(true);
  };

  // "Book Again" from a past appointment
  const handleBookAgain = (pastAppt: AppointmentItem) => {
    // Look up doctor in doctors list or construct fallback
    const matchedDoc = doctors.find((d) => d.id === pastAppt.doctor_id) || {
      id: pastAppt.doctor_id,
      full_name: pastAppt.doctor_name || 'Practitioner',
      specialization: 'Consulting Doctor',
      clinic_name: 'MedSync Healthcare',
      consultation_fee: 500,
    };

    handleStartBookingWithDoctor(matchedDoc, `Follow-up: ${pastAppt.reason || 'Consultation'}`);
  };

  const handleOpenGeneralBooking = () => {
    if (doctors.length > 0) {
      handleStartBookingWithDoctor(doctors[0]);
    } else {
      Alert.alert('Notice', 'No clinic doctors are currently available for booking.');
    }
  };

  const handleExpandHospital = async (hospitalId: string) => {
    if (expandedHospitalId === hospitalId) {
      setExpandedHospitalId(null);
      return;
    }
    setExpandedHospitalId(hospitalId);
    if (!hospitalDoctors[hospitalId]) {
      setLoadingHospitalDoctors(true);
      try {
        const docs = await patientService.getDoctorsAtHospital(hospitalId);
        setHospitalDoctors((prev) => ({ ...prev, [hospitalId]: docs }));
      } catch (err) {
        console.warn('Failed to load doctors at hospital:', err);
      } finally {
        setLoadingHospitalDoctors(false);
      }
    }
  };

  const handleOpenGoogleMaps = (hospital: any) => {
    if (hospital.google_maps_url) {
      Linking.openURL(hospital.google_maps_url).catch(() => {});
      return;
    }
    if (hospital.latitude && hospital.longitude) {
      const url = `https://www.google.com/maps/search/?api=1&query=${hospital.latitude},${hospital.longitude}`;
      Linking.openURL(url).catch(() => {});
      return;
    }
    const query = encodeURIComponent(`${hospital.name}, ${hospital.address || ''} ${hospital.city || ''}`);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`).catch(() => {});
  };

  const handleCancelAppointment = (appointment: AppointmentItem) => {
    Alert.alert(
      'Cancel Appointment',
      `Are you sure you want to cancel your consultation scheduled for ${appointment.appointment_date}?`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Visit',
          style: 'destructive',
          onPress: async () => {
            try {
              await patientService.cancelAppointment(appointment.id, 'Patient cancelled via mobile app');
              Alert.alert('Visit Cancelled', 'Your appointment request has been cancelled.');
              loadAppointments();
            } catch (err: any) {
              Alert.alert('Action Failed', formatErrorMessage(err));
            }
          },
        },
      ]
    );
  };

  // Called when user taps "Confirm Appointment (₹...)" in the booking form
  const handleInitiateBooking = () => {
    if (!selectedDoctor?.id) {
      setBookingError('Please choose a consulting doctor.');
      return;
    }
    if (!appointmentDate || !/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) {
      setBookingError('Please select a valid date in YYYY-MM-DD format.');
      return;
    }
    if (!reason.trim()) {
      setBookingError('Please specify the reason for consultation.');
      return;
    }

    setBookingError('');
    // Trigger the 6-digit PIN verification modal
    setPinModalVisible(true);
  };

  // Called once 6-digit PIN is verified in PinVerificationModal
  const handleConfirmPinBooking = async (pin: string) => {
    setBookingLoading(true);
    try {
      await patientService.bookAppointment({
        doctor_id: selectedDoctor.id,
        appointment_date: appointmentDate,
        start_time: startTime,
        reason: reason.trim() || 'General Consultation',
        pin,
      });

      setPinModalVisible(false);
      setBookingModalVisible(false);
      Alert.alert('Appointment Requested', 'Your clinic appointment request has been submitted successfully.');
      loadAppointments();
      setActiveTab('UPCOMING');
    } catch (err: any) {
      throw err;
    } finally {
      setBookingLoading(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    const isConfirmed = status === 'CONFIRMED';
    const isPending = status === 'PENDING';
    const isCompleted = status === 'COMPLETED';

    const bg = isConfirmed
      ? 'rgba(16, 185, 129, 0.12)'
      : isPending
      ? 'rgba(245, 158, 11, 0.12)'
      : isCompleted
      ? 'rgba(59, 130, 246, 0.12)'
      : 'rgba(239, 68, 68, 0.12)';

    const color = isConfirmed
      ? '#10B981'
      : isPending
      ? '#F59E0B'
      : isCompleted
      ? '#3B82F6'
      : '#EF4444';

    return (
      <View style={[styles.statusBadge, { backgroundColor: bg, borderColor: color }]}>
        <Text style={[styles.statusText, { color }]}>{status}</Text>
      </View>
    );
  };

  // ── Render Card for an Appointment ──
  const renderAppointmentCard = (item: AppointmentItem, isPast: boolean) => {
    const canCancel = item.status === 'PENDING' || item.status === 'CONFIRMED';
    const docName = (item.doctor_name || 'Practitioner').replace(/^Dr\.?\s*/i, '');

    return (
      <Card
        key={item.id}
        style={[styles.apptCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        <CardContent>
          <View style={styles.cardHeaderRow}>
            <View
              style={[
                styles.doctorIconBox,
                {
                  backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#F0F9FF',
                  borderColor: isDark ? 'rgba(56, 189, 248, 0.25)' : '#BAE6FD',
                },
              ]}
            >
              <Stethoscope size={20} color="#38BDF8" />
            </View>
            <View style={styles.headerInfo}>
              <Text style={[styles.doctorNameTitle, { color: theme.text }]} numberOfLines={1}>
                Dr. {docName}
              </Text>
              <Text style={[styles.reasonSubtitle, { color: theme.textMuted }]} numberOfLines={1}>
                {item.reason || 'Medical Consultation'}
              </Text>
            </View>
            {renderStatusBadge(item.status)}
          </View>

          <View style={[styles.timeRow, { borderTopColor: theme.border }]}>
            <Calendar size={13} color={theme.textMuted} />
            <Text style={[styles.timeText, { color: theme.textSecondary }]}>
              {item.appointment_date}
            </Text>
            <Clock size={13} color={theme.textMuted} style={{ marginLeft: 10 }} />
            <Text style={[styles.timeText, { color: theme.textSecondary }]}>
              {item.start_time}
            </Text>
          </View>

          {/* Action Row */}
          <View style={styles.cardActionsRow}>
            {isPast ? (
              <TouchableOpacity
                style={[styles.bookAgainBtn, { backgroundColor: theme.primaryButton }]}
                onPress={() => handleBookAgain(item)}
                activeOpacity={0.85}
              >
                <RotateCcw size={14} color={theme.primaryButtonText} style={{ marginRight: 6 }} />
                <Text style={[styles.bookAgainBtnText, { color: theme.primaryButtonText }]}>
                  Book Again
                </Text>
              </TouchableOpacity>
            ) : canCancel ? (
              <Button
                title="Cancel Consultation"
                size="sm"
                variant="destructive"
                iconLeft={<XCircle size={14} color="#EF4444" />}
                onPress={() => handleCancelAppointment(item)}
                style={styles.cancelBtn}
              />
            ) : null}
          </View>
        </CardContent>
      </Card>
    );
  };

  return (
    <RoleGuard allowedRole="patient">
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenHeader
          title="Visits & Doctors"
          subtitle="Hospitals, doctors & appointment schedule"
          rightElement={
            <TouchableOpacity
              onPress={() => switchMainTab('DISCOVERY')}
              style={[
                styles.headerBookPill,
                { backgroundColor: '#2563EB' },
              ]}
              activeOpacity={0.85}
            >
              <Plus size={13} color="#FFFFFF" />
              <Text style={styles.headerBookPillText}>Book</Text>
            </TouchableOpacity>
          }
        />

        {/* ── Top Level Segmented Tab Controls ── */}
        <View
          style={[
            styles.mainTabsBar,
            { backgroundColor: theme.background, borderBottomColor: theme.border },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.mainTabBtn,
              activeTab === 'UPCOMING' && [
                styles.mainTabBtnActive,
                { borderBottomColor: isDark ? '#FAFAFA' : '#09090B' },
              ],
            ]}
            onPress={() => switchMainTab('UPCOMING')}
          >
            <Text
              style={[
                styles.mainTabBtnText,
                {
                  color: activeTab === 'UPCOMING' ? (isDark ? '#FAFAFA' : '#09090B') : theme.textMuted,
                  fontWeight: activeTab === 'UPCOMING' ? '700' : '500',
                },
              ]}
            >
              Upcoming ({upcomingList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.mainTabBtn,
              activeTab === 'PAST' && [
                styles.mainTabBtnActive,
                { borderBottomColor: isDark ? '#FAFAFA' : '#09090B' },
              ],
            ]}
            onPress={() => switchMainTab('PAST')}
          >
            <Text
              style={[
                styles.mainTabBtnText,
                {
                  color: activeTab === 'PAST' ? (isDark ? '#FAFAFA' : '#09090B') : theme.textMuted,
                  fontWeight: activeTab === 'PAST' ? '700' : '500',
                },
              ]}
            >
              Past Visits ({pastList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.mainTabBtn,
              activeTab === 'DISCOVERY' && [
                styles.mainTabBtnActive,
                { borderBottomColor: isDark ? '#FAFAFA' : '#09090B' },
              ],
            ]}
            onPress={() => switchMainTab('DISCOVERY')}
          >
            <Text
              style={[
                styles.mainTabBtnText,
                {
                  color: activeTab === 'DISCOVERY' ? (isDark ? '#FAFAFA' : '#09090B') : theme.textMuted,
                  fontWeight: activeTab === 'DISCOVERY' ? '700' : '500',
                },
              ]}
            >
              Find Doctors & Map
            </Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <AlertCircle size={15} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ── TAB 1: UPCOMING VISITS ── */}
        <Animated.View
          style={{
            flex: 1,
            opacity: tabFadeAnim,
            transform: [{ translateY: tabSlideAnim }],
          }}
        >
        {activeTab === 'UPCOMING' && (
          <FlatList
            data={upcomingList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => renderAppointmentCard(item, false)}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#3B82F6']}
                tintColor="#3B82F6"
              />
            }
            ListEmptyComponent={
              !loading ? (
                <View style={styles.emptyContainer}>
                  <View
                    style={[
                      styles.emptyIconBox,
                      { backgroundColor: isDark ? '#18181B' : '#F1F5F9', borderColor: theme.border },
                    ]}
                  >
                    <Calendar size={32} color={theme.textMuted} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>
                    No Upcoming Consultations
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                    You do not have any clinic appointments scheduled at this time.
                  </Text>
                  <TouchableOpacity
                    style={[styles.primaryActionBtn, { backgroundColor: theme.primaryButton }]}
                    onPress={() => switchMainTab('DISCOVERY')}
                    activeOpacity={0.85}
                  >
                    <Search size={15} color={theme.primaryButtonText} style={{ marginRight: 6 }} />
                    <Text style={[styles.primaryActionBtnText, { color: theme.primaryButtonText }]}>
                      Find Doctors & Hospitals
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
          />
        )}

        {/* ── TAB 2: PAST VISITS WITH "BOOK AGAIN" ── */}
        {activeTab === 'PAST' && (
          <FlatList
            data={pastList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => renderAppointmentCard(item, true)}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#3B82F6']}
                tintColor="#3B82F6"
              />
            }
            ListEmptyComponent={
              !loading ? (
                <View style={styles.emptyContainer}>
                  <View
                    style={[
                      styles.emptyIconBox,
                      { backgroundColor: isDark ? '#18181B' : '#F1F5F9', borderColor: theme.border },
                    ]}
                  >
                    <RotateCcw size={32} color={theme.textMuted} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>
                    No Past Consultations
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                    Completed visits will appear here with a 1-tap "Book Again" button to rebook the same doctor.
                  </Text>
                </View>
              ) : null
            }
          />
        )}

        {/* ── TAB 3: FIND DOCTORS & HOSPITALS MAP ── */}
        {activeTab === 'DISCOVERY' && (
          <ScrollView
            contentContainerStyle={styles.discoveryScroll}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#3B82F6']}
                tintColor="#3B82F6"
              />
            }
          >
            {/* Search Input Bar */}
            <View
              style={[
                styles.searchBarContainer,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Search size={18} color={theme.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search doctors, specializations, hospitals, city..."
                placeholderTextColor={isDark ? '#52525B' : '#94A3B8'}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={16} color={theme.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Discovery Sub-Segments: Doctors Directory vs Hospitals & Map */}
            <View
              style={[
                styles.subSegmentRow,
                { backgroundColor: isDark ? '#141416' : '#F1F5F9', borderColor: theme.border },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.subSegmentBtn,
                  discoveryTab === 'DOCTORS' && [
                    styles.subSegmentBtnActive,
                    { backgroundColor: isDark ? '#27272A' : '#FFFFFF' },
                  ],
                ]}
                onPress={() => setDiscoveryTab('DOCTORS')}
              >
                <Stethoscope
                  size={14}
                  color={discoveryTab === 'DOCTORS' ? '#38BDF8' : theme.textMuted}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.subSegmentText,
                    {
                      color: discoveryTab === 'DOCTORS' ? theme.text : theme.textMuted,
                      fontWeight: discoveryTab === 'DOCTORS' ? '700' : '500',
                    },
                  ]}
                >
                  Doctors ({filteredDoctors.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.subSegmentBtn,
                  discoveryTab === 'HOSPITALS' && [
                    styles.subSegmentBtnActive,
                    { backgroundColor: isDark ? '#27272A' : '#FFFFFF' },
                  ],
                ]}
                onPress={() => setDiscoveryTab('HOSPITALS')}
              >
                <Building2
                  size={14}
                  color={discoveryTab === 'HOSPITALS' ? '#10B981' : theme.textMuted}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.subSegmentText,
                    {
                      color: discoveryTab === 'HOSPITALS' ? theme.text : theme.textMuted,
                      fontWeight: discoveryTab === 'HOSPITALS' ? '700' : '500',
                    },
                  ]}
                >
                  Hospitals & Map ({filteredHospitals.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Specialty Pills (Only in Doctors Tab) */}
            {discoveryTab === 'DOCTORS' && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.specialtyScroll}
              >
                {SPECIALTY_OPTIONS.map((spec) => {
                  const isSel = selectedSpecialty === spec;
                  return (
                    <TouchableOpacity
                      key={spec}
                      style={[
                        styles.specChip,
                        {
                          backgroundColor: isSel
                            ? isDark
                              ? '#FAFAFA'
                              : '#09090B'
                            : theme.card,
                          borderColor: isSel
                            ? isDark
                              ? '#FAFAFA'
                              : '#09090B'
                            : theme.border,
                        },
                      ]}
                      onPress={() => setSelectedSpecialty(spec)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.specChipText,
                          {
                            color: isSel
                              ? isDark
                                ? '#09090B'
                                : '#FFFFFF'
                              : theme.textMuted,
                          },
                        ]}
                      >
                        {spec}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* ── SUBVIEW: DOCTORS DIRECTORY ── */}
            {discoveryTab === 'DOCTORS' ? (
              filteredDoctors.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>No Doctors Matching Search</Text>
                  <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                    Try searching with another specialty name or clear search filter.
                  </Text>
                </View>
              ) : (
                filteredDoctors.map((doc) => {
                  const rawName = doc.full_name || doc.user?.full_name || 'Practitioner';
                  const cleanName = rawName.replace(/^Dr\.?\s*/i, '');
                  const fee = doc.consultation_fee ?? 500;

                  return (
                    <Card
                      key={doc.id}
                      style={[styles.doctorCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                    >
                      <CardContent>
                        <View style={styles.doctorCardTop}>
                          <View
                            style={[
                              styles.doctorAvatarRound,
                              { backgroundColor: isDark ? '#27272A' : '#E0F2FE', borderColor: theme.border },
                            ]}
                          >
                            <User size={22} color={isDark ? '#38BDF8' : '#0284C7'} />
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={[styles.docCardName, { color: theme.text }]}>
                                Dr. {cleanName}
                              </Text>
                              <CheckCircle2 size={14} color="#38BDF8" />
                            </View>
                            <Text style={[styles.docCardSpec, { color: '#38BDF8' }]}>
                              {doc.specialization || 'General Care'}
                            </Text>
                            <Text style={[styles.docCardClinic, { color: theme.textMuted }]} numberOfLines={1}>
                              <Building2 size={12} color={theme.textMuted} /> {doc.clinic_name || 'MedSync Network Clinic'}
                            </Text>
                          </View>

                          <View style={styles.feeTag}>
                            <Text style={styles.feeTagLabel}>Fee</Text>
                            <Text style={styles.feeTagValue}>₹{fee}</Text>
                          </View>
                        </View>

                        {doc.consultation_hours ? (
                          <View style={[styles.hoursRow, { borderTopColor: theme.border }]}>
                            <Clock size={12} color={theme.textMuted} />
                            <Text style={[styles.hoursText, { color: theme.textSecondary }]}>
                              {doc.consultation_hours}
                            </Text>
                          </View>
                        ) : null}

                        <TouchableOpacity
                          style={[styles.bookDoctorBtn, { backgroundColor: theme.primaryButton }]}
                          onPress={() => handleStartBookingWithDoctor(doc)}
                          activeOpacity={0.85}
                        >
                          <Calendar size={14} color={theme.primaryButtonText} style={{ marginRight: 6 }} />
                          <Text style={[styles.bookDoctorBtnText, { color: theme.primaryButtonText }]}>
                            Book Consultation
                          </Text>
                        </TouchableOpacity>
                      </CardContent>
                    </Card>
                  );
                })
              )
            ) : (
              /* ── SUBVIEW: HOSPITALS & MAP ── */
              filteredHospitals.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>No Facilities Found</Text>
                  <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                    No registered hospitals or clinics match your search.
                  </Text>
                </View>
              ) : (
                filteredHospitals.map((hosp) => {
                  const isExpanded = expandedHospitalId === hosp.id;
                  const docsAtHosp = hospitalDoctors[hosp.id] || [];
                  const isClinic = (hosp.type || '').toLowerCase() === 'clinic';

                  return (
                    <Card
                      key={hosp.id}
                      style={[styles.hospitalCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                    >
                      <CardContent>
                        <View style={styles.hospitalCardTop}>
                          <View
                            style={[
                              styles.hospitalIconBox,
                              {
                                backgroundColor: isClinic
                                  ? (isDark ? 'rgba(56, 189, 248, 0.15)' : '#F0F9FF')
                                  : (isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5'),
                                borderColor: isClinic ? '#38BDF8' : '#10B981',
                              },
                            ]}
                          >
                            <Building2 size={22} color={isClinic ? '#38BDF8' : '#10B981'} />
                          </View>

                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <Text style={[styles.hospName, { color: theme.text }]}>{hosp.name}</Text>
                              <View
                                style={[
                                  styles.typeBadge,
                                  { backgroundColor: isClinic ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)' },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.typeBadgeText,
                                    { color: isClinic ? '#38BDF8' : '#10B981' },
                                  ]}
                                >
                                  {isClinic ? 'CLINIC' : 'HOSPITAL'}
                                </Text>
                              </View>
                            </View>

                            <Text style={[styles.hospAddress, { color: theme.textMuted }]} numberOfLines={2}>
                              <MapPin size={12} color={theme.textMuted} /> {hosp.address}{hosp.city ? `, ${hosp.city}` : ''}
                            </Text>
                          </View>
                        </View>

                        {/* Hospital Actions Row: Open Maps + View Doctors */}
                        <View style={[styles.hospActionsRow, { borderTopColor: theme.border }]}>
                          <TouchableOpacity
                            style={[
                              styles.openMapsBtn,
                              { backgroundColor: isDark ? '#27272A' : '#F1F5F9', borderColor: theme.border },
                            ]}
                            onPress={() => handleOpenGoogleMaps(hosp)}
                            activeOpacity={0.8}
                          >
                            <Navigation size={13} color="#38BDF8" style={{ marginRight: 5 }} />
                            <Text style={[styles.openMapsBtnText, { color: theme.text }]}>Open in Maps</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.viewDocsToggleBtn,
                              { backgroundColor: theme.primaryButton },
                            ]}
                            onPress={() => handleExpandHospital(hosp.id)}
                            activeOpacity={0.85}
                          >
                            <Text style={[styles.viewDocsToggleText, { color: theme.primaryButtonText }]}>
                              {isExpanded ? 'Hide Doctors' : 'View Doctors'}
                            </Text>
                            <ChevronRight
                              size={14}
                              color={theme.primaryButtonText}
                              style={{
                                transform: [{ rotate: isExpanded ? '90deg' : '0deg' }],
                                marginLeft: 4,
                              }}
                            />
                          </TouchableOpacity>
                        </View>

                        {/* Expanded Doctors List at this Hospital */}
                        {isExpanded && (
                          <View style={[styles.expandedDocsContainer, { borderTopColor: theme.border }]}>
                            {loadingHospitalDoctors ? (
                              <ActivityIndicator size="small" color="#38BDF8" style={{ marginVertical: 12 }} />
                            ) : docsAtHosp.length === 0 ? (
                              <Text style={[styles.noDocsNotice, { color: theme.textMuted }]}>
                                No practitioners currently listed under this hospital facility.
                              </Text>
                            ) : (
                              docsAtHosp.map((doc) => {
                                const cleanName = (doc.full_name || 'Doctor').replace(/^Dr\.?\s*/i, '');
                                return (
                                  <View
                                    key={doc.id}
                                    style={[
                                      styles.docAtHospItem,
                                      { backgroundColor: isDark ? '#141416' : '#F8FAFC', borderColor: theme.border },
                                    ]}
                                  >
                                    <View style={{ flex: 1 }}>
                                      <Text style={[styles.docAtHospName, { color: theme.text }]}>
                                        Dr. {cleanName}
                                      </Text>
                                      <Text style={[styles.docAtHospSpec, { color: '#38BDF8' }]}>
                                        {doc.specialization || 'Clinical Care'} • ₹{doc.consultation_fee ?? 500}
                                      </Text>
                                    </View>
                                    <TouchableOpacity
                                      style={[styles.bookSmallBtn, { backgroundColor: theme.primaryButton }]}
                                      onPress={() => handleStartBookingWithDoctor(doc)}
                                      activeOpacity={0.85}
                                    >
                                      <Text style={[styles.bookSmallBtnText, { color: theme.primaryButtonText }]}>
                                        Book
                                      </Text>
                                    </TouchableOpacity>
                                  </View>
                                );
                              })
                            )}
                          </View>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )
            )}
          </ScrollView>
        )}
        </Animated.View>

        {/* ── BOOKING MODAL (PRE-FILLED DOCTOR + SCHEDULE) ── */}
        <Modal
          visible={bookingModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setBookingModalVisible(false)}
        >
          <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Schedule Consultation</Text>
                <Text style={{ fontSize: 12, color: theme.textMuted }}>Book clinic visit with verified practitioner</Text>
              </View>
              <TouchableOpacity onPress={() => setBookingModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {bookingError ? (
                <View style={styles.modalErrorBanner}>
                  <AlertCircle size={16} color="#EF4444" />
                  <Text style={styles.modalErrorText}>{bookingError}</Text>
                </View>
              ) : null}

              {/* Selected Doctor Summary Card */}
              {selectedDoctor && (
                <View
                  style={[
                    styles.selectedDocCard,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <View
                    style={[
                      styles.docSummaryIconBox,
                      { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#F0F9FF', borderColor: '#38BDF8' },
                    ]}
                  >
                    <Stethoscope size={22} color="#38BDF8" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.selectedDocName, { color: theme.text }]}>
                      Dr. {(selectedDoctor.full_name || 'Practitioner').replace(/^Dr\.?\s*/i, '')}
                    </Text>
                    <Text style={[styles.selectedDocSpec, { color: '#38BDF8' }]}>
                      {selectedDoctor.specialization || 'Clinical Care'}
                    </Text>
                    <Text style={[styles.selectedDocClinic, { color: theme.textMuted }]} numberOfLines={1}>
                      {selectedDoctor.clinic_name || 'MedSync Network Clinic'}
                    </Text>
                  </View>
                  <View style={styles.selectedDocFee}>
                    <Text style={styles.feeTagLabel}>Fee</Text>
                    <Text style={styles.feeTagValue}>₹{selectedDoctor.consultation_fee ?? 500}</Text>
                  </View>
                </View>
              )}

              {/* Appointment Date */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 16 }]}>
                Appointment Date (YYYY-MM-DD)
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
                ]}
                value={appointmentDate}
                onChangeText={setAppointmentDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={isDark ? '#52525B' : '#94A3B8'}
              />

              {/* Quick Date Chips */}
              <View style={styles.quickChipsRow}>
                {['Tomorrow', 'In 2 Days', 'In 3 Days'].map((label, idx) => {
                  const target = new Date();
                  target.setDate(target.getDate() + idx + 1);
                  const y = target.getFullYear();
                  const m = String(target.getMonth() + 1).padStart(2, '0');
                  const d = String(target.getDate()).padStart(2, '0');
                  const dateVal = `${y}-${m}-${d}`;
                  const isSel = appointmentDate === dateVal;

                  return (
                    <TouchableOpacity
                      key={label}
                      style={[
                        styles.quickChip,
                        {
                          backgroundColor: isSel ? '#38BDF8' : (isDark ? '#27272A' : '#F1F5F9'),
                          borderColor: isSel ? '#38BDF8' : theme.border,
                        },
                      ]}
                      onPress={() => setAppointmentDate(dateVal)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.quickChipText, { color: isSel ? '#09090B' : theme.text }]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Preferred Time Slots */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 16 }]}>
                Preferred Time Slot
              </Text>
              <View style={styles.timeSlotRow}>
                {QUICK_TIME_SLOTS.map((slot) => {
                  const isSel = startTime.startsWith(slot.slice(0, 5));
                  return (
                    <TouchableOpacity
                      key={slot}
                      style={[
                        styles.timeSlotChip,
                        {
                          backgroundColor: isSel ? '#38BDF8' : (isDark ? '#27272A' : '#F1F5F9'),
                          borderColor: isSel ? '#38BDF8' : theme.border,
                        },
                      ]}
                      onPress={() => {
                        // Convert 12h to 24h format for database
                        const isPM = slot.includes('PM');
                        let hour = parseInt(slot.split(':')[0], 10);
                        const minute = slot.split(':')[1].slice(0, 2);
                        if (isPM && hour !== 12) hour += 12;
                        if (!isPM && hour === 12) hour = 0;
                        setStartTime(`${String(hour).padStart(2, '0')}:${minute}:00`);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.timeSlotText, { color: isSel ? '#09090B' : theme.text }]}>
                        {slot}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Reason for Consultation */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 16 }]}>
                Reason for Consultation
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
                ]}
                value={reason}
                onChangeText={setReason}
                placeholder="e.g. Headache, Routine Checkup, Follow-up"
                placeholderTextColor={isDark ? '#52525B' : '#94A3B8'}
              />

              <View style={styles.quickChipsRow}>
                {QUICK_REASONS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.quickChip,
                      {
                        backgroundColor: reason === r ? '#38BDF8' : (isDark ? '#27272A' : '#F1F5F9'),
                        borderColor: reason === r ? '#38BDF8' : theme.border,
                      },
                    ]}
                    onPress={() => setReason(r)}
                  >
                    <Text style={[styles.quickChipText, { color: reason === r ? '#09090B' : theme.text }]}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Confirm Booking CTA */}
              <View style={{ marginTop: 24, paddingBottom: 24 }}>
                <Button
                  title={`Confirm & Enter 6-Digit PIN (₹${selectedDoctor?.consultation_fee ?? 500})`}
                  onPress={handleInitiateBooking}
                  loading={bookingLoading}
                  style={styles.modalSubmitBtn}
                />
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* ── 6-DIGIT PIN AUTHORIZATION / SETUP MODAL ── */}
        <PinVerificationModal
          visible={pinModalVisible}
          title="Authorize Clinic Appointment"
          subtitle="Enter your 6-digit Authorization PIN to finalize and book your clinic appointment with the practitioner."
          onConfirm={handleConfirmPinBooking}
          onCancel={() => setPinModalVisible(false)}
        />
      </View>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainTabsBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  mainTabBtn: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginRight: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  mainTabBtnActive: {
    borderBottomWidth: 2,
  },
  mainTabBtnText: {
    fontSize: 13.5,
  },
  headerBookPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 18,
  },
  headerBookPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 145,
    gap: 12,
  },
  discoveryScroll: {
    padding: 16,
    paddingBottom: 145,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
  },
  apptCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  doctorIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  doctorNameTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  reasonSubtitle: {
    fontSize: 12.5,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 12,
    borderTopWidth: 1,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  cardActionsRow: {
    marginTop: 12,
  },
  bookAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  bookAgainBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cancelBtn: {
    alignSelf: 'flex-start',
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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryActionBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    height: '100%',
  },
  subSegmentRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  subSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  subSegmentBtnActive: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  subSegmentText: {
    fontSize: 12.5,
  },
  specialtyScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 14,
  },
  specChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  specChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  doctorCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  doctorCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorAvatarRound: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docCardName: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  docCardSpec: {
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 1,
  },
  docCardClinic: {
    fontSize: 11.5,
    marginTop: 2,
  },
  feeTag: {
    alignItems: 'flex-end',
  },
  feeTagLabel: {
    fontSize: 9.5,
    color: '#38BDF8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  feeTagValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10B981',
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    marginTop: 10,
    borderTopWidth: 1,
  },
  hoursText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  bookDoctorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  bookDoctorBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  hospitalCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  hospitalCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  hospitalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hospName: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hospAddress: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  hospActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
  },
  openMapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  openMapsBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  viewDocsToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewDocsToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  expandedDocsContainer: {
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  noDocsNotice: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 6,
  },
  docAtHospItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  docAtHospName: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  docAtHospSpec: {
    fontSize: 11.5,
    marginTop: 1,
  },
  bookSmallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bookSmallBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalScroll: {
    padding: 20,
  },
  modalErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  modalErrorText: {
    color: '#EF4444',
    fontSize: 12.5,
  },
  selectedDocCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  docSummaryIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDocName: {
    fontSize: 15,
    fontWeight: '800',
  },
  selectedDocSpec: {
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 1,
  },
  selectedDocClinic: {
    fontSize: 11.5,
    marginTop: 2,
  },
  selectedDocFee: {
    alignItems: 'flex-end',
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 6,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  timeSlotRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlotChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  timeSlotText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalSubmitBtn: {
    height: 50,
  },
});
