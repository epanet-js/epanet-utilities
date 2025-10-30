import type React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EPANET Data Extractor",
  description:
    "Convert EPANET INP files to GIS formats (GeoJSON/Shapefile) with optional simulation results",
};

export default function DataExtractorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
