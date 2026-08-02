import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { apiRequest } from '../../utils/api';
import { BlockchainBadge } from './BlockchainBadge';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  transaction_hash?: string;
  status: string;
  created_at: string;
}

export function AuditHistory() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAuditLogs() {
      try {
        const res = await apiRequest('GET', '/blockchain/audit?size=10');
        setLogs(res.data?.items || []);
      } catch (error) {
        console.error("Failed to load audit logs", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchAuditLogs();
  }, []);

  const renderItem = React.useCallback(({ item }: { item: AuditLog }) => {
    const actionFormatted = item.action.replace(/_/g, ' ').toLowerCase();
    const entityFormatted = item.entity_type.replace(/_/g, ' ').toLowerCase();

    return (
      <View style={styles.logItem}>
        <View style={styles.logLeft}>
          <Text style={styles.actionText}>{actionFormatted}</Text>
          <Text style={styles.entityText}>{entityFormatted}</Text>
        </View>
        <View style={styles.logRight}>
          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
          <BlockchainBadge 
            status={item.status as any} 
            txHash={item.transaction_hash} 
            showText={false}
          />
        </View>
      </View>
    );
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Blockchain Audit History</Text>
        <Text style={styles.subtitle}>Immutable record of clinical events.</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color="#666" />
        </View>
      ) : logs.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No immutable records found yet.</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  centerContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
  },
  listContainer: {
    padding: 16,
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  logLeft: {
    flex: 1,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    textTransform: 'capitalize',
  },
  entityText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  logRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#6b7280',
  }
});
