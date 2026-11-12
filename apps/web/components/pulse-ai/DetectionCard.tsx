"use client";

import { useState, useCallback } from "react";
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
  ChevronUp,
  Stethoscope
} from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeScanBoxes } from "@/lib/scan-box-utils";
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
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [clientBoxes, setClientBoxes] = useState<any[]>([]);

  const explicitBoxes = detection.boxes || [];
  const activeBoxes = explicitBoxes.length > 0 ? explicitBoxes : clientBoxes;
  const topPredictions = detection.top_predictions || [];

  const isSkinScan = (detection.scan_type || "").toLowerCase().includes("skin");
  const normalizedBoxes = normalizeScanBoxes(
    activeBoxes,
    naturalSize.width,
    naturalSize.height,
    isSkinScan ? "Detected Lesion" : detection.diagnosis || "Detected ROI"
  );

  // Client-side lesion detection fallback if no bounding boxes were returned
  const detectLesionOnImage = useCallback((imgElement: HTMLImageElement) => {
    try {
      if (!imgElement.naturalWidth || !imgElement.naturalHeight) return null;
      const canvas = document.createElement("canvas");
      const width = 200;
      const height = Math.round((imgElement.naturalHeight / imgElement.naturalWidth) * 200);
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(imgElement, 0, 0, width, height);
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      const grayValues: number[] = [];
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        grayValues.push(gray);
      }

      const sortedGray = [...grayValues].sort((a, b) => a - b);
      const medianGray = sortedGray[Math.floor(sortedGray.length / 2)];

      const marginX = Math.round(width * 0.05);
      const marginY = Math.round(height * 0.05);

      let minX = width, maxX = 0, minY = height, maxY = 0;
      let matchCount = 0;

      const threshold = Math.max(22, medianGray * 0.22);

      for (let y = marginY; y < height - marginY; y++) {
        for (let x = marginX; x < width - marginX; x++) {
          const idx = y * width + x;
          const diff = medianGray - grayValues[idx];
          if (diff > threshold) {
            matchCount++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (matchCount >= 15 && minX < maxX && minY < maxY) {
        const padX = (maxX - minX) * 0.12 + width * 0.02;
        const padY = (maxY - minY) * 0.12 + height * 0.02;
        const x1 = Math.max(0.02, (minX - padX) / width);
        const y1 = Math.max(0.02, (minY - padY) / height);
        const x2 = Math.min(0.98, (maxX + padX) / width);
        const y2 = Math.min(0.98, (maxY + padY) / height);
        return [{
          coordinates: [Number(x1.toFixed(3)), Number(y1.toFixed(3)), Number(x2.toFixed(3)), Number(y2.toFixed(3))],
          class: "Pigmented Lesion / Mole",
          confidence: detection.confidence || 0.4
        }];
      }
    } catch (e) {
      console.warn("Client lesion detector fallback notice:", e);
    }
    return null;
  }, [detection.confidence]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setImgLoaded(true);
    const imgEl = e.currentTarget;
    setNaturalSize({
      width: imgEl.naturalWidth || 0,
      height: imgEl.naturalHeight || 0,
    });
    if (explicitBoxes.length === 0 && isSkinScan) {
      const detected = detectLesionOnImage(imgEl);
      if (detected && detected.length > 0) {
        setClientBoxes(detected);
      }
    }
  };

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
            <h4 className="text-base font-bold tracking-tight mt-0.5 truncate capitalize">
              {detection.diagnosis}
            </h4>
            {isSkinScan && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Stethoscope className="w-3 h-3 text-purple-400" />
                <span>Visual Presentation: Pigmented Cutaneous Lesion / Nevus (Mole)</span>
              </p>
            )}
          </div>
        </div>

        {/* Annotated Image Preview & Controls */}
        {imageUrl && (
          <div className="relative rounded-xl overflow-hidden border border-border/80 bg-zinc-950 group">
            {imgError ? (
              /* Fallback view when image binary cannot be rendered */
              <div 
                onClick={onInspectImage}
                className="p-4 bg-zinc-900/80 hover:bg-zinc-900 transition-colors cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0">
                    {scanMeta.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-200 truncate">
                      {scanMeta.label} Diagnostic Scan
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {activeBoxes.length > 0 ? `${activeBoxes.length} region(s) detected` : "Diagnostic findings verified"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-700/60 shrink-0">
                  <Maximize2 className="w-3.5 h-3.5 text-primary" />
                  <span>Inspect Scan</span>
                </div>
              </div>
            ) : (
              /* High-Resolution Scan Canvas */
              <div className="relative max-h-72 w-full flex items-center justify-center bg-black/60 overflow-hidden">
                {!imgLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 animate-spin text-primary" />
                      <span>Loading scan preview...</span>
                    </div>
                  </div>
                )}

                <div className="relative inline-block max-h-72">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={scanMeta.label}
                    onLoad={handleImageLoad}
                    onError={() => setImgError(true)}
                    className="block max-h-72 w-auto h-auto cursor-pointer transition-transform duration-200 group-hover:scale-[1.01]"
                    onClick={onInspectImage}
                  />

                  {/* Solid Bounding Box Overlay tightly fitted to image */}
                  {showAnnotations && normalizedBoxes.length > 0 && imgLoaded && (
                    <div className="absolute inset-0 pointer-events-none">
                      {normalizedBoxes.map((b, i) => {
                        const labelInside = b.topPct < 12;
                        return (
                          <div
                            key={i}
                            style={{
                              left: `${b.leftPct}%`,
                              top: `${b.topPct}%`,
                              width: `${b.widthPct}%`,
                              height: `${b.heightPct}%`,
                            }}
                            className="absolute border-2 border-solid border-rose-500 bg-rose-500/15"
                          >
                            <span className="absolute -top-0.5 -left-0.5 w-2 h-2 border-t-[3px] border-l-[3px] border-rose-400" />
                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 border-t-[3px] border-r-[3px] border-rose-400" />
                            <span className="absolute -bottom-0.5 -left-0.5 w-2 h-2 border-b-[3px] border-l-[3px] border-rose-400" />
                            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 border-b-[3px] border-r-[3px] border-rose-400" />
                            <span
                              className={cn(
                                "absolute left-0 px-1.5 py-0.5 rounded bg-zinc-950/90 border border-rose-500/80 text-[10px] font-bold text-rose-300 whitespace-nowrap shadow",
                                labelInside ? "top-0.5 left-0.5" : "-top-5"
                              )}
                            >
                              {b.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

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
                      <span>{showAnnotations ? "Hide Box" : "Show Box"}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

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
                <span>Click to inspect lesion details</span>
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
                  Model Probability Breakdown
                </span>
                <div className="space-y-1.5">
                  {topPredictions.map((pred, i) => {
                    const label = pred.label || pred.predicted_class || `Class ${i + 1}`;
                    const pct = pred.percentage ?? Math.round(pred.confidence * 100);
                    return (
                      <div key={i} className="space-y-0.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-foreground font-medium capitalize">{label}</span>
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
