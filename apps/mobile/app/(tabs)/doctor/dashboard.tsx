import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { Card, CardContent } from '../../../components/common/Card';
import { Users, Calendar, Activity } from 'lucide-react-native';

export default function DoctorDashboard() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Clinical Overview</Text>
        <Text style={styles.subtitle}>Daily schedule & patients</Text>
      </View>

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <CardContent>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Patients Today</Text>
              <Users size={16} color="#64748B" />
            </View>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statSub}>4 remaining</Text>
          </CardContent>
        </Card>

        <Card style={styles.statCard}>
          <CardContent>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Pending</Text>
              <Activity size={16} color="#F59E0B" />
            </View>
            <Text style={[styles.statValue, { color: '#D97706' }]}>5</Text>
            <Text style={styles.statSub}>Reports to sign</Text>
          </CardContent>
        </Card>
      </View>

      <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
      <Card>
        <CardContent>
          <View style={styles.activityItem}>
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>11:30</Text>
              <Text style={styles.amPmText}>AM</Text>
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Michael Chen</Text>
              <Text style={styles.activityDesc}>Follow up</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: '#EFF6FF' }]}>
              <Text style={[styles.statusText, { color: '#2563EB' }]}>Next</Text>
            </View>
          </View>
          
          <View style={[styles.activityItem, { borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0 }]}>
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>01:00</Text>
              <Text style={styles.amPmText}>PM</Text>
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Emily Davis</Text>
              <Text style={styles.activityDesc}>Lab Review</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: '#F1F5F9' }]}>
              <Text style={[styles.statusText, { color: '#64748B' }]}>Upcoming</Text>
            </View>
          </View>
        </CardContent>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
    paddingTop: 60,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  statSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
    marginLeft: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  timeContainer: {
    width: 50,
    alignItems: 'center',
    marginRight: 12,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  amPmText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
  },
  activityDesc: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  }
});
