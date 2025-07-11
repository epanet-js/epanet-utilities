import { FeatureCollection } from "geojson";

export type NetworkData = {
  coordinates: Record<string, [number, number]>; // Node ID -> [X, Y]
  vertices: Record<string, [number, number][]>; // Link ID -> Array of [X, Y] coordinates
  inp: string;
  name: string;
};

export type ProjectionInputMethod = "search" | "file" | "manual";

export interface Projection {
  id: string; // EPSG code or unique identifier
  name: string; // Human-readable name of the projection
  code: string; // PROJ.4 or WKT string
}

// Model Builder Types
export type ModelBuilderStep = 'dataAssignment' | 'attributeMapping';

export type EpanetElementType = 'pipes' | 'valves' | 'nodes' | 'pumps' | 'tanks' | 'reservoirs';

export interface UploadedFile {
  id: string;
  file: File;
  geoJSON: FeatureCollection;
  name: string;
  geometryType: string;
  featureCount: number;
}

export interface AssignedGisData {
  pipes?: FeatureCollection;
  valves?: FeatureCollection;
  nodes?: FeatureCollection;
  pumps?: FeatureCollection;
  tanks?: FeatureCollection;
  reservoirs?: FeatureCollection;
}

export interface AttributeMapping {
  [elementType: string]: {
    [epanetAttribute: string]: string | null; // GeoJSON property name or null if not mapped
  };
}

export interface EpanetElementDefinition {
  key: EpanetElementType;
  name: string;
  geometryTypes: string[];
  requiredAttributes: string[];
  optionalAttributes: string[];
  defaultValues: Record<string, any>;
}

export interface ModelBuilderConfig {
  assignedData: AssignedGisData;
  attributeMapping: AttributeMapping;
  metadata: {
    createdAt: string;
    version: string;
  };
}
