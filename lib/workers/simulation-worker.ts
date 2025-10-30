/* eslint-disable no-restricted-globals */
// EPANET Simulation Web Worker

import { Workspace, Project, InitHydOption } from "epanet-js";
import type {
  SimulationWorkerRequest,
  SimulationWorkerResponse,
  SimulationProgressMessage,
  TimeParameterInfo,
  TimeStepResult,
  NodeResult,
  LinkResult,
} from "../types";

let workspace: Workspace | null = null;
let model: Project | null = null;

// EPANET enum values (from epanet-js documentation)
const TimeParameter = {
  Duration: 0,
  HydStep: 1,
  QualStep: 2,
  PatternStep: 3,
  PatternStart: 4,
  ReportStep: 5,
  ReportStart: 6,
  RuleStep: 7,
  Statistic: 8,
  Periods: 9,
  StartTime: 10,
  HTime: 11,
  QTime: 12,
  HaltFlag: 13,
  NextEvent: 14,
  NextEventTank: 15,
};

const CountType = {
  NodeCount: 0,
  TankCount: 1,
  LinkCount: 2,
  PatCount: 3,
  CurveCount: 4,
  ControlCount: 5,
  RuleCount: 6,
};

const NodeType = {
  Junction: 0,
  Reservoir: 1,
  Tank: 2,
};

const NodeProperty = {
  Elevation: 0,
  Demand: 1,
  Head: 2,
  Pressure: 3,
  Quality: 4,
  SourceMass: 5,
  InitVolume: 6,
  MixModel: 7,
  MixZoneVol: 8,
  TankDiam: 9,
  MinVolume: 10,
  VolCurve: 11,
  MinLevel: 12,
  MaxLevel: 13,
  MixFraction: 14,
  TankKBulk: 15,
  TankVolume: 16,
  MaxVolume: 17,
  CanOverflow: 18,
  DemandDeficit: 19,
  EmitterFlow: 20,
  LeakageDemand: 21,
  X: 22,
  Y: 23,
};

const LinkProperty = {
  Diameter: 0,
  Length: 1,
  Roughness: 2,
  MinorLoss: 3,
  InitStatus: 4,
  InitSetting: 5,
  KBulk: 6,
  KWall: 7,
  Flow: 8,
  Velocity: 9,
  HeadLoss: 10,
  Status: 11,
  Setting: 12,
  Energy: 13,
  LinkQual: 14,
};

const LinkType = {
  CVPipe: 0,
  Pipe: 1,
  Pump: 2,
  PRV: 3,
  PSV: 4,
  PBV: 5,
  FCV: 6,
  TCV: 7,
  GPV: 8,
};

// Handle incoming messages
self.addEventListener(
  "message",
  async (event: MessageEvent<SimulationWorkerRequest>) => {
    const { id, type, payload } = event.data;

    try {
      let result: any;

      switch (type) {
        case "LOAD_FILE":
          result = await handleLoadFile(payload);
          break;
        case "GET_TIME_PARAMETERS":
          result = handleGetTimeParameters();
          break;
        case "RUN_SIMULATION":
          result = await handleRunSimulation(id, payload);
          break;
        default:
          throw new Error(`Unknown message type: ${type}`);
      }

      const response: SimulationWorkerResponse = {
        id,
        success: true,
        payload: result,
      };
      self.postMessage(response);
    } catch (error) {
      const response: SimulationWorkerResponse = {
        id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      self.postMessage(response);
    }
  },
);

// Load INP file and initialize EPANET workspace
async function handleLoadFile(payload: { fileContent: string }) {
  const { fileContent } = payload;

  // Clean up existing workspace if any
  if (workspace) {
    workspace = null;
    model = null;
  }

  // Create new workspace and model
  workspace = new Workspace();
  await workspace.loadModule();
  model = new Project(workspace);

  // Load the INP file content
  workspace.writeFile("model.inp", fileContent);
  model.open("model.inp", "report.rpt", "out.bin");

  const flowUnit = model.getFlowUnits();

  return { flowUnit };
}

// Get time parameters from loaded model
function handleGetTimeParameters(): { timeInfo: TimeParameterInfo } {
  if (!model) {
    throw new Error("Model not loaded");
  }

  // Read time parameters from the model
  const duration = model.getTimeParameter(TimeParameter.Duration);
  const reportStep = model.getTimeParameter(TimeParameter.ReportStep);
  const reportStart = model.getTimeParameter(TimeParameter.ReportStart);
  const periods = model.getTimeParameter(TimeParameter.Periods);

  return {
    timeInfo: {
      duration,
      reportStep,
      reportStart,
      periods,
    },
  };
}

// Run simulation for specified time periods
async function handleRunSimulation(
  requestId: string,
  payload: { timePeriods: number[] },
) {
  if (!model) {
    throw new Error("Model not loaded");
  }

  const { timePeriods } = payload;
  const results: TimeStepResult[] = [];

  for (let i = 0; i < timePeriods.length; i++) {
    const timePeriod = timePeriods[i];

    // Send progress update
    const progressMsg: SimulationProgressMessage = {
      type: "PROGRESS",
      currentStep: i + 1,
      totalSteps: timePeriods.length,
      message: `Running simulation for timestep ${i + 1} of ${
        timePeriods.length
      }...`,
    };
    self.postMessage(progressMsg);

    // Open hydraulics
    model.openH();
    model.initH(InitHydOption.NoSave);

    try {
      // Step to the target time
      stepToTime(timePeriod);

      // Extract results at this time period
      const nodes = extractNodeResults();
      const links = extractLinkResults();

      results.push({
        timePeriod,
        nodes,
        links,
      });
    } finally {
      // Close hydraulics
      model.closeH();
    }
  }

  return { results };
}

// Step through simulation to reach target time
function stepToTime(targetTimeSeconds: number): void {
  if (!model) {
    throw new Error("Model not loaded");
  }

  // If target time is 0 or less, just run once (steady state)
  if (targetTimeSeconds <= 0) {
    model.runH();
    return;
  }

  let currentTime = 0;
  let tStep = Infinity;

  do {
    currentTime = model.runH();

    // If we've reached or passed the target time, stop
    if (currentTime >= targetTimeSeconds) {
      break;
    }

    tStep = model.nextH();
  } while (tStep > 0);
}

// Extract node results at current time
function extractNodeResults(): NodeResult[] {
  if (!model) throw new Error("Model not loaded");

  const nodeCount = model.getCount(CountType.NodeCount);
  const results: NodeResult[] = [];

  for (let i = 1; i <= nodeCount; i++) {
    const nodeType = model.getNodeType(i);
    const nodeId = model.getNodeId(i);

    let type: "Junction" | "Tank" | "Reservoir";
    if (nodeType === NodeType.Junction) {
      type = "Junction";
    } else if (nodeType === NodeType.Tank) {
      type = "Tank";
    } else if (nodeType === NodeType.Reservoir) {
      type = "Reservoir";
    } else {
      continue; // Skip unknown node types
    }

    const result: NodeResult = {
      id: nodeId,
      type,
      pressure: model.getNodeValue(i, NodeProperty.Pressure),
      demand: model.getNodeValue(i, NodeProperty.Demand),
      head: model.getNodeValue(i, NodeProperty.Head),
      elevation: model.getNodeValue(i, NodeProperty.Elevation),
      x: model.getNodeValue(i, NodeProperty.X),
      y: model.getNodeValue(i, NodeProperty.Y),
    };

    results.push(result);
  }

  return results;
}

// Extract link results at current time
function extractLinkResults(): LinkResult[] {
  if (!model) throw new Error("Model not loaded");

  const linkCount = model.getCount(CountType.LinkCount);
  const results: LinkResult[] = [];

  for (let i = 1; i <= linkCount; i++) {
    const linkType = model.getLinkType(i);
    const linkId = model.getLinkId(i);

    let type: "Pipe" | "Valve" | "Pump";
    if (linkType === LinkType.Pipe || linkType === LinkType.CVPipe) {
      type = "Pipe";
    } else if (linkType === LinkType.Pump) {
      type = "Pump";
    } else {
      // PRV, PSV, PBV, FCV, TCV, GPV are all valves
      type = "Valve";
    }

    const result: LinkResult = {
      id: linkId,
      type,
      flow: model.getLinkValue(i, LinkProperty.Flow),
      velocity: model.getLinkValue(i, LinkProperty.Velocity),
      headloss: model.getLinkValue(i, LinkProperty.HeadLoss),
      status: model.getLinkValue(i, LinkProperty.Status),
    };

    results.push(result);
  }

  return results;
}

export {};
