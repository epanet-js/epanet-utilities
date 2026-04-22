"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FeatureCollection } from "geojson";
import { FileUploader } from "@/components/file-uploader";
import { MapDisplay } from "@/components/map-display";
import { NetworkTransform } from "@/components/network-transform";
import { AppHeader } from "@/components/app-header";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/hooks/use-toast";
import {
  parseINPFile,
  updateINPWithReprojectedData,
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
  shiftToLatLngWithBaseline,
  type Bbox,
  type TransformParams,
} from "@/lib/network-transform";
import type { NetworkData } from "@/lib/types";

interface LoadedFile {
  networkData: NetworkData;
  epanetGeoJson: ToGeoJsonResult;
  bbox: Bbox;
  origin: [number, number];
  isLatLng: boolean;
  centerLat: number;
  bboxSizeMeters: { widthMeters: number; heightMeters: number };
  originalDisplayGeoJson: FeatureCollection;
}

function buildLoadedFile(
  networkData: NetworkData,
  epanetGeoJson: ToGeoJsonResult,
): LoadedFile {
  const bbox = computeBbox(networkData);
  const origin = bboxCenter(bbox);
  const isLatLng = isLikelyLatLng(epanetGeoJson.geojson);
  const centerLat = isLatLng ? origin[1] : 0;

  const widthNative = bbox.maxX - bbox.minX;
  const heightNative = bbox.maxY - bbox.minY;
  const bboxSizeMeters = isLatLng
    ? {
        widthMeters:
          widthNative * METERS_PER_DEGREE * Math.cos((centerLat * Math.PI) / 180),
        heightMeters: heightNative * METERS_PER_DEGREE,
      }
    : { widthMeters: widthNative, heightMeters: heightNative };

  const originalDisplayGeoJson = isLatLng
    ? epanetGeoJson.geojson
    : shiftToLatLngWithBaseline(epanetGeoJson.geojson, bbox.minX, bbox.minY);

  return {
    networkData,
    epanetGeoJson,
    bbox,
    origin,
    isLatLng,
    centerLat,
    bboxSizeMeters,
    originalDisplayGeoJson,
  };
}

export default function TransformPage() {
  const [loaded, setLoaded] = useState<LoadedFile | null>(null);
  const [params, setParams] = useState<TransformParams>(DEFAULT_TRANSFORM);
  const [transformedDisplayGeoJson, setTransformedDisplayGeoJson] =
    useState<FeatureCollection | null>(null);

  const handleFileLoaded = useCallback(async (file: File | null) => {
    try {
      if (!file) {
        setLoaded(null);
        setTransformedDisplayGeoJson(null);
        setParams(DEFAULT_TRANSFORM);
        return;
      }
      const data = await parseINPFile(file);
      if (!data?.inp) {
        setLoaded(null);
        setTransformedDisplayGeoJson(null);
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
        setTransformedDisplayGeoJson(null);
        return;
      }
      setLoaded(buildLoadedFile(data, epanetGeoJson));
      setParams(DEFAULT_TRANSFORM);
    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "⚠️ Error!",
        description: "Failed to load the INP file.",
        variant: "destructive",
      });
      setLoaded(null);
      setTransformedDisplayGeoJson(null);
    }
  }, []);

  useEffect(() => {
    if (!loaded) {
      setTransformedDisplayGeoJson(null);
      return;
    }

    const transformed = applyTransform(loaded.networkData, params, {
      origin: loaded.origin,
      isLatLng: loaded.isLatLng,
      centerLat: loaded.centerLat,
    });
    const geojson = applyNetworkDataToGeoJson(
      loaded.epanetGeoJson.geojson,
      transformed,
    );
    setTransformedDisplayGeoJson(
      loaded.isLatLng
        ? geojson
        : shiftToLatLngWithBaseline(
            geojson,
            loaded.bbox.minX,
            loaded.bbox.minY,
          ),
    );
  }, [loaded, params]);

  const handleReset = useCallback(() => {
    setParams(DEFAULT_TRANSFORM);
  }, []);

  const handleDownload = useCallback(() => {
    if (!loaded) return;
    try {
      const transformed = applyTransform(loaded.networkData, params, {
        origin: loaded.origin,
        isLatLng: loaded.isLatLng,
        centerLat: loaded.centerLat,
      });
      const decimals = loaded.isLatLng ? 6 : 2;
      const newContent = updateINPWithReprojectedData(
        loaded.networkData.inp,
        transformed,
        decimals,
      );
      const blob = new Blob([newContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const trimmedName = loaded.networkData.name.endsWith(".inp")
        ? loaded.networkData.name.slice(0, -4)
        : loaded.networkData.name;
      a.download = `${trimmedName}-transformed.inp`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading transformed model:", error);
      toast({
        title: "⚠️ Error!",
        description: "Failed to generate the transformed INP file.",
        variant: "destructive",
      });
    }
  }, [loaded, params]);

  const bboxSize = useMemo(
    () => loaded?.bboxSizeMeters ?? { widthMeters: 0, heightMeters: 0 },
    [loaded],
  );

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
              EPANET Transform
            </h1>
          </div>
          <div className="p-4 pb-0 space-y-4 flex flex-col md:h-[calc(100dvh_-_114px)]">
            <p className="text-sm text-gray-600">
              Scale, translate, and rotate an EPANET network. The original stays
              visible in grey while the transformed copy moves in blue.
            </p>
            <FileUploader onFileLoaded={handleFileLoaded} />
            {loaded && (
              <NetworkTransform
                params={params}
                onParamsChange={setParams}
                onReset={handleReset}
                onDownload={handleDownload}
                canDownload={!!loaded}
                bboxSize={bboxSize}
              />
            )}
          </div>
        </aside>
        <MapDisplay
          geoJSON={transformedDisplayGeoJson}
          originalGeoJSON={loaded?.originalDisplayGeoJson ?? null}
        />
      </div>
    </>
  );
}
