"use client";

import { PulseAIChat } from "@/components/pulse-ai/PulseAIChat";
import { PulseAIIcon } from "@/components/pulse-ai/PulseAIIcon";

export default function PharmacyAIPage() {
  return (
    <div className="flex h-full w-full flex-col md:flex-row overflow-hidden bg-background">
      <div className="w-full md:w-80 border-r border-border bg-card p-4 hidden md:flex flex-col gap-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <PulseAIIcon size={24} />
            <h1 className="font-semibold">Pharmacy Pulse AI</h1>
          </div>
          <p className="text-sm text-muted-foreground">Pharmacological & Inventory Intelligence</p>
        </div>


      </div>

      <div className="flex-1 h-full">
        <PulseAIChat role="pharmacy" fullPage={true} />
      </div>
    </div>
  );
}
