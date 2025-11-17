"use client";

import * as React from "react";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectionInputSearch } from "@/components/projection-input-search";
import type { Projection, ProjectionInputMethod } from "@/lib/types";

interface ProjectionInputProps {
  value: Projection | null;
  onValueChange: (value: Projection | null) => void;
  label: string;
  placeholder?: string;
  defaultMethod?: ProjectionInputMethod;
  projections: Projection[];
  loading: boolean;
}

export function ProjectionInput({
  value,
  onValueChange,
  label,
  placeholder = "Search projections...",
  defaultMethod = "search",
  projections,
  loading,
}: ProjectionInputProps) {
  const [method, setMethod] =
    React.useState<ProjectionInputMethod>(defaultMethod);
  const [manualInput, setManualInput] = React.useState("");
  const [prjFile, setPrjFile] = React.useState<File | null>(null);

  const handlePRJUpload = async (file: File) => {
    try {
      const manualProjection: Projection = {
        id: "CUSTOM",
        name: "Custom Projection",
        code: await file.text(),
      };
      const content = await file.text();
      setPrjFile(file);
      setManualInput(content);
      onValueChange(manualProjection);
    } catch (error) {
      console.error("Failed to read PRJ file:", error);
    }
  };

  const clearPRJFile = () => {
    setPrjFile(null);
    setManualInput("");
    onValueChange(null);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label}
      </label>

      <Tabs
        value={method}
        onValueChange={(v) => setMethod(v as ProjectionInputMethod)}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="file">PRJ File</TabsTrigger>
          <TabsTrigger value="manual">Manual</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="mt-4">
          <ProjectionInputSearch
            value={value}
            onValueChange={onValueChange}
            placeholder={placeholder}
            projections={projections}
            loading={loading}
            onProjectionSelect={(projection) => {
              setPrjFile(null);
              setManualInput(projection.code);
            }}
          />
        </TabsContent>

        <TabsContent value="file" className="mt-4">
          <div className="space-y-4">
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                "border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30",
              )}
            >
              {!prjFile ? (
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-full">
                    <Upload className="h-6 w-6 text-gray-500 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                      Drop your PRJ file here
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                      or click to browse
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".prj"
                    className="hidden"
                    id="prj-upload"
                    onChange={(e) =>
                      e.target.files?.[0] && handlePRJUpload(e.target.files[0])
                    }
                  />
                  <label
                    htmlFor="prj-upload"
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-100 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors cursor-pointer"
                  >
                    Select PRJ File
                  </label>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">
                        {prjFile.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {(prjFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={clearPRJFile}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"
                  >
                    <X className="h-5 w-5 text-gray-500 dark:text-slate-400" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <div className="space-y-2">
            <textarea
              value={manualInput}
              onChange={(e) => {
                const manualProjection: Projection = {
                  id: "CUSTOM",
                  name: "Custom Projection",
                  code: e.target.value,
                };
                setPrjFile(null);
                setManualInput(e.target.value);
                onValueChange(manualProjection);
              }}
              placeholder="Enter proj4 string or WKT definition..."
              className="w-full h-32 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 placeholder-slate-500 dark:placeholder-slate-400"
            />
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Enter a valid proj4 string or WKT projection definition
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
