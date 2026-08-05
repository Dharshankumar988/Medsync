"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

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

interface TrackingMapProps {
  currentPos: [number, number];
  startPos: [number, number];
  endPos: [number, number];
}

export default function TrackingMap({ currentPos, startPos, endPos }: TrackingMapProps) {
  return (
    <div className="h-[400px] w-full rounded-xl overflow-hidden border">
      <MapContainer 
        center={currentPos} 
        zoom={13} 
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Pharmacy Marker */}
        <Marker position={startPos} icon={pharmacyIcon}>
          <Popup>Pharmacy (Origin)</Popup>
        </Marker>
        
        {/* Patient Marker */}
        <Marker position={endPos} icon={patientIcon}>
          <Popup>Delivery Address (Destination)</Popup>
        </Marker>
        
        {/* Delivery Vehicle Marker */}
        <Marker position={currentPos} icon={deliveryIcon}>
          <Popup>Package is moving...</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
