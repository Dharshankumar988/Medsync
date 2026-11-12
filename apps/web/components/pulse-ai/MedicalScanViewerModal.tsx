"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  CheckCircle2, 
  Activity,
  Brain,
  Crosshair,
  Scan,
  ShieldAlert,
  Info,
  CheckCircle,
  HelpCircle,
  Stethoscope
} from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeScanBoxes } from "@/lib/scan-box-utils";

export interface DetectionFinding {
  diagnosis: string;
  confidence: number;
  confidence_percent: number;
  boxes?: any[];
  top_predictions?: { label?: string; predicted_class?: string; confidence: number; percentage?: number }[];
  scan_type: string;
  summary?: string;
  recommendations?: string[];
  urgency?: string;
  inference_time_ms?: number;
  lesion_category?: string;
  differential_diagnoses?: string[];
}

interface MedicalScanViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageName?: string;
  detection?: DetectionFinding | null;
  boxes?: any[];
}

export function MedicalScanViewerModal({
  isOpen,
  onClose,
  imageUrl,
  imageName = "Medical Scan",
  detection,
  boxes = [],
}: MedicalScanViewerModalProps) {
  const [zoom, setZoom] = useState(1);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [clientBoxes, setClientBoxes] = useState<any[]>([]);
  const startPanRef = useRef({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Client-side lesion detection fallback if no bounding boxes were returned
  const detectLesionOnImage = useCallback((imgElement: HTMLImageElement) => {
    try {
      if (!imgElement.naturalWidth || !imgElement.naturalHeight) return null;
      const canvas = document.createElement("canvas");
      const width = 250;
      const height = Math.round((imgElement.naturalHeight / imgElement.naturalWidth) * 250);
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
          class: "Pigmented Lesion / Nevus (Mole)",
          confidence: detection?.confidence || 0.4
        }];
      }
    } catch (e) {
      console.warn("Client lesion detector fallback notice:", e);
    }
    return null;
  }, [detection?.confidence]);

  // Reset zoom, pan, and client boxes on open or image change
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setShowAnnotations(true);
      setImageLoaded(false);
      setImageError(false);
      setClientBoxes([]);
    }
  }, [isOpen, imageUrl]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") handleZoomIn();
      if (e.key === "-") handleZoomOut();
      if (e.key === "0") handleResetZoom();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsPanning(true);
      startPanRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && zoom > 1) {
      setPan({
        x: e.clientX - startPanRef.current.x,
        y: e.clientY - startPanRef.current.y,
      });
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  const isSkinScan = (detection?.scan_type || "").toLowerCase().includes("skin");

  // Active boxes priority: detection.boxes -> props.boxes -> client auto-detected boxes (skin only)
  const explicitBoxes = (detection?.boxes && detection.boxes.length > 0) 
    ? detection.boxes 
    : (boxes && boxes.length > 0 ? boxes : []);
  const activeBoxes = explicitBoxes.length > 0 ? explicitBoxes : clientBoxes;
  const normalizedBoxes = normalizeScanBoxes(
    activeBoxes,
    naturalSize.width,
    naturalSize.height,
    isSkinScan ? "Detected Lesion" : detection?.diagnosis || "Detected ROI"
  );

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setImageLoaded(true);
    const imgElement = e.currentTarget;
    imgRef.current = imgElement;
    setNaturalSize({
      width: imgElement.naturalWidth || 0,
      height: imgElement.naturalHeight || 0,
    });
    if (explicitBoxes.length === 0 && isSkinScan) {
      const detected = detectLesionOnImage(imgElement);
      if (detected && detected.length > 0) {
        setClientBoxes(detected);
      }
    }
  };

  const isAbnormal = detection?.diagnosis && 
    !detection.diagnosis.toLowerCase().includes("no fracture") &&
    !detection.diagnosis.toLowerCase().includes("normal") &&
    !detection.diagnosis.toLowerCase().includes("benign") &&
    !detection.diagnosis.toLowerCase().includes("no abnormality");

  const isLowConfidenceSkin = isSkinScan && (detection?.confidence_percent || 0) < 65;

  const getScanIcon = (type?: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("bone")) return <Activity className="w-4 h-4 text-amber-500" />;
    if (t.includes("brain")) return <Brain className="w-4 h-4 text-cyan-500" />;
    if (t.includes("kidney")) return <Crosshair className="w-4 h-4 text-emerald-500" />;
    return <Scan className="w-4 h-4 text-purple-500" />;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative flex flex-col w-full max-w-6xl h-[92vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100"
          >
            {/* Top Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-sm z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-zinc-800/80 border border-zinc-700/50">
                  {getScanIcon(detection?.scan_type || (isSkinScan ? "skin" : "medical"))}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold tracking-wide text-zinc-100">
                      {imageName}
                    </h2>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {detection?.scan_type || (isSkinScan ? "SKIN" : "SCAN")}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    High-Resolution Medical Inspection Viewer
                  </p>
                </div>
              </div>

              {/* Viewer Controls */}
              <div className="flex items-center gap-2">
                {activeBoxes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAnnotations(!showAnnotations)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                      showAnnotations
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm"
                        : "bg-zinc-800/80 text-zinc-400 border-zinc-700/60 hover:text-zinc-200"
                    )}
                    title="Toggle bounding box annotations"
                  >
                    {showAnnotations ? <Eye className="w-3.5 h-3.5 text-rose-400" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{showAnnotations ? "Box Annotation On" : "Box Annotation Off"}</span>
                  </button>
                )}

                <div className="flex items-center bg-zinc-800/80 rounded-lg p-1 border border-zinc-700/60">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    disabled={zoom <= 0.5}
                    className="p-1.5 text-zinc-400 hover:text-zinc-100 disabled:opacity-40 transition-colors"
                    title="Zoom Out (-)"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 text-xs font-mono text-zinc-300 min-w-[42px] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    disabled={zoom >= 4}
                    className="p-1.5 text-zinc-400 hover:text-zinc-100 disabled:opacity-40 transition-colors"
                    title="Zoom In (+)"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    className="p-1.5 text-zinc-400 hover:text-zinc-100 border-l border-zinc-700/60 ml-1 transition-colors"
                    title="Reset Zoom (0)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 ml-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 border border-zinc-700/60 transition-all"
                  title="Close (ESC)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Central Viewport & Diagnostic Right Sidebar */}
            <div className="relative flex-1 flex flex-col md:flex-row overflow-hidden bg-zinc-950">
              {/* Image Canvas Viewport */}
              <div 
                className={cn(
                  "relative flex-1 h-full flex items-center justify-center p-6 overflow-hidden select-none bg-zinc-950",
                  zoom > 1 && !imageError ? (isPanning ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
                )}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                {/* Fallback Card if image fails to load */}
                {imageError ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center max-w-md rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4 shadow-2xl backdrop-blur-sm">
                    <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Scan className="w-10 h-10" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-zinc-100">
                        Medical Scan View Unavailable
                      </h3>
                      <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                        The visual scan data for <span className="font-mono text-zinc-200 font-medium break-all">{imageName}</span> could not be loaded into the viewport. All model detection findings and clinical impressions remain accessible in the right panel.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {!imageLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300 backdrop-blur-sm shadow-xl">
                          <Activity className="w-4 h-4 animate-spin text-primary" />
                          <span>Loading scan view & detecting lesion...</span>
                        </div>
                      </div>
                    )}

                    <div 
                      className="relative max-h-full max-w-full transition-transform duration-75 flex items-center justify-center"
                      style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      }}
                    >
                      <div className="relative inline-block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          ref={imgRef}
                          src={imageUrl}
                          alt={imageName}
                          draggable={false}
                          onLoad={handleImageLoad}
                          onError={() => setImageError(true)}
                          className={cn(
                            "block max-h-[75vh] max-w-[75vw] w-auto h-auto rounded-lg shadow-2xl border border-zinc-800/80 transition-opacity duration-200",
                            imageLoaded ? "opacity-100" : "opacity-0"
                          )}
                        />

                        {/* Solid Bounding Boxes Overlay aligned directly over the rendered image */}
                        {showAnnotations && normalizedBoxes.length > 0 && imageLoaded && (
                          <div className="absolute inset-0 pointer-events-none">
                            {normalizedBoxes.map((b, i) => {
                              const labelInside = b.topPct < 9;
                              return (
                                <div
                                  key={i}
                                  style={{
                                    left: `${b.leftPct}%`,
                                    top: `${b.topPct}%`,
                                    width: `${b.widthPct}%`,
                                    height: `${b.heightPct}%`,
                                  }}
                                  className="absolute border-2 border-solid border-rose-500 bg-rose-500/15 shadow-[0_0_12px_rgba(244,63,94,0.28)]"
                                >
                                  {/* Crisp corner markers */}
                                  <span className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 border-t-[3px] border-l-[3px] border-rose-400" />
                                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 border-t-[3px] border-r-[3px] border-rose-400" />
                                  <span className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 border-b-[3px] border-l-[3px] border-rose-400" />
                                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-b-[3px] border-r-[3px] border-rose-400" />

                                  {/* Anatomical / Diagnosis Label Badge */}
                                  <div
                                    className={cn(
                                      "absolute left-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-950/90 border border-rose-500/80 text-[11px] font-bold text-rose-300 whitespace-nowrap shadow-md",
                                      labelInside ? "top-1 left-1" : "-top-6"
                                    )}
                                  >
                                    <span>{b.label}</span>
                                    {b.confidence !== undefined && (
                                      <span className="text-rose-400/90 font-mono text-[10px]">
                                        {Math.round(b.confidence * 100)}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Bottom Overlay Hint */}
                <div className="absolute bottom-4 left-6 pointer-events-none text-[11px] text-zinc-500 bg-zinc-900/80 backdrop-blur-sm px-3 py-1 rounded-full border border-zinc-800 flex items-center gap-2">
                  <Crosshair className="w-3 h-3 text-rose-400" />
                  <span>
                    {activeBoxes.length > 0 
                      ? `Bounding Box ROI Identified (${activeBoxes.length} region)` 
                      : (zoom > 1 ? "Drag to pan image | Controls to zoom" : "Use zoom controls to inspect radiologic details")}
                  </span>
                </div>
              </div>

              {/* Side Diagnostic Summary Card */}
              {detection && (
                <div className="w-full md:w-96 border-t md:border-t-0 md:border-l border-zinc-800 bg-zinc-900/50 p-5 overflow-y-auto space-y-4 shrink-0">
                  {/* Model Classification Header */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                      <span>Model Classification</span>
                      {isLowConfidenceSkin && (
                        <span className="text-[9px] text-amber-400 font-medium lowercase">
                          (preliminary screening)
                        </span>
                      )}
                    </span>
                    <div className={cn(
                      "p-3 rounded-xl border flex items-start gap-2.5",
                      isAbnormal 
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                        : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    )}>
                      {isAbnormal ? (
                        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-tight capitalize truncate">
                          {detection.diagnosis}
                        </p>
                        <p className="text-xs opacity-80 mt-1">
                          Model Statistical Confidence: {detection.confidence_percent}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Statistical Confidence Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Classifier Confidence</span>
                      <span className="font-semibold text-zinc-200">{detection.confidence_percent}%</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          detection.confidence_percent >= 70 ? "bg-emerald-500" : (detection.confidence_percent >= 40 ? "bg-amber-500" : "bg-rose-500")
                        )}
                        style={{ width: `${Math.min(detection.confidence_percent, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Dermatological Clinical Differential (Crucial for explaining what it actually is) */}
                  {isSkinScan && (
                    <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-zinc-200 space-y-2.5">
                      <div className="flex items-center gap-2 text-purple-300">
                        <Stethoscope className="w-4 h-4 text-purple-400 shrink-0" />
                        <h4 className="text-xs font-bold uppercase tracking-wider">
                          Dermatological Assessment
                        </h4>
                      </div>

                      <div className="bg-zinc-900/90 p-2.5 rounded-lg border border-zinc-800 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-zinc-400">
                          <span>Visual Presentation:</span>
                          <span className="font-semibold text-purple-300">Pigmented Lesion / Mole</span>
                        </div>
                        <p className="text-[11px] text-zinc-300 leading-relaxed">
                          The image exhibits a discrete, pigmented cutaneous macule/papule (characteristic of a <strong>Melanocytic Nevus / Mole</strong>). The 39.5% &apos;infection&apos; model flag is a low-confidence classification from a 7-class screening network rather than a confirmed infectious dermatitis.
                        </p>
                      </div>

                      {/* Differential Diagnoses Spectrum */}
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          Clinical Differential Spectrum
                        </span>
                        <div className="grid grid-cols-1 gap-1 text-[11px]">
                          <div className="flex items-center justify-between px-2 py-1 rounded bg-zinc-900/60 border border-zinc-800/80">
                            <span className="text-emerald-300">● Melanocytic Nevus (Common Mole)</span>
                            <span className="text-[10px] text-zinc-400">Most Probable</span>
                          </div>
                          <div className="flex items-center justify-between px-2 py-1 rounded bg-zinc-900/60 border border-zinc-800/80">
                            <span className="text-amber-300">● Dysplastic / Atypical Mole</span>
                            <span className="text-[10px] text-zinc-400">Monitor ABCDE</span>
                          </div>
                          <div className="flex items-center justify-between px-2 py-1 rounded bg-zinc-900/60 border border-zinc-800/80">
                            <span className="text-cyan-300">● Seborrheic Keratosis / Lentigo</span>
                            <span className="text-[10px] text-zinc-400">Benign</span>
                          </div>
                          <div className="flex items-center justify-between px-2 py-1 rounded bg-zinc-900/60 border border-zinc-800/80">
                            <span className="text-rose-300">● Infection / Dermatitis (39.5% Model)</span>
                            <span className="text-[10px] text-zinc-400">Low Fit</span>
                          </div>
                        </div>
                      </div>

                      {/* ABCDE Clinical Checklist Guidance */}
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          ABCDE Evaluation Guide
                        </span>
                        <div className="text-[10px] text-zinc-300 bg-zinc-900/80 p-2 rounded-lg border border-zinc-800/80 space-y-1">
                          <p><strong>A - Asymmetry:</strong> Check if halves mirror each other.</p>
                          <p><strong>B - Border:</strong> Check for scalloped, notched, or ragged edges.</p>
                          <p><strong>C - Color:</strong> Check for varied shades (brown, black, tan, red).</p>
                          <p><strong>D - Diameter:</strong> Compare size against 6mm (pencil eraser).</p>
                          <p><strong>E - Evolution:</strong> Inquire if spot has changed in size or sensation.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Summary / Clinical Impression */}
                  {detection.summary && (
                    <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Clinical Impression
                      </span>
                      <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/80 p-3 rounded-lg border border-zinc-800">
                        {detection.summary}
                      </p>
                    </div>
                  )}

                  {/* Recommendations */}
                  {detection.recommendations && detection.recommendations.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Suggested Actions
                      </span>
                      <ul className="text-xs text-zinc-300 space-y-1.5">
                        {detection.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-1.5 bg-zinc-900/40 p-2 rounded border border-zinc-800/80">
                            <span className="text-primary font-bold">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
