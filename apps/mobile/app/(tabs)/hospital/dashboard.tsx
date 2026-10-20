import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Building2,
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react-native';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Colors } from '../../../constants/theme';
import {
  hospitalService,
  HospitalDashboardSummary,
} from '../../../services/hospital.service';

export default function HospitalDashboardScreen() {
  const router = useRouter();
  const [summary, setSummary] = useState<HospitalDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const data = await hospitalService.getDashboardSummary();
      setSummary(data);
    } catch (err: any) {
      console.error('Error loading hospital dashboard:', err);
      setError(err.message || 'Failed to load hospital operations data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <RoleGuard allowedRole="hospital">
      <View style={styles.container}>
        <ScreenHeader
          title={summary?.hospital?.name || 'Hospital Center'}
          subtitle={`${summary?.hospital?.city || 'Facility Operations'} • Clinical Operations`}
        />

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={Colors.roles.hospital.primary} />
            <Text style={styles.loadingText}>Fetching hospital operations & schedules...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.roles.hospital.primary]}
              />
            }
          >
            {error && (
              <View style={styles.errorBox}>
                <AlertCircle size={18} color="#DC2626" style={{ marginRight: 8 }} />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={loadData} style={styles.retryBtn}>
                  <RefreshCw size={14} color="#DC2626" />
                </TouchableOpacity>
              </View>
            )}

            {/* Hospital Facility Banner */}
            <Card style={styles.bannerCard}>
              <CardContent>
                <View style={styles.bannerRow}>
                  <View style={styles.bannerIconCircle}>
                    <Building2 size={28} color={Colors.roles.hospital.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bannerTitle}>{summary?.hospital?.name || 'Hospital Center'}</Text>
                    <Text style={styles.bannerSubtitle} numberOfLines={1}>
                      {summary?.hospital?.address || 'Medical Facility Campus'}
                    </Text>
                    <View style={styles.verifiedRow}>
                      <ShieldCheck size={14} color="#0284C7" style={{ marginRight: 4 }} />
                      <Text style={styles.verifiedText}>Authorized Healthcare Facility</Text>
                    </View>
                  </View>
                </View>
              </CardContent>
            </Card>

            {/* KPI Metrics */}
            <View style={styles.kpiGrid}>
              <Card style={styles.kpiCard}>
                <CardContent style={styles.kpiCardContent}>
                  <View style={[styles.kpiIconBox, { backgroundColor: '#E0F2FE' }]}>
                    <Stethoscope size={20} color="#0284C7" />
                  </View>
                  <Text style={styles.kpiVal}>{summary?.activeDoctorsCount ?? 0}</Text>
                  <Text style={styles.kpiLbl}>Active Physicians</Text>
                </CardContent>
              </Card>

              <Card style={styles.kpiCard}>
                <CardContent style={styles.kpiCardContent}>
                  <View style={[styles.kpiIconBox, { backgroundColor: '#D1FAE5' }]}>
                    <Calendar size={20} color="#059669" />
                  </View>
                  <Text style={styles.kpiVal}>{summary?.todayAppointmentsCount ?? 0}</Text>
                  <Text style={styles.kpiLbl}>Today's Schedule</Text>
                </CardContent>
              </Card>

              <Card style={styles.kpiCard}>
                <CardContent style={styles.kpiCardContent}>
                  <View style={[styles.kpiIconBox, { backgroundColor: '#FEF3C7' }]}>
                    <Users size={20} color="#D97706" />
                  </View>
                  <Text style={styles.kpiVal}>{summary?.totalAppointmentsCount ?? 0}</Text>
                  <Text style={styles.kpiLbl}>Total Bookings</Text>
                </CardContent>
              </Card>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => router.push('/(tabs)/hospital/doctors' as any)}
              >
                <Users size={18} color={Colors.roles.hospital.primary} style={{ marginRight: 6 }} />
                <Text style={styles.quickActionText}>Doctors Directory</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => router.push('/(tabs)/hospital/appointments' as any)}
              >
                <Calendar size={18} color={Colors.roles.hospital.primary} style={{ marginRight: 6 }} />
                <Text style={styles.quickActionText}>Daily Appointments</Text>
              </TouchableOpacity>
            </View>

            {/* On-Duty Physicians Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Practicing Physicians</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/hospital/doctors' as any)}>
                <Text style={styles.sectionSeeAll}>View All</Text>
              </TouchableOpacity>
            </View>

            {(!summary?.recentDoctors || summary.recentDoctors.length === 0) ? (
              <Card style={styles.emptyCard}>
                <CardContent>
                  <Text style={styles.emptyText}>No registered doctors at this hospital facility yet.</Text>
                </CardContent>
              </Card>
            ) : (
              summary.recentDoctors.map((doc) => (
                <Card key={doc.id} style={styles.docCard}>
                  <CardContent>
                    <View style={styles.docRow}>
                      <View style={styles.docAvatarCircle}>
                        <Stethoscope size={18} color={Colors.roles.hospital.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.docName}>{doc.full_name}</Text>
                        <Text style={styles.docSpecialty}>
                          {doc.specialization} • {doc.experience_years || 0} yrs exp
                        </Text>
                        <Text style={styles.docHours}>
                          Hours: {doc.consultation_hours || '09:00 AM - 05:00 PM'}
                        </Text>
                      </View>
                      <View style={styles.docBadge}>
                        <Text style={styles.docBadgeText}>Active</Text>
                      </View>
                    </View>
                  </CardContent>
                </Card>
              ))
            )}

            {/* Today's Appointments Section */}
            <View style={[styles.sectionHeader, { marginTop: 18 }]}>
              <Text style={styles.sectionTitle}>Today's Clinical Consultations</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/hospital/appointments' as any)}>
                <Text style={styles.sectionSeeAll}>View Schedule</Text>
              </TouchableOpacity>
            </View>

            {(!summary?.recentAppointments || summary.recentAppointments.length === 0) ? (
              <Card style={styles.emptyCard}>
                <CardContent>
                  <Text style={styles.emptyText}>No patient consultations scheduled for today.</Text>
                </CardContent>
              </Card>
            ) : (
              summary.recentAppointments.map((apt) => (
                <Card key={apt.id} style={styles.aptCard}>
                  <CardContent>
                    <View style={styles.aptRow}>
                      <View style={styles.aptTimeBox}>
                        <Clock size={14} color="#64748B" style={{ marginBottom: 2 }} />
                        <Text style={styles.aptTimeText}>{apt.start_time}</Text>
                      </View>
                      <View style={{ flex: 1, paddingHorizontal: 10 }}>
                        <Text style={styles.aptPatientName}>{apt.patient_name}</Text>
                        <Text style={styles.aptDoctorName}>{apt.doctor_name}</Text>
                      </View>
                      <View
                        style={[
                          styles.aptStatusPill,
                          apt.status === 'CONFIRMED'
                            ? styles.statusConfirmed
                            : styles.statusPending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.aptStatusText,
                            apt.status === 'CONFIRMED'
                              ? styles.statusTextConfirmed
                              : styles.statusTextPending,
                          ]}
                        >
                          {apt.status}
                        </Text>
                      </View>
                    </View>
                  </CardContent>
                </Card>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    flex: 1,
  },
  retryBtn: {
    padding: 4,
  },
  bannerCard: {
    marginBottom: 14,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  bannerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284C7',
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
  },
  kpiCardContent: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  kpiIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  kpiLbl: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    borderRadius: 10,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSeeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.roles.hospital.primary,
  },
  emptyCard: {
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    paddingVertical: 10,
  },
  docCard: {
    marginBottom: 8,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  docName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  docSpecialty: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  docHours: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  docBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  docBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  aptCard: {
    marginBottom: 8,
  },
  aptRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aptTimeBox: {
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    paddingRight: 10,
  },
  aptTimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  aptPatientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  aptDoctorName: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  aptStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusConfirmed: {
    backgroundColor: '#D1FAE5',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  aptStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextConfirmed: {
    color: '#065F46',
  },
  statusTextPending: {
    color: '#B45309',
  },
});
