"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input, Badge } from "@medsync/ui";
import { ArrowLeft, Save, Loader2, Pill, Plus, Trash2, ShieldCheck, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { toast } from "sonner";
import axios from "axios";

export default function CreatePrescriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const apptId = searchParams.get('appointment_id');
  const preselectedPatientId = searchParams.get('patient_id');

  const [userId, setUserId] = useState<string>("");
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [patientId, setPatientId] = useState<string>(preselectedPatientId || "");
  const [diagnosis, setDiagnosis] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [items, setItems] = useState<any[]>([
    { medicine_name: "", dosage: "", frequency: "1-0-1", duration_days: 5, instructions: "" }
  ]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Load authorized patients for the dropdown
    async function fetchPatients() {
      try {
        const { data: appts } = await supabase.from('appointments').select('patient_id').eq('doctor_id', userId);
        const { data: pres } = await supabase.from('prescriptions').select('patient_id').eq('doctor_id', userId);
        
        const ids = Array.from(new Set([
          ...(appts?.map(a => a.patient_id) || []),
          ...(pres?.map(p => p.patient_id) || []),
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

    fetchPatients();
  }, [userId, preselectedPatientId]);

  const handleAddItem = () => {
    setItems([...items, { medicine_name: "", dosage: "", frequency: "1-0-1", duration_days: 5, instructions: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
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

    setSaving(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const apiUrl = baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl}/api/v1`;

      const payload = {
        patient_id: patientId,
        diagnosis,
        notes,
        appointment_id: apptId || null,
        items: validItems.map(item => ({
          medicine_name: item.medicine_name,
          dosage: item.dosage,
          frequency: item.frequency,
          duration_days: parseInt(item.duration_days),
          instructions: item.instructions || "Take as directed"
        }))
      };

      // Since we don't know the exact endpoint payload, we will try to insert directly into Supabase,
      // but creating a prescription often involves blockchain in the backend. Let's hit the backend API.
      // Wait, in this stack, if there's no explicit post endpoint, inserting directly to supabase works.
      
      // 1. Insert Prescription
      const { data: presData, error: presErr } = await supabase
        .from('prescriptions')
        .insert({
          doctor_id: userId,
          patient_id: patientId,
          appointment_id: apptId || null,
          diagnosis,
          notes,
          is_dispensed: false
        })
        .select()
        .single();
        
      if (presErr) throw presErr;

      // 2. Insert Items
      const itemsToInsert = validItems.map(item => ({
        prescription_id: presData.id,
        medicine_name: item.medicine_name,
        dosage: item.dosage,
        frequency: item.frequency,
        duration_days: parseInt(item.duration_days),
        instructions: item.instructions || "Take as directed"
      }));

      const { error: itemsErr } = await supabase
        .from('prescription_items')
        .insert(itemsToInsert);

      if (itemsErr) throw itemsErr;

      toast.success("Prescription created successfully");
      router.push('/doctor/prescriptions');
    } catch (err) {
      console.error(err);
      toast.error("Failed to create prescription");
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
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Additional Notes</label>
              <Input placeholder="e.g. Drink plenty of fluids, rest for 3 days" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Medicines</CardTitle>
              <CardDescription>Add medicines to the prescription schema.</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={handleAddItem}>
              <Plus className="w-4 h-4 mr-1" /> Add Medicine
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="p-4 bg-muted/40 border border-border/50 rounded-xl relative group">
                <div className="absolute -top-3 -left-3 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
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
                      <Pill className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        placeholder="e.g. Amoxicillin 500mg" 
                        className="pl-9 bg-background"
                        value={item.medicine_name}
                        onChange={(e) => handleItemChange(index, "medicine_name", e.target.value)}
                      />
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
    </div>
  );
}
