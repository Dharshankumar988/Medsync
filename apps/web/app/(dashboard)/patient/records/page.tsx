"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Skeleton, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, Input } from "@medsync/ui";
import { FileText, Upload, CheckCircle2, AlertCircle, FilePlus, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { toast } from "sonner";
import axios from "axios";
import { Share2 } from "lucide-react";
import api from "@/lib/api";

import { useAuth } from "@/components/providers/AuthProvider";
import { useSecurityEnrollment } from "@/hooks/useSecurityEnrollment";
import { useSecurityStore } from "@/store/useSecurityStore";
import { formatDoctorName } from "@/lib/formatDoctorName";

export default function MedicalRecordsPage() {
  const { user } = useAuth();
  const [userId, setUserId] = useState<string>("");
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPrescription, setIsPrescription] = useState(false);
  const [pin, setPin] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [sharePin, setSharePin] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [downloadRecordId, setDownloadRecordId] = useState<string | null>(null);
  const [downloadPin, setDownloadPin] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  // Security
  const { status, isLoading: isSecurityLoading } = useSecurityEnrollment(userId, user?.role?.toLowerCase());
  const { openEnrollmentModal } = useSecurityStore();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const loadRecords = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("medical_records")
        .select(`
          *,
          medical_record_versions(*)
        `)
        .eq("patient_id", userId)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });
        
      if (error) {
        console.error("Supabase error fetching medical records:", error);
        toast.error("Failed to load medical records");
      }
        
      if (data) {
        setRecords(data);
      }
    } catch (err) {
      console.error("Error loading records:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadDoctors = useCallback(async () => {
    if (!userId) return;
    try {
      // Get unique doctors from appointments
      const { data } = await supabase
        .from("appointments")
        .select("doctor_id, doctors(full_name, specialization)")
        .eq("patient_id", userId);
      
      if (data) {
        const uniqueDoctors = Array.from(new Set(data.map((a: any) => a.doctor_id)))
          .map(id => {
            const appt = data.find((a: any) => a.doctor_id === id);
            return {
              id,
              name: (appt as any)?.doctors?.full_name || "Unknown Doctor",
              specialization: (appt as any)?.doctors?.specialization || ""
            };
          });
        setDoctors(uniqueDoctors);
      }
    } catch (err) {
      console.error(err);
    }
  }, [userId]);

  useEffect(() => {
    loadRecords();
    loadDoctors();
  }, [loadRecords, loadDoctors]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Please select a file to upload");
      return;
    }

    if (!title) {
      toast.error("Please provide a title");
      return;
    }

    if (pin.length !== 6) {
      toast.error("Please enter your 6-digit Authorization PIN");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("description", description || "");
      formData.append("patient_id", userId);
      formData.append("is_prescription", String(isPrescription));
      formData.append("pin", pin);
      
      await api.post(`/api/v1/records`, formData);
      
      toast.success("Record uploaded successfully");
      setIsDialogOpen(false);
      setTitle("");
      setDescription("");
      setIsPrescription(false);
      setPin("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      loadRecords();
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.response?.data?.detail || "Failed to upload record");
    } finally {
      setIsUploading(false);
    }
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordId || !selectedDoctorId) return;
    if (sharePin.length !== 6) {
      toast.error("Please enter your 6-digit Authorization PIN");
      return;
    }
    
    setIsSharing(true);
    try {
      await api.post(`/api/v1/records/${selectedRecordId}/permissions`, {
        granted_to: selectedDoctorId,
        pin: sharePin
      });
      toast.success("Record shared successfully with Doctor");
      setIsShareDialogOpen(false);
      setSelectedRecordId(null);
      setSelectedDoctorId("");
      setSharePin("");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.detail || err?.response?.data?.message || "Failed to share record");
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!downloadRecordId) return;
    if (downloadPin.length !== 6) {
      toast.error("Please enter your 6-digit Authorization PIN");
      return;
    }

    setIsDownloading(true);
    try {
      const res = await api.post(`/api/v1/records/${downloadRecordId}/download`, {
        pin: downloadPin
      });
      const url = res.data.data.signed_url;
      window.open(url, "_blank");
      
      toast.success("Download started successfully");
      setIsDownloadDialogOpen(false);
      setDownloadRecordId(null);
      setDownloadPin("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to download record");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="relative space-y-8 pb-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-widest uppercase text-blue-500 mb-2">My Health</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.15]">
            Medical Records
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md leading-relaxed">
            View your documents, test results, and health history.
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="shrink-0"
              onClick={(e) => {
                const isPinEnrolled = status === 'COMPLETED' || status === 'PIN_CREATED';
                if (user?.role === "PATIENT" && !isPinEnrolled && !isSecurityLoading) {
                  e.preventDefault();
                  openEnrollmentModal(() => setIsDialogOpen(true));
                }
              }}
            >
              <FilePlus className="mr-2 h-4 w-4" /> Upload Record
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Medical Record</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title *</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Blood Test Results" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">File *</label>
                <Input type="file" ref={fileInputRef} required />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="is_prescription" 
                  checked={isPrescription}
                  onChange={(e) => setIsPrescription(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <label htmlFor="is_prescription" className="text-sm font-medium">This is a personal prescription (generates QR code)</label>
              </div>
              <div className="space-y-2 border-t border-border/40 pt-4 mt-2">
                <label className="text-sm font-medium text-blue-600">Authorization PIN *</label>
                <Input 
                  type="password" 
                  value={pin} 
                  onChange={e => setPin(e.target.value)} 
                  placeholder="• • • • • •" 
                  maxLength={6}
                  className="text-center tracking-[0.5em]"
                  required 
                />
              </div>
              <Button type="submit" className="w-full" disabled={isUploading || pin.length !== 6}>
                {isUploading ? "Uploading..." : "Upload Document"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Share Dialog */}
        <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share Medical Record</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleShare} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Doctor *</label>
                <select 
                  value={selectedDoctorId} 
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="">Select a doctor...</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{formatDoctorName(d.name)} ({d.specialization})</option>
                  ))}
                </select>
                {doctors.length === 0 && (
                  <p className="text-xs text-muted-foreground">You don&apos;t have any past or upcoming appointments with doctors yet.</p>
                )}
              </div>
              <div className="space-y-2 border-t border-border/40 pt-4 mt-2">
                <label className="text-sm font-medium text-blue-600">Authorization PIN *</label>
                <Input 
                  type="password" 
                  value={sharePin} 
                  onChange={e => setSharePin(e.target.value)} 
                  placeholder="• • • • • •" 
                  maxLength={6}
                  className="text-center tracking-[0.5em]"
                  required 
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSharing || !selectedDoctorId || sharePin.length !== 6}>
                {isSharing ? "Sharing..." : "Grant Access"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Download Dialog */}
        <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Download Medical Record</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleDownload} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-blue-600">Authorization PIN *</label>
                <Input 
                  type="password" 
                  value={downloadPin} 
                  onChange={e => setDownloadPin(e.target.value)} 
                  placeholder="• • • • • •" 
                  maxLength={6}
                  className="text-center tracking-[0.5em]"
                  required 
                />
              </div>
              <Button type="submit" className="w-full" disabled={isDownloading || downloadPin.length !== 6}>
                {isDownloading ? "Preparing Download..." : "Download Record"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      ) : records.length === 0 ? (
        <Card className="rounded-2xl border border-dashed bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">No records found</p>
            <p className="text-sm text-muted-foreground">Upload your first medical record to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative space-y-6 before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/60 before:to-transparent">
          {records.map(record => {
            const currentVersion = record.medical_record_versions?.find((v: any) => v.is_current) || record.medical_record_versions?.[0];
            const blockchainStatus = currentVersion?.blockchain_status || 'PENDING';
            
            let dotColor = "bg-muted border-muted-foreground/30";
            if (blockchainStatus === 'CONFIRMED' || blockchainStatus === 'VERIFIED') {
              dotColor = "bg-emerald-500 border-emerald-200 dark:border-emerald-900";
            } else if (blockchainStatus === 'PENDING') {
              dotColor = "bg-yellow-500 border-yellow-200 dark:border-yellow-900";
            } else {
              dotColor = "bg-rose-500 border-rose-200 dark:border-rose-900";
            }
            
            return (
              <div key={record.id} className="relative flex items-start group">
                <div className="flex items-center justify-center w-6 h-6 rounded-full border-4 shrink-0 shadow-sm z-10 bg-background mr-6 mt-6">
                  <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                </div>
                
                <Card className="flex-1 overflow-hidden rounded-2xl border border-border/60 bg-card/50 transition-all hover:-translate-y-1 hover:shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 mb-3">
                        <FileText className="h-5 w-5 text-violet-500" />
                      </div>
                      {blockchainStatus === 'CONFIRMED' || blockchainStatus === 'VERIFIED' ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                          <AlertCircle className="mr-1 h-3 w-3" /> Integrity Verification Unavailable
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base">{record.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {record.description || "No description provided."}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                      <span className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide">
                        {new Date(record.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-xs hover:bg-muted" 
                          onClick={() => {
                            const isPinEnrolled = status === 'COMPLETED' || status === 'PIN_CREATED';
                            if (user?.role === "PATIENT" && !isPinEnrolled && !isSecurityLoading) {
                              openEnrollmentModal(() => {
                                setSelectedRecordId(record.id);
                                setIsShareDialogOpen(true);
                              });
                              return;
                            }
                            setSelectedRecordId(record.id);
                            setIsShareDialogOpen(true);
                          }}
                        >
                          <Share2 className="mr-1.5 h-3.5 w-3.5" /> Share
                        </Button>
                        {currentVersion && (
                          <Button variant="ghost" size="sm" className="h-8 text-xs text-blue-500 hover:text-blue-600" onClick={() => {
                            const isPinEnrolled = status === 'COMPLETED' || status === 'PIN_CREATED';
                            if (user?.role === "PATIENT" && !isPinEnrolled && !isSecurityLoading) {
                              openEnrollmentModal(() => {
                                setDownloadRecordId(record.id);
                                setIsDownloadDialogOpen(true);
                              });
                              return;
                            }
                            setDownloadRecordId(record.id);
                            setIsDownloadDialogOpen(true);
                          }}>
                            <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
