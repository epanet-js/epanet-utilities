"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FeatureCollection } from "geojson";
import { FileUploader } from "@/components/file-uploader";
import { AppHeader } from "@/components/app-header";
import { GeorefControls, type GcpPickStage } from "@/components/georef-controls";
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
  type Bbox,
  type TransformParams,
} from "@/lib/network-transform";
import {
  placeNetworkAtLatLng,
  transformLatLngPoint,
  type LatLng,
} from "@/lib/network-placement";
import {
  solveTransformFromGcps,
  type GroundControlPoint,
} from "@/lib/gcp-solve";
import type { GeocodeResult } from "@/lib/geocoding";
import type { NetworkData } from "@/lib/types";

const MAX_GCPS = 2;

interface LoadedFile {
  networkData: NetworkData;
  epanetGeoJson: ToGeoJsonResult;
  bbox: Bbox;
  nativeCenter: [number, number];
  isLatLng: boolean;
  units: EpanetUnitSystem;
  metersPerUnit: number;
}

interface PlacedNetwork {
  placedNd: NetworkData;
  anchor: LatLng;
  /** Bbox of `placedNd` in lat/lng (identity transform). */
  placedBbox: Bbox;
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
  return {
    networkData,
    epanetGeoJson,
    bbox,
    nativeCenter,
    isLatLng,
    units,
    metersPerUnit,
  };
}

export default function GeoreferencePage() {
  const [loaded, setLoaded] = useState<LoadedFile | null>(null);
  const [placed, setPlaced] = useState<PlacedNetwork | null>(null);
  const [params, setParams] = useState<TransformParams>(DEFAULT_TRANSFORM);
  const [gcps, setGcps] = useState<GroundControlPoint[]>([]);
  const [pendingGcpNodeId, setPendingGcpNodeId] = useState<string | null>(null);
  const [gcpPickStage, setGcpPickStage] = useState<GcpPickStage>(null);
  const mapRef = useRef<GeorefMapHandle | null>(null);

  // Any manual param update (from bbox drag, nudge buttons, keyboard, or
  // map-initiated transforms) should discard the current GCP solve, since
  // the pins no longer reflect the on-map positions.
  const handleManualParams = useCallback((p: TransformParams) => {
    setParams(p);
    setGcps((prev) => (prev.length > 0 ? [] : prev));
  }, []);

  const handleFileLoaded = useCallback(async (file: File | null) => {
    // Reset all GCP-related state whenever the loaded file changes.
    setGcps([]);
    setPendingGcpNodeId(null);
    setGcpPickStage(null);
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
    (anchor: LatLng, options?: { fitToNetwork?: boolean }) => {
      if (!loaded) return;
      const placedNd = placeNetworkAtLatLng(
        loaded.networkData,
        anchor,
        loaded.isLatLng,
        loaded.nativeCenter,
        loaded.metersPerUnit,
      );
      const placedBbox = computeBbox(placedNd);
      setPlaced({ placedNd, anchor, placedBbox });
      setParams(DEFAULT_TRANSFORM);
      setGcps([]);
      setPendingGcpNodeId(null);
      setGcpPickStage(null);

      if (options?.fitToNetwork) {
        mapRef.current?.flyTo(
          [anchor.lng, anchor.lat],
          [placedBbox.minX, placedBbox.minY, placedBbox.maxX, placedBbox.maxY],
        );
      }
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
    placeAt(mapRef.current.getCenter(), { fitToNetwork: true });
  }, [loaded, placeAt]);

  const handleClearPlacement = useCallback(() => {
    setPlaced(null);
    setParams(DEFAULT_TRANSFORM);
    setGcps([]);
    setPendingGcpNodeId(null);
    setGcpPickStage(null);
  }, []);

  const handleStartGcpNodePick = useCallback(() => {
    setPendingGcpNodeId(null);
    setGcpPickStage("node");
  }, []);

  const handleChooseGcpNode = useCallback((nodeId: string) => {
    setPendingGcpNodeId(nodeId);
    setGcpPickStage("target");
  }, []);

  const handleCancelGcpPick = useCallback(() => {
    setPendingGcpNodeId(null);
    setGcpPickStage(null);
  }, []);

  const handleMapClick = useCallback(
    (target: LatLng) => {
      if (!pendingGcpNodeId) return;
      setGcps((prev) => {
        const without = prev.filter((g) => g.nodeId !== pendingGcpNodeId);
        const next = [...without, { nodeId: pendingGcpNodeId, target }];
        return next.slice(-MAX_GCPS);
      });
      setPendingGcpNodeId(null);
      setGcpPickStage(null);
    },
    [pendingGcpNodeId],
  );

  const handleRemoveGcp = useCallback((index: number) => {
    setGcps((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Re-solve the transform whenever GCPs change.
  useEffect(() => {
    if (!placed || gcps.length === 0) return;
    const solved = solveTransformFromGcps(
      gcps,
      placed.placedNd,
      placed.anchor,
      params,
    );
    if (solved) setParams(solved);
    // `params` is intentionally excluded — we only re-solve when GCPs change,
    // so manual nudges don't get clobbered by the last-solved value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gcps, placed]);

  const nodeIds = useMemo(
    () => (loaded ? Object.keys(loaded.networkData.coordinates) : []),
    [loaded],
  );

  const gcpsGeoJSON: FeatureCollection | null = useMemo(() => {
    if (gcps.length === 0) return null;
    return {
      type: "FeatureCollection",
      features: gcps.map((g) => ({
        type: "Feature",
        properties: { label: g.nodeId },
        geometry: {
          type: "Point",
          coordinates: [g.target.lng, g.target.lat],
        },
      })),
    };
  }, [gcps]);

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

  const handleReset = useCallback(() => {
    setParams(DEFAULT_TRANSFORM);
    setGcps([]);
  }, []);

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
              Drop an INP onto a map and fit it visually. Find a location, lock
              the map, then drag / scale / rotate to match the ground.
            </p>
            <FileUploader onFileLoaded={handleFileLoaded} />
            {loaded && (
              <GeorefControls
                anchor={placed?.anchor ?? null}
                params={params}
                canDownload={!!placed}
                units={loaded.units}
                nodeIds={nodeIds}
                gcps={gcps}
                pendingGcpNodeId={pendingGcpNodeId}
                gcpPickStage={gcpPickStage}
                maxGcps={MAX_GCPS}
                onGeocodeSelect={handleGeocodeSelect}
                onPlaceAtMapCenter={handlePlaceAtMapCenter}
                onClearPlacement={handleClearPlacement}
                onStartGcpNodePick={handleStartGcpNodePick}
                onChooseGcpNode={handleChooseGcpNode}
                onCancelGcpPick={handleCancelGcpPick}
                onRemoveGcp={handleRemoveGcp}
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
          onParamsChange={handleManualParams}
          gcpsGeoJSON={gcpsGeoJSON}
          waitingForMapClick={gcpPickStage === "target"}
          onMapClick={handleMapClick}
          waitingForNodePick={gcpPickStage === "node"}
          onNodePick={handleChooseGcpNode}
        />
      </div>
    </>
  );
}
