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
export type ModelBuilderStep =
  | "modelSettings"
  | "dataAssignment"
  | "attributeMapping";

export type EpanetElementType =
  | "pipes"
  | "valves"
  | "nodes"
  | "pumps"
  | "tanks"
  | "reservoirs";

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

// Mapping from element type to the full uploaded file (keeps filename etc.)
export type AssignedFileInfo = {
  [K in EpanetElementType]?: UploadedFile;
};

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
  settings: ModelSettings;
  assignedData: AssignedGisData;
  attributeMapping: AttributeMapping;
  metadata: {
    createdAt: string;
    version: string;
  };
}

export type FlowUnit =
  | "CFS"
  | "GPM"
  | "MGD"
  | "IMGD"
  | "AFD"
  | "LPS"
  | "LPM"
  | "MLD"
  | "CMH"
  | "CMD";

export type HeadlossFormula =
  | "Hazen-Williams"
  | "Darcy-Weisbach"
  | "Chezy-Manning";

export interface ModelSettings {
  flowUnit: FlowUnit;
  headlossFormula: HeadlossFormula;
}

// EPANET Simulation Types
export interface TimeParameterInfo {
  duration: number; // Total simulation duration in seconds
  reportStep: number; // Reporting time step in seconds
  reportStart: number; // Time when reporting starts in seconds
  periods: number; // Number of reporting time periods
}

export interface NodeResult {
  id: string;
  type: "Junction" | "Tank" | "Reservoir";
  pressure?: number;
  demand?: number;
  head?: number;
}

export interface LinkResult {
  id: string;
  type: "Pipe" | "Valve" | "Pump";
  flow?: number;
  velocity?: number;
  headloss?: number;
  status?: number;
}

export interface TimeStepResult {
  timePeriod: number; // Time in seconds
  nodes: NodeResult[];
  links: LinkResult[];
}

export interface SimulationResults {
  timeInfo: TimeParameterInfo;
  results: TimeStepResult[];
}

// Worker message types
export const SimulationMessageType = {
  LOAD_FILE: "LOAD_FILE",
  GET_TIME_PARAMETERS: "GET_TIME_PARAMETERS",
  RUN_SIMULATION: "RUN_SIMULATION",
  PROGRESS: "PROGRESS",
} as const;

export type SimulationMessageType =
  (typeof SimulationMessageType)[keyof typeof SimulationMessageType];

export interface SimulationWorkerRequest {
  id: string;
  type: SimulationMessageType;
  payload?: any;
}

export interface SimulationWorkerResponse {
  id: string;
  success: boolean;
  payload?: any;
  error?: string;
}

export interface SimulationProgressMessage {
  type: "PROGRESS";
  currentStep: number;
  totalSteps: number;
  message: string;
}
