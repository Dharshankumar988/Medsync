import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Pill, Lock, ShieldCheck, X, AlertCircle } from 'lucide-react-native';
import { Colors } from '../../constants/theme';
import { Button } from '../common/Button';
import { pharmacyService, PharmacyOrderItem } from '../../services/pharmacy.service';

interface DispensePrescriptionModalProps {
  visible: boolean;
  order: PharmacyOrderItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const DispensePrescriptionModal: React.FC<DispensePrescriptionModalProps> = ({
  visible,
  order,
  onClose,
  onSuccess,
}) => {
  const [authPin, setAuthPin] = useState('');
  const [prescriptionPin, setPrescriptionPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDispense = async () => {
    if (!order) return;
    const prescriptionId = order.prescription_id || order.id;

    if (!authPin || authPin.length !== 6 || !/^\d+$/.test(authPin)) {
      setError('Please enter your 6-digit Pharmacy Authorization PIN.');
      return;
    }

    if (!prescriptionPin || prescriptionPin.trim().length !== 4) {
      setError('Please enter the 4-character Dispense PIN printed on the prescription.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await pharmacyService.dispensePrescription(
        prescriptionId,
        authPin.trim(),
        prescriptionPin.trim().toUpperCase()
      );

      Alert.alert(
        'Prescription Dispensed',
        'Prescription successfully verified and marked as dispensed. Inventory updated and recorded on ledger.'
      );
      setAuthPin('');
      setPrescriptionPin('');
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Dispensing failed. Check both PINs.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!order) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={18} color="#64748B" />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <Pill size={24} color={Colors.roles.pharmacy.primary} />
          </View>

          <Text style={styles.title}>Dispense Prescription</Text>
          <Text style={styles.subtitle}>
            Order #{order.id.slice(0, 8)} • Patient: {order.patient_name}
          </Text>

          <View style={styles.orderSummaryBox}>
            <Text style={styles.summaryLabel}>Medication Details:</Text>
            <Text style={styles.summaryValue}>{order.medication}</Text>
          </View>

          {/* 4-Character Prescription PIN */}
          <Text style={styles.fieldLabel}>Prescription Dispense PIN (4 Chars) *</Text>
          <TextInput
            style={styles.textInput}
            value={prescriptionPin}
            onChangeText={(val) => {
              setPrescriptionPin(val.toUpperCase().slice(0, 4));
              if (error) setError('');
            }}
            placeholder="e.g. 7K2M"
            placeholderTextColor="#94A3B8"
            autoCapitalize="characters"
            maxLength={4}
          />

          {/* 6-Digit Pharmacy Authorization PIN */}
          <Text style={styles.fieldLabel}>Pharmacy Authorization PIN (6 Digits) *</Text>
          <TextInput
            style={[styles.textInput, styles.pinInput]}
            value={authPin}
            onChangeText={(val) => {
              setAuthPin(val.replace(/[^0-9]/g, '').slice(0, 6));
              if (error) setError('');
            }}
            placeholder="••••••"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            maxLength={6}
            secureTextEntry
          />

          {error ? (
            <View style={styles.errorBox}>
              <AlertCircle size={14} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={onClose}
              style={{ flex: 1, marginRight: 8 }}
            />
            <Button
              title="Verify & Dispense"
              loading={loading}
              disabled={authPin.length !== 6 || prescriptionPin.length !== 4}
              onPress={handleDispense}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 6,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    alignSelf: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 14,
  },
  orderSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
    marginTop: 6,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 8,
  },
  pinInput: {
    fontSize: 20,
    letterSpacing: 6,
    textAlign: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 6,
    padding: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 14,
  },
});
