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
  }
};
