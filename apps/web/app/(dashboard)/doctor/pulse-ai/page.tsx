"use client";

import { PulseAIChat } from "@/components/pulse-ai/PulseAIChat";
import { PulseAIIcon } from "@/components/pulse-ai/PulseAIIcon";


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


      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 h-full">
        <PulseAIChat role="doctor" fullPage={true} />
      </div>
    </div>
  );
}
