"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

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

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface LocationPickerMapProps {
  onLocationSelect: (lat: number, lng: number) => void;
  onAddressFound?: (address: string) => void;
  initialLocation?: { lat: number; lng: number } | null;
}

export default function LocationPickerMap({ onLocationSelect, onAddressFound, initialLocation }: LocationPickerMapProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    initialLocation ? [initialLocation.lat, initialLocation.lng] : null
  );

  const defaultCenter: [number, number] = [12.9716, 77.5946];

  const fetchAddress = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const parts = [
          addr.hospital || addr.clinic || addr.amenity,
          addr.road,
          addr.suburb || addr.neighbourhood,
          addr.city || addr.town || addr.village,
          addr.state,
          addr.postcode
        ].filter(Boolean);
        onAddressFound?.(parts.length > 0 ? parts.join(", ") : data.display_name);
      } else if (data && data.display_name) {
        onAddressFound?.(data.display_name);
      }
    } catch (err) {
      console.error("Reverse geocoding failed", err);
    }
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    onLocationSelect(lat, lng);
    if (onAddressFound) {
      fetchAddress(lat, lng);
    }
  };

  return (
    <div className="h-[300px] w-full rounded-xl overflow-hidden border border-border z-0 relative">
      <MapContainer 
        center={position || defaultCenter} 
        zoom={position ? 15 : 11} 
        style={{ height: "100%", width: "100%", zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onLocationSelect={handleLocationSelect} />
        {position && (
          <Marker position={position} icon={customIcon} />
        )}
      </MapContainer>
    </div>
  );
}
