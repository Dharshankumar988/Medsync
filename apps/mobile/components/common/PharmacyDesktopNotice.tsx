import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Laptop, ExternalLink, LogOut, ShieldAlert } from 'lucide-react-native';
import { useRole } from '../../providers/role-provider';
import { useRouter } from 'expo-router';

export function PharmacyDesktopNotice() {
  const { logout } = useRole();
  const router = useRouter();

  const handleOpenWeb = () => {
    Linking.openURL('https://medsync-web.vercel.app/login');
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Laptop size={36} color="#D97706" />
        </View>

        <View style={styles.badge}>
          <ShieldAlert size={14} color="#D97706" />
          <Text style={styles.badgeText}>PHARMACY DESKTOP PORTAL</Text>
        </View>

        <Text style={styles.title}>Desktop Optimized Experience</Text>
        <Text style={styles.description}>
          MedSync Pharmacy dispensary operations, barcode inventory synchronization, and batch order fulfillment are built for wide-screen desktop workstations.
        </Text>

        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>Recommended Setup:</Text>
          <Text style={styles.tipText}>
            Please access MedSync on your desktop browser (Chrome, Edge, or Firefox) for high-speed dispensing and barcode scanner integration.
          </Text>
        </View>

        <TouchableOpacity style={styles.openWebBtn} onPress={handleOpenWeb} activeOpacity={0.85}>
          <Text style={styles.openWebBtnText}>Open MedSync Web Portal</Text>
          <ExternalLink size={18} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <LogOut size={16} color="#64748B" />
          <Text style={styles.logoutBtnText}>Switch Account / Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 28,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 14,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  tipBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 22,
  },
  tipTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  openWebBtn: {
    width: '100%',
    height: 50,
    backgroundColor: '#D97706',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  openWebBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  logoutBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
});
