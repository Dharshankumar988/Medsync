"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { Package, TrendingUp } from "lucide-react";

export function InventoryOverviewWidget() {
  return (
    <Card className="col-span-full lg:col-span-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-500" />
          Inventory Value & Distribution
        </CardTitle>
        <CardDescription>Current stock breakdown by category</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-6">
           <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
             <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Total Value</p>
             <p className="text-2xl font-bold">$142,500</p>
             <p className="text-xs text-blue-600/80 mt-1 flex items-center">
               <TrendingUp className="h-3 w-3 mr-1" /> +$4,200 this month
             </p>
           </div>
           <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
             <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">Items In Stock</p>
             <p className="text-2xl font-bold">14,250</p>
             <p className="text-xs text-emerald-600/80 mt-1 flex items-center">
               <TrendingUp className="h-3 w-3 mr-1" /> +350 units received
             </p>
           </div>
        </div>
        
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground mb-2">Top Categories</p>
          {[
            { name: "Antibiotics", value: 35, color: "bg-blue-500" },
            { name: "Painkillers", value: 25, color: "bg-emerald-500" },
            { name: "Cardiovascular", value: 20, color: "bg-rose-500" },
            { name: "Vitamins", value: 15, color: "bg-amber-500" },
            { name: "Others", value: 5, color: "bg-slate-500" },
          ].map((cat, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs mb-1">
                <span>{cat.name}</span>
                <span className="font-medium">{cat.value}%</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${cat.color}`} style={{ width: `${cat.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
