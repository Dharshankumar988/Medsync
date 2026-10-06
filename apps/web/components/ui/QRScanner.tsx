"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, X, Loader2, ScanLine, ZoomIn, Focus } from "lucide-react";
import { Button } from "./button";

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [hasCameras, setHasCameras] = useState<boolean | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [isAutoZooming, setIsAutoZooming] = useState(false);
  const [scanStatus, setScanStatus] = useState<"searching" | "detected" | "processing">("searching");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const autoZoomIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectionCountRef = useRef(0);

  // Update refs when callbacks change
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
                fps: 10,
                aspectRatio: 1.0,
              },
              (decodedText) => {
                console.log("QR Code scanned:", decodedText);
                // Ignore multiple scans while processing
                if (isScanningRef.current) return;
                isScanningRef.current = true;
                setScanStatus("processing");
                
                // Stop scanner and call onScan
                if (scannerRef.current?.isScanning) {
                  scannerRef.current.stop().then(() => {
                    onScanRef.current(decodedText);
                  }).catch(console.error);
                } else {
                  onScanRef.current(decodedText);
                }
              },
              (errorMessage) => {
                // Parse errors are expected frequently when scanning
              }
            );

            // Set searching status
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
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().then(() => {
          if (scannerRef.current) {
            try {
              scannerRef.current.clear();
            } catch (e) {
              console.error("Error clearing scanner:", e);
            }
          }
        }).catch(console.error);
      } else if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (e) {
          console.error("Error clearing scanner:", e);
        }
      }
      scannerRef.current = null;
    };
  }, []);

  const handleClose = () => {
    if (autoZoomIntervalRef.current) {
      clearInterval(autoZoomIntervalRef.current);
      autoZoomIntervalRef.current = null;
    }
    if (scannerRef.current?.isScanning) {
      scannerRef.current.stop().then(() => {
        if (scannerRef.current) {
          try {
            scannerRef.current.clear();
          } catch (e) {
            console.error("Error clearing scanner:", e);
          }
        }
        onCloseRef.current();
      }).catch((err) => {
        console.error(err);
        onCloseRef.current();
      });
    } else {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (e) {
          console.error("Error clearing scanner:", e);
        }
      }
      onCloseRef.current();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-black/90 text-white rounded-2xl w-full max-w-md mx-auto aspect-[4/5] relative overflow-hidden">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 bg-black/40 rounded-full h-8 w-8"
        onClick={handleClose}
      >
        <X className="h-5 w-5" />
      </Button>

      {/* Zoom indicator */}
      {maxZoom > 1 && hasCameras === true && (
        <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
          <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
            <ZoomIn className="h-3.5 w-3.5 text-white/70" />
            <span className="text-xs font-mono font-medium">{zoomLevel.toFixed(1)}x</span>
          </div>
          {isAutoZooming && (
            <div className="bg-blue-500/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-blue-400/30 flex items-center gap-1.5 animate-pulse">
              <Focus className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-xs font-medium text-blue-300">Locking</span>
            </div>
          )}
        </div>
      )}

      {hasCameras === null && (
        <div className="flex flex-col items-center gap-4 text-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-white/70" />
          <p className="text-sm font-medium">Requesting camera access...</p>
        </div>
      )}

      {hasCameras === false && (
        <div className="flex flex-col items-center gap-4 text-center p-6">
          <div className="bg-red-500/20 p-4 rounded-full text-red-400">
            <Camera className="h-8 w-8" />
          </div>
          <p className="text-sm font-medium text-red-200">No cameras detected or permission denied.</p>
          <p className="text-xs text-white/50">Please allow camera access in your browser settings or use manual entry.</p>
        </div>
      )}

      {/* Scanner viewport with animated corners */}
      <div 
        id="qr-reader" 
        className={`w-full h-full [&>video]:object-cover [&>video]:w-full [&>video]:h-full ${hasCameras === true ? 'opacity-100' : 'opacity-0 absolute -z-10'}`} 
      />
      
      {/* Animated scanning overlay */}
      {hasCameras === true && (
        <>
          {/* Corner brackets that pulse when QR detected */}
          <div className={`absolute inset-[15%] pointer-events-none z-10 transition-all duration-500 ${scanStatus === 'detected' ? 'scale-95' : 'scale-100'}`}>
            {/* Top-left corner */}
            <div className={`absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 rounded-tl-lg transition-colors duration-300 ${
              scanStatus === 'detected' ? 'border-green-400' : scanStatus === 'processing' ? 'border-blue-400' : 'border-white/60'
            }`} />
            {/* Top-right corner */}
            <div className={`absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 rounded-tr-lg transition-colors duration-300 ${
              scanStatus === 'detected' ? 'border-green-400' : scanStatus === 'processing' ? 'border-blue-400' : 'border-white/60'
            }`} />
            {/* Bottom-left corner */}
            <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 rounded-bl-lg transition-colors duration-300 ${
              scanStatus === 'detected' ? 'border-green-400' : scanStatus === 'processing' ? 'border-blue-400' : 'border-white/60'
            }`} />
            {/* Bottom-right corner */}
            <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 rounded-br-lg transition-colors duration-300 ${
              scanStatus === 'detected' ? 'border-green-400' : scanStatus === 'processing' ? 'border-blue-400' : 'border-white/60'
            }`} />
            
            {/* Scanning laser line */}
            <div className={`absolute left-2 right-2 h-0.5 rounded-full transition-colors duration-300 ${
              scanStatus === 'detected' ? 'bg-green-400/80' : 'bg-primary/60'
            } ${scanStatus === 'processing' ? 'opacity-0' : 'animate-scan-line'}`} />
          </div>

          {/* Status pill at bottom */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10 pointer-events-none">
            <div className={`backdrop-blur-md px-4 py-2 rounded-full border flex items-center gap-2 transition-all duration-500 ${
              scanStatus === 'detected' 
                ? 'bg-green-500/20 border-green-400/30' 
                : scanStatus === 'processing'
                ? 'bg-blue-500/20 border-blue-400/30'
                : 'bg-black/60 border-white/10'
            }`}>
              {scanStatus === 'detected' ? (
                <>
                  <Focus className="h-4 w-4 text-green-400" />
                  <span className="text-xs font-medium tracking-wide text-green-300">QR Detected — Auto-focusing...</span>
                </>
              ) : scanStatus === 'processing' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                  <span className="text-xs font-medium tracking-wide text-blue-300">Processing QR code...</span>
                </>
              ) : (
                <>
                  <ScanLine className="h-4 w-4 animate-pulse text-primary" />
                  <span className="text-xs font-medium tracking-wide">Position QR code within frame</span>
                </>
              )}
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes scan-line {
          0%, 100% { top: 10%; opacity: 0.3; }
          50% { top: 85%; opacity: 1; }
        }
        .animate-scan-line {
          animation: scan-line 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
