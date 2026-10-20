import api from '../lib/api';
import { supabase } from '../lib/supabase';

export interface PharmacyOrderItem {
  id: string;
  prescription_id?: string | null;
  patient_id?: string;
  patient_name: string;
  patient_phone?: string | null;
  patient_address?: string | null;
  medication: string;
  status: 'PENDING' | 'ACCEPTED' | 'PACKED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'DISPENSED' | 'CANCELLED' | string;
  order_type?: string | null;
  total_amount?: number | null;
  created_at: string;
  items?: Array<{
    id: string;
    inventory_id?: string;
    medication_name: string;
    quantity: number;
    unit_price?: number;
    batch_number?: string;
  }>;
}

export interface PharmacyInventoryItem {
  id: string;
  medicine_id: string;
  medicine_name: string;
  generic_name?: string | null;
  brand_name?: string | null;
  batch_number: string;
  stock_quantity: number;
  minimum_stock: number;
  maximum_stock?: number;
  unit_price: number;
  purchase_price?: number;
  selling_price?: number;
  expiry_date: string;
  manufacturing_date?: string | null;
  is_low_stock?: boolean;
  is_expired?: boolean;
}

export interface InventoryAlertItem {
  inventory_id: string;
  medicine_name: string;
  batch_number: string;
  stock_quantity: number;
  expiry_date: string;
}

export interface InventoryAlerts {
  low_stock: InventoryAlertItem[];
  expiring_soon: InventoryAlertItem[];
  expired: InventoryAlertItem[];
}

export interface PharmacyDashboardSummary {
  pendingOrdersCount: number;
  dispensedOrdersCount: number;
  deliveredOrdersCount: number;
  totalOrdersCount: number;
  inventoryCount: number;
  lowStockCount: number;
  expiringSoonCount: number;
  recentOrders: PharmacyOrderItem[];
  alerts: InventoryAlerts;
  myQrIdentifier?: string | null;
  myQrStatus?: string | null;
  businessName?: string | null;
}

export interface AddInventoryItemPayload {
  medicine_id?: string;
  medicine_name: string;
  generic_name?: string;
  dosage_form?: string;
  strength?: string;
  batch_number?: string;
  stock_quantity: number;
  minimum_stock?: number;
  unit_price: number;
  expiry_date: string;
  manufacturing_date?: string;
}

export interface PharmacyProfile {
  user_id: string;
  business_name: string;
  license_number?: string | null;
  gst_number?: string | null;
  address?: string | null;
  contact_number?: string | null;
  phone_number?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  operating_hours?: string | null;
  working_days?: string | null;
  is_24x7?: boolean;
  owner_details?: string | null;
  qr_identifier?: string | null;
  qr_status?: string | null;
  email?: string | null;
  blockchain_status?: string | null;
  blockchain_tx_hash?: string | null;
}

export interface RestockOrderPayload {
  medicine_id?: string;
  medicine_name?: string;
  quantity: number;
  pin: string;
}

export interface MedicineCatalogItem {
  id: string;
  name: string;
  generic_name?: string | null;
  brand_name?: string | null;
  strength?: string | null;
  dosage_form?: string | null;
}

export interface PinSecurityStatus {
  has_pin: boolean;
  status: 'NOT_STARTED' | 'PIN_CREATED' | 'COMPLETED';
}

export const pharmacyService = {
  // ── Dashboard Overview ──
  getDashboardSummary: async (): Promise<PharmacyDashboardSummary> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    let pendingCount = 0;
    let dispensedCount = 0;
    let deliveredCount = 0;
    let totalOrders = 0;
    let invCount = 0;
    let recentOrders: PharmacyOrderItem[] = [];
    let alerts: InventoryAlerts = { low_stock: [], expiring_soon: [], expired: [] };
    let myQrIdentifier: string | null = null;
    let myQrStatus: string | null = null;
    let businessName: string | null = null;

    // 1. Fetch Analytics from FastAPI
    try {
      const analyticsRes = await api.get('/pharmacy/analytics');
      const aData = analyticsRes.data?.data;
      if (aData) {
        pendingCount = aData.pending_orders ?? 0;
        dispensedCount = aData.dispensed_orders ?? 0;
        deliveredCount = aData.delivered_orders ?? 0;
        totalOrders = aData.total_orders ?? 0;
        invCount = aData.inventory_count ?? 0;
      }
    } catch {
      // Fallback count query from Supabase
      const [pRes, dRes, delRes, totRes, invRes] = await Promise.all([
        supabase.from('medicine_orders').select('*', { count: 'exact', head: true }).eq('pharmacy_id', user.id).eq('status', 'PENDING'),
        supabase.from('medicine_orders').select('*', { count: 'exact', head: true }).eq('pharmacy_id', user.id).eq('status', 'DISPENSED'),
        supabase.from('medicine_orders').select('*', { count: 'exact', head: true }).eq('pharmacy_id', user.id).eq('status', 'DELIVERED'),
        supabase.from('medicine_orders').select('*', { count: 'exact', head: true }).eq('pharmacy_id', user.id),
        supabase.from('medicine_inventory').select('*', { count: 'exact', head: true }).eq('pharmacy_id', user.id),
      ]);
      pendingCount = pRes.count ?? 0;
      dispensedCount = dRes.count ?? 0;
      deliveredCount = delRes.count ?? 0;
      totalOrders = totRes.count ?? 0;
      invCount = invRes.count ?? 0;
    }

    // 2. Fetch Inventory Alerts from FastAPI
    try {
      const alertsRes = await api.get('/inventory/alerts');
      if (alertsRes.data?.data) {
        alerts = alertsRes.data.data;
      }
    } catch {
      // Supabase fallback for alerts
      const today = new Date().toISOString().split('T')[0];
      const { data: invRows } = await supabase
        .from('medicine_inventory')
        .select('id, stock_quantity, minimum_stock, expiry_date, batch_number, medicines(name)')
        .eq('pharmacy_id', user.id);

      if (invRows) {
        invRows.forEach((row: any) => {
          const medName = row.medicines?.name || 'Medication';
          const item: InventoryAlertItem = {
            inventory_id: row.id,
            medicine_name: medName,
            batch_number: row.batch_number,
            stock_quantity: row.stock_quantity,
            expiry_date: row.expiry_date,
          };
          if (row.stock_quantity <= (row.minimum_stock || 10)) {
            alerts.low_stock.push(item);
          }
          if (row.expiry_date < today) {
            alerts.expired.push(item);
          }
        });
      }
    }

    // 3. Fetch Pharmacy QR identifier
    try {
      const qrRes = await api.get('/pharmacy/my-qr');
      if (qrRes.data?.data) {
        myQrIdentifier = qrRes.data.data.qr_identifier;
        myQrStatus = qrRes.data.data.qr_status;
        businessName = qrRes.data.data.business_name;
      }
    } catch {
      const { data: phData } = await supabase
        .from('pharmacies')
        .select('qr_identifier, qr_status, business_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (phData) {
        myQrIdentifier = phData.qr_identifier;
        myQrStatus = phData.qr_status;
        businessName = phData.business_name;
      }
    }

    // 4. Fetch Recent Orders
    try {
      recentOrders = await pharmacyService.getOrders();
    } catch {
      recentOrders = [];
    }

    return {
      pendingOrdersCount: pendingCount,
      dispensedOrdersCount: dispensedCount,
      deliveredOrdersCount: deliveredCount,
      totalOrdersCount: totalOrders,
      inventoryCount: invCount,
      lowStockCount: alerts.low_stock.length,
      expiringSoonCount: alerts.expiring_soon.length,
      recentOrders: recentOrders.slice(0, 5),
      alerts,
      myQrIdentifier,
      myQrStatus,
      businessName,
    };
  },

  // ── Orders & Fulfillment Queue ──
  getOrders: async (statusFilter?: string, searchQuery?: string): Promise<PharmacyOrderItem[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    let ordersList: PharmacyOrderItem[] = [];

    // 1. Try FastAPI endpoint first
    try {
      const res = await api.get('/pharmacy/orders');
      const rawData = res.data?.data;
      if (Array.isArray(rawData)) {
        ordersList = rawData.map((o: any) => ({
          id: o.id,
          prescription_id: o.prescription_id,
          patient_id: o.patient_id,
          patient_name: o.patient_name || 'Patient',
          patient_address: o.patient_address,
          medication: o.medication || 'Prescription Fulfillment',
          status: o.status,
          order_type: o.order_type,
          created_at: o.created_at,
        }));
      }
    } catch {
      // Fallback directly to Supabase
    }

    if (ordersList.length === 0) {
      let query = supabase
        .from('medicine_orders')
        .select('*')
        .eq('pharmacy_id', user.id)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter);
      }

      const { data: rawOrders, error } = await query;
      if (error) throw error;

      if (rawOrders && rawOrders.length > 0) {
        const patientIds = Array.from(new Set(rawOrders.map((o: any) => o.patient_id).filter(Boolean)));
        let patMap = new Map<string, any>();
        if (patientIds.length > 0) {
          const { data: patients } = await supabase
            .from('patients')
            .select('user_id, full_name, phone_number, contact_number')
            .in('user_id', patientIds);
          patMap = new Map((patients || []).map((p: any) => [p.user_id, p]));
        }

        ordersList = rawOrders.map((o: any) => {
          const pat = patMap.get(o.patient_id);
          return {
            id: o.id,
            prescription_id: o.prescription_id,
            patient_id: o.patient_id,
            patient_name: pat?.full_name || 'Patient',
            patient_phone: pat?.phone_number || pat?.contact_number,
            patient_address: o.delivery_address,
            medication: o.order_type === 'ROUTED_BY_DOCTOR' ? 'Doctor Routed Prescription' : 'Medication Order',
            status: o.status,
            order_type: o.order_type,
            total_amount: o.total_amount,
            created_at: o.created_at,
          };
        });
      }
    }

    // Filter by status if specified
    if (statusFilter && statusFilter !== 'ALL') {
      ordersList = ordersList.filter((o) => o.status === statusFilter);
    }

    // Filter by search query if provided
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      ordersList = ordersList.filter(
        (o) =>
          o.patient_name.toLowerCase().includes(q) ||
          o.medication.toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q)
      );
    }

    return ordersList;
  },

  // ── Dispatch & Deliveries ──
  dispatchOrder: async (orderId: string): Promise<any> => {
    const res = await api.post(`/orders/${orderId}/dispatch`);
    return res.data?.data;
  },

  completeDelivery: async (orderId: string): Promise<any> => {
    const res = await api.post(`/orders/${orderId}/complete-delivery`);
    return res.data?.data;
  },

  // ── Prescription Dispensing ──
  dispensePrescription: async (
    prescriptionId: string,
    authPin: string,
    prescriptionPin?: string
  ): Promise<any> => {
    if (!authPin || authPin.length !== 6) {
      throw new Error('Valid 6-digit Pharmacy Authorization PIN is required.');
    }

    const formData = new FormData();
    formData.append('auth_pin', authPin);
    if (prescriptionPin && prescriptionPin.trim()) {
      formData.append('pin', prescriptionPin.trim().toUpperCase());
    }

    const res = await api.post(`/prescriptions/${prescriptionId}/dispense`, formData);
    return res.data;
  },

  // ── QR and Blockchain Verification ──
  verifyPrescriptionQR: async (token: string): Promise<any> => {
    const cleanToken = token.trim();
    if (!cleanToken) throw new Error('Token cannot be empty');

    const res = await api.get(`/verify/qr/${cleanToken}`);
    return res.data;
  },

  verifyBlockchainPrescription: async (prescriptionHash: string): Promise<any> => {
    const clean = prescriptionHash.trim();
    const res = await api.get(`/blockchain/verify/${encodeURIComponent(clean)}`);
    return res.data?.data;
  },

  // ── Medication Inventory ──
  getInventory: async (search?: string, skip = 0, limit = 50): Promise<PharmacyInventoryItem[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    try {
      const params: any = { skip, limit };
      if (search && search.trim()) params.search = search.trim();
      const res = await api.get('/inventory/', { params });
      const rows = res.data?.data;

      if (Array.isArray(rows)) {
        const today = new Date().toISOString().split('T')[0];
        return rows.map((item: any) => ({
          id: item.id,
          medicine_id: item.medicine_id,
          medicine_name: item.medicine?.name || 'Medication',
          generic_name: item.medicine?.generic_name,
          brand_name: item.medicine?.brand_name,
          batch_number: item.batch_number,
          stock_quantity: item.stock_quantity,
          minimum_stock: item.minimum_stock || 10,
          maximum_stock: item.maximum_stock || 1000,
          unit_price: item.unit_price,
          purchase_price: item.purchase_price,
          selling_price: item.selling_price,
          expiry_date: item.expiry_date,
          manufacturing_date: item.manufacturing_date,
          is_low_stock: item.stock_quantity <= (item.minimum_stock || 10),
          is_expired: item.expiry_date < today,
        }));
      }
    } catch {
      // Fallback directly to Supabase
    }

    let query = supabase
      .from('medicine_inventory')
      .select('*, medicines(*)')
      .eq('pharmacy_id', user.id);

    const { data: invRows, error } = await query;
    if (error) throw error;
    if (!invRows) return [];

    const today = new Date().toISOString().split('T')[0];
    let result: PharmacyInventoryItem[] = invRows.map((item: any) => ({
      id: item.id,
      medicine_id: item.medicine_id,
      medicine_name: item.medicines?.name || 'Medication',
      generic_name: item.medicines?.generic_name,
      brand_name: item.medicines?.brand_name,
      batch_number: item.batch_number,
      stock_quantity: item.stock_quantity,
      minimum_stock: item.minimum_stock || 10,
      unit_price: item.unit_price,
      expiry_date: item.expiry_date,
      manufacturing_date: item.manufacturing_date,
      is_low_stock: item.stock_quantity <= (item.minimum_stock || 10),
      is_expired: item.expiry_date < today,
    }));

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (it) =>
          it.medicine_name.toLowerCase().includes(q) ||
          (it.generic_name && it.generic_name.toLowerCase().includes(q)) ||
          it.batch_number.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => a.medicine_name.localeCompare(b.medicine_name));
  },

  getInventoryAlerts: async (): Promise<InventoryAlerts> => {
    try {
      const res = await api.get('/inventory/alerts');
      return res.data?.data || { low_stock: [], expiring_soon: [], expired: [] };
    } catch {
      return { low_stock: [], expiring_soon: [], expired: [] };
    }
  },

  addInventoryItem: async (payload: AddInventoryItemPayload): Promise<any> => {
    if (!payload.medicine_name.trim()) throw new Error('Medicine name is required.');
    if (payload.stock_quantity < 0) throw new Error('Stock quantity cannot be negative.');
    if (payload.unit_price < 0) throw new Error('Unit price cannot be negative.');
    if (!payload.expiry_date) throw new Error('Expiry date is required.');

    const res = await api.post('/inventory/items', payload);
    return res.data?.data;
  },

  discardExpiredStock: async (inventoryId: string): Promise<any> => {
    const res = await api.post(`/inventory/${inventoryId}/discard`);
    return res.data;
  },

  placeRestockOrder: async (payload: RestockOrderPayload): Promise<any> => {
    if (!payload.pin || payload.pin.length !== 6) {
      throw new Error('Valid 6-digit Pharmacy Authorization PIN is required.');
    }
    if (payload.quantity <= 0) {
      throw new Error('Quantity must be greater than 0.');
    }

    const res = await api.post('/inventory/restock', payload);
    return res.data?.data;
  },

  getMedicinesCatalog: async (search?: string): Promise<MedicineCatalogItem[]> => {
    try {
      const params: any = { limit: 50 };
      if (search && search.trim()) params.search = search.trim();
      const res = await api.get('/medicines/', { params });
      return res.data?.data || [];
    } catch {
      return [];
    }
  },

  // ── Pharmacy Profile & Settings ──
  getProfile: async (): Promise<PharmacyProfile> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    const { data: phData, error } = await supabase
      .from('pharmacies')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    return {
      user_id: user.id,
      business_name: phData?.business_name || user.user_metadata?.full_name || 'Pharmacy',
      license_number: phData?.license_number,
      gst_number: phData?.gst_number,
      address: phData?.address,
      contact_number: phData?.contact_number,
      phone_number: phData?.contact_number,
      city: phData?.city,
      state: phData?.state,
      country: phData?.country || 'India',
      pincode: phData?.pincode,
      operating_hours: phData?.operating_hours || '08:00 AM - 10:00 PM',
      working_days: phData?.working_days || 'Mon - Sat',
      is_24x7: phData?.is_24x7 ?? false,
      owner_details: phData?.owner_details,
      qr_identifier: phData?.qr_identifier,
      qr_status: phData?.qr_status || 'ACTIVE',
      email: user.email,
      blockchain_status: phData?.blockchain_status,
      blockchain_tx_hash: phData?.blockchain_tx_hash,
    };
  },

  updateProfile: async (data: Partial<PharmacyProfile>): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    const payload: any = {
      license_number: data.license_number,
      gst_number: data.gst_number,
      address: data.address,
      city: data.city,
      state: data.state,
      country: data.country || 'India',
      pincode: data.pincode,
      operating_hours: data.operating_hours,
      working_days: data.working_days,
      is_24x7: data.is_24x7,
      owner_details: data.owner_details,
      contact_number: data.contact_number || data.phone_number,
      profile_completion_percentage: 100,
    };

    // 1. Try FastAPI profile completion endpoint
    try {
      await api.put(`/profile/${user.id}/completion`, payload);
    } catch {
      // Direct Supabase update
    }

    // 2. Direct Supabase update for immediate consistency
    const { error } = await supabase
      .from('pharmacies')
      .update({
        business_name: data.business_name,
        license_number: data.license_number,
        gst_number: data.gst_number,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country || 'India',
        pincode: data.pincode,
        operating_hours: data.operating_hours,
        working_days: data.working_days,
        is_24x7: data.is_24x7,
        owner_details: data.owner_details,
        contact_number: data.contact_number || data.phone_number,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (error) throw error;
  },

  // ── PIN Security Management ──
  getSecurityStatus: async (): Promise<PinSecurityStatus> => {
    try {
      const res = await api.get('/security/status');
      return {
        has_pin: Boolean(res.data?.data?.has_pin),
        status: res.data?.data?.status || (res.data?.data?.has_pin ? 'PIN_CREATED' : 'NOT_STARTED'),
      };
    } catch {
      return { has_pin: false, status: 'NOT_STARTED' };
    }
  },

  enrollPin: async (pin: string, confirmPin: string, password: string): Promise<void> => {
    if (pin.length !== 6 || confirmPin.length !== 6) {
      throw new Error('PIN must be exactly 6 digits.');
    }
    if (pin !== confirmPin) {
      throw new Error('PIN and Confirm PIN do not match.');
    }
    if (!password) {
      throw new Error('Current account password is required.');
    }

    const formData = new FormData();
    formData.append('pin', pin);
    formData.append('password', password);

    await api.post('/security/enroll-pin', formData);
  },

  resetPin: async (newPin: string, confirmPin: string, password: string): Promise<void> => {
    if (newPin.length !== 6 || confirmPin.length !== 6) {
      throw new Error('PIN must be exactly 6 digits.');
    }
    if (newPin !== confirmPin) {
      throw new Error('PIN and Confirm PIN do not match.');
    }
    if (!password) {
      throw new Error('Current account password is required.');
    }

    const formData = new FormData();
    formData.append('new_pin', newPin);
    formData.append('current_password', password);

    await api.post('/security/reset-pin-with-password', formData);
  },
};
