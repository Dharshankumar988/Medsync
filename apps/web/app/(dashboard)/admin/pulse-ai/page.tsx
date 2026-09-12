"use client";

import { PulseAIChat } from "@/components/pulse-ai/PulseAIChat";
import { PulseAIIcon } from "@/components/pulse-ai/PulseAIIcon";

export default function AdminAIPage() {
  return (
    <div className="flex h-[calc(100vh-8rem)] w-full flex-col overflow-hidden bg-background rounded-2xl border border-border shadow-sm">
      <div className="flex-1 h-full">
        <PulseAIChat role="admin" fullPage={true} />
      </div>
    </div>
  );
}
