"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapResizeObserver } from "@/hooks/use-mapresize-observer";
import type { AssignedGisData, Projection } from "@/lib/types";
import { ELEMENT_COLORS } from "@/lib/model-builder-constants";
import { isLikelyLatLng } from "@/lib/check-projection";
import { approximateReprojectToLatLng } from "@/lib/approx-reproject";
import { convertGeoJsonToWGS84Generic } from "@/lib/network-utils";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface ModelBuilderMapProps {
  assignedGisData: AssignedGisData;
  selectedProjection?: Projection | null;
}

export function ModelBuilderMap({
  assignedGisData,
  selectedProjection,
}: ModelBuilderMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

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

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing layers and sources
    Object.keys(ELEMENT_COLORS).forEach((elementType) => {
      if (map.current!.getLayer(`${elementType}-points`)) {
        map.current!.removeLayer(`${elementType}-points`);
      }
      if (map.current!.getLayer(`${elementType}-lines`)) {
        map.current!.removeLayer(`${elementType}-lines`);
      }
      if (map.current!.getSource(elementType)) {
        map.current!.removeSource(elementType);
      }
    });

    const hasData = Object.keys(assignedGisData).length > 0;

    if (!hasData) {
      setTimeout(() => {
        if (map.current) {
          map.current.setZoom(0);
          map.current.setCenter([0, 0]);
        }
      }, 100);
      // @ts-expect-error - Types are wrong, it does accept null to reset
      map.current.setMaxBounds(null);
      return;
    }

    // Process all GeoJSON data for reprojection
    const geoJSONEntries = Object.entries(assignedGisData);
    const geoJSONArray = geoJSONEntries.map(([, geoJSON]) => geoJSON);

    // Check if any data needs reprojection
    const needsReprojection = geoJSONArray.some(
      (geoJSON) => geoJSON && !isLikelyLatLng(geoJSON),
    );

    let processedGeoJSONArray: (typeof geoJSONArray)[0][];

    if (needsReprojection) {
      if (selectedProjection && selectedProjection.id !== "EPSG:4326") {
        // Use precise projection when available
        processedGeoJSONArray = geoJSONArray.map((geoJSON) => {
          if (!geoJSON) return null;
          try {
            const reprojected = convertGeoJsonToWGS84Generic(
              geoJSON,
              selectedProjection.code,
            );
            return isLikelyLatLng(reprojected) ? reprojected : geoJSON;
          } catch (error) {
            console.warn(
              "Failed to reproject with selected projection, using original:",
              error,
            );
            return geoJSON;
          }
        });
      } else {
        // Fallback to approximate reprojection when no projection is selected
        processedGeoJSONArray = approximateReprojectToLatLng(geoJSONArray);
      }
    } else {
      // No reprojection needed, use original data
      processedGeoJSONArray = geoJSONArray;
    }

    // Create a map from element type to processed GeoJSON
    const processedGeoJSONMap = geoJSONEntries.reduce(
      (acc, [elementType], index) => {
        acc[elementType] = processedGeoJSONArray[index];
        return acc;
      },
      {} as Record<string, (typeof geoJSONArray)[0]>,
    );

    // Add sources and layers for each assigned element
    const allCoordinates: [number, number][] = [];

    // Handle pipes first if they exist
    const entries = Object.entries(processedGeoJSONMap);
    const pipesEntry = entries.find(([type]) => type === "pipes");
    const otherEntries = entries.filter(([type]) => type !== "pipes");

    [...(pipesEntry ? [pipesEntry] : []), ...otherEntries].forEach(
      ([elementType, processedGeoJSON]) => {
        if (!processedGeoJSON) return;

        // Add source
        map.current!.addSource(elementType, {
          type: "geojson",
          data: processedGeoJSON,
        });

        const color =
          ELEMENT_COLORS[elementType as keyof typeof ELEMENT_COLORS] ||
          "#3b82f6";

        // Add line layer for linear features (only pipes now)
        if (elementType === "pipes") {
          map.current!.addLayer({
            id: `${elementType}-lines`,
            type: "line",
            source: elementType,
            paint: {
              "line-color": color,
              "line-width": ["interpolate", ["linear"], ["zoom"], 12, 2, 16, 6],
            },
          });
        }

        // Add point layer for point features (all except pipes)
        if (elementType !== "pipes") {
          map.current!.addLayer({
            id: `${elementType}-points`,
            type: "circle",
            source: elementType,
            paint: {
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                12,
                3,
                16,
                8,
              ],
              "circle-color": color,
              "circle-stroke-width": [
                "interpolate",
                ["linear"],
                ["zoom"],
                13,
                1,
                16,
                2,
              ],
              "circle-stroke-color": "#ffffff",
            },
          });
        }

        // Collect coordinates for bounds calculation
        processedGeoJSON.features.forEach((feature: any) => {
          if (feature.geometry.type === "Point") {
            allCoordinates.push(
              feature.geometry.coordinates as [number, number],
            );
          } else if (feature.geometry.type === "LineString") {
            allCoordinates.push(
              ...(feature.geometry.coordinates as [number, number][]),
            );
          } else if (feature.geometry.type === "MultiPoint") {
            allCoordinates.push(
              ...(feature.geometry.coordinates as [number, number][]),
            );
          } else if (feature.geometry.type === "MultiLineString") {
            feature.geometry.coordinates.forEach((line: any) => {
              allCoordinates.push(...(line as [number, number][]));
            });
          }
        });
      },
    );

    // Fit map bounds to show all data
    if (allCoordinates.length > 0) {
      const bounds = allCoordinates.reduce(
        (bounds, coord) => bounds.extend(coord as mapboxgl.LngLatLike),
        new mapboxgl.LngLatBounds(allCoordinates[0], allCoordinates[0]),
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

      map.current.setMaxBounds(expandedBounds);

      setTimeout(() => {
        if (!map.current) return;
        map.current.resize();
        map.current.fitBounds(bounds, { padding: 20, duration: 0 });
      }, 100);
    }
  }, [assignedGisData, selectedProjection, mapLoaded]);

  const assignedElementsCount = Object.keys(assignedGisData).length;

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          Network Preview
        </h2>
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {assignedElementsCount} element
          {assignedElementsCount !== 1 ? "s" : ""} assigned
        </div>
      </div>

      <div className="relative flex-1 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
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

      {/* Legend - Only show if there are assignments and space allows */}
      {assignedElementsCount > 0 && (
        <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(assignedGisData).map(([elementType, geoJSON]) => {
              if (!geoJSON) return null;

              const color =
                ELEMENT_COLORS[elementType as keyof typeof ELEMENT_COLORS] ||
                "#3b82f6";
              const elementName =
                elementType.charAt(0).toUpperCase() + elementType.slice(1);

              return (
                <div key={elementType} className="flex items-center space-x-2">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300 truncate">
                    {elementName} ({geoJSON.features.length})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
