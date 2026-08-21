import React, { useEffect, useState, useRef, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@medsync/ui';
import { MapPin, Truck, CheckCircle, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet's default icon path issues
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

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

  // Hardcoded coordinates for demo
  const pharmacyPos: [number, number] = [40.7128, -74.0060];
  const patientPos: [number, number] = [40.7282, -73.9942];
  
  // Calculate current pos based on progress
  const currentLat = pharmacyPos[0] + (patientPos[0] - pharmacyPos[0]) * (progress / 100);
  const currentLng = pharmacyPos[1] + (patientPos[1] - pharmacyPos[1]) * (progress / 100);
  const currentPos: [number, number] = [currentLat, currentLng];

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
    <Card className="border-amber-500/20 shadow-xl relative overflow-hidden bg-background">
      <div className="absolute top-2 right-2 z-50">
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm p-2 bg-background/80 rounded-md shadow-sm">✕</button>
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2 text-amber-500">
          <Navigation className="h-5 w-5" /> Live Delivery Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        <div className="h-[250px] w-full rounded-lg overflow-hidden border">
          {typeof window !== 'undefined' && (
            <MapContainer center={[40.7205, -74.0001]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={pharmacyPos} icon={icon}>
                <Popup>Pharmacy</Popup>
              </Marker>
              <Marker position={patientPos} icon={icon}>
                <Popup>{patientName}&apos;s Address</Popup>
              </Marker>
              
              <Polyline positions={[pharmacyPos, patientPos]} color="blue" weight={3} dashArray="5, 10" opacity={0.5} />
              
              {status === "IN_TRANSIT" && (
                <Marker position={currentPos} icon={icon}>
                  <Popup>Driver</Popup>
                </Marker>
              )}
            </MapContainer>
          )}
        </div>

        <div className="flex justify-between items-center text-sm font-medium pt-2">
          <div className="flex flex-col items-center gap-1 w-1/3 text-center">
            <MapPin className="h-5 w-5 text-blue-500" />
            <span className="truncate w-full text-xs" title={pharmacyAddress}>Pharmacy</span>
          </div>
          
          <div className="flex-1 relative h-2 bg-muted rounded-full mx-4 overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-amber-500 transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex flex-col items-center gap-1 w-1/3 text-center">
            <CheckCircle className={`h-5 w-5 ${status === "DELIVERED" ? "text-emerald-500" : "text-muted-foreground"}`} />
            <span className="truncate w-full text-xs" title={patientAddress}>Patient</span>
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
