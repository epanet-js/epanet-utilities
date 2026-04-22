import type React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EPANET Transform",
  description: "Scale, translate, and rotate EPANET network files",
};

export default function TransformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
