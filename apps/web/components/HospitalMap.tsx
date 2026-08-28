"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Building2, ChevronRight, Navigation, MapPin } from "lucide-react";
import { Button } from "@medsync/ui";

// Fix leaflet icon issue
const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Distinct icon for user's location
const userIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapBounds({ hospitals, userLoc }: { hospitals: any[], userLoc: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    const validHospitals = hospitals.filter((h) => h.latitude && h.longitude);
    const pts = validHospitals.map((h) => L.latLng(h.latitude, h.longitude));
    if (userLoc) {
      pts.push(L.latLng(userLoc[0], userLoc[1]));
    }
    
    if (pts.length > 0) {
      const bounds = L.latLngBounds(pts);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [hospitals, map, userLoc]);

  return null;
}

interface HospitalMapProps {
  hospitals: any[];
  onSelectHospital: (hospital: any) => void;
}

export default function HospitalMap({ hospitals, onSelectHospital }: HospitalMapProps) {
  const center: [number, number] = [12.9716, 77.5946]; // Bangalore center
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.warn("Geolocation error:", error);
        }
      );
    }
  }, []);

  const getDirectionsUrl = (hLat: number, hLng: number) => {
    if (userLocation) {
      return `https://www.google.com/maps/dir/?api=1&origin=${userLocation[0]},${userLocation[1]}&destination=${hLat},${hLng}`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${hLat},${hLng}`;
  };

  return (
    <div className="h-[300px] w-full rounded-xl overflow-hidden border border-border z-0 relative">
      <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%", zIndex: 0 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBounds hospitals={hospitals} userLoc={userLocation} />
        
        {userLocation && (
          <Marker position={userLocation} icon={userIcon}>
            <Popup className="rounded-xl">
              <div className="p-1 text-center">
                <p className="font-semibold text-sm">Your Location</p>
              </div>
            </Popup>
          </Marker>
        )}

        {hospitals.filter(h => h.latitude && h.longitude).map((hospital) => (
          <Marker
            key={hospital.id}
            position={[hospital.latitude, hospital.longitude]}
            icon={customIcon}
          >
            <Popup className="rounded-xl min-w-[200px]">
              <div className="p-1">
                <h3 className="font-semibold text-sm mb-1">{hospital.name}</h3>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                  {hospital.address}
                </p>
                <div className="flex flex-col gap-2">
                  <Button 
                    size="sm" 
                    className="w-full h-8 rounded-lg text-xs"
                    onClick={() => onSelectHospital(hospital)}
                  >
                    View Doctors <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-full h-8 rounded-lg text-xs"
                    onClick={() => {
                      window.open(getDirectionsUrl(hospital.latitude, hospital.longitude), '_blank', 'noopener,noreferrer');
                    }}
                  >
                    Show Directions <Navigation className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
