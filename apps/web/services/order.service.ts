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
  getOrderById: async (orderId: string) => {
    try {
      const res = await api.get(`/api/v1/orders/${orderId}`);
      return res.data.data;
    } catch (err) {
      console.error("Failed to fetch order:", err);
      return null;
    }
  },
  payOrder: async (orderId: string, paymentMethod: "ONLINE" | "CASH_ON_DELIVERY" = "ONLINE") => {
    try {
      const res = await api.post(`/api/v1/orders/${orderId}/pay`, { payment_method: paymentMethod });
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
