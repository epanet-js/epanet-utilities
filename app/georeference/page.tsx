"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { FeatureCollection } from "geojson";
import { FileUploader } from "@/components/file-uploader";
import { AppHeader } from "@/components/app-header";
import { GeorefControls } from "@/components/georef-controls";
import { GeorefMap, type GeorefMapHandle } from "@/components/georef-map";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/hooks/use-toast";
import {
  detectEpanetUnits,
  METERS_PER_UNIT,
  parseINPFile,
  updateINPWithReprojectedData,
  type EpanetUnitSystem,
} from "@/lib/network-utils";
import {
  applyNetworkDataToGeoJson,
  toGeoJson,
  ToGeoJsonResult,
} from "@/lib/epanet-geojson";
import { isLikelyLatLng } from "@/lib/check-projection";
import {
  applyTransform,
  bboxCenter,
  computeBbox,
  DEFAULT_TRANSFORM,
  METERS_PER_DEGREE,
  type Bbox,
  type TransformParams,
} from "@/lib/network-transform";
import {
  placeNetworkAtLatLng,
  transformLatLngPoint,
  type LatLng,
} from "@/lib/network-placement";
import type { GeocodeResult } from "@/lib/geocoding";
import type { NetworkData } from "@/lib/types";

interface LoadedFile {
  networkData: NetworkData;
  epanetGeoJson: ToGeoJsonResult;
  bbox: Bbox;
  nativeCenter: [number, number];
  isLatLng: boolean;
  units: EpanetUnitSystem;
  metersPerUnit: number;
  bboxSizeMeters: { widthMeters: number; heightMeters: number };
}

interface PlacedNetwork {
  placedNd: NetworkData;
  anchor: LatLng;
  /** Bbox of `placedNd` in lat/lng (identity transform). */
  placedBbox: Bbox;
}

function deriveBboxSizeMeters(
  bbox: Bbox,
  isLatLng: boolean,
  centerLat: number,
  metersPerUnit: number,
): { widthMeters: number; heightMeters: number } {
  const widthNative = bbox.maxX - bbox.minX;
  const heightNative = bbox.maxY - bbox.minY;
  if (!isLatLng) {
    return {
      widthMeters: widthNative * metersPerUnit,
      heightMeters: heightNative * metersPerUnit,
    };
  }
  const cosLat = Math.cos((centerLat * Math.PI) / 180);
  return {
    widthMeters: widthNative * METERS_PER_DEGREE * Math.abs(cosLat),
    heightMeters: heightNative * METERS_PER_DEGREE,
  };
}

function buildLoaded(
  networkData: NetworkData,
  epanetGeoJson: ToGeoJsonResult,
): LoadedFile {
  const bbox = computeBbox(networkData);
  const nativeCenter = bboxCenter(bbox);
  const isLatLng = isLikelyLatLng(epanetGeoJson.geojson);
  const units = detectEpanetUnits(networkData.inp);
  const metersPerUnit = METERS_PER_UNIT[units];
  const bboxSizeMeters = deriveBboxSizeMeters(
    bbox,
    isLatLng,
    nativeCenter[1],
    metersPerUnit,
  );
  return {
    networkData,
    epanetGeoJson,
    bbox,
    nativeCenter,
    isLatLng,
    units,
    metersPerUnit,
    bboxSizeMeters,
  };
}

export default function GeoreferencePage() {
  const [loaded, setLoaded] = useState<LoadedFile | null>(null);
  const [placed, setPlaced] = useState<PlacedNetwork | null>(null);
  const [params, setParams] = useState<TransformParams>(DEFAULT_TRANSFORM);
  const mapRef = useRef<GeorefMapHandle | null>(null);

  const handleFileLoaded = useCallback(async (file: File | null) => {
    if (!file) {
      setLoaded(null);
      setPlaced(null);
      setParams(DEFAULT_TRANSFORM);
      return;
    }
    try {
      const data = await parseINPFile(file);
      if (!data?.inp) {
        setLoaded(null);
        setPlaced(null);
        return;
      }
      const epanetGeoJson = toGeoJson(data.inp);
      if (epanetGeoJson.geojson.features.length === 0) {
        toast({
          title: "⚠️ Error!",
          description: "Could not parse any nodes or links from the INP file.",
          variant: "destructive",
        });
        setLoaded(null);
        setPlaced(null);
        return;
      }
      const next = buildLoaded(data, epanetGeoJson);
      setLoaded(next);
      setParams(DEFAULT_TRANSFORM);

      // If the INP is already in lat/lng, auto-place at its native center so
      // the network drops on the real location immediately.
      if (next.isLatLng) {
        const anchor: LatLng = {
          lng: next.nativeCenter[0],
          lat: next.nativeCenter[1],
        };
        const placedNd = placeNetworkAtLatLng(
          next.networkData,
          anchor,
          true,
          next.nativeCenter,
          next.metersPerUnit,
        );
        setPlaced({
          placedNd,
          anchor,
          placedBbox: computeBbox(placedNd),
        });
        setTimeout(() => {
          mapRef.current?.flyTo([anchor.lng, anchor.lat]);
        }, 50);
      } else {
        setPlaced(null);
      }
    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "⚠️ Error!",
        description: "Failed to load the INP file.",
        variant: "destructive",
      });
      setLoaded(null);
      setPlaced(null);
    }
  }, []);

  const placeAt = useCallback(
    (anchor: LatLng) => {
      if (!loaded) return;
      const placedNd = placeNetworkAtLatLng(
        loaded.networkData,
        anchor,
        loaded.isLatLng,
        loaded.nativeCenter,
        loaded.metersPerUnit,
      );
      setPlaced({
        placedNd,
        anchor,
        placedBbox: computeBbox(placedNd),
      });
      setParams(DEFAULT_TRANSFORM);
    },
    [loaded],
  );

  const handleGeocodeSelect = useCallback(
    (r: GeocodeResult) => {
      mapRef.current?.flyTo(r.center, r.bbox);
      if (!loaded) return;
      // If no anchor yet, drop the network here. Otherwise just pan — the
      // user might be looking around without wanting to move the network.
      if (!placed) {
        placeAt({ lng: r.center[0], lat: r.center[1] });
      }
    },
    [loaded, placed, placeAt],
  );

  const handlePlaceAtMapCenter = useCallback(() => {
    if (!loaded || !mapRef.current) return;
    placeAt(mapRef.current.getCenter());
  }, [loaded, placeAt]);

  const transformedGeoJson: FeatureCollection | null = useMemo(() => {
    if (!placed || !loaded) return null;
    const transformed = applyTransform(placed.placedNd, params, {
      origin: [placed.anchor.lng, placed.anchor.lat],
      isLatLng: true,
      centerLat: placed.anchor.lat,
    });
    return applyNetworkDataToGeoJson(loaded.epanetGeoJson.geojson, transformed);
  }, [loaded, placed, params]);

  const bboxCorners: [number, number][] | null = useMemo(() => {
    if (!placed) return null;
    const b = placed.placedBbox;
    const rawCorners: [number, number][] = [
      [b.minX, b.minY],
      [b.maxX, b.minY],
      [b.maxX, b.maxY],
      [b.minX, b.maxY],
    ];
    const origin: [number, number] = [placed.anchor.lng, placed.anchor.lat];
    return rawCorners.map((c) =>
      transformLatLngPoint(c, params, origin, placed.anchor.lat),
    );
  }, [placed, params]);

  const handleReset = useCallback(() => setParams(DEFAULT_TRANSFORM), []);

  const handleDownload = useCallback(() => {
    if (!placed || !loaded) return;
    try {
      const transformed = applyTransform(placed.placedNd, params, {
        origin: [placed.anchor.lng, placed.anchor.lat],
        isLatLng: true,
        centerLat: placed.anchor.lat,
      });
      const newContent = updateINPWithReprojectedData(
        loaded.networkData.inp,
        transformed,
        6,
      );
      const blob = new Blob([newContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const trimmed = loaded.networkData.name.endsWith(".inp")
        ? loaded.networkData.name.slice(0, -4)
        : loaded.networkData.name;
      a.download = `${trimmed}-georeferenced.inp`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading georeferenced model:", error);
      toast({
        title: "⚠️ Error!",
        description: "Failed to generate the georeferenced INP file.",
        variant: "destructive",
      });
    }
  }, [placed, loaded, params]);

  return (
    <>
      <Toaster />
      <div
        className="h-dvh grid
        grid-rows-[auto_1fr_1fr] md:grid-rows-[auto_1fr]
        grid-cols-1 md:grid-cols-2 lg:grid-cols-[400px_1fr]"
      >
        <AppHeader />
        <aside className="border-b-4 md:border-b-0 border-r border-gray-300 overflow-y-auto">
          <div className="p-4 border-b border-gray-300">
            <h1 className="text-md font-bold tracking-tight">
              EPANET Georeference
            </h1>
          </div>
          <div className="p-4 space-y-4 flex flex-col md:h-[calc(100dvh_-_114px)]">
            <p className="text-sm text-gray-600">
              Drop an INP onto a real-world map and fit it visually. Find a
              location, lock the map, then drag / scale / rotate to match the
              ground.
            </p>
            <FileUploader onFileLoaded={handleFileLoaded} />
            {loaded && (
              <GeorefControls
                anchor={placed?.anchor ?? null}
                params={params}
                canDownload={!!placed}
                units={loaded.units}
                onGeocodeSelect={handleGeocodeSelect}
                onPlaceAtMapCenter={handlePlaceAtMapCenter}
                onReset={handleReset}
                onDownload={handleDownload}
              />
            )}
          </div>
        </aside>
        <GeorefMap
          ref={mapRef}
          networkGeoJSON={transformedGeoJson}
          bboxCorners={bboxCorners}
          anchor={placed?.anchor ?? null}
          params={params}
          onParamsChange={setParams}
          bboxSizeMeters={loaded?.bboxSizeMeters ?? { widthMeters: 0, heightMeters: 0 }}
        />
      </div>
    </>
  );
}
