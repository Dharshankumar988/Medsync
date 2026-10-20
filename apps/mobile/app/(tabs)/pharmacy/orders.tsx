import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  ShoppingBag,
  Search,
  Filter,
  User,
  Phone,
  MapPin,
  Pill,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { Colors } from '../../../constants/theme';
import { pharmacyService, PharmacyOrderItem } from '../../../services/pharmacy.service';
import { DispensePrescriptionModal } from '../../../components/pharmacy/DispensePrescriptionModal';

type FilterTab = 'ALL' | 'PENDING' | 'ACCEPTED' | 'DISPENSED' | 'OUT_FOR_DELIVERY' | 'DELIVERED';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'ALL', label: 'All Orders' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'DISPENSED', label: 'Dispensed' },
  { key: 'OUT_FOR_DELIVERY', label: 'In Transit' },
  { key: 'DELIVERED', label: 'Delivered' },
];

export default function PharmacyOrdersScreen() {
  const [orders, setOrders] = useState<PharmacyOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Dispense Modal State
  const [dispenseModalVisible, setDispenseModalVisible] = useState(false);
  const [selectedOrderForDispense, setSelectedOrderForDispense] = useState<PharmacyOrderItem | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      setError(null);
      const data = await pharmacyService.getOrders(
        selectedTab === 'ALL' ? undefined : selectedTab,
        searchQuery
      );
      setOrders(data);
    } catch (err: any) {
      console.error('Error fetching pharmacy orders:', err);
      setError(err.message || 'Failed to load pharmacy orders. Please pull to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedTab, searchQuery]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const handleDispatch = (orderId: string) => {
    Alert.alert(
      'Dispatch Courier',
      'Are you sure you want to dispatch this order for delivery? This starts active live courier tracking.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dispatch Now',
          onPress: async () => {
            setActionLoadingId(orderId);
            try {
              await pharmacyService.dispatchOrder(orderId);
              Alert.alert('Dispatched', 'Order dispatched with live tracking enabled.');
              loadOrders();
            } catch (err: any) {
              const msg = err.response?.data?.detail || err.message || 'Dispatch failed.';
              Alert.alert('Dispatch Error', msg);
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  const handleCompleteDelivery = (orderId: string) => {
    Alert.alert(
      'Confirm Delivery',
      'Confirm that this medication order has been physically received by the patient?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Delivered',
          onPress: async () => {
            setActionLoadingId(orderId);
            try {
              await pharmacyService.completeDelivery(orderId);
              Alert.alert('Completed', 'Order marked as successfully delivered.');
              loadOrders();
            } catch (err: any) {
              const msg = err.response?.data?.detail || err.message || 'Failed to mark delivered.';
              Alert.alert('Error', msg);
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { bg: '#FEF3C7', text: '#B45309', label: 'Pending Verification' };
      case 'ACCEPTED':
        return { bg: '#DBEAFE', text: '#1E40AF', label: 'Accepted' };
      case 'DISPENSED':
        return { bg: '#F3E8FF', text: '#6B21A8', label: 'Dispensed' };
      case 'OUT_FOR_DELIVERY':
        return { bg: '#FFEDD5', text: '#C2410C', label: 'Out for Delivery' };
      case 'DELIVERED':
        return { bg: '#D1FAE5', text: '#065F46', label: 'Delivered' };
      case 'CANCELLED':
        return { bg: '#FEE2E2', text: '#991B1B', label: 'Cancelled' };
      default:
        return { bg: '#F1F5F9', text: '#475569', label: status };
    }
  };

  const renderOrderItem = ({ item }: { item: PharmacyOrderItem }) => {
    const badge = getStatusBadgeStyle(item.status);
    const isActionBusy = actionLoadingId === item.id;

    return (
      <View style={styles.orderCard}>
        {/* Top Bar: Order ID & Status */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderNumber}>
              Order #{item.id ? item.id.slice(0, 8).toUpperCase() : 'N/A'}
            </Text>
            <Text style={styles.orderDate}>
              {item.created_at ? new Date(item.created_at).toLocaleString() : 'Just now'}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        {/* Patient Details */}
        <View style={styles.patientSection}>
          <View style={styles.infoRow}>
            <User size={15} color="#64748B" style={styles.rowIcon} />
            <Text style={styles.patientName}>{item.patient_name || 'Patient'}</Text>
          </View>

          {item.patient_phone ? (
            <View style={styles.infoRow}>
              <Phone size={14} color="#64748B" style={styles.rowIcon} />
              <Text style={styles.infoText}>{item.patient_phone}</Text>
            </View>
          ) : null}

          {item.patient_address ? (
            <View style={styles.infoRow}>
              <MapPin size={14} color="#64748B" style={styles.rowIcon} />
              <Text style={styles.infoText} numberOfLines={2}>
                {item.patient_address}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Medication Info */}
        <View style={styles.medicationBox}>
          <View style={styles.medicationHeader}>
            <Pill size={14} color={Colors.roles.pharmacy.primary} style={{ marginRight: 6 }} />
            <Text style={styles.medicationLabel}>Prescribed Medication</Text>
          </View>
          <Text style={styles.medicationName}>{item.medication || 'Medication Fulfillment'}</Text>
          {item.total_amount ? (
            <Text style={styles.orderTotal}>Amount: ₹{item.total_amount.toFixed(2)}</Text>
          ) : null}
        </View>

        {/* Action Controls */}
        <View style={styles.cardActions}>
          {item.status !== 'DISPENSED' && item.status !== 'DELIVERED' && item.status !== 'CANCELLED' && (
            <TouchableOpacity
              style={[styles.btn, styles.dispenseBtn]}
              disabled={isActionBusy}
              onPress={() => {
                setSelectedOrderForDispense(item);
                setDispenseModalVisible(true);
              }}
            >
              <Pill size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.btnTextWhite}>Dispense Prescription</Text>
            </TouchableOpacity>
          )}

          {item.status === 'DISPENSED' && (
            <TouchableOpacity
              style={[styles.btn, styles.dispatchBtn]}
              disabled={isActionBusy}
              onPress={() => handleDispatch(item.id)}
            >
              {isActionBusy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Truck size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.btnTextWhite}>Dispatch Courier</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {item.status === 'OUT_FOR_DELIVERY' && (
            <TouchableOpacity
              style={[styles.btn, styles.deliverBtn]}
              disabled={isActionBusy}
              onPress={() => handleCompleteDelivery(item.id)}
            >
              {isActionBusy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <CheckCircle2 size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.btnTextWhite}>Mark Delivered</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {item.status === 'DELIVERED' && (
            <View style={styles.completedTag}>
              <CheckCircle2 size={14} color="#059669" style={{ marginRight: 4 }} />
              <Text style={styles.completedTagText}>Order Fulfilled & Closed</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <RoleGuard allowedRole="pharmacy">
      <Stack.Screen
        options={{
          title: 'Prescription Orders',
          headerShown: true,
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerShadowVisible: false,
        }}
      />
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search patient, medication or order ID..."
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

        {/* Filter Tabs */}
        <View style={styles.tabsWrapper}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={TABS}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.tabsContainer}
            renderItem={({ item }) => {
              const active = selectedTab === item.key;
              return (
                <TouchableOpacity
                  style={[styles.tabChip, active && styles.tabChipActive]}
                  onPress={() => setSelectedTab(item.key)}
                >
                  <Text style={[styles.tabChipText, active && styles.tabChipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Error Banner */}
        {error ? (
          <View style={styles.errorBanner}>
            <AlertCircle size={16} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadOrders} style={styles.retryBtn}>
              <RefreshCw size={14} color="#DC2626" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Content List */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.roles.pharmacy.primary} />
            <Text style={styles.loadingText}>Fetching authorized pharmacy orders...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <ShoppingBag size={32} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No Orders Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `No orders matching "${searchQuery}"`
                : selectedTab === 'ALL'
                ? 'Your pharmacy has no pending or active medication orders.'
                : `No orders in "${selectedTab.replace(/_/g, ' ')}" status.`}
            </Text>
            <TouchableOpacity style={styles.refreshEmptyBtn} onPress={onRefresh}>
              <Text style={styles.refreshEmptyBtnText}>Refresh Queue</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => item.id}
            renderItem={renderOrderItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.roles.pharmacy.primary]}
              />
            }
          />
        )}

        {/* Dispense Prescription PIN Verification Modal */}
        <DispensePrescriptionModal
          visible={dispenseModalVisible}
          order={selectedOrderForDispense}
          onClose={() => {
            setDispenseModalVisible(false);
            setSelectedOrderForDispense(null);
          }}
          onSuccess={() => {
            loadOrders();
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
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
  tabsWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
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
    backgroundColor: Colors.roles.pharmacy.primary,
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
  },
  retryBtn: {
    padding: 4,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
    lineHeight: 18,
  },
  refreshEmptyBtn: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  refreshEmptyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.roles.pharmacy.primary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
    marginBottom: 10,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  orderDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  patientSection: {
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rowIcon: {
    marginRight: 6,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  infoText: {
    fontSize: 13,
    color: '#475569',
    flex: 1,
  },
  medicationBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 12,
  },
  medicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  medicationLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  medicationName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  orderTotal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    flex: 1,
  },
  dispenseBtn: {
    backgroundColor: Colors.roles.pharmacy.primary,
  },
  dispatchBtn: {
    backgroundColor: '#EA580C',
  },
  deliverBtn: {
    backgroundColor: '#059669',
  },
  btnTextWhite: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  completedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  completedTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
});
