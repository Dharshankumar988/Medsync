"use client";

import { useEffect, useState, useMemo } from "react";
import { pharmacyService, PharmacyInventoryItem } from "@/services/pharmacy.service";
import { Card, CardHeader, CardTitle, CardContent, Input, Badge, Button } from "@medsync/ui";
import { Search, Package, AlertTriangle, ArrowUpDown, Filter, Plus, Clock, Loader2, X, Trash2, Eye, EyeOff, RefreshCw, Zap, ShieldCheck, CheckCircle2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export default function PharmacyInventoryPage() {
  const [inventory, setInventory] = useState<PharmacyInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | "LOW_STOCK" | "EXPIRING">("ALL");
  
  // Modals & State
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [isAddMedicineModalOpen, setIsAddMedicineModalOpen] = useState(false);

  // Add Medicine Form State
  const [newMedName, setNewMedName] = useState("");
  const [newMedGeneric, setNewMedGeneric] = useState("");
  const [newMedBrand, setNewMedBrand] = useState("");
  const [newMedCategory, setNewMedCategory] = useState("General");
  const [newMedBatch, setNewMedBatch] = useState("");
  const [newMedStock, setNewMedStock] = useState("100");
  const [newMedPrice, setNewMedPrice] = useState("10.00");
  const [newMedExpiry, setNewMedExpiry] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split("T")[0];
  });
  
  const [catalog, setCatalog] = useState<any[]>([]);
  const [restockOrders, setRestockOrders] = useState<any[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState("");
  const [orderMode, setOrderMode] = useState<"CATALOG" | "CUSTOM">("CATALOG");
  const [customMedicineName, setCustomMedicineName] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("50");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [hasEnrolledPin, setHasEnrolledPin] = useState<boolean | null>(null);
  const [isRefreshingTracking, setIsRefreshingTracking] = useState(false);
  const [deliveringOrderId, setDeliveringOrderId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
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

  // Real-time 1-second countdown ticker when tracking modal is open
  useEffect(() => {
    let interval: any = null;
    if (isTrackingModalOpen) {
      interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTrackingModalOpen]);

  // Polling for live restock order updates while tracking modal is open
  useEffect(() => {
    let pollInterval: any = null;
    if (isTrackingModalOpen) {
      pollInterval = setInterval(async () => {
        const orders = await pharmacyService.getRestockOrders();
        setRestockOrders(orders);
        if (orders.some((o: any) => o.status === "DELIVERED")) {
          fetchInventory();
        }
      }, 5000);
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isTrackingModalOpen]);

  const openRestockModal = async () => {
    setIsSubmitting(true);
    setPin("");
    setShowPin(false);
    const [meds, secStatus] = await Promise.all([
      pharmacyService.getMedicinesCatalog(),
      pharmacyService.getSecurityStatus()
    ]);
    setCatalog(meds);
    setHasEnrolledPin(secStatus.hasPin);
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

  const refreshTrackingOrders = async () => {
    setIsRefreshingTracking(true);
    const orders = await pharmacyService.getRestockOrders();
    setRestockOrders(orders);
    setIsRefreshingTracking(false);
  };

  const handleDeliverOrder = async (orderId: string) => {
    setDeliveringOrderId(orderId);
    const res = await pharmacyService.deliverRestockOrder(orderId);
    if (res.success) {
      toast.success(res.message || "Order delivered and added to inventory!");
      setRestockOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "DELIVERED" } : o));
      fetchInventory();
    } else {
      toast.error(res.message || "Failed to deliver restock order.");
    }
    setDeliveringOrderId(null);
  };

  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName.trim()) {
      toast.error("Please provide a medicine name.");
      return;
    }
    const qty = parseInt(newMedStock);
    const price = parseFloat(newMedPrice);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Stock quantity must be greater than 0.");
      return;
    }
    if (isNaN(price) || price < 0) {
      toast.error("Unit price must be a valid non-negative number.");
      return;
    }
    if (!newMedExpiry) {
      toast.error("Please provide an expiry date.");
      return;
    }

    setIsSubmitting(true);
    const res = await pharmacyService.addInventoryItem({
      medicine_name: newMedName.trim(),
      generic_name: newMedGeneric.trim() || undefined,
      brand_name: newMedBrand.trim() || undefined,
      category: newMedCategory.trim() || "General",
      batch_number: newMedBatch.trim() || undefined,
      stock_quantity: qty,
      unit_price: price,
      expiry_date: newMedExpiry
    });

    if (res.success) {
      toast.success(res.message || "Medicine added to inventory!");
      setIsAddMedicineModalOpen(false);
      setNewMedName("");
      setNewMedGeneric("");
      setNewMedBrand("");
      setNewMedBatch("");
      setNewMedStock("100");
      setNewMedPrice("10.00");
      fetchInventory();
    } else {
      toast.error(res.message || "Failed to add medicine.");
    }
    setIsSubmitting(false);
  };

  const handlePlaceOrder = async () => {
    const qty = parseInt(orderQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid positive quantity.");
      return;
    }

    if (orderMode === "CATALOG" && !selectedMedicine) {
      toast.error("Please select a medicine from catalog or switch to Order New Medicine.");
      return;
    }

    if (orderMode === "CUSTOM" && !customMedicineName.trim()) {
      toast.error("Please enter the name of the new medicine to order.");
      return;
    }

    if (pin.length !== 6) {
      toast.error("Please enter your 6-digit Authorization PIN");
      return;
    }

    setIsSubmitting(true);
    const payload = orderMode === "CATALOG" 
      ? { medicine_id: selectedMedicine, quantity: qty, pin }
      : { medicine_name: customMedicineName.trim(), quantity: qty, pin };

    const res = await pharmacyService.placeRestockOrder(payload);
    if (res.success) {
      toast.success(res.message || "Order placed! It will be delivered in 2 minutes.");
      setIsRestockModalOpen(false);
      setSelectedMedicine("");
      setCustomMedicineName("");
      setOrderQuantity("50");
      setPin("");
      // Fetch latest orders & open tracking modal immediately so user can see it in transit!
      const orders = await pharmacyService.getRestockOrders();
      setRestockOrders(orders);
      setIsTrackingModalOpen(true);
    } else {
      toast.error(res.message || "Failed to place order.");
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
          <p className="text-muted-foreground">Manage pharmaceutical stock, add medicines, monitor expiry dates, and track low-stock items.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={openTrackingModal} disabled={isSubmitting}>
            <Clock className="w-4 h-4 mr-2" /> Track Restocks
          </Button>
          <Button onClick={openRestockModal} disabled={isSubmitting} variant="outline">
            <Plus className="w-4 h-4 mr-2" /> Order Restock
          </Button>
          <Button onClick={() => setIsAddMedicineModalOpen(true)} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Add Medicine
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
            <p className="text-sm text-muted-foreground mb-4">Orders are placed with distributors and delivered in 2 minutes.</p>
            
            {/* Mode Selector */}
            <div className="flex rounded-xl p-1 bg-muted/50 mb-4 border border-border/40">
              <button
                type="button"
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${orderMode === "CATALOG" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setOrderMode("CATALOG")}
              >
                From Catalog
              </button>
              <button
                type="button"
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${orderMode === "CUSTOM" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setOrderMode("CUSTOM")}
              >
                + Order New Medicine
              </button>
            </div>

            <div className="space-y-4">
              {orderMode === "CATALOG" ? (
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
              ) : (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">New Medicine Name *</label>
                  <Input 
                    type="text" 
                    placeholder="e.g., Atorvastatin 20mg, Azithromycin 500mg"
                    value={customMedicineName} 
                    onChange={(e) => setCustomMedicineName(e.target.value)}
                    className="rounded-xl p-3"
                    autoFocus
                  />
                  <p className="text-[11px] text-muted-foreground">Will be registered in catalog and delivered into inventory.</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Order Quantity</label>
                <Input 
                  type="number" min="1" 
                  value={orderQuantity} 
                  onChange={(e) => setOrderQuantity(e.target.value)}
                  className="rounded-xl p-3 font-mono"
                />
              </div>

              {/* PIN Section */}
              <div className="space-y-2.5 border-t border-border/40 pt-4 mt-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                    Authorization PIN *
                  </label>
                  <div className="flex items-center gap-2">
                    {pin.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setPin("")}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" /> Clear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showPin ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {hasEnrolledPin === false && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-500 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                    <span><strong>Setup PIN:</strong> You haven&apos;t enrolled an authorization PIN yet. Enter any 6-digit PIN below to register it and authorize this order.</span>
                  </div>
                )}

                {/* 6-box discrete PIN Display */}
                <div 
                  className="relative flex items-center justify-center gap-2.5 py-1.5 cursor-text select-none"
                  onClick={() => document.getElementById("pharmacy-auth-pin-input")?.focus()}
                >
                  {[0, 1, 2, 3, 4, 5].map((index) => {
                    const digit = pin[index];
                    const isFilled = index < pin.length;
                    const isCurrent = index === pin.length;
                    return (
                      <div
                        key={index}
                        className={`w-11 h-12 rounded-xl border flex items-center justify-center text-xl font-mono font-bold transition-all duration-150 shadow-sm ${
                          isCurrent
                            ? "border-amber-500 ring-2 ring-amber-500/30 bg-background scale-105"
                            : isFilled
                            ? "border-border/80 bg-background text-foreground"
                            : "border-border/40 bg-muted/20 text-muted-foreground/30"
                        }`}
                      >
                        {isFilled ? (
                          showPin ? digit : <span className="text-sm">●</span>
                        ) : (
                          <span className="text-xs text-muted-foreground/30 font-sans">—</span>
                        )}
                      </div>
                    );
                  })}

                  {/* Hidden Overlay Input that safely captures 6-digit input without browser password autofill */}
                  <input
                    id="pharmacy-auth-pin-input"
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="absolute inset-0 opacity-0 cursor-text w-full h-full text-transparent bg-transparent"
                    autoComplete="one-time-code"
                    name="pharmacy_restock_one_time_pin"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    autoFocus
                  />
                </div>

                <p className="text-[11px] text-muted-foreground text-center">
                  {hasEnrolledPin === false 
                    ? "Choose any 6 digits (e.g. 123456) to secure your restock actions." 
                    : "Enter your 6-digit PIN. (Demo default: 123456)"}
                </p>
              </div>
              
              <Button 
                className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl" 
                disabled={isSubmitting || (orderMode === "CATALOG" ? !selectedMedicine : !customMedicineName.trim()) || !orderQuantity || pin.length !== 6} 
                onClick={handlePlaceOrder}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Package className="w-4 h-4 mr-2" />} 
                Place Restock Order
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Modal */}
      {isTrackingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl p-6 rounded-2xl shadow-xl relative border border-border/50 max-h-[85vh] flex flex-col">
            <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={() => setIsTrackingModalOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
            <div className="flex items-center justify-between pr-8 mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" /> Track Restock Orders
              </h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={refreshTrackingOrders} 
                disabled={isRefreshingTracking}
                className="text-xs text-muted-foreground hover:text-foreground rounded-xl"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshingTracking ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
            
            <div className="overflow-y-auto pr-2 space-y-3 flex-1">
              {restockOrders.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">No restock orders found</p>
                    <p className="text-xs text-muted-foreground mt-1">Place an order from catalog or order custom medicines to track delivery.</p>
                  </div>
                  <Button 
                    size="sm" 
                    className="bg-amber-500 hover:bg-amber-600 text-black mt-2 rounded-xl"
                    onClick={() => {
                      setIsTrackingModalOpen(false);
                      openRestockModal();
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> Order Restock Now
                  </Button>
                </div>
              ) : (
                restockOrders.map(order => {
                  const expected = new Date(order.expected_delivery);
                  const isPending = order.status === "PENDING";
                  const secondsLeft = isPending 
                    ? Math.max(0, Math.floor((expected.getTime() - currentTime) / 1000)) 
                    : 0;
                  
                  return (
                    <div key={order.id} className="p-4 border border-border/50 rounded-xl bg-muted/10 hover:bg-muted/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{order.medicine_name}</p>
                          {order.status === 'DELIVERED' ? (
                            <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/10 text-[10px]">Delivered</Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/10 animate-pulse text-[10px]">
                              {secondsLeft > 0 ? `In Transit (~${secondsLeft}s)` : "Arriving..."}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Quantity: <span className="font-mono font-medium text-foreground">{order.quantity} units</span> • Ordered: {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 sm:self-center">
                        {isPending && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs border-amber-500/40 text-amber-500 hover:bg-amber-500/10 rounded-xl h-8"
                            disabled={deliveringOrderId === order.id}
                            onClick={() => handleDeliverOrder(order.id)}
                            title="Deliver order immediately for instant restock"
                          >
                            {deliveringOrderId === order.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                            ) : (
                              <Zap className="w-3.5 h-3.5 mr-1 text-amber-500" />
                            )}
                            Deliver Now
                          </Button>
                        )}
                        {order.status === 'DELIVERED' && (
                          <span className="text-xs text-emerald-500 flex items-center gap-1 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Fulfilled
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="pt-4 border-t border-border/40 mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>Orders auto-fulfill and deliver within 2 minutes.</span>
              <Button variant="ghost" size="sm" onClick={() => setIsTrackingModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Medicine Modal */}
      {isAddMedicineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-lg p-6 rounded-2xl shadow-xl relative border border-border/50 max-h-[90vh] overflow-y-auto">
            <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={() => setIsAddMedicineModalOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-bold mb-1">Add Medicine to Inventory</h2>
            <p className="text-sm text-muted-foreground mb-6">Register a new medicine or batch into your pharmacy stock.</p>

            <form onSubmit={handleAddMedicine} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Medicine Name *</label>
                <Input
                  type="text"
                  placeholder="e.g., Amoxicillin 500mg, Paracetamol"
                  value={newMedName}
                  onChange={(e) => setNewMedName(e.target.value)}
                  className="rounded-xl p-3"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Generic Name / Composition</label>
                  <Input
                    type="text"
                    placeholder="e.g., Amoxicillin Trihydrate"
                    value={newMedGeneric}
                    onChange={(e) => setNewMedGeneric(e.target.value)}
                    className="rounded-xl p-3"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Brand Name / Manufacturer</label>
                  <Input
                    type="text"
                    placeholder="e.g., Moxatag, GlaxoSmithKline"
                    value={newMedBrand}
                    onChange={(e) => setNewMedBrand(e.target.value)}
                    className="rounded-xl p-3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Category</label>
                  <select
                    className="w-full bg-background border border-input rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={newMedCategory}
                    onChange={(e) => setNewMedCategory(e.target.value)}
                  >
                    <option value="General">General</option>
                    <option value="Antibiotics">Antibiotics</option>
                    <option value="Analgesics">Analgesics & Pain Relief</option>
                    <option value="Cardiovascular">Cardiovascular</option>
                    <option value="Respiratory">Respiratory</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="Gastrointestinal">Gastrointestinal</option>
                    <option value="Vitamins & Supplements">Vitamins & Supplements</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Batch Number</label>
                  <Input
                    type="text"
                    placeholder="e.g., BAT-2026-901"
                    value={newMedBatch}
                    onChange={(e) => setNewMedBatch(e.target.value)}
                    className="rounded-xl p-3 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Stock Qty *</label>
                  <Input
                    type="number"
                    min="1"
                    value={newMedStock}
                    onChange={(e) => setNewMedStock(e.target.value)}
                    className="rounded-xl p-3 font-mono"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Unit Price ($) *</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newMedPrice}
                    onChange={(e) => setNewMedPrice(e.target.value)}
                    className="rounded-xl p-3 font-mono"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Expiry Date *</label>
                  <Input
                    type="date"
                    value={newMedExpiry}
                    onChange={(e) => setNewMedExpiry(e.target.value)}
                    className="rounded-xl p-3"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3"
                disabled={isSubmitting || !newMedName.trim()}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Add to Inventory
              </Button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
