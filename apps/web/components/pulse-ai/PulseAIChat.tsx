"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  Send, 
  Image as ImageIcon, 
  Copy, 
  Check, 
  UploadCloud, 
  X, 
  Maximize2, 
  Activity, 
  Brain, 
  Crosshair, 
  Scan,
  FileImage,
  Sparkles,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { aiService } from "@/services/ai.service";
import { PulseAIIcon } from "./PulseAIIcon";
import { MedicalScanViewerModal, DetectionFinding } from "./MedicalScanViewerModal";
import { DetectionCard } from "./DetectionCard";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  imageUrl?: string;
  imageName?: string;
  imageSize?: string;
  scanType?: string;
  boxes?: any[];
  detection?: DetectionFinding;
}

interface PulseAIChatProps {
  role: "doctor" | "patient" | "pharmacy" | "admin";
  fullPage?: boolean;
  patientId?: string;
}

const PLUGINS = [remarkGfm];

const SCAN_TYPES = [
  { id: "bone", label: "Bone X-Ray", icon: Activity, color: "text-amber-500", activeBg: "bg-amber-500 text-white" },
  { id: "brain", label: "Brain MRI", icon: Brain, color: "text-cyan-500", activeBg: "bg-cyan-500 text-white" },
  { id: "kidney", label: "Kidney CT", icon: Crosshair, color: "text-emerald-500", activeBg: "bg-emerald-500 text-white" },
  { id: "skin", label: "Skin Lesion", icon: Scan, color: "text-purple-500", activeBg: "bg-purple-500 text-white" },
];

const ChatMessage = memo(function ChatMessage({ 
  message, 
  onCopy, 
  copiedId,
  onInspectImage
}: { 
  message: Message; 
  onCopy: (id: string, text: string) => void;
  copiedId: string | null;
  onInspectImage: (imgUrl: string, name?: string, detection?: DetectionFinding, boxes?: any[]) => void;
}) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div 
        className={cn(
          "group relative max-w-[90%] sm:max-w-[82%] rounded-2xl px-4 py-3 text-sm shadow-sm transition-all",
          isUser 
            ? "bg-primary text-primary-foreground rounded-tr-sm" 
            : "bg-muted/70 text-foreground rounded-tl-sm border border-border/60"
        )}
      >
        {/* User uploaded scan thumbnail */}
        {isUser && message.imageUrl && (
          <div className="mb-2.5 overflow-hidden rounded-xl border border-white/20 bg-black/20 group/img relative">
            <div className="relative max-h-48 w-full overflow-hidden flex items-center justify-center bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={message.imageUrl} 
                alt={message.imageName || "Uploaded Scan"} 
                className="max-h-48 w-auto object-contain block cursor-pointer transition-transform duration-200 hover:scale-105"
                onClick={() => onInspectImage(message.imageUrl!, message.imageName, undefined, message.boxes)}
              />
              <button
                type="button"
                onClick={() => onInspectImage(message.imageUrl!, message.imageName, undefined, message.boxes)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover/img:opacity-100 transition-opacity backdrop-blur-sm"
                title="Inspect image in full view"
              >
                <Maximize2 size={13} />
              </button>
            </div>
            {(message.imageName || message.scanType) && (
              <div className="flex items-center justify-between px-2.5 py-1.5 bg-black/40 text-[11px] text-white/90">
                <span className="truncate max-w-[200px]">{message.imageName || "Medical scan"}</span>
                {message.scanType && (
                  <span className="uppercase text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/20">
                    {message.scanType}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Assistant Detection Card if detection finding exists */}
        {!isUser && message.detection ? (
          <DetectionCard 
            detection={message.detection} 
            imageUrl={message.imageUrl} 
            onInspectImage={() => onInspectImage(message.imageUrl!, message.imageName || "Diagnostic Scan", message.detection, message.boxes)}
          />
        ) : (
          /* Standard assistant image preview fallback if detection finding is not full structure */
          !isUser && message.imageUrl && (
            <div className="relative mt-2 mb-3 max-w-full overflow-hidden rounded-xl border border-border/60 bg-black/5 group/scan">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={message.imageUrl} 
                alt="Medical Scan" 
                className="w-full max-h-64 object-contain block cursor-pointer"
                onClick={() => onInspectImage(message.imageUrl!, "Diagnostic Scan", undefined, message.boxes)}
              />
              <button
                type="button"
                onClick={() => onInspectImage(message.imageUrl!, "Diagnostic Scan", undefined, message.boxes)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-900 text-white opacity-0 group-hover/scan:opacity-100 transition-opacity backdrop-blur-sm shadow-md"
                title="Inspect image in full resolution"
              >
                <Maximize2 size={13} />
              </button>
            </div>
          )
        )}

        {/* Text Content */}
        {message.content && (
          <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:bg-zinc-900 prose-pre:text-zinc-50 max-w-none">
            <ReactMarkdown remarkPlugins={PLUGINS}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Copy button */}
        {!isUser && message.content && (
          <button 
            onClick={() => onCopy(message.id, message.content)}
            className="absolute -right-8 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-muted rounded-md text-muted-foreground"
            title="Copy message"
          >
            {copiedId === message.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          </button>
        )}
      </div>
    </motion.div>
  );
});

export function PulseAIChat({ role, fullPage = false, patientId }: PulseAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanType, setScanType] = useState("bone");
  const [isLoaded, setIsLoaded] = useState(false);

  // Drag and Drop & Staged File State
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedPreviewUrl, setStagedPreviewUrl] = useState<string | null>(null);

  // Full Screen Image Viewer Modal State
  const [viewerModal, setViewerModal] = useState<{
    isOpen: boolean;
    imageUrl: string;
    imageName?: string;
    detection?: DetectionFinding | null;
    boxes?: any[];
  }>({
    isOpen: false,
    imageUrl: "",
  });

  const storageKey = `pulse-chat-${role}-${patientId || "global"}`;

  // Load from session storage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.messages && Array.isArray(parsed.messages)) {
          setMessages(parsed.messages);
        }
        if (parsed.sessionId) {
          setSessionId(parsed.sessionId);
        }
      }
    } catch (e) {
      console.warn("Failed to load chat history", e);
    }
    setIsLoaded(true);
  }, [storageKey]);

  // Save to session storage whenever messages or sessionId changes
  useEffect(() => {
    if (isLoaded) {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify({ messages, sessionId }));
      } catch (e) {
        console.warn("Failed to save chat history", e);
      }
    }
  }, [messages, sessionId, storageKey, isLoaded]);

  // Cleanup pending requests on unmount or controller change
  useEffect(() => {
    const controller = abortController;
    return () => {
      if (controller) {
        controller.abort();
      }
    };
  }, [abortController]);

  // Clean up object URL when staged file changes
  useEffect(() => {
    return () => {
      if (stagedPreviewUrl) {
        URL.revokeObjectURL(stagedPreviewUrl);
      }
    };
  }, [stagedPreviewUrl]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, stagedFile]);

  // Drag & Drop event handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      setIsDragging(false);
      dragCounterRef.current = 0;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const stageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please drop a valid medical scan image (JPEG, PNG, WebP).");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Image file is too large (maximum 15MB).");
      return;
    }

    if (stagedPreviewUrl) {
      URL.revokeObjectURL(stagedPreviewUrl);
    }

    const preview = URL.createObjectURL(file);
    setStagedFile(file);
    setStagedPreviewUrl(preview);
    toast.success(`Staged ${file.name}. Select scan type and hit Analyze!`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      stageFile(file);
    }
  };

  const clearStagedFile = () => {
    if (stagedPreviewUrl) {
      URL.revokeObjectURL(stagedPreviewUrl);
    }
    setStagedFile(null);
    setStagedPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Convert File to base64 for persistent chat history
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(URL.createObjectURL(file));
      reader.readAsDataURL(file);
    });
  };

  // Send message / Analyze image
  const handleSend = useCallback(async () => {
    // If a scan image is staged, trigger image analysis pipeline
    if (stagedFile) {
      const fileToAnalyze = stagedFile;
      const persistentImageUrl = stagedPreviewUrl || URL.createObjectURL(fileToAnalyze);
      const userText = input.trim();
      const currentScanType = scanType;

      // Clear staging immediately
      setStagedFile(null);
      setStagedPreviewUrl(null);
      setInput("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Format file size
      const sizeStr = `${(fileToAnalyze.size / (1024 * 1024)).toFixed(1)} MB`;

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: userText ? `${userText}\n\n*Uploaded ${currentScanType.toUpperCase()} scan: ${fileToAnalyze.name}*` : `Analyzed ${currentScanType.toUpperCase()} scan: ${fileToAnalyze.name}`,
        imageUrl: persistentImageUrl,
        imageName: fileToAnalyze.name,
        imageSize: sizeStr,
        scanType: currentScanType,
      };

      const assistantMessageId = (Date.now() + 1).toString();
      setMessages((prev) => [...prev, userMessage, { id: assistantMessageId, role: "assistant", content: "" }]);
      setIsLoading(true);

      const controller = new AbortController();
      setAbortController(controller);

      try {
        const response = await aiService.analyzeImage(
          fileToAnalyze, 
          currentScanType, 
          patientId, 
          sessionId || undefined, 
          controller.signal
        );

        const report = response?.data || response;
        if (report?.session_id) setSessionId(report.session_id);

        const finding = report?.prediction || {};
        const explanation = role === "doctor" ? report?.clinical_summary : report?.patient_explanation;
        const boxes = finding.boxes || finding.details?.boxes || report?.boxes || [];
        const topPredictions = finding.top_predictions || finding.details?.top_predictions || [];

        const detectionFinding: DetectionFinding = {
          diagnosis: finding.diagnosis || "Analyzed",
          confidence: finding.confidence || 0,
          confidence_percent: finding.confidence_percent || Math.round((finding.confidence || 0) * 100),
          boxes: boxes,
          top_predictions: topPredictions,
          scan_type: report?.scan_type || currentScanType,
          summary: explanation?.summary,
          recommendations: explanation?.recommendations || explanation?.recommended_next_steps || [],
          urgency: explanation?.urgency || "routine",
          inference_time_ms: report?.metadata?.inference_time_ms,
        };

        const markdownText = explanation?.summary 
          ? `**Diagnostic Interpretation (${currentScanType.toUpperCase()})**\n\n${explanation.summary}`
          : `**Model Finding (${currentScanType.toUpperCase()})**: ${finding.diagnosis || "Finding available"}`;

        setMessages((prev) => prev.map((m) =>
          m.id === assistantMessageId 
            ? { 
                ...m, 
                content: markdownText, 
                imageUrl: persistentImageUrl, 
                imageName: fileToAnalyze.name,
                boxes,
                detection: detectionFinding 
              } 
            : m
        ));
      } catch (error: any) {
        console.error(error);
        const errorMessage = error.response?.data?.error?.message || error.response?.data?.detail || error.message || "Image analysis failed. Please check the scan format and retry.";
        setMessages((prev) => prev.map((m) =>
          m.id === assistantMessageId ? { ...m, content: `**Analysis Error:** ${errorMessage}` } : m
        ));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Standard text chat
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const assistantMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantMessageId, role: "assistant", content: "" }]);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const response = await aiService.chat(role, userMessage.content, sessionId || undefined, patientId, controller.signal);
      const result = response.data || response;
      if (result.session_id) setSessionId(result.session_id);
      setMessages((prev) => prev.map((m) =>
        m.id === assistantMessageId ? { ...m, content: result.reply } : m
      ));
      setIsLoading(false);
    } catch (error: any) {
      console.error(error);
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.detail || error.message || "Pulse could not complete that request. Please retry.";
      setMessages((prev) => prev.map((m) =>
        m.id === assistantMessageId ? { ...m, content: `**Error:** ${errorMessage}` } : m
      ));
      setIsLoading(false);
    }
  }, [input, isLoading, role, sessionId, patientId, stagedFile, stagedPreviewUrl, scanType]);

  const handleCopy = useCallback((id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const openInspectModal = useCallback((imgUrl: string, name?: string, detection?: DetectionFinding, boxes?: any[]) => {
    setViewerModal({
      isOpen: true,
      imageUrl: imgUrl,
      imageName: name || "Medical Scan",
      detection: detection || null,
      boxes: boxes || [],
    });
  }, []);

  return (
    <div 
      className={cn(
        "relative flex flex-col bg-card overflow-hidden w-full h-full", 
        fullPage ? "rounded-none" : "rounded-2xl shadow-2xl border border-border"
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Full-Screen Drag & Drop Overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 bg-background/90 backdrop-blur-md border-2 border-dashed border-primary shadow-2xl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 10 }}
              className="flex flex-col items-center text-center max-w-md p-8 rounded-3xl bg-card border border-primary/30 shadow-2xl space-y-4"
            >
              <div className="p-4 rounded-2xl bg-primary/10 text-primary border border-primary/20 animate-bounce">
                <UploadCloud className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Drop Medical Scan to Analyze
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports JPEG, PNG, and WebP radiology / pathology scans
                </p>
              </div>

              {/* Active scan type badge on drag */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted border border-border text-xs font-semibold text-foreground">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Target: {scanType.toUpperCase()} DIAGNOSTICS</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/30">
        <div className="flex items-center gap-3">
          <PulseAIIcon size={32} animate={isLoading} />
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <span>Pulse AI</span>
              {role === "doctor" && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  Doctor Clinical Mode
                </span>
              )}
            </h2>
            <p className="text-xs text-muted-foreground capitalize">
              {role === "doctor" ? "Specialist Diagnostic Assistant" : `${role} Assistant`}
            </p>
          </div>
        </div>

        {/* Scan Type selector pills in header for doctor */}
        {role === "doctor" && (
          <div className="hidden sm:flex items-center gap-1 bg-background/60 p-1 rounded-xl border border-border/80">
            {SCAN_TYPES.map((type) => {
              const Icon = type.icon;
              const isActive = scanType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setScanType(type.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  title={`Switch diagnostic target to ${type.label}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{type.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Messages Scroll View */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center opacity-70 p-6 space-y-4">
            <div className="p-4 rounded-3xl bg-primary/10 text-primary border border-primary/20 shadow-inner">
              <PulseAIIcon size={48} />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">
                {role === "doctor" ? "Doctor Clinical Diagnostic Assistant" : "How can I assist you today?"}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                {role === "doctor" 
                  ? "Drag and drop any Bone X-Ray, Brain MRI, Kidney CT, or Skin lesion scan into this window to receive instant multi-model detections and clinical insights."
                  : "Ask any questions regarding treatments, records, or clinical insights."}
              </p>
            </div>

            {role === "doctor" && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {SCAN_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setScanType(t.id);
                        fileInputRef.current?.click();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-background hover:bg-muted hover:border-primary/50 text-xs font-medium text-foreground transition-all shadow-sm"
                    >
                      <Icon className={cn("w-3.5 h-3.5", t.color)} />
                      <span>Upload {t.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
        
        {messages.map((m) => (
          <ChatMessage 
            key={m.id} 
            message={m} 
            onCopy={handleCopy} 
            copiedId={copiedId} 
            onInspectImage={openInspectModal}
          />
        ))}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-2xl bg-muted/40 border border-border/50 max-w-md text-xs text-muted-foreground"
          >
            <PulseAIIcon size={24} animate={true} />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                Pulse AI is analyzing scan & generating clinical report...
              </span>
              <span className="text-[11px] text-muted-foreground">
                Evaluating radiologic features via YOLOv8 & Llama 3.3
              </span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Staged Image Tray (When image is dropped or selected) */}
      <AnimatePresence>
        {stagedFile && stagedPreviewUrl && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-3 bg-muted/60 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 overflow-hidden"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div 
                className="relative w-14 h-14 rounded-xl overflow-hidden border border-border/80 bg-black/40 shrink-0 cursor-pointer group"
                onClick={() => openInspectModal(stagedPreviewUrl, stagedFile.name)}
                title="Click to preview scan"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={stagedPreviewUrl} 
                  alt="Staged Scan Preview" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                  <Maximize2 size={12} />
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground truncate max-w-[200px]">
                    {stagedFile.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    ({(stagedFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                </div>

                {/* Scan Type Chips */}
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {SCAN_TYPES.map((t) => {
                    const Icon = t.icon;
                    const isSelected = scanType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setScanType(t.id)}
                        className={cn(
                          "flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-all",
                          isSelected 
                            ? "bg-primary text-primary-foreground shadow-sm" 
                            : "bg-background/80 text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className="w-2.5 h-2.5" />
                        <span>{t.id}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={clearStagedFile}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Remove image"
              >
                <X size={16} />
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
              >
                <Sparkles size={14} />
                <span>Analyze {scanType.toUpperCase()} Scan</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Bar */}
      <div className="p-4 border-t border-border bg-background">
        <div className="relative flex items-end gap-2 bg-muted/40 p-2 rounded-2xl border border-border focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all shadow-inner">
          {role === "doctor" && (
            <>
              <input 
                ref={fileInputRef} 
                type="file" 
                accept="image/jpeg,image/png,image/webp" 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) stageFile(file);
                }} 
              />
              
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isLoading} 
                className="p-2.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors rounded-xl shrink-0 disabled:opacity-50" 
                title="Upload or drag & drop medical scan (Bone, Brain, Kidney, Skin)"
              >
                <ImageIcon size={20} />
              </button>
            </>
          )}

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={stagedFile ? `Optional notes for ${scanType.toUpperCase()} scan (or press Enter to analyze)...` : "Ask Pulse AI or drag & drop a medical scan here..."}
            className="w-full max-h-32 min-h-[42px] resize-none bg-transparent py-2.5 px-1 text-sm outline-none placeholder:text-muted-foreground leading-relaxed"
            rows={1}
          />

          <button 
            type="button"
            onClick={handleSend}
            disabled={(!input.trim() && !stagedFile) || isLoading}
            className="p-2.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-all rounded-xl shrink-0 disabled:opacity-40 disabled:cursor-not-allowed mb-0.5 active:scale-95 shadow-md shadow-primary/20"
            title="Send Message"
          >
            <Send size={16} />
          </button>
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground px-1">
          <span className="flex items-center gap-1">
            <UploadCloud className="w-3.5 h-3.5 text-primary" />
            Drag & drop scans anywhere
          </span>
          <span>Pulse Clinical AI • Verify critical radiologic decisions</span>
        </div>
      </div>

      {/* High-Resolution Medical Scan Inspection Modal */}
      <MedicalScanViewerModal
        isOpen={viewerModal.isOpen}
        onClose={() => setViewerModal((prev) => ({ ...prev, isOpen: false }))}
        imageUrl={viewerModal.imageUrl}
        imageName={viewerModal.imageName}
        detection={viewerModal.detection}
        boxes={viewerModal.boxes}
      />
    </div>
  );
}
