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
import {
  Crosshair,
  Download,
  MapPin,
  Plus,
  RotateCcw,
  Target,
  X,
} from "lucide-react";
import { geocode, type GeocodeResult } from "@/lib/geocoding";
import {
  DEFAULT_TRANSFORM,
  type TransformParams,
} from "@/lib/network-transform";
import type { LatLng } from "@/lib/network-placement";
import type { GroundControlPoint } from "@/lib/gcp-solve";

interface GeorefControlsProps {
  anchor: LatLng | null;
  params: TransformParams;
  canDownload: boolean;
  units: "US" | "SI" | null;
  nodeIds: string[];
  gcps: GroundControlPoint[];
  pendingGcpNodeId: string | null;
  maxGcps: number;
  onGeocodeSelect: (result: GeocodeResult) => void;
  onPlaceAtMapCenter: () => void;
  onClearPlacement: () => void;
  onBeginGcpPick: (nodeId: string) => void;
  onCancelGcpPick: () => void;
  onRemoveGcp: (index: number) => void;
  onReset: () => void;
  onDownload: () => void;
}

export function GeorefControls({
  anchor,
  params,
  canDownload,
  units,
  nodeIds,
  gcps,
  pendingGcpNodeId,
  maxGcps,
  onGeocodeSelect,
  onPlaceAtMapCenter,
  onClearPlacement,
  onBeginGcpPick,
  onCancelGcpPick,
  onRemoveGcp,
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
      {!anchor ? (
        <>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Find a location
            </label>
            <LocationSearch onSelect={onGeocodeSelect} />
            <p className="text-xs text-gray-500 mt-1">
              Search by city, address, or postcode. The network will drop at
              the selected location.
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
              Pan and zoom the map, then click to drop the network at the
              current view.
            </p>
          </div>
        </>
      ) : (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-900">
              <MapPin className="h-4 w-4" />
              Network placed
            </div>
            <button
              onClick={onClearPlacement}
              className="flex items-center gap-1 text-xs text-emerald-800 hover:text-emerald-900 hover:underline"
              title="Remove the network and pick a new location"
            >
              <X className="h-3.5 w-3.5" />
              Replace
            </button>
          </div>
          <div className="text-xs space-y-1">
            {units && (
              <div className="flex justify-between">
                <span className="text-emerald-800/70">Units</span>
                <span className="font-mono text-emerald-900">
                  {units === "US" ? "US customary (feet)" : "SI (meters)"}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-emerald-800/70">Anchor</span>
              <span className="font-mono text-emerald-900">
                {anchor.lat.toFixed(5)}, {anchor.lng.toFixed(5)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-800/70">Scale</span>
              <span className="font-mono text-emerald-900">
                {params.scale.toFixed(3)}×
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-800/70">Rotation</span>
              <span className="font-mono text-emerald-900">
                {params.rotationDeg.toFixed(1)}°
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-800/70">Offset X</span>
              <span className="font-mono text-emerald-900">
                {params.offsetX.toFixed(1)} m
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-800/70">Offset Y</span>
              <span className="font-mono text-emerald-900">
                {params.offsetY.toFixed(1)} m
              </span>
            </div>
          </div>
        </div>
      )}

      {anchor && (
        <GcpSection
          nodeIds={nodeIds}
          gcps={gcps}
          pendingGcpNodeId={pendingGcpNodeId}
          maxGcps={maxGcps}
          onBeginPick={onBeginGcpPick}
          onCancelPick={onCancelGcpPick}
          onRemove={onRemoveGcp}
        />
      )}

      {anchor && (
        <div className="text-xs text-gray-500 space-y-1">
          <p className="font-medium text-gray-700">Lock mode shortcuts</p>
          <p>Drag body to move · corners to rotate · edges to scale</p>
          <p>Arrows: nudge (Shift × 10) · + / − : scale · [ / ] : rotate</p>
          <p>R: reset · Esc: unlock</p>
        </div>
      )}

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

interface GcpSectionProps {
  nodeIds: string[];
  gcps: GroundControlPoint[];
  pendingGcpNodeId: string | null;
  maxGcps: number;
  onBeginPick: (nodeId: string) => void;
  onCancelPick: () => void;
  onRemove: (index: number) => void;
}

function GcpSection({
  nodeIds,
  gcps,
  pendingGcpNodeId,
  maxGcps,
  onBeginPick,
  onCancelPick,
  onRemove,
}: GcpSectionProps) {
  const [stage, setStage] = React.useState<"idle" | "node">("idle");

  // If a pick is in flight externally, never show the node-search stage.
  const waitingMap = pendingGcpNodeId !== null;
  const atCapacity = gcps.length >= maxGcps;
  const usedIds = new Set(gcps.map((g) => g.nodeId));
  const selectable = nodeIds.filter((id) => !usedIds.has(id));

  return (
    <div className="rounded-md border border-gray-200 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-800">
          Ground control points
        </h3>
        <span className="text-xs text-gray-500">
          {gcps.length} / {maxGcps}
        </span>
      </div>
      <p className="text-xs text-gray-500">
        Pin one or two junctions to exact locations. Scale, rotation, and
        offset will solve automatically.
      </p>

      {gcps.length > 0 && (
        <ul className="space-y-1">
          {gcps.map((g, i) => (
            <li
              key={`${g.nodeId}-${i}`}
              className="flex items-center justify-between gap-2 text-xs bg-orange-50 border border-orange-200 rounded px-2 py-1"
            >
              <div className="min-w-0">
                <div className="font-mono text-orange-900 truncate">
                  {g.nodeId}
                </div>
                <div className="font-mono text-[10px] text-orange-800/80">
                  {g.target.lat.toFixed(5)}, {g.target.lng.toFixed(5)}
                </div>
              </div>
              <button
                onClick={() => onRemove(i)}
                className="text-orange-700 hover:text-orange-900"
                title="Remove this control point"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {waitingMap ? (
        <div className="flex items-center justify-between gap-2 rounded bg-orange-100 border border-orange-300 px-2 py-2 text-xs">
          <div className="flex items-center gap-1.5 text-orange-900">
            <Crosshair className="h-3.5 w-3.5" />
            Click on the map to place
            <span className="font-mono font-semibold">
              {pendingGcpNodeId}
            </span>
          </div>
          <button
            onClick={onCancelPick}
            className="text-orange-800 hover:underline"
          >
            Cancel
          </button>
        </div>
      ) : stage === "node" ? (
        <div className="space-y-2">
          <NodeSearch
            nodeIds={selectable}
            onSelect={(id) => {
              setStage("idle");
              onBeginPick(id);
            }}
          />
          <button
            onClick={() => setStage("idle")}
            className="text-xs text-gray-600 hover:underline"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          disabled={atCapacity || selectable.length === 0}
          onClick={() => setStage("node")}
          className={`w-full flex items-center justify-center gap-1 px-3 py-1.5 rounded text-xs font-medium border ${
            atCapacity || selectable.length === 0
              ? "border-gray-200 text-gray-400 cursor-not-allowed"
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          <Plus className="h-3.5 w-3.5" />
          {atCapacity ? "Maximum reached" : "Add control point"}
        </button>
      )}
    </div>
  );
}

function NodeSearch({
  nodeIds,
  onSelect,
}: {
  nodeIds: string[];
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(true);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const matches = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return nodeIds.slice(0, 30);
    const scored: Array<{ id: string; rank: number }> = [];
    for (const id of nodeIds) {
      const lower = id.toLowerCase();
      if (lower === q) scored.push({ id, rank: 0 });
      else if (lower.startsWith(q)) scored.push({ id, rank: 1 });
      else if (lower.includes(q)) scored.push({ id, rank: 2 });
    }
    scored.sort(
      (a, b) => a.rank - b.rank || a.id.localeCompare(b.id),
    );
    return scored.slice(0, 30).map((s) => s.id);
  }, [query, nodeIds]);

  return (
    <Command shouldFilter={false} className="relative">
      <CommandInput
        ref={inputRef}
        value={query}
        onValueChange={setQuery}
        onFocus={() => setOpen(true)}
        placeholder="Search junction or node ID"
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {open && (
        <div className="mt-1 max-h-48 overflow-auto rounded-md border border-gray-200 bg-white shadow-sm">
          <CommandList>
            <CommandEmpty className="py-2 px-3 text-xs text-gray-500">
              No matching nodes.
            </CommandEmpty>
            <CommandGroup>
              {matches.map((id) => (
                <CommandItem
                  key={id}
                  value={id}
                  onMouseDown={(e) => e.preventDefault()}
                  onSelect={() => onSelect(id)}
                  className="px-3 py-1.5 text-sm cursor-pointer rounded hover:bg-orange-100 font-mono"
                >
                  {id}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </div>
      )}
    </Command>
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
