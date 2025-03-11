"use client";

import type React from "react";

import { useState } from "react";
import { Upload, FileText, AlertCircle, X } from "lucide-react";

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
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
        Upload EPANET File
      </h2>

      {!file ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-full">
              <Upload className="h-6 w-6 text-slate-500 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Drag and drop your INP file here
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
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
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
            >
              Select File
            </label>
          </div>
        </div>
      ) : (
        <div className="flex items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {file.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {(file.size / 1024).toFixed(2)} KB
            </p>
          </div>
          <button
            onClick={clearFile}
            className="ml-4 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"
            aria-label="Remove file"
          >
            <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center text-red-600 dark:text-red-400 text-sm mt-2">
          <AlertCircle className="h-4 w-4 mr-1" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
