import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Activity, Clock, FileText, Calendar, Pill, ShieldCheck, ChevronRight, AlertCircle } from 'lucide-react-native';
import { Card, CardContent } from '../../../components/common/Card';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { patientService, PatientDashboardSummary } from '../../../services/patient.service';
import { Colors } from '../../../constants/theme';

export default function PatientDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const loadDashboardData = useCallback(async () => {
    try {
      setError(null);
      const data = await patientService.getDashboardSummary();
      setSummary(data);
    } catch (err: any) {
      console.warn('Dashboard fetch error:', err);
      setError(err.message || 'Unable to load patient records from server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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
      <View style={styles.container}>
        <ScreenHeader title="Patient Overview" subtitle="Live clinical summary & records" />

        <ScrollView
          style={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.roles.patient.primary]} />}
        >
          {error && (
            <View style={styles.errorBanner}>
              <AlertCircle size={16} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Real Metrics Grid */}
          <View style={styles.statsGrid}>
            <TouchableOpacity
              style={styles.statTouch}
              onPress={() => router.push('/(tabs)/patient/appointments' as any)}
              activeOpacity={0.8}
            >
              <Card style={styles.statCard}>
                <CardContent>
                  <View style={styles.statHeader}>
                    <Text style={styles.statLabel}>Appointments</Text>
                    <Calendar size={16} color={Colors.roles.patient.primary} />
                  </View>
                  <Text style={styles.statValue}>
                    {loading ? '—' : summary.upcomingAppointmentsCount}
                  </Text>
                  <Text style={styles.statSub}>Upcoming</Text>
                </CardContent>
              </Card>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statTouch}
              onPress={() => router.push('/(tabs)/patient/records' as any)}
              activeOpacity={0.8}
            >
              <Card style={styles.statCard}>
                <CardContent>
                  <View style={styles.statHeader}>
                    <Text style={styles.statLabel}>Records</Text>
                    <FileText size={16} color="#10B981" />
                  </View>
                  <Text style={[styles.statValue, { color: '#10B981' }]}>
                    {loading ? '—' : summary.totalRecordsCount}
                  </Text>
                  <Text style={styles.statSub}>Encrypted</Text>
                </CardContent>
              </Card>
            </TouchableOpacity>
          </View>

          <View style={styles.statsGrid}>
            <TouchableOpacity
              style={styles.statTouch}
              onPress={() => router.push('/(tabs)/patient/records' as any)}
              activeOpacity={0.8}
            >
              <Card style={styles.statCard}>
                <CardContent>
                  <View style={styles.statHeader}>
                    <Text style={styles.statLabel}>Prescriptions</Text>
                    <Pill size={16} color="#F59E0B" />
                  </View>
                  <Text style={[styles.statValue, { color: '#D97706' }]}>
                    {loading ? '—' : summary.activePrescriptionsCount}
                  </Text>
                  <Text style={styles.statSub}>Active</Text>
                </CardContent>
              </Card>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statTouch}
              onPress={() => router.push('/(tabs)/patient/profile' as any)}
              activeOpacity={0.8}
            >
              <Card style={styles.statCard}>
                <CardContent>
                  <View style={styles.statHeader}>
                    <Text style={styles.statLabel}>Security PIN</Text>
                    <ShieldCheck size={16} color="#8B5CF6" />
                  </View>
                  <Text style={[styles.statValue, { color: '#7C3AED' }]}>6-Digit</Text>
                  <Text style={styles.statSub}>Active Guard</Text>
                </CardContent>
              </Card>
            </TouchableOpacity>
          </View>

          {/* Next Visit Section */}
          <Text style={styles.sectionTitle}>Next Scheduled Visit</Text>
          <Card style={styles.cardSection}>
            <CardContent>
              {nextAppt ? (
                <View style={styles.nextVisitContainer}>
                  <View style={styles.nextVisitIcon}>
                    <Clock size={20} color={Colors.roles.patient.primary} />
                  </View>
                  <View style={styles.nextVisitDetails}>
                    <Text style={styles.nextVisitTitle}>
                      {nextAppt.reason || 'Medical Consultation'}
                    </Text>
                    <Text style={styles.nextVisitDate}>
                      {nextAppt.appointment_date} at {nextAppt.start_time || 'Scheduled Time'}
                    </Text>
                    <Text style={styles.nextVisitStatus}>
                      Status: {nextAppt.status}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyCardContainer}>
                  <Text style={styles.emptyCardTitle}>No Upcoming Appointments</Text>
                  <Text style={styles.emptyCardSubtitle}>
                    You do not have any confirmed or pending clinic visits.
                  </Text>
                  <TouchableOpacity
                    style={styles.actionLink}
                    onPress={() => router.push('/(tabs)/patient/appointments' as any)}
                  >
                    <Text style={styles.actionLinkText}>Book Consultation →</Text>
                  </TouchableOpacity>
                </View>
              )}
            </CardContent>
          </Card>

          {/* Recent Records Section */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Medical Records</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/patient/records' as any)}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <Card style={styles.cardSection}>
            <CardContent>
              {summary.recentRecords.length > 0 ? (
                summary.recentRecords.map((rec, index) => (
                  <TouchableOpacity
                    key={rec.id || index}
                    style={[
                      styles.activityItem,
                      index === summary.recentRecords.length - 1 && styles.activityItemLast,
                    ]}
                    onPress={() => router.push('/(tabs)/patient/records' as any)}
                  >
                    <View style={styles.activityIcon}>
                      <FileText size={18} color={Colors.roles.patient.primary} />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle} numberOfLines={1}>
                        {rec.title}
                      </Text>
                      <Text style={styles.activityDesc} numberOfLines={1}>
                        {rec.description || 'Verified diagnostic record'}
                      </Text>
                    </View>
                    <ChevronRight size={16} color="#94A3B8" />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyCardContainer}>
                  <Text style={styles.emptyCardTitle}>No Medical Records Yet</Text>
                  <Text style={styles.emptyCardSubtitle}>
                    Diagnostic files and clinical summaries will appear here once uploaded.
                  </Text>
                </View>
              )}
            </CardContent>
          </Card>

          {/* Quick AI Action Card */}
          <TouchableOpacity
            style={styles.aiBanner}
            onPress={() => router.push('/(tabs)/patient/pulse-ai' as any)}
            activeOpacity={0.85}
          >
            <View style={styles.aiBannerContent}>
              <Activity size={24} color="#FFFFFF" />
              <View style={styles.aiBannerTextColumn}>
                <Text style={styles.aiBannerTitle}>PULSE AI Health Assistant</Text>
                <Text style={styles.aiBannerDesc}>
                  Ask questions about your symptoms, medications, and clinical records.
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={{ height: 80 }} />
        </ScrollView>
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
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statTouch: {
    flex: 1,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
  },
  statSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
    marginTop: 10,
    paddingHorizontal: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.roles.patient.primary,
  },
  cardSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  nextVisitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  nextVisitIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextVisitDetails: {
    flex: 1,
  },
  nextVisitTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  nextVisitDate: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
  },
  nextVisitStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.roles.patient.primary,
    marginTop: 4,
  },
  emptyCardContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  emptyCardSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  actionLink: {
    marginTop: 10,
    paddingVertical: 4,
  },
  actionLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.roles.patient.primary,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  activityItemLast: {
    borderBottomWidth: 0,
    paddingBottom: 4,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  activityDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  aiBanner: {
    backgroundColor: Colors.roles.patient.primaryDim,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  aiBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    marginRight: 10,
  },
  aiBannerTextColumn: {
    flex: 1,
  },
  aiBannerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  aiBannerDesc: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
});
