"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button } from "@medsync/ui";
import { CheckCircle2, ShieldAlert, FileText, Loader2, Link as LinkIcon, ShieldCheck } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { pharmacyService } from "@/services/pharmacy.service";

export default function VerifyPrescriptionPage() {
  const { id: rxId } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [verificationData, setVerificationData] = useState<any>(null);

  useEffect(() => {
    async function verifyPrescription() {
      try {
        // Use the existing pharmacy service verify endpoint or similar logic
        // For general verification, we can hit an endpoint to fetch prescription info and its blockchain state
        
        // Let's assume there's a public or semi-public verify endpoint that returns prescription status
        // If not, we can use the qr verification logic:
        const fullUrl = typeof window !== 'undefined' ? window.location.href : `https://medsync.vercel.app/verify/prescription/${rxId}`;
        const verifyRes = await pharmacyService.verifyQR(fullUrl);
        
        setVerificationData(verifyRes.data);
      } catch (err: any) {
        toast.error(err.message || "Failed to verify prescription.");
        setVerificationData({ is_valid: false, message: "Verification failed. The prescription may be invalid or tampered." });
      } finally {
        setLoading(false);
      }
    }
    
    if (rxId) {
      verifyPrescription();
    }
  }, [rxId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500 mb-6" />
        <p className="text-lg font-medium text-muted-foreground animate-pulse">Verifying Cryptographic Signatures...</p>
      </div>
    );
  }

  if (!verificationData || !verificationData.is_valid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <Card className="max-w-md w-full border-red-500/50 shadow-2xl">
          <CardHeader className="text-center bg-red-500/10 border-b border-red-500/20">
            <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-red-600">Verification Failed</CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-muted-foreground">This prescription record is invalid or has been tampered with. It does not match the blockchain ledger.</p>
            <div className="bg-muted p-4 rounded-lg text-left text-sm border font-mono break-all text-muted-foreground">
              ID: {rxId}
            </div>
            <Button className="w-full mt-4" variant="outline" onClick={() => router.push('/')}>Return Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: rxInfo } = verificationData;

  return (
    <div className="min-h-screen flex flex-col items-center pt-20 p-6 bg-slate-50 dark:bg-slate-950">
      <Card className="max-w-md w-full shadow-2xl border-amber-500/30 overflow-hidden">
        <CardHeader className="text-center bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-b border-border relative">
          <div className="absolute top-4 right-4">
            {rxInfo.status === "VERIFIED" ? (
              <Badge className="bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 border-none px-3 py-1 text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Authentic
              </Badge>
            ) : (
              <Badge className="bg-amber-500/20 text-amber-600 hover:bg-amber-500/30 border-none px-3 py-1 text-xs">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Pending Sync
              </Badge>
            )}
          </div>
          
          <div className="h-20 w-20 bg-background rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner border border-border/50 shadow-amber-500/20">
            <ShieldCheck className="w-10 h-10 text-amber-500" />
          </div>
          <CardTitle className="text-2xl">Verified Prescription</CardTitle>
          <CardDescription>Cryptographically secured on Polygon network</CardDescription>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Patient Name</span>
              <p className="font-medium text-lg">{rxInfo.patient_name}</p>
            </div>
            
            <div className="pt-4 border-t border-dashed">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-3">Blockchain Record</span>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Ledger Status</span>
                  <span className={`font-semibold ${rxInfo.status === 'VERIFIED' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {rxInfo.status === 'VERIFIED' ? 'Finalized' : 'Pending'}
                  </span>
                </div>
                
                {rxInfo.blockchain_tx && (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Transaction Hash</span>
                    <div className="bg-muted p-2 rounded-lg font-mono text-xs break-all text-muted-foreground border">
                      {rxInfo.blockchain_tx}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <Button 
            className="w-full bg-amber-600 hover:bg-amber-500 text-white shadow-md rounded-xl h-12"
            onClick={() => router.push('/dashboard')}
          >
            Access Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Needed Badge component for local usage
function Badge({ className, children }: { className?: string, children: React.ReactNode }) {
  return (
    <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
      {children}
    </div>
  );
}
