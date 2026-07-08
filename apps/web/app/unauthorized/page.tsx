import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center text-center p-8">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Access Denied</h1>
        <p className="mb-8 text-muted-foreground">
          You do not have the required permissions to view this clinical area. All access attempts are logged.
        </p>
        <Button asChild className="w-full">
          <Link href="/">Return to Platform Root</Link>
        </Button>
      </div>
    </div>
  );
}
