"use client";

import { useState, useEffect } from "react";
import { FileUploader } from "@/components/file-uploader";
import { ProjectionConverter } from "@/components/projection-converter";
import { MapDisplay } from "@/components/map-display";
import type { NetworkData, Projection } from "@/lib/types";
import { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import {
  parseINPFile,
  convertCoordinates,
  convertGeoJsonToWGS84,
  updateINPWithReprojectedData,
} from "@/lib/network-utils";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

import { isLikelyLatLng } from "@/lib/check-projection";
import { approximateReprojectToLatLngSingle } from "@/lib/approx-reproject";

import { toGeoJson, ToGeoJsonResult } from "@/lib/epanet-geojson";
import { AppHeader } from "@/components/app-header";

export default function Home() {
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [epanetGeoJson, setEpanetGeoJson] = useState<ToGeoJsonResult | null>(
    null,
  );
  const [sourceProjection, setSourceProjection] = useState<Projection | null>(
    null,
  );
  const [targetProjection, setTargetProjection] = useState<Projection | null>(
    null,
  );

  const [mapData, setMapData] = useState<FeatureCollection<
    Geometry,
    GeoJsonProperties
  > | null>(null);
  const [projections, setProjections] = useState<Projection[]>([]);
  const [loadingProjections, setLoadingProjections] = useState<boolean>(true);

  useEffect(() => {
    let ignore = false;
    fetch("/projections.json")
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) {
          setProjections(data);
        }
      })
      .catch((err) => console.error("Failed to load projection data:", err))
      .finally(() => setLoadingProjections(false));
    return () => {
      ignore = true;
    };
  }, []);

  const handleFileLoaded = async (file: File | null) => {
    try {
      const data = await parseINPFile(file);
      if (data?.inp) {
        const modelGeojson = toGeoJson(data?.inp);
        setEpanetGeoJson(modelGeojson);
        if (isLikelyLatLng(modelGeojson.geojson)) {
          setMapData(modelGeojson.geojson);
          setSourceProjection({
            id: "EPSG:4326",
            name: "WGS 84",
            code: "+proj=longlat +datum=WGS84 +no_defs",
          });
        } else {
          const approxGeojson = approximateReprojectToLatLngSingle(
            modelGeojson.geojson,
          );
          setMapData(approxGeojson);
          setTargetProjection({
            id: "EPSG:4326",
            name: "WGS 84",
            code: "+proj=longlat +datum=WGS84 +no_defs",
          });
        }
      }

      setNetworkData(data);

      // Clear map data if no file is selected
      if (!data || !file) {
        setMapData(null);
        setSourceProjection(null);
        setTargetProjection(null);
        return;
      }
    } catch (error) {
      console.error("Error processing file:", error);
      // Handle error appropriately (e.g., show error message to user)
      setNetworkData(null);
      setMapData(null);
    }
  };

  const handleSourceProjectionChange = (projection: Projection | null) => {
    setSourceProjection(projection);

    if (epanetGeoJson && projection && projection.id !== "EPSG:4326") {
      const wgs84Coords = convertGeoJsonToWGS84(
        epanetGeoJson?.geojson,
        projection.code,
      );
      if (isLikelyLatLng(wgs84Coords)) {
        setMapData(wgs84Coords);
      } else {
        toast({
          title: "⚠️ Error!",
          description: "Projection failed to convert to WGS 84",
          variant: "destructive",
        });
      }
    }
  };

  const handleTargetProjectionChange = (projection: Projection | null) => {
    setTargetProjection(projection);
  };

  const handleDownloadConverted = () => {
    if (!networkData || !sourceProjection || !targetProjection) return;

    try {
      // First, convert the coordinates
      const convertedNetworkData = convertCoordinates(
        networkData,
        sourceProjection.code,
        targetProjection.code,
      );

      // Then immediately download the converted file
      const isLatLng = targetProjection.id === "EPSG:4326";
      const numberOfDecimals = isLatLng ? 6 : 2;

      // Generate new INP file with reprojected coordinates
      const newContent = updateINPWithReprojectedData(
        networkData.inp,
        convertedNetworkData,
        numberOfDecimals,
      );

      // Create and trigger download
      const blob = new Blob([newContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      //networkdata.name ends with .inp revove that and add [targetProjection.id] to the end

      const trimmedName = networkData.name.endsWith(".inp")
        ? networkData.name.slice(0, -4)
        : networkData.name;
      a.download = `${trimmedName}-[${targetProjection.id}].inp`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error converting coordinates:", error);

      toast({
        title: "⚠️ Error!",
        description: `Error converting coordinates to ${targetProjection.name} \n ${error}`,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Toaster />
      <div className="h-dvh grid
      grid-rows-[auto_1fr_1fr] md:grid-rows-[auto_1fr]
      grid-cols-1 md:grid-cols-2 lg:grid-cols-[400px_1fr]">
        <AppHeader />
        <aside className="border-b-4 md:border-b-0 border-r border-gray-300 overflow-y-auto">
          <div className="p-4 border-b border-gray-300">
            <h1 className="text-md font-bold tracking-tight">
              EPANET Projection Converter
            </h1>
          </div>
          <div className="p-4 space-y-4 flex flex-col md:h-[calc(100dvh_-_114px)]">
            <p className="text-sm text-gray-600">
              Convert your EPANET network files between different coordinate systems
            </p>
            <FileUploader onFileLoaded={handleFileLoaded} />
            <ProjectionConverter
              sourceProjection={sourceProjection}
              targetProjection={targetProjection}
              onSourceChange={handleSourceProjectionChange}
              onTargetChange={handleTargetProjectionChange}
              onDownloadConverted={handleDownloadConverted}
              canConvert={!!networkData}
              projections={projections}
              loadingProjections={loadingProjections}
            />
          </div>
        </aside>
        <MapDisplay geoJSON={mapData} />
      </div>
    </>
  );
}
