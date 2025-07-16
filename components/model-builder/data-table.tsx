"use client";

import type { FeatureCollection } from "geojson";
import type { EpanetElementDefinition, ModelSettings } from "@/lib/types";

import {
  getAttributeUnit,
  getDefaultPipeRoughness,
} from "@/lib/model-builder-constants";

interface DataTableProps {
  geoJSON: FeatureCollection;
  element: EpanetElementDefinition;
  attributeMapping: Record<string, string | null>;
  modelSettings: ModelSettings;
}

export function DataTable({
  geoJSON,
  element,
  attributeMapping,
  modelSettings,
}: DataTableProps) {
  const features = geoJSON.features.slice(0, 100); // Limit to first 100 features
  const allAttributes = [
    ...element.requiredAttributes,
    ...element.optionalAttributes,
  ];

  const getCellValue = (feature: any, attribute: string) => {
    const mappedProperty = attributeMapping[attribute];

    if (
      mappedProperty &&
      feature.properties &&
      feature.properties[mappedProperty] !== undefined
    ) {
      return feature.properties[mappedProperty];
    }

    // Special case: pipe roughness depends on headloss formula
    if (element.key === "pipes" && attribute === "Roughness") {
      return getDefaultPipeRoughness(modelSettings.headlossFormula);
    }

    // Return default value if no mapping or property not found
    return element.defaultValues[attribute] || "";
  };

  const isMapped = (attribute: string) => {
    return (
      attributeMapping[attribute] !== null &&
      attributeMapping[attribute] !== undefined
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <div className="overflow-x-auto max-h-96">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                #
              </th>
              {allAttributes.map((attribute) => {
                const unitLabel = getAttributeUnit(
                  attribute,
                  modelSettings.flowUnit,
                );
                return (
                  <th
                    key={attribute}
                    className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                  >
                    {attribute}
                    {unitLabel && ` (${unitLabel})`}
                    {element.requiredAttributes.includes(attribute) && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            {features.map((feature, index) => (
              <tr
                key={index}
                className="hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                  {index + 1}
                </td>
                {allAttributes.map((attribute) => {
                  const value = getCellValue(feature, attribute);
                  const mapped = isMapped(attribute);

                  return (
                    <td
                      key={attribute}
                      className={`px-4 py-3 text-sm ${
                        mapped
                          ? "text-slate-900 dark:text-white"
                          : "text-slate-400 dark:text-slate-500 italic"
                      }`}
                    >
                      {value !== null && value !== undefined
                        ? value.toString()
                        : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-600">
        {features.length === 100 && geoJSON.features.length > 100 && (
          <p>Showing first 100 of {geoJSON.features.length} features</p>
        )}
        {features.length < 100 && <p>Showing all {features.length} features</p>}
        <p className="mt-1">
          <span className="font-medium">Legend:</span> Normal text = mapped
          data, <span className="italic">italic text = default values</span>
        </p>
      </div>
    </div>
  );
}
