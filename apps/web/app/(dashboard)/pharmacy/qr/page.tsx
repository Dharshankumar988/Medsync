"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button } from "@medsync/ui";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";
import { MapPin, ShieldCheck, Download, Printer } from "lucide-react";
import { Skeleton } from "@medsync/ui";

export default function PharmacyQRPage() {
  const [pharmacyId, setPharmacyId] = useState<string | null>(null);
  const [pharmacyName, setPharmacyName] = useState<string>("Loading Pharmacy...");

  useEffect(() => {
    async function loadPharmacy() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setPharmacyId(user.id);
        const { data } = await supabase.from('users').select('full_name, email').eq('id', user.id).single();
        if (data) {
          setPharmacyName(data.full_name || data.email || "MedSync Pharmacy");
        }
      }
    }
    loadPharmacy();
  }, []);

  if (!pharmacyId) {
    return (
      <div className="max-w-md mx-auto mt-10">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  // The QR strictly contains the backend identifier, no sensitive info.
  // Using a scheme like medsync:pharmacy:{id}
  const qrData = `medsync:pharmacy:${pharmacyId}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pt-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Pharmacy Identity QR</h1>
        <p className="text-muted-foreground">
          Patients can scan this fixed QR code to securely send their prescriptions directly to your pharmacy during physical visits.
        </p>
      </div>

      <Card className="rounded-3xl border border-amber-500/30 shadow-lg shadow-amber-500/5 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.03] to-transparent pointer-events-none" />
        
        <CardHeader className="text-center pb-2 border-b border-border/40 bg-muted/20">
          <Badge className="mx-auto mb-2 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 rounded-md">Official MedSync Node</Badge>
          <CardTitle className="text-2xl font-bold">{pharmacyName}</CardTitle>
          <CardDescription className="flex items-center justify-center gap-1 mt-1">
            <MapPin className="h-3 w-3" /> Registered Pharmacy location
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex flex-col items-center p-10 bg-white">
          <div className="relative p-4 bg-white rounded-2xl shadow-sm border border-border/40">
            <QRCodeSVG 
              value={qrData}
              size={256}
              level={"H"}
              includeMargin={true}
              className="rounded-xl"
            />
            {/* MedSync Logo Overlay could go here */}
          </div>
          
          <div className="mt-8 text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-emerald-600 font-medium">
              <ShieldCheck className="h-5 w-5" />
              Secure Identity Hash
            </div>
            <p className="text-sm text-slate-500 max-w-sm">
              This QR code permanently identifies your pharmacy. It does not contain sensitive patient or prescription data.
            </p>
          </div>
        </CardContent>
        
        <div className="flex border-t border-border/40 bg-muted/20 p-4 gap-3 justify-center">
          <Button variant="outline" className="gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print Display
          </Button>
          <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold gap-2">
            <Download className="h-4 w-4" /> Download SVG
          </Button>
        </div>
      </Card>
    </div>
  );
}

// Inline Badge since it's not exported from UI
function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold ${className}`}>{children}</span>
}
