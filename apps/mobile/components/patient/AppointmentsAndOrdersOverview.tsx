import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import {
  Calendar as CalendarIcon,
  ShoppingBag,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Truck,
  ArrowRight,
  Plus,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { AppointmentItem, MedicineOrderItem } from '../../services/patient.service';

interface AppointmentsAndOrdersOverviewProps {
  appointments: AppointmentItem[];
  orders: MedicineOrderItem[];
  onSelectOrderForTracking?: (order: MedicineOrderItem) => void;
  onBookVisit?: () => void;
  onOrderMedicines?: () => void;
  onRefresh?: () => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function AppointmentsAndOrdersOverview({
  appointments,
  orders,
  onSelectOrderForTracking,
  onBookVisit,
  onOrderMedicines,
}: AppointmentsAndOrdersOverviewProps) {
  const router = useRouter();
  const { theme, isDark } = useTheme();

  // Tab switch: 'appointments' | 'orders'
  const [activeTab, setActiveTab] = useState<'appointments' | 'orders'>('appointments');
  const tabFadeAnim = useRef(new Animated.Value(1)).current;
  const tabSlideAnim = useRef(new Animated.Value(0)).current;

  const handleTabSwitch = (nextTab: 'appointments' | 'orders') => {
    if (nextTab === activeTab) return;
    tabFadeAnim.setValue(0);
    tabSlideAnim.setValue(nextTab === 'orders' ? 12 : -12);
    setActiveTab(nextTab);
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
  };

  const triggerBookVisit = () => {
    if (onBookVisit) {
      onBookVisit();
    } else {
      router.push('/(tabs)/patient/appointments?tab=DISCOVERY');
    }
  };

  const triggerOrderMedicines = () => {
    if (onOrderMedicines) {
      onOrderMedicines();
    } else {
      router.push('/(tabs)/patient/records?tab=PRESCRIPTIONS');
    }
  };

  // Calendar state
  const today = useMemo(() => new Date(), []);
  const getLocalDateString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = useMemo(() => getLocalDateString(today), [today]);
  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);
  const [viewAllAppointments, setViewAllAppointments] = useState<boolean>(false);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Month navigation
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Map appointments to date strings 'YYYY-MM-DD'
  const appointmentDatesMap = useMemo(() => {
    const map = new Map<string, AppointmentItem[]>();
    appointments.forEach((appt) => {
      if (!appt.appointment_date) return;
      // Handle both 'YYYY-MM-DD' and full ISO strings
      const dateKey = appt.appointment_date.split('T')[0];
      const existing = map.get(dateKey) || [];
      existing.push(appt);
      map.set(dateKey, existing);
    });
    return map;
  }, [appointments]);

  // Calendar cells calculations
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const cells: Array<{
      day: number | null;
      dateStr: string | null;
      isToday: boolean;
      isSelected: boolean;
      appts: AppointmentItem[];
    }> = [];

    // Empty lead cells
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({
        day: null,
        dateStr: null,
        isToday: false,
        isSelected: false,
        appts: [],
      });
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateKey = `${currentYear}-${monthStr}-${dayStr}`;

      const isToday = dateKey === todayStr;
      const isSelected = dateKey === selectedDateStr;
      const appts = appointmentDatesMap.get(dateKey) || [];

      cells.push({
        day,
        dateStr: dateKey,
        isToday,
        isSelected,
        appts,
      });
    }

    return cells;
  }, [currentYear, currentMonth, todayStr, selectedDateStr, appointmentDatesMap]);

  // Appointments for the active view
  const displayedAppointments = useMemo(() => {
    if (viewAllAppointments) {
      return appointments;
    }
    return appointmentDatesMap.get(selectedDateStr) || [];
  }, [viewAllAppointments, appointments, appointmentDatesMap, selectedDateStr]);

  // Nearest upcoming consultation on or after today for Quick Jump
  const nextUpcomingAppt = useMemo(() => {
    const active = appointments
      .filter((a) => {
        const dKey = String(a.appointment_date || '').split('T')[0];
        return dKey >= todayStr && (a.status === 'CONFIRMED' || a.status === 'PENDING');
      })
      .sort((a, b) =>
        `${a.appointment_date || ''} ${a.start_time || ''}`.localeCompare(
          `${b.appointment_date || ''} ${b.start_time || ''}`
        )
      );
    return active[0] || null;
  }, [appointments, todayStr]);

  const jumpToDateStr = (dateStr: string) => {
    const clean = dateStr.split('T')[0];
    const [yStr, mStr] = clean.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    if (Number.isFinite(y) && Number.isFinite(m)) {
      setCurrentDate(new Date(y, m - 1, 1));
    }
    setSelectedDateStr(clean);
    setViewAllAppointments(false);
  };

  const formatApptTime = (raw?: string | null) => {
    if (!raw) return '10:00 AM';
    const [hStr, mStr] = String(raw).split(':');
    const h = parseInt(hStr || '', 10);
    if (!Number.isFinite(h)) return String(raw);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${(mStr || '00').slice(0, 2)} ${period}`;
  };

  const formatReadableDate = (dateStr: string) => {
    const d = new Date(`${dateStr.split('T')[0]}T00:00:00`);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.container}>
      {/* ── Segmented Control Bar ── */}
      <View
        style={[
          styles.segmentedContainer,
          {
            backgroundColor: isDark ? '#14161E' : '#F1F5F9',
            borderColor: isDark ? '#272B36' : '#E2E8F0',
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === 'appointments' && [
              styles.segmentBtnActive,
              { backgroundColor: isDark ? '#222734' : '#FFFFFF' },
            ],
          ]}
          onPress={() => handleTabSwitch('appointments')}
          activeOpacity={0.85}
        >
          <CalendarIcon
            size={15}
            color={activeTab === 'appointments' ? '#3B82F6' : theme.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.segmentText,
              {
                color: activeTab === 'appointments' ? theme.text : theme.textMuted,
                fontWeight: activeTab === 'appointments' ? '700' : '500',
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
          >
            Appointments
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === 'orders' && [
              styles.segmentBtnActive,
              { backgroundColor: isDark ? '#222734' : '#FFFFFF' },
            ],
          ]}
          onPress={() => handleTabSwitch('orders')}
          activeOpacity={0.85}
        >
          <ShoppingBag
            size={15}
            color={activeTab === 'orders' ? '#10B981' : theme.textMuted}
            style={{ marginRight: 5 }}
          />
          <Text
            style={[
              styles.segmentText,
              {
                color: activeTab === 'orders' ? theme.text : theme.textMuted,
                fontWeight: activeTab === 'orders' ? '700' : '500',
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
          >
            Orders ({orders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── TAB 1: APPOINTMENTS & CALENDAR ── */}
      <Animated.View
        style={{
          opacity: tabFadeAnim,
          transform: [{ translateX: tabSlideAnim }],
        }}
      >
      {activeTab === 'appointments' ? (
        <View>
          {/* Calendar Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? '#12141C' : '#FFFFFF',
                borderColor: isDark ? '#222734' : '#E2E8F0',
              },
            ]}
          >
            {/* Month Header with Navigation & Quick Jumps */}
            <View style={styles.calendarHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.calendarMonthTitle, { color: theme.text }]}>
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </Text>
                <Text style={[styles.calendarMonthSub, { color: theme.textMuted }]}>
                  {appointments.length} Consultation{appointments.length === 1 ? '' : 's'} Scheduled
                </Text>
              </View>

              <View style={styles.monthNavRow}>
                <TouchableOpacity
                  style={[
                    styles.quickJumpBtn,
                    {
                      backgroundColor: isDark ? '#1A1E29' : '#F1F5F9',
                      borderColor: isDark ? '#2A3040' : '#E2E8F0',
                    },
                  ]}
                  onPress={() => jumpToDateStr(todayStr)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.quickJumpBtnText, { color: theme.text }]}>Today</Text>
                </TouchableOpacity>
                {nextUpcomingAppt?.appointment_date ? (
                  <TouchableOpacity
                    style={[
                      styles.quickJumpBtn,
                      {
                        backgroundColor: isDark ? 'rgba(59, 130, 246, 0.16)' : '#EFF6FF',
                        borderColor: isDark ? 'rgba(59, 130, 246, 0.35)' : '#BFDBFE',
                      },
                    ]}
                    onPress={() => jumpToDateStr(nextUpcomingAppt.appointment_date)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.quickJumpBtnText, { color: '#3B82F6' }]}>
                      Next: {formatReadableDate(nextUpcomingAppt.appointment_date)}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={[
                    styles.navBtn,
                    {
                      backgroundColor: isDark ? '#1A1E29' : '#F1F5F9',
                      borderColor: isDark ? '#2A3040' : '#E2E8F0',
                    },
                  ]}
                  onPress={handlePrevMonth}
                  activeOpacity={0.7}
                >
                  <ChevronLeft size={16} color={theme.text} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.navBtn,
                    {
                      backgroundColor: isDark ? '#1A1E29' : '#F1F5F9',
                      borderColor: isDark ? '#2A3040' : '#E2E8F0',
                    },
                  ]}
                  onPress={handleNextMonth}
                  activeOpacity={0.7}
                >
                  <ChevronRight size={16} color={theme.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Day of Week Headers */}
            <View style={styles.daysOfWeekRow}>
              {DAYS_OF_WEEK.map((d, index) => (
                <Text
                  key={d}
                  style={[
                    styles.dayOfWeekText,
                    {
                      color:
                        index === 0 || index === 6
                          ? isDark
                            ? '#71717A'
                            : '#94A3B8'
                          : theme.textMuted,
                    },
                  ]}
                >
                  {d}
                </Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.daysGrid}>
              {calendarCells.map((cell, idx) => {
                if (cell.day === null) {
                  return <View key={`empty-${idx}`} style={styles.dayCellEmpty} />;
                }

                const hasAppts = cell.appts.length > 0;
                const hasConfirmed = cell.appts.some((a) => a.status === 'CONFIRMED');
                const hasPending = cell.appts.some((a) => a.status === 'PENDING');

                return (
                  <TouchableOpacity
                    key={cell.dateStr!}
                    style={[
                      styles.dayCell,
                      cell.isToday && [
                        styles.dayCellToday,
                        { borderColor: isDark ? '#38BDF8' : '#0284C7' },
                      ],
                      cell.isSelected && [
                        styles.dayCellSelected,
                        { backgroundColor: '#2563EB' },
                      ],
                    ]}
                    onPress={() => {
                      if (cell.dateStr) {
                        setSelectedDateStr(cell.dateStr);
                        setViewAllAppointments(false);
                      }
                    }}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        {
                          color: cell.isSelected
                            ? '#FFFFFF'
                            : cell.isToday
                            ? isDark
                              ? '#38BDF8'
                              : '#0284C7'
                            : theme.text,
                          fontWeight: cell.isToday || cell.isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {cell.day}
                    </Text>

                    {/* Appointment Dot Indicator */}
                    {hasAppts && (
                      <View style={styles.dotRow}>
                        {hasConfirmed && (
                          <View
                            style={[
                              styles.apptDot,
                              {
                                backgroundColor: cell.isSelected
                                  ? '#FFFFFF'
                                  : '#3B82F6',
                              },
                            ]}
                          />
                        )}
                        {hasPending && (
                          <View
                            style={[
                              styles.apptDot,
                              {
                                backgroundColor: cell.isSelected
                                  ? '#FEF08A'
                                  : '#F59E0B',
                              },
                            ]}
                          />
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Calendar Legend */}
            <View
              style={[
                styles.legendBox,
                {
                  backgroundColor: isDark ? '#181B24' : '#F8FAFC',
                  borderColor: isDark ? '#262C3A' : '#E2E8F0',
                },
              ]}
            >
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={[styles.legendText, { color: theme.textMuted }]}>
                  Confirmed
                </Text>
              </View>

              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={[styles.legendText, { color: theme.textMuted }]}>
                  Pending
                </Text>
              </View>

              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendRing,
                    { borderColor: isDark ? '#38BDF8' : '#0284C7' },
                  ]}
                />
                <Text style={[styles.legendText, { color: theme.textMuted }]}>
                  Today
                </Text>
              </View>

              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#2563EB' }]} />
                <Text style={[styles.legendText, { color: theme.textMuted }]}>
                  Selected
                </Text>
              </View>
            </View>
          </View>

          {/* Schedule Header Row */}
          <View style={styles.scheduleHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.scheduleTitle, { color: theme.text }]} numberOfLines={1}>
                {viewAllAppointments
                  ? 'All Scheduled Consultations'
                  : selectedDateStr === todayStr
                  ? "Today's Schedule"
                  : `Schedule • ${formatReadableDate(selectedDateStr)}`}
              </Text>
              {!viewAllAppointments && (
                <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
                  {displayedAppointments.length} appointment{displayedAppointments.length === 1 ? '' : 's'} on this date
                </Text>
              )}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={triggerBookVisit}
                style={[styles.viewToggleBtn, { backgroundColor: '#2563EB', borderColor: '#2563EB' }]}
                activeOpacity={0.85}
              >
                <Text style={[styles.viewToggleBtnText, { color: '#FFFFFF' }]}>+ Book</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setViewAllAppointments(!viewAllAppointments)}
                style={[
                  styles.viewToggleBtn,
                  {
                    backgroundColor: viewAllAppointments ? '#3B82F6' : (isDark ? '#1F2430' : '#E2E8F0'),
                    borderColor: viewAllAppointments ? '#2563EB' : theme.border,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.viewToggleBtnText,
                    { color: viewAllAppointments ? '#FFFFFF' : theme.text },
                  ]}
                >
                  {viewAllAppointments ? 'Selected Day' : 'View All'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {displayedAppointments.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: isDark ? '#12141C' : '#FFFFFF',
                  borderColor: isDark ? '#222734' : '#E2E8F0',
                },
              ]}
            >
              <CalendarIcon size={28} color={theme.textMuted} />
              <Text style={[styles.emptyCardTitle, { color: theme.text }]}>
                No visits on {formatReadableDate(selectedDateStr)}
              </Text>
              <Text style={[styles.emptyCardSub, { color: theme.textMuted }]}>
                Tap a dotted date on the calendar or schedule a new clinic consultation.
              </Text>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  style={styles.bookActionBtn}
                  onPress={triggerBookVisit}
                  activeOpacity={0.85}
                >
                  <Plus size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.bookActionBtnText}>Book for {formatReadableDate(selectedDateStr)}</Text>
                </TouchableOpacity>

                {appointments.length > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.bookActionBtn,
                      {
                        backgroundColor: isDark ? '#1F2430' : '#E2E8F0',
                        borderWidth: 1,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() => setViewAllAppointments(true)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.bookActionBtnText, { color: theme.text }]}>
                      Show All ({appointments.length})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            displayedAppointments.map((appt) => {
              const isConfirmed = appt.status === 'CONFIRMED';
              return (
                <View
                  key={appt.id}
                  style={[
                    styles.apptCard,
                    {
                      backgroundColor: isDark ? '#12141C' : '#FFFFFF',
                      borderColor: isDark ? '#222734' : '#E2E8F0',
                    },
                  ]}
                >
                  <View style={styles.apptCardTop}>
                    <View
                      style={[
                        styles.doctorAvatarBox,
                        {
                          backgroundColor: isConfirmed
                            ? isDark
                              ? 'rgba(59, 130, 246, 0.16)'
                              : '#EFF6FF'
                            : isDark
                            ? 'rgba(245, 158, 11, 0.16)'
                            : '#FEF3C7',
                        },
                      ]}
                    >
                      <Stethoscope
                        size={18}
                        color={isConfirmed ? '#3B82F6' : '#D97706'}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.doctorName, { color: theme.text }]}>
                        {appt.doctor_name
                          ? `Dr. ${appt.doctor_name}`
                          : appt.reason || 'Medical Consultation'}
                      </Text>
                      <Text style={[styles.clinicName, { color: theme.textMuted }]}>
                        {appt.hospital_name || appt.doctor_specialty || 'MedSync Network Clinic'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: isConfirmed
                            ? isDark
                              ? 'rgba(16, 185, 129, 0.15)'
                              : '#ECFDF5'
                            : isDark
                            ? 'rgba(245, 158, 11, 0.15)'
                            : '#FFFBEB',
                          borderColor: isConfirmed ? '#10B981' : '#F59E0B',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: isConfirmed ? '#10B981' : '#D97706' },
                        ]}
                      >
                        {appt.status}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.apptFooterRow,
                      { borderTopColor: isDark ? '#1E2330' : '#F1F5F9' },
                    ]}
                  >
                    <View style={styles.apptTimeItem}>
                      <Clock size={13} color={theme.textMuted} style={{ marginRight: 5 }} />
                      <Text style={[styles.apptTimeText, { color: theme.textSecondary }]}>
                        {formatApptTime(appt.start_time)}
                      </Text>
                    </View>

                    <View style={styles.apptTimeItem}>
                      <CalendarIcon size={13} color={theme.textMuted} style={{ marginRight: 5 }} />
                      <Text style={[styles.apptTimeText, { color: theme.textSecondary }]}>
                        {formatReadableDate(appt.appointment_date)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      ) : (
        /* ── TAB 2: RECENT ORDERS ── */
        <View>
          <View style={styles.scheduleHeaderRow}>
            <Text style={[styles.scheduleTitle, { color: theme.text }]}>
              Recent Medicine Deliveries
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={triggerOrderMedicines}
                style={[styles.viewToggleBtn, { backgroundColor: '#10B981', borderColor: '#10B981' }]}
                activeOpacity={0.85}
              >
                <Text style={[styles.viewToggleBtnText, { color: '#FFFFFF' }]}>+ Order Meds</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/patient/records?tab=ORDERS')}
                activeOpacity={0.8}
              >
                <Text style={[styles.scheduleLink, { color: '#10B981' }]}>
                  Vault <ArrowRight size={12} color="#10B981" />
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {orders.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: isDark ? '#12141C' : '#FFFFFF',
                  borderColor: isDark ? '#222734' : '#E2E8F0',
                },
              ]}
            >
              <ShoppingBag size={24} color={theme.textMuted} />
              <Text style={[styles.emptyCardTitle, { color: theme.text }]}>
                No medicine orders yet
              </Text>
              <Text style={[styles.emptyCardSub, { color: theme.textMuted }]}>
                Order prescription medications directly from your verified digital records with doorstep priority delivery.
              </Text>
              <TouchableOpacity
                style={[styles.bookActionBtn, { backgroundColor: '#10B981', marginTop: 12 }]}
                onPress={triggerOrderMedicines}
                activeOpacity={0.85}
              >
                <Plus size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.bookActionBtnText}>Order Prescription</Text>
              </TouchableOpacity>
            </View>
          ) : (
            orders.slice(0, 5).map((order) => {
              const formattedDate = order.created_at
                ? new Date(order.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Recent';

              return (
                <View
                  key={order.id}
                  style={[
                    styles.orderCard,
                    {
                      backgroundColor: isDark ? '#12141C' : '#FFFFFF',
                      borderColor: isDark ? '#222734' : '#E2E8F0',
                    },
                  ]}
                >
                  <View style={styles.orderCardTop}>
                    <View
                      style={[
                        styles.orderIconBox,
                        {
                          backgroundColor: isDark
                            ? 'rgba(16, 185, 129, 0.16)'
                            : '#ECFDF5',
                        },
                      ]}
                    >
                      <ShoppingBag size={18} color="#10B981" />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.orderIdText, { color: theme.text }]}>
                        Order #{order.id.substring(0, 8).toUpperCase()}
                      </Text>
                      <Text style={[styles.orderDateText, { color: theme.textMuted }]}>
                        Placed on {formattedDate}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.orderStatusPill,
                        {
                          backgroundColor:
                            order.status === 'DELIVERED'
                              ? isDark
                                ? 'rgba(16, 185, 129, 0.15)'
                                : '#ECFDF5'
                              : isDark
                              ? 'rgba(59, 130, 246, 0.15)'
                              : '#EFF6FF',
                          borderColor:
                            order.status === 'DELIVERED' ? '#10B981' : '#3B82F6',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.orderStatusPillText,
                          {
                            color:
                              order.status === 'DELIVERED' ? '#10B981' : '#3B82F6',
                          },
                        ]}
                      >
                        {order.status || 'PROCESSING'}
                      </Text>
                    </View>
                  </View>

                  {order.delivery_address ? (
                    <View style={styles.orderAddressRow}>
                      <MapPin size={13} color={theme.textMuted} style={{ marginTop: 2, marginRight: 6 }} />
                      <Text
                        style={[styles.orderAddressText, { color: theme.textSecondary }]}
                        numberOfLines={1}
                      >
                        {order.delivery_address}
                      </Text>
                    </View>
                  ) : null}

                  {order.tracking_number && (
                    <View
                      style={[
                        styles.orderTrackingRow,
                        {
                          backgroundColor: isDark ? '#181B24' : '#F8FAFC',
                          borderColor: isDark ? '#262C3A' : '#E2E8F0',
                        },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Truck size={14} color="#10B981" style={{ marginRight: 6 }} />
                        <Text
                          style={[styles.orderTrackingText, { color: theme.text }]}
                        >
                          Tracking: {order.tracking_number}
                        </Text>
                      </View>

                      {onSelectOrderForTracking && order.status !== 'CANCELLED' && (
                        <TouchableOpacity
                          style={[
                            styles.trackOrderBtn,
                            order.status === 'DELIVERED' && { backgroundColor: '#10B981' },
                          ]}
                          onPress={() => onSelectOrderForTracking(order)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.trackOrderBtnText}>
                            {order.status === 'DELIVERED' ? 'Summary' : 'Live Track'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 26,
  },
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12.5,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  calendarMonthTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  calendarMonthSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickJumpBtn: {
    height: 30,
    paddingHorizontal: 9,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickJumpBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysOfWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  dayOfWeekText: {
    width: 38,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  dayCell: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 3,
  },
  dayCellEmpty: {
    width: 38,
    height: 38,
    marginVertical: 3,
  },
  dayCellToday: {
    borderWidth: 1.5,
  },
  dayCellSelected: {
    elevation: 3,
  },
  dayText: {
    fontSize: 13,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  apptDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  legendBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendRing: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
  },
  legendText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  scheduleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scheduleTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  scheduleLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  viewToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  viewToggleBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  emptyCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  emptyCardSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  bookActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 6,
  },
  bookActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  apptCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  apptCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  doctorAvatarBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorName: {
    fontSize: 14,
    fontWeight: '700',
  },
  clinicName: {
    fontSize: 11.5,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  apptFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  apptTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  apptTimeText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  orderCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  orderCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  orderIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderIdText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  orderDateText: {
    fontSize: 11,
    marginTop: 1,
  },
  orderStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  orderStatusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  orderAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderAddressText: {
    flex: 1,
    fontSize: 11.5,
  },
  orderTrackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  orderTrackingText: {
    fontSize: 12,
    fontWeight: '700',
  },
  trackOrderBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  trackOrderBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
