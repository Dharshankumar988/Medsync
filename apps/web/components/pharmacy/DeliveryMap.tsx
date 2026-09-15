import React, { useEffect, useState, useRef, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@medsync/ui';
import { MapPin, CheckCircle, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '@/lib/supabase';

// Fix Leaflet's default icon path issues
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const riderIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png", // Ideally a bike icon
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [30, 46],
  iconAnchor: [15, 46],
});

interface DeliveryMapProps {
  orderId: string;
  patientAddress: string;
  patientName: string;
  pharmacyAddress: string;
  pharmacyId?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  updatedAt?: string;
  onClose: () => void;
}

export const DeliveryMap = memo(function DeliveryMap({ 
  orderId, patientAddress, patientName, pharmacyAddress, pharmacyId, deliveryLat, deliveryLng, updatedAt, onClose 
}: DeliveryMapProps) {
  const [status, setStatus] = useState<"PREPARING" | "IN_TRANSIT" | "DELIVERED">("PREPARING");
  const [progress, setProgress] = useState(0);
  const [pharmacyPos, setPharmacyPos] = useState<[number, number]>([12.9716, 77.5946]); // Default Bangalore
  const [patientPos, setPatientPos] = useState<[number, number]>([12.9229, 77.6175]);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch Pharmacy Location
  useEffect(() => {
    const fetchPharmacyLocation = async () => {
      if (pharmacyId) {
        const { data } = await supabase.from('pharmacy').select('location').eq('user_id', pharmacyId).single();
        if (data && data.location && data.location.lat && data.location.lng) {
          setPharmacyPos([data.location.lat, data.location.lng]);
        } else {
          // fallback to hospitals table
          const { data: hospData } = await supabase.from('hospitals').select('latitude, longitude').eq('user_id', pharmacyId).single();
          if (hospData && hospData.latitude && hospData.longitude) {
            setPharmacyPos([hospData.latitude, hospData.longitude]);
          }
        }
      }
    };
    fetchPharmacyLocation();
  }, [pharmacyId]);

  // Set Patient Location
  useEffect(() => {
    if (deliveryLat && deliveryLng) {
      setPatientPos([deliveryLat, deliveryLng]);
    }
  }, [deliveryLat, deliveryLng]);

  // Fetch OSRM Route
  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${pharmacyPos[1]},${pharmacyPos[0]};${patientPos[1]},${patientPos[0]}?geometries=geojson`);
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          const coordinates = data.routes[0].geometry.coordinates;
          const latLngs: [number, number][] = coordinates.map((c: [number, number]) => [c[1], c[0]]);
          setRoutePath(latLngs);
        } else {
          setRoutePath([pharmacyPos, patientPos]);
        }
      } catch (err) {
        console.error("OSRM fetch failed", err);
        setRoutePath([pharmacyPos, patientPos]);
      }
    };
    fetchRoute();
  }, [pharmacyPos, patientPos]);

  // Calculate position on path based on progress
  const getPositionAlongPath = (path: [number, number][], prog: number): [number, number] => {
    if (path.length === 0) return pharmacyPos;
    if (path.length === 1 || prog <= 0) return path[0];
    if (prog >= 100) return path[path.length - 1];

    const ratio = prog / 100;
    const rawIndex = ratio * (path.length - 1);
    const index = Math.floor(rawIndex);
    const segmentRatio = rawIndex - index;

    if (index >= path.length - 1) return path[path.length - 1];

    const start = path[index];
    const end = path[index + 1];

    return [
      start[0] + (end[0] - start[0]) * segmentRatio,
      start[1] + (end[1] - start[1]) * segmentRatio
    ];
  };

  // Timer Animation based on updatedAt
  useEffect(() => {
    const totalTime = 10 * 60 * 1000; // 10 minutes Zepto-style
    const updateInterval = 1000; 

    setStatus("IN_TRANSIT");

    const startTime = updatedAt ? new Date(updatedAt).getTime() : Date.now();

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      let currentProgress = (elapsed / totalTime) * 100;
      
      if (currentProgress < 0) currentProgress = 0;
      if (currentProgress >= 100) currentProgress = 100;
      
      setProgress(currentProgress);
      
      if (routePath.length > 0) {
        setCurrentPos(getPositionAlongPath(routePath, currentProgress));
      } else {
        setCurrentPos(getPositionAlongPath([pharmacyPos, patientPos], currentProgress));
      }

      if (currentProgress >= 100) {
        if (timerRef.current) clearInterval(timerRef.current);
        setStatus("DELIVERED");
      }
    }, updateInterval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [updatedAt, routePath, pharmacyPos, patientPos]);

  // Map Bounds
  const mapCenter: [number, number] = currentPos || pharmacyPos;

  return (
    <Card className="border-amber-500/20 shadow-xl relative overflow-hidden bg-background h-full flex flex-col">
      <div className="absolute top-2 right-2 z-[1000]">
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm p-2 bg-background/80 rounded-md shadow-sm border border-border">✕</button>
      </div>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-lg flex items-center gap-2 text-amber-500">
          <Navigation className="h-5 w-5" /> Live Delivery Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 flex flex-col pb-6">
        
        <div className="flex-1 w-full rounded-xl overflow-hidden border relative z-0 min-h-[300px]">
          {typeof window !== 'undefined' && (
            <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={pharmacyPos} icon={icon}>
                <Popup>Pharmacy</Popup>
              </Marker>
              <Marker position={patientPos} icon={icon}>
                <Popup>{patientName}&apos;s Address</Popup>
              </Marker>
              
              {routePath.length > 0 && (
                <Polyline positions={routePath} color="#3b82f6" weight={5} opacity={0.6} />
              )}
              
              {status === "IN_TRANSIT" && currentPos && (
                <Marker position={currentPos} icon={riderIcon} zIndexOffset={1000}>
                  <Popup>Delivery Rider</Popup>
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
              className="absolute top-0 left-0 h-full bg-amber-500 transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex flex-col items-center gap-1 w-1/3 text-center">
            <CheckCircle className={`h-5 w-5 ${status === "DELIVERED" ? "text-emerald-500" : "text-muted-foreground"}`} />
            <span className="truncate w-full text-xs" title={patientAddress}>Patient</span>
          </div>
        </div>

        <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border mt-2">
          <div>
            <div className="text-xs text-muted-foreground">Status</div>
            <Badge variant="outline" className={
              status === "DELIVERED" ? "border-emerald-500 text-emerald-500 bg-emerald-500/10" : "border-amber-500 text-amber-500 bg-amber-500/10"
            }>
              {status.replace("_", " ")}
            </Badge>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Estimated Arrival</div>
            <div className="font-mono font-semibold text-lg">
              {status === "DELIVERED" ? "Arrived" : `${Math.max(0, Math.ceil(10 - (progress / 10)))} Mins`}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
