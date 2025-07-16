"use client";

import { ChevronRight } from "lucide-react";
import type { ModelSettings, FlowUnit, HeadlossFormula } from "@/lib/types";
import {
  FLOW_UNITS_US,
  FLOW_UNITS_METRIC,
} from "@/lib/model-builder-constants";

interface ModelSettingsStepProps {
  settings: ModelSettings;
  onSettingsChange: (settings: ModelSettings) => void;
  onNext: () => void;
}

export function ModelSettingsStep({
  settings,
  onSettingsChange,
  onNext,
}: ModelSettingsStepProps) {
  const handleFlowUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSettingsChange({ ...settings, flowUnit: e.target.value as FlowUnit });
  };

  const handleHeadlossChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSettingsChange({
      ...settings,
      headlossFormula: e.target.value as HeadlossFormula,
    });
  };

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 space-y-6 max-w-xl mx-auto">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          Model Settings
        </h2>

        {/* Flow Units */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Flow Units
          </label>
          <select
            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={settings.flowUnit}
            onChange={handleFlowUnitChange}
          >
            <optgroup label="US Units">
              {FLOW_UNITS_US.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </optgroup>
            <optgroup label="Metric Units">
              {FLOW_UNITS_METRIC.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Headloss Formula */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Headloss Formula
          </label>
          <select
            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={settings.headlossFormula}
            onChange={handleHeadlossChange}
          >
            <option value="Hazen-Williams">Hazen-Williams</option>
            <option value="Darcy-Weisbach">Darcy-Weisbach</option>
            <option value="Chezy-Manning">Chezy-Manning</option>
          </select>
        </div>
      </div>

      {/* Next Button */}
      <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={onNext}
          className="flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors bg-blue-600 hover:bg-blue-700 text-white"
        >
          <span>Next: Assign Data</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
