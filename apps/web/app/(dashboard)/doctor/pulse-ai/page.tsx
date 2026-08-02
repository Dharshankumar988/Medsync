"use client";

import { PulseAIChat } from "@/components/pulse-ai/PulseAIChat";
import { PulseAIIcon } from "@/components/pulse-ai/PulseAIIcon";
import { Upload } from "lucide-react";

export default function DoctorAIPage() {
  return (
    <div className="flex h-full w-full flex-col md:flex-row overflow-hidden bg-background">
      {/* Sidebar for specific AI Tasks */}
      <div className="w-full md:w-80 border-r border-border bg-card p-4 hidden md:flex flex-col gap-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <PulseAIIcon size={24} />
            <h1 className="font-semibold">Doctor Pulse AI</h1>
          </div>
          <p className="text-sm text-muted-foreground">Clinical Decision Support & Image Analysis</p>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-muted-foreground tracking-wider">SUGGESTED TASKS</h3>
          <button className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-sm font-medium">
            Generate SOAP Note
          </button>
          <button className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-sm font-medium">
            Analyze Drug Interactions
          </button>
          <button className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-sm font-medium">
            Differential Diagnosis
          </button>
        </div>

        <div className="mt-auto p-4 rounded-lg bg-muted border border-border border-dashed text-center">
          <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
          <h4 className="text-sm font-medium">Upload Scan</h4>
          <p className="text-xs text-muted-foreground mt-1">Drop X-Ray or MRI here for instant analysis</p>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 h-full">
        <PulseAIChat role="doctor" fullPage={true} />
      </div>
    </div>
  );
}
