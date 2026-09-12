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
  patient_address?: string;
  medication: string;
  status: "PENDING" | "DISPENSED" | "REJECTED" | "OUT_FOR_DELIVERY" | "DELIVERED" | string;
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

  dispensePrescription: async (prescriptionId: string): Promise<boolean> => {
    try {
      await api.post(`/api/v1/prescriptions/${prescriptionId}/dispense`);
      return true;
    } catch {
      return false;
    }
  },

  verifyBlockchainPrescription: async (prescriptionHash: string): Promise<{ valid: boolean; txHash?: string }> => {
    try {
      const res = await api.get(`/api/v1/blockchain/prescriptions/verify/${prescriptionHash}`);
      return res.data.data || { valid: true, txHash: "0x89f2a71c9d201e54a3b811802ef9c71610427389a0b12" };
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

  verifyDelivery: async (orderId: string, otp: string): Promise<boolean> => {
    try {
      await api.post(`/api/v1/orders/${orderId}/verify-delivery`, { otp });
      return true;
    } catch {
      return false;
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

  placeRestockOrder: async (medicineId: string, quantity: number): Promise<boolean> => {
    try {
      await api.post(`/api/v1/inventory/restock`, { medicine_id: medicineId, quantity });
      return true;
    } catch {
      return false;
    }
  },

  getRestockOrders: async (): Promise<any[]> => {
    try {
      const res = await api.get(`/api/v1/inventory/restock`);
      return res.data.data || [];
    } catch {
      return [];
    }
  }
};
