"use client";

import { useState, useEffect } from "react";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Badge, Button
} from "@medsync/ui";
import { AlertTriangle, TrendingDown } from "lucide-react";
import api from "@/lib/api";

export default function StockAlertsPage() {
  const [alerts, setAlerts] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await api.get("/api/v1/inventory/alerts");
      setAlerts(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-destructive">Stock Alerts</h2>
        <p className="text-muted-foreground mt-1">
          Medicines that are low on stock or completely out of stock.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-destructive/20 shadow-sm backdrop-blur-xl bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Critical Low Stock
            </CardTitle>
            <CardDescription>Items below their minimum threshold</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : alerts?.low_stock?.length === 0 ? (
              <p className="text-muted-foreground">All stock levels are healthy.</p>
            ) : (
              <div className="space-y-4">
                {alerts?.low_stock?.map((item: any) => (
                  <div key={item.inventory_id} className="flex items-center justify-between p-4 rounded-lg bg-background border shadow-sm">
                    <div>
                      <p className="font-semibold">{item.medicine_name}</p>
                      <p className="text-xs text-muted-foreground">Batch: {item.batch_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-destructive flex items-center gap-1 justify-end">
                        <TrendingDown className="h-4 w-4" /> {item.stock_quantity} left
                      </p>
                      <Button variant="link" size="sm" className="h-auto p-0 mt-1">Order Refill</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
