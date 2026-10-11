"use client";

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./card";
import { ShieldCheck } from 'lucide-react';

interface PrescriptionQRProps {
  prescriptionId: string;
  patientId?: string;
  doctorId?: string;
  qrToken?: string;
  hash?: string;
}

export function PrescriptionQR({ prescriptionId, patientId, doctorId, qrToken, hash }: PrescriptionQRProps) {
  const payload = qrToken || (prescriptionId ? `MS-RX-${prescriptionId}` : "");

  return (
    <Card className="w-full max-w-sm mx-auto overflow-hidden border border-border shadow-sm">
      <CardHeader className="text-center pb-2 bg-muted/20">
        <div className="mx-auto mb-1 flex items-center justify-center gap-1.5 text-emerald-600 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>Decentralized Verification</span>
        </div>
        <CardTitle className="text-base font-bold">Prescription QR</CardTitle>
        <CardDescription className="text-xs">
          Scan at any MedSync network pharmacy to dispense
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center pt-5 pb-5 space-y-4">
        <div className="bg-white p-3.5 rounded-2xl shadow-inner border border-slate-200">
          <QRCodeSVG 
            value={payload} 
            size={180} 
            level="H" 
            includeMargin={true}
            fgColor="#0f172a"
          />
        </div>
        
        <div className="w-full text-center space-y-1">
          <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
            TOKEN ID: {qrToken ? (qrToken.length > 28 ? `${qrToken.slice(0, 14)}...${qrToken.slice(-10)}` : qrToken) : (prescriptionId ? `MS-RX-${prescriptionId.slice(0, 8)}...` : "PENDING")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
