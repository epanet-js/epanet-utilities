import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { TimeStepResult } from "./types";

/**
 * Format time in HH:MM format
 */
export function formatElapsedTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
}

/**
 * Export node results to CSV format
 */
export function exportNodesToCSV(results: TimeStepResult[]): string {
  const headers = [
    "timestep_seconds",
    "timestep_formatted",
    "element_id",
    "element_type",
    "pressure",
    "demand",
    "head",
  ];

  const rows: string[] = [headers.join(",")];

  results.forEach((timeResult) => {
    const timeFormatted = formatElapsedTime(timeResult.timePeriod);

    timeResult.nodes.forEach((node) => {
      const row = [
        timeResult.timePeriod.toString(),
        timeFormatted,
        `"${node.id}"`, // Quote ID in case it contains special characters
        node.type,
        node.pressure?.toFixed(4) ?? "",
        node.demand?.toFixed(4) ?? "",
        node.head?.toFixed(4) ?? "",
        node.elevation?.toFixed(4) ?? "",
        node.x?.toFixed(4) ?? "",
        node.y?.toFixed(4) ?? "",
      ];
      rows.push(row.join(","));
    });
  });

  return rows.join("\n");
}

/**
 * Export link results to CSV format
 */
export function exportLinksToCSV(results: TimeStepResult[]): string {
  const headers = [
    "timestep_seconds",
    "timestep_formatted",
    "element_id",
    "element_type",
    "flow",
    "velocity",
    "headloss",
    "status",
  ];

  const rows: string[] = [headers.join(",")];

  results.forEach((timeResult) => {
    const timeFormatted = formatElapsedTime(timeResult.timePeriod);

    timeResult.links.forEach((link) => {
      const row = [
        timeResult.timePeriod.toString(),
        timeFormatted,
        `"${link.id}"`, // Quote ID in case it contains special characters
        link.type,
        link.flow?.toFixed(4) ?? "",
        link.velocity?.toFixed(4) ?? "",
        link.headloss?.toFixed(4) ?? "",
        link.status?.toString() ?? "",
      ];
      rows.push(row.join(","));
    });
  });

  return rows.join("\n");
}

/**
 * Create a ZIP bundle containing GIS file and CSV files
 */
export async function createZipBundle(
  gisFileName: string,
  gisBlob: Blob,
  nodesCsv: string,
  linksCsv: string,
  baseFileName: string,
): Promise<void> {
  const zip = new JSZip();

  // Add GIS file (GeoJSON or Shapefile)
  zip.file(gisFileName, gisBlob);

  // Add CSV files
  zip.file(`${baseFileName}_nodes.csv`, nodesCsv);
  zip.file(`${baseFileName}_links.csv`, linksCsv);

  // Generate ZIP and download
  const zipBlob = await zip.generateAsync({ type: "blob" });
  saveAs(zipBlob, `${baseFileName}_complete.zip`);
}

/**
 * Create a ZIP bundle for shapefile (which is already a zip) plus CSV files
 */
export async function createZipBundleWithShapefile(
  shapefileZipBlob: Blob,
  nodesCsv: string,
  linksCsv: string,
  baseFileName: string,
): Promise<void> {
  const zip = new JSZip();

  // Add shapefile as a nested file
  zip.file(`${baseFileName}.zip`, shapefileZipBlob);

  // Add CSV files
  zip.file(`${baseFileName}_nodes.csv`, nodesCsv);
  zip.file(`${baseFileName}_links.csv`, linksCsv);

  // Generate ZIP and download
  const zipBlob = await zip.generateAsync({ type: "blob" });
  saveAs(zipBlob, `${baseFileName}_complete.zip`);
}
