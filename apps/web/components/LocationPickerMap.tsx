"use client";

import { useState, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Search, Loader2, Navigation } from "lucide-react";
import { Input } from "@medsync/ui";

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

function MapUpdater({ position }: { position: [number, number] | null }) {
  const map = useMap();
  if (position) {
    map.flyTo(position, map.getZoom(), { animate: true });
  }
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
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const markerRef = useRef<any>(null);

  const defaultCenter: [number, number] = [12.9716, 77.5946];

  const fetchAddress = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const parts = [
          addr.hospital || addr.clinic || addr.amenity || addr.building,
          addr.house_number,
          addr.road || addr.street,
          addr.suburb || addr.neighbourhood || addr.locality,
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setPosition([lat, lng]);
        onLocationSelect(lat, lng);
        onAddressFound?.(data[0].display_name);
      }
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    
    setIsSearching(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setPosition([lat, lng]);
        onLocationSelect(lat, lng);
        if (onAddressFound) {
          fetchAddress(lat, lng);
        }
        setIsSearching(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Unable to retrieve your location. Please check your permissions.");
        setIsSearching(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const latlng = marker.getLatLng();
        handleLocationSelect(latlng.lat, latlng.lng);
      }
    },
  };

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for street, building, or area..."
            className="pl-9 h-10 bg-background"
          />
        </div>
        <button type="button" onClick={handleGetCurrentLocation} disabled={isSearching} className="px-3 h-10 bg-secondary text-secondary-foreground rounded-md flex items-center justify-center hover:bg-secondary/80 disabled:opacity-50" title="Use My Current Location">
          <Navigation className="h-4 w-4" />
        </button>
        <button type="submit" disabled={isSearching} className="px-4 h-10 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-500 disabled:opacity-50">
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </button>
      </form>
      <div className="h-[300px] w-full rounded-xl overflow-hidden border border-border z-0 relative">
        <MapContainer 
          center={position || defaultCenter} 
          zoom={position ? 19 : 11} 
          style={{ height: "100%", width: "100%", zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <MapClickHandler onLocationSelect={handleLocationSelect} />
          <MapUpdater position={position} />
          {position && (
            <Marker 
              position={position} 
              icon={customIcon} 
              draggable={true} 
              eventHandlers={eventHandlers} 
              ref={markerRef} 
            />
          )}
        </MapContainer>
      </div>
      <p className="text-[10px] text-muted-foreground">You can drag the marker to fine-tune the exact location.</p>
    </div>
  );
}
