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
  Users,
  Search,
  Stethoscope,
  Phone,
  Clock,
  Calendar,
  AlertCircle,
  RefreshCw,
  Award,
} from 'lucide-react-native';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Colors } from '../../../constants/theme';
import { hospitalService, DoctorBrief } from '../../../services/hospital.service';

export default function HospitalDoctorsScreen() {
  const [doctors, setDoctors] = useState<DoctorBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadDoctors = useCallback(async () => {
    try {
      setError(null);
      const data = await hospitalService.getDoctors(undefined, searchQuery);
      setDoctors(data);
    } catch (err: any) {
      console.error('Error fetching hospital doctors:', err);
      setError(err.message || 'Failed to load doctors directory.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDoctors();
  };

  const renderDoctorItem = ({ item }: { item: DoctorBrief }) => (
    <Card style={styles.card}>
      <CardContent>
        <View style={styles.cardHeader}>
          <View style={styles.avatarCircle}>
            <Stethoscope size={22} color={Colors.roles.hospital.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.docName}>{item.full_name}</Text>
            <Text style={styles.docSpecialty}>{item.specialization || 'General Physician'}</Text>
            <View style={styles.expBadge}>
              <Award size={12} color="#0284C7" style={{ marginRight: 4 }} />
              <Text style={styles.expText}>{item.experience_years || 0} years experience</Text>
            </View>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>Practicing</Text>
          </View>
        </View>

        <View style={styles.metaBox}>
          <View style={styles.metaRow}>
            <Clock size={14} color="#64748B" style={{ marginRight: 6 }} />
            <Text style={styles.metaText}>
              Hours: {item.consultation_hours || '09:00 AM - 05:00 PM'}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Calendar size={14} color="#64748B" style={{ marginRight: 6 }} />
            <Text style={styles.metaText}>
              Days: {item.working_days || 'Monday - Saturday'}
            </Text>
          </View>

          {item.phone ? (
            <View style={styles.metaRow}>
              <Phone size={14} color="#64748B" style={{ marginRight: 6 }} />
              <Text style={styles.metaText}>Contact: {item.phone}</Text>
            </View>
          ) : null}

          {item.consultation_fee ? (
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Consultation Fee:</Text>
              <Text style={styles.feeValue}>₹{item.consultation_fee}</Text>
            </View>
          ) : null}
        </View>
      </CardContent>
    </Card>
  );

  return (
    <RoleGuard allowedRole="hospital">
      <View style={styles.container}>
        <ScreenHeader
          title="Physicians Directory"
          subtitle="Hospital medical staff and specialist roster"
        />

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search physician by name or specialty..."
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
            <TouchableOpacity onPress={loadDoctors} style={styles.retryBtn}>
              <RefreshCw size={14} color="#DC2626" />
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={Colors.roles.hospital.primary} />
            <Text style={styles.loadingText}>Loading hospital physicians...</Text>
          </View>
        ) : doctors.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Users size={32} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No Physicians Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `No physicians matching "${searchQuery}"`
                : 'No affiliated physicians registered at this facility.'}
            </Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
              <Text style={styles.refreshBtnText}>Refresh Directory</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={doctors}
            keyExtractor={(item) => item.id}
            renderItem={renderDoctorItem}
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
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  docName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  docSpecialty: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  expBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  expText: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  metaBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  metaText: {
    fontSize: 12,
    color: '#475569',
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  feeLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  feeValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
});
