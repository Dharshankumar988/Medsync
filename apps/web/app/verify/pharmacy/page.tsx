"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input } from "@medsync/ui";
import { ShieldCheck, Search, ArrowRight, Store } from "lucide-react";

export default function PharmacyVerifyIndexPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = identifier.trim();
    if (!clean) return;
    router.push(`/verify/pharmacy/${encodeURIComponent(clean)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background py-16 px-4 flex items-center justify-center">
      <Card className="max-w-md w-full rounded-3xl border border-border/60 shadow-xl overflow-hidden bg-card/90 backdrop-blur-md">
        <CardHeader className="text-center pt-10 pb-4">
          <div className="h-16 w-16 mx-auto bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center mb-3">
            <Store className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold">Verify Pharmacy Node</CardTitle>
          <CardDescription className="text-sm">
            Enter the pharmacy QR token, ID, or scan code to verify its decentralized credentials and place an order.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-8 pt-2 space-y-4">
          <form onSubmit={handleSearch} className="space-y-3">
            <Input 
              placeholder="e.g. PHARM_QR_... or Pharmacy ID"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="h-12 rounded-xl"
            />
            <Button 
              type="submit" 
              disabled={!identifier.trim()} 
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-2"
            >
              <Search className="h-4 w-4" /> Verify Node
            </Button>
          </form>

          <div className="text-center pt-2">
            <Button 
              variant="ghost" 
              onClick={() => router.push("/patient/scan-qr")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Open Camera Scanner <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
