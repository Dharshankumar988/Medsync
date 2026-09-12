"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@medsync/ui";
import { Activity, Heart, Scale, Droplets } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export function HealthStatistics({ vitals = [] }: { vitals?: any[] }) {
  if (!vitals || vitals.length === 0) {
    return (
      <Card className="col-span-full xl:col-span-2">
        <CardHeader>
          <CardTitle>Health Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Activity}
            title="No Vitals Recorded"
            description="Your vitals and health statistics will appear here once recorded by your doctor."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full xl:col-span-2">
      <CardHeader>
        <CardTitle>Health Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {vitals.map((stat, index) => {
            const Icon = stat.icon || Activity;
            return (
              <div key={index} className="flex flex-col p-4 border rounded-xl hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${stat.bg || "bg-gray-100"}`}>
                    <Icon className={`h-5 w-5 ${stat.color || "text-gray-500"}`} />
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
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
