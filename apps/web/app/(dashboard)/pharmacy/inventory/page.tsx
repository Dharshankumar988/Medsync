"use client";

import { useState, useEffect } from "react";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Input, Button, Badge
} from "@medsync/ui";
import { Search, Plus, Download, Filter } from "lucide-react";
import api from "@/lib/api";

export default function InventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchInventory();
  }, [search]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      // In a real implementation this uses the axios client from "@/lib/api"
      const res = await api.get(`/api/v1/inventory?search=${search}`);
      setInventory(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventory Management</h2>
          <p className="text-muted-foreground mt-1">
            Manage your local pharmacy stock, batches, and pricing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export</Button>
          <Button><Plus className="mr-2 h-4 w-4" /> Add Medicine</Button>
        </div>
      </div>

      <Card className="border-border/40 shadow-sm backdrop-blur-xl bg-background/60">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <CardTitle>Current Stock</CardTitle>
            <div className="flex w-full md:w-auto items-center gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search generic, brand, barcode..." 
                  className="pl-8" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Batch Number</TableHead>
                  <TableHead>Stock Quantity</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">Loading inventory...</TableCell>
                  </TableRow>
                ) : inventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No medicines found.</TableCell>
                  </TableRow>
                ) : (
                  inventory.map((item) => (
                    <TableRow key={item.id} className="group hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">
                        {item.medicine.name}
                        <div className="text-xs text-muted-foreground">{item.medicine.generic_name}</div>
                      </TableCell>
                      <TableCell>{item.batch_number}</TableCell>
                      <TableCell>{item.stock_quantity}</TableCell>
                      <TableCell>{item.expiry_date}</TableCell>
                      <TableCell>₹{item.selling_price}</TableCell>
                      <TableCell>
                        {item.stock_quantity <= item.minimum_stock ? (
                          <Badge variant="destructive">Low Stock</Badge>
                        ) : (
                          <Badge variant="default" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">In Stock</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
