import type React from "react";
import Link from "next/link";
import {
  ExternalLink,
  ArrowRight,
  Globe,
  Flame,
  Database,
  AudioLines,
} from "lucide-react";
import { Layers } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Footer } from "@/components/footer";

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
    title: "Fire flow analysis",
    description:
      "Calculate the fire flow available in all nodes of a water distribution system.",
    link: "/fire-flow",
    type: "internal",
    icon: <Flame className="h-6 w-6" />,
    color: "from-orange-500 to-amber-500",
  },
  {
    id: "acoustic-deployment",
    title: "Acoustic Deployment",
    description:
      "Test the coverage, and optimize the deployment of acoustic logger in a water distribution system.",
    link: "/fire-flow",
    type: "internal",
    icon: <AudioLines className="h-6 w-6" />,
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
    <>
      <AppHeader />
      <main>
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_-40%,rgba(147,197,253,.5),transparent_47%),radial-gradient(circle_at_80%_-41%,rgba(216,180,254,.5),transparent_54%)]"></div>
        <section className="relative z-20">
          <div className="container max-w-5xl mx-auto px-4 py-16">
            <div className="text-center">
              <h1 className="text-5xl font-bold tracking-tight text-slate-900 mb-4">
                EPANET Utilities
              </h1>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-20">
                A collection of tools to help you work with EPANET models
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto mb-8">
              {utilities.map((utility) => (
                <UtilityCard key={utility.id} utility={utility} />
              ))}
            </div>
          </div>
        </section>
        <section>
          <div className="bg-[linear-gradient(to_bottom,#303139,#313547)] p-8 text-center text-white">
            <div className="container mx-auto px-4 py-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4 text-center">
                Model water networks instantly
              </h2>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                No setup or downloads &mdash; just instant access right in your
                browser.
              </p>
              <div className="shadow-color">
                <picture className="block my-8">
                  <img
                    src="screenshot.webp"
                    alt="Screenshot of EPANET JS app"
                    className="mx-auto lg:max-w-3xl xl:max-w-5xl"
                  />
                </picture>
              </div>
              <a
                href="https://app.epanetjs.com"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 text-white hover:bg-primary/90 h-11 rounded-md px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Start modeling now
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-arrow-right ml-2 h-4 w-4"
                >
                  <path d="M5 12h14"></path>
                  <path d="m12 5 7 7-7 7"></path>
                </svg>
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function UtilityCard({ utility }: { utility: Utility }) {
  const isExternal = utility.type === "external";

  const cardContent = (
    <div
      className="
    h-full bg-white rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-lg hover:translate-y-[-2px] border border-slate-200
    "
    >
      <div className="p-6">
        <div className="flex items-center flex-wrap mb-4 gap-2">
          <div className="text-slate-600">{utility.icon}</div>
          <h2 className="text-lg font-semibold text-slate-900">
            {utility.title}
          </h2>
        </div>
        <p className="text-slate-600 mb-4 md:min-h-[3rem]">
          {utility.description}
        </p>
        <div className="flex items-center text-blue-600 font-medium">
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
