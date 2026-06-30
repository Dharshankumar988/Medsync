"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Brain, Activity, Clock, ArrowRight, Stethoscope, FileText, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function DoctorDashboard() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground">Welcome, Dr. Smith</h1>
          <p className="text-muted-foreground mt-1 text-sm">Here is your daily schedule and patient analytics.</p>
        </div>
        <div className="flex gap-3">
          <Button className="rounded-xl shadow-soft">
            <Stethoscope className="mr-2 h-4 w-4" /> Start Consultations
          </Button>
        </div>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={item}>
          <Card className="h-full border-blue-500/20 bg-blue-500/5 hover:border-blue-500/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-500/10 rounded-2xl">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground mb-1">12</div>
              <p className="text-sm text-muted-foreground font-medium">Patients Today</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="h-full border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-emerald-500/10 rounded-2xl">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground mb-1">4</div>
              <p className="text-sm text-muted-foreground font-medium">Consultations Completed</p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={item}>
          <Card className="h-full border-purple-500/20 bg-purple-500/5 hover:border-purple-500/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-purple-500/10 rounded-2xl">
                  <Brain className="w-6 h-6 text-purple-500" />
                </div>
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground mb-1">3</div>
              <p className="text-sm text-muted-foreground font-medium">AI Reports Ready</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="h-full border-amber-500/20 bg-amber-500/5 hover:border-amber-500/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-amber-500/10 rounded-2xl">
                  <Activity className="w-6 h-6 text-amber-500" />
                </div>
                <span className="text-xs font-semibold bg-amber-500/10 text-amber-500 px-2 py-1 rounded-full flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Live
                </span>
              </div>
              <div className="text-xl font-bold tracking-tight text-foreground mb-1 mt-2">Emma W.</div>
              <p className="text-sm text-muted-foreground font-medium">Elevated Heart Rate Alert</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
        <motion.div variants={item} initial="hidden" animate="show" transition={{ delay: 0.3 }}>
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Today's Queue</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Upcoming appointments</p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/doctor/patients">View Schedule <ArrowRight className="ml-2 w-4 h-4" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {[
                { time: "09:00 AM", name: "Michael Chang", type: "Follow-up", status: "Waiting" },
                { time: "09:45 AM", name: "Sarah Jenkins", type: "Cardiology Consult", status: "Checked In" },
                { time: "10:30 AM", name: "Robert Fox", type: "Annual Physical", status: "Not Arrived" },
                { time: "11:15 AM", name: "Emily Chen", type: "Lab Results Review", status: "Not Arrived" },
              ].map((patient, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-border/50 bg-muted/20 hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-2 sm:w-24 shrink-0 text-sm font-semibold text-foreground">
                    <Clock className="w-4 h-4 text-primary" /> {patient.time}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{patient.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{patient.type}</p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${patient.status === 'Waiting' ? 'bg-amber-500/10 text-amber-500' : patient.status === 'Checked In' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                      {patient.status}
                    </span>
                    <Button size="sm" variant="outline" className="rounded-lg h-8">Review</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} initial="hidden" animate="show" transition={{ delay: 0.4 }}>
          <Card className="h-full bg-gradient-to-br from-background to-purple-500/5 relative overflow-hidden border-purple-500/20">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
              <Brain className="w-40 h-40" />
            </div>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" /> Recent AI Analyses
              </CardTitle>
              <p className="text-sm text-muted-foreground">Automated diagnostics and scans</p>
            </CardHeader>
            <CardContent className="space-y-4 pt-2 relative z-10">
              {[
                { patient: "James Wilson", scan: "Chest X-Ray", result: "Normal. No anomalies detected.", urgent: false },
                { patient: "Olivia Davis", scan: "Brain MRI", result: "Potential micro-aneurysm detected. Review recommended.", urgent: true },
                { patient: "William Taylor", scan: "ECG", result: "Mild arrhythmia observed. Correlates with patient history.", urgent: false },
              ].map((report, i) => (
                <div key={i} className={`p-4 rounded-xl border ${report.urgent ? 'border-destructive/30 bg-destructive/5' : 'border-border/50 bg-background'} transition-colors`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm">{report.patient}</div>
                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <FileText className="w-3 h-3" /> {report.scan}
                    </div>
                  </div>
                  <p className={`text-sm ${report.urgent ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                    {report.result}
                  </p>
                  {report.urgent && (
                    <Button size="sm" variant="destructive" className="w-full mt-3 rounded-lg h-8">
                      Review Case Immediately
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" className="w-full rounded-xl" asChild>
                <Link href="/doctor/ai">Open AI Diagnostic Hub</Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
