import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  Lock,
  Mail,
  Phone,
  AlertCircle,
  RefreshCw,
  Award,
} from 'lucide-react-native';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Colors } from '../../../constants/theme';
import {
  adminService,
  PendingVerificationItem,
  AdminUserItem,
} from '../../../services/admin.service';

type RoleCategory = 'VERIFICATIONS' | 'PATIENTS' | 'DOCTORS' | 'PHARMACIES' | 'ADMINS';

const TABS: { key: RoleCategory; label: string }[] = [
  { key: 'VERIFICATIONS', label: 'Pending Verifications' },
  { key: 'PATIENTS', label: 'Patients' },
  { key: 'DOCTORS', label: 'Doctors' },
  { key: 'PHARMACIES', label: 'Pharmacies' },
  { key: 'ADMINS', label: 'Admins' },
];

export default function AdminUsersScreen() {
  const [activeTab, setActiveTab] = useState<RoleCategory>('VERIFICATIONS');
  const [verifications, setVerifications] = useState<PendingVerificationItem[]>([]);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      if (activeTab === 'VERIFICATIONS') {
        const data = await adminService.getPendingVerifications();
        setVerifications(data);
      } else {
        const roleKey = activeTab.toLowerCase() as 'patients' | 'doctors' | 'pharmacies' | 'admins';
        const data = await adminService.getUsersByRole(roleKey, searchQuery);
        setUsers(data);
      }
    } catch (err: any) {
      console.error('Error loading admin users:', err);
      setError(err.message || 'Failed to load user records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleApproveVerification = async (requestId: string) => {
    setActionLoadingId(requestId);
    try {
      await adminService.approveVerification(requestId);
      Alert.alert('Verified', 'Practitioner credentials approved and account authorized.');
      loadData();
    } catch (err: any) {
      Alert.alert('Approval Failed', err.response?.data?.detail || err.message || 'Could not approve.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectVerification = (requestId: string) => {
    Alert.alert(
      'Reject Verification',
      'Are you sure you want to reject this practitioner verification request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject Request',
          style: 'destructive',
          onPress: async () => {
            setActionLoadingId(requestId);
            try {
              await adminService.rejectVerification(requestId, 'Insufficient credential documentation');
              Alert.alert('Rejected', 'Verification request rejected.');
              loadData();
            } catch (err: any) {
              Alert.alert('Rejection Error', err.response?.data?.detail || err.message || 'Error rejecting.');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  const handleToggleUserStatus = (user: AdminUserItem) => {
    const isSuspended = user.status === 'SUSPENDED';
    const nextStatus = isSuspended ? 'ACTIVE' : 'SUSPENDED';

    Alert.alert(
      isSuspended ? 'Reactivate Account' : 'Suspend Account',
      `Are you sure you want to ${isSuspended ? 'reactivate' : 'suspend'} access for ${user.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isSuspended ? 'Reactivate' : 'Suspend',
          style: isSuspended ? 'default' : 'destructive',
          onPress: async () => {
            setActionLoadingId(user.user_id);
            try {
              await adminService.updateUserStatus(user.user_id, nextStatus as any);
              Alert.alert('Success', `User account status updated to ${nextStatus}.`);
              loadData();
            } catch (err: any) {
              Alert.alert('Status Error', err.response?.data?.detail || err.message || 'Failed to update status.');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  const handleResetSecurity = (user: AdminUserItem) => {
    Alert.alert(
      'Reset Security Credentials',
      `Force reset the 6-digit PIN and authorization credentials for ${user.full_name}? The user must re-enroll upon next sign in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset PIN',
          style: 'destructive',
          onPress: async () => {
            setActionLoadingId(user.user_id);
            try {
              await adminService.resetUserSecurity(user.user_id);
              Alert.alert('Reset Complete', 'User security credentials have been cleared.');
            } catch (err: any) {
              Alert.alert('Reset Failed', err.response?.data?.detail || err.message || 'Could not reset security.');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  // Render Verification Item
  const renderVerificationItem = ({ item }: { item: PendingVerificationItem }) => {
    const isBusy = actionLoadingId === item.id;

    return (
      <Card style={styles.card}>
        <CardContent>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{item.full_name}</Text>
              <Text style={styles.userRole}>{item.role.toUpperCase()} VERIFICATION</Text>
              <Text style={styles.userEmail}>{item.email}</Text>
            </View>
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>Pending Review</Text>
            </View>
          </View>

          {item.license_number ? (
            <View style={styles.metaRow}>
              <Award size={14} color="#0284C7" style={{ marginRight: 6 }} />
              <Text style={styles.metaText}>License: {item.license_number}</Text>
            </View>
          ) : null}

          {item.specialization ? (
            <View style={styles.metaRow}>
              <Shield size={14} color="#64748B" style={{ marginRight: 6 }} />
              <Text style={styles.metaText}>Specialty: {item.specialization}</Text>
            </View>
          ) : null}

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.btn, styles.approveBtn]}
              disabled={isBusy}
              onPress={() => handleApproveVerification(item.id)}
            >
              <CheckCircle2 size={14} color="#059669" style={{ marginRight: 6 }} />
              <Text style={styles.approveBtnText}>Authorize Practitioner</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.rejectBtn]}
              disabled={isBusy}
              onPress={() => handleRejectVerification(item.id)}
            >
              <XCircle size={14} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </CardContent>
      </Card>
    );
  };

  // Render User Item
  const renderUserItem = ({ item }: { item: AdminUserItem }) => {
    const isSuspended = item.status === 'SUSPENDED';
    const isBusy = actionLoadingId === item.user_id;

    return (
      <Card style={styles.card}>
        <CardContent>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{item.full_name}</Text>
              <Text style={styles.userEmail}>{item.email}</Text>
              {item.phone ? <Text style={styles.userPhone}>{item.phone}</Text> : null}
            </View>

            <View
              style={[
                styles.statusBadge,
                isSuspended ? styles.statusSuspended : styles.statusActive,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  isSuspended ? styles.statusTextSuspended : styles.statusTextActive,
                ]}
              >
                {item.status}
              </Text>
            </View>
          </View>

          {item.license_number ? (
            <View style={styles.metaRow}>
              <Award size={13} color="#64748B" style={{ marginRight: 6 }} />
              <Text style={styles.metaText}>License: {item.license_number}</Text>
            </View>
          ) : null}

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.smallBtn, isSuspended ? styles.reactivateBtn : styles.suspendBtn]}
              disabled={isBusy}
              onPress={() => handleToggleUserStatus(item)}
            >
              {isSuspended ? (
                <>
                  <UserCheck size={13} color="#059669" style={{ marginRight: 4 }} />
                  <Text style={styles.reactivateBtnText}>Reactivate</Text>
                </>
              ) : (
                <>
                  <UserX size={13} color="#DC2626" style={{ marginRight: 4 }} />
                  <Text style={styles.suspendBtnText}>Suspend</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.smallBtn, styles.resetBtn]}
              disabled={isBusy}
              onPress={() => handleResetSecurity(item)}
            >
              <Lock size={13} color="#475569" style={{ marginRight: 4 }} />
              <Text style={styles.resetBtnText}>Reset PIN</Text>
            </TouchableOpacity>
          </View>
        </CardContent>
      </Card>
    );
  };

  return (
    <RoleGuard allowedRole="admin">
      <View style={styles.container}>
        <ScreenHeader
          title="User Governance"
          subtitle="Multi-tenant user registry & verification"
        />

        {/* Tab Filters */}
        <View style={styles.tabsWrapper}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={TABS}
            keyExtractor={(t) => t.key}
            contentContainerStyle={styles.tabsContainer}
            renderItem={({ item }) => {
              const active = activeTab === item.key;
              return (
                <TouchableOpacity
                  style={[styles.tabChip, active && styles.tabChipActive]}
                  onPress={() => setActiveTab(item.key)}
                >
                  <Text style={[styles.tabChipText, active && styles.tabChipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Search */}
        {activeTab !== 'VERIFICATIONS' && (
          <View style={styles.searchContainer}>
            <Search size={18} color="#94A3B8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${activeTab.toLowerCase()} by name, email...`}
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <AlertCircle size={16} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadData} style={styles.retryBtn}>
              <RefreshCw size={14} color="#DC2626" />
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={Colors.roles.admin.primary} />
            <Text style={styles.loadingText}>Fetching registry data...</Text>
          </View>
        ) : activeTab === 'VERIFICATIONS' ? (
          verifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <CheckCircle2 size={44} color="#059669" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>Queue Clear</Text>
              <Text style={styles.emptySubtitle}>
                No practitioner verifications currently awaiting administrative review.
              </Text>
              <TouchableOpacity style={styles.refreshEmptyBtn} onPress={onRefresh}>
                <Text style={styles.refreshEmptyBtnText}>Refresh Queue</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={verifications}
              keyExtractor={(item) => item.id}
              renderItem={renderVerificationItem}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[Colors.roles.admin.primary]}
                />
              }
            />
          )
        ) : users.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Users size={44} color="#94A3B8" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No Users Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `No ${activeTab.toLowerCase()} match "${searchQuery}"`
                : `No registered users in role "${activeTab.toLowerCase()}".`}
            </Text>
            <TouchableOpacity style={styles.refreshEmptyBtn} onPress={onRefresh}>
              <Text style={styles.refreshEmptyBtnText}>Refresh List</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            renderItem={renderUserItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.roles.admin.primary]}
              />
            }
          />
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
  tabsWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  tabChipActive: {
    backgroundColor: Colors.roles.admin.primary,
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  tabChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  clearBtn: {
    padding: 4,
  },
  clearBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    flex: 1,
  },
  retryBtn: {
    padding: 4,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
  },
  refreshEmptyBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
  },
  refreshEmptyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.roles.admin.primary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  userRole: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.roles.admin.primary,
    marginTop: 2,
  },
  userEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  userPhone: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#D1FAE5',
  },
  statusSuspended: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextActive: {
    color: '#065F46',
  },
  statusTextSuspended: {
    color: '#991B1B',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#475569',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  approveBtn: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  approveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  rejectBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  suspendBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  suspendBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  reactivateBtn: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  reactivateBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  resetBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
});
