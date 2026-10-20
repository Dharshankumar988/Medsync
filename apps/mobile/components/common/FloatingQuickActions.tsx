import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  SafeAreaView,
} from 'react-native';
import { ScanLine, Sparkles, X } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';
import { useRole } from '../../providers/role-provider';
import { getRoleTheme } from '../../constants/theme';
import { QRScanner } from './QRScanner';

export function FloatingQuickActions() {
  const { role } = useRole();
  const router = useRouter();
  const pathname = usePathname();
  const [scannerVisible, setScannerVisible] = useState(false);

  // Only show for patient and doctor roles
  if (role !== 'patient' && role !== 'doctor') {
    return null;
  }

  const roleTheme = getRoleTheme(role);
  const isPulseScreen = pathname?.includes('pulse-ai');

  // Do not display floating quick action overlays on the Pulse AI chat screen
  // to prevent overlapping the chat message input and send button
  if (isPulseScreen) {
    return null;
  }

  const handleOpenAi = () => {
    if (role === 'patient') {
      router.push('/(tabs)/patient/pulse-ai');
    } else if (role === 'doctor') {
      router.push('/(tabs)/doctor/pulse-ai');
    }
  };

  return (
    <>
      <View style={styles.floatingContainer} pointerEvents="box-none">
        {/* Bottom-Left: Quick QR Scanner */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.leftBtn, { borderColor: roleTheme.primary }]}
          onPress={() => setScannerVisible(true)}
          activeOpacity={0.85}
          accessibilityLabel="Open QR Scanner"
        >
          <View style={[styles.iconPill, { backgroundColor: roleTheme.bg }]}>
            <ScanLine size={18} color={roleTheme.primary} />
          </View>
          <Text style={[styles.btnLabel, { color: roleTheme.primary }]}>Scan</Text>
        </TouchableOpacity>

        {/* Bottom-Right: Quick Pulse AI */}
        {!isPulseScreen && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.rightBtn, { borderColor: roleTheme.primary }]}
            onPress={handleOpenAi}
            activeOpacity={0.85}
            accessibilityLabel="Open Pulse AI"
          >
            <View style={[styles.iconPill, { backgroundColor: roleTheme.bg }]}>
              <Sparkles size={18} color={roleTheme.primary} />
            </View>
            <Text style={[styles.btnLabel, { color: roleTheme.primary }]}>AI</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Universal QR Scanner Modal */}
      <Modal
        visible={scannerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setScannerVisible(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Universal QR Verifier</Text>
              <Text style={styles.modalSub}>
                Scan any MedSync Prescription, Pharmacy, or Medical Record
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setScannerVisible(false)}
            >
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }}>
            <QRScanner
              role={role}
              onVerify={(res) => {
                // Keep modal open so the user can inspect verification details
              }}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: Platform.OS === 'ios' ? 96 : 76,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 9999,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 24,
    borderWidth: 1.5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
  },
  leftBtn: {
    alignSelf: 'flex-start',
  },
  rightBtn: {
    alignSelf: 'flex-end',
    marginLeft: 'auto',
  },
  iconPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  modalSafe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
