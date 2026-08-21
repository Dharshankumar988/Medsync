"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Skeleton } from "@medsync/ui";
import { Shield, ShieldAlert, ShieldCheck, Clock, User, Search, Key } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.05 } } };

export default function DoctorConsentPage() {
  const [userId, setUserId] = useState<string>("");
  const [consents, setConsents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    async function loadConsents() {
      if (!userId) return;
      try {
        const { data: permissions, error } = await supabase
          .from("record_permissions")
          .select(`
            id,
            record_id,
            granted_at,
            expires_at,
            is_revoked,
            record:medical_records ( title, patient_id )
          `)
          .eq("granted_to", userId)
          .order("granted_at", { ascending: false });
          
        if (error) throw error;

        if (permissions && permissions.length > 0) {
           const patientIds = [...new Set((permissions as any[]).map(p => (Array.isArray(p.record) ? p.record[0]?.patient_id : p.record?.patient_id)).filter(Boolean))];
           const { data: patientsData } = await supabase.from('patients').select('user_id, full_name').in('user_id', patientIds as string[]);

           const mapped = (permissions as any[]).map(p => {
             const rec = Array.isArray(p.record) ? p.record[0] : p.record;
             const pat = patientsData?.find(pat => pat.user_id === rec?.patient_id);
             return {
               ...p,
               record: rec,
               patient: pat,
             };
           });
           setConsents(mapped);
        } else {
           setConsents([]);
        }

      } catch (err) {
        console.error("Error loading consents", err);
      } finally {
        setLoading(false);
      }
    }

    loadConsents();
  }, [userId]);

  const filteredConsents = consents.filter(c => 
    (c.patient?.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.record?.title || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative space-y-8 pb-12 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.15]">
            Patient Consent & Security
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl leading-relaxed">
            Monitor and manage access permissions granted to you by your patients. MedSync uses zero-knowledge encryption and granular permissions to protect patient data.
          </p>
        </div>
        
        <div className="flex flex-col gap-3 w-full md:w-auto">
          <Button variant="default" className="bg-emerald-600 hover:bg-emerald-700">
            <Key className="w-4 h-4 mr-2" /> Request Record Access
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by patient or record..." 
              className="pl-9 bg-muted/50 w-full md:w-72"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <Card className="bg-emerald-500/5 border-emerald-500/20">
           <CardContent className="p-6 flex items-center gap-4">
             <div className="p-3 bg-emerald-500/10 rounded-full">
               <ShieldCheck className="w-8 h-8 text-emerald-600" />
             </div>
             <div>
               <p className="text-sm font-medium text-muted-foreground">Active Consents</p>
               <h3 className="text-2xl font-bold">{consents.filter(c => !c.is_revoked && (!c.expires_at || new Date(c.expires_at) > new Date())).length}</h3>
             </div>
           </CardContent>
         </Card>
         <Card className="bg-amber-500/5 border-amber-500/20">
           <CardContent className="p-6 flex items-center gap-4">
             <div className="p-3 bg-amber-500/10 rounded-full">
               <Clock className="w-8 h-8 text-amber-600" />
             </div>
             <div>
               <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
               <h3 className="text-2xl font-bold">
                 {consents.filter(c => !c.is_revoked && c.expires_at && new Date(c.expires_at) > new Date() && new Date(c.expires_at).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000).length}
               </h3>
             </div>
           </CardContent>
         </Card>
         <Card className="bg-red-500/5 border-red-500/20">
           <CardContent className="p-6 flex items-center gap-4">
             <div className="p-3 bg-red-500/10 rounded-full">
               <ShieldAlert className="w-8 h-8 text-red-600" />
             </div>
             <div>
               <p className="text-sm font-medium text-muted-foreground">Revoked Access</p>
               <h3 className="text-2xl font-bold">{consents.filter(c => c.is_revoked).length}</h3>
             </div>
           </CardContent>
         </Card>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : filteredConsents.length === 0 ? (
        <Card className="rounded-2xl border border-dashed bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <Shield className="h-12 w-12 text-emerald-500/50 mb-4" />
            <p className="text-lg font-medium">No permissions found</p>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              You haven&apos;t been granted access to any patient records yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                <tr>
                  <th className="px-6 py-4 font-medium">Patient</th>
                  <th className="px-6 py-4 font-medium">Record Title</th>
                  <th className="px-6 py-4 font-medium">Granted On</th>
                  <th className="px-6 py-4 font-medium">Expires At</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <motion.tbody 
                initial="hidden"
                animate="visible"
                variants={stagger}
                className="divide-y"
              >
                {filteredConsents.map((consent) => {
                  const now = new Date();
                  const isRevoked = consent.is_revoked;
                  const isExpired = consent.expires_at && new Date(consent.expires_at) < now;
                  const isActive = !isRevoked && !isExpired;
                  
                  return (
                    <motion.tr key={consent.id} variants={fadeUp} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        {consent.patient?.full_name || "Unknown Patient"}
                      </td>
                      <td className="px-6 py-4">{consent.record?.title || "Unknown Record"}</td>
                      <td className="px-6 py-4 text-muted-foreground">{new Date(consent.granted_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-muted-foreground">{consent.expires_at ? new Date(consent.expires_at).toLocaleDateString() : "Never"}</td>
                      <td className="px-6 py-4">
                        {isActive ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
                        ) : isRevoked ? (
                          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">Revoked</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Expired</Badge>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </motion.tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
