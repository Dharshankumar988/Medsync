import os
import logging
import httpx
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta

logger = logging.getLogger("medsync.delivery")

class DeliveryRouteService:
    """
    Calculates routes using OSRM (Open Source Routing Machine) for Bangalore pharmacy delivery simulation.
    """
    def __init__(self):
        self.osrm_url = os.getenv("OSRM_URL", "http://router.project-osrm.org/route/v1/driving")
        # Bangalore approximate bounding box
        self.bangalore_bounds = {
            "min_lat": 12.8,
            "max_lat": 13.2,
            "min_lon": 77.4,
            "max_lon": 77.8
        }

    async def calculate_route(
        self,
        pharmacy_lat: float,
        pharmacy_lon: float,
        patient_lat: float,
        patient_lon: float
    ) -> Dict[str, Any]:
        """
        Calculate route from pharmacy to patient using OSRM.
        Returns route geometry, distance, duration, and simulated waypoints.
        """
        try:
            # OSRM API call
            async with httpx.AsyncClient(timeout=10.0) as client:
                url = f"{self.osrm_url}/{pharmacy_lon},{pharmacy_lat};{patient_lon},{patient_lat}"
                params = {
                    "overview": "full",
                    "geometries": "geojson"
                }
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()

            if data.get("code") != "Ok":
                logger.error(f"OSRM error: {data.get('code')}")
                raise ValueError("ROUTE_CALCULATION_FAILED")

            route = data["routes"][0]
            geometry = route["geometry"]
            distance_m = route["distance"]
            duration_s = route["duration"]

            # Convert to realistic Bangalore delivery time (8-10 minutes for typical distances)
            # Adjust duration based on distance (assuming avg speed 20 km/h in Bangalore traffic)
            base_minutes = 8
            distance_km = distance_m / 1000
            # Add time for traffic and stops (roughly 1 min per km in Bangalore)
            estimated_minutes = min(max(base_minutes + int(distance_km), 8), 10)

            # Generate simulated waypoints with realistic timing
            waypoints = self._generate_waypoints(geometry, estimated_minutes)

            return {
                "geometry": geometry,
                "distance_m": distance_m,
                "distance_km": round(distance_km, 2),
                "duration_s": duration_s,
                "estimated_minutes": estimated_minutes,
                "waypoints": waypoints,
                "total_waypoints": len(waypoints)
            }

        except httpx.RequestError as e:
            logger.error(f"OSRM request failed: {e}")
            # Fallback to straight line simulation
            return self._simulate_fallback_route(pharmacy_lat, pharmacy_lon, patient_lat, patient_lon)
        except Exception as e:
            logger.error(f"Route calculation error: {e}")
            return self._simulate_fallback_route(pharmacy_lat, pharmacy_lon, patient_lat, patient_lon)

    def _generate_waypoints(self, geometry: Dict[str, Any], total_minutes: int) -> List[Dict[str, Any]]:
        """
        Generate waypoints along the route with realistic timing.
        Adds random delays at turns/intersections.
        """
        coordinates = geometry["coordinates"]
        waypoints = []

        # Sample waypoints along the route (every 5-10 points to avoid too many)
        sampling_interval = max(1, len(coordinates) // 20)

        total_waypoints = len(coordinates) // sampling_interval
        base_time_per_waypoint = (total_minutes * 60) / total_waypoints

        current_time = 0

        for i in range(0, len(coordinates), sampling_interval):
            coord = coordinates[i]
            lon, lat = coord

            # Check if this is a turn (significant angle change)
            is_turn = False
            if i > sampling_interval:
                prev_coord = coordinates[i - sampling_interval]
                next_coord = coordinates[min(i + sampling_interval, len(coordinates) - 1)]

                # Calculate angle
                angle1 = self._calculate_angle(prev_coord, coord)
                angle2 = self._calculate_angle(coord, next_coord)
                angle_diff = abs(angle2 - angle1)

                if angle_diff > 30:  # Turn detected (degrees)
                    is_turn = True

            # Add random delay for turns/intersections
            if is_turn:
                delay = 5 + (hash(f"{lon}{lat}") % 5)  # 5-10 seconds
            else:
                delay = 2 + (hash(f"{lon}{lat}") % 3)  # 2-5 seconds normal

            current_time += base_time_per_waypoint + delay

            waypoints.append({
                "index": i // sampling_interval,
                "lat": lat,
                "lon": lon,
                "cumulative_time": round(current_time, 1),
                "is_turn": is_turn,
                "delay": delay
            })

        return waypoints

    def _calculate_angle(self, coord1: List[float], coord2: List[float]) -> float:
        """Calculate bearing angle between two coordinates."""
        lon1, lat1 = coord1
        lon2, lat2 = coord2

        dLon = (lon2 - lon1) * (3.14159 / 180)
        lat1_rad = lat1 * (3.14159 / 180)
        lat2_rad = lat2 * (3.14159 / 180)

        y = (3.14159 / 180) * (lon2 - lon1)
        x = (3.14159 / 180) * (lon2 + lon1) * 0.5

        bearing = (3.14159 / 180) * (lon2 - lon1)
        return bearing

    def _simulate_fallback_route(
        self,
        pharmacy_lat: float,
        pharmacy_lon: float,
        patient_lat: float,
        patient_lon: float
    ) -> Dict[str, Any]:
        """
        Fallback straight-line simulation when OSRM is unavailable.
        """
        logger.warning("Using fallback straight-line route simulation")

        # Simple straight line with 5 waypoints
        num_waypoints = 5
        waypoints = []
        total_minutes = 9  # Default 9 minutes
        time_per_waypoint = (total_minutes * 60) / num_waypoints

        for i in range(num_waypoints):
            progress = i / (num_waypoints - 1)
            lat = pharmacy_lat + (patient_lat - pharmacy_lat) * progress
            lon = pharmacy_lon + (patient_lon - pharmacy_lon) * progress

            cumulative_time = (i + 1) * time_per_waypoint

            waypoints.append({
                "index": i,
                "lat": lat,
                "lon": lon,
                "cumulative_time": round(cumulative_time, 1),
                "is_turn": False,
                "delay": 3
            })

        return {
            "geometry": {
                "type": "LineString",
                "coordinates": [[pharmacy_lon, pharmacy_lat], [patient_lon, patient_lat]]
            },
            "distance_m": 5000,  # Simulated 5km
            "distance_km": 5.0,
            "duration_s": 540,
            "estimated_minutes": 9,
            "waypoints": waypoints,
            "total_waypoints": num_waypoints
        }

    def get_bangalore_pharmacy_locations(self) -> List[Dict[str, Any]]:
        """
        Predefined Bangalore pharmacy locations for simulation.
        """
        return [
            {"id": "1", "name": "MedSync Pharmacy - Indiranagar", "lat": 12.9784, "lon": 77.6408},
            {"id": "2", "name": "MedSync Pharmacy - Koramangala", "lat": 12.9352, "lon": 77.6245},
            {"id": "3", "name": "MedSync Pharmacy - Jayanagar", "lat": 12.9307, "lon": 77.5801},
            {"id": "4", "name": "MedSync Pharmacy - BTM Layout", "lat": 12.9141, "lon": 77.6101},
            {"id": "5", "name": "MedSync Pharmacy - HSR Layout", "lat": 12.9215, "lon": 77.6372},
        ]

    def get_bangalore_patient_locations(self) -> List[Dict[str, Any]]:
        """
        Predefined Bangalore patient locations for simulation.
        """
        return [
            {"id": "1", "name": "Patient - Indiranagar", "lat": 12.9820, "lon": 77.6450},
            {"id": "2", "name": "Patient - Koramangala", "lat": 12.9280, "lon": 77.6100},
            {"id": "3", "name": "Patient - Jayanagar", "lat": 12.9180, "lon": 77.5600},
            {"id": "4", "name": "Patient - BTM Layout", "lat": 12.9100, "lon": 77.6000},
            {"id": "5", "name": "Patient - HSR Layout", "lat": 12.9050, "lon": 77.6250},
        ]

delivery_route_service = DeliveryRouteService()
