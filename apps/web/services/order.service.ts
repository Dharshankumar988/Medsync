import api from "@/lib/api";

export const orderService = {
  getOrders: async () => {
    try {
      const res = await api.get("/api/v1/orders/");
      return res.data.data;
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      return [];
    }
  },
  generateDeliveryCode: async (orderId: string) => {
    try {
      const res = await api.post(`/api/v1/orders/${orderId}/generate-delivery-code`);
      return res.data;
    } catch (err) {
      console.error("Failed to generate delivery code:", err);
      throw err;
    }
  },
  verifyDelivery: async (orderId: string, otp: string) => {
    try {
      const res = await api.post(`/api/v1/orders/${orderId}/verify-delivery`, { otp });
      return res.data;
    } catch (err) {
      console.error("Failed to verify delivery:", err);
      throw err;
    }
  }
};
