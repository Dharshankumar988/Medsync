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
} from 'react-native';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Lock,
  Clock,
  AlertCircle,
  RefreshCw,
  Terminal,
} from 'lucide-react-native';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Colors } from '../../../constants/theme';
import { adminService, SecurityLogItem, SecurityAlertItem } from '../../../services/admin.service';

export default function AdminSecurityScreen() {
  const [logs, setLogs] = useState<SecurityLogItem[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const data = await adminService.getSecurityData();
      setLogs(data.logs);
      setAlerts(data.alerts);
    } catch (err: any) {
      console.error('Error fetching security audit logs:', err);
      setError(err.message || 'Failed to load security telemetry.');
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

  const getMethodBadge = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return { bg: '#E0F2FE', text: '#0369A1' };
      case 'POST':
        return { bg: '#D1FAE5', text: '#065F46' };
      case 'PUT':
      case 'PATCH':
        return { bg: '#FEF3C7', text: '#B45309' };
      case 'DELETE':
        return { bg: '#FEE2E2', text: '#DC2626' };
      default:
        return { bg: '#F1F5F9', text: '#475569' };
    }
  };

  const getStatusBadge = (code: number) => {
    if (code >= 200 && code < 300) return { bg: '#D1FAE5', text: '#065F46' };
    if (code >= 400 && code < 500) return { bg: '#FEF3C7', text: '#B45309' };
    return { bg: '#FEE2E2', text: '#DC2626' };
  };

  const filteredLogs = searchQuery.trim()
    ? logs.filter((l) => l.endpoint.toLowerCase().includes(searchQuery.toLowerCase()))
    : logs;

  const renderLogItem = ({ item }: { item: SecurityLogItem }) => {
    const methodBadge = getMethodBadge(item.method);
    const statusBadge = getStatusBadge(item.status_code);

    return (
      <View style={styles.logRow}>
        <View style={styles.logTop}>
          <View style={[styles.methodBadge, { backgroundColor: methodBadge.bg }]}>
            <Text style={[styles.methodText, { color: methodBadge.text }]}>{item.method}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
            <Text style={[styles.statusText, { color: statusBadge.text }]}>{item.status_code}</Text>
          </View>
          <Text style={styles.logTime}>
            {new Date(item.created_at).toLocaleTimeString()}
          </Text>
        </View>

        <Text style={styles.logEndpoint} numberOfLines={2}>
          {item.endpoint}
        </Text>
      </View>
    );
  };

  return (
    <RoleGuard allowedRole="admin">
      <View style={styles.container}>
        <ScreenHeader
          title="Security & Audit"
          subtitle="API request telemetry & authentication alerts"
        />

        {/* Security Alerts Header */}
        <View style={styles.alertsSection}>
          {alerts.length === 0 ? (
            <Card style={styles.cleanCard}>
              <CardContent>
                <View style={styles.cleanRow}>
                  <ShieldCheck size={26} color="#059669" style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cleanTitle}>Security Posture Healthy</Text>
                    <Text style={styles.cleanSub}>No active authorization violations or attack signatures detected.</Text>
                  </View>
                </View>
              </CardContent>
            </Card>
          ) : (
            alerts.map((a, i) => (
              <View key={i} style={styles.alertBanner}>
                <ShieldAlert size={20} color="#DC2626" style={{ marginRight: 10 }} />
                <Text style={styles.alertText}>{a.message}</Text>
              </View>
            ))
          )}
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Search size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search API endpoints in audit trail..."
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

        {error && (
          <View style={styles.errorBox}>
            <AlertCircle size={16} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadData} style={styles.retryBtn}>
              <RefreshCw size={14} color="#DC2626" />
            </TouchableOpacity>
          </View>
        )}

        {/* Audit Log Stream */}
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={Colors.roles.admin.primary} />
            <Text style={styles.loadingText}>Fetching system audit logs...</Text>
          </View>
        ) : filteredLogs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Terminal size={40} color="#94A3B8" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No Audit Records</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `No requests match "${searchQuery}"`
                : 'No recent API request logs captured.'}
            </Text>
            <TouchableOpacity style={styles.refreshEmptyBtn} onPress={onRefresh}>
              <Text style={styles.refreshEmptyBtnText}>Refresh Telemetry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredLogs}
            keyExtractor={(item) => item.id}
            renderItem={renderLogItem}
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
  alertsSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  cleanCard: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  cleanRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cleanTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
  cleanSub: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  alertText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
    flex: 1,
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
  logRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  methodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  methodText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  logTime: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 'auto',
  },
  logEndpoint: {
    fontSize: 13,
    color: '#0F172A',
    fontFamily: 'monospace',
  },
});
