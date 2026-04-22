"use client";

import * as React from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandLoading,
} from "cmdk";
import { Download, MapPin, RotateCcw, Target } from "lucide-react";
import { geocode, type GeocodeResult } from "@/lib/geocoding";
import {
  DEFAULT_TRANSFORM,
  type TransformParams,
} from "@/lib/network-transform";
import type { LatLng } from "@/lib/network-placement";

interface GeorefControlsProps {
  anchor: LatLng | null;
  params: TransformParams;
  canDownload: boolean;
  units: "US" | "SI" | null;
  onGeocodeSelect: (result: GeocodeResult) => void;
  onPlaceAtMapCenter: () => void;
  onReset: () => void;
  onDownload: () => void;
}

export function GeorefControls({
  anchor,
  params,
  canDownload,
  units,
  onGeocodeSelect,
  onPlaceAtMapCenter,
  onReset,
  onDownload,
}: GeorefControlsProps) {
  const isAtDefault =
    params.scale === DEFAULT_TRANSFORM.scale &&
    params.offsetX === DEFAULT_TRANSFORM.offsetX &&
    params.offsetY === DEFAULT_TRANSFORM.offsetY &&
    params.rotationDeg === DEFAULT_TRANSFORM.rotationDeg;

  return (
    <div className="flex flex-col flex-grow space-y-5">
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">
          Find a location
        </label>
        <LocationSearch onSelect={onGeocodeSelect} />
        <p className="text-xs text-gray-500 mt-1">
          Search by city, address, or postcode. The network will drop at the
          selected location.
        </p>
      </div>

      <div>
        <button
          onClick={onPlaceAtMapCenter}
          className="w-full flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          <Target className="h-4 w-4 mr-2" />
          Place network at map center
        </button>
        <p className="text-xs text-gray-500 mt-1">
          Pan and zoom the map, then click to drop (or re-drop) the network at
          the current view.
        </p>
      </div>

      <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs space-y-1">
        {units && (
          <div className="flex justify-between">
            <span className="text-gray-500">Units</span>
            <span className="font-mono text-gray-800">
              {units === "US" ? "US customary (feet)" : "SI (meters)"}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-500">Anchor</span>
          <span className="font-mono text-gray-800">
            {anchor
              ? `${anchor.lat.toFixed(5)}, ${anchor.lng.toFixed(5)}`
              : "not set"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Scale</span>
          <span className="font-mono text-gray-800">
            {params.scale.toFixed(3)}×
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Rotation</span>
          <span className="font-mono text-gray-800">
            {params.rotationDeg.toFixed(1)}°
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Offset X</span>
          <span className="font-mono text-gray-800">
            {params.offsetX.toFixed(1)} m
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Offset Y</span>
          <span className="font-mono text-gray-800">
            {params.offsetY.toFixed(1)} m
          </span>
        </div>
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        <p className="font-medium text-gray-700">Lock mode shortcuts</p>
        <p>Drag body to move · corners to rotate · edges to scale</p>
        <p>Arrows: nudge (Shift × 10) · + / − : scale · [ / ] : rotate</p>
        <p>R: reset · Esc: unlock</p>
      </div>

      <div className="pt-2 mt-auto space-y-2">
        <button
          onClick={onReset}
          disabled={isAtDefault}
          className={`w-full flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium border ${
            isAtDefault
              ? "border-gray-200 text-gray-400 cursor-not-allowed"
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset transform
        </button>
        <button
          onClick={onDownload}
          disabled={!canDownload}
          className={`w-full flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium ${
            !canDownload
              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700 text-white"
          }`}
        >
          <Download className="h-4 w-4 mr-2" />
          Download Georeferenced Model
        </button>
      </div>
    </div>
  );
}

interface LocationSearchProps {
  onSelect: (result: GeocodeResult) => void;
}

function LocationSearch({ onSelect }: LocationSearchProps) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<GeocodeResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await geocode(trimmed, controller.signal);
        setResults(r);
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
        setError("Search failed. Please try again.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const handleSelect = (r: GeocodeResult) => {
    onSelect(r);
    setQuery(r.name);
    setOpen(false);
  };

  return (
    <Command
      ref={containerRef}
      shouldFilter={false}
      className="relative"
      onBlur={(e) => {
        if (
          containerRef.current &&
          containerRef.current.contains(e.relatedTarget as Node)
        ) {
          return;
        }
        setTimeout(() => setOpen(false), 100);
      }}
    >
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <CommandInput
          value={query}
          onValueChange={(v) => {
            setQuery(v);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="e.g. Melbourne, Australia"
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {open && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border border-slate-200 bg-white shadow-lg">
          <CommandList>
            {loading && (
              <CommandLoading className="py-3 px-3 text-sm text-gray-500">
                Searching…
              </CommandLoading>
            )}
            {error && (
              <div className="py-3 px-3 text-sm text-red-600">{error}</div>
            )}
            {!loading && !error && (
              <CommandEmpty className="py-3 px-3 text-sm text-gray-500">
                No locations found.
              </CommandEmpty>
            )}
            <CommandGroup className="max-h-60 overflow-auto p-1">
              {results.map((r) => (
                <CommandItem
                  key={r.id}
                  value={r.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onSelect={() => handleSelect(r)}
                  className="px-3 py-2 text-sm cursor-pointer rounded hover:bg-purple-100"
                >
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-gray-500 font-mono">
                    {r.center[1].toFixed(4)}, {r.center[0].toFixed(4)}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </div>
      )}
    </Command>
  );
}
