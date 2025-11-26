"use client";

import type React from "react";

import { useState } from "react";
import { Upload, FileText, X } from "lucide-react";

interface FileUploaderProps {
  onFileLoaded: (file: File | null) => void;
}

export function FileUploader({ onFileLoaded }: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    validateAndSetFile(droppedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setError(null);

    if (!file.name.toLowerCase().endsWith(".inp")) {
      setError("Please upload an EPANET .inp file");
      setFile(null);
      onFileLoaded(null);
      return;
    }

    setFile(file);
    onFileLoaded(file);
  };

  const clearFile = () => {
    setFile(null);
    setError(null);
    onFileLoaded(null);
  };

  return (
    <div className="space-y-2">
      <h2 className="py-2 text-md font-semibold">Load an EPANET File</h2>

      {!file ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? "border-purple-500 bg-purple-50"
              : "border-gray-300 hover:bg-gray-50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center space-y-3">
            <div
              className={`p-3 rounded-full
              ${isDragging ? "bg-purple-100" : "bg-gray-100"}`}
            >
              <Upload
                className={`h-6 w-6 ${
                  isDragging ? "text-purple-500" : "text-gray-500"
                }`}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                Drag and drop your INP file here
              </p>
              <p className="text-xs text-gray-500 mt-1">
                or click to browse files
              </p>
            </div>
            <input
              type="file"
              accept=".inp"
              className="hidden"
              id="file-upload"
              onChange={handleFileChange}
            />
            <label
              htmlFor="file-upload"
              className="px-4 py-2 text-sm font-medium bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors cursor-pointer"
            >
              Select File
            </label>
          </div>
        </div>
      ) : (
        <div className="flex items-start p-3 border border-blue-300 bg-blue-50 rounded-md">
          <FileText className="h-4 w-4 text-blue-600 mr-2" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-gray-500">
              {(file.size / 1024).toFixed(2)} KB
            </p>
          </div>
          <button
            onClick={clearFile}
            className="ml-4 hover:bg-slate-300 rounded-full"
            aria-label="Remove file"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 mt-2 border border-red-200 rounded-md bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
