"use client";

import { Download, RotateCcw } from "lucide-react";
import {
  DEFAULT_TRANSFORM,
  type TransformParams,
} from "@/lib/network-transform";

interface NetworkTransformProps {
  params: TransformParams;
  onParamsChange: (p: TransformParams) => void;
  onReset: () => void;
  onDownload: () => void;
  canDownload: boolean;
  bboxSize: { widthMeters: number; heightMeters: number };
}

// Scale slider stores log10(scale). Range [-1, 1] → 0.1× … 10×, midpoint 1×.
const SCALE_LOG_MIN = -1;
const SCALE_LOG_MAX = 1;

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function formatNumber(n: number, decimals: number): string {
  return Number.isFinite(n) ? n.toFixed(decimals) : "";
}

export function NetworkTransform({
  params,
  onParamsChange,
  onReset,
  onDownload,
  canDownload,
  bboxSize,
}: NetworkTransformProps) {
  const isAtDefault =
    params.scale === DEFAULT_TRANSFORM.scale &&
    params.offsetX === DEFAULT_TRANSFORM.offsetX &&
    params.offsetY === DEFAULT_TRANSFORM.offsetY &&
    params.rotationDeg === DEFAULT_TRANSFORM.rotationDeg;

  const update = (patch: Partial<TransformParams>) =>
    onParamsChange({ ...params, ...patch });

  // Slider ranges for offsets: ±bbox size, with a minimum useful range for tiny
  // networks or empty data, so the slider always moves meaningfully.
  const offsetXRange = Math.max(bboxSize.widthMeters, 100);
  const offsetYRange = Math.max(bboxSize.heightMeters, 100);

  const scaleLog = Math.log10(clamp(params.scale, 0.1, 10));

  return (
    <div className="flex flex-col flex-grow">
      <h2 className="py-2 text-md font-semibold">Transform Settings</h2>

      <div className="space-y-5">
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <label className="text-sm font-medium text-gray-700">Scale</label>
            <input
              type="number"
              step={0.01}
              min={0.1}
              max={10}
              value={formatNumber(params.scale, 2)}
              onChange={(e) =>
                update({ scale: clamp(parseFloat(e.target.value), 0.1, 10) })
              }
              className="w-24 text-right text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <input
            type="range"
            min={SCALE_LOG_MIN}
            max={SCALE_LOG_MAX}
            step={0.01}
            value={scaleLog}
            onChange={(e) =>
              update({ scale: Math.pow(10, parseFloat(e.target.value)) })
            }
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-0.5">
            <span>0.1×</span>
            <span>1×</span>
            <span>10×</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-baseline mb-1">
            <label className="text-sm font-medium text-gray-700">
              Offset X (m)
            </label>
            <input
              type="number"
              step={1}
              value={formatNumber(params.offsetX, 2)}
              onChange={(e) =>
                update({ offsetX: parseFloat(e.target.value) || 0 })
              }
              className="w-28 text-right text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <input
            type="range"
            min={-offsetXRange}
            max={offsetXRange}
            step={Math.max(offsetXRange / 1000, 0.01)}
            value={clamp(params.offsetX, -offsetXRange, offsetXRange)}
            onChange={(e) => update({ offsetX: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>

        <div>
          <div className="flex justify-between items-baseline mb-1">
            <label className="text-sm font-medium text-gray-700">
              Offset Y (m)
            </label>
            <input
              type="number"
              step={1}
              value={formatNumber(params.offsetY, 2)}
              onChange={(e) =>
                update({ offsetY: parseFloat(e.target.value) || 0 })
              }
              className="w-28 text-right text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <input
            type="range"
            min={-offsetYRange}
            max={offsetYRange}
            step={Math.max(offsetYRange / 1000, 0.01)}
            value={clamp(params.offsetY, -offsetYRange, offsetYRange)}
            onChange={(e) => update({ offsetY: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>

        <div>
          <div className="flex justify-between items-baseline mb-1">
            <label className="text-sm font-medium text-gray-700">
              Rotation (°)
            </label>
            <input
              type="number"
              step={0.1}
              min={-180}
              max={180}
              value={formatNumber(params.rotationDeg, 1)}
              onChange={(e) =>
                update({
                  rotationDeg: clamp(parseFloat(e.target.value), -180, 180),
                })
              }
              className="w-24 text-right text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <input
            type="range"
            min={-180}
            max={180}
            step={0.1}
            value={params.rotationDeg}
            onChange={(e) =>
              update({ rotationDeg: parseFloat(e.target.value) })
            }
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-0.5">
            <span>-180°</span>
            <span>0°</span>
            <span>180°</span>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Offsets are in meters. Scale and rotation are applied around the
          network&apos;s center.
        </p>
      </div>

      <div className="py-4 mt-auto space-y-2">
        <button
          onClick={onReset}
          disabled={isAtDefault}
          className={`w-full flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium border ${
            isAtDefault
              ? "border-gray-200 text-gray-400 cursor-not-allowed"
              : "border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
          }`}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </button>
        <button
          onClick={onDownload}
          disabled={!canDownload}
          className={`w-full flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium ${
            !canDownload
              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          }`}
        >
          <Download className="h-4 w-4 mr-2" />
          Download Transformed Model
        </button>
      </div>
    </div>
  );
}
