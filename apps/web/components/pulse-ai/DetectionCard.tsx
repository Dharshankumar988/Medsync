"use client";

import { useState } from "react";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Maximize2, 
  Eye, 
  EyeOff, 
  Activity, 
  Brain, 
  Crosshair, 
  Scan,
  Sparkles,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DetectionFinding } from "./MedicalScanViewerModal";

interface DetectionCardProps {
  detection: DetectionFinding;
  imageUrl?: string;
  onInspectImage?: () => void;
}

export function DetectionCard({
  detection,
  imageUrl,
  onInspectImage,
}: DetectionCardProps) {
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);

  const activeBoxes = detection.boxes || [];
  const topPredictions = detection.top_predictions || [];

  const isAbnormal = detection.diagnosis && 
    !detection.diagnosis.toLowerCase().includes("no fracture") &&
    !detection.diagnosis.toLowerCase().includes("normal") &&
    !detection.diagnosis.toLowerCase().includes("benign") &&
    !detection.diagnosis.toLowerCase().includes("no abnormality");

  const getScanBadge = (type?: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("bone")) {
      return {
        label: "Bone X-Ray",
        icon: <Activity className="w-3.5 h-3.5 text-amber-500" />,
        badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      };
    }
    if (t.includes("brain")) {
      return {
        label: "Brain MRI",
        icon: <Brain className="w-3.5 h-3.5 text-cyan-500" />,
        badgeClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
      };
    }
    if (t.includes("kidney")) {
      return {
        label: "Kidney CT",
        icon: <Crosshair className="w-3.5 h-3.5 text-emerald-500" />,
        badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      };
    }
    return {
      label: "Skin Dermoscopy",
      icon: <Scan className="w-3.5 h-3.5 text-purple-500" />,
      badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    };
  };

  const scanMeta = getScanBadge(detection.scan_type);

  return (
    <div className="my-3 w-full rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md shadow-md overflow-hidden text-card-foreground">
      {/* Header Banner */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className={cn("flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border", scanMeta.badgeClass)}>
            {scanMeta.icon}
            <span>{scanMeta.label}</span>
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Diagnostic Detection
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {detection.confidence_percent}% Match
          </span>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Diagnostic Verdict Alert */}
        <div className={cn(
          "p-3.5 rounded-xl border flex items-start gap-3 transition-all",
          isAbnormal
            ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 shadow-sm shadow-rose-500/5"
            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 shadow-sm shadow-emerald-500/5"
        )}>
          {isAbnormal ? (
            <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-500 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-500 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                {isAbnormal ? "Pathologic Finding Detected" : "Negative / Unremarkable Finding"}
              </span>
              <span className={cn(
                "px-2 py-0.5 text-[10px] font-bold rounded-full uppercase",
                isAbnormal ? "bg-rose-500/20 text-rose-700 dark:text-rose-300" : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              )}>
                {detection.confidence_percent >= 80 ? "High Confidence" : "Moderate Confidence"}
              </span>
            </div>
            <h4 className="text-base font-bold tracking-tight mt-0.5 truncate">
              {detection.diagnosis}
            </h4>
          </div>
        </div>

        {/* Annotated Image Preview & Controls */}
        {imageUrl && (
          <div className="relative rounded-xl overflow-hidden border border-border/80 bg-zinc-950 group">
            {/* Image Canvas */}
            <div className="relative max-h-72 w-full flex items-center justify-center bg-black/60 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Analyzed Scan"
                className="max-h-72 w-auto object-contain cursor-pointer transition-transform duration-200 group-hover:scale-[1.01]"
                onClick={onInspectImage}
              />

              {/* Bounding Box Overlay */}
              {showAnnotations && activeBoxes.length > 0 && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  {activeBoxes.map((rawBox, i) => {
                    const box = Array.isArray(rawBox) 
                      ? rawBox 
                      : (rawBox?.coordinates || rawBox?.bbox || [0, 0, 0, 0]);
                    
                    const isNormalized = box[0] <= 1.05 && box[2] <= 1.05;
                    const x = isNormalized ? box[0] * 100 : box[0];
                    const y = isNormalized ? box[1] * 100 : box[1];
                    const width = isNormalized ? (box[2] - box[0]) * 100 : box[2] - box[0];
                    const height = isNormalized ? (box[3] - box[1]) * 100 : box[3] - box[1];

                    return (
                      <g key={i}>
                        <rect
                          x={`${Math.max(0, x)}%`}
                          y={`${Math.max(0, y)}%`}
                          width={`${Math.max(2, width)}%`}
                          height={`${Math.max(2, height)}%`}
                          fill="rgba(239, 68, 68, 0.15)"
                          stroke="#ef4444"
                          strokeWidth="2.5"
                          strokeDasharray="4"
                          className="drop-shadow-md"
                        />
                      </g>
                    );
                  })}
                </svg>
              )}

              {/* Overlay Action Bar on Hover */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                <button
                  type="button"
                  onClick={onInspectImage}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-lg hover:bg-primary/90 transition-transform active:scale-95"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Inspect Scan</span>
                </button>
                {activeBoxes.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAnnotations(!showAnnotations);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900/90 text-zinc-200 border border-zinc-700 text-xs font-medium hover:bg-zinc-800 transition-colors"
                  >
                    {showAnnotations ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showAnnotations ? "Hide Boxes" : "Show Boxes"}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Caption Bar */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 text-[11px] text-zinc-400 border-t border-zinc-800">
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3 text-primary" />
                {activeBoxes.length > 0 ? `${activeBoxes.length} region(s) detected` : "Scan preview"}
              </span>
              <button
                type="button"
                onClick={onInspectImage}
                className="text-primary hover:underline font-medium flex items-center gap-1"
              >
                <span>Click to expand</span>
                <Maximize2 className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        )}

        {/* Collapsible Clinical Impression & Differential */}
        {isExpanded && (
          <div className="space-y-3 pt-1">
            {/* Multi-class / Top Predictions (Skin Dermoscopy, etc.) */}
            {topPredictions.length > 0 && (
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Differential Probability Breakdown
                </span>
                <div className="space-y-1.5">
                  {topPredictions.map((pred, i) => {
                    const label = pred.label || pred.predicted_class || `Class ${i + 1}`;
                    const pct = pred.percentage ?? Math.round(pred.confidence * 100);
                    return (
                      <div key={i} className="space-y-0.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-foreground font-medium">{label}</span>
                          <span className="text-muted-foreground font-mono">{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              i === 0 ? "bg-primary" : "bg-muted-foreground/40"
                            )}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Clinical Summary */}
            {detection.summary && (
              <div className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-primary" /> Clinical Summary
                </span>
                <p className="text-xs text-foreground/90 leading-relaxed">
                  {detection.summary}
                </p>
              </div>
            )}

            {/* Recommendations */}
            {detection.recommendations && detection.recommendations.length > 0 && (
              <div className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Recommended Clinical Actions
                </span>
                <ul className="text-xs text-foreground/90 space-y-1">
                  {detection.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-primary font-bold mt-0.5">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Footer metadata */}
            <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 pt-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {detection.inference_time_ms ? `${detection.inference_time_ms}ms processing` : "PULSE Diagnostic Engine"}
              </span>
              <span>AI Assisted Medical Review</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
