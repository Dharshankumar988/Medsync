"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from "@medsync/ui";
import { AlertTriangle, Clock } from "lucide-react";
import { PharmacyInventoryItem } from "@/services/pharmacy.service";

export function ExpiringMedicines({ inventory = [] }: { inventory?: PharmacyInventoryItem[] }) {
  const today = new Date();
  
  // Calculate days left and sort
  const expiringItems = inventory
    .map(item => {
      const expiry = new Date(item.expiry_date);
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        ...item,
        daysLeft: diffDays
      };
    })
    .filter(item => item.daysLeft <= 90 && item.daysLeft > 0) // only expiring in 90 days
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5); // show top 5

  return (
    <Card className="col-span-full lg:col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" /> 
          Expiring Soon
        </CardTitle>
        <CardDescription>Items expiring in the next 90 days</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {expiringItems.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              No items are expiring within 90 days.
            </div>
          ) : (
            expiringItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background hover:bg-muted/30 transition-colors">
                <div>
                  <p className="font-semibold">{item.medication_name}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(item.expiry_date).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${item.daysLeft < 45 ? 'text-red-500' : 'text-amber-500'}`}>
                    {item.daysLeft} days
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.stock} in stock</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
