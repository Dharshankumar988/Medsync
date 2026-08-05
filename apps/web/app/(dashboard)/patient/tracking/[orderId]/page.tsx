"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { Button } from "@medsync/ui";
import { Input } from "@medsync/ui";
import { Skeleton } from "@medsync/ui";
import { CheckCircle2, Navigation, Package, Clock, ShieldCheck, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

// Fix for default Leaflet icons not loading in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const deliveryIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3063/3063822.png", // Delivery bike icon
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const pharmacyIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/4320/4320337.png", // Pharmacy icon
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

const patientIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/2991/2991231.png", // Home/Patient icon
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

export default function PatientTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const { getToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const animationRef = useRef<number>();

  useEffect(() => {
    const fetchTracking = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`http://localhost:8000/api/v1/orders/${orderId}/tracking`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await (res.json() as Promise<any>);
        
        if (data.data) {
          setTrackingData(data.data);
          if (data.data.current_lat && data.data.current_lng) {
             setCurrentPos([data.data.current_lat, data.data.current_lng]);
          }
        }
      } catch (error) {
        toast.error("Failed to fetch tracking data");
      } finally {
        setLoading(false);
      }
    };
    fetchTracking();
  }, [orderId, getToken]);

  // Simulation Loop
  useEffect(() => {
    if (!trackingData || trackingData.status === "DELIVERED" || trackingData.status === "PREPARING") return;

    let lastTime = performance.now();
    const speed = trackingData.speed || 40; // km/h
    const speedPerMs = (speed / 3600) / 1000; // km per ms
    
    // Very naive distance to degrees approximation (1 degree approx 111 km)
    const kmToDeg = 1 / 111;

    const animate = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;

      setCurrentPos((prev) => {
        if (!prev) return null;
        
        const [lat, lng] = prev;
        const [endLat, endLng] = [trackingData.end_lat, trackingData.end_lng];
        
        const distLat = endLat - lat;
        const distLng = endLng - lng;
        const distSq = distLat * distLat + distLng * distLng;
        
        if (distSq < 0.000001) return [endLat, endLng]; // Reached

        const dist = Math.sqrt(distSq);
        const ratio = Math.min((speedPerMs * dt * kmToDeg) / dist, 1);
        
        // Add some random pause/slowdown for realism
        if (Math.random() > 0.98) return prev; // Traffic light simulation

        return [lat + distLat * ratio, lng + distLng * ratio];
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [trackingData]);

  const handleVerifyOTP = async () => {
    setIsVerifying(true);
    try {
      const token = await getToken();
      const res = await fetch(`http://localhost:8000/api/v1/orders/${orderId}/verify-delivery`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ otp }),
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.success("Delivery confirmed successfully!");
        setTrackingData((prev: any) => ({ ...prev, status: "DELIVERED", progress: 100 }));
      } else {
        toast.error(data.message || "Invalid OTP");
      }
    } catch (error) {
      toast.error("An error occurred verifying delivery");
    } finally {
      setIsVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto p-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
        <Skeleton className="h-[200px] w-full rounded-xl" />
      </div>
    );
  }

  if (!trackingData) {
    return (
      <div className="p-8 text-center max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold">Order Not Found</h2>
        <p className="text-muted-foreground mt-2">Could not track this order.</p>
        <Button className="mt-4" onClick={() => router.push("/patient/dashboard")}>Back to Dashboard</Button>
      </div>
    );
  }

  const isDelivered = trackingData.status === "DELIVERED";

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Tracking</h1>
          <p className="text-muted-foreground mt-1">Order #{orderId.slice(0, 8).toUpperCase()}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Status</div>
          <div className="font-semibold text-lg text-primary">{trackingData.status.replace(/_/g, " ")}</div>
        </div>
      </div>

      {/* Map Card */}
      <Card className="overflow-hidden shadow-lg border-primary/10">
        <div className="h-[450px] w-full bg-slate-100 dark:bg-slate-800 relative">
          {typeof window !== "undefined" && currentPos && trackingData.start_lat && trackingData.end_lat && (
            <MapContainer 
              center={currentPos} 
              zoom={14} 
              style={{ height: "100%", width: "100%", zIndex: 0 }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              
              {/* Pharmacy */}
              <Marker position={[trackingData.start_lat, trackingData.start_lng]} icon={pharmacyIcon}>
                <Popup>Pharmacy</Popup>
              </Marker>
              
              {/* Delivery Driver */}
              {!isDelivered && (
                <Marker position={currentPos} icon={deliveryIcon}>
                  <Popup>{trackingData.driver_name} - {trackingData.vehicle_type}</Popup>
                </Marker>
              )}

              {/* Patient Location */}
              <Marker position={[trackingData.end_lat, trackingData.end_lng]} icon={patientIcon}>
                <Popup>Delivery Address</Popup>
              </Marker>
            </MapContainer>
          )}
          {!currentPos && (
             <div className="flex items-center justify-center h-full">
               <span className="text-muted-foreground animate-pulse">Initializing simulation...</span>
             </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Driver Details */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-primary" /> Delivery Executive
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trackingData.driver_name ? (
              <div className="flex items-center gap-4">
                <img 
                  src={trackingData.driver_avatar} 
                  alt={trackingData.driver_name} 
                  className="w-16 h-16 rounded-full bg-slate-100 p-1 border-2 border-primary/20"
                />
                <div>
                  <h3 className="font-semibold text-lg">{trackingData.driver_name}</h3>
                  <p className="text-sm text-muted-foreground">{trackingData.vehicle_type} • {trackingData.vehicle_number}</p>
                  {!isDelivered && (
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      <Clock className="w-4 h-4 text-orange-500" /> 
                      ETA: {new Date(trackingData.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground py-4 text-center border border-dashed rounded-lg bg-slate-50 dark:bg-slate-900/50">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-20" />
                Driver not assigned yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verification Card */}
        <Card className="shadow-md border-t-4 border-t-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-500" /> Secure Delivery
            </CardTitle>
            <CardDescription>Share OTP with executive at the door</CardDescription>
          </CardHeader>
          <CardContent>
            {isDelivered ? (
              <div className="flex flex-col items-center justify-center py-4 text-green-500 animate-in fade-in zoom-in duration-500">
                <CheckCircle2 className="w-16 h-16 mb-2" />
                <h3 className="font-semibold text-xl">Delivered Successfully</h3>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-6 text-center border border-slate-200 dark:border-slate-800">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Your Secret OTP</p>
                  <p className="text-4xl font-mono tracking-[0.5em] font-bold text-primary">
                    {trackingData.has_otp ? "******" : "---"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-3">Check your SMS or email for the actual code.</p>
                </div>
                
                <div className="flex gap-2">
                  <Input 
                    placeholder="Enter 6-digit OTP (Simulation test)" 
                    value={otp} 
                    onChange={(e) => setOtp(e.target.value)} 
                    maxLength={6}
                    disabled={isVerifying}
                    className="text-center tracking-widest font-mono"
                  />
                  <Button onClick={handleVerifyOTP} disabled={isVerifying || otp.length !== 6}>
                    {isVerifying ? "Verifying..." : "Verify"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
