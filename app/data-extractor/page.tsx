"use client";

import { useState, useEffect, useRef } from "react";
import { FileUploader } from "@/components/file-uploader";
import { DataExtractor } from "@/components/data-extractor";
import { MapDisplay } from "@/components/map-display";
import { SimulationModal } from "@/components/simulation-modal";
import type {
  NetworkData,
  TimeParameterInfo,
  SimulationWorkerRequest,
  SimulationWorkerResponse,
  SimulationProgressMessage,
  TimeStepResult,
} from "@/lib/types";
import { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import { parseINPFile } from "@/lib/network-utils";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

import { isLikelyLatLng } from "@/lib/check-projection";
import { approximateReprojectToLatLngSingle } from "@/lib/approx-reproject";

import {
  toGeoJson,
  ToGeoJsonResult,
  attachSimulationResults,
} from "@/lib/epanet-geojson";
import { toShapeFile, buildShapefileZip } from "@/lib/epanet-to-shapefile";
import {
  formatElapsedTime,
  exportNodesToCSV,
  exportLinksToCSV,
  createZipBundle,
} from "@/lib/export-csv";
import { saveAs } from "file-saver";

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

  // Simulation state
  const [timeInfo, setTimeInfo] = useState<TimeParameterInfo | null>(null);
  const [timestepOptions, setTimestepOptions] = useState<
    { value: number; label: string }[]
  >([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState({
    current: 0,
    total: 0,
    message: "",
  });

  // Exporting state (for zipping/shapefile building)
  const [isExporting, setIsExporting] = useState(false);
  const [modalMode, setModalMode] = useState<"simulation" | "export">(
    "simulation",
  );

  // Worker management
  const workerRef = useRef<Worker | null>(null);
  const messageIdRef = useRef(0);
  const pendingRequestsRef = useRef(
    new Map<
      string,
      { resolve: (value: any) => void; reject: (reason: Error) => void }
    >(),
  );

  // Initialize worker
  useEffect(() => {
    const worker = new Worker(
      new URL("@/lib/workers/simulation-worker.ts", import.meta.url),
      { type: "module" },
    );

    worker.addEventListener("message", (event: MessageEvent) => {
      const data = event.data;

      // Handle progress messages
      if (data.type === "PROGRESS") {
        const progressMsg = data as SimulationProgressMessage;
        setSimulationProgress({
          current: progressMsg.currentStep,
          total: progressMsg.totalSteps,
          message: progressMsg.message,
        });
        return;
      }

      // Handle regular responses
      const response = data as SimulationWorkerResponse;
      const pending = pendingRequestsRef.current.get(response.id);

      if (pending) {
        pendingRequestsRef.current.delete(response.id);
        if (response.success) {
          pending.resolve(response.payload);
        } else {
          pending.reject(new Error(response.error || "Unknown worker error"));
        }
      }
    });

    workerRef.current = worker;

    return () => {
      worker.terminate();
    };
  }, []);

  // Helper function to send messages to worker
  const sendWorkerMessage = (type: string, payload?: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error("Worker not initialized"));
        return;
      }

      const id = `msg_${messageIdRef.current++}`;
      pendingRequestsRef.current.set(id, { resolve, reject });

      const request: SimulationWorkerRequest = {
        id,
        type: type as any,
        payload,
      };

      workerRef.current.postMessage(request);
    });
  };

  // Generate timestep options from time info
  const generateTimeOptions = (
    info: TimeParameterInfo,
  ): { value: number; label: string }[] => {
    const options: { value: number; label: string }[] = [];

    if (info.duration === 0) {
      // Steady state simulation
      options.push({ value: 0, label: "Steady State" });
    } else {
      // EPS simulation - calculate periods from duration, reportStart, and reportStep
      const numPeriods =
        info.reportStep > 0
          ? Math.floor((info.duration - info.reportStart) / info.reportStep) + 1
          : 1;

      for (let i = 0; i < numPeriods; i++) {
        const timeSeconds = info.reportStart + i * info.reportStep;
        // Only add if within duration
        if (timeSeconds <= info.duration) {
          options.push({
            value: timeSeconds,
            label: formatElapsedTime(timeSeconds),
          });
        }
      }
    }

    return options;
  };

  const handleFileLoaded = async (file: File | null) => {
    try {
      // Clear previous state
      if (!file) {
        setNetworkData(null);
        setMapData(null);
        setEpanetGeoJson(null);
        setTimeInfo(null);
        setTimestepOptions([]);
        setSelectedTime("");
        return;
      }

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

        // Load file into worker and get time parameters
        try {
          await sendWorkerMessage("LOAD_FILE", { fileContent: data.inp });
          const timeParamsResponse = await sendWorkerMessage(
            "GET_TIME_PARAMETERS",
          );
          const timeParams = timeParamsResponse.timeInfo as TimeParameterInfo;
          setTimeInfo(timeParams);

          // Generate timestep options
          const options = generateTimeOptions(timeParams);
          setTimestepOptions(options);

          // Set default selected time to first option
          if (options.length > 0) {
            setSelectedTime(options[0].value.toString());
          }
        } catch (workerError) {
          console.error("Error loading file into EPANET worker:", workerError);
          toast({
            title: "⚠️ Warning",
            description:
              "Could not initialize simulation. Basic export will still work.",
            variant: "destructive",
          });
        }
      }

      setNetworkData(data);
    } catch (error) {
      console.error("Error processing file:", error);
      setNetworkData(null);
      setMapData(null);
      setEpanetGeoJson(null);
      toast({
        title: "⚠️ Error",
        description: "Failed to load INP file",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async () => {
    if (!networkData || !epanetGeoJson) return;

    const trimmedName = networkData.name.endsWith(".inp")
      ? networkData.name.slice(0, -4)
      : networkData.name;

    try {
      const progressToast = toast({
        title: "Preparing export",
        description: "Your file will download shortly...",
      });
      let finalGeoJson: FeatureCollection = epanetGeoJson.geojson;
      let simulationResults: TimeStepResult[] | null = null;

      // Run simulation if results are requested
      if (includeResults && timeInfo) {
        setIsSimulating(true);

        try {
          // Determine which timesteps to simulate
          let timePeriods: number[];

          if (exportAllTimesteps) {
            // Simulate all timesteps
            timePeriods = timestepOptions.map((opt) => opt.value);
          } else {
            // Simulate only selected timestep
            const selectedTimeValue = parseInt(selectedTime);
            if (isNaN(selectedTimeValue)) {
              throw new Error("Please select a valid timestep");
            }
            timePeriods = [selectedTimeValue];
          }

          // Run simulation via worker
          const response = await sendWorkerMessage("RUN_SIMULATION", {
            timePeriods,
          });
          simulationResults = response.results as TimeStepResult[];

          // Attach results to GeoJSON (use first result for single timestep or first of all)
          if (simulationResults && simulationResults.length > 0) {
            const resultToAttach = exportAllTimesteps
              ? simulationResults.find(
                  (r) => r.timePeriod === parseInt(selectedTime),
                ) || simulationResults[0]
              : simulationResults[0];

            finalGeoJson = attachSimulationResults(
              epanetGeoJson.geojson,
              resultToAttach,
            );
          }
        } catch (simError) {
          console.error("Simulation error:", simError);
          toast({
            title: "⚠️ Simulation Error",
            description:
              simError instanceof Error
                ? simError.message
                : "Failed to run simulation",
            variant: "destructive",
          });
          setIsSimulating(false);
          return;
        } finally {
          setIsSimulating(false);
        }
      }

      // Handle export based on format and whether CSV export is requested
      if (exportAllTimesteps && simulationResults) {
        // Export with CSV files in a ZIP bundle
        const nodesCsv = exportNodesToCSV(simulationResults);
        const linksCsv = exportLinksToCSV(simulationResults);

        if (exportFormat === "geojson") {
          const geoJsonStr = JSON.stringify(finalGeoJson, null, 2);
          const geoJsonBlob = new Blob([geoJsonStr], {
            type: "application/json",
          });
          setModalMode("export");
          setIsExporting(true);
          try {
            await createZipBundle(
              `${trimmedName}.geojson`,
              geoJsonBlob,
              nodesCsv,
              linksCsv,
              trimmedName,
            );
          } finally {
            setIsExporting(false);
            setModalMode("simulation");
          }
          progressToast.update({
            title: "✅ Export ready",
            description: "GeoJSON and CSVs have been bundled into a ZIP.",
          });
        } else {
          // Build a single shapefile ZIP that includes CSVs
          setModalMode("export");
          setIsExporting(true);
          try {
            const shpZip = await buildShapefileZip(finalGeoJson, trimmedName, {
              [`${trimmedName}_nodes.csv`]: nodesCsv,
              [`${trimmedName}_links.csv`]: linksCsv,
            });
            saveAs(shpZip, `${trimmedName}.zip`);
          } finally {
            setIsExporting(false);
            setModalMode("simulation");
          }
          progressToast.update({
            title: "✅ Export ready",
            description: "Shapefile and CSVs have been bundled into one ZIP.",
          });
        }
      } else {
        // Standard export without CSV
        if (exportFormat === "geojson") {
          const dataStr = JSON.stringify(finalGeoJson, null, 2);
          const blob = new Blob([dataStr], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${trimmedName}.geojson`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          progressToast.update({
            title: "✅ Export ready",
            description: "GeoJSON exported successfully.",
          });
        } else {
          setModalMode("export");
          setIsExporting(true);
          try {
            await toShapeFile(finalGeoJson, trimmedName);
          } finally {
            setIsExporting(false);
            setModalMode("simulation");
          }
          progressToast.update({
            title: "✅ Export ready",
            description: "Shapefile exported successfully.",
          });
        }
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      toast({
        title: "⚠️ Error!",
        description:
          error instanceof Error ? error.message : "Error downloading file",
        variant: "destructive",
      });
    }
  };

  return (
    <main>
      <Toaster />
      <SimulationModal
        open={isSimulating || isExporting}
        mode={isExporting ? "export" : "simulation"}
        currentStep={simulationProgress.current}
        totalSteps={simulationProgress.total}
        message={
          isExporting
            ? "Generating export… please wait."
            : simulationProgress.message
        }
      />

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
              timestepOptions={timestepOptions}
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
