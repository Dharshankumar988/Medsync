import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Shield,
  Users,
  CheckCircle2,
  XCircle,
  Activity,
  Server,
  FileText,
  AlertTriangle,
  RefreshCw,
  Link,
  Clock,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react-native';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Colors } from '../../../constants/theme';
import { adminService, AdminDashboardData } from '../../../services/admin.service';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const res = await adminService.getDashboard();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load admin dashboard:', err);
      setError(err.message || 'Failed to load administration dashboard.');
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

  const handleApprove = async (requestId: string) => {
    setActionLoadingId(requestId);
    try {
      await adminService.approveVerification(requestId);
      Alert.alert('Approved', 'Practitioner credentials verified and authorized.');
      loadData();
    } catch (err: any) {
      Alert.alert('Approval Failed', err.response?.data?.detail || err.message || 'Error approving.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    Alert.alert(
      'Reject Verification',
      'Are you sure you want to reject this practitioner verification request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setActionLoadingId(requestId);
            try {
              await adminService.rejectVerification(requestId, 'Documentation does not meet regulatory standards');
              Alert.alert('Rejected', 'Verification request rejected.');
              loadData();
            } catch (err: any) {
              Alert.alert('Rejection Failed', err.response?.data?.detail || err.message || 'Error rejecting.');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <RoleGuard allowedRole="admin">
      <View style={styles.container}>
        <ScreenHeader
          title="MedSync Governance"
          subtitle="Platform telemetry & administration console"
        />

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={Colors.roles.admin.primary} />
            <Text style={styles.loadingText}>Fetching system-wide metrics and queues...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.roles.admin.primary]}
              />
            }
          >
            {error && (
              <View style={styles.errorBox}>
                <ShieldAlert size={18} color="#DC2626" style={{ marginRight: 8 }} />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={loadData} style={styles.retryBtn}>
                  <RefreshCw size={14} color="#DC2626" />
                </TouchableOpacity>
              </View>
            )}

            {/* Pending Verification Alert Banner */}
            {(data?.users?.pending_verification ?? 0) > 0 && (
              <TouchableOpacity
                style={styles.pendingBanner}
                onPress={() => router.push('/(tabs)/admin/users' as any)}
              >
                <AlertTriangle size={20} color="#D97706" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pendingBannerTitle}>
                    {data?.users.pending_verification} Practitioner Verifications Pending
                  </Text>
                  <Text style={styles.pendingBannerSub}>
                    Medical licenses awaiting administrative review
                  </Text>
                </View>
                <ChevronRight size={18} color="#D97706" />
              </TouchableOpacity>
            )}

            {/* User Breakdown Section */}
            <Text style={styles.sectionHeader}>User Registry Overview</Text>
            <View style={styles.kpiGrid}>
              <Card style={styles.kpiCard}>
                <CardContent style={styles.kpiCardContent}>
                  <Text style={styles.kpiNumber}>{data?.users?.total ?? 0}</Text>
                  <Text style={styles.kpiLabel}>Total Users</Text>
                  <View style={styles.roleBadgesRow}>
                    <Text style={styles.subBadge}>{data?.users?.patients ?? 0} Patients</Text>
                  </View>
                </CardContent>
              </Card>

              <Card style={styles.kpiCard}>
                <CardContent style={styles.kpiCardContent}>
                  <Text style={styles.kpiNumber}>{data?.users?.doctors ?? 0}</Text>
                  <Text style={styles.kpiLabel}>Doctors</Text>
                  <View style={styles.roleBadgesRow}>
                    <Text style={styles.subBadge}>{data?.users?.pharmacies ?? 0} Pharmacies</Text>
                  </View>
                </CardContent>
              </Card>
            </View>

            {/* Platform Operations Section */}
            <Text style={styles.sectionHeader}>Platform Operations</Text>
            <View style={styles.kpiGrid}>
              <Card style={styles.kpiCard}>
                <CardContent style={styles.kpiCardContent}>
                  <Text style={styles.kpiNumber}>{data?.operations?.appointments ?? 0}</Text>
                  <Text style={styles.kpiLabel}>Appointments</Text>
                </CardContent>
              </Card>

              <Card style={styles.kpiCard}>
                <CardContent style={styles.kpiCardContent}>
                  <Text style={styles.kpiNumber}>{data?.operations?.prescriptions ?? 0}</Text>
                  <Text style={styles.kpiLabel}>Prescriptions</Text>
                </CardContent>
              </Card>

              <Card style={styles.kpiCard}>
                <CardContent style={styles.kpiCardContent}>
                  <Text style={styles.kpiNumber}>{data?.operations?.orders ?? 0}</Text>
                  <Text style={styles.kpiLabel}>Orders</Text>
                </CardContent>
              </Card>
            </View>

            {/* Blockchain Network Telemetry */}
            <Text style={styles.sectionHeader}>Blockchain Health & Ledger</Text>
            <Card style={styles.blockchainCard}>
              <CardContent>
                <View style={styles.bcRow}>
                  <View style={styles.bcCol}>
                    <Text style={styles.bcLabel}>Anchored Tx</Text>
                    <Text style={styles.bcValue}>{data?.blockchain_activity?.total_tx ?? 0}</Text>
                  </View>
                  <View style={styles.bcCol}>
                    <Text style={styles.bcLabel}>Avg Gas</Text>
                    <Text style={styles.bcValue}>
                      {data?.blockchain_activity?.avg_gas_used ? `${Math.round(data.blockchain_activity.avg_gas_used / 1000)}k` : '45k'}
                    </Text>
                  </View>
                  <View style={styles.bcCol}>
                    <Text style={styles.bcLabel}>Block Time</Text>
                    <Text style={styles.bcValue}>{data?.blockchain_activity?.block_time_s ?? 2.1}s</Text>
                  </View>
                  <View style={styles.bcCol}>
                    <Text style={styles.bcLabel}>Latency</Text>
                    <Text style={styles.bcValue}>{data?.blockchain_activity?.network_latency_ms ?? 120}ms</Text>
                  </View>
                </View>
              </CardContent>
            </Card>

            {/* Quick Management Shortcuts */}
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push('/(tabs)/admin/users' as any)}
              >
                <Users size={18} color={Colors.roles.admin.primary} style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>User Governance</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push('/(tabs)/admin/security' as any)}
              >
                <Shield size={18} color={Colors.roles.admin.primary} style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Security Logs</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push('/(tabs)/admin/system' as any)}
              >
                <Server size={18} color={Colors.roles.admin.primary} style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>System Diagnostics</Text>
              </TouchableOpacity>
            </View>

            {/* Recent Pending Verifications Queue */}
            {data?.recent_pending_verifications && data.recent_pending_verifications.length > 0 && (
              <>
                <Text style={styles.sectionHeader}>Pending Verification Queue</Text>
                {data.recent_pending_verifications.map((item) => {
                  const isBusy = actionLoadingId === item.request_id;
                  return (
                    <Card key={item.request_id} style={styles.verifCard}>
                      <CardContent>
                        <View style={styles.verifRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.verifEmail}>{item.email}</Text>
                            <Text style={styles.verifRole}>Role: {item.role.toUpperCase()}</Text>
                            <Text style={styles.verifDate}>
                              Submitted: {new Date(item.created_at).toLocaleDateString()}
                            </Text>
                          </View>
                          <View style={styles.verifActions}>
                            <TouchableOpacity
                              style={[styles.smallBtn, styles.approveBtn]}
                              disabled={isBusy}
                              onPress={() => handleApprove(item.request_id)}
                            >
                              <CheckCircle2 size={14} color="#059669" style={{ marginRight: 4 }} />
                              <Text style={styles.approveBtnText}>Authorize</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.smallBtn, styles.rejectBtn]}
                              disabled={isBusy}
                              onPress={() => handleReject(item.request_id)}
                            >
                              <XCircle size={14} color="#DC2626" style={{ marginRight: 4 }} />
                              <Text style={styles.rejectBtnText}>Reject</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </CardContent>
                    </Card>
                  );
                })}
              </>
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
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  pendingBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B45309',
  },
  pendingBannerSub: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 8,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
  },
  kpiCardContent: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  kpiNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  roleBadgesRow: {
    marginTop: 4,
  },
  subBadge: {
    fontSize: 11,
    color: '#94A3B8',
  },
  blockchainCard: {
    marginBottom: 14,
  },
  bcRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 6,
  },
  bcCol: {
    alignItems: 'center',
  },
  bcLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  bcValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
  },
  verifCard: {
    marginBottom: 8,
  },
  verifRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifEmail: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  verifRole: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  verifDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  verifActions: {
    flexDirection: 'column',
    gap: 6,
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  approveBtn: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  approveBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  rejectBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
});
