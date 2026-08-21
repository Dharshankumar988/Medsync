"use client";

import { useState, useEffect } from "react";
import { Button, Input, Card, CardContent, CardHeader, CardTitle, CardDescription, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@medsync/ui";
import { toast } from "sonner";
import { Trash, UploadCloud, FileText, Search, Loader2 } from "lucide-react";

export default function AdminKnowledgeBase() {
  const [documents, setDocuments] = useState([]);
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/v1/admin/rag/documents", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    try {
      const res = await fetch("/api/v1/admin/rag/documents", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });
      
      if (res.ok) {
        toast.success("Document uploaded successfully");
        fetchDocuments();
      } else {
        toast.error("Failed to upload document");
      }
    } catch (e) {
      toast.error("Upload failed");
    }
    setIsUploading(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/admin/rag/documents/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (res.ok) {
        toast.success("Document deleted");
        fetchDocuments();
      }
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    setIsQuerying(true);
    setAnswer("");
    setSources([]);

    try {
      const res = await fetch("/api/v1/admin/rag/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ query }),
      });

      if (res.ok) {
        const data = await res.json();
        setAnswer(data.answer);
        setSources(data.sources || []);
      } else {
        toast.error("Failed to fetch answer");
      }
    } catch (e) {
      toast.error("Query failed");
    }
    setIsQuerying(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Knowledge Base</h1>
          <p className="text-gray-500 mt-2">Manage medical RAG documents for AI context (Admin Only)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Document Management */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-lg border-primary/10">
            <CardHeader className="bg-primary/5 rounded-t-xl border-b border-primary/10">
              <CardTitle className="text-xl flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="text-center w-full">
                  <UploadCloud className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 mb-2">Upload PDF, TXT, DOCX</p>
                  <label htmlFor="file-upload" className="cursor-pointer bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition flex items-center justify-center mx-auto max-w-[150px]">
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {isUploading ? "Uploading..." : "Select File"}
                  </label>
                  <input id="file-upload" type="file" className="hidden" onChange={handleUpload} accept=".pdf,.txt,.md,.docx" />
                </div>
              </div>

              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-gray-500 py-6">No documents indexed</TableCell>
                      </TableRow>
                    ) : (
                      documents.map((doc: any) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium max-w-[120px] truncate" title={doc.title}>{doc.title}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              doc.status === 'READY' ? 'bg-green-100 text-green-700' :
                              doc.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {doc.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                              <Trash className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: RAG Query */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg border-primary/10 h-full flex flex-col">
            <CardHeader className="bg-primary/5 rounded-t-xl border-b border-primary/10">
              <CardTitle className="text-xl flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Ask Knowledge Base
              </CardTitle>
              <CardDescription>Get grounded answers based strictly on indexed documents.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col gap-6">
              <form onSubmit={handleQuery} className="flex gap-2">
                <Input 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. What is the standard dosage for Amoxicillin?"
                  className="flex-1 text-base p-6 rounded-xl border-gray-300 dark:border-gray-700 focus-visible:ring-primary"
                />
                <Button type="submit" disabled={isQuerying || !query} className="h-auto px-8 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-md transition-all hover:scale-105 active:scale-95">
                  {isQuerying ? <Loader2 className="h-5 w-5 animate-spin" /> : "Query"}
                </Button>
              </form>

              <div className="flex-1 bg-gray-50 dark:bg-gray-900/30 rounded-xl p-6 border border-gray-100 dark:border-gray-800 flex flex-col">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4 text-sm uppercase tracking-wider">Generated Answer</h3>
                
                {answer ? (
                  <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-200">
                      {answer.split('\n').map((line, i) => (
                        <p key={i} className="mb-2">{line}</p>
                      ))}
                    </div>
                    
                    {sources.length > 0 && (
                      <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-semibold text-gray-500 mb-3">Retrieved Citations</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {sources.map((src: any, i: number) => (
                            <div key={i} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm text-sm">
                              <span className="font-bold text-primary mr-2">[{i+1}]</span>
                              <span className="text-gray-700 dark:text-gray-300">{src.title}</span>
                              <div className="text-xs text-gray-500 mt-1">Relevance: {(src.similarity * 100).toFixed(1)}%</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400">
                    Ask a question to search the knowledge base.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
