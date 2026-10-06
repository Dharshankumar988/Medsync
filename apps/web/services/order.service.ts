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
  payOrder: async (orderId: string) => {
    try {
      const res = await api.post(`/api/v1/orders/${orderId}/pay`);
      return res.data;
    } catch (err) {
      console.error("Failed to pay for order:", err);
      throw err;
    }
  },
  verifyDelivery: async (orderId: string, deliveryCode: string) => {
    try {
      const res = await api.post(`/api/v1/orders/${orderId}/verify-delivery`, { deliveryCode });
      return res.data;
    } catch (err) {
      console.error("Failed to verify delivery:", err);
      throw err;
    }
  }
};
