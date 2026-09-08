"use client";

import { useState } from "react";
import { Button } from "@medsync/ui";
import { Input } from "@medsync/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@medsync/ui";
import { QrCode, ScanLine, Loader2, CheckCircle2, ShieldCheck, FileText, AlertTriangle } from "lucide-react";
import api from "@/lib/api";

export default function DoctorQRScannerPage() {
  const [token, setToken] = useState("");
  const [step, setStep] = useState<"SCAN" | "SUCCESS">("SCAN");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prescriptionData, setPrescriptionData] = useState<any>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/v1/verify/qr/${token}`);
      const resData = res.data;
      
      if (resData.data?.is_valid) {
        setPrescriptionData(resData.data.data);
        if (resData.data.data.status === "TAMPERED") {
          setError("WARNING: This prescription has been TAMPERED with. The data does not match the blockchain.");
        }
        setStep("SUCCESS");
      } else {
        setError(resData.message || "Invalid or tampered QR token.");
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to verify prescription token.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep("SCAN");
    setToken("");
    setPrescriptionData(null);
    setError(null);
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Prescription Scanner</h2>
      </div>
      
      <div className="flex justify-center mt-8">
        <Card className="w-full max-w-lg shadow-lg border-primary/10">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                {step === "SCAN" && <ScanLine className="h-8 w-8 text-primary" />}
                {step === "SUCCESS" && <CheckCircle2 className="h-8 w-8 text-emerald-500" />}
              </div>
            </div>
            <CardTitle className="text-2xl">
              {step === "SCAN" && "Scan QR Token"}
              {step === "SUCCESS" && "Verification Complete"}
            </CardTitle>
            <CardDescription>
              {step === "SCAN" && "Scan the patient's prescription QR code or enter the secure MS- token manually."}
              {step === "SUCCESS" && "The prescription details are displayed below."}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-6 border border-red-100 flex items-start">
                <AlertTriangle className="h-5 w-5 mr-2 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            {step === "SCAN" && (
              <form onSubmit={handleScan} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    placeholder="Enter MS- token here..."
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="font-mono text-center"
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full" disabled={!token || isLoading} size="lg">
                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <QrCode className="mr-2 h-5 w-5" />}
                  Verify Token
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-4">
                  Powered by MedSync Secure Hash Protocol
                </p>
              </form>
            )}

            {step === "SUCCESS" && prescriptionData && (
              <div className="space-y-6">
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex items-center text-sm">
                    <FileText className="h-4 w-4 mr-2 text-primary" />
                    <span className="font-medium">Prescription ID:</span>
                    <span className="ml-2 font-mono text-xs">{prescriptionData.prescription_id?.split('-')[0]}...</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-muted-foreground">Patient:</span> {prescriptionData.patient_name}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-muted-foreground">Doctor:</span> {prescriptionData.doctor_name}
                  </div>
                  <div className="mt-2 text-sm font-semibold flex items-center">
                     Status: 
                     {prescriptionData.status === "VERIFIED" && <span className="ml-2 text-emerald-600 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1" /> Blockchain Verified</span>}
                     {prescriptionData.status === "PENDING" && <span className="ml-2 text-amber-600">Pending Anchoring</span>}
                     {prescriptionData.status === "TAMPERED" && <span className="ml-2 text-red-600 flex items-center"><AlertTriangle className="w-4 h-4 mr-1" /> TAMPERED</span>}
                  </div>
                </div>

                {prescriptionData.items ? (
                  <div className="bg-background p-4 rounded-lg border mt-4">
                    <h4 className="font-medium mb-3 border-b pb-2">Clinical Details</h4>
                    {prescriptionData.diagnosis && (
                      <div className="mb-4">
                        <span className="text-xs text-muted-foreground block">Diagnosis</span>
                        <span className="text-sm font-medium">{prescriptionData.diagnosis}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-xs text-muted-foreground block mb-2">Medications</span>
                      <ul className="space-y-2">
                      {prescriptionData.items?.map((item: any, i: number) => (
                        <li key={i} className="text-sm flex justify-between items-center bg-muted/50 p-2 rounded border border-border/50">
                          <span className="font-medium">{item.medicine_name}</span>
                          <span className="text-muted-foreground">{item.dosage} ({item.duration_days} days)</span>
                        </li>
                      ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg">
                    <h4 className="font-semibold text-amber-800 flex items-center mb-2">
                      <ShieldCheck className="h-5 w-5 mr-2" />
                      Limited Access
                    </h4>
                    <p className="text-sm text-amber-700">
                      You are not authorized to view the full clinical details of this prescription.
                    </p>
                  </div>
                )}
                
                <Button onClick={handleReset} variant="outline" className="w-full" size="lg">
                  Scan Another
                </Button>
              </div>
            )}
            
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
