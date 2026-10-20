import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Package, Plus, X, Pill, Search } from 'lucide-react-native';
import { Colors } from '../../constants/theme';
import { Button } from '../common/Button';
import {
  pharmacyService,
  AddInventoryItemPayload,
  MedicineCatalogItem,
} from '../../services/pharmacy.service';

interface AddInventoryItemModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddInventoryItemModal: React.FC<AddInventoryItemModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [medicineName, setMedicineName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [dosageForm, setDosageForm] = useState('Tablet');
  const [strength, setStrength] = useState('500mg');
  const [batchNumber, setBatchNumber] = useState('');
  const [stockQuantity, setStockQuantity] = useState('100');
  const [unitPrice, setUnitPrice] = useState('25.00');
  const [expiryDate, setExpiryDate] = useState('2027-12-31');
  const [minimumStock, setMinimumStock] = useState('10');

  // Autocomplete
  const [catalog, setCatalog] = useState<MedicineCatalogItem[]>([]);
  const [showCatalog, setShowCatalog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      loadCatalog();
      // Auto-generate batch number default
      const randomBatch = `BATCH-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      setBatchNumber(randomBatch);
    }
  }, [visible]);

  const loadCatalog = async () => {
    try {
      const data = await pharmacyService.getMedicinesCatalog();
      setCatalog(data);
    } catch (err) {
      console.error('Failed to load medicines catalog:', err);
    }
  };

  const filteredCatalog = medicineName.trim()
    ? catalog.filter((m) => m.name.toLowerCase().includes(medicineName.toLowerCase()))
    : [];

  const handleSelectCatalogItem = (item: MedicineCatalogItem) => {
    setMedicineName(item.name);
    if (item.generic_name) setGenericName(item.generic_name);
    if (item.strength) setStrength(item.strength);
    if (item.dosage_form) setDosageForm(item.dosage_form);
    setShowCatalog(false);
  };

  const handleSubmit = async () => {
    if (!medicineName.trim()) {
      setError('Medicine name is required.');
      return;
    }
    const qty = parseInt(stockQuantity, 10);
    if (isNaN(qty) || qty < 0) {
      setError('Please enter a valid stock quantity.');
      return;
    }
    const price = parseFloat(unitPrice);
    if (isNaN(price) || price < 0) {
      setError('Please enter a valid unit price.');
      return;
    }
    if (!expiryDate.trim()) {
      setError('Expiry date (YYYY-MM-DD) is required.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload: AddInventoryItemPayload = {
        medicine_name: medicineName.trim(),
        generic_name: genericName.trim() || undefined,
        dosage_form: dosageForm.trim(),
        strength: strength.trim(),
        batch_number: batchNumber.trim(),
        stock_quantity: qty,
        unit_price: price,
        expiry_date: expiryDate.trim(),
        minimum_stock: parseInt(minimumStock, 10) || 10,
      };

      await pharmacyService.addInventoryItem(payload);
      Alert.alert('Stock Added', `Successfully added ${qty} units of ${medicineName.trim()} to inventory.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to add inventory item.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Add Medicine to Inventory</Text>
            <Text style={styles.subtitle}>Enter pharmaceutical batch & stock details</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={22} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Medicine Name with Autocomplete */}
          <Text style={styles.label}>Medicine Name *</Text>
          <TextInput
            style={styles.input}
            value={medicineName}
            onChangeText={(v) => {
              setMedicineName(v);
              setShowCatalog(true);
              if (error) setError('');
            }}
            placeholder="e.g. Paracetamol, Amoxicillin"
            placeholderTextColor="#94A3B8"
          />

          {showCatalog && filteredCatalog.length > 0 && (
            <View style={styles.dropdown}>
              {filteredCatalog.slice(0, 4).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.dropdownItem}
                  onPress={() => handleSelectCatalogItem(item)}
                >
                  <Pill size={14} color={Colors.roles.pharmacy.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.dropdownItemText}>{item.name}</Text>
                  {item.strength ? (
                    <Text style={styles.dropdownItemSub}>({item.strength})</Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Generic Name & Dosage Form */}
          <View style={styles.row}>
            <View style={[styles.col, { marginRight: 8 }]}>
              <Text style={styles.label}>Generic Name</Text>
              <TextInput
                style={styles.input}
                value={genericName}
                onChangeText={setGenericName}
                placeholder="e.g. Acetaminophen"
                placeholderTextColor="#94A3B8"
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Dosage Form</Text>
              <TextInput
                style={styles.input}
                value={dosageForm}
                onChangeText={setDosageForm}
                placeholder="Tablet, Syrup, etc."
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          {/* Strength & Batch Number */}
          <View style={styles.row}>
            <View style={[styles.col, { marginRight: 8 }]}>
              <Text style={styles.label}>Strength</Text>
              <TextInput
                style={styles.input}
                value={strength}
                onChangeText={setStrength}
                placeholder="e.g. 500mg"
                placeholderTextColor="#94A3B8"
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Batch Number *</Text>
              <TextInput
                style={styles.input}
                value={batchNumber}
                onChangeText={setBatchNumber}
                placeholder="BATCH-202610-01"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          {/* Stock Quantity & Unit Price */}
          <View style={styles.row}>
            <View style={[styles.col, { marginRight: 8 }]}>
              <Text style={styles.label}>Stock Quantity (Units) *</Text>
              <TextInput
                style={styles.input}
                value={stockQuantity}
                onChangeText={setStockQuantity}
                keyboardType="numeric"
                placeholder="100"
                placeholderTextColor="#94A3B8"
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Unit Price (₹) *</Text>
              <TextInput
                style={styles.input}
                value={unitPrice}
                onChangeText={setUnitPrice}
                keyboardType="decimal-pad"
                placeholder="25.00"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          {/* Expiry Date & Low Stock Threshold */}
          <View style={styles.row}>
            <View style={[styles.col, { marginRight: 8 }]}>
              <Text style={styles.label}>Expiry Date (YYYY-MM-DD) *</Text>
              <TextInput
                style={styles.input}
                value={expiryDate}
                onChangeText={setExpiryDate}
                placeholder="2027-12-31"
                placeholderTextColor="#94A3B8"
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Low Stock Alert Level</Text>
              <TextInput
                style={styles.input}
                value={minimumStock}
                onChangeText={setMinimumStock}
                keyboardType="numeric"
                placeholder="10"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button
            title="Save to Inventory"
            loading={submitting}
            onPress={handleSubmit}
            style={styles.submitBtn}
          />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
    marginTop: 10,
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
  row: {
    flexDirection: 'row',
  },
  col: {
    flex: 1,
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
  },
  dropdownItemSub: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 10,
  },
  submitBtn: {
    marginTop: 20,
  },
});
