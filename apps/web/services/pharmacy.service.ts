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
  order_type?: string;
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

  dispensePrescription: async (prescriptionId: string, authPin: string, prescriptionPin?: string): Promise<boolean> => {
    try {
      const formData = new FormData();
      formData.append("auth_pin", authPin);
      if (prescriptionPin) formData.append("pin", prescriptionPin);
      await api.post(`/api/v1/prescriptions/${prescriptionId}/dispense`, formData);
      return true;
    } catch {
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

  placeRestockOrder: async (medicineId: string, quantity: number, pin: string): Promise<boolean> => {
    try {
      await api.post(`/api/v1/inventory/restock`, { medicine_id: medicineId, quantity, pin });
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
