import api from "@/lib/api";

export interface PharmacyInventoryItem {
  id: string;
  medication_name: string;
  dosage: string;
  stock: number;
  unit_price: number;
  expiry_date: string;
  category?: string;
}

export interface PharmacyOrder {
  id: string;
  prescription_id: string;
  patient_name: string;
  patient_contact?: string;
  patient_address?: string;
  medication: string;
  status: "PENDING" | "DISPENSED" | "REJECTED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "RECEIVED_BY_PATIENT" | string;
  order_type?: string;
  total_amount?: number;
  created_at: string;
}

export const pharmacyService = {
  getInventory: async (): Promise<PharmacyInventoryItem[]> => {
    try {
      const res = await api.get('/api/v1/inventory/');
      return res.data.data.map((item: any) => ({
        id: item.id,
        medication_name: item.medicine.name,
        dosage: item.medicine.brand_name || item.medicine.generic_name || "N/A",
        stock: item.stock_quantity,
        unit_price: item.unit_price,
        expiry_date: item.expiry_date,
        category: item.medicine?.category || "Others"
      })) || [];
    } catch {
      return [];
    }
  },

  getOrders: async (): Promise<PharmacyOrder[]> => {
    try {
      const res = await api.get('/api/v1/pharmacy/orders');
      return res.data.data || [];
    } catch {
      return [];
    }
  },

  dispensePrescription: async (
    prescriptionId: string, 
    authPin: string, 
    prescriptionPin?: string,
    fulfillmentType: "DISPENSED_AND_DELIVERED" | "RECEIVED_BY_PATIENT" = "DISPENSED_AND_DELIVERED"
  ): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
      const formData = new FormData();
      formData.append("auth_pin", authPin);
      formData.append("fulfillment_type", fulfillmentType);
      if (prescriptionPin) formData.append("pin", prescriptionPin);
      const res = await api.post(`/api/v1/prescriptions/${prescriptionId}/dispense`, formData);
      return { success: true, data: res.data?.data };
    } catch (err: any) {
      return { 
        success: false, 
        error: err.response?.data?.detail || err.message || "Failed to dispense prescription" 
      };
    }
  },

  downloadWeeklySalesReport: async (): Promise<boolean> => {
    try {
      const res = await api.get('/api/v1/pharmacy/reports/sales-pdf', {
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `medsync_weekly_sales_report_${new Date().toISOString().slice(0, 10)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return true;
    } catch (err) {
      console.error("Failed to download sales report PDF:", err);
      return false;
    }
  },

  verifyBlockchainPrescription: async (prescriptionHash: string): Promise<{ valid: boolean; txHash?: string; blockNumber?: number; explorerUrl?: string }> => {
    try {
      const res = await api.get(`/api/v1/blockchain/verify-hash/${encodeURIComponent(prescriptionHash)}`);
      const data = res.data?.data;
      return {
        valid: data?.verified ?? false,
        txHash: data?.transaction_hash || data?.identifier,
        blockNumber: data?.block_number,
        explorerUrl: data?.explorer_url
      };
    } catch {
      return { valid: false };
    }
  },

  verifyQR: async (token: string): Promise<any> => {
    try {
      const res = await api.get(`/api/v1/verify/qr/${token}`);
      return res.data;
    } catch (e: any) {
      return { success: false, message: e.response?.data?.detail || "Verification failed", data: null };
    }
  },
  
  getAnalytics: async (): Promise<any> => {
    try {
      const res = await api.get('/api/v1/pharmacy/analytics');
      return res.data.data;
    } catch {
      return null;
    }
  },

  getProfile: async (): Promise<any> => {
    try {
      const res = await api.get('/api/v1/pharmacy/profile');
      return res.data.data;
    } catch {
      return null;
    }
  },

  discardExpired: async (inventoryId: string): Promise<boolean> => {
    try {
      await api.post(`/api/v1/inventory/${inventoryId}/discard`);
      return true;
    } catch {
      return false;
    }
  },

  getMedicinesCatalog: async (search?: string): Promise<any[]> => {
    try {
      const url = search ? `/api/v1/medicines/?search=${encodeURIComponent(search)}` : `/api/v1/medicines/`;
      const res = await api.get(url);
      return res.data.data || [];
    } catch {
      return [];
    }
  },

  placeRestockOrder: async (
    target: string | { medicine_id?: string; medicine_name?: string; quantity: number; pin: string },
    qty?: number,
    pinCode?: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      let body: any;
      if (typeof target === 'object') {
        body = target;
      } else {
        body = { medicine_id: target, quantity: qty, pin: pinCode };
      }
      const res = await api.post(`/api/v1/inventory/restock`, body);
      return { success: true, message: res.data?.message || "Restock order placed successfully" };
    } catch (e: any) {
      return { success: false, message: e.response?.data?.detail || e.message || "Failed to place restock order" };
    }
  },

  getRestockOrders: async (): Promise<any[]> => {
    try {
      const res = await api.get(`/api/v1/inventory/restock?_t=${Date.now()}`);
      return res.data.data || [];
    } catch {
      return [];
    }
  },

  deliverRestockOrder: async (orderId: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await api.post(`/api/v1/inventory/restock/${orderId}/deliver`);
      return { success: true, message: res.data?.message || "Order fulfilled successfully" };
    } catch (e: any) {
      return { success: false, message: e.response?.data?.detail || e.message || "Failed to deliver restock order" };
    }
  },

  getSecurityStatus: async (): Promise<{ hasPin: boolean }> => {
    try {
      const res = await api.get(`/api/v1/security/status?_t=${Date.now()}`);
      const hasPin = res.data?.data?.has_pin ?? (res.data?.status === 'COMPLETED');
      return { hasPin: Boolean(hasPin) };
    } catch {
      return { hasPin: false };
    }
  },

  addInventoryItem: async (payload: {
    medicine_id?: string;
    medicine_name?: string;
    generic_name?: string;
    brand_name?: string;
    category?: string;
    batch_number?: string;
    stock_quantity: number;
    unit_price: number;
    expiry_date: string;
  }): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await api.post('/api/v1/inventory/items', payload);
      return { success: true, message: res.data?.message || "Medicine added to inventory successfully" };
    } catch (e: any) {
      return { success: false, message: e.response?.data?.detail || e.message || "Failed to add medicine" };
    }
  }
};
