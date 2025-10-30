import { FeatureCollection, Feature, Point, LineString } from "geojson";
import type { TimeStepResult } from "./types";

/******************************************************
 * INTERFACES & TYPES
 ******************************************************/

/** A structured parse error for better debugging */
interface ParseError {
  line: number; // Which line in the INP file caused the error
  section: string; // The [SECTION] we believe we're in
  message: string; // Explanation of what went wrong
}

/** This is the main return from `toGeoJson`. */
export interface ToGeoJsonResult {
  geojson: EpanetGeoJSON; // The best attempt at the model so far
  errors: ParseError[]; // Any parse errors
}

/** The specialized FeatureCollection we want to return */
interface EpanetGeoJSON extends FeatureCollection {
  /** The union of all EPANET features that we parsed */
  features: EpanetFeature[];
}

/** Any EPANET Feature can be a Node or a Link */
type EpanetFeature = NodeFeature | LinkFeature;

/** Nodes vs. Links */
type NodeFeature = Junction | Tank | Reservoir;
type LinkFeature = Pipe | Valve | Pump;

/** Base Node property shape */
interface NodeProperties {
  type: "Node";
  category: "Junction" | "Tank" | "Reservoir";
  id: string;
  comment?: string; // We'll store the parsed comment here
}

/** Base Link property shape */
interface LinkProperties {
  type: "Link";
  category: "Pipe" | "Valve" | "Pump";
  id: string;
  usNodeId: string;
  dsNodeId: string;
  comment?: string; // We'll store the parsed comment here
}

/****************************************
 * NODE Feature Types (Junction, Tank, Reservoir)
 ****************************************/
interface JunctionProperties extends NodeProperties {
  category: "Junction";
  elevation: number;
  demand?: number;
  pattern?: string;
}
interface Junction extends Feature<Point, JunctionProperties> {
  properties: JunctionProperties;
}

interface TankProperties extends NodeProperties {
  category: "Tank";
  elevation: number;
  initLevel: number;
  minLevel: number;
  maxLevel: number;
  diameter: number;
  minVolume: number;
  volCurve: string;
  overflow?: boolean;
}
interface Tank extends Feature<Point, TankProperties> {
  properties: TankProperties;
}

interface ReservoirProperties extends NodeProperties {
  category: "Reservoir";
  head: number;
  pattern?: string;
}
interface Reservoir extends Feature<Point, ReservoirProperties> {
  properties: ReservoirProperties;
}

/****************************************
 * LINK Feature Types (Pipe, Valve, Pump)
 ****************************************/
type PipeStatus = "Open" | "Closed" | "CV";

interface PipeProperties extends LinkProperties {
  category: "Pipe";
  length: number;
  diameter: number;
  roughness: number;
  minorLoss: number;
  status?: PipeStatus;
}
interface Pipe extends Feature<LineString, PipeProperties> {
  properties: PipeProperties;
}

type ValveType = "PRV" | "PSV" | "PBV" | "FCV" | "TCV" | "GPV";

interface ValveProperties extends LinkProperties {
  category: "Valve";
  diameter: number;
  valveType: ValveType;
  setting: number;
  minorLoss: number;
}
interface Valve extends Feature<LineString, ValveProperties> {
  properties: ValveProperties;
}

type PumpMode = "Power" | "Head";

interface BasePumpProperties extends LinkProperties {
  category: "Pump";
  mode: PumpMode;
  speed?: number;
  pattern?: string;
}

/** Pump can be in "Power" mode or "Head" mode. */
interface PowerPumpProperties extends BasePumpProperties {
  mode: "Power";
  power: number;
}
interface HeadPumpProperties extends BasePumpProperties {
  mode: "Head";
  head: string;
}
type PumpProperties = PowerPumpProperties | HeadPumpProperties;

interface Pump extends Feature<LineString, PumpProperties> {
  properties: PumpProperties;
}

/******************************************************
 * Internal parsing data structures
 ******************************************************/
interface NodeLookup {
  [id: string]: NodeFeature;
}
interface LinkLookup {
  [id: string]: LinkFeature;
}

/** Internal ephemeral data store during parsing */
interface EpanetData {
  currentFunction: string; // e.g. "[JUNCTIONS]" or "[PIPES]" etc.
  nodeIndex: number; // incremental numeric ID for node features
  linkIndex: number; // incremental numeric ID for link features
  errors: ParseError[]; // accumulate errors
  nodes: NodeLookup; // all Node features, keyed by their string ID
  links: LinkLookup; // all Link features, keyed by their string ID
}

/******************************************************
 * Main Exported Parsing Function
 ******************************************************/

export function toGeoJson(inpFile: string): ToGeoJsonResult {
  const epanetData: EpanetData = {
    currentFunction: "",
    nodeIndex: 0,
    linkIndex: 0,
    errors: [],
    nodes: {},
    links: {},
  };

  // Split input lines
  const lines = inpFile.split("\n");

  // Process each line
  const finalData = lines.reduce((acc, line, index) => {
    return parseLine(acc, line, index + 1); // +1 for human-friendly line numbering
  }, epanetData);

  // After we've parsed everything, build final link geometries:
  // place upstream node coordinate, any bend coordinates, then downstream node coordinate
  const linkFeatures = Object.keys(finalData.links).map((linkId) => {
    const link = finalData.links[linkId];
    const { usNodeId, dsNodeId } = link.properties;

    const usNode = finalData.nodes[usNodeId];
    const dsNode = finalData.nodes[dsNodeId];

    if (!usNode || !dsNode) {
      addError(
        finalData,
        0,
        `Link "${linkId}" references missing node(s): [${usNodeId}, ${dsNodeId}]`,
      );
      return link; // keep as-is (with partial geometry) but note the error
    }

    const usCoords = usNode.geometry.coordinates;
    const dsCoords = dsNode.geometry.coordinates;
    const midCoords = link.geometry.coordinates;
    const finalCoords = [usCoords, ...midCoords, dsCoords];

    return {
      ...link,
      geometry: {
        ...link.geometry,
        coordinates: finalCoords,
      },
    };
  });

  // Combine node features and link features
  const nodeFeatures = Object.values(finalData.nodes);
  const features = [...nodeFeatures, ...linkFeatures];

  // If no nodes or links were found, throw
  if (finalData.linkIndex === 0 && finalData.nodeIndex === 0) {
    addError(finalData, 0, "Reading INP failed: no links or nodes found.");
  }

  // Final output
  const geojson: EpanetGeoJSON = {
    type: "FeatureCollection",
    features: features,
  };

  return {
    geojson,
    errors: finalData.errors,
  };
}

/******************************************************
 * parseLine: Decide which parsing function to call
 ******************************************************/

function parseLine(
  data: EpanetData,
  rawLine: string,
  lineNumber: number,
): EpanetData {
  // Extract comment: anything after ';'
  const commentIndex = rawLine.indexOf(";");
  let comment = "";
  if (commentIndex !== -1) {
    // take substring after ';' (remove possible newline chars)
    comment = rawLine
      .substring(commentIndex + 1)
      .replace(/(\r\n|\n|\r)/gm, "")
      .trim();
  }

  // We'll parse the main line content up to the comment
  const lineContent = (
    commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex)
  )
    // compress multiple spaces/tabs to one
    .replace(/\s+/g, " ")
    // trim left/right
    .trim();

  // Skip blank lines (or lines that were all comment)
  if (!lineContent) {
    return data;
  }

  // If a line starts with '[', it's a new section
  if (lineContent.startsWith("[") && lineContent.endsWith("]")) {
    data.currentFunction = lineContent; // e.g. "[JUNCTIONS]"
    return data;
  }

  // Switch by current [SECTION]
  switch (data.currentFunction.toUpperCase()) {
    case "[JUNCTIONS]":
      return parseJunction(data, lineContent, lineNumber, comment);
    case "[RESERVOIRS]":
      return parseReservoir(data, lineContent, lineNumber, comment);
    case "[TANKS]":
      return parseTank(data, lineContent, lineNumber, comment);
    case "[PIPES]":
      return parsePipe(data, lineContent, lineNumber, comment);
    case "[VALVES]":
      return parseValve(data, lineContent, lineNumber, comment);
    case "[PUMPS]":
      return parsePump(data, lineContent, lineNumber, comment);
    case "[COORDINATES]":
      return parseCoordinates(data, lineContent, lineNumber);
    case "[VERTICES]":
      return parseVertices(data, lineContent, lineNumber);

    default:
      // We don't know this section; record an error but don't stop
      addError(
        data,
        lineNumber,
        `Unrecognized section: "${data.currentFunction}". Line: "${lineContent}"`,
      );
      return data;
  }
}

/******************************************************
 * HELPER: Add an error to epanetData
 ******************************************************/
function addError(data: EpanetData, line: number, message: string) {
  data.errors.push({
    line,
    section: data.currentFunction,
    message,
  });
}

/******************************************************
 * PARSER FUNCTIONS
 ******************************************************/

/** [JUNCTIONS]
 * Format (commonly):
 *   ID  Elevation  [Demand]  [Pattern]
 */
function parseJunction(
  data: EpanetData,
  line: string,
  lineNumber: number,
  comment: string,
): EpanetData {
  const tokens = line.split(" ");
  if (tokens.length < 2) {
    addError(
      data,
      lineNumber,
      `Junction requires at least 2 columns: ID, Elevation. Got: "${line}"`,
    );
    return data;
  }
  const [id, elevStr, demandStr, patternStr] = tokens;
  const elevation = parseFloat(elevStr);
  if (isNaN(elevation)) {
    addError(
      data,
      lineNumber,
      `Could not parse JUNCTION elevation as float: "${elevStr}"`,
    );
  }

  let demand: number | undefined;
  if (demandStr !== undefined) {
    const val = parseFloat(demandStr);
    if (!isNaN(val)) {
      demand = val;
    } else {
      addError(
        data,
        lineNumber,
        `Could not parse JUNCTION demand as float: "${demandStr}"`,
      );
    }
  }

  const junction: Junction = {
    type: "Feature",
    id: data.nodeIndex,
    geometry: {
      type: "Point",
      coordinates: [0, 0], // will be updated by [COORDINATES]
    },
    properties: {
      type: "Node",
      category: "Junction",
      id,
      elevation,
      demand,
      pattern: patternStr,
      comment,
    },
  };

  data.nodes[id] = junction;
  data.nodeIndex++;
  return data;
}

/** [RESERVOIRS]
 * Format (commonly):
 *   ID  Head  [Pattern]
 */
function parseReservoir(
  data: EpanetData,
  line: string,
  lineNumber: number,
  comment: string,
): EpanetData {
  const tokens = line.split(" ");
  if (tokens.length < 2) {
    addError(data, lineNumber, `Reservoir requires ID, Head. Got: "${line}"`);
    return data;
  }
  const [id, headStr, patternStr] = tokens;
  const head = parseFloat(headStr);
  if (isNaN(head)) {
    addError(
      data,
      lineNumber,
      `Could not parse RESERVOIR head as float: "${headStr}"`,
    );
  }

  const reservoir: Reservoir = {
    type: "Feature",
    id: data.nodeIndex,
    geometry: {
      type: "Point",
      coordinates: [0, 0],
    },
    properties: {
      type: "Node",
      category: "Reservoir",
      id,
      head,
      pattern: patternStr,
      comment,
    },
  };

  data.nodes[id] = reservoir;
  data.nodeIndex++;
  return data;
}

/** [TANKS]
 * Format (commonly):
 *  ID  Elevation  InitLevel  MinLevel  MaxLevel  Diameter  MinVolume  VolCurve  [Overflow?]
 */
function parseTank(
  data: EpanetData,
  line: string,
  lineNumber: number,
  comment: string,
): EpanetData {
  const tokens = line.split(" ");
  if (tokens.length < 7) {
    addError(
      data,
      lineNumber,
      `Tank requires at least 7 columns. Got: "${line}"`,
    );
    return data;
  }

  const [
    id,
    elevStr,
    initStr,
    minStr,
    maxStr,
    diaStr,
    minVolStr,
    volCurve,
    overflowStr,
  ] = tokens;

  function parseNumOrWarn(s: string, desc: string): number {
    const val = parseFloat(s);
    if (isNaN(val)) {
      addError(data, lineNumber, `Could not parse ${desc} for TANK: "${s}"`);
      return 0;
    }
    return val;
  }

  const elevation = parseNumOrWarn(elevStr, "elevation");
  const initLevel = parseNumOrWarn(initStr, "initLevel");
  const minLevel = parseNumOrWarn(minStr, "minLevel");
  const maxLevel = parseNumOrWarn(maxStr, "maxLevel");
  const diameter = parseNumOrWarn(diaStr, "diameter");
  const minVolume = parseNumOrWarn(minVolStr, "minVolume");

  const tank: Tank = {
    type: "Feature",
    id: data.nodeIndex,
    geometry: {
      type: "Point",
      coordinates: [0, 0],
    },
    properties: {
      type: "Node",
      category: "Tank",
      id,
      elevation,
      initLevel,
      minLevel,
      maxLevel,
      diameter,
      minVolume,
      volCurve: volCurve || "",
      overflow: overflowStr?.toLowerCase() === "true",
      comment,
    },
  };

  data.nodes[id] = tank;
  data.nodeIndex++;
  return data;
}

/** [PIPES]
 * Format (commonly):
 *  ID  UsNode  DsNode  Length  Diameter  Roughness  MinorLoss  [Status]
 */
function parsePipe(
  data: EpanetData,
  line: string,
  lineNumber: number,
  comment: string,
): EpanetData {
  const tokens = line.split(" ");
  if (tokens.length < 6) {
    addError(
      data,
      lineNumber,
      `Pipe requires at least 6 columns. Got: "${line}"`,
    );
    return data;
  }
  const [
    id,
    usNodeId,
    dsNodeId,
    lengthStr,
    diamStr,
    roughStr,
    minorStr,
    statusStr,
  ] = tokens;

  const lengthVal = parseFloat(lengthStr);
  const diameterVal = parseFloat(diamStr);
  const roughVal = parseFloat(roughStr);
  const minorVal = parseFloat(minorStr);

  let status: PipeStatus | undefined;
  if (statusStr) {
    const lc = statusStr.toLowerCase();
    if (lc === "open") status = "Open";
    else if (lc === "closed") status = "Closed";
    else if (lc === "cv") status = "CV";
  }

  const pipe: Pipe = {
    type: "Feature",
    id: data.linkIndex,
    geometry: {
      type: "LineString",
      coordinates: [], // will update after reading [VERTICES]
    },
    properties: {
      type: "Link",
      category: "Pipe",
      id,
      usNodeId,
      dsNodeId,
      length: isNaN(lengthVal) ? 0 : lengthVal,
      diameter: isNaN(diameterVal) ? 0 : diameterVal,
      roughness: isNaN(roughVal) ? 0 : roughVal,
      minorLoss: isNaN(minorVal) ? 0 : minorVal,
      status,
      comment,
    },
  };

  data.links[id] = pipe;
  data.linkIndex++;
  return data;
}

/** [VALVES]
 * Format (typical):
 *  ID  UsNode  DsNode  Diameter  ValveType  Setting  MinorLoss
 */
function parseValve(
  data: EpanetData,
  line: string,
  lineNumber: number,
  comment: string,
): EpanetData {
  const tokens = line.split(" ");
  if (tokens.length < 7) {
    addError(
      data,
      lineNumber,
      `Valve requires at least 7 columns (ID, UsNode, DsNode, Diameter, Type, Setting, MinorLoss). Got: "${line}"`,
    );
    return data;
  }

  const [
    id,
    usNodeId,
    dsNodeId,
    diameterStr,
    valveTypeStr,
    settingStr,
    minorLossStr,
  ] = tokens;

  const diameterVal = parseFloat(diameterStr);
  const settingVal = parseFloat(settingStr);
  const minorLossVal = parseFloat(minorLossStr);

  const valve: Valve = {
    type: "Feature",
    id: data.linkIndex,
    geometry: {
      type: "LineString",
      coordinates: [],
    },
    properties: {
      type: "Link",
      category: "Valve",
      id,
      usNodeId,
      dsNodeId,
      diameter: isNaN(diameterVal) ? 0 : diameterVal,
      valveType: valveTypeStr as ValveType,
      setting: isNaN(settingVal) ? 0 : settingVal,
      minorLoss: isNaN(minorLossVal) ? 0 : minorLossVal,
      comment,
    },
  };

  data.links[id] = valve;
  data.linkIndex++;
  return data;
}

/** For parsing Pump lines with flexible KEY=VALUE approach */
interface PumpKeyValues {
  [x: string | number | symbol]: unknown;
  head: string | undefined;
  power: number | undefined;
  speed: number | undefined;
  pattern: string | undefined;
}

/** [PUMPS]
 * Example lines:
 *   Pump2 N121 N55 HEAD Curve1 SPEED 1.2 PATTERN 1 POWER 2.0
 * We interpret the token sequence:
 *   [id, usNodeId, dsNodeId, key1, val1, key2, val2, key3, val3, key4, val4]
 */
function parsePump(
  data: EpanetData,
  line: string,
  lineNumber: number,
  comment: string,
): EpanetData {
  const tokens = line.split(" ");
  // Minimal columns for ID, USNode, DSNode is 3 tokens.
  // Then we can have up to 4 pairs of (key, val), making up to 11 total.
  // You can adjust these rules as needed.
  if (tokens.length < 3) {
    addError(
      data,
      lineNumber,
      `Pump requires at least (ID, UsNode, DsNode). Got: "${line}"`,
    );
    return data;
  }

  // We won't enforce a strict upper bound if you want to allow more pairs,
  // but let's at least handle up to 11 to match your example.
  const [
    id,
    usNodeId,
    dsNodeId,
    key1,
    value1,
    key2,
    value2,
    key3,
    value3,
    key4,
    value4,
  ] = tokens;

  // We'll accumulate keys into a PumpKeyValues object
  const kv: PumpKeyValues = {
    head: undefined,
    power: undefined,
    speed: undefined,
    pattern: undefined,
  };

  // Helper function to store key/val in the kv object
  function addKeyVal(k?: string, v?: string) {
    if (!k) return;
    // e.g., if k = "HEAD", we do kv["head"] = v
    const lower = k.toLowerCase();
    if (lower === "head") {
      kv.head = v;
    } else if (lower === "power") {
      // parse as float
      const floatVal = parseFloat(v || "");
      kv.power = isNaN(floatVal) ? undefined : floatVal;
    } else if (lower === "speed") {
      const floatVal = parseFloat(v || "");
      kv.speed = isNaN(floatVal) ? undefined : floatVal;
    } else if (lower === "pattern") {
      kv.pattern = v;
    } else {
      // store any unknown key if needed
      kv[lower] = v;
    }
  }

  // Attach up to four possible pairs
  addKeyVal(key1, value1);
  addKeyVal(key2, value2);
  addKeyVal(key3, value3);
  addKeyVal(key4, value4);

  // Now decide if it's a Power or Head pump based on what's provided
  // We'll default to "Power" if we see a `power`, otherwise "Head" if we see a `head`.
  let pumpProps: PumpProperties;
  if (kv.power !== undefined) {
    pumpProps = {
      type: "Link",
      category: "Pump",
      id,
      usNodeId,
      dsNodeId,
      mode: "Power",
      power: kv.power,
      speed: kv.speed,
      pattern: kv.pattern,
      comment,
    };
  } else if (kv.head !== undefined) {
    pumpProps = {
      type: "Link",
      category: "Pump",
      id,
      usNodeId,
      dsNodeId,
      mode: "Head",
      head: kv.head,
      speed: kv.speed,
      pattern: kv.pattern,
      comment,
    };
  } else {
    // If neither 'power' nor 'head' is found, we might default to "Power" with no power?
    addError(
      data,
      lineNumber,
      `PUMP line missing HEAD or POWER specification. Defaulting to Power=0. Line: "${line}"`,
    );
    pumpProps = {
      type: "Link",
      category: "Pump",
      id,
      usNodeId,
      dsNodeId,
      mode: "Power",
      power: 0,
      speed: kv.speed,
      pattern: kv.pattern,
      comment,
    };
  }

  const pump: Pump = {
    type: "Feature",
    id: data.linkIndex,
    geometry: {
      type: "LineString",
      coordinates: [],
    },
    properties: pumpProps,
  };

  data.links[id] = pump;
  data.linkIndex++;
  return data;
}

/** [COORDINATES]
 * Format:
 *  NodeID  Xcoord  Ycoord
 */
function parseCoordinates(
  data: EpanetData,
  line: string,
  lineNumber: number,
): EpanetData {
  const tokens = line.split(" ");
  if (tokens.length < 3) {
    addError(
      data,
      lineNumber,
      `COORDINATES requires NodeID, X, Y. Got: "${line}"`,
    );
    return data;
  }
  const [nodeId, xStr, yStr] = tokens;
  const node = data.nodes[nodeId];
  if (!node) {
    addError(
      data,
      lineNumber,
      `COORDINATES references unknown node "${nodeId}".`,
    );
    return data;
  }

  const x = parseFloat(xStr);
  const y = parseFloat(yStr);
  if (isNaN(x) || isNaN(y)) {
    addError(
      data,
      lineNumber,
      `COORDINATES invalid X/Y: "${xStr}", "${yStr}".`,
    );
    return data;
  }
  node.geometry.coordinates = [x, y];
  return data;
}

/** [VERTICES]
 * Format:
 *  LinkID  Xcoord  Ycoord
 */
function parseVertices(
  data: EpanetData,
  line: string,
  lineNumber: number,
): EpanetData {
  const tokens = line.split(" ");
  if (tokens.length < 3) {
    addError(
      data,
      lineNumber,
      `VERTICES requires LinkID, X, Y. Got: "${line}"`,
    );
    return data;
  }
  const [linkId, xStr, yStr] = tokens;
  const link = data.links[linkId];
  if (!link) {
    addError(data, lineNumber, `VERTICES references unknown link "${linkId}".`);
    return data;
  }

  const x = parseFloat(xStr);
  const y = parseFloat(yStr);
  if (isNaN(x) || isNaN(y)) {
    addError(data, lineNumber, `VERTICES invalid X/Y: "${xStr}", "${yStr}".`);
    return data;
  }

  link.geometry.coordinates.push([x, y]);
  return data;
}

/******************************************************
 * RESULT ATTACHMENT: Merge simulation results into GeoJSON
 ******************************************************/

/**
 * Attach simulation results to GeoJSON features
 * Matches results to features by element ID and adds result properties
 */
export function attachSimulationResults(
  geojson: FeatureCollection,
  timeStepResult: TimeStepResult,
): FeatureCollection {
  // Create lookup maps for quick access
  const nodeResultsMap = new Map(
    timeStepResult.nodes.map((node) => [node.id, node]),
  );
  const linkResultsMap = new Map(
    timeStepResult.links.map((link) => [link.id, link]),
  );

  // Clone the GeoJSON to avoid mutating the original
  const enrichedGeoJson: FeatureCollection = {
    ...geojson,
    features: geojson.features.map((feature) => {
      const featureId = feature.properties?.id;
      if (!featureId) return feature;

      // Check if this is a node or link feature
      const featureType = feature.properties?.type;

      if (featureType === "Node") {
        const nodeResult = nodeResultsMap.get(featureId);
        if (nodeResult) {
          return {
            ...feature,
            properties: {
              ...feature.properties,
              // Add simulation results
              sim_pressure: nodeResult.pressure,
              sim_demand: nodeResult.demand,
              sim_head: nodeResult.head,
              sim_elevation: nodeResult.elevation,
              sim_timestep: timeStepResult.timePeriod,
            },
          };
        }
      } else if (featureType === "Link") {
        const linkResult = linkResultsMap.get(featureId);
        if (linkResult) {
          return {
            ...feature,
            properties: {
              ...feature.properties,
              // Add simulation results
              sim_flow: linkResult.flow,
              sim_velocity: linkResult.velocity,
              sim_headloss: linkResult.headloss,
              sim_status: linkResult.status,
              sim_timestep: timeStepResult.timePeriod,
            },
          };
        }
      }

      return feature;
    }),
  };

  return enrichedGeoJson;
}
