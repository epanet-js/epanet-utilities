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
  originalGeoJSON?: FeatureCollection<Geometry, GeoJsonProperties> | null;
  projection?: Projection | null;
}

function reprojectIfNeeded(
  geoJSON: FeatureCollection | null,
  projection?: Projection | null,
): FeatureCollection | null {
  if (!geoJSON) return null;

  const needsReprojection = !isLikelyLatLng(geoJSON);
  if (!needsReprojection || !projection || projection.id === "EPSG:4326") {
    return geoJSON;
  }

  try {
    const reprojected = convertGeoJsonToWGS84Generic(geoJSON, projection.code);
    if (isLikelyLatLng(reprojected)) return reprojected;
    console.warn("Reprojection failed - data still not in lat/lng format");
    return geoJSON;
  } catch (error) {
    console.error("Error reprojecting data:", error);
    return geoJSON;
  }
}

function collectCoords(
  fc: FeatureCollection | null,
): [number, number][] {
  if (!fc) return [];
  return fc.features.flatMap((feature) => {
    if (!feature.geometry) return [];
    if (feature.geometry.type === "Point") {
      return [feature.geometry.coordinates as [number, number]];
    } else if (feature.geometry.type === "LineString") {
      return feature.geometry.coordinates as [number, number][];
    }
    return [];
  });
}

export function MapDisplay({
  geoJSON,
  originalGeoJSON,
  projection,
}: MapDisplayProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [processedGeoJSON, setProcessedGeoJSON] =
    useState<FeatureCollection | null>(null);
  const [processedOriginalGeoJSON, setProcessedOriginalGeoJSON] =
    useState<FeatureCollection | null>(null);

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

  // Reproject inputs when needed.
  useEffect(() => {
    setProcessedGeoJSON(reprojectIfNeeded(geoJSON, projection));
  }, [geoJSON, projection]);

  useEffect(() => {
    setProcessedOriginalGeoJSON(
      reprojectIfNeeded(originalGeoJSON ?? null, projection),
    );
  }, [originalGeoJSON, projection]);

  // Manage the grey original underlay (added first so blue draws on top).
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const m = map.current;

    if (m.getLayer("original-points")) m.removeLayer("original-points");
    if (m.getLayer("original-lines")) m.removeLayer("original-lines");
    if (m.getSource("original")) m.removeSource("original");

    if (!processedOriginalGeoJSON) return;

    m.addSource("original", {
      type: "geojson",
      data: processedOriginalGeoJSON,
    });

    m.addLayer({
      id: "original-lines",
      type: "line",
      source: "original",
      filter: ["==", ["get", "type"], "Link"],
      paint: {
        "line-color": "#d1d5db",
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.5, 16, 4],
      },
    });

    m.addLayer({
      id: "original-points",
      type: "circle",
      source: "original",
      filter: ["==", ["get", "type"], "Node"],
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 0.5, 16, 5],
        "circle-color": "#d1d5db",
        "circle-stroke-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          13,
          0.5,
          16,
          1,
        ],
        "circle-stroke-color": "#f3f4f6",
      },
      minzoom: 13,
    });
  }, [processedOriginalGeoJSON, mapLoaded]);

  // Manage the blue (transformed / primary) network layer.
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const m = map.current;
    const hasOriginal = !!processedOriginalGeoJSON;

    if (m.getLayer("network-points")) m.removeLayer("network-points");
    if (m.getLayer("network-lines")) m.removeLayer("network-lines");
    if (m.getSource("network")) m.removeSource("network");

    if (!processedGeoJSON) {
      if (!hasOriginal) {
        setTimeout(() => {
          if (map.current) {
            map.current.setZoom(0);
            map.current.setCenter([0, 0]);
          }
        }, 100);
        // @ts-expect-error // Types are wrong, it does accept null to reset
        m.setMaxBounds(null);
      }
      return;
    }

    m.addSource("network", {
      type: "geojson",
      data: processedGeoJSON,
    });

    m.addLayer({
      id: "network-lines",
      type: "line",
      source: "network",
      filter: ["==", ["get", "type"], "Link"],
      paint: {
        "line-color": "#3b82f6",
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.5, 16, 4],
      },
    });

    m.addLayer({
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

    // Fit bounds. When an `originalGeoJSON` is supplied the original drives the
    // fit (see the effect below) so the camera doesn't jump on every transform
    // tick. Without an original, fit to the primary layer as before.
    if (hasOriginal) return;

    const coordinates = collectCoords(processedGeoJSON);
    if (coordinates.length === 0) return;

    const bounds = coordinates.reduce(
      (b, coord) => b.extend(coord as mapboxgl.LngLatLike),
      new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]),
    );

    const expandFactor = 1;
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

    m.setMaxBounds(expandedBounds);

    setTimeout(() => {
      if (!map.current) return;
      map.current.resize();
      map.current.fitBounds(bounds, { padding: 50, duration: 0 });
    }, 100);
  }, [processedGeoJSON, processedOriginalGeoJSON, mapLoaded]);

  // Bounds fitting when an original underlay is present: fit to the original
  // (stable) when it changes. Ignores blue-layer updates so dragging sliders
  // doesn't reset the camera.
  useEffect(() => {
    if (!map.current || !mapLoaded || !processedOriginalGeoJSON) return;

    const coordinates = collectCoords(processedOriginalGeoJSON);
    if (coordinates.length === 0) return;

    const bounds = coordinates.reduce(
      (b, coord) => b.extend(coord as mapboxgl.LngLatLike),
      new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]),
    );

    const expandFactor = 2; // looser so the user can pan the transformed copy away
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

    const m = map.current;
    m.setMaxBounds(expandedBounds);

    setTimeout(() => {
      if (!map.current) return;
      map.current.resize();
      map.current.fitBounds(bounds, { padding: 50, duration: 0 });
    }, 100);
  }, [processedOriginalGeoJSON, mapLoaded]);

  return (
    <div className="min-h-[40dvh] col-start-1 md:col-start-2 bg-slate-200 space-y-4 h-full flex flex-col">
      <div className="relative flex-1 min-h-[400px] lg:h-[calc(100dvh_-_57px)] overflow-hidden">
        {MAPBOX_TOKEN === "pk.placeholder.token" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
            <div className="text-center p-6">
              <p className="text-gray-600 mb-2">
                Map placeholder - Mapbox token required
              </p>
              <p className="text-xs text-gray-500">
                Add your Mapbox token to see the actual map
              </p>
            </div>
          </div>
        ) : (
          <div
            ref={mapContainer}
            className="absolute inset-0 h-[calc(100dvh_-_57px)] w-full"
          />
        )}
      </div>
    </div>
  );
}
