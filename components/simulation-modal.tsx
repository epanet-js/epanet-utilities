"use client";

import { Modal } from "@/components/ui/modal";

interface SimulationModalProps {
  open: boolean;
  currentStep?: number;
  totalSteps?: number;
  message?: string;
  mode?: "simulation" | "export";
}

export function SimulationModal({
  open,
  currentStep,
  totalSteps,
  message,
  mode = "simulation",
}: SimulationModalProps) {
  const isExport = mode === "export";
  const safeTotal = typeof totalSteps === "number" ? totalSteps : 0;
  const safeCurrent = typeof currentStep === "number" ? currentStep : 0;
  const progress =
    !isExport && safeTotal > 0 ? (safeCurrent / safeTotal) * 100 : 0;

  return (
    <Modal
      open={open}
      onOpenChange={() => {}} // Prevent closing during simulation
      showCloseButton={false}
      title={isExport ? "Preparing Download" : "Running Simulation"}
    >
      {isExport ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-slate-300">
            {message || "Generating export… please wait."}
          </p>

          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-purple-500 h-full animate-pulse"
              style={{ width: "40%" }}
            />
          </div>

          <p className="text-xs text-gray-500 dark:text-slate-400 text-center">
            This may take several seconds depending on file size.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-slate-300">
            {message}
          </p>

          {/* Progress indicator */}
          <div className="space-y-2">
            <div className="flex justify-end text-sm text-gray-500 dark:text-slate-400">
              <span>{Math.round(progress)}%</span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-purple-500 h-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <p className="text-sm text-gray-500 dark:text-slate-400 text-center">
            Please wait while the simulation completes...
          </p>
        </div>
      )}
    </Modal>
  );
}
