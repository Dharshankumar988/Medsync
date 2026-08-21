"use client";

import { useEffect, useState } from "react";
import { pharmacyService, PharmacyOrder } from "@/services/pharmacy.service";
import { Card, CardHeader, CardTitle, CardContent, Input, Badge } from "@medsync/ui";
import { Users, Search, Activity } from "lucide-react";
import { motion } from "framer-motion";

export default function PharmacyPatientsPage() {
  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    pharmacyService.getOrders().then(data => {
      setOrders(data);
      setLoading(false);
    });
  }, []);

  // Extract unique patients from orders (As requested, Pharmacy can only see patients they have a relationship with)
  const patients = Array.from(new Set(orders.map(o => o.patient_name))).map(name => {
    const patientOrders = orders.filter(o => o.patient_name === name);
    return {
      name,
      orderCount: patientOrders.length,
      lastOrder: patientOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0],
    };
  });

  const filteredPatients = patients.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) {
    return <div className="p-8 flex items-center justify-center h-[50vh]"><div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Patients & Customers</h1>
        <p className="text-muted-foreground">View patients associated with your pharmacy through fulfillments and orders.</p>
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3">
          <Activity className="h-5 w-5 text-blue-500 mt-0.5" />
          <p className="text-sm text-blue-700 dark:text-blue-400">
            <strong>Privacy Notice:</strong> For security and compliance, you only have access to patient profiles that have an active business relationship with your pharmacy via an authorized order, valid QR scan, or prior dispensing record. Unrestricted directory search is disabled.
          </p>
        </div>
      </div>

      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search linked patients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 rounded-xl"
        />
      </div>

      {filteredPatients.length === 0 ? (
        <Card className="border-dashed bg-transparent border-2 shadow-none">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-amber-500" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No patients found</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              We couldn&apos;t find any patients matching your search query in your fulfillment history.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPatients.map((patient, i) => (
            <motion.div
              key={patient.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="rounded-2xl border-border/60 hover:border-amber-500/30 transition-colors h-full">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600 font-bold">
                        {patient.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{patient.name}</h3>
                        <p className="text-xs text-muted-foreground">{patient.orderCount} total fulfillments</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-muted/30 rounded-xl p-3 mt-4 space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Most Recent Order</div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium line-clamp-1 flex-1">{patient.lastOrder.medication}</span>
                      <Badge variant="outline" className="ml-2 text-[10px] shrink-0">{patient.lastOrder.status.replace(/_/g, ' ')}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(patient.lastOrder.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
