"use client";

import { PulseAIChat } from "@/components/pulse-ai/PulseAIChat";
import { PulseAIIcon } from "@/components/pulse-ai/PulseAIIcon";

export default function PatientAIPage() {
  return (
    <div className="flex h-full w-full flex-col md:flex-row overflow-hidden bg-background">
      <div className="w-full md:w-80 border-r border-border bg-card p-4 hidden md:flex flex-col gap-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <PulseAIIcon size={24} />
            <h1 className="font-semibold">Patient Pulse AI</h1>
          </div>
          <p className="text-sm text-muted-foreground">Your personal health assistant</p>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-muted-foreground tracking-wider">I WANT TO...</h3>
          <button className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-sm font-medium">
            Check my symptoms
          </button>
          <button className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-sm font-medium">
            Explain my lab results
          </button>
          <button className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-sm font-medium">
            Medication reminders
          </button>
        </div>
      </div>

      <div className="flex-1 h-full">
        <PulseAIChat role="patient" fullPage={true} />
      </div>
    </div>
  );
}
