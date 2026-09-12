"use client";

import { useEffect, useState, useMemo } from "react";
import { pharmacyService, PharmacyInventoryItem } from "@/services/pharmacy.service";
import { Card, CardHeader, CardTitle, CardContent, Input, Badge, Button } from "@medsync/ui";
import { Search, Package, AlertTriangle, ArrowUpDown, Filter, Plus, Clock, Loader2, X, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function PharmacyInventoryPage() {
  const [inventory, setInventory] = useState<PharmacyInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | "LOW_STOCK" | "EXPIRING">("ALL");
  
  // Modals & State
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  
  const [catalog, setCatalog] = useState<any[]>([]);
  const [restockOrders, setRestockOrders] = useState<any[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("50");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInventory = () => {
    pharmacyService.getInventory().then(data => {
      setInventory(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const openRestockModal = async () => {
    setIsSubmitting(true);
    const meds = await pharmacyService.getMedicinesCatalog();
    setCatalog(meds);
    setIsSubmitting(false);
    setIsRestockModalOpen(true);
  };

  const openTrackingModal = async () => {
    setIsSubmitting(true);
    const orders = await pharmacyService.getRestockOrders();
    setRestockOrders(orders);
    setIsSubmitting(false);
    setIsTrackingModalOpen(true);
  };

  const handlePlaceOrder = async () => {
    if (!selectedMedicine || !orderQuantity) return;
    setIsSubmitting(true);
    const success = await pharmacyService.placeRestockOrder(selectedMedicine, parseInt(orderQuantity));
    if (success) {
      toast.success("Order placed! It will be delivered in 2 minutes.");
      setIsRestockModalOpen(false);
      setSelectedMedicine("");
      setOrderQuantity("50");
    } else {
      toast.error("Failed to place order.");
    }
    setIsSubmitting(false);
  };

  const handleDiscard = async (inventoryId: string) => {
    if (!confirm("Are you sure you want to discard this expired stock? This will set its quantity to zero.")) return;
    const success = await pharmacyService.discardExpired(inventoryId);
    if (success) {
      toast.success("Expired stock discarded successfully.");
      fetchInventory();
    } else {
      toast.error("Failed to discard stock. Ensure it is actually expired.");
    }
  };

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Inventory & Medicines</h1>
          <p className="text-muted-foreground">Manage pharmaceutical stock, monitor expiry dates, and track low-stock items.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={openTrackingModal} disabled={isSubmitting}>
            <Clock className="w-4 h-4 mr-2" /> Track Restocks
          </Button>
          <Button onClick={openRestockModal} disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Order Restock
          </Button>
        </div>
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
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Button 
            variant={filter === "ALL" ? "default" : "outline"} 
            className={`rounded-xl shrink-0 ${filter === "ALL" ? "bg-amber-500 hover:bg-amber-600 text-black border-transparent" : ""}`}
            onClick={() => setFilter("ALL")}
          >
            All Items
          </Button>
          <Button 
            variant={filter === "LOW_STOCK" ? "default" : "outline"} 
            className={`rounded-xl shrink-0 ${filter === "LOW_STOCK" ? "bg-red-500 hover:bg-red-600 text-white border-transparent" : ""}`}
            onClick={() => setFilter("LOW_STOCK")}
          >
            <AlertTriangle className="h-4 w-4 mr-2" /> Low Stock
          </Button>
          <Button 
            variant={filter === "EXPIRING" ? "default" : "outline"} 
            className={`rounded-xl shrink-0 ${filter === "EXPIRING" ? "bg-purple-500 hover:bg-purple-600 text-white border-transparent" : ""}`}
            onClick={() => setFilter("EXPIRING")}
          >
            Expiring Soon
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl border-border/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-bold tracking-wider border-b border-border/50">
              <tr>
                <th className="px-6 py-4">Medicine</th>
                <th className="px-6 py-4">Dosage / Brand</th>
                <th className="px-6 py-4 text-right">Stock Level</th>
                <th className="px-6 py-4 text-right">Unit Price</th>
                <th className="px-6 py-4">Expiry Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    No inventory items found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
                  const isLowStock = item.stock < 100;
                  const expiryDate = new Date(item.expiry_date);
                  const now = new Date();
                  now.setHours(0,0,0,0);
                  const isExpired = expiryDate < now;
                  const thirtyDaysFromNow = new Date();
                  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
                  const isExpiring = !isExpired && expiryDate <= thirtyDaysFromNow;
                  
                  return (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 font-semibold text-foreground">{item.medication_name}</td>
                      <td className="px-6 py-4 text-muted-foreground">{item.dosage}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-medium ${isLowStock || item.stock === 0 ? "text-red-500" : "text-foreground"}`}>
                          {item.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-muted-foreground">
                        ${item.unit_price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={isExpired ? "text-red-500 font-bold" : isExpiring ? "text-purple-500 font-medium" : "text-muted-foreground"}>
                          {item.expiry_date}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {isExpired && (
                            <Badge variant="outline" className="border-red-500/30 text-red-500 bg-red-500/10">Expired</Badge>
                          )}
                          {isLowStock && !isExpired && (
                            <Badge variant="outline" className="border-red-500/30 text-red-500 bg-red-500/10">Low Stock</Badge>
                          )}
                          {isExpiring && (
                            <Badge variant="outline" className="border-purple-500/30 text-purple-500 bg-purple-500/10">Expiring</Badge>
                          )}
                          {!isLowStock && !isExpiring && !isExpired && (
                            <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/10">Healthy</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isExpired && item.stock > 0 && (
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => handleDiscard(item.id)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Discard
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Restock Modal */}
      {isRestockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-2xl shadow-xl relative border border-border/50">
            <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={() => setIsRestockModalOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-bold mb-1">Order Restock</h2>
            <p className="text-sm text-muted-foreground mb-6">Orders are automatically delivered in 2 minutes.</p>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Select Medicine</label>
                <select 
                  className="w-full bg-background border border-input rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={selectedMedicine}
                  onChange={(e) => setSelectedMedicine(e.target.value)}
                >
                  <option value="">-- Choose Medicine --</option>
                  {catalog.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.dosage_form ? `(${c.dosage_form})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Quantity</label>
                <Input 
                  type="number" min="1" 
                  value={orderQuantity} 
                  onChange={(e) => setOrderQuantity(e.target.value)}
                  className="rounded-xl p-3"
                />
              </div>
              
              <Button className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting || !selectedMedicine || !orderQuantity} onClick={handlePlaceOrder}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Package className="w-4 h-4 mr-2" />} 
                Place Order
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Modal */}
      {isTrackingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl p-6 rounded-2xl shadow-xl relative border border-border/50 max-h-[80vh] flex flex-col">
            <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={() => setIsTrackingModalOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Clock className="w-5 h-5"/> Track Restock Orders</h2>
            
            <div className="overflow-y-auto pr-2 space-y-3">
              {restockOrders.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No restock orders found.</p>
              ) : (
                restockOrders.map(order => {
                  const expected = new Date(order.expected_delivery);
                  const now = new Date();
                  const isPending = order.status === "PENDING";
                  // Simple countdown calculation if pending
                  const secondsLeft = isPending ? Math.max(0, Math.floor((expected.getTime() - now.getTime()) / 1000)) : 0;
                  
                  return (
                    <div key={order.id} className="p-4 border border-border/50 rounded-xl bg-muted/10 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold">{order.medicine_name}</p>
                        <p className="text-sm text-muted-foreground">Qty: {order.quantity} • Ordered: {new Date(order.created_at).toLocaleTimeString()}</p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        {order.status === 'DELIVERED' ? (
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/10">Delivered</Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/10 animate-pulse">Pending Delivery</Badge>
                        )}
                        {isPending && secondsLeft > 0 && (
                          <span className="text-xs text-muted-foreground font-mono">~{secondsLeft}s remaining</span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
