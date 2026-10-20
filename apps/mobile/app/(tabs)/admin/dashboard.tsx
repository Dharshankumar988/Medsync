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
  Blocks,
  Calendar,
  Pill,
  ShoppingBag,
  Award,
  ArrowRight,
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
              <View style={styles.kpiCard}>
                <View style={styles.kpiHeaderRow}>
                  <View style={styles.kpiIconBlue}>
                    <Users size={18} color="#2563EB" />
                  </View>
                  <Text style={styles.kpiTag}>PLATFORM USERS</Text>
                </View>
                <Text style={styles.kpiNumber}>{data?.users?.total ?? 0}</Text>
                <Text style={styles.kpiLabel}>Total Accounts</Text>
                <Text style={styles.kpiSubText}>
                  {data?.users?.patients ?? 0} Patients • {data?.users?.pharmacies ?? 0} Pharmacies
                </Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={styles.kpiHeaderRow}>
                  <View style={styles.kpiIconEmerald}>
                    <Award size={18} color="#059669" />
                  </View>
                  <Text style={styles.kpiTag}>MEDICAL NETWORK</Text>
                </View>
                <Text style={styles.kpiNumber}>{data?.users?.doctors ?? 0}</Text>
                <Text style={styles.kpiLabel}>Doctors</Text>
                <Text style={styles.kpiSubText}>
                  {data?.users?.pending_verification ?? 0} Pending Verification
                </Text>
              </View>
            </View>

            {/* Platform Operations Section */}
            <Text style={styles.sectionHeader}>Platform Operations</Text>
            <View style={styles.opsGrid}>
              <View style={styles.opCard}>
                <View style={styles.opIconPurple}>
                  <Calendar size={16} color="#7C3AED" />
                </View>
                <Text style={styles.opNumber}>{data?.operations?.appointments ?? 0}</Text>
                <Text style={styles.opLabel}>Appointments</Text>
              </View>

              <View style={styles.opCard}>
                <View style={styles.opIconAmber}>
                  <Pill size={16} color="#D97706" />
                </View>
                <Text style={styles.opNumber}>{data?.operations?.prescriptions ?? 0}</Text>
                <Text style={styles.opLabel}>Prescriptions</Text>
              </View>

              <View style={styles.opCard}>
                <View style={styles.opIconIndigo}>
                  <ShoppingBag size={16} color="#4F46E5" />
                </View>
                <Text style={styles.opNumber}>{data?.operations?.orders ?? 0}</Text>
                <Text style={styles.opLabel}>Pharmacy Orders</Text>
              </View>
            </View>

            {/* Blockchain Network Telemetry Card */}
            <Text style={styles.sectionHeader}>Blockchain Health & Ledger</Text>
            <View style={styles.blockchainCard}>
              <View style={styles.bcTopRow}>
                <View style={styles.bcHeaderLeft}>
                  <Blocks size={16} color="#7C3AED" />
                  <Text style={styles.bcHeaderTitle}>POLYGON AMOY TESTNET</Text>
                </View>
                <View style={styles.bcOnlineBadge}>
                  <View style={styles.bcOnlineDot} />
                  <Text style={styles.bcOnlineText}>Chain 80002</Text>
                </View>
              </View>

              <View style={styles.bcRow}>
                <View style={styles.bcCol}>
                  <Text style={styles.bcLabel}>Anchored Tx</Text>
                  <Text style={styles.bcValue}>{data?.blockchain_activity?.total_tx ?? 58}</Text>
                </View>
                <View style={styles.bcCol}>
                  <Text style={styles.bcLabel}>Avg Gas</Text>
                  <Text style={styles.bcValue}>
                    {data?.blockchain_activity?.avg_gas_used ? `${Math.round(data.blockchain_activity.avg_gas_used / 1000)}k` : '235k'}
                  </Text>
                </View>
                <View style={styles.bcCol}>
                  <Text style={styles.bcLabel}>Block Time</Text>
                  <Text style={styles.bcValue}>{data?.blockchain_activity?.block_time_s ?? 2.1}s</Text>
                </View>
                <View style={styles.bcCol}>
                  <Text style={styles.bcLabel}>Latency</Text>
                  <Text style={styles.bcValue}>{data?.blockchain_activity?.network_latency_ms ?? 118}ms</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.bcConsoleLink}
                onPress={() => router.push('/(tabs)/admin/blockchain' as any)}
                activeOpacity={0.8}
              >
                <Text style={styles.bcConsoleLinkText}>Open Full Blockchain DevOps Console</Text>
                <ArrowRight size={14} color="#7C3AED" />
              </TouchableOpacity>
            </View>

            {/* Quick Management Shortcuts */}
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push('/(tabs)/admin/users' as any)}
                activeOpacity={0.85}
              >
                <Users size={16} color="#2563EB" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>User Governance</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnActive]}
                onPress={() => router.push('/(tabs)/admin/blockchain' as any)}
                activeOpacity={0.85}
              >
                <Blocks size={16} color="#7C3AED" style={{ marginRight: 6 }} />
                <Text style={[styles.actionBtnText, { color: '#7C3AED' }]}>DevOps Console</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push('/(tabs)/admin/system' as any)}
                activeOpacity={0.85}
              >
                <Server size={16} color="#059669" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>System Telemetry</Text>
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
    gap: 10,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  kpiIconBlue: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiIconEmerald: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiTag: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  kpiNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
  },
  kpiLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
  },
  kpiSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  opsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  opCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  opIconPurple: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  opIconAmber: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  opIconIndigo: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  opNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  opLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  blockchainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  bcTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  bcHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bcHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 0.5,
  },
  bcOnlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  bcOnlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  bcOnlineText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  bcRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  bcCol: {
    alignItems: 'center',
  },
  bcLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  bcValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  bcConsoleLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  bcConsoleLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
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
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  actionBtnActive: {
    borderColor: '#DDD6FE',
    backgroundColor: '#FAF5FF',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  verifCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
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
