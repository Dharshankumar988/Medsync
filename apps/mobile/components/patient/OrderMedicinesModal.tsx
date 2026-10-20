import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import {
  ShoppingBag,
  Building2,
  MapPin,
  Phone,
  FileText,
  CheckCircle2,
  X,
  Truck,
  ShieldCheck,
  ChevronRight,
  Package,
  CreditCard,
  Wallet,
  ArrowLeft,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { patientService, PrescriptionItem } from '../../services/patient.service';
import { Colors } from '../../constants/theme';
import { Button } from '../common/Button';
import { MedicalLoadingIndicator } from '../common/MedicalLoadingIndicator';
import { formatErrorMessage } from '../../lib/api';

interface OrderMedicinesModalProps {
  visible: boolean;
  pharmacyData?: {
    pharmacy_id?: string;
    pharmacy_user_id?: string;
    resource_id?: string;
    business_name?: string;
    address?: string;
    phone?: string;
    contact_number?: string;
    data?: any;
  } | null;
  initialPrescriptionId?: string | null;
  onClose: () => void;
  onOrderSuccess?: (order: any) => void;
}

type OrderStep = 'order_details' | 'payment' | 'success';

export function OrderMedicinesModal({
  visible,
  pharmacyData,
  initialPrescriptionId,
  onClose,
  onOrderSuccess,
}: OrderMedicinesModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<OrderStep>('order_details');
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string | null>(initialPrescriptionId || null);
  const [orderMode, setOrderMode] = useState<'prescription' | 'custom'>('prescription');
  const [customMedicineList, setCustomMedicineList] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);
  const [defaultPharmacy, setDefaultPharmacy] = useState<any | null>(null);

  useEffect(() => {
    if (visible) {
      setStep('order_details');
      setCreatedOrder(null);
      if (initialPrescriptionId) {
        setSelectedPrescriptionId(initialPrescriptionId);
        setOrderMode('prescription');
      }
      loadInitialData();
    } else {
      setSelectedPrescriptionId(null);
      setCustomMedicineList('');
      setNotes('');
    }
  }, [visible, initialPrescriptionId]);

  const loadInitialData = async () => {
    setLoadingPrescriptions(true);
    try {
      const [rxs, profile, fallbackPharmacy] = await Promise.all([
        patientService.getPrescriptions().catch(() => []),
        (async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.id) {
              return await patientService.getProfile(user.id);
            }
          } catch {
            return null;
          }
        })(),
        (async () => {
          if (!pharmacyData?.pharmacy_id && !pharmacyData?.pharmacy_user_id && !pharmacyData?.resource_id) {
            try {
              const { data: pharm } = await supabase
                .from('pharmacies')
                .select('*')
                .limit(1)
                .single();
              return pharm;
            } catch {
              return null;
            }
          }
          return null;
        })(),
      ]);

      if (fallbackPharmacy) {
        setDefaultPharmacy({
          pharmacy_id: fallbackPharmacy.user_id || fallbackPharmacy.id,
          business_name: fallbackPharmacy.business_name || 'MedSync Network Pharmacy',
          address: fallbackPharmacy.address || 'Verified City Dispensary',
          phone: fallbackPharmacy.contact_number || fallbackPharmacy.phone_number || '',
        });
      }

      setPrescriptions(rxs);
      if (initialPrescriptionId) {
        setSelectedPrescriptionId(initialPrescriptionId);
        setOrderMode('prescription');
      } else if (rxs.length > 0) {
        setSelectedPrescriptionId(rxs[0].id);
      } else {
        setOrderMode('custom');
      }

      if (profile?.address) {
        setDeliveryAddress(
          [profile.address, profile.city, profile.pincode].filter(Boolean).join(', ')
        );
      }
    } catch (err) {
      console.warn('Could not load prescriptions for order modal:', err);
    } finally {
      setLoadingPrescriptions(false);
    }
  };

  const activePharm = pharmacyData || defaultPharmacy;
  const pharmacyId =
    activePharm?.pharmacy_user_id ||
    activePharm?.pharmacy_id ||
    activePharm?.resource_id ||
    activePharm?.data?.pharmacy_id;
  const pharmacyName = activePharm?.business_name || activePharm?.data?.business_name || 'Verified Dispensary';
  const pharmacyAddress = activePharm?.address || activePharm?.data?.address || 'Licensed MedSync Center';
  const pharmacyPhone = activePharm?.phone || activePharm?.contact_number || activePharm?.data?.phone || '';

  const handleProceedToPayment = () => {
    if (!pharmacyId) {
      Alert.alert('Ordering Error', 'Pharmacy identifier could not be verified.');
      return;
    }

    if (!deliveryAddress.trim()) {
      Alert.alert('Delivery Address Required', 'Please enter your delivery address.');
      return;
    }

    if (orderMode === 'prescription' && !selectedPrescriptionId) {
      Alert.alert('Select Prescription', 'Please choose a prescription or switch to custom medicines.');
      return;
    }

    if (orderMode === 'custom' && !customMedicineList.trim()) {
      Alert.alert('Medicine List Required', 'Please type the medicines you need from this pharmacy.');
      return;
    }

    setStep('payment');
  };

  const handleExecutePayment = async (method: 'CARD' | 'PAYPAL') => {
    setIsSubmitting(true);
    try {
      // 1. Place the order
      const order = await patientService.placeOrder({
        pharmacy_id: pharmacyId!,
        prescription_id: orderMode === 'prescription' ? selectedPrescriptionId : undefined,
        delivery_address: deliveryAddress.trim(),
        notes: notes.trim() || (orderMode === 'custom' ? `Medicines: ${customMedicineList}` : undefined),
      });

      // 2. Process the simulated payment walkthrough
      const orderId = order.id || order.order_id;
      if (orderId) {
        await patientService.processPayment(orderId, 45.0, method);
      }

      setCreatedOrder(order);
      setStep('success');

      if (onOrderSuccess) {
        onOrderSuccess(order);
      }
    } catch (err: any) {
      Alert.alert('Payment & Order Failed', formatErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToOrders = () => {
    onClose();
    router.push('/(tabs)/patient/records');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleBox}>
              {step === 'payment' ? (
                <TouchableOpacity onPress={() => setStep('order_details')} style={styles.backBtn}>
                  <ArrowLeft size={20} color="#0F172A" />
                </TouchableOpacity>
              ) : (
                <View style={styles.iconCircle}>
                  <ShoppingBag size={20} color={Colors.roles.patient.primary} />
                </View>
              )}
              <View>
                <Text style={styles.headerTitle}>
                  {step === 'payment' ? 'Complete Payment' : 'Order Prescription'}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {step === 'payment'
                    ? 'Simulated Payment Walkthrough'
                    : 'Verified Pharmacy Delivery'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {isSubmitting ? (
            <View style={styles.loadingContainer}>
              <MedicalLoadingIndicator
                message="Processing Simulated Payment..."
                subMessage="Routing encrypted payment authorization to pharmacy"
                color={Colors.roles.patient.primary}
              />
            </View>
          ) : step === 'success' ? (
            /* ── STEP 3: SUCCESS ── */
            <View style={styles.successContainer}>
              <View style={styles.successIconCircle}>
                <CheckCircle2 size={44} color="#10B981" />
              </View>
              <Text style={styles.successTitle}>Order Placed & Paid!</Text>
              <Text style={styles.successSubtitle}>
                Payment of $45.00 has been verified. Your prescription order has been sent to{' '}
                <Text style={{ fontWeight: '700', color: '#0F172A' }}>{pharmacyName}</Text> for packing and dispatch.
              </Text>

              {createdOrder?.tracking_number && (
                <View style={styles.trackingPill}>
                  <Truck size={16} color="#10B981" />
                  <Text style={styles.trackingPillText}>
                    Tracking: {createdOrder.tracking_number}
                  </Text>
                </View>
              )}

              <View style={styles.successBtnRow}>
                <Button
                  title="Track in Orders"
                  onPress={handleGoToOrders}
                  style={styles.trackBtn}
                />
                <Button
                  title="Done"
                  variant="outline"
                  onPress={onClose}
                  style={styles.closeSuccessBtn}
                />
              </View>
            </View>
          ) : step === 'payment' ? (
            /* ── STEP 2: PAYMENT SPOOF / SIMULATED CHECKOUT ── */
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <View style={styles.pricingCard}>
                <Text style={styles.pricingCardTitle}>Order Cost Breakdown</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Prescription Medications Total</Text>
                  <Text style={styles.priceVal}>$35.00</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Priority Doorstep Delivery</Text>
                  <Text style={styles.priceVal}>$10.00</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Due (USD)</Text>
                  <Text style={styles.totalVal}>$45.00</Text>
                </View>
              </View>

              <View style={styles.spoofNotice}>
                <ShieldCheck size={16} color="#059669" />
                <Text style={styles.spoofNoticeText}>
                  Test Environment: Simulated Payment Walkthrough. No real funds will be charged.
                </Text>
              </View>

              {/* Payment Methods */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Select Simulated Payment Method</Text>

                <TouchableOpacity
                  style={styles.paymentMethodBtn}
                  onPress={() => handleExecutePayment('CARD')}
                  activeOpacity={0.85}
                >
                  <View style={styles.payIconBoxBlue}>
                    <CreditCard size={20} color="#2563EB" />
                  </View>
                  <View style={styles.payTextBox}>
                    <Text style={styles.payTitle}>Credit / Debit Card</Text>
                    <Text style={styles.paySub}>Instant verification via simulated gateway</Text>
                  </View>
                  <ChevronRight size={18} color="#94A3B8" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.paymentMethodBtn, styles.payMethodPaypal]}
                  onPress={() => handleExecutePayment('PAYPAL')}
                  activeOpacity={0.85}
                >
                  <View style={styles.payIconBoxAmber}>
                    <Wallet size={20} color="#D97706" />
                  </View>
                  <View style={styles.payTextBox}>
                    <Text style={styles.payTitle}>PayPal / UPI Digital Wallet</Text>
                    <Text style={styles.paySub}>Simulate seamless 1-tap checkout</Text>
                  </View>
                  <ChevronRight size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            /* ── STEP 1: ORDER DETAILS ── */
            <ScrollView contentContainerStyle={styles.scrollContent}>
              {/* Pharmacy Context Banner */}
              <View style={styles.pharmacyCard}>
                <View style={styles.pharmacyHeader}>
                  <Building2 size={18} color="#059669" />
                  <Text style={styles.pharmacyName}>{pharmacyName}</Text>
                  <View style={styles.verifiedTag}>
                    <ShieldCheck size={12} color="#059669" />
                    <Text style={styles.verifiedTagText}>VERIFIED</Text>
                  </View>
                </View>
                <View style={styles.metaRow}>
                  <MapPin size={13} color="#64748B" />
                  <Text style={styles.pharmacyMeta}>{pharmacyAddress}</Text>
                </View>
                {pharmacyPhone ? (
                  <View style={styles.metaRow}>
                    <Phone size={13} color="#64748B" />
                    <Text style={styles.pharmacyMeta}>{pharmacyPhone}</Text>
                  </View>
                ) : null}
              </View>

              {/* Order Mode Switcher */}
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    orderMode === 'prescription' && styles.segmentBtnActive,
                  ]}
                  onPress={() => setOrderMode('prescription')}
                >
                  <FileText
                    size={15}
                    color={orderMode === 'prescription' ? Colors.roles.patient.primary : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      orderMode === 'prescription' && styles.segmentTextActive,
                    ]}
                  >
                    From Prescription
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    orderMode === 'custom' && styles.segmentBtnActive,
                  ]}
                  onPress={() => setOrderMode('custom')}
                >
                  <Package
                    size={15}
                    color={orderMode === 'custom' ? Colors.roles.patient.primary : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      orderMode === 'custom' && styles.segmentTextActive,
                    ]}
                  >
                    Custom Medicine
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Prescription Picker */}
              {orderMode === 'prescription' ? (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Select Active Prescription</Text>
                  {loadingPrescriptions ? (
                    <Text style={styles.hintText}>Loading your prescriptions...</Text>
                  ) : prescriptions.length === 0 ? (
                    <View style={styles.emptyBox}>
                      <Text style={styles.emptyText}>
                        No active digital prescriptions found on your account.
                      </Text>
                      <TouchableOpacity onPress={() => setOrderMode('custom')}>
                        <Text style={styles.switchLink}>
                          Switch to typing custom medicine names →
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    prescriptions.map((rx) => {
                      const isSelected = selectedPrescriptionId === rx.id;
                      return (
                        <TouchableOpacity
                          key={rx.id}
                          style={[styles.rxCard, isSelected && styles.rxCardSelected]}
                          onPress={() => setSelectedPrescriptionId(rx.id)}
                        >
                          <View style={styles.rxHeader}>
                            <View style={styles.rxTitleBox}>
                              <Text style={styles.rxDiagnosis}>{rx.diagnosis}</Text>
                              <Text style={styles.rxDate}>
                                {rx.created_at
                                  ? new Date(rx.created_at).toLocaleDateString()
                                  : 'Active'}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.radioCircle,
                                isSelected && styles.radioCircleSelected,
                              ]}
                            >
                              {isSelected && <View style={styles.radioInner} />}
                            </View>
                          </View>
                          {rx.doctor?.full_name ? (
                            <Text style={styles.rxDoctor}>Prescribed by: Dr. {rx.doctor.full_name}</Text>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              ) : (
                /* Custom Medicine Entry */
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Medicines / Required Items</Text>
                  <TextInput
                    style={styles.textArea}
                    placeholder="e.g. Paracetamol 650mg (1 strip), Cetirizine 10mg (10 tabs)"
                    placeholderTextColor="#94A3B8"
                    value={customMedicineList}
                    onChangeText={setCustomMedicineList}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              )}

              {/* Delivery Address */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Delivery Address *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter complete delivery street address"
                  placeholderTextColor="#94A3B8"
                  value={deliveryAddress}
                  onChangeText={setDeliveryAddress}
                />
              </View>

              {/* Delivery Notes */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Delivery Notes / Instructions (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Deliver between 2 PM - 5 PM, call on arrival"
                  placeholderTextColor="#94A3B8"
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>

              {/* Proceed CTA */}
              <Button
                title="Proceed to Payment ($45.00)"
                onPress={handleProceedToPayment}
                iconRight={<ChevronRight size={18} color="#FFFFFF" />}
                style={styles.submitBtn}
              />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  pharmacyCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 14,
    gap: 6,
  },
  pharmacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pharmacyName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065F46',
    flex: 1,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pharmacyMeta: {
    fontSize: 12,
    color: '#475569',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#059669',
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  rxCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 4,
    marginBottom: 4,
  },
  rxCardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  rxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rxTitleBox: {
    flex: 1,
  },
  rxDiagnosis: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  rxDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  rxDoctor: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#10B981',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  emptyBox: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  switchLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 4,
  },
  input: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  textArea: {
    height: 76,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    textAlignVertical: 'top',
  },
  hintText: {
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
  },
  submitBtn: {
    marginTop: 8,
    backgroundColor: '#10B981',
  },
  pricingCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 10,
  },
  pricingCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  priceVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  totalVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
  },
  spoofNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 12,
    borderRadius: 12,
  },
  spoofNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#065F46',
    lineHeight: 16,
  },
  paymentMethodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
  },
  payMethodPaypal: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  payIconBoxBlue: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payIconBoxAmber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payTextBox: {
    flex: 1,
  },
  payTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  paySub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  successContainer: {
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#065F46',
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 19,
  },
  trackingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: 4,
  },
  trackingPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  successBtnRow: {
    width: '100%',
    gap: 10,
    marginTop: 14,
  },
  trackBtn: {
    backgroundColor: '#10B981',
  },
  closeSuccessBtn: {
    borderColor: '#CBD5E1',
  },
});
