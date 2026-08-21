"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { User, ShieldCheck } from "lucide-react";
import { Badge } from "@medsync/ui";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminProfile() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setEmail(data.user.email || "");
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Profile</h1>
        <p className="text-muted-foreground mt-2">Manage your account and active sessions.</p>
      </div>

      <Card>
        <CardContent className="flex items-center gap-6 p-8">
          <div className="h-24 w-24 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center">
            <User className="h-10 w-10" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">System Administrator</h2>
            <p className="text-muted-foreground mt-1">{email}</p>
            <div className="flex items-center gap-2 mt-3">
              <Badge className="bg-red-500 hover:bg-red-600">Admin Role</Badge>
              <Badge variant="outline" className="border-emerald-500 text-emerald-500"><ShieldCheck className="h-3 w-3 mr-1"/> Verified</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
