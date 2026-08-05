"use client";

import { useState, useEffect } from "react";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Badge, Button
} from "@medsync/ui";
import { Clock, CalendarX2 } from "lucide-react";
import api from "@/lib/api";

export default function ExpiredItemsPage() {
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
        <h2 className="text-3xl font-bold tracking-tight text-orange-500">Expiry Alerts</h2>
        <p className="text-muted-foreground mt-1">
          Manage items that are expiring soon or have already expired.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-orange-500/20 shadow-sm backdrop-blur-xl bg-orange-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-500">
              <Clock className="h-5 w-5" />
              Expiring Soon (Next 30 Days)
            </CardTitle>
            <CardDescription>Items that need to be prioritized for sale</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : alerts?.expiring_soon?.length === 0 ? (
              <p className="text-muted-foreground">No items expiring soon.</p>
            ) : (
              <div className="space-y-4">
                {alerts?.expiring_soon?.map((item: any) => (
                  <div key={item.inventory_id} className="flex items-center justify-between p-4 rounded-lg bg-background border shadow-sm">
                    <div>
                      <p className="font-semibold">{item.medicine_name}</p>
                      <p className="text-xs text-muted-foreground">Batch: {item.batch_number}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-orange-500 border-orange-500/50 bg-orange-500/10">
                        {item.expiry_date}
                      </Badge>
                      <p className="text-xs mt-1 text-muted-foreground">Stock: {item.stock_quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-destructive/20 shadow-sm backdrop-blur-xl bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <CalendarX2 className="h-5 w-5" />
              Expired Items
            </CardTitle>
            <CardDescription>Items that must be discarded</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : alerts?.expired?.length === 0 ? (
              <p className="text-muted-foreground">No expired items found.</p>
            ) : (
              <div className="space-y-4">
                {alerts?.expired?.map((item: any) => (
                  <div key={item.inventory_id} className="flex items-center justify-between p-4 rounded-lg bg-background border shadow-sm">
                    <div>
                      <p className="font-semibold">{item.medicine_name}</p>
                      <p className="text-xs text-muted-foreground">Batch: {item.batch_number}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive">
                        Expired {item.expiry_date}
                      </Badge>
                      <Button variant="outline" size="sm" className="mt-2 w-full text-xs h-7">Mark Discarded</Button>
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
