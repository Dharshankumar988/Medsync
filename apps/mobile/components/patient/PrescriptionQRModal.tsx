import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Pill, X, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

interface PrescriptionQRModalProps {
  visible: boolean;
  onClose: () => void;
  prescription: any | null;
}

export function PrescriptionQRModal({
  visible,
  onClose,
  prescription,
}: PrescriptionQRModalProps) {
  const { theme, isDark } = useTheme();

  if (!prescription) return null;

  const qrPayload = JSON.stringify({
    type: 'PRESCRIPTION',
    id: prescription.id,
    patient_id: prescription.patient_id,
    doctor_id: prescription.doctor_id,
    diagnosis: prescription.diagnosis,
    qr_token: prescription.qr_token || prescription.id,
    created_at: prescription.created_at,
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: isDark ? 'rgba(56, 189, 248, 0.14)' : '#F0F9FF',
                  borderColor: isDark ? 'rgba(56, 189, 248, 0.25)' : '#BAE6FD',
                },
              ]}
            >
              <Pill size={22} color={theme.accent} />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, { color: theme.text }]}>Prescription QR Code</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Show this digital QR code to any verified MedSync pharmacist for counter dispensing.
          </Text>

          {/* QR Code (Always white quiet zone for reliable camera scanning) */}
          <View style={[styles.qrWrapper, { borderColor: theme.border }]}>
            <QRCode
              value={qrPayload}
              size={200}
              color="#09090B"
              backgroundColor="#FFFFFF"
            />
          </View>

          {/* Details */}
          <View style={styles.detailsBox}>
            <Text style={[styles.detailTitle, { color: theme.text }]}>
              {prescription.diagnosis || 'Prescription'}
            </Text>
            <Text style={[styles.detailSub, { color: theme.textMuted }]}>
              Issued: {new Date(prescription.created_at).toLocaleDateString()}
            </Text>
            <View style={styles.statusRow}>
              <ShieldCheck size={14} color="#10B981" />
              <Text style={styles.statusText}>Polygon Blockchain Verified</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: theme.primaryButton }]}
            onPress={onClose}
            activeOpacity={0.88}
          >
            <Text style={[styles.doneBtnText, { color: theme.primaryButtonText }]}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: 6,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  detailsBox: {
    alignItems: 'center',
    marginBottom: 18,
  },
  detailTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  detailSub: {
    fontSize: 12,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  statusText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#10B981',
    marginLeft: 5,
  },
  doneBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
  },
});
