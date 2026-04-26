"""
EduAllocPro — OpenRouteService Client
Distance Matrix + Geocoding for commute calculations using ORS.
"""
import asyncio
import httpx
from typing import Optional

import structlog

logger = structlog.get_logger()

# We always have httpx installed now
MAPS_AVAILABLE = True


class MapsClient:
    """Async OpenRouteService client for distance and geocoding."""

    def __init__(self, api_key: str, distance_mode: str = "driving-car") -> None:
        self._api_key = api_key
        # ORS modes: driving-car, driving-hgv, cycling-regular, foot-walking etc.
        self._distance_mode = "driving-car" if distance_mode == "driving" else distance_mode
        self._client = httpx.AsyncClient(timeout=30.0)
        self._headers = {
            "Authorization": self._api_key,
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

        if self._api_key and self._api_key != "placeholder":
            logger.info("maps.init.ok", provider="openrouteservice")
        else:
            logger.warning("maps.init.failed", error="No API key provided")
            self._api_key = None

    @classmethod
    def from_env(cls) -> "MapsClient":
        from config import config
        return cls(api_key=config.maps_key, distance_mode=config.maps_distance_mode)

    async def distance_matrix(
        self,
        origins: list[tuple[float, float]],
        destination: tuple[float, float],
    ) -> list[float]:
        """
        Get driving distances from multiple origins to one destination.
        Returns list of distances in km (same order as origins).
        Returns 999.0 for unreachable routes.
        Note: ORS expects [lng, lat] while we use (lat, lng).
        """
        if not self._api_key or not origins:
            return [50.0] * len(origins)  # Default fallback

        # ORS expects coordinates as [longitude, latitude]
        locations = [[lng, lat] for lat, lng in origins]
        locations.append([destination[1], destination[0]])
        dest_idx = len(locations) - 1

        payload = {
            "locations": locations,
            "destinations": [dest_idx],
            "metrics": ["distance"],
            "units": "km"
        }

        log = logger.bind(fn="distance_matrix", origins_count=len(origins))
        log.info("maps.distance_matrix.start")

        try:
            response = await self._client.post(
                f"https://api.openrouteservice.org/v2/matrix/{self._distance_mode}",
                json=payload,
                headers=self._headers
            )
            response.raise_for_status()
            data = response.json()
            
            distances = []
            for i in range(len(origins)):
                try:
                    # distances array is structured as [sources][destinations]
                    dist_km = data["distances"][i][0]
                    if dist_km is None:
                        distances.append(999.0)
                    else:
                        distances.append(float(dist_km))
                except (IndexError, TypeError, KeyError):
                    distances.append(999.0)
                    
            log.info("maps.distance_matrix.done", count=len(distances))
            return distances

        except Exception as e:
            log.error("maps.distance_matrix.error", error=str(e))
            return [50.0] * len(origins)

    async def geocode(self, address: str) -> Optional[tuple[float, float]]:
        """
        Geocode an address string using ORS.
        Returns (lat, lng) tuple or None if geocoding fails.
        """
        if not self._api_key:
            return None

        params = {
            "api_key": self._api_key,
            "text": address,
            "size": 1
        }

        try:
            response = await self._client.get(
                "https://api.openrouteservice.org/geocode/search",
                params=params
            )
            response.raise_for_status()
            data = response.json()
            
            if data.get("features") and len(data["features"]) > 0:
                # ORS returns [lng, lat]
                coords = data["features"][0]["geometry"]["coordinates"]
                return (coords[1], coords[0])
            return None
        except Exception as e:
            logger.error("maps.geocode.error", error=str(e), address=address[:50])
            return None

    async def batch_geocode_schools(self, schools: list[dict]) -> list[dict]:
        """
        Geocode a list of schools in batches.
        Updates each school dict with lat, lng, geocode_status.
        """
        results = []
        
        # We geocode sequentially to avoid hitting rate limits too hard,
        # but async allows other operations to run
        for school in schools:
            address = (
                f"{school.get('school_name', '')}, "
                f"{school.get('block_name', '')}, "
                f"{school.get('district_name', '')}, Maharashtra, India"
            )
            coords = await self.geocode(address)
            if coords:
                school["lat"] = coords[0]
                school["lng"] = coords[1]
                school["geocode_status"] = "OK"
            else:
                school["geocode_status"] = "FAILED"
            results.append(school)
            # Small sleep to respect ORS free tier rate limits (40 req/min for geocode)
            await asyncio.sleep(1.5)

        return results

    async def close(self) -> None:
        await self._client.aclose()
