// @ts-ignore - hwbllmnn-shp-write doesn't have TypeScript definitions
import shpWrite from "hwbllmnn-shp-write";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { FeatureCollection } from "geojson";

type NodeCategories = "Junction" | "Tank" | "Reservoir";
type LinkCategories = "Pipe" | "Valve" | "Pump";
type GeometryType = "POINT" | "POLYLINE";

/**
 * Converts EPANET GeoJSON to Shapefile format and downloads as ZIP
 * @param geoJson - The GeoJSON FeatureCollection containing EPANET network features
 * @param filename - Base filename for the output (without extension)
 */
export async function toShapeFile(
  geoJson: FeatureCollection,
  filename: string,
): Promise<void> {
  const blob = await buildShapefileZip(geoJson, filename);
  saveAs(blob, `${filename}.zip`);
}

/**
 * Builds a shapefile ZIP as a Blob. Optionally includes extra files (e.g., CSVs).
 */
export async function buildShapefileZip(
  geoJson: FeatureCollection,
  filename: string,
  extraFiles?: Record<string, Blob | string>,
): Promise<Blob> {
  const zip = new JSZip();

  const polylineCategories: LinkCategories[] = ["Pipe", "Valve", "Pump"];
  const pointCategories: NodeCategories[] = ["Junction", "Tank", "Reservoir"];

  // Create shapefiles for each link category (pipes, valves, pumps)
  polylineCategories.forEach((cat) => {
    writeShapeData(geoJson, cat, "POLYLINE", zip);
  });

  // Create shapefiles for each node category (junctions, tanks, reservoirs)
  pointCategories.forEach((cat) => {
    writeShapeData(geoJson, cat, "POINT", zip);
  });

  // Add any extra files provided (e.g., CSVs)
  if (extraFiles) {
    Object.entries(extraFiles).forEach(([name, content]) => {
      zip.file(name, content);
    });
  }

  // Generate and return the ZIP blob
  try {
    const content = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
    });
    return content;
  } catch (error) {
    console.error("Error generating shapefile ZIP:", error);
    throw error as Error;
  }
}

/**
 * Writes shapefile data for a specific category to the ZIP archive
 */
function writeShapeData(
  geoJson: FeatureCollection,
  category: NodeCategories | LinkCategories,
  type: GeometryType,
  zip: JSZip,
) {
  // Filter features by category
  const filteredData = geoJson.features.filter(
    (f) => f.properties?.category === category,
  );

  // Only create shapefile if there are features of this type
  if (filteredData.length > 0) {
    // Extract geometry coordinates
    // For POLYLINE (links), wrap coordinates in an extra array as required by shp-write
    // For POINT (nodes), use coordinates directly
    const geom = filteredData.map((f) =>
      type === "POLYLINE" ? [f.geometry.coordinates] : f.geometry.coordinates,
    );

    // Extract properties for DBF file
    const data = filteredData.map((f) => f.properties);

    // Write shapefile components (.shp, .shx, .dbf) to ZIP
    shpWrite.write(
      data,
      type,
      geom,
      addFilesToZip(category.toLowerCase(), zip),
    );
  }
}

/**
 * Callback function to add shapefile components to the ZIP archive
 */
function addFilesToZip(fileName: string, zip: JSZip) {
  return (err: Error, files: any) => {
    if (err) {
      console.error(`Error writing shapefile for ${fileName}:`, err);
      throw err;
    }
    // Add the three shapefile components to the ZIP
    zip.file(fileName + ".shp", files.shp.buffer, { binary: true });
    zip.file(fileName + ".shx", files.shx.buffer, { binary: true });
    zip.file(fileName + ".dbf", files.dbf.buffer, { binary: true });
  };
}
