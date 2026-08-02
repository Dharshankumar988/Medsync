"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@medsync/ui";
import { Button } from "@medsync/ui";
import { Input } from "@medsync/ui";
import { Loader2, Building, Building2, MapPin, Search } from "lucide-react";
import { profileService, ProfileCompletionData } from "@/services/profile.service";
import { hospitalService, Hospital } from "@/services/hospital.service";

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

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const calculatePercentage = useCallback(() => {
    // Basic calculation depending on role
    // This could be more sophisticated
    return 100;
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

  const renderPatientStep1 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Date of Birth</label>
          <Input type="date" name="date_of_birth" onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Gender</label>
          <Input placeholder="Gender" name="gender" onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Blood Group</label>
          <Input placeholder="e.g. O+" name="blood_group" onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Phone Number</label>
          <Input placeholder="Phone Number" name="phone_number" onChange={handleChange} />
        </div>
      </div>
      <Button className="w-full mt-4" onClick={() => setStep(2)}>Next Step</Button>
    </div>
  );

  const renderPatientStep2 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Address</label>
        <Input placeholder="Full Address" name="address" onChange={handleChange} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">City</label>
          <Input placeholder="City" name="city" onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">State</label>
          <Input placeholder="State" name="state" onChange={handleChange} />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Emergency Contact</label>
        <Input placeholder="Name" name="emergency_contact_name" onChange={handleChange} className="mb-2" />
        <Input placeholder="Phone" name="emergency_contact_number" onChange={handleChange} />
      </div>
      <div className="flex gap-2 mt-4">
        <Button variant="outline" className="w-full" onClick={() => setStep(1)}>Back</Button>
        <Button className="w-full" onClick={handleComplete} disabled={isLoading}>
          {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : "Complete Profile"}
        </Button>
      </div>
    </div>
  );

  const renderDoctorStep1 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Medical Council Reg. Number</label>
        <Input placeholder="Registration Number" name="medical_council_reg_number" onChange={handleChange} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">License Number</label>
        <Input placeholder="License Number" name="license_number" onChange={handleChange} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Qualifications</label>
        <Input placeholder="e.g. MBBS, MD" name="qualifications" onChange={handleChange} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Years of Experience</label>
        <Input type="number" placeholder="0" name="experience_years" onChange={handleChange} />
      </div>
      <Button className="w-full mt-4" onClick={() => setStep(2)}>Next Step</Button>
    </div>
  );

  const renderDoctorStep2 = () => (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 mb-4">
        <Button variant={!isIndependent ? "default" : "outline"} className="justify-start h-auto p-4" onClick={() => setIsIndependent(false)}>
          <Building2 className="h-5 w-5 mr-3" />
          <div className="text-left">
            <div className="font-semibold">Associated with Hospital</div>
            <div className="text-xs opacity-80">Select from verified hospitals</div>
          </div>
        </Button>
        <Button variant={isIndependent ? "default" : "outline"} className="justify-start h-auto p-4" onClick={() => setIsIndependent(true)}>
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
            onChange={(e) => setFormData({...formData, hospital_id: e.target.value})}
          >
            <option value="">Select a hospital...</option>
            {hospitals.map(h => (
              <option key={h.id} value={h.id}>{h.name} - {h.city}</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="space-y-3 animate-in fade-in zoom-in-95">
          <Input placeholder="Clinic Name" name="clinic_name" onChange={handleChange} />
          <Input placeholder="Address" name="clinic_address" onChange={handleChange} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="City" name="city" onChange={handleChange} />
            <Input placeholder="Phone" name="clinic_phone" onChange={handleChange} />
          </div>
        </div>
      )}
      
      <div className="flex gap-2 mt-6">
        <Button variant="outline" className="w-full" onClick={() => setStep(1)}>Back</Button>
        <Button className="w-full" onClick={handleComplete} disabled={isLoading}>
          {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : "Complete Profile"}
        </Button>
      </div>
    </div>
  );

  const renderPharmacyStep1 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">GST Number</label>
        <Input placeholder="GST Number" name="gst_number" onChange={handleChange} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Drug License Number</label>
        <Input placeholder="Drug License" name="license_number" onChange={handleChange} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Business Reg. Number</label>
        <Input placeholder="Reg Number" name="business_registration_number" onChange={handleChange} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Address</label>
        <Input placeholder="Full Address" name="address" onChange={handleChange} />
      </div>
      <Button className="w-full mt-4" onClick={handleComplete} disabled={isLoading}>
        {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : "Complete Profile"}
      </Button>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Profile Completion (Step {step})</DialogTitle>
          <DialogDescription>
            Provide the required details to verify your account and unlock all features.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {role === 'patient' && step === 1 && renderPatientStep1()}
          {role === 'patient' && step === 2 && renderPatientStep2()}
          
          {role === 'doctor' && step === 1 && renderDoctorStep1()}
          {role === 'doctor' && step === 2 && renderDoctorStep2()}

          {role === 'pharmacy' && renderPharmacyStep1()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
