"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { FileCode2, ArrowLeft, Terminal, ActivitySquare } from "lucide-react";

export default function ContractDetail() {
  const params = useParams();
  const router = useRouter();
  const contractName = params.name as string;
  
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContract = async () => {
      try {
        const res = await api.get(`/api/v1/blockchain/contracts/${contractName}`);
        setContract(res.data.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchContract();
  }, [contractName]);

  if (loading) {
    return <div className="animate-pulse h-96 bg-muted rounded-xl"></div>;
  }

  if (!contract) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold">Contract Not Found</h2>
        <button onClick={() => router.back()} className="mt-4 text-primary hover:underline">Go back</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><FileCode2 className="w-6 h-6 text-primary" /> {contract.name}</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">{contract.address}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-2">
            <ActivitySquare className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-sm uppercase tracking-wide">ABI Events</h3>
          </div>
          <div className="p-0 max-h-96 overflow-y-auto">
            <ul className="divide-y divide-border">
              {contract.events?.length === 0 && <li className="p-4 text-sm text-muted-foreground">No events found in ABI.</li>}
              {contract.events?.map((e: string) => (
                <li key={e} className="p-4 text-sm font-mono hover:bg-muted/10">{e}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Functions */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-500" />
            <h3 className="font-semibold text-sm uppercase tracking-wide">ABI Functions</h3>
          </div>
          <div className="p-0 max-h-96 overflow-y-auto">
            <ul className="divide-y divide-border">
              {contract.functions?.length === 0 && <li className="p-4 text-sm text-muted-foreground">No functions found in ABI.</li>}
              {contract.functions?.map((f: string) => (
                <li key={f} className="p-4 text-sm font-mono hover:bg-muted/10">{f}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
