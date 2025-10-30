"use client";

import { Download, ChevronDown } from "lucide-react";
import { useState } from "react";

type ExportFormat = "geojson" | "shapefile";

interface DataExtractorProps {
  exportFormat: ExportFormat;
  onExportFormatChange: (format: ExportFormat) => void;
  includeResults: boolean;
  onIncludeResultsChange: (include: boolean) => void;
  selectedTime: string;
  onSelectedTimeChange: (time: string) => void;
  exportAllTimesteps: boolean;
  onExportAllTimestepsChange: (shouldExport: boolean) => void;
  onDownload: () => void;
  canDownload: boolean;
  timestepOptions: { value: number; label: string }[];
}

export function DataExtractor({
  exportFormat,
  onExportFormatChange,
  includeResults,
  onIncludeResultsChange,
  selectedTime,
  onSelectedTimeChange,
  exportAllTimesteps,
  onExportAllTimestepsChange,
  onDownload,
  canDownload,
  timestepOptions,
}: DataExtractorProps) {
  const [isFormatDropdownOpen, setIsFormatDropdownOpen] = useState(false);

  const formatOptions = [
    { value: "geojson", label: "GeoJSON" },
    { value: "shapefile", label: "Shapefile" },
  ];

  const hasTimesteps = timestepOptions.length > 0;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
        Export Options
      </h2>

      <div className="space-y-6">
        {/* Export Format Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Export Format
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFormatDropdownOpen(!isFormatDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span>
                {formatOptions.find((opt) => opt.value === exportFormat)?.label}
              </span>
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </button>

            {isFormatDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-lg">
                {formatOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onExportFormatChange(option.value as ExportFormat);
                      setIsFormatDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600 first:rounded-t-md last:rounded-b-md"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Include Results Checkbox */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={includeResults}
              onChange={(e) => onIncludeResultsChange(e.target.checked)}
              disabled={!hasTimesteps}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Include simulation results
              {!hasTimesteps && (
                <span className="text-xs text-slate-500 ml-2">
                  (Load file first)
                </span>
              )}
            </span>
          </label>
        </div>

        {/* Conditional Results Options */}
        {includeResults && (
          <div className="space-y-4 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
            {/* Time Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Select timestep
              </label>
              <select
                value={selectedTime}
                onChange={(e) => onSelectedTimeChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select timestep...</option>
                {timestepOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Export All Timesteps Checkbox */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={exportAllTimesteps}
                  onChange={(e) => onExportAllTimestepsChange(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 rounded"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Export all timesteps as CSV
                </span>
              </label>
              {exportAllTimesteps && (
                <p className="text-xs text-slate-500 dark:text-slate-400 ml-6">
                  Results will be bundled in a ZIP file with separate CSV files
                  for nodes and links
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Download Button */}
      <div className="pt-4">
        <button
          onClick={onDownload}
          disabled={!canDownload}
          className={`w-full flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium text-white ${
            !canDownload
              ? "bg-slate-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          }`}
        >
          <Download className="h-4 w-4 mr-2" />
          {exportFormat === "geojson"
            ? "Download GeoJSON"
            : "Download Shapefile"}
        </button>
      </div>
    </div>
  );
}
