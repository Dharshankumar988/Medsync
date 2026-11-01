import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { QrCode, Sparkles } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';
import { useRole } from '../../providers/role-provider';
import { useTheme } from '../../context/ThemeContext';
import { PaymentStyleQRScanner } from '../patient/PaymentStyleQRScanner';

export function FloatingQuickActions() {
  const { role } = useRole();
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [scannerVisible, setScannerVisible] = useState(false);

  // Only show for patient role
  if (role !== 'patient') {
    return null;
  }

  const isPulseScreen = pathname?.includes('pulse-ai');

  const handleOpenAi = () => {
    router.push('/(tabs)/patient/pulse-ai');
  };

  return (
    <>
      <View style={styles.floatingContainer} pointerEvents="box-none">
        {/* Bottom-Left: Quick QR Scanner (Better QR Icon) */}
        <TouchableOpacity
          style={[
            styles.floatingPill,
            styles.leftPill,
            {
              backgroundColor: isDark ? '#18181B' : '#FFFFFF',
              borderColor: isDark ? '#27272A' : '#E2E8F0',
            },
          ]}
          onPress={() => setScannerVisible(true)}
          activeOpacity={0.82}
          accessibilityLabel="Open QR Scanner"
        >
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#F0F9FF',
                borderColor: isDark ? 'rgba(56, 189, 248, 0.25)' : '#BAE6FD',
              },
            ]}
          >
            <QrCode size={18} color="#38BDF8" strokeWidth={2.2} />
          </View>
          <Text style={[styles.pillLabel, { color: theme.text }]}>Scan QR</Text>
        </TouchableOpacity>

        {/* Bottom-Right: Quick Pulse AI (Hides on Pulse AI screen to not block chat) */}
        {!isPulseScreen && (
          <TouchableOpacity
            style={[
              styles.floatingPill,
              styles.rightPill,
              {
                backgroundColor: isDark ? '#18181B' : '#FFFFFF',
                borderColor: isDark ? '#27272A' : '#E2E8F0',
              },
            ]}
            onPress={handleOpenAi}
            activeOpacity={0.82}
            accessibilityLabel="Open Pulse AI"
          >
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: isDark ? 'rgba(168, 85, 247, 0.15)' : '#FAF5FF',
                  borderColor: isDark ? 'rgba(168, 85, 247, 0.25)' : '#E9D5FF',
                },
              ]}
            >
              <Sparkles size={18} color={isDark ? '#C084FC' : '#7C3AED'} strokeWidth={2.2} />
            </View>
            <Text style={[styles.pillLabel, { color: theme.text }]}>Pulse AI</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sleek Universal QR Scanner */}
      {scannerVisible && (
        <PaymentStyleQRScanner
          visible={scannerVisible}
          onClose={() => setScannerVisible(false)}
        />
      )}
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
    alignItems: 'center',
    zIndex: 9999,
  },
  floatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  leftPill: {
    alignSelf: 'flex-start',
  },
  rightPill: {
    alignSelf: 'flex-end',
    marginLeft: 'auto',
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
