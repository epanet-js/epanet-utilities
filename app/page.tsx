import type React from "react";
import Link from "next/link";
import {
  ExternalLink,
  ArrowRight,
  Globe,
  Flame,
  Database,
} from "lucide-react";
import { Layers } from "lucide-react";

// Utility types
type UtilityType = "internal" | "external";

interface Utility {
  id: string;
  title: string;
  description: string;
  link: string;
  type: UtilityType;
  icon: React.ReactNode;
  color: string;
}

// List of utilities with icons and colors
const utilities: Utility[] = [
  {
    id: "projection-converter",
    title: "Projection Converter",
    description:
      "Convert EPANET network files between different coordinate systems with ease.",
    link: "/projection-converter",
    type: "internal",
    icon: <Globe className="h-6 w-6" />,
    color: "from-blue-500 to-cyan-500",
  },
  {
   id: "data-extractor",
   title: "EPANET Data Extractor",
   description:
     "Convert EPANET INP files to GIS formats (GeoJSON/Shapefile) with optional simulation results.",
   link: "/data-extractor",
   type: "internal",
   icon: <Database className="h-6 w-6" />,
   color: "from-orange-500 to-amber-500",
  },
  {
   id: "fire-flow",
   title: "Fire flow",
   description:
     "Fireflow is the amount of water available in a water distribution system for firefighting.",
   link: "/fire-flwo",
   type: "internal",
   icon: <Flame className="h-6 w-6" />,
   color: "from-orange-500 to-amber-500",
  },
  //
  //{
  //  id: "model-builder",
  //  title: "Model Builder",
  //  description: "Build an EPANET model from GIS data.",
  //  link: "/model-builder",
  //  type: "internal",
  //  icon: <Blocks className="h-6 w-6" />,
  //  color: "from-green-500 to-cyan-500",
  //},
  // Example utility cards below
  // {
  //   id: "epanet-model-viewer",
  //   title: "epanet-js",
  //   description:
  //     "The EPANET you know — but modern, enhanced, and entirely in your browser.",
  //   link: "https://epanetjs.com",
  //   type: "external",
  //   icon: <Layers className="h-6 w-6" />,
  //   color: "from-emerald-500 to-teal-500",
  // },
  // {
  //   id: "epanet-js",
  //   title: "epanet-js Toolkit",
  //   description:
  //     "JavaScript library for EPANET hydraulic simulations in the browser.",
  //   link: "https://github.com/modelcreate/epanet-js",
  //   type: "external",
  //   icon: <Code className="h-6 w-6" />,
  //   color: "from-purple-500 to-indigo-500",
  // },
  // Example utility cards below
  //{
  //  id: "epanet-model-viewer",
  //  title: "EPANET Model Viewer",
  //  description:
  //    "Visualize and explore EPANET models in 3D directly in your browser.",
  //  link: "https://github.com/modelcreate/epanet-model-viewer",
  //  type: "external",
  //  icon: <Layers className="h-6 w-6" />,
  //  color: "from-emerald-500 to-teal-500",
  //},
  //{
  //  id: "epanet-model-builder",
  //  title: "EPANET Model Builder",
  //  description:
  //    "Create and edit EPANET models with a user-friendly interface.",
  //  link: "/utilities/model-builder",
  //  type: "internal",
  //  icon: <Activity className="h-6 w-6" />,
  //  color: "from-orange-500 to-amber-500",
  //},
  //{
  //  id: "epanet-file-validator",
  //  title: "EPANET File Validator",
  //  description: "Validate your EPANET INP files and check for common errors.",
  //  link: "/utilities/file-validator",
  //  type: "internal",
  //  icon: <FileCheck className="h-6 w-6" />,
  //  color: "from-red-500 to-rose-500",
  //},
  //{
  //  id: "epanet-unit-converter",
  //  title: "EPANET Unit Converter",
  //  description: "Convert between different units used in EPANET models.",
  //  link: "/utilities/unit-converter",
  //  type: "internal",
  //  icon: <Calculator className="h-6 w-6" />,
  //  color: "from-violet-500 to-fuchsia-500",
  //},
];

export default function Home() {
  return (
    <main>
      <div className="container mx-auto px-4 py-16">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_-40%,rgba(147,197,253,0.3),transparent_47%),radial-gradient(circle_at_80%_-41%,rgba(216,180,254,0.35),transparent_54%)]"></div>
        <header className="mb-16 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
            EPANET Utilities
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-8">
            A collection of tools to help you work with EPANET files and models
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {utilities.map((utility) => (
            <UtilityCard key={utility.id} utility={utility} />
          ))}
        </div>
      </div>
    </main>
  );
}

function UtilityCard({ utility }: { utility: Utility }) {
  const isExternal = utility.type === "external";

  const cardContent = (
    <div className="utl-card h-full bg-white dark:bg-slate-800 rounded-xl shadow-sm transition-all">
      <div className="p-6">
        <div className="flex items-center flex-wrap mb-4 gap-2">
          <div className="text-slate-600">
            {utility.icon}
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {utility.title}
          </h2>
        </div>
        <p className="text-slate-600 dark:text-slate-300 mb-4 md:min-h-[3rem]">
          {utility.description}
        </p>
        <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium">
          {isExternal ? (
            <>
              Visit Resource
              <ExternalLink className="h-4 w-4 ml-2" />
            </>
          ) : (
            <>
              Open {utility.title}
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (isExternal) {
    return (
      <a
        href={utility.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full"
      >
        {cardContent}
      </a>
    );
  }

  return (
    <Link href={utility.link} className="block h-full">
      {cardContent}
    </Link>
  );
}
