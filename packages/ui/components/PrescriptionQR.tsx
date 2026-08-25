"use client";

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./card";
import { Button } from "./button";
import { Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';
import api from '@/lib/api';

interface PrescriptionQRProps {
  prescriptionId: string;
  patientId: string;
  doctorId: string;
  qrToken?: string;
  hash?: string;
}

export function PrescriptionQR({ prescriptionId, patientId, doctorId, qrToken, hash }: PrescriptionQRProps) {
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  const payload = qrToken || hash || JSON.stringify({
    type: "PRESCRIPTION",
    id: prescriptionId,
    patient_id: patientId,
    doctor_id: doctorId
  });

  const handleVerify = async () => {
    setVerifying(true);
    setVerificationResult(null);
    try {
      const res = await api.get(`/blockchain/prescription/${prescriptionId}/verify`);
      setVerificationResult(res.data);
    } catch (error) {
      console.error("Verification failed", error);
      setVerificationResult({ verified: false, error: "Network or server error" });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Card className="w-full max-w-sm mx-auto overflow-hidden">
      <CardHeader className="text-center pb-2 bg-muted/30">
        <CardTitle className="text-lg">Blockchain Verification</CardTitle>
        <CardDescription>Scan to verify authenticity on-chain</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center pt-6 space-y-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-border">
          <QRCodeSVG 
            value={payload} 
            size={180} 
            level="H" 
            includeMargin={false}
            fgColor="#0f172a"
          />
        </div>
        
        <div className="w-full space-y-3">
          {verificationResult ? (
            <div className={`p-4 rounded-lg flex items-start gap-3 ${verificationResult.verified ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-900 border border-red-200'}`}>
              {verificationResult.verified ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-semibold text-sm">
                  {verificationResult.verified ? 'Authentic Prescription' : 'Verification Failed'}
                </p>
                <p className="text-xs opacity-80 break-all font-mono">
                  {verificationResult.blockchain_hash || "Hash mismatch or not found"}
                </p>
              </div>
            </div>
          ) : (
            <Button 
              variant="outline" 
              className="w-full font-medium" 
              onClick={handleVerify}
              disabled={verifying}
            >
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying on-chain...
                </>
              ) : (
                "Verify Now"
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
