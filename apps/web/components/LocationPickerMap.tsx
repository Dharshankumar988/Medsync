"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Search, Loader2, Navigation, MapPin, Check, X, Compass } from "lucide-react";
import { Input, Button } from "@medsync/ui";

// Professional delivery pin icon
const deliveryPinIcon = L.divIcon({
  className: "custom-delivery-pin",
  html: `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: translate(-50%, -100%);">
      <div style="width: 36px; height: 36px; background: #0284c7; border: 2px solid #ffffff; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.45);">
        <svg style="transform: rotate(45deg); width: 18px; height: 18px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
          <circle cx="12" cy="11" r="2.5" fill="white"/>
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 21s-6-5.333-6-10a6 6 0 0 1 12 0c0 4.667-6 10-6 10z"/>
        </svg>
      </div>
      <div style="width: 14px; height: 5px; background: rgba(0,0,0,0.35); border-radius: 50%; filter: blur(1.5px); margin-top: -2px;"></div>
    </div>
  `,
  iconSize: [36, 42],
  iconAnchor: [0, 0],
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
  useEffect(() => {
    if (position) {
      map.flyTo(position, Math.max(map.getZoom(), 16), { animate: true, duration: 1 });
    }
  }, [position, map]);
  return null;
}

interface SearchResult {
  place_id: string | number;
  display_name: string;
  lat: string;
  lon: string;
  address?: any;
}

interface LocationPickerMapProps {
  onLocationSelect: (lat: number, lng: number) => void;
  onAddressFound?: (address: string) => void;
  initialLocation?: { lat: number; lng: number } | null;
  className?: string;
}

export default function LocationPickerMap({
  onLocationSelect,
  onAddressFound,
  initialLocation,
  className = "",
}: LocationPickerMapProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    initialLocation && initialLocation.lat && initialLocation.lng
      ? [initialLocation.lat, initialLocation.lng]
      : null
  );
  const [resolvedAddress, setResolvedAddress] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const markerRef = useRef<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const defaultCenter: [number, number] = [12.9716, 77.5946]; // Bangalore default center

  // Reverse geocoding helper
  const fetchAddress = useCallback(
    async (lat: number, lng: number) => {
      setIsResolvingAddress(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
        );
        const data = await res.json();
        let formatted = "";
        if (data && data.address) {
          const addr = data.address;
          const parts = [
            addr.hospital || addr.clinic || addr.building || addr.amenity,
            addr.house_number,
            addr.road || addr.street,
            addr.suburb || addr.neighbourhood || addr.locality,
            addr.city || addr.town || addr.village,
            addr.state,
            addr.postcode,
          ].filter(Boolean);
          formatted = parts.length > 0 ? parts.join(", ") : data.display_name;
        } else if (data && data.display_name) {
          formatted = data.display_name;
        }

        if (formatted) {
          setResolvedAddress(formatted);
          onAddressFound?.(formatted);
        }
      } catch (err) {
        console.error("Reverse geocoding error:", err);
      } finally {
        setIsResolvingAddress(false);
      }
    },
    [onAddressFound]
  );

  // When initialLocation changes from outside
  useEffect(() => {
    if (initialLocation && initialLocation.lat && initialLocation.lng) {
      setPosition([initialLocation.lat, initialLocation.lng]);
    }
  }, [initialLocation]);

  const handleLocationSelect = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    onLocationSelect(lat, lng);
    fetchAddress(lat, lng);
    setShowDropdown(false);
  };

  // Perform search query with Nominatim
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&addressdetails=1&limit=5`
      );
      const data: SearchResult[] = await res.json();
      setSearchResults(data || []);
      setShowDropdown((data || []).length > 0);
    } catch (err) {
      console.error("Geocoding search failed:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (val.trim().length >= 3) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(val);
      }, 400);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  };

  const handleSelectSearchResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setPosition([lat, lng]);
    setResolvedAddress(result.display_name);
    setSearchQuery(result.display_name);
    setShowDropdown(false);
    onLocationSelect(lat, lng);
    onAddressFound?.(result.display_name);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      handleSelectSearchResult(searchResults[0]);
    } else if (searchQuery.trim()) {
      performSearch(searchQuery);
    }
  };

  // GPS current location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        handleLocationSelect(lat, lng);
        setIsGeolocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Unable to retrieve location. Please check your location permissions.");
        setIsGeolocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Drag pin event handler
  const markerEventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const latlng = marker.getLatLng();
        handleLocationSelect(latlng.lat, latlng.lng);
      }
    },
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Search Bar & Actions */}
      <div className="relative">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={handleSearchInputChange}
              onFocus={() => {
                if (searchResults.length > 0) setShowDropdown(true);
              }}
              placeholder="Search delivery address, street, landmark..."
              className="pl-9 pr-8 h-11 bg-card border-border/80 focus-visible:ring-1 focus-visible:ring-primary text-sm rounded-xl"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setShowDropdown(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGetCurrentLocation}
            disabled={isGeolocating}
            className="h-11 px-3 border-border/80 hover:bg-muted text-foreground rounded-xl shrink-0 gap-1.5 text-xs font-medium"
            title="Use current GPS location"
          >
            {isGeolocating ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Navigation className="h-4 w-4 text-primary" />
            )}
            <span className="hidden sm:inline">My Location</span>
          </Button>

          <Button
            type="submit"
            disabled={isSearching}
            className="h-11 px-4 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-xl shrink-0"
          >
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </form>

        {/* Search Results Autocomplete Dropdown */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-12 mt-1 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-border/40">
            {searchResults.map((item) => (
              <div
                key={item.place_id}
                onClick={() => handleSelectSearchResult(item)}
                className="p-3 hover:bg-muted/60 cursor-pointer transition-colors flex items-start gap-2.5 text-left"
              >
                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {item.display_name.split(",")[0]}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.display_name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Map Canvas */}
      <div className="h-[280px] w-full rounded-2xl overflow-hidden border border-border/80 relative bg-muted/20 shadow-inner">
        <MapContainer
          center={position || defaultCenter}
          zoom={position ? 16 : 12}
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
              icon={deliveryPinIcon}
              draggable={true}
              eventHandlers={markerEventHandlers}
              ref={markerRef}
            />
          )}
        </MapContainer>

        {/* Floating Hint Overlay on Map */}
        <div className="absolute top-2 left-2 z-[400] bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-border/60 shadow-sm flex items-center gap-1.5 pointer-events-none">
          <Compass className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-medium text-foreground">
            Tap map or drag pin to adjust delivery point
          </span>
        </div>
      </div>

      {/* Delivery Point Status Bar */}
      {position ? (
        <div className="p-3 rounded-xl bg-card border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Delivery Point Set
                </span>
                <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {position[0].toFixed(5)}, {position[1].toFixed(5)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {isResolvingAddress
                  ? "Resolving doorstep address..."
                  : resolvedAddress || "Pin dropped on map"}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setPosition(null);
              setResolvedAddress("");
            }}
            className="h-8 text-xs text-muted-foreground hover:text-destructive self-end sm:self-center"
          >
            Clear Point
          </Button>
        </div>
      ) : (
        <div className="p-2.5 rounded-xl bg-muted/30 border border-dashed border-border/70 flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <span>Click anywhere on the map or search above to drop your delivery pin.</span>
        </div>
      )}
    </div>
  );
}
