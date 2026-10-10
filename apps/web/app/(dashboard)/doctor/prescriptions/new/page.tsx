"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@medsync/ui";
import { ArrowLeft, Save, Loader2, Pill, Plus, Trash2, ShieldCheck, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { toast } from "sonner";
import axios from "axios";
import api from "@/lib/api";
import { getApiUrl } from "@/lib/backend-config";

export default function CreatePrescriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const apptId = searchParams.get('appointment_id');
  const preselectedPatientId = searchParams.get('patient_id');

  const [userId, setUserId] = useState<string>("");
  const [patients, setPatients] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [linkedPharmacies, setLinkedPharmacies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [patientId, setPatientId] = useState<string>(preselectedPatientId || "");
  const [routedPharmacyId, setRoutedPharmacyId] = useState<string>("");
  const [diagnosis, setDiagnosis] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [items, setItems] = useState<any[]>([
    { medicine_name: "", dosage: "", frequency: "1-0-1", duration_days: 5, instructions: "" }
  ]);

  // Add Medicine Modal State
  const [isAddMedModalOpen, setIsAddMedModalOpen] = useState(false);
  const [newMedName, setNewMedName] = useState("");
  const [newMedBrand, setNewMedBrand] = useState("");
  const [addingMed, setAddingMed] = useState(false);

  // Link Clinic Pharmacy Modal State
  const [isLinkPharmacyModalOpen, setIsLinkPharmacyModalOpen] = useState(false);
  const [pharmacyToLink, setPharmacyToLink] = useState("");
  const [linkingPharmacy, setLinkingPharmacy] = useState(false);

  // PIN Authorization State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [pinMode, setPinMode] = useState<"create" | "verify">("verify");
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
    fetchCatalog();
    // Check if doctor has enrolled PIN
    if (userId) {
      checkDoctorPinStatus();
    }
  }, [userId]);

  const checkDoctorPinStatus = async () => {
    try {
      const res = await api.get('/api/v1/security/status');
      setHasPin(res.data.data?.has_pin || false);
    } catch (err) {
      console.error("Failed to check PIN status");
    }
  };

  const fetchCatalog = async () => {
    try {
      const res = await api.get('/api/v1/medicines/');
      if (res.data && res.data.data) {
        setCatalog(res.data.data.sort((a: any, b: any) => a.name.localeCompare(b.name)));
      }
    } catch (err) {
      console.error("Failed to load medicines catalog");
    }
  };

  useEffect(() => {
    if (!userId) return;

    // Load authorized patients for the dropdown
    async function fetchPatients() {
      try {
        const { data: appts } = await supabase.from('appointments').select('patient_id').eq('doctor_id', userId);
        const { data: pres } = await supabase.from('prescriptions').select('patient_id').eq('doctor_id', userId);
        
        const ids = Array.from(new Set([
          ...(appts?.map((a: any) => a.patient_id) || []),
          ...(pres?.map((p: any) => p.patient_id) || []),
          preselectedPatientId
        ].filter(Boolean)));

        if (ids.length > 0) {
          const { data } = await supabase.from('patients').select('user_id, full_name').in('user_id', ids);
          setPatients(data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    async function fetchPharmacies() {
      try {
        const [docRes, pharmsRes, affilsRes] = await Promise.all([
          supabase.from("doctors").select("hospital_id, clinic_name").eq("user_id", userId).single(),
          supabase.from("pharmacies").select("*"),
          supabase.from("doctor_pharmacy_affiliations").select("pharmacy_id").eq("doctor_id", userId).eq("status", "ACTIVE")
        ]);

        const doctorProfile = docRes.data;
        const pharmacyProfiles = pharmsRes.data || [];
        const affiliatedIds = new Set((affilsRes.data || []).map((a: any) => a.pharmacy_id));
          
        if (pharmacyProfiles.length > 0) {
          const userIds = pharmacyProfiles.map(p => p.user_id);
          const { data: usersData } = await supabase
            .from("users")
            .select("id, full_name, status")
            .in("id", userIds)
            .eq("status", "ACTIVE");
            
          const mapped = pharmacyProfiles
            .map(profile => {
               const user = usersData?.find(u => u.id === profile.user_id);
               if (!user) return null;
               
               const isLinked = affiliatedIds.has(profile.user_id) || (doctorProfile && (
                 (profile.hospital_id && doctorProfile.hospital_id && profile.hospital_id === doctorProfile.hospital_id) ||
                 (profile.clinic_name && doctorProfile.clinic_name && profile.clinic_name === doctorProfile.clinic_name)
               ));
               
               return { ...profile, ...user, isLinked };
            })
            .filter(Boolean);
            
          setLinkedPharmacies(mapped);
        }
      } catch (err) {
        console.error("Failed to fetch pharmacies", err);
      }
    }

    fetchPatients();
    fetchPharmacies();
  }, [userId, preselectedPatientId]);

  const handleAddItem = () => {
    setItems([...items, { medicine_name: "", dosage: "", frequency: "1-0-1", duration_days: 5, instructions: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    if (field === "medicine_name" && value === "__ADD_NEW__") {
      setIsAddMedModalOpen(true);
      return;
    }
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleAddNewMedicine = async () => {
    if (!newMedName) {
      toast.error("Medicine name is required");
      return;
    }
    setAddingMed(true);
    try {
      const res = await api.post('/api/v1/medicines/', {
        name: newMedName,
        brand_name: newMedBrand || null
      });
      const newMed = res.data.data;
      const updatedCatalog = [...catalog, newMed].sort((a: any, b: any) => a.name.localeCompare(b.name));
      setCatalog(updatedCatalog);
      
      // Auto-select the newly added medicine for the last item with an empty medicine_name
      const emptyIndex = items.findIndex(item => !item.medicine_name);
      if (emptyIndex !== -1) {
        const newItems = [...items];
        newItems[emptyIndex].medicine_name = newMed.name;
        setItems(newItems);
      }
      
      toast.success("Medicine added to global database");
      setIsAddMedModalOpen(false);
      setNewMedName("");
      setNewMedBrand("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add medicine");
    } finally {
      setAddingMed(false);
    }
  };

  const handleLinkPharmacy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pharmacyToLink) {
      toast.error("Please select a pharmacy to link");
      return;
    }
    setLinkingPharmacy(true);
    try {
      await supabase.from("doctor_pharmacy_affiliations").upsert({
        doctor_id: userId,
        pharmacy_id: pharmacyToLink,
        status: "ACTIVE"
      });
      toast.success("Pharmacy linked to your clinic practice");
      setRoutedPharmacyId(pharmacyToLink);
      setIsLinkPharmacyModalOpen(false);
      setPharmacyToLink("");

      // Refresh pharmacies
      const [docRes, pharmsRes, affilsRes] = await Promise.all([
        supabase.from("doctors").select("hospital_id, clinic_name").eq("user_id", userId).single(),
        supabase.from("pharmacies").select("*"),
        supabase.from("doctor_pharmacy_affiliations").select("pharmacy_id").eq("doctor_id", userId).eq("status", "ACTIVE")
      ]);
      const doctorProfile = docRes.data;
      const pharmacyProfiles = pharmsRes.data || [];
      const affiliatedIds = new Set((affilsRes.data || []).map((a: any) => a.pharmacy_id));
      if (pharmacyProfiles.length > 0) {
        const userIds = pharmacyProfiles.map(p => p.user_id);
        const { data: usersData } = await supabase.from("users").select("id, full_name, status").in("id", userIds).eq("status", "ACTIVE");
        const mapped = pharmacyProfiles.map(profile => {
          const user = usersData?.find(u => u.id === profile.user_id);
          if (!user) return null;
          const isLinked = affiliatedIds.has(profile.user_id) || (doctorProfile && (
            (profile.hospital_id && doctorProfile.hospital_id && profile.hospital_id === doctorProfile.hospital_id) ||
            (profile.clinic_name && doctorProfile.clinic_name && profile.clinic_name === doctorProfile.clinic_name)
          ));
          return { ...profile, ...user, isLinked };
        }).filter(Boolean);
        setLinkedPharmacies(mapped);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to link pharmacy");
    } finally {
      setLinkingPharmacy(false);
    }
  };

  const handleSave = async () => {
    if (!patientId) {
      toast.error("Please select a patient");
      return;
    }
    if (!diagnosis) {
      toast.error("Please enter a diagnosis");
      return;
    }

    const validItems = items.filter(item => item.medicine_name && item.dosage);
    if (validItems.length === 0) {
      toast.error("Please add at least one valid medicine");
      return;
    }

    // Check PIN status if not already checked
    if (hasPin === null) {
      await checkDoctorPinStatus();
    }

    // Set PIN mode based on whether doctor has enrolled a PIN
    setPinMode(hasPin ? "verify" : "create");
    setPin("");
    setIsPinModalOpen(true);
  };

  const handleConfirmSave = async () => {
    if (pin.length !== 6) {
      toast.error("PIN must be 6 digits");
      return;
    }

    setSaving(true);
    try {
      // If creating PIN for first time, enroll it first
      if (pinMode === "create") {
        if (!currentPassword) {
          toast.error("Please enter your account password");
          setSaving(false);
          return;
        }
        
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;
        const apiUrl = getApiUrl();

        const formData = new FormData();
        formData.append('new_pin', pin);
        formData.append('current_password', currentPassword);

        await axios.post(`${apiUrl}/security/reset-pin-with-password`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });

        toast.success("PIN created successfully");
        setHasPin(true);
      }

      // Now create the prescription with PIN verification
      const validItems = items.filter(item => item.medicine_name && item.dosage).map(item => ({
        medicine_name: item.medicine_name,
        dosage: item.dosage,
        frequency: item.frequency,
        duration_days: parseInt(item.duration_days),
        instructions: item.instructions || "Take as directed"
      }));

      const payload = {
        appointment_id: apptId || undefined,
        patient_id: patientId,
        diagnosis,
        notes,
        items: validItems,
        pin: pin,
        routed_pharmacy_id: routedPharmacyId || undefined
      };

      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const apiUrl = getApiUrl();

      await axios.post(`${apiUrl}/prescriptions/`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Prescription finalized and signed securely");
      setIsPinModalOpen(false);
      router.push('/doctor/prescriptions');
    } catch (err: any) {
      console.error(err);
      if (pinMode === "create") {
        toast.error(err.response?.data?.detail || "Failed to create PIN");
      } else {
        toast.error(err.response?.data?.detail || "Failed to create prescription or invalid PIN");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/doctor/prescriptions"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">New Prescription</h1>
            <p className="text-muted-foreground mt-1">Issue a secure, digitally signed prescription.</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 py-1.5 px-3">
          <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Dynamic QR Ready
        </Badge>
      </div>

      <div className="grid gap-6">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Patient Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Patient</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                >
                  <option value="">Select a patient...</option>
                  {patients.map(p => (
                    <option key={p.user_id} value={p.user_id}>{p.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Diagnosis</label>
                <Input placeholder="e.g. Acute Viral Pharyngitis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Additional Notes</label>
                <Input placeholder="e.g. Drink plenty of fluids, rest for 3 days" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Route to Pharmacy
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsLinkPharmacyModalOpen(true)}
                    className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    + Link Clinic Pharmacy
                  </button>
                </div>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={routedPharmacyId}
                  onChange={(e) => setRoutedPharmacyId(e.target.value)}
                >
                  <option value="">Give patient physical/digital copy only (Default to Patient)</option>
                  <optgroup label="Linked Clinic Partners (Your Clinic)">
                    {linkedPharmacies.filter(p => p.isLinked).map(p => (
                      <option key={p.user_id} value={p.user_id}>{p.full_name || p.business_name} (Linked Clinic Partner)</option>
                    ))}
                  </optgroup>
                  <optgroup label="Other Network Pharmacies">
                    {linkedPharmacies.filter(p => !p.isLinked).map(p => (
                      <option key={p.user_id} value={p.user_id}>{p.full_name || p.business_name}</option>
                    ))}
                  </optgroup>
                </select>
                <p className="text-[11px] text-muted-foreground">
                  The prescription is automatically sent to the patient upon creation. Selecting a clinic pharmacy also routes an order directly to their dispensing queue.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Medicines</CardTitle>
              <CardDescription>Search and add medicines from the global database.</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={handleAddItem}>
              <Plus className="w-4 h-4 mr-1" /> Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="p-4 bg-muted/40 border border-border/50 rounded-xl relative group">
                <div className="absolute -top-3 -left-3 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                  {index + 1}
                </div>
                {items.length > 1 && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-background border shadow-sm text-destructive hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveItem(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
                
                <div className="grid md:grid-cols-12 gap-4">
                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Medicine Name</label>
                    <div className="relative">
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={item.medicine_name}
                        onChange={(e) => handleItemChange(index, "medicine_name", e.target.value)}
                      >
                        <option value="">Select or search...</option>
                        {catalog.map(c => (
                          <option key={c.id} value={c.name}>{c.name} {c.brand_name ? `(${c.brand_name})` : ''}</option>
                        ))}
                        <option value="__ADD_NEW__" className="text-primary font-bold bg-primary/5">+ Add New Medicine...</option>
                      </select>
                    </div>
                  </div>
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Dosage</label>
                    <Input placeholder="e.g. 1 Tablet" className="bg-background" value={item.dosage} onChange={(e) => handleItemChange(index, "dosage", e.target.value)} />
                  </div>
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Frequency</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={item.frequency}
                      onChange={(e) => handleItemChange(index, "frequency", e.target.value)}
                    >
                      <option value="1-0-0">1-0-0 (Morning)</option>
                      <option value="0-1-0">0-1-0 (Afternoon)</option>
                      <option value="0-0-1">0-0-1 (Night)</option>
                      <option value="1-0-1">1-0-1 (Morning & Night)</option>
                      <option value="1-1-1">1-1-1 (Three times a day)</option>
                      <option value="SOS">SOS (As needed)</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Days</label>
                    <Input type="number" min="1" className="bg-background" value={item.duration_days} onChange={(e) => handleItemChange(index, "duration_days", e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg" className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
            Sign & Issue Prescription
          </Button>
        </div>
      </div>

      {isAddMedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-2xl shadow-xl relative border border-border/50">
            <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={() => setIsAddMedModalOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-bold mb-1 flex items-center gap-2"><Pill className="w-5 h-5"/> Add Global Medicine</h2>
            <p className="text-sm text-muted-foreground mb-6">This medicine will be added to the global catalog for all users.</p>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Medicine Name *</label>
                <Input 
                  placeholder="e.g. Paracetamol 500mg" 
                  value={newMedName} 
                  onChange={(e) => setNewMedName(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Brand Name (Optional)</label>
                <Input 
                  placeholder="e.g. Tylenol" 
                  value={newMedBrand} 
                  onChange={(e) => setNewMedBrand(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              
              <Button className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground" disabled={addingMed || !newMedName} onClick={handleAddNewMedicine}>
                {addingMed ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />} 
                Add Medicine
              </Button>
            </div>
          </div>
        </div>
      )}

      {isPinModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-sm p-6 rounded-2xl shadow-xl relative border border-border/50 text-center">
            <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={() => setIsPinModalOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2">
              {pinMode === "create" ? "Create Authorization PIN" : "Authorize Prescription"}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {pinMode === "create"
                ? "Create your 6-digit Doctor Authorization PIN. You'll use this to sign all future prescriptions."
                : "Enter your 6-digit Doctor Authorization PIN to cryptographically sign and finalize this prescription."}
            </p>

            <div className="space-y-6">
              {pinMode === "create" && (
                <Input
                  type="password"
                  placeholder="Current Account Password"
                  className="h-12 rounded-xl"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              )}
              <Input
                type="password"
                placeholder="••••••"
                className="tracking-widest font-mono text-center text-3xl h-16 rounded-xl"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />

              <Button className="w-full h-12 text-md bg-emerald-600 hover:bg-emerald-700" disabled={saving || pin.length !== 6} onClick={handleConfirmSave}>
                {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                {pinMode === "create" ? "Create & Sign" : "Sign & Finalize"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Link Clinic Pharmacy Dialog */}
      <Dialog open={isLinkPharmacyModalOpen} onOpenChange={setIsLinkPharmacyModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Link Pharmacy to Your Clinic Practice</DialogTitle>
            <DialogDescription>
              Affiliate a pharmacy from the network with your clinic or hospital to quickly route prescriptions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLinkPharmacy} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Select Network Pharmacy *
              </label>
              <select
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2"
                value={pharmacyToLink}
                onChange={(e) => setPharmacyToLink(e.target.value)}
                required
              >
                <option value="">-- Choose a pharmacy --</option>
                {linkedPharmacies.map((p) => (
                  <option key={p.user_id} value={p.user_id}>
                    {p.full_name || p.business_name} {p.address ? `• ${p.address}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsLinkPharmacyModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={linkingPharmacy || !pharmacyToLink} className="bg-primary">
                {linkingPharmacy ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                Link Pharmacy
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
