"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { LineChart, BarChart } from "lucide-react";

export default function AdminAnalytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Analytics</h1>
        <p className="text-muted-foreground mt-2">Historical trends and aggregated metadata.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><LineChart className="h-5 w-5"/> User Growth</CardTitle></CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-muted-foreground border-t border-border/50">
            [Chart Placeholder]
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChart className="h-5 w-5"/> Operations Volume</CardTitle></CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-muted-foreground border-t border-border/50">
            [Chart Placeholder]
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
