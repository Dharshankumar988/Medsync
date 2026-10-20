import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Truck, Lock, X } from 'lucide-react-native';
import { Colors } from '../../constants/theme';
import { Button } from '../common/Button';
import { pharmacyService, PharmacyInventoryItem } from '../../services/pharmacy.service';

interface RestockOrderModalProps {
  visible: boolean;
  item: PharmacyInventoryItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const RestockOrderModal: React.FC<RestockOrderModalProps> = ({
  visible,
  item,
  onClose,
  onSuccess,
}) => {
  const [quantity, setQuantity] = useState('100');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePlaceOrder = async () => {
    if (!item) return;

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid positive quantity.');
      return;
    }

    if (!pin || pin.length !== 6 || !/^\d+$/.test(pin)) {
      setError('Please enter your 6-digit Pharmacy Authorization PIN.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await pharmacyService.placeRestockOrder({
        medicine_id: item.medicine_id,
        medicine_name: item.medicine_name,
        quantity: qty,
        pin: pin.trim(),
      });

      Alert.alert(
        'Restock Order Placed',
        `Supplier restock order for ${qty} units of ${item.medicine_name} placed successfully. Estimated delivery in 2 minutes.`
      );
      setPin('');
      setQuantity('100');
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to place restock order.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={18} color="#64748B" />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <Truck size={22} color={Colors.roles.pharmacy.primary} />
          </View>

          <Text style={styles.title}>Place Restock Order</Text>
          <Text style={styles.subtitle}>
            Medication: {item.medicine_name} (Batch: {item.batch_number})
          </Text>

          <View style={styles.currentStockBox}>
            <Text style={styles.stockLabel}>Current Stock Level:</Text>
            <Text style={[styles.stockValue, item.is_low_stock ? styles.stockLow : styles.stockOk]}>
              {item.stock_quantity} units
            </Text>
          </View>

          <Text style={styles.label}>Restock Quantity *</Text>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={(v) => {
              setQuantity(v.replace(/[^0-9]/g, ''));
              if (error) setError('');
            }}
            keyboardType="numeric"
            placeholder="100"
            placeholderTextColor="#94A3B8"
          />

          <Text style={styles.label}>Pharmacy Authorization PIN (6 Digits) *</Text>
          <TextInput
            style={[styles.input, styles.pinInput]}
            value={pin}
            onChangeText={(v) => {
              setPin(v.replace(/[^0-9]/g, '').slice(0, 6));
              if (error) setError('');
            }}
            keyboardType="numeric"
            maxLength={6}
            secureTextEntry
            placeholder="••••••"
            placeholderTextColor="#94A3B8"
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.actions}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={onClose}
              style={{ flex: 1, marginRight: 8 }}
            />
            <Button
              title="Place Order"
              loading={loading}
              disabled={pin.length !== 6 || !quantity}
              onPress={handlePlaceOrder}
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
  currentStockBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  stockLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  stockValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  stockLow: {
    color: '#DC2626',
  },
  stockOk: {
    color: '#059669',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  pinInput: {
    fontSize: 20,
    letterSpacing: 6,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 18,
  },
});
