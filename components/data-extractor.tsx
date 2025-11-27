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
    <div className="flex flex-col flex-grow">
      <h2 className="py-2 text-md font-semibold">
        Export Options
      </h2>

      <div className="space-y-6">
        {/* Export Format Selection */}
        <div className="space-y-2">
          <div className="flex flex-row gap-4 items-center">
            <label className="text-sm text-gray-500 text-nowrap">
              Export Format
            </label>
            <div className="relative flex-grow">
              <button
                type="button"
                onClick={() => setIsFormatDropdownOpen(!isFormatDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm border border-slate-300 rounded-md bg-white text-slate-900 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {formatOptions.find((opt) => opt.value === exportFormat)?.label}
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </button>
              {isFormatDropdownOpen && (
                <div className="absolute z-10 top-10 p-1 mt-1 bg-white border border-slate-300 rounded-md shadow-lg">
                  {formatOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onExportFormatChange(option.value as ExportFormat);
                        setIsFormatDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-900 hover:bg-purple-100 first:rounded-t-md last:rounded-b-md"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Include Results Checkbox */}
        <div className="space-y-2">
          <label className="flex gap-2 w-max cursor-pointer">
            <span className="text-sm text-gray-500">
              Include simulation results
              {!hasTimesteps && (
                <span className="block text-sm text-gray-400">
                  (Load file first)
                </span>
              )}
            </span>
            <input
              type="checkbox"
              checked={includeResults}
              onChange={(e) => onIncludeResultsChange(e.target.checked)}
              disabled={!hasTimesteps}
              className="h-4 w-4 mt-0.5 bg-purple-500 focus:ring-purple-500 border-slate-300 rounded disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            />
          </label>
        </div>

        {/* Conditional Results Options */}
        {includeResults && (
          <div className="space-y-4 pl-4 border-l-2 border-slate-200">
            {/* Time Selection */}
            <div className="flex gap-2 items-center">
              <label className="text-sm text-nowrap text-gray-500">
                Select timestep
              </label>
              <select
                value={selectedTime}
                onChange={(e) => onSelectedTimeChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {timestepOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Export All Timesteps Checkbox */}
            <div className="space-y-2">
              <label className="w-max flex items-center space-x-2 cursor-pointer">
                <span className="text-sm font-medium text-slate-700">
                  Export all timesteps as CSV
                </span>
                <input
                  type="checkbox"
                  checked={exportAllTimesteps}
                  onChange={(e) => onExportAllTimestepsChange(e.target.checked)}
                  className="h-4 w-4 bg-purple-500 focus:ring-purple-500 border-slate-300 rounded cursor-pointer"
                />
              </label>
              {exportAllTimesteps && (
                <p className="text-sm text-gray-500">
                  Results will be bundled in a ZIP file with separate CSV files
                  for nodes and links
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Download Button */}
      <div className="py-4 mt-auto">
        <button
          onClick={onDownload}
          disabled={!canDownload}
          className={`w-full flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium ${
            !canDownload
              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
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
