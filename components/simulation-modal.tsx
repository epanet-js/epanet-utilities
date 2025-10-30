"use client";

import { Modal } from "@/components/ui/modal";

interface SimulationModalProps {
  open: boolean;
  currentStep: number;
  totalSteps: number;
  message: string;
}

export function SimulationModal({
  open,
  currentStep,
  totalSteps,
  message,
}: SimulationModalProps) {
  const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

  return (
    <Modal
      open={open}
      onOpenChange={() => {}} // Prevent closing during simulation
      showCloseButton={false}
      title="Running Simulation"
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>

        {/* Progress indicator */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Step {currentStep} of {totalSteps}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Please wait while the simulation completes...
        </p>
      </div>
    </Modal>
  );
}
