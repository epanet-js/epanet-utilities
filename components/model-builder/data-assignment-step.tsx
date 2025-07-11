"use client";

import { ChevronRight } from "lucide-react";
import type {
  UploadedFile,
  AssignedGisData,
  EpanetElementType,
  Projection,
} from "@/lib/types";
import { EPANET_ELEMENTS } from "@/lib/model-builder-constants";
import { MultiFileDropzone } from "./multi-file-dropzone";
import { ElementAssignmentCard } from "./element-assignment-card";
import { ModelBuilderMap } from "./model-builder-map";
import { ProjectionInputSearch } from "@/components/projection-input-search";

interface DataAssignmentStepProps {
  uploadedFiles: UploadedFile[];
  assignedGisData: AssignedGisData;
  onFilesUploaded: (files: UploadedFile[]) => void;
  onFileAssignment: (
    file: UploadedFile,
    elementType: EpanetElementType,
  ) => void;
  onFileUnassignment: (elementType: EpanetElementType) => void;
  onNext: () => void;
  projections: Projection[];
  loadingProjections: boolean;
  selectedProjection: Projection | null;
  onProjectionSelect: (projection: Projection | null) => void;
  needsReprojection: boolean;
}

export function DataAssignmentStep({
  uploadedFiles,
  assignedGisData,
  onFilesUploaded,
  onFileAssignment,
  onFileUnassignment,
  onNext,
  projections,
  loadingProjections,
  selectedProjection,
  onProjectionSelect,
  needsReprojection,
}: DataAssignmentStepProps) {
  const hasAssignedFiles = Object.keys(assignedGisData).length > 0;

  return (
    <div className="space-y-8">
      {/* Top Section - Upload and Preview Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* File Upload Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 h-[450px] flex flex-col">
          <div className="flex-1 min-h-0">
            <MultiFileDropzone
              onFilesLoaded={onFilesUploaded}
              uploadedFiles={uploadedFiles}
              compact={uploadedFiles.length > 0}
            />
          </div>

          {/* Projection Input - Show when files are uploaded and reprojection is needed */}
          {(uploadedFiles.length > 0 || hasAssignedFiles) &&
            needsReprojection && (
              <div className="flex-shrink-0 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                      Projection Required
                    </h3>
                    {selectedProjection && (
                      <div className="text-xs text-green-600 dark:text-green-400">
                        ✓ Selected
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Your data appears to be in a projected coordinate system.
                    Select the projection to display it correctly.
                  </p>
                  <div className="mt-2">
                    <ProjectionInputSearch
                      value={selectedProjection}
                      onValueChange={onProjectionSelect}
                      placeholder="Search for projection..."
                      projections={projections}
                      loading={loadingProjections}
                    />
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* Network Preview Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 h-[450px]">
          <ModelBuilderMap
            assignedGisData={assignedGisData}
            selectedProjection={selectedProjection}
          />
        </div>
      </div>

      {/* Bottom Section - Element Assignment Grid */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Assign Files to Elements
          </h2>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {Object.keys(assignedGisData).length} of {EPANET_ELEMENTS.length}{" "}
            elements assigned
          </div>
        </div>

        {/* Responsive Grid - 3 columns on large screens, 2 on medium, 1 on small */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {EPANET_ELEMENTS.map((element) => {
            const assignedFile = assignedGisData[element.key]
              ? {
                  // Create a simplified UploadedFile representation
                  id: `assigned_${element.key}`,
                  name: `${element.name} Data`,
                  geometryType:
                    assignedGisData[element.key]?.features[0]?.geometry?.type ||
                    "Unknown",
                  featureCount:
                    assignedGisData[element.key]?.features?.length || 0,
                  file: null as any,
                  geoJSON: assignedGisData[element.key]!,
                }
              : null;

            return (
              <ElementAssignmentCard
                key={element.key}
                elementType={element.key}
                elementName={element.name}
                assignedFile={assignedFile}
                uploadedFiles={uploadedFiles}
                onAssign={onFileAssignment}
                onUnassign={onFileUnassignment}
                validGeometryTypes={element.geometryTypes}
              />
            );
          })}
        </div>

        {/* Next Button */}
        <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex flex-col items-end space-y-2">
            {needsReprojection && !selectedProjection && hasAssignedFiles && (
              <div className="text-sm text-amber-600 dark:text-amber-400">
                ⚠️ Projection required to continue
              </div>
            )}
            <button
              onClick={onNext}
              disabled={
                !hasAssignedFiles || (needsReprojection && !selectedProjection)
              }
              className={`
                flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors
                ${
                  hasAssignedFiles && (!needsReprojection || selectedProjection)
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                }
              `}
            >
              <span>Next: Map Attributes</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
