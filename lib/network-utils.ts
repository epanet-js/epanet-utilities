import type { NetworkData } from "./types";
import proj4 from "proj4";
import { FeatureCollection, Feature, Geometry } from "geojson";

// Local type definitions for the EPANET conversion function
type EpanetGeoJSON = FeatureCollection;
type EpanetFeature = Feature;

// Parse INP file and extract coordinates
export async function parseINPFile(
  file: File | null,
): Promise<NetworkData | null> {
  if (!file) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const content = reader.result as string;
      const [coordinates, vertices] = extractGeometryData(content);

      resolve({
        coordinates,
        vertices,
        inp: content,
        name: file.name,
      });
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
}

// Extract coordinates and vertices from an INP file string
function extractGeometryData(
  inpContent: string,
): [Record<string, [number, number]>, Record<string, [number, number][]>] {
  const coordinates: Record<string, [number, number]> = {};
  const vertices: Record<string, [number, number][]> = {};

  const lines = inpContent.split("\n");
  let section: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(";") || trimmed === "") continue;

    if (trimmed.startsWith("[")) {
      section = trimmed;
      continue;
    }

    const parts = trimmed.split(/\s+/);
    if (section === "[COORDINATES]" && parts.length >= 3) {
      const [id, x, y] = parts;
      coordinates[id] = [parseFloat(x), parseFloat(y)];
    } else if (section === "[VERTICES]" && parts.length >= 3) {
      const [linkId, x, y] = parts;
      if (!vertices[linkId]) {
        vertices[linkId] = [];
      }
      vertices[linkId].push([parseFloat(x), parseFloat(y)]);
    }
  }

  return [coordinates, vertices];
}

export function updateINPWithReprojectedData(
  inpContent: string,
  networkData: NetworkData,
  decimalPrecision: number = 4,
): string {
  const lines = inpContent.split("\n");
  let section: string | null = null;
  const updatedLines: string[] = [];
  let insideCoordinates = false;
  let insideVertices = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect and remove [END]
    if (trimmed === "[END]") {
      continue;
    }

    // Detect section headers
    if (trimmed.startsWith("[")) {
      section = trimmed;
      insideCoordinates = section === "[COORDINATES]";
      insideVertices = section === "[VERTICES]";
      updatedLines.push(line);
      continue;
    }

    // Skip all lines inside the old COORDINATES and VERTICES sections
    if (insideCoordinates || insideVertices) {
      continue;
    }

    updatedLines.push(line);
  }

  // Append the updated COORDINATES section
  if (Object.keys(networkData.coordinates).length > 0) {
    updatedLines.push("\n[COORDINATES]");
    for (const [id, [x, y]] of Object.entries(networkData.coordinates)) {
      updatedLines.push(
        `${id} ${x.toFixed(decimalPrecision)} ${y.toFixed(decimalPrecision)}`,
      );
    }
  }

  // Append the updated VERTICES section
  if (Object.keys(networkData.vertices).length > 0) {
    updatedLines.push("\n[VERTICES]");
    for (const [linkId, points] of Object.entries(networkData.vertices)) {
      for (const [x, y] of points) {
        updatedLines.push(
          `${linkId} ${x.toFixed(decimalPrecision)} ${y.toFixed(
            decimalPrecision,
          )}`,
        );
      }
    }
  }

  // Ensure [END] is re-added at the end of the file
  updatedLines.push("\n[END]");

  return updatedLines.join("\n");
}

export function convertCoordinates(
  networkData: NetworkData,
  sourceProjection: string,
  targetProjection: string,
): NetworkData {
  const transformedCoordinates: Record<string, [number, number]> = {};
  const transformedVertices: Record<string, [number, number][]> = {};

  // Convert node coordinates
  for (const [id, [x, y]] of Object.entries(networkData.coordinates)) {
    const [long, lat] = proj4(sourceProjection, targetProjection, [x, y]);
    transformedCoordinates[id] = [long, lat];
  }

  // Convert link vertices
  for (const [linkId, points] of Object.entries(networkData.vertices)) {
    transformedVertices[linkId] = points.map(([x, y]) =>
      proj4(sourceProjection, targetProjection, [x, y]),
    );
  }

  return {
    coordinates: transformedCoordinates,
    vertices: transformedVertices,
    inp: networkData.inp, // Keep original INP content
    name: networkData.name,
  };
}

/**
 * Converts an EpanetGeoJSON object to WGS84.
 * @param geojson The input EpanetGeoJSON with a different projection.
 * @param sourceProjection The source projection string.
 * @returns A new EpanetGeoJSON with all coordinates converted to WGS84.
 */
export function convertGeoJsonToWGS84(
  geojson: EpanetGeoJSON,
  sourceProjection: string,
): EpanetGeoJSON {
  return {
    ...geojson,
    features: geojson.features.map((feature) => {
      const { geometry, properties, type, id, bbox } = feature;

      if (geometry.type === "Point") {
        // Convert point coordinates
        const [x, y] = geometry.coordinates;
        const [lon, lat] = proj4(sourceProjection, "EPSG:4326", [x, y]);

        return {
          ...feature,
          geometry: {
            ...geometry,
            coordinates: [lon, lat],
          },
        } as EpanetFeature; // Explicitly cast to maintain type safety
      } else if (geometry.type === "LineString") {
        // Convert each vertex in the polyline
        const convertedCoordinates = geometry.coordinates.map(([x, y]) =>
          proj4(sourceProjection, "EPSG:4326", [x, y]),
        );

        return {
          type,
          geometry: {
            ...geometry,
            coordinates: convertedCoordinates,
          },
          properties,
          id,
          bbox,
        } as EpanetFeature; // Explicitly cast to ensure compatibility
      }

      // If it's not Point or LineString, return it unchanged (shouldn't happen in EPANET context)
      return feature;
    }),
  };
}

/**
 * Converts a generic GeoJSON FeatureCollection to WGS84.
 * @param geojson The input GeoJSON FeatureCollection with a different projection.
 * @param sourceProjection The source projection string.
 * @returns A new GeoJSON FeatureCollection with all coordinates converted to WGS84.
 */
export function convertGeoJsonToWGS84Generic(
  geojson: FeatureCollection,
  sourceProjection: string,
): FeatureCollection {
  return {
    ...geojson,
    features: geojson.features.map((feature: Feature) => {
      if (!feature.geometry) return feature;

      const convertedGeometry = convertGeometry(
        feature.geometry,
        sourceProjection,
      );

      return {
        ...feature,
        geometry: convertedGeometry,
      };
    }),
  };
}

/**
 * Converts a GeoJSON geometry to WGS84 coordinates.
 * @param geometry The geometry to convert
 * @param sourceProjection The source projection string
 * @returns The converted geometry
 */
function convertGeometry(
  geometry: Geometry,
  sourceProjection: string,
): Geometry {
  if (!geometry) return geometry;

  switch (geometry.type) {
    case "Point":
      const [x, y] = geometry.coordinates as [number, number];
      const [lon, lat] = proj4(sourceProjection, "EPSG:4326", [x, y]);
      return {
        ...geometry,
        coordinates: [lon, lat],
      };

    case "LineString":
      const convertedCoordinates = (
        geometry.coordinates as [number, number][]
      ).map(([x, y]: [number, number]) =>
        proj4(sourceProjection, "EPSG:4326", [x, y]),
      );
      return {
        ...geometry,
        coordinates: convertedCoordinates,
      };

    case "Polygon":
      const convertedRings = (geometry.coordinates as [number, number][][]).map(
        (ring: [number, number][]) =>
          ring.map(([x, y]: [number, number]) =>
            proj4(sourceProjection, "EPSG:4326", [x, y]),
          ),
      );
      return {
        ...geometry,
        coordinates: convertedRings,
      };

    case "MultiPoint":
      const convertedPoints = (geometry.coordinates as [number, number][]).map(
        ([x, y]: [number, number]) =>
          proj4(sourceProjection, "EPSG:4326", [x, y]),
      );
      return {
        ...geometry,
        coordinates: convertedPoints,
      };

    case "MultiLineString":
      const convertedLines = (geometry.coordinates as [number, number][][]).map(
        (line: [number, number][]) =>
          line.map(([x, y]: [number, number]) =>
            proj4(sourceProjection, "EPSG:4326", [x, y]),
          ),
      );
      return {
        ...geometry,
        coordinates: convertedLines,
      };

    case "MultiPolygon":
      const convertedPolygons = (
        geometry.coordinates as [number, number][][][]
      ).map((polygon: [number, number][][]) =>
        polygon.map((ring: [number, number][]) =>
          ring.map(([x, y]: [number, number]) =>
            proj4(sourceProjection, "EPSG:4326", [x, y]),
          ),
        ),
      );
      return {
        ...geometry,
        coordinates: convertedPolygons,
      };

    case "GeometryCollection":
      return {
        ...geometry,
        geometries: geometry.geometries.map((geom: Geometry) =>
          convertGeometry(geom, sourceProjection),
        ),
      };

    default:
      return geometry;
  }
}
