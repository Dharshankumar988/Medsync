import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Pill, X, ShieldCheck, CheckCircle2 } from 'lucide-react-native';

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
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.iconCircle}>
              <Pill size={22} color="#2563EB" />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Prescription QR Code</Text>
          <Text style={styles.subtitle}>
            Show this digital QR code to any verified MedSync pharmacist for counter dispensing.
          </Text>

          {/* QR Code */}
          <View style={styles.qrWrapper}>
            <QRCode
              value={qrPayload}
              size={210}
              color="#0F172A"
              backgroundColor="#FFFFFF"
            />
          </View>

          {/* Details */}
          <View style={styles.detailsBox}>
            <Text style={styles.detailTitle}>{prescription.diagnosis || 'Prescription'}</Text>
            <Text style={styles.detailSub}>
              Issued: {new Date(prescription.created_at).toLocaleDateString()}
            </Text>
            <View style={styles.statusRow}>
              <ShieldCheck size={14} color="#10B981" />
              <Text style={styles.statusText}>Polygon Blockchain Verified</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={onClose}
            activeOpacity={0.88}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
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
    borderRadius: 16,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: 6,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  detailsBox: {
    alignItems: 'center',
    marginBottom: 18,
  },
  detailTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  detailSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
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
    backgroundColor: '#2563EB',
    width: '100%',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
