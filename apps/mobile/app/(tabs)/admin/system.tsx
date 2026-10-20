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
import {
  Server,
  Database,
  Brain,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Cpu,
  Layers,
  Activity,
  AlertCircle,
} from 'lucide-react-native';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Colors } from '../../../constants/theme';
import { adminService, ServiceHealthItem } from '../../../services/admin.service';

export default function AdminSystemScreen() {
  const [services, setServices] = useState<ServiceHealthItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const data = await adminService.getSystemHealth();
      setServices(data);
    } catch (err: any) {
      console.error('Failed to load system health diagnostics:', err);
      setError(err.message || 'Failed to fetch microservices health diagnostics.');
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

  const getServiceIcon = (name: string) => {
    if (name.includes('DB') || name.includes('PostgreSQL')) {
      return <Database size={22} color="#0284C7" />;
    }
    if (name.includes('AI') || name.includes('Diagnostic')) {
      return <Brain size={22} color="#8B5CF6" />;
    }
    if (name.includes('Auth') || name.includes('Supabase')) {
      return <ShieldCheck size={22} color="#10B981" />;
    }
    return <Server size={22} color="#F59E0B" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'HEALTHY':
        return {
          bg: '#D1FAE5',
          text: '#065F46',
          icon: <CheckCircle2 size={13} color="#059669" style={{ marginRight: 4 }} />,
        };
      case 'DEGRADED':
        return {
          bg: '#FEF3C7',
          text: '#B45309',
          icon: <AlertTriangle size={13} color="#D97706" style={{ marginRight: 4 }} />,
        };
      case 'ERROR':
        return {
          bg: '#FEE2E2',
          text: '#DC2626',
          icon: <XCircle size={13} color="#DC2626" style={{ marginRight: 4 }} />,
        };
      default:
        return {
          bg: '#F1F5F9',
          text: '#64748B',
          icon: <Activity size={13} color="#64748B" style={{ marginRight: 4 }} />,
        };
    }
  };

  const allHealthy = services.every((s) => s.status === 'HEALTHY');

  return (
    <RoleGuard allowedRole="admin">
      <View style={styles.container}>
        <ScreenHeader
          title="System Diagnostics"
          subtitle="Microservices, cluster & ledger infrastructure"
        />

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={Colors.roles.admin.primary} />
            <Text style={styles.loadingText}>Running infrastructure health checks...</Text>
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
                <AlertCircle size={16} color="#DC2626" style={{ marginRight: 8 }} />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={loadData} style={styles.retryBtn}>
                  <RefreshCw size={14} color="#DC2626" />
                </TouchableOpacity>
              </View>
            )}

            {/* Overall Health Status Banner */}
            <Card style={styles.statusCard}>
              <CardContent>
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusIconCircle,
                      allHealthy ? styles.iconCircleHealthy : styles.iconCircleWarning,
                    ]}
                  >
                    {allHealthy ? (
                      <CheckCircle2 size={28} color="#059669" />
                    ) : (
                      <AlertTriangle size={28} color="#D97706" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statusTitle}>
                      {allHealthy ? 'All Systems Operational' : 'Degraded Service Detected'}
                    </Text>
                    <Text style={styles.statusSub}>
                      {services.filter((s) => s.status === 'HEALTHY').length} of {services.length} core microservices reporting healthy response codes.
                    </Text>
                  </View>
                </View>
              </CardContent>
            </Card>

            {/* Telemetry Summary Cards */}
            <View style={styles.statsRow}>
              <Card style={styles.statCard}>
                <CardContent style={styles.statContent}>
                  <Cpu size={18} color="#64748B" style={{ marginBottom: 4 }} />
                  <Text style={styles.statVal}>FastAPI V1</Text>
                  <Text style={styles.statLbl}>API Gateway</Text>
                </CardContent>
              </Card>

              <Card style={styles.statCard}>
                <CardContent style={styles.statContent}>
                  <Layers size={18} color="#64748B" style={{ marginBottom: 4 }} />
                  <Text style={styles.statVal}>Polygon Amoy</Text>
                  <Text style={styles.statLbl}>Ledger Network</Text>
                </CardContent>
              </Card>

              <Card style={styles.statCard}>
                <CardContent style={styles.statContent}>
                  <Activity size={18} color="#64748B" style={{ marginBottom: 4 }} />
                  <Text style={styles.statVal}>32 ms</Text>
                  <Text style={styles.statLbl}>Avg Latency</Text>
                </CardContent>
              </Card>
            </View>

            {/* Microservices Health Checklist */}
            <Text style={styles.sectionTitle}>Infrastructure Services</Text>

            {services.map((item, idx) => {
              const badge = getStatusBadge(item.status);
              return (
                <Card key={idx} style={styles.serviceCard}>
                  <CardContent>
                    <View style={styles.serviceRow}>
                      <View style={styles.serviceIconCircle}>
                        {getServiceIcon(item.name)}
                      </View>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.serviceName}>{item.name}</Text>
                        <Text style={styles.serviceReason}>{item.reason}</Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                        {badge.icon}
                        <Text style={[styles.badgeText, { color: badge.text }]}>
                          {item.status}
                        </Text>
                      </View>
                    </View>
                  </CardContent>
                </Card>
              );
            })}
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
  statusCard: {
    marginBottom: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconCircleHealthy: {
    backgroundColor: '#D1FAE5',
  },
  iconCircleWarning: {
    backgroundColor: '#FEF3C7',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  statVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  statLbl: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  serviceCard: {
    marginBottom: 10,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  serviceReason: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
