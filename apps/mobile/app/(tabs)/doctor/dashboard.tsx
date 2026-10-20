import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Users,
  Calendar,
  Activity,
  DollarSign,
  Plus,
  QrCode,
  Clock,
  ChevronRight,
  AlertCircle,
  FileCheck2,
} from 'lucide-react-native';
import { Card, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { Colors } from '../../../constants/theme';
import {
  doctorService,
  DoctorDashboardSummary,
  DoctorAppointment,
} from '../../../services/doctor.service';
import { CreatePrescriptionModal } from '../../../components/doctor/CreatePrescriptionModal';
import { QRScanner } from '../../../components/common/QRScanner';

export default function DoctorDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<DoctorDashboardSummary>({
    todayAppointmentsCount: 0,
    pendingPrescriptionsCount: 0,
    totalPatientsCount: 0,
    consultationFee: 500,
    todayRevenue: 0,
    todayAppointments: [],
    recentPrescriptions: [],
  });

  // Modal states
  const [isWriteRxOpen, setIsWriteRxOpen] = useState(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const data = await doctorService.getDashboardSummary();
      setSummary(data);
    } catch (err: any) {
      console.error('Failed to load doctor dashboard:', err);
      setError(err.message || 'Unable to connect to clinical servers.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard();
  }, [fetchDashboard]);

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return { bg: '#EFF6FF', text: '#2563EB', label: 'Confirmed' };
      case 'COMPLETED':
        return { bg: '#ECFDF5', text: '#059669', label: 'Completed' };
      case 'PENDING':
        return { bg: '#FEF3C7', text: '#D97706', label: 'Pending' };
      case 'CANCELLED':
      case 'REJECTED':
        return { bg: '#FEE2E2', text: '#DC2626', label: status };
      default:
        return { bg: '#F1F5F9', text: '#64748B', label: status };
    }
  };

  return (
    <RoleGuard allowedRole="doctor">
      <View style={styles.container}>
        <ScreenHeader
          title="Clinical Overview"
          subtitle="Daily schedule, patients & prescriptions"
          rightElement={
            <TouchableOpacity
              style={styles.qrHeaderBtn}
              onPress={() => setIsQrScannerOpen(!isQrScannerOpen)}
            >
              <QrCode size={20} color={Colors.roles.doctor.primary} />
            </TouchableOpacity>
          }
        />

        {/* QR Scanner Drawer/Modal */}
        {isQrScannerOpen && (
          <View style={styles.scannerWrapper}>
            <View style={styles.scannerHeaderRow}>
              <Text style={styles.scannerTitle}>Universal Clinical Scanner</Text>
              <TouchableOpacity onPress={() => setIsQrScannerOpen(false)}>
                <Text style={styles.scannerCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
            <QRScanner
              role="doctor"
              verifyHandler={(token) => doctorService.verifyQR(token)}
            />
          </View>
        )}

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollInner}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {error && (
            <View style={styles.errorBox}>
              <AlertCircle size={18} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color={Colors.roles.doctor.primary} />
              <Text style={styles.loadingText}>Fetching authenticated clinical schedule...</Text>
            </View>
          ) : (
            <>
              {/* Quick Action Bar */}
              <View style={styles.actionBar}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => setIsWriteRxOpen(true)}
                >
                  <Plus size={16} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>New Prescription</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnSecondary]}
                  onPress={() => router.push('/(tabs)/doctor/appointments')}
                >
                  <Calendar size={16} color={Colors.roles.doctor.primary} />
                  <Text style={[styles.actionBtnText, { color: Colors.roles.doctor.primary }]}>
                    Full Calendar
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Real Operational Stats Grid */}
              <View style={styles.statsGrid}>
                <Card style={styles.statCard}>
                  <CardContent>
                    <View style={styles.statHeader}>
                      <Text style={styles.statLabel}>Today's Patients</Text>
                      <Users size={16} color={Colors.roles.doctor.primary} />
                    </View>
                    <Text style={styles.statValue}>{summary.todayAppointmentsCount}</Text>
                    <Text style={styles.statSub}>
                      {summary.todayAppointments.filter((a) => a.status === 'CONFIRMED').length} confirmed visits
                    </Text>
                  </CardContent>
                </Card>

                <Card style={styles.statCard}>
                  <CardContent>
                    <View style={styles.statHeader}>
                      <Text style={styles.statLabel}>Pending</Text>
                      <Activity size={16} color="#D97706" />
                    </View>
                    <Text style={[styles.statValue, { color: '#D97706' }]}>
                      {summary.pendingPrescriptionsCount}
                    </Text>
                    <Text style={styles.statSub}>Prescriptions active</Text>
                  </CardContent>
                </Card>
              </View>

              <View style={styles.statsGrid}>
                <Card style={styles.statCard}>
                  <CardContent>
                    <View style={styles.statHeader}>
                      <Text style={styles.statLabel}>Total Patients</Text>
                      <FileCheck2 size={16} color="#059669" />
                    </View>
                    <Text style={[styles.statValue, { color: '#059669' }]}>
                      {summary.totalPatientsCount}
                    </Text>
                    <Text style={styles.statSub}>Authorized in roster</Text>
                  </CardContent>
                </Card>

                <Card style={styles.statCard}>
                  <CardContent>
                    <View style={styles.statHeader}>
                      <Text style={styles.statLabel}>Today's Revenue</Text>
                      <DollarSign size={16} color="#7C3AED" />
                    </View>
                    <Text style={[styles.statValue, { color: '#7C3AED' }]}>
                      ₹{summary.todayRevenue.toLocaleString()}
                    </Text>
                    <Text style={styles.statSub}>Fee: ₹{summary.consultationFee}/visit</Text>
                  </CardContent>
                </Card>
              </View>

              {/* Today's Appointments Section */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Today's Schedule</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/doctor/appointments')}>
                  <Text style={styles.seeAllText}>See all ({summary.todayAppointmentsCount})</Text>
                </TouchableOpacity>
              </View>

              {summary.todayAppointments.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <CardContent>
                    <View style={styles.emptyContainer}>
                      <Calendar size={36} color="#94A3B8" />
                      <Text style={styles.emptyTitle}>No Visits Scheduled for Today</Text>
                      <Text style={styles.emptySub}>
                        Your schedule is clear. New patient bookings will appear here in real-time.
                      </Text>
                      <Button
                        title="Manage Clinic Availability"
                        size="sm"
                        variant="outline"
                        onPress={() => router.push('/(tabs)/doctor/appointments')}
                        style={{ marginTop: 12 }}
                      />
                    </View>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent>
                    {summary.todayAppointments.map((appt, idx) => {
                      const badge = getStatusBadgeStyle(appt.status);
                      const isLast = idx === summary.todayAppointments.length - 1;
                      return (
                        <TouchableOpacity
                          key={appt.id}
                          style={[styles.activityItem, isLast && styles.activityItemLast]}
                          onPress={() => router.push('/(tabs)/doctor/appointments')}
                        >
                          <View style={styles.timeContainer}>
                            <Text style={styles.timeText}>
                              {appt.start_time ? appt.start_time.slice(0, 5) : '--:--'}
                            </Text>
                            <Text style={styles.amPmText}>
                              {appt.end_time ? appt.end_time.slice(0, 5) : ''}
                            </Text>
                          </View>

                          <View style={styles.activityContent}>
                            <Text style={styles.activityTitle}>{appt.patient_name}</Text>
                            <Text style={styles.activityDesc} numberOfLines={1}>
                              {appt.reason || 'General Consultation'}
                            </Text>
                          </View>

                          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                            <Text style={[styles.statusText, { color: badge.text }]}>
                              {badge.label}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </ScrollView>

        {/* Prescription Creation Modal */}
        <CreatePrescriptionModal
          visible={isWriteRxOpen}
          onClose={() => setIsWriteRxOpen(false)}
          onSuccess={() => {
            fetchDashboard();
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
  qrHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    padding: 16,
  },
  scannerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  scannerCloseText: {
    fontSize: 14,
    color: Colors.roles.doctor.primary,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
    paddingBottom: 40,
  },
  centerLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
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
  actionBar: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.roles.doctor.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginRight: 8,
  },
  actionBtnSecondary: {
    backgroundColor: '#E0F2FE',
    marginRight: 0,
    marginLeft: 8,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  statSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0F172A',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.roles.doctor.primary,
  },
  emptyCard: {
    paddingVertical: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  activityItemLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  timeContainer: {
    width: 55,
    alignItems: 'center',
    marginRight: 12,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  amPmText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  activityDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
