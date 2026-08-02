import React, { useEffect, useState, useRef, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@medsync/ui';
import { MapPin, Truck, CheckCircle, Navigation } from 'lucide-react';

interface DeliveryMapProps {
  orderId: string;
  patientAddress: string;
  patientName: string;
  pharmacyAddress: string;
  onClose: () => void;
}

export const DeliveryMap = memo(function DeliveryMap({ orderId, patientAddress, patientName, pharmacyAddress, onClose }: DeliveryMapProps) {
  const [status, setStatus] = useState<"PREPARING" | "IN_TRANSIT" | "DELIVERED">("PREPARING");
  const [progress, setProgress] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const totalTime = 8000; // 8 seconds for animation
    const updateInterval = 100;
    const steps = totalTime / updateInterval;
    let currentStep = 0;

    setStatus("IN_TRANSIT");

    timerRef.current = setInterval(() => {
      currentStep++;
      const currentProgress = (currentStep / steps) * 100;
      setProgress(currentProgress);

      if (currentProgress >= 100) {
        if (timerRef.current) clearInterval(timerRef.current);
        setStatus("DELIVERED");
      }
    }, updateInterval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [orderId]);

  return (
    <Card className="border-amber-500/20 shadow-lg relative overflow-hidden bg-background">
      <div className="absolute top-2 right-2">
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm p-2">✕</button>
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2 text-amber-500">
          <Navigation className="h-5 w-5" /> Delivery Visualization
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-between items-center text-sm font-medium">
          <div className="flex flex-col items-center gap-1 w-1/3 text-center">
            <MapPin className="h-5 w-5 text-blue-500" />
            <span className="truncate w-full text-xs" title={pharmacyAddress}>Pharmacy ({pharmacyAddress.substring(0,10)}...)</span>
          </div>
          
          <div className="flex-1 relative h-2 bg-muted rounded-full mx-4 overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-amber-500 transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
            {status === "IN_TRANSIT" && (
              <div 
                className="absolute top-1/2 -translate-y-1/2 text-amber-500 transition-all duration-100 ease-linear"
                style={{ left: `calc(${progress}% - 12px)` }}
              >
                <Truck className="h-5 w-5 bg-background rounded-full" />
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-1 w-1/3 text-center">
            <CheckCircle className={`h-5 w-5 ${status === "DELIVERED" ? "text-emerald-500" : "text-muted-foreground"}`} />
            <span className="truncate w-full text-xs" title={patientAddress}>{patientName} ({patientAddress.substring(0,10)}...)</span>
          </div>
        </div>

        <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border">
          <div>
            <div className="text-xs text-muted-foreground">Status</div>
            <Badge variant="outline" className={
              status === "DELIVERED" ? "border-emerald-500 text-emerald-500" : "border-amber-500 text-amber-500"
            }>
              {status.replace("_", " ")}
            </Badge>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Estimated Arrival</div>
            <div className="font-mono font-semibold">
              {status === "DELIVERED" ? "Arrived" : "15 Mins"}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
