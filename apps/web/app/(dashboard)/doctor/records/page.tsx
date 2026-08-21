"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Badge, Skeleton, Input, Button } from "@medsync/ui";
import { FileText, CheckCircle2, AlertCircle, Download, Search, ShieldCheck, Brain } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import Link from "next/link";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } }
};
const stagger = { visible: { transition: { staggerChildren: 0.05 } } };

export default function DoctorMedicalRecordsPage() {
  const searchParams = useSearchParams();
  const filterPatientId = searchParams.get('patient_id');
  
  const [userId, setUserId] = useState<string>("");
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const loadRecords = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // 1. Get record IDs doctor is authorized to view
      const { data: permissions } = await supabase
        .from('record_permissions')
        .select('record_id, expires_at, is_revoked')
        .eq('granted_to', userId)
        .eq('is_revoked', false);

      const now = new Date();
      const validPermissions = permissions?.filter(p => !p.expires_at || new Date(p.expires_at) > now) || [];
      const authorizedRecordIds = validPermissions.map(p => p.record_id);

      if (authorizedRecordIds.length === 0) {
        setRecords([]);
        setLoading(false);
        return;
      }

      // 2. Fetch those records
      let query = supabase
        .from("medical_records")
        .select(`
          *,
          patient:users!patient_id ( full_name ),
          medical_record_versions(*, ai_analyses(*))
        `)
        .in("id", authorizedRecordIds)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      if (filterPatientId) {
        query = query.eq("patient_id", filterPatientId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // We might need to manually fetch patient names if the join fails
      if (data && data.length > 0 && !data[0].patient) {
        const patientIds = [...new Set(data.map(r => r.patient_id))];
        const { data: patients } = await supabase.from('patients').select('user_id, full_name').in('user_id', patientIds);
        
        const enhancedData = data.map(r => {
           const p = patients?.find(pat => pat.user_id === r.patient_id);
           return { ...r, patient: { full_name: p?.full_name || "Unknown Patient" } };
        });
        setRecords(enhancedData);
      } else {
        setRecords(data || []);
      }
    } catch (err) {
      console.error("Error loading records", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [userId, filterPatientId]);

  const filteredRecords = records.filter(r => 
    (r.title || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.patient?.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative space-y-8 pb-12 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.15]">
            Medical Records
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md leading-relaxed">
            View authorized patient documents, test results, and AI analyses.
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search records or patients..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </motion.div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}
        </div>
      ) : filteredRecords.length === 0 ? (
        <Card className="rounded-2xl border border-dashed bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <ShieldCheck className="h-12 w-12 text-emerald-500/50 mb-4" />
            <p className="text-lg font-medium">No authorized records</p>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              You do not have active consent to view any medical records matching your search. Patients must grant access before their records appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <motion.div 
          className="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {filteredRecords.map(record => {
            const currentVersion = record.medical_record_versions?.find((v: any) => v.is_current) || record.medical_record_versions?.[0];
            const blockchainStatus = currentVersion?.blockchain_status || 'PENDING';
            const aiAnalyses = currentVersion?.ai_analyses || [];
            
            return (
              <motion.div key={record.id} variants={fadeUp}>
                <Card className="group overflow-hidden rounded-2xl border border-border/60 bg-card/50 transition-all hover:-translate-y-1 hover:shadow-lg flex flex-col h-full">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 mb-3">
                        <FileText className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="flex flex-col items-end gap-1 text-right">
                        {blockchainStatus === 'CONFIRMED' || blockchainStatus === 'VERIFIED' ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Verified
                          </Badge>
                        ) : blockchainStatus === 'MISMATCH' ? (
                          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                            <AlertCircle className="mr-1 h-3 w-3" /> Integrity Mismatch
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                            <AlertCircle className="mr-1 h-3 w-3" /> Pending Verification
                          </Badge>
                        )}
                        {aiAnalyses.length > 0 && (
                          <Badge variant="secondary" className="bg-violet-500/10 text-violet-600">
                            <Brain className="mr-1 h-3 w-3" /> AI Analyzed
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardTitle className="text-base line-clamp-1">{record.title}</CardTitle>
                    <p className="text-xs font-medium text-emerald-600">Patient: {record.patient?.full_name}</p>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-1">
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                      {record.description || "No description provided."}
                    </p>
                    
                    {/* Render AI Result Snippet if available */}
                    {aiAnalyses.length > 0 && (
                       <div className="mt-auto mb-4 bg-muted/50 p-2.5 rounded-lg border border-border/50">
                         <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-foreground">
                           <Brain className="w-3.5 h-3.5 text-violet-500" /> AI Result ({aiAnalyses[0].model_name})
                         </div>
                         <p className="text-xs text-muted-foreground line-clamp-1">
                           {aiAnalyses[0].summary || "Analysis completed"}
                         </p>
                         {aiAnalyses[0].confidence_score && (
                           <div className="mt-1.5 flex items-center gap-2">
                             <div className="h-1.5 w-full bg-muted-foreground/20 rounded-full overflow-hidden">
                               <div className="h-full bg-violet-500" style={{ width: `${Math.round(aiAnalyses[0].confidence_score * 100)}%` }} />
                             </div>
                             <span className="text-[10px] font-medium">{Math.round(aiAnalyses[0].confidence_score * 100)}%</span>
                           </div>
                         )}
                       </div>
                    )}

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                      <span className="text-xs text-muted-foreground">
                        {new Date(record.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex gap-2">
                        {aiAnalyses.length > 0 && (
                           <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-violet-500 hover:text-violet-600 hover:bg-violet-500/10" asChild>
                             <Link href={`/doctor/ai-analysis?record_id=${record.id}`}>View AI</Link>
                           </Button>
                        )}
                        {currentVersion && (
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-blue-500 hover:text-blue-600" onClick={() => window.open(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/medical-records/${currentVersion.ipfs_cid}`)}>
                            <Download className="mr-1 h-3.5 w-3.5" /> Download
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
