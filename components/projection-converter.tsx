"use client";

import { ArrowDown, Download } from "lucide-react";
import { ProjectionInput } from "./projection-input";
import type { Projection } from "@/lib/types";

interface ProjectionConverterProps {
  sourceProjection: Projection | null;
  targetProjection: Projection | null;
  onSourceChange: (projection: Projection | null) => void;
  onTargetChange: (projection: Projection | null) => void;
  onDownloadConverted: () => void;
  canConvert: boolean;
  projections: Projection[];
  loadingProjections: boolean;
}

export function ProjectionConverter({
  sourceProjection,
  targetProjection,
  onSourceChange,
  onTargetChange,
  onDownloadConverted,
  canConvert,
  projections,
  loadingProjections,
}: ProjectionConverterProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
        Projection Settings
      </h2>

      <div className="space-y-6">
        <ProjectionInput
          value={sourceProjection}
          onValueChange={onSourceChange}
          label="Source Projection"
          placeholder="Search source projection..."
          defaultMethod="search"
          projections={projections}
          loading={loadingProjections}
        />

        <div className="flex justify-center">
          <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full">
            <ArrowDown className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          </div>
        </div>

        <ProjectionInput
          value={targetProjection}
          onValueChange={onTargetChange}
          label="Target Projection"
          placeholder="Search target projection..."
          defaultMethod="search"
          projections={projections}
          loading={loadingProjections}
        />
      </div>

      <div className="pt-4">
        <button
          onClick={onDownloadConverted}
          disabled={!canConvert || !sourceProjection || !targetProjection}
          className={`w-full flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium text-white ${
            !canConvert || !sourceProjection || !targetProjection
              ? "bg-slate-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          }`}
        >
          <Download className="h-4 w-4 mr-2" />
          Download Converted Model
        </button>
      </div>
    </div>
  );
}
