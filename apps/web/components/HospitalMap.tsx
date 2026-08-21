"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Building2, ChevronRight } from "lucide-react";
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

function MapBounds({ hospitals }: { hospitals: any[] }) {
  const map = useMap();

  useEffect(() => {
    if (hospitals.length > 0) {
      const validHospitals = hospitals.filter((h) => h.latitude && h.longitude);
      if (validHospitals.length > 0) {
        const bounds = L.latLngBounds(validHospitals.map((h) => [h.latitude, h.longitude]));
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [hospitals, map]);

  return null;
}

interface HospitalMapProps {
  hospitals: any[];
  onSelectHospital: (hospital: any) => void;
}

export default function HospitalMap({ hospitals, onSelectHospital }: HospitalMapProps) {
  const center: [number, number] = [12.9716, 77.5946]; // Bangalore center

  return (
    <div className="h-[300px] w-full rounded-xl overflow-hidden border border-border z-0 relative">
      <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%", zIndex: 0 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBounds hospitals={hospitals} />
        {hospitals.filter(h => h.latitude && h.longitude).map((hospital) => (
          <Marker
            key={hospital.id}
            position={[hospital.latitude, hospital.longitude]}
            icon={customIcon}
          >
            <Popup className="rounded-xl">
              <div className="p-1">
                <h3 className="font-semibold text-sm mb-1">{hospital.name}</h3>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                  {hospital.address}
                </p>
                <Button 
                  size="sm" 
                  className="w-full h-8 rounded-lg text-xs"
                  onClick={() => onSelectHospital(hospital)}
                >
                  View Doctors <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
