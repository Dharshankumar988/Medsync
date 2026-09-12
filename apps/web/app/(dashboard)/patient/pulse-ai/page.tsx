"use client";

import { PulseAIChat } from "@/components/pulse-ai/PulseAIChat";
import { PulseAIIcon } from "@/components/pulse-ai/PulseAIIcon";

export default function PatientAIPage() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      <div className="flex-1 h-full">
        <PulseAIChat role="patient" fullPage={true} />
      </div>
    </div>
  );
}
