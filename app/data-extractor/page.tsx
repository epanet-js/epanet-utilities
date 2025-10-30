"use client";

import { useState, useEffect } from "react";
import { FileUploader } from "@/components/file-uploader";
import { DataExtractor } from "@/components/data-extractor";
import { MapDisplay } from "@/components/map-display";
import type { NetworkData } from "@/lib/types";
import { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import { parseINPFile } from "@/lib/network-utils";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

import { isLikelyLatLng } from "@/lib/check-projection";
import { approximateReprojectToLatLngSingle } from "@/lib/approx-reproject";

import { toGeoJson, ToGeoJsonResult } from "@/lib/epanet-geojson";
import { toShapeFile } from "@/lib/epanet-to-shapefile";

type ExportFormat = "geojson" | "shapefile";

export default function DataExtractorPage() {
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [epanetGeoJson, setEpanetGeoJson] = useState<ToGeoJsonResult | null>(
    null,
  );
  const [mapData, setMapData] = useState<FeatureCollection<
    Geometry,
    GeoJsonProperties
  > | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("geojson");
  const [includeResults, setIncludeResults] = useState<boolean>(false);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [exportAllTimesteps, setExportAllTimesteps] = useState<boolean>(false);

  const handleFileLoaded = async (file: File | null) => {
    try {
      const data = await parseINPFile(file);
      if (data?.inp) {
        const modelGeojson = toGeoJson(data?.inp);
        setEpanetGeoJson(modelGeojson);

        // Filter to show only pipes (Link features)
        const pipesOnly = {
          ...modelGeojson.geojson,
          features: modelGeojson.geojson.features.filter(
            (feature) => feature.properties?.type === "Link",
          ),
        };

        if (isLikelyLatLng(pipesOnly)) {
          setMapData(pipesOnly);
        } else {
          const approxGeojson = approximateReprojectToLatLngSingle(pipesOnly);
          setMapData(approxGeojson);
        }
      }

      setNetworkData(data);

      // Clear map data if no file is selected
      if (!data || !file) {
        setMapData(null);
        return;
      }
    } catch (error) {
      console.error("Error processing file:", error);
      setNetworkData(null);
      setMapData(null);
    }
  };

  const handleDownload = () => {
    if (!networkData || !epanetGeoJson) return;

    try {
      const trimmedName = networkData.name.endsWith(".inp")
        ? networkData.name.slice(0, -4)
        : networkData.name;

      if (exportFormat === "geojson") {
        // Download GeoJSON
        const dataStr = JSON.stringify(epanetGeoJson.geojson, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${trimmedName}.geojson`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Download Shapefile
        toShapeFile(epanetGeoJson.geojson, trimmedName);
        toast({
          title: "✅ Success!",
          description: "Shapefile export started. Check your downloads folder.",
        });
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      toast({
        title: "⚠️ Error!",
        description: "Error downloading file",
        variant: "destructive",
      });
    }
  };

  return (
    <main>
      <Toaster />

      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-3">
          EPANET Data Extractor
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          Convert your EPANET network files to GIS formats with optional
          simulation results
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
            <FileUploader onFileLoaded={handleFileLoaded} />
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
            <DataExtractor
              exportFormat={exportFormat}
              onExportFormatChange={setExportFormat}
              includeResults={includeResults}
              onIncludeResultsChange={setIncludeResults}
              selectedTime={selectedTime}
              onSelectedTimeChange={setSelectedTime}
              exportAllTimesteps={exportAllTimesteps}
              onExportAllTimestepsChange={setExportAllTimesteps}
              onDownload={handleDownload}
              canDownload={!!networkData}
            />
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 h-full">
            <MapDisplay geoJSON={mapData} />
          </div>
        </div>
      </div>
    </main>
  );
}
