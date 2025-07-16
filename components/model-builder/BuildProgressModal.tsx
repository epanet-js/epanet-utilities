"use client";

import React from "react";
import { Check, Circle, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";

export type ProgressStatus = "pending" | "inProgress" | "completed";

export interface ProgressStep {
  name: string;
  status: ProgressStatus;
}

interface BuildProgressModalProps {
  open: boolean;
  progressSteps: ProgressStep[];
  error?: string | null;
  onDownload?: () => void;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export const BuildProgressModal: React.FC<BuildProgressModalProps> = ({
  open,
  progressSteps,
  error,
  onDownload,
  onClose,
  showCloseButton = true,
}) => {
  const allCompleted =
    progressSteps.length > 0 &&
    progressSteps.every((step: ProgressStep) => step.status === "completed");

  return (
    <Modal
      open={open}
      onOpenChange={onClose}
      title="Building EPANET Model"
      showCloseButton={showCloseButton}
    >
      <div className="space-y-4">
        {/* Progress List */}
        <ul className="space-y-2">
          {progressSteps.map((step: ProgressStep) => {
            let icon = <Circle className="h-4 w-4 text-slate-400" />;
            let textClass = "text-slate-500";

            if (step.status === "completed") {
              icon = <Check className="h-4 w-4 text-green-600" />;
              textClass = "text-slate-700 dark:text-slate-300";
            } else if (step.status === "inProgress") {
              icon = <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
              textClass = "font-medium text-slate-900 dark:text-white";
            } else if (step.status === "pending") {
              icon = <Circle className="h-4 w-4 text-slate-400" />;
              textClass = "text-slate-400";
            }

            return (
              <li key={step.name} className="flex items-center space-x-3">
                {icon}
                <span className={`text-sm ${textClass}`}>{step.name}</span>
              </li>
            );
          })}
        </ul>

        {/* Error */}
        {error && (
          <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
        )}

        {/* Download Button */}
        {allCompleted && onDownload && (
          <button
            onClick={onDownload}
            className="mt-4 w-full rounded-md bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700"
          >
            Download INP File
          </button>
        )}
      </div>
    </Modal>
  );
};
