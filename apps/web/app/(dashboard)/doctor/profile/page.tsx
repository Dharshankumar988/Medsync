"use client";

import { useState, useEffect, useRef, ChangeEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { Button } from "@medsync/ui";
import { Input } from "@medsync/ui";
import { Badge } from "@medsync/ui";
import { UploadCloud, CheckCircle, XCircle, Image as ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";

export default function DoctorProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Image Upload State
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const userRes = await supabase.auth.getUser();
      if (!userRes.data.user) return;
      
      const session = await supabase.auth.getSession();
      const role = session.data.session?.user.user_metadata?.role || "DOCTOR";
      const status = session.data.session?.user.user_metadata?.status || "PENDING";
      
      setProfile({
        id: userRes.data.user.id,
        email: userRes.data.user.email,
        role: role,
        status: status,
        profile_image_url: null, 
        thumbnail_url: null
      });
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (file: File) => {
    setErrorMsg("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErrorMsg("Only JPG, PNG, and WEBP files are allowed.");
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("File size must be less than 5MB.");
      return false;
    }
    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        uploadFile(file);
      }
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        uploadFile(file);
      }
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadProgress(10);
    
    // Create local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const interval = setInterval(() => {
        setUploadProgress(prev => (prev < 90 ? prev + 10 : prev));
      }, 200);

      const response = await api.post('/api/v1/profile/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      clearInterval(interval);
      setUploadProgress(100);
      
      if (response.data?.data?.profile_image_url) {
        setPreviewUrl(response.data.data.profile_image_url);
        setProfile((prev: any) => ({ ...prev, profile_image_url: response.data.data.profile_image_url }));
      }
      
    } catch (err: any) {
      setUploadProgress(0);
      setPreviewUrl(null);
      setErrorMsg(err.response?.data?.detail || "Upload failed. Please try again.");
    } finally {
      setTimeout(() => setUploading(false), 500);
    }
  };

  if (loading) return <div>Loading profile...</div>;

  const isApproved = profile?.status === "ACTIVE";

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Professional Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your public profile and verification status.</p>
      </div>

      {!isApproved && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-4 rounded-xl flex items-start gap-3">
          <Loader2 className="w-5 h-5 mt-0.5 animate-spin shrink-0" />
          <div>
            <h3 className="font-medium">Account Pending Approval</h3>
            <p className="text-sm mt-1 opacity-80">
              Your account is currently under review by our administration team. 
              Certain features, including profile image uploads and prescription creation, are disabled until you are approved.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className={`col-span-1 border shadow-sm ${!isApproved ? 'opacity-70 pointer-events-none' : ''}`}>
          <CardHeader>
            <CardTitle>Profile Image</CardTitle>
            <CardDescription>Upload a professional photo.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            
            <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-muted bg-muted/30 flex items-center justify-center mb-6">
              {previewUrl || profile?.profile_image_url ? (
                <img 
                  src={previewUrl || profile?.profile_image_url} 
                  alt="Profile Preview" 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
              )}
              
              {uploading && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                  <span className="text-xs font-medium">{uploadProgress}%</span>
                </div>
              )}
            </div>

            <div 
              className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"} ${!isApproved && "opacity-50"}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => isApproved && fileInputRef.current?.click()}
            >
              <Input 
                ref={fileInputRef}
                type="file" 
                accept="image/jpeg, image/png, image/webp" 
                className="hidden" 
                onChange={handleChange}
                disabled={!isApproved || uploading}
              />
              <UploadCloud className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium mb-1">
                {isApproved ? "Click or drag image here" : "Upload disabled"}
              </p>
              <p className="text-xs text-muted-foreground">JPG, PNG, WEBP up to 5MB</p>
            </div>
            
            {errorMsg && (
              <p className="text-xs text-destructive mt-3 text-center flex items-center gap-1">
                <XCircle className="w-3 h-3" /> {errorMsg}
              </p>
            )}
            
            {previewUrl && !uploading && !errorMsg && (
              <p className="text-xs text-emerald-600 mt-3 text-center flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Upload successful
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-2 border shadow-sm">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Your details as they appear to patients.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <Input value={profile?.email || ""} disabled className="bg-muted/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <div>
                  <Badge variant={isApproved ? "default" : "secondary"}>{profile?.status}</Badge>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t mt-6">
              <Button disabled className="w-full sm:w-auto">Save Changes</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
