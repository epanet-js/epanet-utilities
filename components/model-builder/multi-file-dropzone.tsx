"use client";

import React, { useState, useEffect } from "react";
import { Upload, FileText, AlertCircle, X, ChevronDown } from "lucide-react";
import type {
  UploadedFile,
  AssignedGisData,
  EpanetElementType,
} from "@/lib/types";
import { getValidGeometryType } from "@/lib/model-builder-constants";
import {
  EPANET_ELEMENTS,
  ELEMENT_COLORS,
  isValidGeometryForElement,
} from "@/lib/model-builder-constants";

interface MultiFileDropzoneProps {
  onFilesLoaded: (files: UploadedFile[]) => void;
  uploadedFiles: UploadedFile[];
  assignedGisData: AssignedGisData;
  onFileAssignment: (
    file: UploadedFile,
    elementType: EpanetElementType,
  ) => void;
  onFileUnassignment: (elementType: EpanetElementType) => void;
}

export function MultiFileDropzone({
  onFilesLoaded,
  uploadedFiles,
  assignedGisData,
  onFileAssignment,
  onFileUnassignment,
}: MultiFileDropzoneProps) {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Keep track of filenames for assigned elements so we can display them
  const [assignedFileNames, setAssignedFileNames] = useState<
    Record<string, string>
  >({});

  // Global drop handlers so files can be dropped anywhere on the page
  useEffect(() => {
    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length > 0) {
        processFiles(files);
      }
    };

    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("drop", handleWindowDrop);

    return () => {
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("drop", handleWindowDrop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      processFiles(files);
    }
  };

  const processFiles = async (files: File[]) => {
    setError(null);
    setIsProcessing(true);

    const validFiles: UploadedFile[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        // Check file extension
        const isGeoJSON =
          file.name.toLowerCase().endsWith(".geojson") ||
          file.name.toLowerCase().endsWith(".json");

        if (!isGeoJSON) {
          errors.push(`${file.name}: Only GeoJSON files are supported`);
          continue;
        }

        // Read and parse the file
        const content = await file.text();
        const geoJSON = JSON.parse(content);

        // Validate GeoJSON structure
        if (
          !geoJSON ||
          geoJSON.type !== "FeatureCollection" ||
          !Array.isArray(geoJSON.features)
        ) {
          errors.push(`${file.name}: Invalid GeoJSON structure`);
          continue;
        }

        if (geoJSON.features.length === 0) {
          errors.push(`${file.name}: No features found`);
          continue;
        }

        // Create UploadedFile object
        const uploadedFile: UploadedFile = {
          id: `${file.name}_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          file,
          geoJSON,
          name: file.name,
          geometryType: getValidGeometryType(geoJSON),
          featureCount: geoJSON.features.length,
        };

        validFiles.push(uploadedFile);
      } catch (err) {
        errors.push(
          `${file.name}: Failed to parse file - ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        );
      }
    }

    setIsProcessing(false);

    if (errors.length > 0) {
      setError(errors.join("; "));
    }

    if (validFiles.length > 0) {
      onFilesLoaded([...uploadedFiles, ...validFiles]);
    }
  };

  const removeFile = (fileId: string) => {
    const updatedFiles = uploadedFiles.filter((f) => f.id !== fileId);
    onFilesLoaded(updatedFiles);
  };

  const handleAssignFile = (fileId: string, elementType: EpanetElementType) => {
    if (!elementType) return;

    const fileToAssign = uploadedFiles.find((f) => f.id === fileId);
    if (fileToAssign) {
      onFileAssignment(fileToAssign, elementType);

      // Track filename for display in assigned list
      setAssignedFileNames((prev) => ({
        ...prev,
        [elementType]: fileToAssign.name,
      }));
    }
  };

  const assignedElements = Object.keys(assignedGisData);

  // Decide when to show the initial large drop area (no files yet)
  const showInitialDropZone =
    assignedElements.length === 0 && uploadedFiles.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* File Upload Area / Drop Zone */}
      {showInitialDropZone ? (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors flex-shrink-0 ${
            isDragging
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
              processFiles(files);
            }
          }}
        >
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-full">
              <Upload className="h-6 w-6 text-slate-500 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Drag and drop GeoJSON files here
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                or click to browse files (supports multiple files)
              </p>
            </div>
            <input
              type="file"
              accept=".geojson,.json"
              multiple
              className="hidden"
              id="multi-file-upload"
              onChange={handleFileChange}
              disabled={isProcessing}
            />
            <label
              htmlFor="multi-file-upload"
              className={`px-4 py-2 text-sm font-medium text-white rounded-md cursor-pointer transition-colors ${
                isProcessing
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              }`}
            >
              {isProcessing ? "Processing..." : "Select Files"}
            </label>
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 mb-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
            Load & Assign GIS Files
          </h2>
          <input
            type="file"
            accept=".geojson,.json"
            multiple
            className="hidden"
            id="multi-file-upload"
            onChange={handleFileChange}
            disabled={isProcessing}
          />
          <label
            htmlFor="multi-file-upload"
            className={`w-full text-center px-4 py-2 text-sm font-medium text-white rounded-md cursor-pointer transition-colors flex items-center justify-center space-x-2 ${
              isProcessing
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            <Upload className="h-4 w-4" />
            <span>
              {isProcessing ? "Processing..." : "Add / Replace GeoJSON Files"}
            </span>
          </label>
          {error && (
            <div className="flex items-center text-red-600 dark:text-red-400 text-sm mt-3">
              <AlertCircle className="h-4 w-4 mr-1" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* Assigned and Unassigned Files */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
        {/* Assigned Files Section */}
        {assignedElements.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Assigned Files ({assignedElements.length})
            </h3>
            <div className="space-y-2">
              {assignedElements.map((type) => {
                const elementType = type as EpanetElementType;
                const element = EPANET_ELEMENTS.find(
                  (e) => e.key === elementType,
                );
                const geoJSON = assignedGisData[elementType];
                if (!element || !geoJSON) return null;

                const elementColor = ELEMENT_COLORS[elementType] || "#3b82f6";

                return (
                  <div
                    key={elementType}
                    className="flex items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800"
                  >
                    <div
                      className="w-3 h-3 rounded-full mr-3 flex-shrink-0"
                      style={{ backgroundColor: elementColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {element.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {assignedFileNames[elementType] || "(unknown filename)"}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {geoJSON.features[0]?.geometry?.type} •{" "}
                        {geoJSON.features.length} features
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onFileUnassignment(elementType);
                        setAssignedFileNames((prev) => {
                          const { [elementType]: _removed, ...rest } = prev;
                          return rest;
                        });
                      }}
                      className="ml-4 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full flex-shrink-0"
                      aria-label="Unassign file"
                    >
                      <X className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Unassigned Files Section */}
        {uploadedFiles.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Unassigned Files ({uploadedFiles.length})
            </h3>
            <div className="space-y-2">
              {uploadedFiles.map((file) => {
                const availableElements = EPANET_ELEMENTS.filter(
                  (e) =>
                    !assignedGisData[e.key] &&
                    isValidGeometryForElement(file.geometryType, e.key),
                );

                return (
                  <div
                    key={file.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800 rounded-md"
                  >
                    <div className="flex items-start space-x-3">
                      <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                          {file.geometryType} • {file.featureCount} features
                        </p>
                        {/* Assignment Selector */}
                        <div className="relative">
                          <select
                            value=""
                            onChange={(e) =>
                              handleAssignFile(
                                file.id,
                                e.target.value as EpanetElementType,
                              )
                            }
                            disabled={availableElements.length === 0}
                            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="" disabled>
                              Assign to element...
                            </option>
                            {availableElements.map((element) => (
                              <option key={element.key} value={element.key}>
                                {element.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                        {availableElements.length === 0 && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            No compatible, unassigned elements.
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeFile(file.id)}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full flex-shrink-0"
                        aria-label="Remove file"
                      >
                        <X className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
