"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button } from "@medsync/ui";
import { Upload, File, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

export default function UploadPrescriptionPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setStatus("idle");
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setStatus("idle");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // We attempt to upload to the "prescriptions" bucket.
      const { error: uploadError } = await supabase.storage
        .from('prescriptions')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Also create a DB record if needed. Usually handled by a trigger, but we'll do a simple insert.
      const { error: dbError } = await supabase.from('prescriptions').insert({
        patient_id: user.id,
        prescription_hash: filePath, // using this as reference
        is_dispensed: false,
        purpose: "General Medication"
      });

      if (dbError) throw dbError;

      setStatus("success");
      setTimeout(() => {
        router.push("/patient/prescriptions");
      }, 2000);

    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorMsg(err.message || "Failed to upload prescription.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pt-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Upload Prescription</h1>
        <p className="text-muted-foreground">
          Upload a digital copy or photo of your prescription. 
        </p>
      </div>

      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Select Document</CardTitle>
          <CardDescription>Supported formats: JPG, PNG, PDF (Max 5MB)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-border/60 rounded-xl p-10 bg-muted/20 relative group hover:bg-muted/40 hover:border-primary/50 transition-colors">
            <input 
              type="file" 
              accept=".jpg,.jpeg,.png,.pdf" 
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              disabled={uploading}
            />
            
            {file ? (
              <div className="flex flex-col items-center text-center">
                <File className="h-10 w-10 text-blue-500 mb-3" />
                <p className="font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="h-6 w-6 text-blue-500" />
                </div>
                <p className="font-medium text-foreground">Click or drag file to upload</p>
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {status === "error" && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-lg border border-red-500/20"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{errorMsg}</p>
              </motion.div>
            )}
            
            {status === "success" && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 text-sm text-emerald-500 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20"
              >
                <CheckCircle className="h-4 w-4 shrink-0" />
                <p>Prescription uploaded successfully. Redirecting...</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
            <Button variant="outline" onClick={() => router.back()} disabled={uploading}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!file || uploading || status === "success"}
              className="bg-blue-600 hover:bg-blue-500 text-white min-w-[120px]"
            >
              {uploading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading</>
              ) : (
                "Upload Document"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
