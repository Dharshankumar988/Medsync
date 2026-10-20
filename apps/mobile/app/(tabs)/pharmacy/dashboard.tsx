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
  LayoutDashboard,
  ShoppingBag,
  Package,
  Pill,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Clock,
  ChevronRight,
  AlertCircle,
  Truck,
  Plus,
} from 'lucide-react-native';
import { Card, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { Colors } from '../../../constants/theme';
import {
  pharmacyService,
  PharmacyDashboardSummary,
  PharmacyOrderItem,
} from '../../../services/pharmacy.service';
import { DispensePrescriptionModal } from '../../../components/pharmacy/DispensePrescriptionModal';
import { AddInventoryItemModal } from '../../../components/pharmacy/AddInventoryItemModal';
import { QRScanner } from '../../../components/common/QRScanner';

export default function PharmacyDashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<PharmacyDashboardSummary>({
    pendingOrdersCount: 0,
    dispensedOrdersCount: 0,
    deliveredOrdersCount: 0,
    totalOrdersCount: 0,
    inventoryCount: 0,
    lowStockCount: 0,
    expiringSoonCount: 0,
    recentOrders: [],
    alerts: { low_stock: [], expiring_soon: [], expired: [] },
  });

  // Modal states
  const [dispenseOrder, setDispenseOrder] = useState<PharmacyOrderItem | null>(null);
  const [isAddMedOpen, setIsAddMedOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const data = await pharmacyService.getDashboardSummary();
      setSummary(data);
    } catch (err: any) {
      console.error('Failed to load pharmacy dashboard:', err);
      setError(err.message || 'Unable to connect to pharmacy servers.');
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { bg: '#FEF3C7', text: '#D97706', label: 'Pending' };
      case 'ACCEPTED':
      case 'PACKED':
        return { bg: '#EFF6FF', text: '#2563EB', label: status };
      case 'OUT_FOR_DELIVERY':
        return { bg: '#F5F3FF', text: '#7C3AED', label: 'Out for Delivery' };
      case 'DISPENSED':
      case 'DELIVERED':
        return { bg: '#ECFDF5', text: '#059669', label: status };
      case 'CANCELLED':
      case 'REJECTED':
        return { bg: '#FEE2E2', text: '#DC2626', label: status };
      default:
        return { bg: '#F1F5F9', text: '#64748B', label: status };
    }
  };

  return (
    <RoleGuard allowedRole="pharmacy">
      <View style={styles.container}>
        <ScreenHeader
          title="Pharmacy Operations"
          subtitle={summary.businessName || 'Dispensation, orders & medication stock'}
          rightElement={
            <TouchableOpacity
              style={styles.qrHeaderBtn}
              onPress={() => setIsScannerOpen(!isScannerOpen)}
            >
              <QrCode size={20} color={Colors.roles.pharmacy.primary} />
            </TouchableOpacity>
          }
        />

        {/* QR Scanner Drawer */}
        {isScannerOpen && (
          <View style={styles.scannerWrapper}>
            <View style={styles.scannerHeaderRow}>
              <Text style={styles.scannerTitle}>Counter Prescription QR Scanner</Text>
              <TouchableOpacity onPress={() => setIsScannerOpen(false)}>
                <Text style={styles.scannerCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
            <QRScanner
              role="pharmacy"
              verifyHandler={(token) => pharmacyService.verifyPrescriptionQR(token)}
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
              <ActivityIndicator size="large" color={Colors.roles.pharmacy.primary} />
              <Text style={styles.loadingText}>Fetching pharmacy queues & inventory...</Text>
            </View>
          ) : (
            <>
              {/* Quick Actions */}
              <View style={styles.actionBar}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => router.push('/(tabs)/pharmacy/orders')}
                >
                  <ShoppingBag size={16} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Orders Queue</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnSecondary]}
                  onPress={() => setIsAddMedOpen(true)}
                >
                  <Plus size={16} color={Colors.roles.pharmacy.primary} />
                  <Text style={[styles.actionBtnText, { color: Colors.roles.pharmacy.primary }]}>
                    Add Stock
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Real Operational Stats */}
              <View style={styles.statsGrid}>
                <Card style={styles.statCard}>
                  <CardContent>
                    <View style={styles.statHeader}>
                      <Text style={styles.statLabel}>Pending Orders</Text>
                      <ShoppingBag size={16} color={Colors.roles.pharmacy.primary} />
                    </View>
                    <Text style={[styles.statValue, { color: '#D97706' }]}>
                      {summary.pendingOrdersCount}
                    </Text>
                    <Text style={styles.statSub}>Awaiting dispensing</Text>
                  </CardContent>
                </Card>

                <Card style={styles.statCard}>
                  <CardContent>
                    <View style={styles.statHeader}>
                      <Text style={styles.statLabel}>Dispensed</Text>
                      <CheckCircle2 size={16} color="#059669" />
                    </View>
                    <Text style={[styles.statValue, { color: '#059669' }]}>
                      {summary.dispensedOrdersCount}
                    </Text>
                    <Text style={styles.statSub}>Verified & sealed</Text>
                  </CardContent>
                </Card>
              </View>

              <View style={styles.statsGrid}>
                <Card style={styles.statCard}>
                  <CardContent>
                    <View style={styles.statHeader}>
                      <Text style={styles.statLabel}>Total Medicines</Text>
                      <Package size={16} color="#2563EB" />
                    </View>
                    <Text style={[styles.statValue, { color: '#2563EB' }]}>
                      {summary.inventoryCount}
                    </Text>
                    <Text style={styles.statSub}>Batches in inventory</Text>
                  </CardContent>
                </Card>

                <Card style={styles.statCard}>
                  <CardContent>
                    <View style={styles.statHeader}>
                      <Text style={styles.statLabel}>Low Stock Alerts</Text>
                      <AlertTriangle size={16} color="#DC2626" />
                    </View>
                    <Text style={[styles.statValue, { color: '#DC2626' }]}>
                      {summary.lowStockCount}
                    </Text>
                    <Text style={styles.statSub}>Below threshold</Text>
                  </CardContent>
                </Card>
              </View>

              {/* Critical Alerts Banner (if any) */}
              {summary.lowStockCount > 0 && (
                <TouchableOpacity
                  style={styles.alertBanner}
                  onPress={() => router.push('/(tabs)/pharmacy/inventory')}
                >
                  <AlertTriangle size={18} color="#DC2626" style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertBannerTitle}>Urgent Stock Replenishment</Text>
                    <Text style={styles.alertBannerSub}>
                      {summary.lowStockCount} medicine(s) have reached minimum stock levels.
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#DC2626" />
                </TouchableOpacity>
              )}

              {/* Recent Orders Queue */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Prescription Fulfillment Queue</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/pharmacy/orders')}>
                  <Text style={styles.seeAllText}>See all ({summary.totalOrdersCount})</Text>
                </TouchableOpacity>
              </View>

              {summary.recentOrders.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <CardContent>
                    <View style={styles.emptyContainer}>
                      <ShoppingBag size={36} color="#94A3B8" />
                      <Text style={styles.emptyTitle}>No Orders Pending</Text>
                      <Text style={styles.emptySub}>
                        Your fulfillment queue is up to date. Incoming patient orders and doctor routed prescriptions will appear here.
                      </Text>
                    </View>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent>
                    {summary.recentOrders.map((order, idx) => {
                      const badge = getStatusBadge(order.status);
                      const isLast = idx === summary.recentOrders.length - 1;

                      return (
                        <View
                          key={order.id}
                          style={[styles.orderItem, isLast && styles.orderItemLast]}
                        >
                          <View style={styles.orderItemContent}>
                            <View style={styles.orderItemHeader}>
                              <Text style={styles.patientName}>{order.patient_name}</Text>
                              <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                                <Text style={[styles.statusText, { color: badge.text }]}>
                                  {badge.label}
                                </Text>
                              </View>
                            </View>

                            <Text style={styles.medicationText} numberOfLines={1}>
                              {order.medication}
                            </Text>

                            <Text style={styles.orderDate}>
                              Order #{order.id.slice(0, 8)} •{' '}
                              {new Date(order.created_at).toLocaleDateString()}
                            </Text>
                          </View>

                          {order.status === 'PENDING' && (
                            <TouchableOpacity
                              style={styles.dispenseBtn}
                              onPress={() => setDispenseOrder(order)}
                            >
                              <Pill size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                              <Text style={styles.dispenseBtnText}>Dispense</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </ScrollView>

        {/* Dispense Modal */}
        <DispensePrescriptionModal
          visible={Boolean(dispenseOrder)}
          order={dispenseOrder}
          onClose={() => setDispenseOrder(null)}
          onSuccess={() => {
            fetchDashboard();
          }}
        />

        {/* Add Stock Modal */}
        <AddInventoryItemModal
          visible={isAddMedOpen}
          onClose={() => setIsAddMedOpen(false)}
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
    backgroundColor: '#FEF3C7',
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
    color: Colors.roles.pharmacy.primary,
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
    backgroundColor: Colors.roles.pharmacy.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginRight: 8,
  },
  actionBtnSecondary: {
    backgroundColor: '#FEF3C7',
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
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  alertBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  alertBannerSub: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.roles.pharmacy.primary,
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
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  orderItemLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  orderItemContent: {
    flex: 1,
  },
  orderItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  medicationText: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  dispenseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.roles.pharmacy.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 10,
  },
  dispenseBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
