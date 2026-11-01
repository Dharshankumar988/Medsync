"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, X, Loader2, ScanLine, ZoomIn, Focus, Flashlight, FlashlightOff, Crosshair, CheckCircle2 } from "lucide-react";
import { Button } from "./button";

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [hasCameras, setHasCameras] = useState<boolean | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [scanStatus, setScanStatus] = useState<"searching" | "aligned" | "processing">("searching");
  const [tapPosition, setTapPosition] = useState<{ x: number; y: number } | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    onScanRef.current = onScan;
    onCloseRef.current = onClose;
  }, [onScan, onClose]);

  // Apply zoom to camera track
  const applyZoom = useCallback(async (level: number) => {
    if (!videoTrackRef.current) return;
    try {
      const capabilities = videoTrackRef.current.getCapabilities?.() as any;
      if (capabilities?.zoom) {
        const clampedZoom = Math.min(Math.max(level, capabilities.zoom.min), capabilities.zoom.max);
        await videoTrackRef.current.applyConstraints({
          advanced: [{ zoom: clampedZoom } as any]
        });
        setZoomLevel(clampedZoom);
      }
    } catch (e) {
      console.warn("Zoom not supported:", e);
    }
  }, []);

  // Toggle flashlight / torch
  const toggleTorch = useCallback(async () => {
    if (!videoTrackRef.current) return;
    try {
      const nextState = !isTorchOn;
      await videoTrackRef.current.applyConstraints({
        advanced: [{ torch: nextState } as any]
      });
      setIsTorchOn(nextState);
    } catch (e) {
      console.warn("Torch toggle failed:", e);
    }
  }, [isTorchOn]);

  // Handle tap-to-focus with visual ring
  const handleTapToFocus = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setTapPosition({ x, y });

    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = setTimeout(() => {
      setTapPosition(null);
    }, 1200);

    // Re-apply continuous autofocus constraint if supported
    if (videoTrackRef.current) {
      try {
        const capabilities = videoTrackRef.current.getCapabilities?.() as any;
        if (capabilities?.focusMode?.includes("continuous")) {
          videoTrackRef.current.applyConstraints({
            advanced: [{ focusMode: "continuous" } as any]
          }).catch(() => {});
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const scannerId = "qr-reader";

    const initScanner = async () => {
      if (scannerRef.current) return;
      try {
        const devices = await Html5Qrcode.getCameras();
        if (mounted) {
          setHasCameras(devices && devices.length > 0);
          
          if (devices && devices.length > 0) {
            scannerRef.current = new Html5Qrcode(scannerId, {
              formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
              verbose: false
            });
            
            await scannerRef.current.start(
              { facingMode: "environment" },
              {
                fps: 20, // Snappy high-rate decoding like GPay
                aspectRatio: 1.0,
                qrbox: (viewfinderWidth, viewfinderHeight) => {
                  const edge = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.75);
                  return { width: edge, height: edge };
                }
              },
              (decodedText) => {
                if (isScanningRef.current) return;
                isScanningRef.current = true;
                setScanStatus("aligned");

                // Trigger subtle haptic feedback if device supports it
                if (typeof window !== "undefined" && "vibrate" in navigator) {
                  try {
                    navigator.vibrate([40, 30, 40]);
                  } catch {}
                }

                setTimeout(() => {
                  setScanStatus("processing");
                  if (scannerRef.current?.isScanning) {
                    scannerRef.current.stop().then(() => {
                      onScanRef.current(decodedText);
                    }).catch(() => onScanRef.current(decodedText));
                  } else {
                    onScanRef.current(decodedText);
                  }
                }, 300);
              },
              () => {
                // Ignore parse frames
              }
            );

            // Access video element and MediaStreamTrack for autofocus and camera controls
            setTimeout(() => {
              if (!mounted) return;
              const videoEl = document.querySelector(`#${scannerId} video`) as HTMLVideoElement;
              if (videoEl && videoEl.srcObject) {
                const stream = videoEl.srcObject as MediaStream;
                const track = stream.getVideoTracks()[0];
                if (track) {
                  videoTrackRef.current = track;
                  const caps = track.getCapabilities ? (track.getCapabilities() as any) : null;
                  if (caps?.torch) setHasTorch(true);
                  if (caps?.zoom) {
                    setMaxZoom(caps.zoom.max);
                  }
                  
                  // Auto-focus constraints
                  try {
                    const advanced: any[] = [];
                    if (caps?.focusMode?.includes("continuous")) advanced.push({ focusMode: "continuous" });
                    if (caps?.exposureMode?.includes("continuous")) advanced.push({ exposureMode: "continuous" });
                    if (caps?.whiteBalanceMode?.includes("continuous")) advanced.push({ whiteBalanceMode: "continuous" });
                    if (advanced.length > 0) {
                      track.applyConstraints({ advanced }).catch(() => {});
                    }
                  } catch (e) {
                    console.warn("Could not apply autofocus constraints:", e);
                  }
                }
              }
            }, 400);

            if (mounted) {
              setScanStatus("searching");
            }
          }
        }
      } catch (err) {
        console.error("Failed to initialize camera", err);
        if (mounted) setHasCameras(false);
      }
    };

    initScanner();

    return () => {
      mounted = false;
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().then(() => {
          if (scannerRef.current) {
            try {
              scannerRef.current.clear();
            } catch {}
          }
        }).catch(() => {});
      } else if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch {}
      }
      scannerRef.current = null;
    };
  }, []);

  const handleClose = () => {
    if (scannerRef.current?.isScanning) {
      scannerRef.current.stop().then(() => {
        if (scannerRef.current) {
          try {
            scannerRef.current.clear();
          } catch {}
        }
        onCloseRef.current();
      }).catch(() => onCloseRef.current());
    } else {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch {}
      }
      onCloseRef.current();
    }
  };

  return (
    <div 
      onClick={handleTapToFocus}
      className="flex flex-col items-center justify-center p-4 bg-black/95 text-white rounded-3xl w-full max-w-md mx-auto aspect-[4/5] relative overflow-hidden select-none shadow-2xl border border-white/10"
    >
      {/* Top action bar: Close + Torch + Zoom */}
      <div className="absolute top-4 inset-x-4 z-50 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2">
          {hasTorch && (
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full h-9 w-9 backdrop-blur-md border transition-all ${
                isTorchOn 
                  ? "bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/30" 
                  : "bg-black/50 text-white/80 border-white/20 hover:bg-black/70"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                toggleTorch();
              }}
              title={isTorchOn ? "Turn off torch" : "Turn on torch"}
            >
              {isTorchOn ? <Flashlight className="h-4 w-4 fill-current" /> : <FlashlightOff className="h-4 w-4" />}
            </Button>
          )}

          {maxZoom > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-3 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-xs font-mono font-medium hover:bg-black/70 gap-1.5"
              onClick={(e) => {
                e.stopPropagation();
                const next = zoomLevel >= 2 ? 1 : 2;
                applyZoom(next);
              }}
            >
              <ZoomIn className="h-3.5 w-3.5 text-primary" />
              <span>{zoomLevel.toFixed(1)}x</span>
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 bg-black/50 backdrop-blur-md rounded-full h-9 w-9 border border-white/20 shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Loading state */}
      {hasCameras === null && (
        <div className="flex flex-col items-center gap-4 text-center p-6">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-semibold tracking-wide">Initializing Smart Camera...</p>
          <p className="text-xs text-white/50">Auto-align and focus will activate automatically</p>
        </div>
      )}

      {/* No cameras detected */}
      {hasCameras === false && (
        <div className="flex flex-col items-center gap-4 text-center p-6">
          <div className="bg-red-500/20 p-4 rounded-2xl text-red-400 border border-red-500/30">
            <Camera className="h-8 w-8" />
          </div>
          <p className="text-sm font-semibold text-red-200">Camera Access Unavailable</p>
          <p className="text-xs text-white/50 max-w-xs leading-relaxed">
            Please allow camera permissions in your browser address bar or use manual entry below.
          </p>
        </div>
      )}

      {/* Scanner video element */}
      <div 
        id="qr-reader" 
        className={`w-full h-full [&>video]:object-cover [&>video]:w-full [&>video]:h-full ${hasCameras === true ? 'opacity-100' : 'opacity-0 absolute -z-10'}`} 
      />

      {/* Tap-to-focus animated ring */}
      {tapPosition && (
        <div 
          className="absolute pointer-events-none z-30 -translate-x-1/2 -translate-y-1/2"
          style={{ left: tapPosition.x, top: tapPosition.y }}
        >
          <div className="w-14 h-14 rounded-full border-2 border-primary/90 animate-ping opacity-75" />
          <div className="absolute inset-0 w-14 h-14 rounded-full border border-primary flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          </div>
        </div>
      )}

      {/* GPay-style viewfinder reticle & laser */}
      {hasCameras === true && (
        <>
          {/* Darkened vignette mask around central scanning box */}
          <div className="absolute inset-0 pointer-events-none z-10 bg-radial-[circle_at_center,transparent_45%,rgba(0,0,0,0.55)_90%]" />

          {/* Central Align Box */}
          <div className={`absolute inset-[16%] pointer-events-none z-20 transition-all duration-300 ${
            scanStatus === 'aligned' ? 'scale-95' : 'scale-100'
          }`}>
            {/* Top-left corner */}
            <div className={`absolute top-0 left-0 w-9 h-9 border-t-4 border-l-4 rounded-tl-2xl transition-all duration-300 ${
              scanStatus === 'aligned' 
                ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]' 
                : 'border-white shadow-[0_0_8px_rgba(255,255,255,0.4)]'
            }`} />

            {/* Top-right corner */}
            <div className={`absolute top-0 right-0 w-9 h-9 border-t-4 border-r-4 rounded-tr-2xl transition-all duration-300 ${
              scanStatus === 'aligned' 
                ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]' 
                : 'border-white shadow-[0_0_8px_rgba(255,255,255,0.4)]'
            }`} />

            {/* Bottom-left corner */}
            <div className={`absolute bottom-0 left-0 w-9 h-9 border-b-4 border-l-4 rounded-bl-2xl transition-all duration-300 ${
              scanStatus === 'aligned' 
                ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]' 
                : 'border-white shadow-[0_0_8px_rgba(255,255,255,0.4)]'
            }`} />

            {/* Bottom-right corner */}
            <div className={`absolute bottom-0 right-0 w-9 h-9 border-b-4 border-r-4 rounded-br-2xl transition-all duration-300 ${
              scanStatus === 'aligned' 
                ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]' 
                : 'border-white shadow-[0_0_8px_rgba(255,255,255,0.4)]'
            }`} />

            {/* Center Aim Crosshair (GPay-style) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-30">
              <Crosshair className="w-8 h-8 text-white stroke-[1.5]" />
            </div>

            {/* Continuous scanning beam */}
            <div className={`absolute left-1 right-1 h-0.5 rounded-full transition-all duration-200 ${
              scanStatus === 'aligned' 
                ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,1)]' 
                : 'bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_10px_rgba(59,130,246,0.9)] animate-scan-beam'
            }`} />
          </div>

          {/* Bottom status indicator pill */}
          <div className="absolute bottom-6 inset-x-0 flex justify-center z-20 pointer-events-none px-4">
            <div className={`backdrop-blur-xl px-4 py-2 rounded-full border shadow-xl flex items-center gap-2 transition-all duration-300 ${
              scanStatus === 'aligned'
                ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-300 scale-105'
                : scanStatus === 'processing'
                ? 'bg-blue-500/25 border-blue-400/50 text-blue-300'
                : 'bg-black/75 border-white/15 text-white/90'
            }`}>
              {scanStatus === 'aligned' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 animate-bounce" />
                  <span className="text-xs font-semibold tracking-wide">QR Aligned • Verified</span>
                </>
              ) : scanStatus === 'processing' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                  <span className="text-xs font-semibold tracking-wide">Decoding Prescription...</span>
                </>
              ) : (
                <>
                  <Focus className="h-4 w-4 text-primary animate-pulse" />
                  <span className="text-xs font-medium tracking-wide">Align QR code • Tap anywhere to focus</span>
                </>
              )}
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes scan-beam {
          0% {
            top: 5%;
            opacity: 0.2;
          }
          50% {
            top: 92%;
            opacity: 1;
          }
          100% {
            top: 5%;
            opacity: 0.2;
          }
        }
        .animate-scan-beam {
          animation: scan-beam 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
}
