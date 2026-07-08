import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { Card, CardContent } from '../../../components/common/Card';
import { Activity, Clock, FileText } from 'lucide-react-native';

export default function PatientDashboard() {
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
        <Text style={styles.title}>Patient Overview</Text>
        <Text style={styles.subtitle}>Health summary & upcoming events</Text>
      </View>

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <CardContent>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Next Visit</Text>
              <Clock size={16} color="#64748B" />
            </View>
            <Text style={styles.statValue}>Oct 24</Text>
            <Text style={styles.statSub}>10:00 AM</Text>
          </CardContent>
        </Card>

        <Card style={styles.statCard}>
          <CardContent>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Status</Text>
              <Activity size={16} color="#10B981" />
            </View>
            <Text style={[styles.statValue, { color: '#10B981' }]}>Stable</Text>
            <Text style={styles.statSub}>Updated today</Text>
          </CardContent>
        </Card>
      </View>

      <Text style={styles.sectionTitle}>Recent Activity</Text>
      <Card>
        <CardContent>
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <FileText size={20} color="#2563EB" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Lab Results Uploaded</Text>
              <Text style={styles.activityDesc}>Complete Blood Count</Text>
            </View>
            <Text style={styles.activityTime}>2d ago</Text>
          </View>
          
          <View style={[styles.activityItem, { borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0 }]}>
            <View style={[styles.activityIcon, { backgroundColor: '#F1F5F9' }]}>
              <Activity size={20} color="#64748B" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Prescription Renewed</Text>
              <Text style={styles.activityDesc}>Lisinopril 10mg</Text>
            </View>
            <Text style={styles.activityTime}>5d ago</Text>
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
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
  activityTime: {
    fontSize: 12,
    color: '#94A3B8',
  }
});
