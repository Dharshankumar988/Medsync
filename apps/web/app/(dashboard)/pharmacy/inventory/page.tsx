"use client";

import { useEffect, useState, useMemo } from "react";
import { pharmacyService, PharmacyInventoryItem } from "@/services/pharmacy.service";
import { Card, CardHeader, CardTitle, CardContent, Input, Badge, Button } from "@medsync/ui";
import { Search, Package, AlertTriangle, ArrowUpDown, Filter } from "lucide-react";

export default function PharmacyInventoryPage() {
  const [inventory, setInventory] = useState<PharmacyInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | "LOW_STOCK" | "EXPIRING">("ALL");

  useEffect(() => {
    pharmacyService.getInventory().then(data => {
      setInventory(data);
      setLoading(false);
    });
  }, []);

  const filteredInventory = useMemo(() => {
    let filtered = inventory;
    
    if (filter === "LOW_STOCK") {
      filtered = filtered.filter(i => i.stock < 100);
    } else if (filter === "EXPIRING") {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      filtered = filtered.filter(i => new Date(i.expiry_date) <= thirtyDaysFromNow);
    }

    if (searchQuery) {
      filtered = filtered.filter(i => 
        i.medication_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        i.dosage.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [inventory, filter, searchQuery]);

  if (loading) {
    return <div className="p-8 flex items-center justify-center h-[50vh]"><div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Inventory & Medicines</h1>
        <p className="text-muted-foreground">Manage pharmaceutical stock, monitor expiry dates, and track low-stock items.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by medicine name, generic, or brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button 
            variant={filter === "ALL" ? "default" : "outline"} 
            className={`rounded-xl ${filter === "ALL" ? "bg-amber-500 hover:bg-amber-600 text-black" : ""}`}
            onClick={() => setFilter("ALL")}
          >
            All Items
          </Button>
          <Button 
            variant={filter === "LOW_STOCK" ? "default" : "outline"} 
            className={`rounded-xl ${filter === "LOW_STOCK" ? "bg-red-500 hover:bg-red-600 text-white" : ""}`}
            onClick={() => setFilter("LOW_STOCK")}
          >
            <AlertTriangle className="h-4 w-4 mr-2" /> Low Stock
          </Button>
          <Button 
            variant={filter === "EXPIRING" ? "default" : "outline"} 
            className={`rounded-xl ${filter === "EXPIRING" ? "bg-purple-500 hover:bg-purple-600 text-white" : ""}`}
            onClick={() => setFilter("EXPIRING")}
          >
            Expiring Soon
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-bold tracking-wider border-b border-border/50">
              <tr>
                <th className="px-6 py-4">Medicine <ArrowUpDown className="h-3 w-3 inline ml-1 opacity-50"/></th>
                <th className="px-6 py-4">Dosage / Brand</th>
                <th className="px-6 py-4 text-right">Stock Level <ArrowUpDown className="h-3 w-3 inline ml-1 opacity-50"/></th>
                <th className="px-6 py-4 text-right">Unit Price</th>
                <th className="px-6 py-4">Expiry Date</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No inventory items found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
                  const isLowStock = item.stock < 100;
                  const expiryDate = new Date(item.expiry_date);
                  const thirtyDaysFromNow = new Date();
                  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
                  const isExpiring = expiryDate <= thirtyDaysFromNow;
                  
                  return (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 font-semibold text-foreground">{item.medication_name}</td>
                      <td className="px-6 py-4 text-muted-foreground">{item.dosage}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-medium ${isLowStock ? "text-red-500" : "text-foreground"}`}>
                          {item.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-muted-foreground">
                        ${item.unit_price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={isExpiring ? "text-purple-500 font-medium" : "text-muted-foreground"}>
                          {item.expiry_date}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {isLowStock && (
                            <Badge variant="outline" className="border-red-500/30 text-red-500 bg-red-500/10">Low Stock</Badge>
                          )}
                          {isExpiring && (
                            <Badge variant="outline" className="border-purple-500/30 text-purple-500 bg-purple-500/10">Expiring</Badge>
                          )}
                          {!isLowStock && !isExpiring && (
                            <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/10">Healthy</Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
