"use client";

import { ChevronLeft, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  AssignedGisData,
  AttributeMapping,
  ModelSettings,
} from "@/lib/types";
import {
  EPANET_ELEMENTS,
  getGeoJSONProperties,
} from "@/lib/model-builder-constants";
import { DataTable } from "./data-table";

interface AttributeMappingStepProps {
  assignedGisData: AssignedGisData;
  attributeMapping: AttributeMapping;
  onAttributeMappingChange: (
    elementType: string,
    attribute: string,
    propertyName: string | null,
  ) => void;
  onPrevious: () => void;
  onBuildModel: () => void;
  modelSettings: ModelSettings;
}

export function AttributeMappingStep({
  assignedGisData,
  attributeMapping,
  onAttributeMappingChange,
  onPrevious,
  onBuildModel,
  modelSettings,
}: AttributeMappingStepProps) {
  const elementOrder = [
    "pipes",
    "tanks",
    "reservoirs",
    "nodes",
    "valves",
    "pumps",
  ];
  const assignedElements = elementOrder.filter(
    (key) => assignedGisData[key as keyof AssignedGisData],
  );
  const firstElementKey = assignedElements[0];

  if (assignedElements.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 dark:text-slate-400">
          No elements have been assigned. Please go back and assign files to
          elements.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onPrevious}
          className="flex items-center space-x-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back to Data Assignment</span>
        </button>

        <button
          onClick={onBuildModel}
          className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Build Model</span>
        </button>
      </div>

      {/* Attribute Mapping Interface */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
          Map Attributes
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Map the properties from your GIS data to EPANET attributes. Elevations
          and connectivity will be calculated automatically.
        </p>

        <Tabs defaultValue={firstElementKey} className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-6">
            {assignedElements.map((elementKey) => {
              const element = EPANET_ELEMENTS.find((e) => e.key === elementKey);
              const featureCount =
                assignedGisData[elementKey as keyof AssignedGisData]?.features
                  ?.length || 0;

              return (
                <TabsTrigger
                  key={elementKey}
                  value={elementKey}
                  className="text-xs sm:text-sm"
                >
                  {element?.name} ({featureCount})
                </TabsTrigger>
              );
            })}
          </TabsList>

          {assignedElements.map((elementKey) => {
            const element = EPANET_ELEMENTS.find((e) => e.key === elementKey);
            const geoJSON =
              assignedGisData[elementKey as keyof AssignedGisData];
            const availableProperties = geoJSON
              ? getGeoJSONProperties(geoJSON)
              : [];
            const elementMapping = attributeMapping[elementKey] || {};

            if (!element || !geoJSON) return null;

            return (
              <TabsContent
                key={elementKey}
                value={elementKey}
                className="space-y-6"
              >
                {/* Attribute Mapping Form */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                    {element.name} Attribute Mapping
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Required Attributes */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Recommended Attributes
                      </h4>
                      {element.requiredAttributes.map((attribute) => (
                        <div
                          key={attribute}
                          className="flex items-center space-x-3"
                        >
                          <label className="text-sm font-medium text-slate-900 dark:text-white w-20 flex-shrink-0">
                            {attribute}
                          </label>
                          <select
                            value={elementMapping[attribute] || ""}
                            onChange={(e) =>
                              onAttributeMappingChange(
                                elementKey,
                                attribute,
                                e.target.value || null,
                              )
                            }
                            className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select property...</option>
                            {availableProperties.map((prop) => (
                              <option key={prop} value={prop}>
                                {prop}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>

                    {/* Optional Attributes */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Optional Attributes
                      </h4>
                      {element.optionalAttributes.map((attribute) => (
                        <div
                          key={attribute}
                          className="flex items-center space-x-3"
                        >
                          <label className="text-sm font-medium text-slate-900 dark:text-white w-20 flex-shrink-0">
                            {attribute}
                          </label>
                          <select
                            value={elementMapping[attribute] || ""}
                            onChange={(e) =>
                              onAttributeMappingChange(
                                elementKey,
                                attribute,
                                e.target.value || null,
                              )
                            }
                            className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select property...</option>
                            {availableProperties.map((prop) => (
                              <option key={prop} value={prop}>
                                {prop}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Data Preview Table */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                    Data Preview
                  </h3>
                  <DataTable
                    geoJSON={geoJSON}
                    element={element}
                    attributeMapping={elementMapping}
                    modelSettings={modelSettings}
                  />
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
}
