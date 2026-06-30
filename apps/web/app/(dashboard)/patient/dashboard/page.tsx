"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, Shield, Activity, Plus, ArrowRight, Brain, HeartPulse, Fingerprint, Clock, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function PatientDashboard() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 mb-2">
            <Badge variant="verified" className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20">
              <Fingerprint className="w-3 h-3 mr-1" /> Identity Verified
            </Badge>
          </motion.div>
          <h1 className="text-3xl font-heading font-semibold tracking-tight text-foreground">Overview</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Welcome back, John. Your health metrics are looking excellent today.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="shadow-sm">
            <Clock className="mr-2 h-4 w-4 text-muted-foreground" /> History
          </Button>
          <Button className="shadow-md hover:shadow-lg transition-shadow">
            <Plus className="mr-2 h-4 w-4" /> Book Appointment
          </Button>
        </div>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={item}>
          <Card className="h-full relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <CardContent className="p-6 relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div className="p-2.5 bg-primary/10 rounded-xl">
                  <HeartPulse className="w-5 h-5 text-primary" />
                </div>
                <Badge variant="success">Normal</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Heart Rate</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-bold tracking-tight text-foreground">72</h3>
                  <span className="text-sm font-semibold text-muted-foreground">bpm</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="h-full relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
            <CardContent className="p-6 relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div className="p-2.5 bg-amber-500/10 rounded-xl">
                  <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                </div>
                <Badge variant="pending">In 2 days</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Next Checkup</p>
                <h3 className="text-lg font-bold tracking-tight text-foreground truncate">Cardiology</h3>
                <p className="text-xs text-muted-foreground font-medium truncate">Dr. Sarah Jenkins • 10:00 AM</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={item}>
          <Card className="h-full relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
            <CardContent className="p-6 relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div className="p-2.5 bg-blue-500/10 rounded-xl">
                  <Activity className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                </div>
                <Badge variant="ai">AI Analysis</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Health Score</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-bold tracking-tight text-foreground">94</h3>
                  <span className="text-sm font-semibold text-success">/100</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="h-full relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
            <CardContent className="p-6 relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                  <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                </div>
                <Badge variant="blockchain">Secured</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Blockchain Sync</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-bold tracking-tight text-foreground">100%</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-3">
        <motion.div variants={item} initial="hidden" animate="show" transition={{ delay: 0.3 }} className="md:col-span-2">
          <Card className="h-full shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/40">
              <div>
                <CardTitle className="text-lg">Recent Clinical Activity</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Your latest verified medical documents and lab results.</p>
              </div>
              <Button variant="ghost" size="sm" asChild className="hidden sm:flex text-primary hover:text-primary">
                <Link href="/patient/records">View All <ArrowRight className="ml-2 w-4 h-4" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/40">
                {[
                  { name: "Comprehensive Metabolic Panel", date: "Oct 12, 2023", doctor: "Dr. Smith", status: "Verified", type: "Lab Result" },
                  { name: "Chest X-Ray (PA & Lateral)", date: "Sep 28, 2023", doctor: "Dr. Jenkins", status: "Verified", type: "Imaging" },
                  { name: "Annual Physical Examination", date: "Aug 15, 2023", doctor: "Dr. Smith", status: "Verified", type: "Clinical Note" },
                  { name: "Prescription Renewal (Lisinopril)", date: "Jul 02, 2023", doctor: "Dr. Jenkins", status: "Verified", type: "Prescription" },
                ].map((record, i) => (
                  <div key={i} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-background border shadow-sm flex items-center justify-center text-muted-foreground group-hover:border-primary/30 group-hover:text-primary transition-colors">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{record.name}</p>
                        <div className="flex items-center text-xs text-muted-foreground gap-2 mt-1">
                          <span className="font-medium">{record.type}</span>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <span>{record.doctor}</span>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <span>{record.date}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="verified" className="hidden sm:inline-flex">{record.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} initial="hidden" animate="show" transition={{ delay: 0.4 }} className="flex flex-col h-full">
          <Card className="flex-1 bg-gradient-to-b from-primary/[0.03] to-transparent relative overflow-hidden border-primary/10 flex flex-col">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
              <Brain className="w-48 h-48" />
            </div>
            
            <CardHeader className="pb-4 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="ai" className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                  <Sparkles className="w-3 h-3 mr-1" /> MedSync AI
                </Badge>
              </div>
              <CardTitle className="text-lg">Clinical Insights</CardTitle>
              <p className="text-sm text-muted-foreground">Automated analysis of your recent medical data.</p>
            </CardHeader>
            
            <CardContent className="flex flex-col flex-1 relative z-10 pt-2">
              <div className="space-y-4 mb-6 flex-1">
                <div className="bg-background rounded-2xl rounded-tl-none p-4 text-sm border shadow-sm shadow-primary/5">
                  <p className="text-foreground leading-relaxed">
                    Based on your <span className="font-semibold text-primary">Comprehensive Metabolic Panel</span> from Oct 12, your cholesterol levels have improved by 14% since your last test.
                  </p>
                </div>
                
                <div className="bg-background rounded-2xl rounded-tl-none p-4 text-sm border shadow-sm shadow-primary/5">
                  <p className="text-foreground leading-relaxed">
                    Reminder: Your Cardiology checkup with <span className="font-semibold">Dr. Sarah Jenkins</span> is scheduled in 2 days. 
                  </p>
                </div>
              </div>
              
              <Button className="w-full rounded-xl shadow-md group mt-auto bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/patient/ai" className="flex items-center justify-center w-full">
                  Ask AI Assistant <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
