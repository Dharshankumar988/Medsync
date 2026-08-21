"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Badge, Input, Skeleton } from "@medsync/ui";
import { Search, MapPin, Store, Clock, Phone, ShieldCheck, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.05 } } };

export default function DoctorPharmaciesPage() {
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadPharmacies() {
      try {
        const { data: pharmacyProfiles, error } = await supabase
          .from("pharmacies")
          .select("*");
          
        if (error) throw error;
        
        if (pharmacyProfiles && pharmacyProfiles.length > 0) {
          const userIds = pharmacyProfiles.map(p => p.user_id);
          const { data: usersData } = await supabase
            .from("users")
            .select("id, full_name, email, status")
            .in("id", userIds)
            .eq("status", "ACTIVE"); // Only approved pharmacies
            
          const mapped = pharmacyProfiles
            .map(profile => {
               const user = usersData?.find(u => u.id === profile.user_id);
               if (!user) return null;
               return { ...profile, ...user };
            })
            .filter(Boolean);
            
          setPharmacies(mapped);
        }
      } catch (err) {
        console.error("Error loading pharmacies", err);
      } finally {
        setLoading(false);
      }
    }

    loadPharmacies();
  }, []);

  const filteredPharmacies = pharmacies.filter(p => 
    (p.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.city || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.address || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative space-y-8 pb-12 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.15]">
            Network Pharmacies
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md leading-relaxed">
            Approved MedSync pharmacies for secure prescription dispensing.
          </p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name, city, or address..." 
            className="pl-9 bg-muted/50 border-transparent focus-visible:border-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </motion.div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
        </div>
      ) : filteredPharmacies.length === 0 ? (
        <Card className="rounded-2xl border border-dashed bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <Store className="h-12 w-12 text-emerald-500/50 mb-4" />
            <p className="text-lg font-medium">No pharmacies found</p>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              {search ? "Try adjusting your search terms." : "There are currently no active pharmacies in the MedSync network."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <motion.div 
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {filteredPharmacies.map(pharmacy => (
            <motion.div key={pharmacy.id} variants={fadeUp}>
              <Card className="group overflow-hidden rounded-2xl border border-border/60 bg-card/50 transition-all hover:-translate-y-1 hover:shadow-lg h-full flex flex-col">
                <CardHeader className="pb-3 border-b border-border/50">
                  <div className="flex justify-between items-start">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 mb-3">
                      <Store className="h-5 w-5 text-emerald-500" />
                    </div>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                      <ShieldCheck className="mr-1 h-3 w-3" /> Verified Partner
                    </Badge>
                  </div>
                  <CardTitle className="text-base line-clamp-1">{pharmacy.full_name || "MedSync Pharmacy"}</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 flex flex-col flex-1">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {pharmacy.address}<br/>
                        {[pharmacy.city, pharmacy.state].filter(Boolean).join(", ")} {pharmacy.pincode}
                      </p>
                    </div>
                    
                    {pharmacy.operating_hours && (
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                        <p className="text-sm font-medium">{pharmacy.operating_hours}</p>
                      </div>
                    )}
                    
                    {pharmacy.contact_number && (
                      <div className="flex items-center gap-2.5">
                        <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                        <p className="text-sm">{pharmacy.contact_number}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-border/50 flex justify-between items-center text-xs text-muted-foreground">
                    <span>License: {pharmacy.license_number || "Verified"}</span>
                    <span className="flex items-center text-emerald-600 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      <Star className="w-3 h-3 mr-1 fill-emerald-500" /> Preferred
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
