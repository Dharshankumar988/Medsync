"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@medsync/ui";
import { Activity, Heart, Scale, Droplets } from "lucide-react";

export function HealthStatistics() {
  const stats = [
    {
      title: "Blood Pressure",
      value: "120/80",
      unit: "mmHg",
      icon: Heart,
      status: "Normal",
      color: "text-rose-500",
      bg: "bg-rose-500/10",
    },
    {
      title: "Heart Rate",
      value: "72",
      unit: "bpm",
      icon: Activity,
      status: "Normal",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Weight",
      value: "70",
      unit: "kg",
      icon: Scale,
      status: "Stable",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Blood Sugar",
      value: "95",
      unit: "mg/dL",
      icon: Droplets,
      status: "Normal",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <Card className="col-span-full xl:col-span-2">
      <CardHeader>
        <CardTitle>Health Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, index) => (
            <div key={index} className="flex flex-col p-4 border rounded-xl hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <span className="text-sm font-medium text-muted-foreground">{stat.title}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">{stat.value}</span>
                <span className="text-xs text-muted-foreground">{stat.unit}</span>
              </div>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-1">
                {stat.status}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
