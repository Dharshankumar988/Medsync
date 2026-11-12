import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  Truck,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  MapPin,
  Store,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react-native';
import api from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';

interface DeliveryTrackingModalProps {
  visible: boolean;
  onClose: () => void;
  order?: any | null;
  orderId?: string | null;
  trackingNumber?: string | null;
  orderStatus?: string | null;
  pharmacyName?: string | null;
  deliveryAddress?: string | null;
}

export function DeliveryTrackingModal({
  visible,
  onClose,
  order,
  orderId,
  trackingNumber,
  orderStatus,
  pharmacyName,
  deliveryAddress,
}: DeliveryTrackingModalProps) {
  const { theme, isDark } = useTheme();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const effectiveOrderId = orderId || order?.id || null;
  const effectiveTrackingNumber = trackingNumber || order?.tracking_number || null;
  const effectiveAddress = deliveryAddress || order?.delivery_address || null;
  const rawOrderStatus = String(orderStatus || order?.status || '').toUpperCase();

  const fetchActiveDelivery = async () => {
    try {
      setLoading(true);
      const res = await api.get('/delivery/tracking/active');
      const data = res.data?.data ?? res.data;
      setDeliveries(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('Active delivery fetch error:', e);
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    if (rawOrderStatus === 'DELIVERED' || rawOrderStatus === 'CANCELLED') {
      setLoading(false);
      return;
    }
    fetchActiveDelivery();
    const interval = setInterval(fetchActiveDelivery, 6000);
    return () => clearInterval(interval);
  }, [visible, rawOrderStatus]);

  const activeDelivery =
    (effectiveOrderId
      ? deliveries.find(
          (d) => d.order_id === effectiveOrderId || d.dispensing_log_id === effectiveOrderId
        )
      : null) || (rawOrderStatus === 'DELIVERED' ? null : deliveries[0] || null);

  const resolvedStatus = String(
    rawOrderStatus === 'DELIVERED' || rawOrderStatus === 'CANCELLED'
      ? rawOrderStatus
      : activeDelivery?.delivery_status || rawOrderStatus || 'PROCESSING'
  ).toUpperCase();

  const isDelivered = resolvedStatus === 'DELIVERED';
  const isCancelled = resolvedStatus === 'CANCELLED';
  const isInTransit = ['SHIPPED', 'OUT_FOR_DELIVERY', 'DISPATCHED', 'IN_TRANSIT'].includes(
    resolvedStatus
  );
  const resolvedPharmacyName =
    activeDelivery?.pharmacy_name || pharmacyName || order?.pharmacy_name || 'MedSync Network Pharmacy';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={[styles.sheetCard, { backgroundColor: theme.card, borderTopColor: theme.border, borderWidth: 1 }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: isDelivered
                      ? isDark
                        ? 'rgba(16, 185, 129, 0.16)'
                        : '#ECFDF5'
                      : isDark
                      ? 'rgba(56, 189, 248, 0.14)'
                      : '#F0F9FF',
                  },
                ]}
              >
                {isDelivered ? (
                  <CheckCircle2 size={22} color="#10B981" />
                ) : (
                  <Truck size={22} color={theme.accent} />
                )}
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.title, { color: theme.text }]}>
                  {isDelivered
                    ? 'Delivery Completed'
                    : isCancelled
                    ? 'Order Cancelled'
                    : 'Live Delivery Tracking'}
                </Text>
                <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                  {effectiveTrackingNumber ||
                    (effectiveOrderId
                      ? `Order #${effectiveOrderId.substring(0, 8)}`
                      : 'Prescription Express')}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {loading && !activeDelivery && !isDelivered && !isCancelled ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={[styles.loadingText, { color: theme.textMuted }]}>Connecting to Courier GPS...</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Delivery Status Banner */}
              <View
                style={[
                  styles.etaCard,
                  {
                    backgroundColor: isDelivered
                      ? isDark
                        ? 'rgba(16, 185, 129, 0.1)'
                        : '#ECFDF5'
                      : isCancelled
                      ? isDark
                        ? 'rgba(239, 68, 68, 0.1)'
                        : '#FEF2F2'
                      : isDark
                      ? 'rgba(56, 189, 248, 0.08)'
                      : '#F0F9FF',
                    borderColor: isDelivered
                      ? isDark
                        ? 'rgba(16, 185, 129, 0.28)'
                        : '#A7F3D0'
                      : isCancelled
                      ? isDark
                        ? 'rgba(239, 68, 68, 0.28)'
                        : '#FCA5A5'
                      : isDark
                      ? 'rgba(56, 189, 248, 0.22)'
                      : '#BAE6FD',
                  },
                ]}
              >
                <View style={styles.etaHeader}>
                  {isDelivered ? (
                    <CheckCircle2 size={18} color="#10B981" />
                  ) : isCancelled ? (
                    <AlertCircle size={18} color="#EF4444" />
                  ) : (
                    <Clock size={18} color={theme.accent} />
                  )}
                  <Text
                    style={[
                      styles.etaLabel,
                      {
                        color: isDelivered
                          ? '#10B981'
                          : isCancelled
                          ? '#EF4444'
                          : theme.accent,
                      },
                    ]}
                  >
                    {isDelivered
                      ? 'Order Status'
                      : isCancelled
                      ? 'Order Status'
                      : isInTransit
                      ? 'Estimated Arrival'
                      : 'Fulfillment Status'}
                  </Text>
                </View>
                <Text style={[styles.etaTime, { color: theme.text }]}>
                  {isDelivered
                    ? 'Delivered'
                    : isCancelled
                    ? 'Cancelled'
                    : isInTransit
                    ? activeDelivery?.estimated_delivery_minutes
                      ? `${activeDelivery.estimated_delivery_minutes} Mins`
                      : '18 - 25 Mins'
                    : 'Preparing Order'}
                </Text>
                <Text style={[styles.etaSub, { color: theme.textMuted }]}>
                  {isDelivered
                    ? effectiveAddress
                      ? `Handed over at ${effectiveAddress}`
                      : 'Medications delivered & signed off'
                    : isCancelled
                    ? 'This medicine order has been cancelled.'
                    : isInTransit
                    ? 'Courier is currently navigating to your address'
                    : 'Your verified pharmacy is packing your prescription'}
                </Text>
              </View>

              {/* Progress Stepper */}
              <View style={styles.timelineContainer}>
                {/* Step 1: Order Packed */}
                <View style={styles.timelineStep}>
                  <View style={[styles.stepDot, styles.stepDotDone]}>
                    <CheckCircle2 size={14} color="#FFFFFF" />
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={[styles.stepTitle, { color: theme.text }]}>Prescription Verified & Packed</Text>
                    <Text style={[styles.stepDesc, { color: theme.textMuted }]}>
                      {resolvedPharmacyName} — Sealed in tamper-evident pouch
                    </Text>
                  </View>
                </View>

                {/* Line */}
                <View
                  style={[
                    styles.stepLine,
                    { backgroundColor: isInTransit || isDelivered ? '#10B981' : theme.border },
                  ]}
                />

                {/* Step 2: In Transit */}
                <View style={styles.timelineStep}>
                  <View
                    style={[
                      styles.stepDot,
                      isDelivered
                        ? styles.stepDotDone
                        : isInTransit
                        ? { backgroundColor: theme.accent }
                        : { backgroundColor: theme.cardElevated },
                    ]}
                  >
                    {isDelivered ? (
                      <CheckCircle2 size={14} color="#FFFFFF" />
                    ) : (
                      <Truck size={14} color={isInTransit ? '#09090B' : theme.textMuted} />
                    )}
                  </View>
                  <View style={styles.stepContent}>
                    <Text
                      style={[
                        styles.stepTitle,
                        {
                          color: isDelivered
                            ? theme.text
                            : isInTransit
                            ? theme.accent
                            : theme.textMuted,
                        },
                      ]}
                    >
                      Out for Delivery
                    </Text>
                    <Text style={[styles.stepDesc, { color: theme.textMuted }]}>
                      {isDelivered
                        ? 'Partner courier completed cold-chain transit'
                        : isInTransit
                        ? 'Partner courier is en route with cold-chain storage'
                        : 'Waiting for courier pickup from pharmacy'}
                    </Text>
                  </View>
                </View>

                {/* Line */}
                <View
                  style={[
                    styles.stepLine,
                    { backgroundColor: isDelivered ? '#10B981' : theme.border },
                  ]}
                />

                {/* Step 3: Delivered */}
                <View style={styles.timelineStep}>
                  <View
                    style={[
                      styles.stepDot,
                      isDelivered ? styles.stepDotDone : { backgroundColor: theme.cardElevated },
                    ]}
                  >
                    {isDelivered ? (
                      <CheckCircle2 size={14} color="#FFFFFF" />
                    ) : (
                      <MapPin size={14} color={theme.textMuted} />
                    )}
                  </View>
                  <View style={styles.stepContent}>
                    <Text
                      style={[
                        styles.stepTitle,
                        { color: isDelivered ? '#10B981' : theme.textMuted },
                      ]}
                    >
                      Delivered & Handed Over
                    </Text>
                    <Text style={[styles.stepDesc, { color: theme.textMuted }]}>
                      {isDelivered
                        ? effectiveAddress || 'Delivery confirmed at patient address'
                        : 'Contactless delivery at patient address'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Pharmacy Info Card */}
              <View style={[styles.partnerCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Store size={20} color={isDelivered ? '#10B981' : theme.accent} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={[styles.partnerTitle, { color: theme.text }]}>
                    {resolvedPharmacyName}
                  </Text>
                  <Text style={[styles.partnerSub, { color: theme.textMuted }]}>Authorized Dispensary Partner</Text>
                </View>
                <View style={styles.verifiedBadge}>
                  <ShieldCheck size={14} color="#10B981" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              </View>
            </ScrollView>
          )}

          {/* Bottom Button */}
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: theme.primaryButton }]}
            onPress={onClose}
            activeOpacity={0.88}
          >
            <Text style={[styles.doneBtnText, { color: theme.primaryButtonText }]}>
              {isDelivered ? 'Done' : 'Close Tracking'}
            </Text>
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
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 42 : 24,
    maxHeight: '85%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13.5,
    color: '#64748B',
    marginTop: 10,
    fontWeight: '500',
  },
  etaCard: {
    backgroundColor: 'rgba(37, 99, 235, 0.06)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(37, 99, 235, 0.18)',
    padding: 16,
    marginBottom: 20,
  },
  etaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  etaLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#2563EB',
    marginLeft: 6,
  },
  etaTime: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  etaSub: {
    fontSize: 12.5,
    color: '#64748B',
  },
  timelineContainer: {
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: '#10B981',
  },
  stepDotActive: {
    backgroundColor: '#2563EB',
  },
  stepDotPending: {
    backgroundColor: '#E2E8F0',
  },
  stepContent: {
    marginLeft: 14,
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  stepDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  stepLine: {
    width: 2,
    height: 24,
    backgroundColor: '#10B981',
    marginLeft: 12,
    marginVertical: 4,
  },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 20,
  },
  partnerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  partnerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
    marginLeft: 4,
  },
  doneBtn: {
    backgroundColor: '#2563EB',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
