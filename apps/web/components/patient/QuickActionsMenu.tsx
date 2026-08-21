"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@medsync/ui";
import { Bot, QrCode, UploadCloud, FileText, Pill, AlertTriangle } from "lucide-react";

export function QuickActionsMenu() {
  const actions = [
    {
      title: "Pulse AI Assistant",
      description: "Get smart health insights",
      icon: Bot,
      href: "/patient/pulse-ai",
      color: "bg-purple-500/10 text-purple-600",
    },
    {
      title: "Share QR Profile",
      description: "Quickly share medical history",
      icon: QrCode,
      href: "/patient/qr",
      color: "bg-blue-500/10 text-blue-600",
    },
    {
      title: "Upload Records",
      description: "Store documents on blockchain",
      icon: UploadCloud,
      href: "/patient/records/upload",
      color: "bg-emerald-500/10 text-emerald-600",
    },
    {
      title: "Order Medicines",
      description: "From nearby pharmacies",
      icon: Pill,
      href: "/patient/pharmacy",
      color: "bg-orange-500/10 text-orange-600",
    },
  ];

  return (
    <Card className="col-span-full xl:col-span-2">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button variant="destructive" className="w-full justify-start h-auto p-4 mb-2 animate-pulse">
          <AlertTriangle className="mr-3 h-5 w-5" />
          <div className="flex flex-col items-start text-left">
            <span className="font-semibold">Emergency SOS</span>
            <span className="text-xs opacity-90 font-normal">Notify emergency contacts & nearby hospitals</span>
          </div>
        </Button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map((action, i) => (
            <Link key={i} href={action.href}>
              <Button variant="outline" className="w-full justify-start h-auto p-4 hover:border-primary/50 transition-colors">
                <div className={`p-2 rounded-lg ${action.color} mr-3`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="font-semibold">{action.title}</span>
                  <span className="text-xs text-muted-foreground">{action.description}</span>
                </div>
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
