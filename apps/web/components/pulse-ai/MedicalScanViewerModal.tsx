"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Layers, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  CheckCircle2, 
  Maximize2,
  Activity,
  Brain,
  Crosshair,
  Scan
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  const startPanRef = useRef({ x: 0, y: 0 });

  // Reset zoom on open
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setShowAnnotations(true);
    }
  }, [isOpen]);

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

  const activeBoxes = detection?.boxes || boxes || [];
  const isAbnormal = detection?.diagnosis && 
    !detection.diagnosis.toLowerCase().includes("no fracture") &&
    !detection.diagnosis.toLowerCase().includes("normal") &&
    !detection.diagnosis.toLowerCase().includes("benign") &&
    !detection.diagnosis.toLowerCase().includes("no abnormality");

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative flex flex-col w-full max-w-6xl h-[90vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100"
          >
            {/* Top Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-sm z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-zinc-800/80 border border-zinc-700/50">
                  {getScanIcon(detection?.scan_type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold tracking-wide text-zinc-100">
                      {imageName}
                    </h2>
                    {detection?.scan_type && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {detection.scan_type}
                      </span>
                    )}
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
                        ? "bg-primary/20 text-primary border-primary/40"
                        : "bg-zinc-800/80 text-zinc-400 border-zinc-700/60 hover:text-zinc-200"
                    )}
                    title="Toggle bounding box annotations"
                  >
                    {showAnnotations ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{showAnnotations ? "Annotations On" : "Annotations Off"}</span>
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

            {/* Central Viewport & Optional Diagnostic Banner */}
            <div className="relative flex-1 flex flex-col md:flex-row overflow-hidden bg-zinc-950">
              {/* Image Canvas */}
              <div 
                className={cn(
                  "relative flex-1 h-full flex items-center justify-center p-6 overflow-hidden select-none",
                  zoom > 1 ? (isPanning ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
                )}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                <div 
                  className="relative max-h-full max-w-full transition-transform duration-75 flex items-center justify-center"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={imageName}
                    draggable={false}
                    className="max-h-[75vh] max-w-[75vw] object-contain rounded-lg shadow-2xl border border-zinc-800/80"
                  />

                  {/* SVG Bounding Boxes Overlay */}
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
                              className="animate-pulse"
                            />
                            <text
                              x={`${Math.max(0, x)}%`}
                              y={`${Math.max(3, y - 1)}%`}
                              fill="#ffffff"
                              fontSize="3.5"
                              fontWeight="bold"
                              className="drop-shadow-md select-none"
                            >
                              ROI #{i + 1}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  )}
                </div>

                {/* Bottom Overlay Hint */}
                <div className="absolute bottom-4 left-6 pointer-events-none text-[11px] text-zinc-500 bg-zinc-900/80 backdrop-blur-sm px-3 py-1 rounded-full border border-zinc-800">
                  {zoom > 1 ? "Drag to pan image | Scroll or click controls to zoom" : "Use zoom controls to inspect radiologic details"}
                </div>
              </div>

              {/* Side Diagnostic Summary Card if detection exists */}
              {detection && (
                <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-zinc-800 bg-zinc-900/40 p-5 overflow-y-auto space-y-4 shrink-0">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Model Detection
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
                      <div>
                        <p className="text-sm font-semibold leading-tight">
                          {detection.diagnosis}
                        </p>
                        <p className="text-xs opacity-80 mt-1">
                          Confidence: {detection.confidence_percent}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Confidence Meter */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Statistical Confidence</span>
                      <span className="font-semibold text-zinc-200">{detection.confidence_percent}%</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          isAbnormal ? "bg-rose-500" : "bg-emerald-500"
                        )}
                        style={{ width: `${Math.min(detection.confidence_percent, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Summary */}
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
