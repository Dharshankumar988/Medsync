import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ShieldAlert,
  ShieldCheck,
  User,
  Mail,
  Key,
  Lock,
  LogOut,
  Server,
  FileText,
} from 'lucide-react-native';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Colors } from '../../../constants/theme';
import { authService } from '../../../services/auth.service';
import { supabase } from '../../../lib/supabase';

export default function AdminProfileScreen() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('admin@medsync.health');
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setEmail(user.email || 'admin@medsync.health');
        setUserId(user.id);
      }
    });
  }, []);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of the administration console?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await authService.logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <RoleGuard allowedRole="admin">
      <View style={styles.container}>
        <ScreenHeader
          title="Admin Governance"
          subtitle="Security clearance & administrator profile"
        />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Admin Identity Card */}
          <Card style={styles.headerCard}>
            <CardContent>
              <View style={styles.headerRow}>
                <View style={styles.avatarCircle}>
                  <ShieldAlert size={28} color={Colors.roles.admin.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.adminTitle}>Platform Administrator</Text>
                  <Text style={styles.adminEmail}>{email}</Text>
                  <View style={styles.clearanceBadge}>
                    <ShieldCheck size={12} color="#DC2626" style={{ marginRight: 4 }} />
                    <Text style={styles.clearanceText}>Full Multi-Tenant Authorization</Text>
                  </View>
                </View>
              </View>
            </CardContent>
          </Card>

          {/* Security Protocols Card */}
          <Card style={styles.card}>
            <CardContent>
              <Text style={styles.cardTitle}>Platform Security Policy</Text>

              <View style={styles.policyRow}>
                <View style={styles.policyIcon}>
                  <Lock size={16} color="#DC2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.policyTitle}>Cryptographic Prescription Signing</Text>
                  <Text style={styles.policySub}>
                    Physician digital signatures verified with SHA-256 and 6-digit staff PINs.
                  </Text>
                </View>
              </View>

              <View style={styles.policyRow}>
                <View style={styles.policyIcon}>
                  <Server size={16} color="#DC2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.policyTitle}>Decentralized Health Ledger</Text>
                  <Text style={styles.policySub}>
                    Prescription hash anchoring and medicine pedigree logging enabled on Polygon Amoy.
                  </Text>
                </View>
              </View>

              <View style={styles.policyRow}>
                <View style={styles.policyIcon}>
                  <FileText size={16} color="#DC2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.policyTitle}>Comprehensive Audit Logs</Text>
                  <Text style={styles.policySub}>
                    All sensitive access events, authorization checks, and dispensing logged permanently.
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>

          {/* Admin Identifier */}
          {userId ? (
            <Card style={styles.card}>
              <CardContent>
                <Text style={styles.cardTitle}>Account Security Token</Text>
                <Text style={styles.tokenText}>UID: {userId}</Text>
              </CardContent>
            </Card>
          ) : null}

          {/* Sign Out Button */}
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <LogOut size={18} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.signOutText}>Sign Out of Administration Console</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  adminTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  adminEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  clearanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  clearanceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
  },
  card: {
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  policyRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  policyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  policyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  policySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  tokenText: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginTop: 6,
    marginBottom: 20,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
});
