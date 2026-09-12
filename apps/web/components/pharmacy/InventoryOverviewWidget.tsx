"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { Package, TrendingUp } from "lucide-react";
import { PharmacyInventoryItem } from "@/services/pharmacy.service";

export function InventoryOverviewWidget({ inventory = [] }: { inventory?: PharmacyInventoryItem[] }) {
  const totalValue = inventory.reduce((sum, item) => sum + (item.stock * item.unit_price), 0);
  const totalItems = inventory.reduce((sum, item) => sum + item.stock, 0);

  // Group by category for distribution
  const categoryCount: Record<string, number> = {};
  inventory.forEach(item => {
    const cat = item.category || "Others";
    categoryCount[cat] = (categoryCount[cat] || 0) + item.stock;
  });

  const categories = Object.entries(categoryCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, value], i) => {
      const colors = ["bg-blue-500", "bg-emerald-500", "bg-rose-500", "bg-amber-500", "bg-slate-500"];
      return {
        name,
        value: totalItems > 0 ? Math.round((value / totalItems) * 100) : 0,
        color: colors[i % colors.length]
      };
    });

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
             <p className="text-2xl font-bold">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
           </div>
           <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
             <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">Items In Stock</p>
             <p className="text-2xl font-bold">{totalItems.toLocaleString()}</p>
           </div>
        </div>
        
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground mb-2">Top Categories</p>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No inventory data available.</p>
          ) : (
            categories.map((cat, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span>{cat.name}</span>
                  <span className="font-medium">{cat.value}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${cat.color}`} style={{ width: `${cat.value}%` }} />
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
