"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button } from "@medsync/ui";
import QRCode from "react-qr-code";
import { supabase } from "@/lib/supabase";
import { ShieldCheck, Share2, Download, Clock, RefreshCw } from "lucide-react";
import { authService } from "@/services/auth.service"; // Assume we need token to call backend if not supabase, actually we can get session from supabase

export default function QRProfilePage() {
  const [userId, setUserId] = useState<string>("");
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [selectedRx, setSelectedRx] = useState<string>("");
  const [qrToken, setQrToken] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        fetchPrescriptions(data.user.id);
      }
    });
  }, []);

  const fetchPrescriptions = async (uid: string) => {
    const { data } = await supabase.from('prescriptions').select('*').eq('patient_id', uid).order('created_at', { ascending: false });
    if (data && data.length > 0) {
      setPrescriptions(data);
      setSelectedRx(data[0].id);
    }
  };

  const generateQR = async () => {
    if (!selectedRx) return;
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const res = await fetch(`${baseUrl}/verify/qr/generate-secure`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          purpose: "PRESCRIPTION_ACCESS",
          resource_id: selectedRx,
          expires_in_minutes: 15,
          max_uses: 1
        })
      });
      const result = await res.json();
      if (res.ok) {
        setQrToken(result.data.token);
        // Use the server-provided expiry time
        const exp = result.data.expires_at ? new Date(result.data.expires_at) : new Date(Date.now() + 15 * 60000);
        setExpiresAt(exp);
      } else {
        alert(result.detail || "Failed to generate QR");
      }
    } catch (e) {
      console.error(e);
      alert("Error generating QR");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft("");
      return;
    }
    const interval = setInterval(() => {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft("Expired");
        setQrToken("");
        setExpiresAt(null);
        clearInterval(interval);
      } else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-in fade-in zoom-in-95 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
          Prescription QR Authorization
        </h1>
        <p className="text-muted-foreground mt-1">Generate a secure, temporary QR to allow a pharmacy to access your prescription.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="flex flex-col items-center text-center border-blue-500/20 shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent z-0" />
          <CardHeader className="relative z-10 w-full pb-0">
            <CardTitle>Dynamic Authorization QR</CardTitle>
            <CardDescription>Select a prescription and generate a short-lived token</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10 pt-6 pb-8 flex flex-col items-center w-full">
            <select 
              value={selectedRx} 
              onChange={(e) => setSelectedRx(e.target.value)}
              className="w-full max-w-xs mb-4 p-2 border rounded-md bg-background text-sm"
            >
              <option value="" disabled>Select a Prescription</option>
              {prescriptions.map(rx => (
                <option key={rx.id} value={rx.id}>
                  {rx.diagnosis} ({new Date(rx.created_at).toLocaleDateString()})
                </option>
              ))}
            </select>

            {qrToken ? (
              <div className="flex flex-col items-center">
                <div className="bg-white p-6 rounded-2xl shadow-sm border mb-4">
                  <QRCode value={qrToken} size={256} className="h-48 w-48" />
                </div>
                <div className="text-sm font-semibold text-rose-500 mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Expires in: {timeLeft}
                </div>
                <Button variant="outline" onClick={generateQR} className="w-full max-w-xs">
                  <RefreshCw className="h-4 w-4 mr-2" /> Regenerate QR
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center w-full mt-4">
                <div className="bg-muted p-12 rounded-2xl border mb-6 flex flex-col items-center justify-center opacity-50">
                  <ShieldCheck className="h-16 w-16 text-muted-foreground mb-2" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {timeLeft === "Expired" ? "QR Expired" : "No QR Generated"}
                  </span>
                </div>
                <Button onClick={generateQR} disabled={!selectedRx || loading} className="w-full max-w-xs bg-blue-600 hover:bg-blue-700">
                  {loading ? "Generating..." : (timeLeft === "Expired" ? "Generate New QR" : "Generate Secure QR")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" /> Purpose-Driven Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                This QR code represents a <strong>short-lived authorization token</strong> that grants temporary access to a specific resource.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Scoped Access:</strong> The pharmacy can only access the specific prescription you selected.</li>
                <li><strong>Short Expiry:</strong> Tokens expire automatically after 15 minutes.</li>
                <li><strong>No Embedded Data:</strong> The QR does not contain your medical history, keeping your data secure even if intercepted.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
