"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Button, Skeleton } from "@medsync/ui";
import { Brain, FileText, Activity, AlertTriangle, Info, Image as ImageIcon, ChevronRight, Loader2, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";

function AIAnalysisReviewCard({ version, ai }: { version: any, ai: any }) {
  const confidence = ai.confidence_score ? Math.round(ai.confidence_score * 100) : null;
  const [notes, setNotes] = useState(ai.doctor_review_notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(ai.doctor_review_status || "PENDING");

  const handleReview = async (newStatus: "APPROVED" | "REJECTED") => {
    setIsSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      
      const res = await fetch(`/api/v1/ai/analyses/${ai.id}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus, notes })
      });
      
      if (!res.ok) throw new Error("Failed to submit review");
      
      setStatus(newStatus);
      toast.success(`Analysis ${newStatus.toLowerCase()} successfully`);
    } catch (e) {
      toast.error("Error submitting review");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="overflow-hidden border shadow-sm">
        <div className="grid md:grid-cols-2">
          {/* Left: Image / File Viewer placeholder */}
          <div className="bg-muted/30 border-r flex flex-col justify-center items-center p-6 min-h-[300px] relative">
            {['image/jpeg', 'image/png'].includes(version.file_type) || version.file_type === 'IMAGE' || version.file_type === 'X_RAY' || version.file_type === 'MRI' ? (
              <div className="relative w-full h-full flex items-center justify-center group">
                  <Image 
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/medical-records/${version.ipfs_cid}`} 
                    alt={version.record?.title || "Medical record"} 
                    className="max-h-[350px] object-contain rounded-lg shadow-sm"
                    width={500}
                    height={350}
                    unoptimized
                  />
              </div>
            ) : (
              <div className="text-center">
                <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-sm font-medium text-muted-foreground">Document File</p>
                <Button variant="link" onClick={() => window.open(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/medical-records/${version.ipfs_cid}`)}>
                  View Original File
                </Button>
              </div>
            )}
            
            <div className="absolute top-4 left-4">
              <Badge variant="secondary" className="bg-background/80 backdrop-blur-md">
                {version.file_type}
              </Badge>
            </div>
          </div>

          {/* Right: AI Results & Clinical Review */}
          <div className="p-6 flex flex-col h-full max-h-[600px] overflow-y-auto">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg line-clamp-1">{version.record?.title}</h3>
                <Badge variant="outline" className="bg-violet-500/10 text-violet-600 border-violet-500/20 whitespace-nowrap">
                  <Brain className="w-3 h-3 mr-1" /> {ai.model_name}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Analyzed on {new Date(ai.created_at).toLocaleString()}</p>
            </div>

            <div className="space-y-6 flex-1">
              <div className="bg-muted/50 p-4 rounded-xl border border-border/50">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">AI Finding</p>
                <p className="text-base font-medium text-foreground">{ai.summary}</p>
                
                {ai.prediction_label && (
                  <div className="mt-3 inline-flex items-center rounded-md bg-violet-100 px-2.5 py-0.5 text-sm font-medium text-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
                    {ai.prediction_label}
                  </div>
                )}
                
                {confidence !== null && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span>Model Confidence</span>
                      <span className="font-medium">{confidence}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted-foreground/20 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${confidence > 85 ? 'bg-emerald-500' : confidence > 60 ? 'bg-amber-500' : 'bg-red-500'}`} 
                        style={{ width: `${confidence}%` }} 
                      />
                    </div>
                  </div>
                )}
                
                {ai.findings && Array.isArray(ai.findings) && ai.findings.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Detailed Observations</p>
                    <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                      {ai.findings.map((f: any, idx: number) => (
                         <li key={idx}>{typeof f === 'string' ? f : f.class || f.description || JSON.stringify(f)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {status === "PENDING" ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Clinical Review Required</p>
                  <textarea 
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[100px]"
                    placeholder="Enter your clinical interpretation of these results..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <div className="flex justify-end gap-3 mt-3">
                    <Button variant="outline" size="sm" onClick={() => handleReview('REJECTED')} disabled={isSubmitting} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                      <XCircle className="w-4 h-4 mr-1.5" /> Reject AI Findings
                    </Button>
                    <Button size="sm" onClick={() => handleReview('APPROVED')} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      <CheckCircle className="w-4 h-4 mr-1.5" /> Confirm AI Findings
                    </Button>
                  </div>
                </div>
              ) : (
                <div className={`p-4 rounded-xl border ${status === 'APPROVED' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                   <div className="flex items-center gap-2 mb-2">
                     {status === 'APPROVED' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                     <h4 className={`font-semibold ${status === 'APPROVED' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                       AI Findings {status === 'APPROVED' ? 'Confirmed' : 'Rejected'}
                     </h4>
                   </div>
                   {notes && <p className="text-sm text-foreground/80 mt-2 p-3 bg-background/50 rounded-lg">{notes}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export default function DoctorAIAnalysisPage() {
  const searchParams = useSearchParams();
  const preselectedRecordId = searchParams.get('record_id');
  
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [aiRecords, setAiRecords] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;

    async function fetchAiRecords() {
      setLoading(true);
      try {
        // Find records doctor has access to
        const { data: permissions } = await supabase
          .from('record_permissions')
          .select('record_id')
          .eq('granted_to', userId)
          .eq('is_revoked', false);

        const recordIds = permissions?.map(p => p.record_id) || [];
        if (recordIds.length === 0) {
          setAiRecords([]);
          setLoading(false);
          return;
        }

        // Fetch those records with their AI analyses
        let query = supabase
          .from("medical_record_versions")
          .select(`
            *,
            record:medical_records(*),
            ai_analyses(*)
          `)
          .in('record_id', recordIds)
          .eq('is_current', true)
          .not('ai_analyses', 'is', null);

        if (preselectedRecordId) {
          query = query.eq('record_id', preselectedRecordId);
        }

        const { data, error } = await query;
        if (error) throw error;
        
        // Filter out versions without AI analyses, then sort
        const versionsWithAi = (data || [])
          .filter(v => v.ai_analyses && v.ai_analyses.length > 0)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          
        setAiRecords(versionsWithAi);
      } catch (error) {
        console.error("Error fetching AI records:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAiRecords();
  }, [userId, preselectedRecordId]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Clinical Analysis</h1>
          <p className="text-muted-foreground mt-1">Review AI inferences on authorized medical records.</p>
        </div>
      </div>

      <div className="bg-violet-500/10 border border-violet-500/20 text-violet-700 dark:text-violet-400 p-4 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-sm">Clinical Decision Support Only</p>
          <p className="text-xs opacity-90 leading-relaxed">
            AI analysis results are generated by models (YOLO, EfficientNet) and are intended solely to assist clinical review. 
            They must not replace professional medical judgment. Always verify findings independently.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-[400px] w-full rounded-2xl" />
        </div>
      ) : aiRecords.length === 0 ? (
        <Card className="rounded-2xl border border-dashed bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <Brain className="h-12 w-12 text-violet-500/50 mb-4" />
            <p className="text-lg font-medium">No AI Analyses Available</p>
            <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
              None of the medical records you are authorized to view currently have AI analysis results attached.
            </p>
            {preselectedRecordId && (
              <Button variant="outline" asChild>
                <Link href="/doctor/ai-analysis">View All Authorized AI Records</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {aiRecords.map(version => {
            const ai = version.ai_analyses[0];
            return <AIAnalysisReviewCard key={version.id} version={version} ai={ai} />;
          })}
        </div>
      )}
    </div>
  );
}


