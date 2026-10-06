import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Truck, Clock, CheckCircle, Loader2 } from 'lucide-react';

// Fix for default marker icon in Leaflet with React
const truckIcon = L.divIcon({
  html: `<div style="background: #3b82f6; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
      <path d="M15 18H9"/>
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
      <circle cx="17" cy="18" r="2"/>
      <circle cx="7" cy="18" r="2"/>
    </svg>
  </div>`,
  className: 'custom-truck-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const pharmacyIcon = L.divIcon({
  html: `<div style="background: #10b981; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 3v18h18"/>
      <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
    </svg>
  </div>`,
  className: 'custom-pharmacy-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const patientIcon = L.divIcon({
  html: `<div style="background: #ef4444; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  </div>`,
  className: 'custom-patient-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

function DeliveryMarker({ position, status }: { position: any, status: string }) {
  if (!position || status === 'DELIVERED') return null;

  return (
    <Marker position={[position.lat, position.lon]} icon={truckIcon}>
      <Popup>
        <div className="text-sm font-medium">Delivery in progress</div>
      </Popup>
    </Marker>
  );
}

function MapBounds({ route, currentLocation }: { route: any[], currentLocation: any }) {
  const map = useMap();

  useEffect(() => {
    if (route && route.geometry && route.geometry.coordinates) {
      const coordinates = route.geometry.coordinates;
      const bounds = L.latLngBounds(
        coordinates.map(coord => [coord[1], coord[0]])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [route, map]);

  return null;
}

interface DeliveryMapProps {
  route: any;
  currentLocation: any;
  status: string;
  pharmacyLocation?: { lat: number; lon: number };
  patientLocation?: { lat: number; lon: number };
}

export default function DeliveryMap({
  route,
  currentLocation,
  status,
  pharmacyLocation,
  patientLocation
}: DeliveryMapProps) {
  if (!route || !route.geometry) {
    return (
      <div className="w-full h-full bg-muted/20 rounded-lg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const routeCoordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);

  // Bangalore center coordinates
  const center = [12.9716, 77.5946];

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      className="rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapBounds route={route} currentLocation={currentLocation} />

      {/* Route line */}
      <Polyline
        positions={routeCoordinates}
        color="#3b82f6"
        weight={4}
        opacity={0.7}
        dashArray="10, 10"
      />

      {/* Pharmacy marker */}
      {pharmacyLocation && (
        <Marker position={[pharmacyLocation.lat, pharmacyLocation.lon]} icon={pharmacyIcon}>
          <Popup>
            <div className="text-sm font-medium">Pharmacy</div>
          </Popup>
        </Marker>
      )}

      {/* Patient marker */}
      {patientLocation && (
        <Marker position={[patientLocation.lat, patientLocation.lon]} icon={patientIcon}>
          <Popup>
            <div className="text-sm font-medium">Delivery Location</div>
          </Popup>
        </Marker>
      )}

      {/* Delivery truck marker */}
      <DeliveryMarker position={currentLocation} status={status} />
    </MapContainer>
  );
}
