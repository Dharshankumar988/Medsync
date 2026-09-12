"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, X, Loader2, ScanLine } from "lucide-react";
import { Button } from "./button";

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [hasCameras, setHasCameras] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    let mounted = true;
    const scannerId = "qr-reader";

    const initScanner = async () => {
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
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
              },
              (decodedText) => {
                // Ignore multiple scans while processing
                if (isScanning) return;
                setIsScanning(true);
                
                // Stop scanner and call onScan
                if (scannerRef.current?.isScanning) {
                  scannerRef.current.stop().then(() => {
                    onScan(decodedText);
                  }).catch(console.error);
                } else {
                  onScan(decodedText);
                }
              },
              (errorMessage) => {
                // Parse errors are expected frequently when scanning
              }
            );
            setIsScanning(true);
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
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [onScan]);

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-black/90 text-white rounded-2xl w-full max-w-md mx-auto aspect-[4/5] relative overflow-hidden">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 bg-black/40 rounded-full h-8 w-8"
        onClick={() => {
          if (scannerRef.current?.isScanning) {
            scannerRef.current.stop().catch(console.error);
          }
          onClose();
        }}
      >
        <X className="h-5 w-5" />
      </Button>

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

      <div 
        id="qr-reader" 
        className={`w-full h-full [&>video]:object-cover [&>video]:w-full [&>video]:h-full ${hasCameras === true ? 'opacity-100' : 'opacity-0 absolute -z-10'}`} 
      />
      
      {hasCameras === true && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
            <ScanLine className="h-4 w-4 animate-pulse text-primary" />
            <span className="text-xs font-medium tracking-wide">Position QR code within frame</span>
          </div>
        </div>
      )}
    </div>
  );
}
