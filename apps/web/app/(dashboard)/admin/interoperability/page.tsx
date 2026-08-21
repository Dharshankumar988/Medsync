"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { RefreshCw, CheckCircle } from "lucide-react";
import { Badge } from "@medsync/ui";

export default function AdminInteroperability() {
  const resources = [
    "Patient", "Practitioner", "Organization", "Location", 
    "Appointment", "Encounter", "Condition", "Observation", 
    "DiagnosticReport", "AllergyIntolerance", "Medication", 
    "MedicationRequest", "Bundle"
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Interoperability (FHIR)</h1>
        <p className="text-muted-foreground mt-2">Monitor FHIR R4 exports and integrations.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>FHIR Service Status</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-6 border rounded-xl bg-emerald-500/10">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="font-bold text-lg text-emerald-600">ONLINE</p>
                <p className="text-sm text-muted-foreground">FHIR R4 API is fully operational</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Supported Resources</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {resources.map((r, i) => (
                <Badge key={i} variant="secondary" className="px-3 py-1 font-mono text-xs">
                  {r}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
