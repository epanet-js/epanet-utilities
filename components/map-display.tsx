"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapResizeObserver } from "@/hooks/use-mapresize-observer";
import { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import { convertGeoJsonToWGS84Generic } from "@/lib/network-utils";
import { isLikelyLatLng } from "@/lib/check-projection";
import type { Projection } from "@/lib/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface MapDisplayProps {
  geoJSON: FeatureCollection<Geometry, GeoJsonProperties> | null;
  projection?: Projection | null;
}

export function MapDisplay({ geoJSON, projection }: MapDisplayProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [processedGeoJSON, setProcessedGeoJSON] = useState<FeatureCollection<
    Geometry,
    GeoJsonProperties
  > | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/light-v11",
        projection: "mercator",
        bounds: [
          [-180, -90],
          [180, 90],
        ],
        zoom: 12,
      });

      map.current.on("load", () => {
        setMapLoaded(true);
      });

      return () => {
        map.current?.remove();
        map.current = null;
      };
    } catch (error) {
      console.error("Error initializing map:", error);
      setMapLoaded(false);
    }
  }, []);

  useMapResizeObserver(map, mapContainer);

  // Handle projection reprojection
  useEffect(() => {
    if (!geoJSON) {
      setProcessedGeoJSON(null);
      return;
    }

    // Check if data needs reprojection
    const needsReprojection = !isLikelyLatLng(geoJSON);

    if (needsReprojection && projection && projection.id !== "EPSG:4326") {
      try {
        const reprojectedData = convertGeoJsonToWGS84Generic(
          geoJSON,
          projection.code,
        );

        // Verify the reprojection was successful
        if (isLikelyLatLng(reprojectedData)) {
          setProcessedGeoJSON(reprojectedData);
        } else {
          console.warn(
            "Reprojection failed - data still not in lat/lng format",
          );
          setProcessedGeoJSON(geoJSON); // Use original data as fallback
        }
      } catch (error) {
        console.error("Error reprojecting data:", error);
        setProcessedGeoJSON(geoJSON); // Use original data as fallback
      }
    } else {
      // No reprojection needed, use original data
      setProcessedGeoJSON(geoJSON);
    }
  }, [geoJSON, projection]);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing layers if they exist
    if (map.current.getLayer("network-points")) {
      map.current.removeLayer("network-points");
    }
    if (map.current.getLayer("network-lines")) {
      map.current.removeLayer("network-lines");
    }
    if (map.current.getSource("network")) {
      map.current.removeSource("network");
    }

    if (!processedGeoJSON) {
      setTimeout(() => {
        if (map.current) {
          map.current.setZoom(0);
          map.current.setCenter([0, 0]);
        }
      }, 100);

      // @ts-expect-error // Types are wrong, it does accept null to reset
      map.current.setMaxBounds(null);
      return;
    }

    // Add new source and layers
    map.current.addSource("network", {
      type: "geojson",
      data: processedGeoJSON,
    });

    // Add lines
    map.current.addLayer({
      id: "network-lines",
      type: "line",
      source: "network",
      filter: ["==", ["get", "type"], "Link"],
      paint: {
        "line-color": "#3b82f6",
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.5, 16, 4],
      },
    });

    // Add points
    map.current.addLayer({
      id: "network-points",
      type: "circle",
      source: "network",
      filter: ["==", ["get", "type"], "Node"],
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 0.5, 16, 5],
        "circle-color": "#3b82f6",
        "circle-stroke-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          13,
          0.5,
          16,
          1,
        ],
        "circle-stroke-color": "#ffffff",
      },
      minzoom: 13,
    });

    // Compute bounds from processedGeoJSON data
    const coordinates = processedGeoJSON.features.flatMap((feature) => {
      if (feature.geometry.type === "Point") {
        return [feature.geometry.coordinates as [number, number]];
      } else if (feature.geometry.type === "LineString") {
        return feature.geometry.coordinates as [number, number][];
      }
      return [];
    });

    if (coordinates.length > 0) {
      const bounds = coordinates.reduce(
        (bounds, coord) => bounds.extend(coord as mapboxgl.LngLatLike),
        new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]),
      );

      const expandFactor = 1; // Adjust this factor if needed
      const southWest = bounds.getSouthWest();
      const northEast = bounds.getNorthEast();

      const expandedBounds = new mapboxgl.LngLatBounds(
        [
          southWest.lng - expandFactor * (northEast.lng - southWest.lng),
          southWest.lat - expandFactor * (northEast.lat - southWest.lat),
        ],
        [
          northEast.lng + expandFactor * (northEast.lng - southWest.lng),
          northEast.lat + expandFactor * (northEast.lat - southWest.lat),
        ],
      );

      // **Set expanded max bounds to prevent excessive panning**
      map.current.setMaxBounds(expandedBounds);

      setTimeout(() => {
        if (!map.current) return;
        map.current.resize();
        map.current.fitBounds(bounds, { padding: 50, duration: 0 });
      }, 100);
    }
  }, [processedGeoJSON, mapLoaded]);

  return (
    <div className="bg-slate-200 space-y-4 h-full flex flex-col">
      <div className="relative flex-1 min-h-[400px] lg:min-h-[600px] overflow-hidden">
        {MAPBOX_TOKEN === "pk.placeholder.token" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-700">
            <div className="text-center p-6">
              <p className="text-slate-600 dark:text-slate-300 mb-2">
                Map placeholder - Mapbox token required
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add your Mapbox token to see the actual map
              </p>
            </div>
          </div>
        ) : (
          <div ref={mapContainer} className="absolute inset-0 h-full w-full" />
        )}
      </div>
    </div>
  );
}
