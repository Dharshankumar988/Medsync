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
  Package,
  Search,
  Plus,
  AlertTriangle,
  Calendar,
  Pill,
  Trash2,
  Truck,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Tag,
} from 'lucide-react-native';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { Colors } from '../../../constants/theme';
import {
  pharmacyService,
  PharmacyInventoryItem,
  InventoryAlerts,
} from '../../../services/pharmacy.service';
import { AddInventoryItemModal } from '../../../components/pharmacy/AddInventoryItemModal';
import { RestockOrderModal } from '../../../components/pharmacy/RestockOrderModal';

type FilterTab = 'ALL' | 'LOW_STOCK' | 'EXPIRED' | 'IN_STOCK';

export default function PharmacyInventoryScreen() {
  const [inventory, setInventory] = useState<PharmacyInventoryItem[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlerts>({ low_stock: [], expiring_soon: [], expired: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modals
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [restockItem, setRestockItem] = useState<PharmacyInventoryItem | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [invData, alertsData] = await Promise.all([
        pharmacyService.getInventory(searchQuery),
        pharmacyService.getInventoryAlerts(),
      ]);
      setInventory(invData);
      setAlerts(alertsData);
    } catch (err: any) {
      console.error('Error fetching inventory:', err);
      setError(err.message || 'Failed to load pharmacy inventory.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleDiscardStock = (item: PharmacyInventoryItem) => {
    Alert.alert(
      'Discard Expired Stock',
      `Confirm disposal and write-off of batch ${item.batch_number} (${item.medicine_name})? This sets available stock to 0 and records audit trail.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Discard',
          style: 'destructive',
          onPress: async () => {
            setActionLoadingId(item.id);
            try {
              await pharmacyService.discardExpiredStock(item.id);
              Alert.alert('Stock Discarded', 'Batch quantity updated to zero and audit recorded.');
              loadData();
            } catch (err: any) {
              const msg = err.response?.data?.detail || err.message || 'Failed to discard stock.';
              Alert.alert('Error', msg);
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  // Filter items
  const filteredInventory = inventory.filter((item) => {
    if (selectedFilter === 'LOW_STOCK') return item.is_low_stock && !item.is_expired;
    if (selectedFilter === 'EXPIRED') return item.is_expired;
    if (selectedFilter === 'IN_STOCK') return !item.is_expired && !item.is_low_stock && item.stock_quantity > 0;
    return true;
  });

  const lowStockCount = inventory.filter((i) => i.is_low_stock && !i.is_expired).length;
  const expiredCount = inventory.filter((i) => i.is_expired).length;

  const renderItem = ({ item }: { item: PharmacyInventoryItem }) => {
    const isBusy = actionLoadingId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.medicineName}>{item.medicine_name}</Text>
            {item.generic_name ? (
              <Text style={styles.genericName}>{item.generic_name}</Text>
            ) : null}
          </View>

          {item.is_expired ? (
            <View style={[styles.badge, styles.badgeExpired]}>
              <Text style={styles.badgeTextExpired}>EXPIRED</Text>
            </View>
          ) : item.is_low_stock ? (
            <View style={[styles.badge, styles.badgeLow]}>
              <Text style={styles.badgeTextLow}>LOW STOCK</Text>
            </View>
          ) : (
            <View style={[styles.badge, styles.badgeOk]}>
              <Text style={styles.badgeTextOk}>IN STOCK</Text>
            </View>
          )}
        </View>

        {/* Batch & Price Details */}
        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Batch</Text>
            <Text style={styles.metaVal}>{item.batch_number || 'N/A'}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Stock</Text>
            <Text style={[styles.metaVal, item.is_low_stock && { color: '#DC2626' }]}>
              {item.stock_quantity} units
            </Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Unit Price</Text>
            <Text style={styles.metaVal}>₹{item.unit_price ? item.unit_price.toFixed(2) : '0.00'}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Expiry</Text>
            <Text style={[styles.metaVal, item.is_expired && { color: '#DC2626' }]}>
              {item.expiry_date}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          {item.is_expired ? (
            <TouchableOpacity
              style={[styles.btn, styles.discardBtn]}
              disabled={isBusy}
              onPress={() => handleDiscardStock(item)}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <>
                  <Trash2 size={14} color="#DC2626" style={{ marginRight: 6 }} />
                  <Text style={styles.discardBtnText}>Discard Expired Stock</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.btn, styles.restockBtn]}
              onPress={() => setRestockItem(item)}
            >
              <Truck size={14} color={Colors.roles.pharmacy.primary} style={{ marginRight: 6 }} />
              <Text style={styles.restockBtnText}>Restock Batch</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <RoleGuard allowedRole="pharmacy">
      <Stack.Screen
        options={{
          title: 'Medication Inventory',
          headerShown: true,
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerShadowVisible: false,
          headerRight: () => (
            <TouchableOpacity
              style={styles.headerAddBtn}
              onPress={() => setAddModalVisible(true)}
            >
              <Plus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.headerAddBtnText}>Add Stock</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        {/* KPI Alert Highlights */}
        <View style={styles.kpiContainer}>
          <TouchableOpacity
            style={[styles.kpiCard, selectedFilter === 'ALL' && styles.kpiCardActive]}
            onPress={() => setSelectedFilter('ALL')}
          >
            <Text style={styles.kpiNumber}>{inventory.length}</Text>
            <Text style={styles.kpiLabel}>Total Items</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.kpiCard,
              lowStockCount > 0 && styles.kpiCardWarning,
              selectedFilter === 'LOW_STOCK' && styles.kpiCardActiveWarning,
            ]}
            onPress={() => setSelectedFilter('LOW_STOCK')}
          >
            <Text style={[styles.kpiNumber, lowStockCount > 0 && { color: '#B45309' }]}>
              {lowStockCount}
            </Text>
            <Text style={styles.kpiLabel}>Low Stock</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.kpiCard,
              expiredCount > 0 && styles.kpiCardDanger,
              selectedFilter === 'EXPIRED' && styles.kpiCardActiveDanger,
            ]}
            onPress={() => setSelectedFilter('EXPIRED')}
          >
            <Text style={[styles.kpiNumber, expiredCount > 0 && { color: '#DC2626' }]}>
              {expiredCount}
            </Text>
            <Text style={styles.kpiLabel}>Expired</Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Search size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search medicine name, generic name, batch..."
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

        {/* Error Banner */}
        {error ? (
          <View style={styles.errorBanner}>
            <AlertCircle size={16} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadData} style={styles.retryBtn}>
              <RefreshCw size={14} color="#DC2626" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Inventory List */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.roles.pharmacy.primary} />
            <Text style={styles.loadingText}>Loading pharmaceutical inventory...</Text>
          </View>
        ) : filteredInventory.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Package size={32} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No Inventory Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `No medicines match "${searchQuery}"`
                : selectedFilter === 'ALL'
                ? 'No medicine batches logged in your pharmacy inventory.'
                : `No items matching filter "${selectedFilter.replace(/_/g, ' ')}".`}
            </Text>
            <TouchableOpacity
              style={styles.addStockEmptyBtn}
              onPress={() => setAddModalVisible(true)}
            >
              <Plus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.addStockEmptyBtnText}>Add Medication Batch</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredInventory}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
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

        {/* Add Inventory Modal */}
        <AddInventoryItemModal
          visible={addModalVisible}
          onClose={() => setAddModalVisible(false)}
          onSuccess={() => {
            loadData();
          }}
        />

        {/* Restock Order Modal */}
        <RestockOrderModal
          visible={Boolean(restockItem)}
          item={restockItem}
          onClose={() => setRestockItem(null)}
          onSuccess={() => {
            loadData();
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
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.roles.pharmacy.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 16,
  },
  headerAddBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  kpiContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kpiCardActive: {
    borderColor: Colors.roles.pharmacy.primary,
    backgroundColor: '#FEF3C7',
  },
  kpiCardWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  kpiCardActiveWarning: {
    borderColor: '#D97706',
    backgroundColor: '#FDE68A',
  },
  kpiCardDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  kpiCardActiveDanger: {
    borderColor: '#DC2626',
    backgroundColor: '#FECACA',
  },
  kpiNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  kpiLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 10,
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginHorizontal: 16,
    marginTop: 6,
    padding: 10,
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
  addStockEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.roles.pharmacy.primary,
  },
  addStockEmptyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
    marginBottom: 12,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  genericName: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeOk: {
    backgroundColor: '#D1FAE5',
  },
  badgeTextOk: {
    color: '#065F46',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeLow: {
    backgroundColor: '#FEF3C7',
  },
  badgeTextLow: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeExpired: {
    backgroundColor: '#FEE2E2',
  },
  badgeTextExpired: {
    color: '#991B1B',
    fontSize: 11,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 12,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  metaVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  restockBtn: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  restockBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  discardBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  discardBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
});
