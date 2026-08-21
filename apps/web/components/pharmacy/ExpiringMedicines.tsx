"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from "@medsync/ui";
import { AlertTriangle, Clock } from "lucide-react";

export function ExpiringMedicines() {
  const expiringItems = [
    { name: "Amoxicillin 500mg", batch: "B-88392", expiry: "2026-11-15", daysLeft: 40, stock: 450 },
    { name: "Lisinopril 10mg", batch: "L-22190", expiry: "2026-12-01", daysLeft: 56, stock: 120 },
    { name: "Metformin 1000mg", batch: "M-44910", expiry: "2026-12-15", daysLeft: 70, stock: 890 },
  ];

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
          {expiringItems.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background hover:bg-muted/30 transition-colors">
              <div>
                <p className="font-semibold">{item.name}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs py-0 h-5">Batch: {item.batch}</Badge>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {item.expiry}</span>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold ${item.daysLeft < 45 ? 'text-red-500' : 'text-amber-500'}`}>
                  {item.daysLeft} days
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.stock} in stock</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
