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
    <div className="flex flex-col flex-grow">
      <h2 className="py-2 text-md font-semibold">
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
          <div className="p-2 bg-gray-100 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              className="lucide lucide-arrow-down h-4 w-4 text-gray-500">
              <path d="M12 5v14"></path>
              <path d="m19 12-7 7-7-7"></path>
            </svg>
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

      <div className="py-4 mt-auto">
        <button
          onClick={onDownloadConverted}
          disabled={!canConvert || !sourceProjection || !targetProjection}
          className={`w-full flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium ${
            !canConvert || !sourceProjection || !targetProjection
              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          }`}
        >
          <Download className="h-4 w-4 mr-2" />
          Download Converted Model
        </button>
      </div>
    </div>
  );
}
