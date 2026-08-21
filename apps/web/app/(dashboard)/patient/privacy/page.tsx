"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Skeleton } from "@medsync/ui";
import { Shield, ShieldAlert, Key, Clock, ShieldCheck, Activity } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

export default function PrivacyPage() {
  const [userId, setUserId] = useState<string>("");
  const [consentHistory, setConsentHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    
    async function loadConsent() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("consent_history")
          .select("*")
          .eq("patient_id", userId)
          .order("created_at", { ascending: false });
          
        if (data) {
          const doctorIds = [...new Set(data.map(c => c.doctor_id))];
          const { data: docData } = await supabase
            .from("doctors")
            .select("*")
            .in("user_id", doctorIds);
            
          const docsMap = (docData || []).reduce((acc: any, d: any) => {
            acc[d.user_id] = d;
            return acc;
          }, {});
          
          const mapped = data.map(c => ({
            ...c,
            doctor: docsMap[c.doctor_id]
          }));
          
          setConsentHistory(mapped);
        }
      } catch (err) {
        console.error("Error loading consent history", err);
      } finally {
        setLoading(false);
      }
    }
    
    loadConsent();
  }, [userId]);

  return (
    <div className="relative space-y-8 pb-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-widest uppercase text-emerald-500 mb-2">Security</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.15]">
            Privacy & Consent
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md leading-relaxed">
            Manage who has access to your medical records.
          </p>
        </div>
      </motion.div>
      
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="rounded-2xl border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <ShieldCheck className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Blockchain Secured</h3>
                <p className="text-sm text-muted-foreground">All records are tamper-proof.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border border-border/60 bg-card/50">
        <CardHeader>
          <CardTitle>Consent Audit Log</CardTitle>
          <CardDescription>A complete history of data access granted to healthcare providers.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : consentHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">No consent history</p>
              <p className="text-sm text-muted-foreground">You haven't granted any data access yet.</p>
            </div>
          ) : (
            <div className="relative border-l border-border/50 ml-3 md:ml-4 space-y-8 pb-4">
              {consentHistory.map((item, index) => (
                <div key={item.id} className="relative pl-6 md:pl-8">
                  <span className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-background" />
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-1">
                        Access {item.action}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Dr. {item.doctor?.full_name || 'Unknown'} ({item.doctor?.specialization})
                      </p>
                      {item.blockchain_tx_hash && (
                        <p className="text-xs font-mono text-muted-foreground/70 mt-2 break-all">
                          Tx: {item.blockchain_tx_hash}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground shrink-0 bg-muted/50 px-2 py-1 rounded-md">
                      <Clock className="mr-1.5 h-3 w-3" />
                      {new Date(item.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
