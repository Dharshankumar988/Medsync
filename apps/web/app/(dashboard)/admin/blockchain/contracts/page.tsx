"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { FileCode2, Search, Copy, Check, ArrowRight, ExternalLink } from "lucide-react";

function shortenAddress(addr: string) {
  if (!addr || addr.length < 12) return addr || "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function SmartContractsList() {
  const router = useRouter();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const DEFAULT_CONTRACTS = [
    {
      name: "ConsentManagement",
      address: "0x755F2DBB9Caaa78Eac77fF3115F92984BAc37e52",
      version: "1.0.0",
      health: "DEPLOYED",
      explorer_url: "https://amoy.polygonscan.com/address/0x755F2DBB9Caaa78Eac77fF3115F92984BAc37e52"
    },
    {
      name: "PatientRegistry",
      address: "0x9Dcd620f006555ffFA072d2280ef47506C5Da2A3",
      version: "1.0.0",
      health: "DEPLOYED",
      explorer_url: "https://amoy.polygonscan.com/address/0x9Dcd620f006555ffFA072d2280ef47506C5Da2A3"
    },
    {
      name: "DoctorRegistry",
      address: "0x260d8C75009B62009aA2762c1d76d8daAeA1A7A9",
      version: "1.0.0",
      health: "DEPLOYED",
      explorer_url: "https://amoy.polygonscan.com/address/0x260d8C75009B62009aA2762c1d76d8daAeA1A7A9"
    },
    {
      name: "PharmacyRegistry",
      address: "0x50dc448bf7260f736A0A3a10151Ccb1a495d3BE9",
      version: "1.0.0",
      health: "DEPLOYED",
      explorer_url: "https://amoy.polygonscan.com/address/0x50dc448bf7260f736A0A3a10151Ccb1a495d3BE9"
    },
    {
      name: "MedicalRecordRegistry",
      address: "0xfC15AA7EF7759dAEF6C9d3dfB6EEc30DC4783104",
      version: "1.0.0",
      health: "DEPLOYED",
      explorer_url: "https://amoy.polygonscan.com/address/0xfC15AA7EF7759dAEF6C9d3dfB6EEc30DC4783104"
    },
    {
      name: "PrescriptionRegistry",
      address: "0x94013b71F9A3eEbCdbcD11fE460E8E9253916A6D",
      version: "1.0.0",
      health: "DEPLOYED",
      explorer_url: "https://amoy.polygonscan.com/address/0x94013b71F9A3eEbCdbcD11fE460E8E9253916A6D"
    }
  ];

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const res = await api.get("/api/v1/blockchain/contracts");
        if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setContracts(res.data.data);
        } else {
          setContracts(DEFAULT_CONTRACTS);
        }
      } catch (e) {
        console.error(e);
        setContracts(DEFAULT_CONTRACTS);
      } finally {
        setLoading(false);
      }
    };
    fetchContracts();
  }, []);

  const handleCopy = (e: React.MouseEvent, address: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const filteredContracts = contracts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.address.toLowerCase().includes(search.toLowerCase())
  );

  const contractDescriptions: Record<string, string> = {
    ConsentManagement: "Manages patient consent preferences and data sharing authorizations.",
    PatientRegistry: "Decentralized identity and profile registry for patients.",
    DoctorRegistry: "Verified credential and license registry for medical professionals.",
    PharmacyRegistry: "Licensed pharmacy and dispensary verification registry.",
    MedicalRecordRegistry: "Secure, encrypted electronic health records mapping.",
    PrescriptionRegistry: "Tamper-proof prescription issuance and fulfillment ledger."
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileCode2 className="w-6 h-6 text-primary shrink-0" /> Smart Contracts
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage and inspect all deployed smart contracts in the MedSync network.
          </p>
        </div>
        <div className="relative w-full sm:w-72 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="w-full overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-4 lg:px-5 py-3 font-medium text-muted-foreground">Contract Name</th>
              <th className="px-3 lg:px-4 py-3 font-medium text-muted-foreground">Version</th>
              <th className="px-4 lg:px-5 py-3 font-medium text-muted-foreground">Address</th>
              <th className="px-3 lg:px-4 py-3 font-medium text-muted-foreground">Health</th>
              <th className="px-4 lg:px-5 py-3 font-medium text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center">
                  <div className="animate-pulse h-4 w-28 bg-muted mx-auto rounded"></div>
                </td>
              </tr>
            ) : filteredContracts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                  No contracts found.
                </td>
              </tr>
            ) : (
              filteredContracts.map((c) => (
                <tr
                  key={c.name}
                  onClick={() => router.push(`/admin/blockchain/contracts/${c.name}`)}
                  className="hover:bg-muted/20 transition-colors cursor-pointer group"
                >
                  <td className="px-4 lg:px-5 py-4 min-w-[180px]">
                    <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {c.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 max-w-[280px] line-clamp-1 group-hover:line-clamp-none transition-all">
                      {contractDescriptions[c.name] || "Core MedSync protocol contract."}
                    </div>
                  </td>
                  <td className="px-3 lg:px-4 py-4 text-muted-foreground whitespace-nowrap text-xs font-mono">
                    v{c.version}
                  </td>
                  <td className="px-4 lg:px-5 py-4 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5 font-mono text-xs bg-muted/40 px-2 py-1 rounded-md border border-border/50">
                      <span className="text-muted-foreground" title={c.address}>
                        {shortenAddress(c.address)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleCopy(e, c.address)}
                        className="p-0.5 text-muted-foreground hover:text-foreground transition-colors rounded"
                        title="Copy full address"
                      >
                        {copiedAddress === c.address ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-3 lg:px-4 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {c.health}
                    </span>
                  </td>
                  <td className="px-4 lg:px-5 py-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/admin/blockchain/contracts/${c.name}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-medium text-xs transition-colors shrink-0"
                      >
                        View Details
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      <a
                        href={`${c.explorer_url}#code`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-lg transition-colors shrink-0"
                        title="View contract on PolygonScan"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

