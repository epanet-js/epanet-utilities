/* eslint-disable no-restricted-globals */
// Model Builder Web Worker

export interface ProgressMessage {
  type: "progress";
  task: string;
}

export interface CompleteMessage {
  type: "complete";
  task: string;
  inpFile: string;
}

export interface ErrorMessage {
  type: "error";
  message: string;
}

export type WorkerResponse = ProgressMessage | CompleteMessage | ErrorMessage;

// Simulate asynchronous work for each task
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

self.addEventListener("message", async (event: MessageEvent) => {
  const _config = event.data; // Currently unused in simulation

  const tasks = [
    "Reading Build Config",
    "Validating Data",
    "Converting MultiString Geometry",
    "Simplifying Crossings",
    "Building Network Graph",
    "Calculating Connectivity",
    "Assigning Elevations",
    "Generating INP File",
    "Finished Build",
  ];

  try {
    for (const task of tasks) {
      // Send progress update
      postMessage({ type: "progress", task } satisfies ProgressMessage);

      // Simulate task taking between 1–3 seconds
      await sleep(250 + Math.random() * 500);
    }

    // Dummy INP content after successful build
    const dummyInp = `; EPANET INP file (dummy)\n[VERSION]\n 2.2\n`;

    postMessage({
      type: "complete",
      task: "Finished Build",
      inpFile: dummyInp,
    } satisfies CompleteMessage);
  } catch (err) {
    postMessage({
      type: "error",
      message:
        err instanceof Error
          ? err.message
          : "The build process failed unexpectedly.",
    } satisfies ErrorMessage);
  }
});

export {}; // Ensure this file is treated as a module
