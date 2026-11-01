import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Easing,
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
  CreditCard,
  Wallet,
  ArrowLeft,
  Banknote,
  Compass,
  Check,
  Pill,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import { patientService, PrescriptionItem } from '../../services/patient.service';
import { useTheme } from '../../context/ThemeContext';
import { DeliveryLocationPickerModal } from './DeliveryLocationPickerModal';
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
  defaultPharmacyId?: string | null;
  initialPrescriptionId?: string | null;
  onClose: () => void;
  onOrderSuccess?: (order: any) => void;
  onSuccess?: (order?: any) => void;
}

type OrderStep = 'order_details' | 'payment' | 'animating_payment' | 'success';

export function OrderMedicinesModal({
  visible,
  pharmacyData,
  defaultPharmacyId,
  initialPrescriptionId,
  onClose,
  onOrderSuccess,
  onSuccess,
}: OrderMedicinesModalProps) {
  const router = useRouter();
  const { theme, isDark } = useTheme();

  const [step, setStep] = useState<OrderStep>('order_details');
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string | null>(
    initialPrescriptionId || null
  );
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);
  const [defaultPharmacy, setDefaultPharmacy] = useState<any | null>(null);

  // Map & Pin location modal
  const [mapPickerVisible, setMapPickerVisible] = useState(false);

  // Selected Payment Method for Animation
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'UPI' | 'CARD' | 'COD'>('UPI');

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.8)).current;
  const textOpacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStep('order_details');
      setCreatedOrder(null);
      if (initialPrescriptionId) {
        setSelectedPrescriptionId(initialPrescriptionId);
      }
      loadInitialData();
    } else {
      setSelectedPrescriptionId(null);
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
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (user?.id) {
              return await patientService.getProfile(user.id);
            }
          } catch {
            return null;
          }
        })(),
        (async () => {
          if (
            !pharmacyData?.pharmacy_id &&
            !pharmacyData?.pharmacy_user_id &&
            !pharmacyData?.resource_id
          ) {
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
      } else if (rxs.length > 0) {
        setSelectedPrescriptionId(rxs[0].id);
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
  const pharmacyName =
    activePharm?.business_name || activePharm?.data?.business_name || 'Verified Dispensary';
  const pharmacyAddress =
    activePharm?.address || activePharm?.data?.address || 'Licensed MedSync Center';
  const pharmacyPhone =
    activePharm?.phone || activePharm?.contact_number || activePharm?.data?.phone || '';

  const selectedPrescription = prescriptions.find((rx) => rx.id === selectedPrescriptionId);

  const handleProceedToPayment = () => {
    if (!pharmacyId) {
      Alert.alert('Ordering Error', 'Pharmacy identifier could not be verified.');
      return;
    }

    if (!selectedPrescriptionId) {
      Alert.alert(
        'Select Prescription',
        'Please select an active verified prescription to order your medicines.'
      );
      return;
    }

    if (!deliveryAddress.trim()) {
      Alert.alert(
        'Delivery Address Required',
        'Please enter or pin your delivery address on the map.'
      );
      return;
    }

    setStep('payment');
  };

  // Trigger payment animation first, then place order
  const handleSelectPaymentMethod = (method: 'UPI' | 'CARD' | 'COD') => {
    setSelectedPaymentMethod(method);
    setStep('animating_payment');

    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    // Start sleek payment animations
    scaleAnim.setValue(0);
    pulseAnim.setValue(0.8);
    textOpacityAnim.setValue(0);

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(textOpacityAnim, {
        toValue: 1,
        duration: 400,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.95,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();

    // After animation displays clearly (1.6s), execute backend order placement
    setTimeout(() => {
      executeOrderPlacement(method);
    }, 1600);
  };

  const executeOrderPlacement = async (method: 'UPI' | 'CARD' | 'COD') => {
    setIsSubmitting(true);
    try {
      // 1. Place the order with backend
      const order = await patientService.placeOrder({
        pharmacy_id: pharmacyId!,
        prescription_id: selectedPrescriptionId!,
        delivery_address: deliveryAddress.trim(),
        notes: notes.trim() || undefined,
      });

      // 2. Process the payment record (UPI / CARD / COD)
      const orderId = order.id || order.order_id;
      if (orderId) {
        await patientService.processPayment(orderId, 399.0, method);
      }

      setCreatedOrder(order);
      setStep('success');

      if (onOrderSuccess) onOrderSuccess(order);
      if (onSuccess) onSuccess(order);
    } catch (err: any) {
      Alert.alert('Order Placement Notice', formatErrorMessage(err));
      setStep('payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToOrders = () => {
    onClose();
    router.push('/(tabs)/patient/records');
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View
            style={[
              styles.sheetContainer,
              { backgroundColor: isDark ? '#0D0F14' : '#FFFFFF' },
            ]}
          >
            {/* Header Row */}
            <View
              style={[
                styles.headerRow,
                { borderBottomColor: isDark ? '#1F2430' : '#F1F5F9' },
              ]}
            >
              <View style={styles.headerTitleBox}>
                {step === 'payment' ? (
                  <TouchableOpacity
                    onPress={() => setStep('order_details')}
                    style={[
                      styles.backBtn,
                      { backgroundColor: isDark ? '#181B22' : '#F1F5F9' },
                    ]}
                  >
                    <ArrowLeft size={18} color={theme.text} />
                  </TouchableOpacity>
                ) : (
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' },
                    ]}
                  >
                    <ShoppingBag size={20} color="#10B981" />
                  </View>
                )}
                <View>
                  <Text style={[styles.headerTitle, { color: theme.text }]}>
                    {step === 'payment'
                      ? 'Complete Payment'
                      : step === 'animating_payment'
                      ? 'Processing Order'
                      : 'Order Prescription'}
                  </Text>
                  <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>
                    {step === 'payment'
                      ? 'Select Payment Method'
                      : step === 'animating_payment'
                      ? 'Authorizing payment'
                      : 'Verified Pharmacy Delivery'}
                  </Text>
                </View>
              </View>
              {step !== 'animating_payment' && (
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <X size={20} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* ── STEP: ANIMATING PAYMENT ("PAID" ANIMATION) ── */}
            {step === 'animating_payment' ? (
              <View style={styles.animatingContainer}>
                {/* Expanding Pulse Ring */}
                <Animated.View
                  style={[
                    styles.animationPulseRing,
                    {
                      borderColor:
                        selectedPaymentMethod === 'COD' ? '#F59E0B' : '#10B981',
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                />

                {/* Main Checkmark / Currency Badge */}
                <Animated.View
                  style={[
                    styles.animationCircle,
                    {
                      backgroundColor:
                        selectedPaymentMethod === 'COD'
                          ? isDark
                            ? 'rgba(245, 158, 11, 0.2)'
                            : '#FEF3C7'
                          : isDark
                          ? 'rgba(16, 185, 129, 0.2)'
                          : '#D1FAE5',
                      borderColor:
                        selectedPaymentMethod === 'COD' ? '#F59E0B' : '#10B981',
                      transform: [{ scale: scaleAnim }],
                    },
                  ]}
                >
                  <Check
                    size={46}
                    color={selectedPaymentMethod === 'COD' ? '#D97706' : '#059669'}
                    strokeWidth={3.5}
                  />
                </Animated.View>

                {/* Animated Text: "PAID" */}
                <Animated.View style={{ opacity: textOpacityAnim, alignItems: 'center' }}>
                  <Text
                    style={[
                      styles.paidTitle,
                      {
                        color:
                          selectedPaymentMethod === 'COD' ? '#D97706' : '#10B981',
                      },
                    ]}
                  >
                    {selectedPaymentMethod === 'COD' ? 'ORDER CONFIRMED' : 'PAID'}
                  </Text>

                  <View
                    style={[
                      styles.paidAmountBadge,
                      {
                        backgroundColor: isDark ? '#181B22' : '#F1F5F9',
                        borderColor: isDark ? '#272B36' : '#E2E8F0',
                      },
                    ]}
                  >
                    <Text style={[styles.paidAmountText, { color: theme.text }]}>
                      ₹399.00 •{' '}
                      {selectedPaymentMethod === 'COD'
                        ? 'Cash on Delivery'
                        : selectedPaymentMethod === 'UPI'
                        ? 'UPI Instant'
                        : 'Card Payment'}
                    </Text>
                  </View>

                  <Text style={[styles.paidSubtext, { color: theme.textMuted }]}>
                    Routing encrypted order to {pharmacyName}...
                  </Text>
                </Animated.View>
              </View>
            ) : step === 'success' ? (
              /* ── STEP: SUCCESS CONFIRMATION ── */
              <View style={styles.successContainer}>
                <View
                  style={[
                    styles.successIconCircle,
                    {
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : '#D1FAE5',
                    },
                  ]}
                >
                  <CheckCircle2 size={46} color="#10B981" />
                </View>
                <Text style={[styles.successTitle, { color: theme.text }]}>
                  {selectedPaymentMethod === 'COD'
                    ? 'Order Placed (COD)!'
                    : 'Order Placed & Paid!'}
                </Text>
                <Text style={[styles.successSubtitle, { color: theme.textSecondary }]}>
                  {selectedPaymentMethod === 'COD'
                    ? 'Your order of ₹399.00 has been confirmed. Please pay in cash upon doorstep delivery from '
                    : 'Payment of ₹399.00 has been verified. Your prescription order has been dispatched to '}
                  <Text style={{ fontWeight: '700', color: theme.text }}>
                    {pharmacyName}
                  </Text>{' '}
                  for immediate packaging.
                </Text>

                {createdOrder?.tracking_number && (
                  <View
                    style={[
                      styles.trackingPill,
                      {
                        backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5',
                        borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
                      },
                    ]}
                  >
                    <Truck size={16} color="#10B981" />
                    <Text style={styles.trackingPillText}>
                      Tracking: {createdOrder.tracking_number}
                    </Text>
                  </View>
                )}

                <View style={styles.successBtnRow}>
                  <TouchableOpacity
                    style={styles.trackBtn}
                    onPress={handleGoToOrders}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.trackBtnText}>Track Order in Records</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.closeSuccessBtn,
                      {
                        backgroundColor: isDark ? '#181B22' : '#F1F5F9',
                        borderColor: isDark ? '#272B36' : '#E2E8F0',
                      },
                    ]}
                    onPress={onClose}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.closeSuccessBtnText, { color: theme.text }]}>
                      Done
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : step === 'payment' ? (
              /* ── STEP 2: PAYMENT METHOD SELECTION ── */
              <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Cost Breakdown in Rupees */}
                <View
                  style={[
                    styles.pricingCard,
                    {
                      backgroundColor: isDark ? '#12141A' : '#F8FAFC',
                      borderColor: isDark ? '#1F2430' : '#E2E8F0',
                    },
                  ]}
                >
                  <Text style={[styles.pricingCardTitle, { color: theme.text }]}>
                    Order Cost Breakdown
                  </Text>
                  <View style={styles.priceRow}>
                    <Text style={[styles.priceLabel, { color: theme.textMuted }]}>
                      Prescription Medications Total
                    </Text>
                    <Text style={[styles.priceVal, { color: theme.text }]}>₹350.00</Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={[styles.priceLabel, { color: theme.textMuted }]}>
                      Priority Doorstep Delivery
                    </Text>
                    <Text style={[styles.priceVal, { color: theme.text }]}>₹49.00</Text>
                  </View>
                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: isDark ? '#1F2430' : '#E2E8F0' },
                    ]}
                  />
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, { color: theme.text }]}>
                      Total Due (INR)
                    </Text>
                    <Text style={styles.totalVal}>₹399.00</Text>
                  </View>
                </View>

                {/* Payment Methods */}
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                    Select Payment Method
                  </Text>

                  {/* 1. UPI / QR Digital Wallet */}
                  <TouchableOpacity
                    style={[
                      styles.paymentMethodBtn,
                      {
                        backgroundColor: isDark ? '#12141A' : '#FFFFFF',
                        borderColor: isDark ? '#272B36' : '#E2E8F0',
                      },
                    ]}
                    onPress={() => handleSelectPaymentMethod('UPI')}
                    activeOpacity={0.85}
                  >
                    <View style={styles.payIconBoxEmerald}>
                      <Wallet size={20} color="#10B981" />
                    </View>
                    <View style={styles.payTextBox}>
                      <Text style={[styles.payTitle, { color: theme.text }]}>
                        UPI / QR Digital Wallet
                      </Text>
                      <Text style={[styles.paySub, { color: theme.textMuted }]}>
                        Google Pay, PhonePe, Paytm, BHIM UPI
                      </Text>
                    </View>
                    <ChevronRight size={18} color={theme.textMuted} />
                  </TouchableOpacity>

                  {/* 2. Credit / Debit Card */}
                  <TouchableOpacity
                    style={[
                      styles.paymentMethodBtn,
                      {
                        backgroundColor: isDark ? '#12141A' : '#FFFFFF',
                        borderColor: isDark ? '#272B36' : '#E2E8F0',
                      },
                    ]}
                    onPress={() => handleSelectPaymentMethod('CARD')}
                    activeOpacity={0.85}
                  >
                    <View style={styles.payIconBoxBlue}>
                      <CreditCard size={20} color="#3B82F6" />
                    </View>
                    <View style={styles.payTextBox}>
                      <Text style={[styles.payTitle, { color: theme.text }]}>
                        Credit / Debit Card
                      </Text>
                      <Text style={[styles.paySub, { color: theme.textMuted }]}>
                        Visa, Mastercard, RuPay Cards
                      </Text>
                    </View>
                    <ChevronRight size={18} color={theme.textMuted} />
                  </TouchableOpacity>

                  {/* 3. Cash on Delivery (COD) */}
                  <TouchableOpacity
                    style={[
                      styles.paymentMethodBtn,
                      styles.payMethodCod,
                      {
                        backgroundColor: isDark ? '#17140B' : '#FFFBEB',
                        borderColor: isDark ? '#78350F' : '#FDE68A',
                      },
                    ]}
                    onPress={() => handleSelectPaymentMethod('COD')}
                    activeOpacity={0.85}
                  >
                    <View style={styles.payIconBoxAmber}>
                      <Banknote size={20} color="#D97706" />
                    </View>
                    <View style={styles.payTextBox}>
                      <Text style={[styles.payTitle, { color: theme.text }]}>
                        Cash on Delivery (COD)
                      </Text>
                      <Text style={[styles.paySub, { color: isDark ? '#F59E0B' : '#B45309' }]}>
                        Pay with cash upon medicine delivery at your doorstep
                      </Text>
                    </View>
                    <ChevronRight size={18} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              /* ── STEP 1: ORDER PRESCRIPTION DETAILS ── */
              <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Pharmacy Context Banner */}
                <View
                  style={[
                    styles.pharmacyCard,
                    {
                      backgroundColor: isDark ? '#0A1A14' : '#ECFDF5',
                      borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
                    },
                  ]}
                >
                  <View style={styles.pharmacyHeader}>
                    <Building2 size={18} color="#10B981" />
                    <Text style={[styles.pharmacyName, { color: isDark ? '#34D399' : '#065F46' }]}>
                      {pharmacyName}
                    </Text>
                    <View style={styles.verifiedTag}>
                      <ShieldCheck size={12} color="#059669" />
                      <Text style={styles.verifiedTagText}>VERIFIED</Text>
                    </View>
                  </View>
                  <View style={styles.metaRow}>
                    <MapPin size={13} color={isDark ? '#6EE7B7' : '#64748B'} />
                    <Text style={[styles.pharmacyMeta, { color: isDark ? '#A7F3D0' : '#475569' }]}>
                      {pharmacyAddress}
                    </Text>
                  </View>
                  {pharmacyPhone ? (
                    <View style={styles.metaRow}>
                      <Phone size={13} color={isDark ? '#6EE7B7' : '#64748B'} />
                      <Text style={[styles.pharmacyMeta, { color: isDark ? '#A7F3D0' : '#475569' }]}>
                        {pharmacyPhone}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Prescription Selector (Strictly from verified prescriptions) */}
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                    Select Active Digital Prescription
                  </Text>
                  {loadingPrescriptions ? (
                    <Text style={[styles.hintText, { color: theme.textMuted }]}>
                      Loading your prescriptions...
                    </Text>
                  ) : prescriptions.length === 0 ? (
                    <View
                      style={[
                        styles.emptyBox,
                        {
                          backgroundColor: isDark ? '#12141A' : '#F8FAFC',
                          borderColor: isDark ? '#1F2430' : '#E2E8F0',
                        },
                      ]}
                    >
                      <Pill size={24} color={theme.textMuted} />
                      <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                        No active digital prescriptions found on your account. Please consult your doctor to receive an encrypted digital prescription.
                      </Text>
                    </View>
                  ) : (
                    prescriptions.map((rx) => {
                      const isSelected = selectedPrescriptionId === rx.id;
                      return (
                        <TouchableOpacity
                          key={rx.id}
                          style={[
                            styles.rxCard,
                            {
                              backgroundColor: isSelected
                                ? isDark
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : '#F0FDF4'
                                : isDark
                                ? '#12141A'
                                : '#F8FAFC',
                              borderColor: isSelected
                                ? '#10B981'
                                : isDark
                                ? '#1F2430'
                                : '#E2E8F0',
                            },
                          ]}
                          onPress={() => setSelectedPrescriptionId(rx.id)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.rxHeader}>
                            <View style={styles.rxTitleBox}>
                              <Text style={[styles.rxDiagnosis, { color: theme.text }]}>
                                {rx.diagnosis || 'Clinical Prescription'}
                              </Text>
                              <Text style={[styles.rxDate, { color: theme.textMuted }]}>
                                Issued:{' '}
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
                            <Text style={[styles.rxDoctor, { color: theme.textSecondary }]}>
                              Prescribing Physician: Dr. {rx.doctor.full_name}
                            </Text>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>

                {/* Delivery Address with Interactive Map & Pin Selector */}
                <View style={styles.section}>
                  <View style={styles.addressLabelRow}>
                    <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                      Delivery Address *
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.mapPinButton,
                        {
                          backgroundColor: isDark ? 'rgba(59, 130, 246, 0.16)' : '#EFF6FF',
                          borderColor: isDark ? 'rgba(59, 130, 246, 0.35)' : '#BFDBFE',
                        },
                      ]}
                      onPress={() => setMapPickerVisible(true)}
                      activeOpacity={0.8}
                    >
                      <Compass size={13} color="#3B82F6" style={{ marginRight: 4 }} />
                      <Text style={styles.mapPinButtonText}>Pin on Map</Text>
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: isDark ? '#12141A' : '#F8FAFC',
                        borderColor: isDark ? '#1F2430' : '#E2E8F0',
                        color: theme.text,
                      },
                    ]}
                    placeholder="Enter complete street address, door no, or pin on map"
                    placeholderTextColor={theme.inputPlaceholder}
                    value={deliveryAddress}
                    onChangeText={setDeliveryAddress}
                  />
                </View>

                {/* Delivery Notes */}
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                    Delivery Notes / Instructions (Optional)
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: isDark ? '#12141A' : '#F8FAFC',
                        borderColor: isDark ? '#1F2430' : '#E2E8F0',
                        color: theme.text,
                      },
                    ]}
                    placeholder="e.g. Leave with security / Call on arrival"
                    placeholderTextColor={theme.inputPlaceholder}
                    value={notes}
                    onChangeText={setNotes}
                  />
                </View>

                {/* Proceed CTA in Rupees */}
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    {
                      opacity: !selectedPrescriptionId || !deliveryAddress.trim() ? 0.6 : 1,
                    },
                  ]}
                  onPress={handleProceedToPayment}
                  disabled={!selectedPrescriptionId || !deliveryAddress.trim()}
                  activeOpacity={0.88}
                >
                  <Text style={styles.submitBtnText}>Proceed to Payment (₹399.00)</Text>
                  <ChevronRight size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Map & Pin Location Picker Modal ── */}
      <DeliveryLocationPickerModal
        visible={mapPickerVisible}
        initialAddress={deliveryAddress}
        onClose={() => setMapPickerVisible(false)}
        onLocationSelected={(address) => {
          setDeliveryAddress(address);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  hintText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  pharmacyCard: {
    borderRadius: 16,
    borderWidth: 1,
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
    flex: 1,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pharmacyMeta: {
    fontSize: 12,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  addressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapPinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  mapPinButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3B82F6',
  },
  rxCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    gap: 6,
    marginBottom: 4,
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
  },
  rxDate: {
    fontSize: 11,
    marginTop: 2,
  },
  rxDoctor: {
    fontSize: 12,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
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
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 13.5,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    height: 50,
    borderRadius: 14,
    marginTop: 8,
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  pricingCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  pricingCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 13,
  },
  priceVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
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
  },
  totalVal: {
    fontSize: 19,
    fontWeight: '800',
    color: '#10B981',
  },
  paymentMethodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
  },
  payMethodCod: {
    borderWidth: 1.5,
  },
  payIconBoxEmerald: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payIconBoxBlue: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payIconBoxAmber: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payTextBox: {
    flex: 1,
  },
  payTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  paySub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  animatingContainer: {
    paddingVertical: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animationPulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
  },
  animationCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  paidTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  paidAmountBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  paidAmountText: {
    fontSize: 13,
    fontWeight: '700',
  },
  paidSubtext: {
    fontSize: 12,
    fontWeight: '500',
  },
  successContainer: {
    padding: 26,
    alignItems: 'center',
    gap: 12,
  },
  successIconCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  trackingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 4,
  },
  trackingPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  successBtnRow: {
    width: '100%',
    gap: 10,
    marginTop: 14,
  },
  trackBtn: {
    backgroundColor: '#10B981',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  closeSuccessBtn: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeSuccessBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
});
