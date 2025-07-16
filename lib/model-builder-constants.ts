import { EpanetElementDefinition } from "./types";
import type { FlowUnit, HeadlossFormula } from "./types";

// Flow Unit Definitions
export const FLOW_UNITS_US: FlowUnit[] = ["CFS", "GPM", "MGD", "IMGD", "AFD"];

export const FLOW_UNITS_METRIC: FlowUnit[] = [
  "LPS",
  "LPM",
  "MLD",
  "CMH",
  "CMD",
];

export const FLOW_UNITS: FlowUnit[] = [...FLOW_UNITS_US, ...FLOW_UNITS_METRIC];

export function isMetricUnit(unit: FlowUnit): boolean {
  return FLOW_UNITS_METRIC.includes(unit);
}

// Attribute units mapping depending on selected flow unit (metric vs US)
const ATTRIBUTE_UNIT_MAP: Record<string, { us: string; metric: string }> = {
  Diameter: { us: "in", metric: "mm" },
  InitLevel: { us: "ft", metric: "m" },
  MinLevel: { us: "ft", metric: "m" },
  MaxLevel: { us: "ft", metric: "m" },
  Head: { us: "ft", metric: "m" },
};

export function getAttributeUnit(
  attribute: string,
  unit: FlowUnit,
): string | null {
  const mapping = ATTRIBUTE_UNIT_MAP[attribute];
  if (!mapping) return null;
  return isMetricUnit(unit) ? mapping.metric : mapping.us;
}

// Default pipe roughness based on headloss equation
export const PIPE_ROUGHNESS_DEFAULT: Record<HeadlossFormula, number> = {
  "Hazen-Williams": 100,
  "Darcy-Weisbach": 0.01,
  "Chezy-Manning": 0.013,
};

export function getDefaultPipeRoughness(formula: HeadlossFormula): number {
  return PIPE_ROUGHNESS_DEFAULT[formula] ?? 100;
}

export const EPANET_ELEMENTS: EpanetElementDefinition[] = [
  {
    key: "pipes",
    name: "Pipes",
    geometryTypes: ["LineString", "MultiLineString"],
    requiredAttributes: ["Id", "Diameter", "Roughness"],
    optionalAttributes: ["MinorLoss", "Status", "Comment"],
    defaultValues: {
      Diameter: 150,
      Roughness: 100,
      MinorLoss: 0,
      Status: "Open",
    },
  },
  {
    key: "nodes",
    name: "Nodes",
    geometryTypes: ["Point", "MultiPoint"],
    requiredAttributes: ["Id"],
    optionalAttributes: ["Comment"],
    defaultValues: {},
  },
  {
    key: "valves",
    name: "Valves",
    geometryTypes: ["Point", "MultiPoint"],
    requiredAttributes: ["Id", "Diameter", "Type", "Setting"],
    optionalAttributes: ["MinorLoss", "Comment"],
    defaultValues: {
      Diameter: 150,
      Type: "PRV",
      Setting: 0,
      MinorLoss: 0,
    },
  },
  {
    key: "pumps",
    name: "Pumps",
    geometryTypes: ["Point", "MultiPoint"],
    requiredAttributes: ["Id"],
    optionalAttributes: ["Parameters", "Comment"],
    defaultValues: {
      Parameters: "POWER 5",
    },
  },
  {
    key: "tanks",
    name: "Tanks",
    geometryTypes: ["Point", "MultiPoint"],
    requiredAttributes: ["Id", "InitLevel", "MinLevel", "MaxLevel", "Diameter"],
    optionalAttributes: ["MinVolume", "Comment"],
    defaultValues: {
      InitLevel: 5,
      MinLevel: 0,
      MaxLevel: 10,
      Diameter: 50,
      MinVolume: 0,
    },
  },
  {
    key: "reservoirs",
    name: "Reservoirs",
    geometryTypes: ["Point", "MultiPoint"],
    requiredAttributes: ["Id", "Head"],
    optionalAttributes: ["Comment"],
    defaultValues: {
      Head: 0,
    },
  },
];

export const ELEMENT_COLORS = {
  pipes: "#3b82f6",
  valves: "#f59e0b",
  nodes: "#10b981",
  pumps: "#ef4444",
  tanks: "#8b5cf6",
  reservoirs: "#06b6d4",
};

export function getValidGeometryType(geoJSON: any): string {
  if (!geoJSON || !geoJSON.features || geoJSON.features.length === 0) {
    return "Unknown";
  }

  const geometryTypes = new Set<string>();

  geoJSON.features.forEach((feature: any) => {
    if (feature.geometry && feature.geometry.type) {
      geometryTypes.add(feature.geometry.type);
    }
  });

  if (geometryTypes.size === 1) {
    return Array.from(geometryTypes)[0];
  } else if (geometryTypes.size > 1) {
    return "Mixed";
  }

  return "Unknown";
}

export function isValidGeometryForElement(
  geometryType: string,
  elementType: string,
): boolean {
  const element = EPANET_ELEMENTS.find((e) => e.key === elementType);
  if (!element) return false;

  return element.geometryTypes.includes(geometryType);
}

export function getGeoJSONProperties(geoJSON: any): string[] {
  if (!geoJSON || !geoJSON.features || geoJSON.features.length === 0) {
    return [];
  }

  const allProperties = new Set<string>();

  geoJSON.features.forEach((feature: any) => {
    if (feature.properties) {
      Object.keys(feature.properties).forEach((key) => {
        allProperties.add(key);
      });
    }
  });

  return Array.from(allProperties).sort();
}
