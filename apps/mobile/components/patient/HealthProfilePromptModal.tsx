import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import {
  HeartPulse,
  User,
  ArrowRight,
  ShieldCheck,
  X,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

interface HealthProfilePromptModalProps {
  visible: boolean;
  onClose: () => void;
  onCompleteNow: () => void;
}

export function HealthProfilePromptModal({
  visible,
  onClose,
  onCompleteNow,
}: HealthProfilePromptModalProps) {
  const { theme, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.modalCard,
            {
              backgroundColor: isDark ? '#0D0F14' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Close (X) button */}
          <TouchableOpacity
            style={[
              styles.closeBtn,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
              },
            ]}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={16} color={theme.textMuted} />
          </TouchableOpacity>

          {/* Top Heart Pulse Icon Container */}
          <View style={styles.iconContainerWrapper}>
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: isDark ? 'rgba(59, 130, 246, 0.16)' : '#EFF6FF',
                  borderColor: isDark ? 'rgba(59, 130, 246, 0.35)' : '#BFDBFE',
                },
              ]}
            >
              <HeartPulse size={26} color="#3B82F6" strokeWidth={2.2} />
            </View>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.text }]}>
            Complete Your Health Profile
          </Text>

          {/* Subtitle */}
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Welcome to MedSync! To book doctor appointments, order prescriptions, and enable emergency care identification, please enter your mandatory personal health details:
          </Text>

          {/* Bullets Highlight Box */}
          <View
            style={[
              styles.bulletsBox,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
              },
            ]}
          >
            {/* Bullet 1: Date of Birth */}
            <View style={styles.bulletRow}>
              <View style={[styles.bulletDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={[styles.bulletText, { color: theme.text }]}>
                <Text style={styles.bulletBold}>Date of Birth:</Text> Required for clinical dosage & age bracket
              </Text>
            </View>

            {/* Bullet 2: Gender */}
            <View style={styles.bulletRow}>
              <View style={[styles.bulletDot, { backgroundColor: '#6366F1' }]} />
              <Text style={[styles.bulletText, { color: theme.text }]}>
                <Text style={styles.bulletBold}>Gender:</Text> Required for physiological reference ranges
              </Text>
            </View>

            {/* Bullet 3: Blood Group */}
            <View style={styles.bulletRow}>
              <View style={[styles.bulletDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.bulletText, { color: theme.text }]}>
                <Text style={styles.bulletBold}>Blood Group:</Text> Critical for emergency clinical care
              </Text>
            </View>
          </View>

          {/* Complete Profile Now Button */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={onCompleteNow}
            activeOpacity={0.88}
          >
            <User size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryBtnText}>Complete Profile Now</Text>
            <ArrowRight size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
          </TouchableOpacity>

          {/* Remind Me Later Button */}
          <TouchableOpacity
            style={styles.remindBtn}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.remindBtnText, { color: theme.textMuted }]}>
              Remind Me Later
            </Text>
          </TouchableOpacity>

          {/* Security Footer Note */}
          <View style={styles.securityRow}>
            <ShieldCheck size={13} color={theme.textMuted} />
            <Text style={[styles.securityText, { color: theme.textMuted }]}>
              Encrypted under your MedSync security domain
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconContainerWrapper: {
    alignItems: 'center',
    marginBottom: 14,
  },
  iconBadge: {
    width: 54,
    height: 54,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 6,
  },
  bulletsBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    marginBottom: 18,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  bulletBold: {
    fontWeight: '700',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    height: 48,
    borderRadius: 14,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  remindBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  remindBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 2,
  },
  securityText: {
    fontSize: 11,
    fontWeight: '500',
  },
});

