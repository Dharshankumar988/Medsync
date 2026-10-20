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
  Calendar,
  Search,
  Clock,
  User,
  Stethoscope,
  AlertCircle,
  RefreshCw,
  FileText,
} from 'lucide-react-native';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Colors } from '../../../constants/theme';
import { hospitalService, HospitalAppointmentItem } from '../../../services/hospital.service';

type FilterTab = 'ALL' | 'CONFIRMED' | 'PENDING' | 'COMPLETED' | 'CANCELLED';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'ALL', label: 'All Bookings' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

export default function HospitalAppointmentsScreen() {
  const [appointments, setAppointments] = useState<HospitalAppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    try {
      setError(null);
      const data = await hospitalService.getAppointments(
        undefined,
        selectedTab === 'ALL' ? undefined : selectedTab,
        searchQuery
      );
      setAppointments(data);
    } catch (err: any) {
      console.error('Error fetching hospital schedule:', err);
      setError(err.message || 'Failed to load hospital appointments schedule.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedTab, searchQuery]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAppointments();
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return { bg: '#D1FAE5', text: '#065F46', label: 'Confirmed' };
      case 'PENDING':
        return { bg: '#FEF3C7', text: '#B45309', label: 'Pending Review' };
      case 'COMPLETED':
        return { bg: '#E0F2FE', text: '#0369A1', label: 'Completed' };
      case 'CANCELLED':
        return { bg: '#FEE2E2', text: '#991B1B', label: 'Cancelled' };
      default:
        return { bg: '#F1F5F9', text: '#475569', label: status };
    }
  };

  const renderAppointmentItem = ({ item }: { item: HospitalAppointmentItem }) => {
    const badge = getStatusBadgeStyle(item.status);

    return (
      <Card style={styles.card}>
        <CardContent>
          <View style={styles.cardHeader}>
            <View style={styles.dateBlock}>
              <Text style={styles.dateText}>{item.appointment_date}</Text>
              <View style={styles.timeRow}>
                <Clock size={12} color="#64748B" style={{ marginRight: 4 }} />
                <Text style={styles.timeText}>{item.start_time} - {item.end_time}</Text>
              </View>
            </View>

            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
            </View>
          </View>

          <View style={styles.detailsBox}>
            <View style={styles.infoRow}>
              <User size={15} color="#64748B" style={styles.infoIcon} />
              <Text style={styles.patientName}>{item.patient_name}</Text>
            </View>

            <View style={styles.infoRow}>
              <Stethoscope size={15} color={Colors.roles.hospital.primary} style={styles.infoIcon} />
              <Text style={styles.doctorName}>{item.doctor_name}</Text>
            </View>

            {item.reason ? (
              <View style={styles.infoRow}>
                <FileText size={14} color="#94A3B8" style={styles.infoIcon} />
                <Text style={styles.reasonText} numberOfLines={2}>
                  Reason: {item.reason}
                </Text>
              </View>
            ) : null}
          </View>
        </CardContent>
      </Card>
    );
  };

  return (
    <RoleGuard allowedRole="hospital">
      <View style={styles.container}>
        <ScreenHeader
          title="Hospital Schedule"
          subtitle="Facility-wide clinical consultations and visits"
        />

        {/* Search */}
        <View style={styles.searchContainer}>
          <Search size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by patient, physician, or reason..."
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

        {/* Status Filter Tabs */}
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

        {error && (
          <View style={styles.errorBox}>
            <AlertCircle size={16} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadAppointments} style={styles.retryBtn}>
              <RefreshCw size={14} color="#DC2626" />
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={Colors.roles.hospital.primary} />
            <Text style={styles.loadingText}>Loading hospital appointments schedule...</Text>
          </View>
        ) : appointments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Calendar size={32} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No Consultations Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `No consultations match "${searchQuery}"`
                : selectedTab === 'ALL'
                ? 'No consultations scheduled for this hospital facility.'
                : `No bookings found in "${selectedTab}" status.`}
            </Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
              <Text style={styles.refreshBtnText}>Refresh Schedule</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={appointments}
            keyExtractor={(item) => item.id}
            renderItem={renderAppointmentItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.roles.hospital.primary]}
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
    backgroundColor: Colors.roles.hospital.primary,
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
  },
  refreshBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.roles.hospital.primary,
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
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
    marginBottom: 10,
  },
  dateBlock: {},
  dateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  timeText: {
    fontSize: 12,
    color: '#64748B',
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
  detailsBox: {
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: 8,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  doctorName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.roles.hospital.primary,
  },
  reasonText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
});
