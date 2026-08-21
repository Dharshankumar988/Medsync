"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@medsync/ui";
import { Button } from "@medsync/ui";
import { Input } from "@medsync/ui";
import { Loader2, Building, Building2 } from "lucide-react";
import { profileService, ProfileCompletionData } from "@/services/profile.service";
import { hospitalService, Hospital } from "@/services/hospital.service";
import { ImageUpload } from "./ImageUpload";
import { Textarea } from "@medsync/ui"; // Ensure you export Textarea from @medsync/ui or handle it

interface ProfileWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  role: string;
  onComplete: (percentage: number) => void;
}

export function ProfileWizardModal({ isOpen, onClose, userId, role, onComplete }: ProfileWizardModalProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<any>({});
  
  // Specific for doctor
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isIndependent, setIsIndependent] = useState(false);

  useEffect(() => {
    if (role === "doctor" && isOpen) {
      hospitalService.getHospitals().then(res => setHospitals(res.data.data)).catch(console.error);
    }
  }, [role, isOpen]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleImageUpload = (field: string, base64: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: base64 }));
  };

  const calculatePercentage = useCallback(() => {
    return 100; // Simulated full completion on finish
  }, []);

  const handleComplete = useCallback(async () => {
    setIsLoading(true);
    try {
      const percentage = calculatePercentage();
      const payload: ProfileCompletionData = {
        profile_completion_percentage: percentage,
        ...formData
      };
      
      await profileService.updateProfileCompletion(userId, payload);
      onComplete(percentage);
      onClose();
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setIsLoading(false);
    }
  }, [formData, userId, onComplete, onClose, calculatePercentage]);

  const renderCommonFields = () => (
    <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-6 animate-in fade-in zoom-in-95">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium block mb-2">Profile Picture</label>
            <ImageUpload onUpload={(url) => handleImageUpload("profile_picture_url", url)} label="Upload Profile Picture" />
          </div>
        </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Bio / About</label>
        <textarea 
          name="bio"
          onChange={handleChange}
          required
          className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Tell us about yourself..."
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Languages Spoken</label>
        <Input placeholder="e.g. English, Spanish" name="languages_spoken" onChange={handleChange} required />
      </div>
      <Button type="submit" className="w-full mt-4">Next Step</Button>
    </form>
  );

  const renderPatientStep2 = () => (
    <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="space-y-4 animate-in slide-in-from-right">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Date of Birth</label>
          <Input type="date" name="date_of_birth" onChange={handleChange} required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Gender</label>
          <Input placeholder="Gender" name="gender" onChange={handleChange} required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Blood Group</label>
          <Input placeholder="e.g. O+" name="blood_group" onChange={handleChange} required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Phone Number</label>
          <Input placeholder="Phone Number" name="phone_number" onChange={handleChange} required />
        </div>
      </div>
      <Button type="submit" className="w-full mt-4">Next Step</Button>
    </form>
  );

  const renderPatientStep3 = () => (
    <form onSubmit={(e) => { e.preventDefault(); handleComplete(); }} className="space-y-4 animate-in slide-in-from-right">
      <div className="space-y-2">
        <label className="text-sm font-medium">Address</label>
        <Input placeholder="Full Address" name="address" onChange={handleChange} required />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Emergency Contact</label>
        <div className="flex gap-2">
           <Input placeholder="Name" name="emergency_contact_name" onChange={handleChange} required />
           <Input placeholder="Phone" name="emergency_contact_number" onChange={handleChange} required />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Allergies</label>
        <Input placeholder="e.g. Peanuts, Penicillin" name="allergies" onChange={handleChange} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Chronic Diseases</label>
        <Input placeholder="e.g. Diabetes, Hypertension" name="chronic_diseases" onChange={handleChange} />
      </div>
      <div className="flex gap-2 mt-4">
        <Button type="button" variant="outline" className="w-full" onClick={() => setStep(2)}>Back</Button>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : "Complete Profile"}
        </Button>
      </div>
    </form>
  );

  const renderDoctorStep2 = () => (
    <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="space-y-4 animate-in slide-in-from-right">
      <div className="space-y-2">
        <label className="text-sm font-medium">Medical Council Reg. Number</label>
        <Input placeholder="Registration Number" name="medical_council_reg_number" onChange={handleChange} required />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">License Number</label>
        <Input placeholder="License Number" name="license_number" onChange={handleChange} required />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Qualifications</label>
        <Input placeholder="e.g. MBBS, MD" name="qualifications" onChange={handleChange} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
         <div className="space-y-2">
           <label className="text-sm font-medium">Years of Experience</label>
           <Input type="number" placeholder="0" name="experience_years" onChange={handleChange} required />
         </div>
         <div className="space-y-2">
           <label className="text-sm font-medium">Consultation Timings</label>
           <Input placeholder="e.g. 9 AM - 5 PM" name="consultation_hours" onChange={handleChange} required />
         </div>
      </div>
      <Button type="submit" className="w-full mt-4">Next Step</Button>
    </form>
  );

  const renderDoctorStep3 = () => (
    <form onSubmit={(e) => { e.preventDefault(); handleComplete(); }} className="space-y-4 animate-in slide-in-from-right">
      <div className="flex flex-col gap-4 mb-4">
        <Button type="button" variant={!isIndependent ? "default" : "outline"} className="justify-start h-auto p-4" onClick={() => setIsIndependent(false)}>
          <Building2 className="h-5 w-5 mr-3" />
          <div className="text-left">
            <div className="font-semibold">Associated with Hospital</div>
            <div className="text-xs opacity-80">Select from verified hospitals</div>
          </div>
        </Button>
        <Button type="button" variant={isIndependent ? "default" : "outline"} className="justify-start h-auto p-4" onClick={() => setIsIndependent(true)}>
          <Building className="h-5 w-5 mr-3" />
          <div className="text-left">
            <div className="font-semibold">Independent Clinic</div>
            <div className="text-xs opacity-80">Enter your clinic details</div>
          </div>
        </Button>
      </div>

      {!isIndependent ? (
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Verified Hospital</label>
          <select 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            name="hospital_id"
            onChange={(e: any) => setFormData({...formData, hospital_id: e.target.value})}
            required
          >
            <option value="">Select a hospital...</option>
            {hospitals.map(h => (
              <option key={h.id} value={h.id}>{h.name} - {h.city}</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="space-y-3 animate-in fade-in zoom-in-95">
          <Input placeholder="Clinic Name" name="clinic_name" onChange={handleChange} required />
          <Input placeholder="Address" name="clinic_address" onChange={handleChange} required />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="City" name="city" onChange={handleChange} required />
            <Input placeholder="Phone" name="clinic_phone" onChange={handleChange} required />
          </div>
        </div>
      )}
      
      <div className="flex gap-2 mt-6">
        <Button type="button" variant="outline" className="w-full" onClick={() => setStep(2)}>Back</Button>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : "Complete Profile"}
        </Button>
      </div>
    </form>
  );

  const renderPharmacyStep2 = () => (
    <form onSubmit={(e) => { e.preventDefault(); handleComplete(); }} className="space-y-4 animate-in slide-in-from-right">
      <div className="space-y-2">
        <label className="text-sm font-medium">GST Number</label>
        <Input placeholder="GST Number" name="gst_number" onChange={handleChange} required />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Drug License Number</label>
        <Input placeholder="Drug License" name="license_number" onChange={handleChange} required />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Business Reg. Number</label>
        <Input placeholder="Reg Number" name="business_registration_number" onChange={handleChange} required />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Address / Location</label>
        <Input placeholder="Full Address" name="address" onChange={handleChange} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
         <div className="space-y-2">
           <label className="text-sm font-medium">Store Timings</label>
           <Input placeholder="e.g. 24x7 or 9AM-9PM" name="operating_hours" onChange={handleChange} required />
         </div>
         <div className="space-y-2">
           <label className="text-sm font-medium">Working Days</label>
           <Input placeholder="e.g. Mon-Sat" name="working_days" onChange={handleChange} required />
         </div>
      </div>
      <div className="flex gap-2 mt-4">
        <Button type="button" variant="outline" className="w-full" onClick={() => setStep(1)}>Back</Button>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : "Complete Profile"}
        </Button>
      </div>
    </form>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Profile Completion (Step {step})</DialogTitle>
          <DialogDescription>
            Provide the required details to verify your account and unlock all features.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {step === 1 && renderCommonFields()}

          {role === 'patient' && step === 2 && renderPatientStep2()}
          {role === 'patient' && step === 3 && renderPatientStep3()}
          
          {role === 'doctor' && step === 2 && renderDoctorStep2()}
          {role === 'doctor' && step === 3 && renderDoctorStep3()}

          {role === 'pharmacy' && step === 2 && renderPharmacyStep2()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
