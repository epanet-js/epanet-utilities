"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Lock, Unlock } from "lucide-react";
import { FeatureCollection } from "geojson";
import { useMapResizeObserver } from "@/hooks/use-mapresize-observer";
import {
  DEFAULT_TRANSFORM,
  METERS_PER_DEGREE,
  type TransformParams,
} from "@/lib/network-transform";
import type { LatLng } from "@/lib/network-placement";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const GESTURE_HANDLERS = [
  "dragPan",
  "scrollZoom",
  "doubleClickZoom",
  "dragRotate",
  "touchZoomRotate",
  "boxZoom",
  "keyboard",
  "touchPitch",
] as const;

export interface GeorefMapHandle {
  flyTo: (
    center: [number, number],
    bbox?: [number, number, number, number],
  ) => void;
  getCenter: () => LatLng;
}

interface GeorefMapProps {
  networkGeoJSON: FeatureCollection | null;
  /** 4 corners of the current bbox, in lat/lng, after the transform. Ordered
   *  [SW, SE, NE, NW] in the network's native space (pre-rotation). */
  bboxCorners: [number, number][] | null;
  anchor: LatLng | null;
  params: TransformParams;
  onParamsChange: (p: TransformParams) => void;
  /** Network bbox size in meters; used for keyboard nudge step sizes. */
  bboxSizeMeters: { widthMeters: number; heightMeters: number };
}

type DragKind = "body" | "corner" | "edge";

interface DragContext {
  kind: DragKind;
  startParams: TransformParams;
  startPointerPx: { x: number; y: number };
  startPointerLL: LatLng;
  centerPx: { x: number; y: number };
  anchor: LatLng;
}

export const GeorefMap = forwardRef<GeorefMapHandle, GeorefMapProps>(
  function GeorefMap(
    {
      networkGeoJSON,
      bboxCorners,
      anchor,
      params,
      onParamsChange,
      bboxSizeMeters,
    },
    ref,
  ) {
    const mapContainer = useRef<HTMLDivElement | null>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [locked, setLocked] = useState(false);
    // Bumped on every map 'move' so the SVG re-projects handles.
    const [moveTick, setMoveTick] = useState(0);

    const paramsRef = useRef(params);
    const anchorRef = useRef(anchor);
    const onParamsChangeRef = useRef(onParamsChange);
    const bboxSizeRef = useRef(bboxSizeMeters);
    useEffect(() => {
      paramsRef.current = params;
    }, [params]);
    useEffect(() => {
      anchorRef.current = anchor;
    }, [anchor]);
    useEffect(() => {
      onParamsChangeRef.current = onParamsChange;
    }, [onParamsChange]);
    useEffect(() => {
      bboxSizeRef.current = bboxSizeMeters;
    }, [bboxSizeMeters]);

    // Init Mapbox once.
    useEffect(() => {
      if (!mapContainer.current || map.current) return;
      try {
        mapboxgl.accessToken = MAPBOX_TOKEN;
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/satellite-streets-v12",
          center: [0, 20],
          zoom: 1.5,
        });
        map.current.on("load", () => setMapLoaded(true));
        map.current.on("move", () => setMoveTick((t) => t + 1));
        return () => {
          map.current?.remove();
          map.current = null;
        };
      } catch (error) {
        console.error("Error initializing map:", error);
        setMapLoaded(false);
      }
    }, []);

    useMapResizeObserver(map, mapContainer);

    // Imperative handle for flyTo / getCenter.
    useImperativeHandle(ref, () => ({
      flyTo: (center, bbox) => {
        if (!map.current) return;
        if (bbox) {
          map.current.fitBounds(
            [
              [bbox[0], bbox[1]],
              [bbox[2], bbox[3]],
            ],
            { padding: 60, duration: 800, maxZoom: 15 },
          );
        } else {
          map.current.flyTo({ center, zoom: 14, duration: 800 });
        }
      },
      getCenter: () => {
        const c = map.current?.getCenter();
        return c ? { lng: c.lng, lat: c.lat } : { lng: 0, lat: 0 };
      },
    }));

    // Toggle mapbox gestures based on lock state.
    useEffect(() => {
      if (!map.current || !mapLoaded) return;
      const m = map.current;
      for (const name of GESTURE_HANDLERS) {
        const handler = m[name as keyof mapboxgl.Map] as unknown as
          | { enable: () => void; disable: () => void }
          | undefined;
        if (!handler) continue;
        if (locked) handler.disable();
        else handler.enable();
      }
      m.getCanvas().style.cursor = locked ? "grab" : "";
    }, [locked, mapLoaded]);

    // Maintain the network source/layers.
    useEffect(() => {
      if (!map.current || !mapLoaded) return;
      const m = map.current;
      const existing = m.getSource("network") as
        | mapboxgl.GeoJSONSource
        | undefined;

      if (!networkGeoJSON) {
        if (m.getLayer("network-points")) m.removeLayer("network-points");
        if (m.getLayer("network-lines")) m.removeLayer("network-lines");
        if (existing) m.removeSource("network");
        return;
      }

      if (existing) {
        existing.setData(networkGeoJSON);
        return;
      }

      m.addSource("network", { type: "geojson", data: networkGeoJSON });
      m.addLayer({
        id: "network-lines",
        type: "line",
        source: "network",
        filter: ["==", ["get", "type"], "Link"],
        paint: {
          "line-color": "#38bdf8",
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.5, 16, 4],
        },
      });
      m.addLayer({
        id: "network-points",
        type: "circle",
        source: "network",
        filter: ["==", ["get", "type"], "Node"],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 1, 16, 5],
          "circle-color": "#38bdf8",
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        },
        minzoom: 12,
      });
    }, [networkGeoJSON, mapLoaded]);

    // Project bbox corners to pixel space for the overlay. Depends on
    // `moveTick` so it updates on every map move.
    const projectedCorners = useMemo(() => {
      void moveTick;
      if (!map.current || !bboxCorners || bboxCorners.length !== 4) return null;
      const m = map.current;
      return bboxCorners.map(([lng, lat]) => {
        const p = m.project([lng, lat]);
        return { x: p.x, y: p.y };
      });
    }, [bboxCorners, moveTick]);

    const centerPx = useMemo(() => {
      if (!projectedCorners) return null;
      const sx = projectedCorners.reduce((a, p) => a + p.x, 0) / 4;
      const sy = projectedCorners.reduce((a, p) => a + p.y, 0) / 4;
      return { x: sx, y: sy };
    }, [projectedCorners]);

    // --- Drag handling -----------------------------------------------------
    const dragRef = useRef<DragContext | null>(null);

    const getPointerPx = (ev: PointerEvent | React.PointerEvent) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
    };

    const pxToLatLng = (px: { x: number; y: number }): LatLng => {
      const ll = map.current?.unproject([px.x, px.y]);
      return ll ? { lng: ll.lng, lat: ll.lat } : { lng: 0, lat: 0 };
    };

    const handlePointerDown = (kind: DragKind) =>
      (ev: React.PointerEvent<SVGElement>) => {
        if (!locked || !centerPx || !anchorRef.current) return;
        ev.stopPropagation();
        ev.preventDefault();
        const startPointerPx = getPointerPx(ev);
        dragRef.current = {
          kind,
          startParams: { ...paramsRef.current },
          startPointerPx,
          startPointerLL: pxToLatLng(startPointerPx),
          centerPx: { ...centerPx },
          anchor: { ...anchorRef.current },
        };
        (ev.currentTarget as SVGElement).setPointerCapture(ev.pointerId);
      };

    const handlePointerMove = (ev: React.PointerEvent<SVGElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      const nowPx = getPointerPx(ev);
      const next: TransformParams = { ...drag.startParams };

      if (drag.kind === "body") {
        const nowLL = pxToLatLng(nowPx);
        const dLng = nowLL.lng - drag.startPointerLL.lng;
        const dLat = nowLL.lat - drag.startPointerLL.lat;
        const cosLat = Math.cos((drag.anchor.lat * Math.PI) / 180) || 1e-9;
        next.offsetX = drag.startParams.offsetX + dLng * METERS_PER_DEGREE * cosLat;
        next.offsetY = drag.startParams.offsetY + dLat * METERS_PER_DEGREE;
      } else if (drag.kind === "corner") {
        const cx = drag.centerPx.x;
        const cy = drag.centerPx.y;
        // pixel Y grows downward; negate so rotation matches native XY space
        // (Y growing northward) — consistent with rotateNetwork.
        const startAngle = Math.atan2(
          -(drag.startPointerPx.y - cy),
          drag.startPointerPx.x - cx,
        );
        const nowAngle = Math.atan2(-(nowPx.y - cy), nowPx.x - cx);
        const deltaDeg = ((nowAngle - startAngle) * 180) / Math.PI;
        let rot = drag.startParams.rotationDeg + deltaDeg;
        while (rot > 180) rot -= 360;
        while (rot < -180) rot += 360;
        if (ev.shiftKey) rot = Math.round(rot / 15) * 15;
        next.rotationDeg = rot;
      } else if (drag.kind === "edge") {
        const cx = drag.centerPx.x;
        const cy = drag.centerPx.y;
        const d0 = Math.hypot(
          drag.startPointerPx.x - cx,
          drag.startPointerPx.y - cy,
        );
        const d1 = Math.hypot(nowPx.x - cx, nowPx.y - cy);
        if (d0 <= 1) return;
        const ratio = d1 / d0;
        const scale = Math.min(
          Math.max(drag.startParams.scale * ratio, 0.001),
          1000,
        );
        next.scale = scale;
      }

      onParamsChangeRef.current(next);
    };

    const handlePointerUp = (ev: React.PointerEvent<SVGElement>) => {
      if (dragRef.current) {
        (ev.currentTarget as SVGElement).releasePointerCapture(ev.pointerId);
        dragRef.current = null;
      }
    };

    // --- Keyboard shortcuts ------------------------------------------------
    useEffect(() => {
      if (!locked) return;
      const onKey = (ev: KeyboardEvent) => {
        if (!anchorRef.current) return;
        const target = ev.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable)
        ) {
          return;
        }

        const shift = ev.shiftKey ? 10 : 1;
        const stepX = Math.max(bboxSizeRef.current.widthMeters * 0.01, 0.5) * shift;
        const stepY = Math.max(bboxSizeRef.current.heightMeters * 0.01, 0.5) * shift;
        const p = paramsRef.current;
        let next: TransformParams | null = null;

        switch (ev.key) {
          case "ArrowLeft":
            next = { ...p, offsetX: p.offsetX - stepX };
            break;
          case "ArrowRight":
            next = { ...p, offsetX: p.offsetX + stepX };
            break;
          case "ArrowUp":
            next = { ...p, offsetY: p.offsetY + stepY };
            break;
          case "ArrowDown":
            next = { ...p, offsetY: p.offsetY - stepY };
            break;
          case "+":
          case "=":
            next = { ...p, scale: Math.min(p.scale * 1.05, 1000) };
            break;
          case "-":
          case "_":
            next = { ...p, scale: Math.max(p.scale / 1.05, 0.001) };
            break;
          case "[": {
            let r = p.rotationDeg - shift;
            while (r < -180) r += 360;
            next = { ...p, rotationDeg: r };
            break;
          }
          case "]": {
            let r = p.rotationDeg + shift;
            while (r > 180) r -= 360;
            next = { ...p, rotationDeg: r };
            break;
          }
          case "r":
          case "R":
            next = { ...DEFAULT_TRANSFORM };
            break;
          case "Escape":
            setLocked(false);
            ev.preventDefault();
            return;
        }

        if (next) {
          ev.preventDefault();
          onParamsChangeRef.current(next);
        }
      };

      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [locked]);

    // Disable lock if no anchor yet.
    const canLock = !!anchor && !!bboxCorners;

    const polygonPoints = useMemo(() => {
      if (!projectedCorners) return "";
      return projectedCorners.map((p) => `${p.x},${p.y}`).join(" ");
    }, [projectedCorners]);

    const edgeMidpoints = useMemo(() => {
      if (!projectedCorners) return null;
      return projectedCorners.map((p, i) => {
        const next = projectedCorners[(i + 1) % 4];
        return { x: (p.x + next.x) / 2, y: (p.y + next.y) / 2 };
      });
    }, [projectedCorners]);

    return (
      <div className="relative min-h-[40dvh] col-start-1 md:col-start-2 bg-slate-200 h-full">
        <div className="relative h-full min-h-[400px] lg:h-[calc(100dvh_-_57px)] overflow-hidden">
          {MAPBOX_TOKEN === "pk.placeholder.token" ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
              <div className="text-center p-6">
                <p className="text-gray-600 mb-2">
                  Map placeholder - Mapbox token required
                </p>
              </div>
            </div>
          ) : (
            <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
          )}

          {/* Handle overlay */}
          <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full"
            style={{
              pointerEvents: "none",
              touchAction: "none",
            }}
          >
            {locked && projectedCorners && (
              <>
                {/* Body (translate) */}
                <polygon
                  points={polygonPoints}
                  fill="rgba(56, 189, 248, 0.12)"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  style={{ pointerEvents: "all", cursor: "move" }}
                  onPointerDown={handlePointerDown("body")}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                />
                {/* Edge midpoints (scale) */}
                {edgeMidpoints?.map((m, i) => (
                  <rect
                    key={`edge-${i}`}
                    x={m.x - 7}
                    y={m.y - 7}
                    width={14}
                    height={14}
                    fill="#ffffff"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    rx={2}
                    style={{ pointerEvents: "all", cursor: "nwse-resize" }}
                    onPointerDown={handlePointerDown("edge")}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                  />
                ))}
                {/* Corners (rotate) */}
                {projectedCorners.map((p, i) => (
                  <circle
                    key={`corner-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={9}
                    fill="#ffffff"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    style={{ pointerEvents: "all", cursor: "grab" }}
                    onPointerDown={handlePointerDown("corner")}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                  />
                ))}
              </>
            )}
          </svg>

          {/* Lock toggle */}
          <div className="absolute top-3 right-3 z-10">
            <button
              onClick={() => setLocked((v) => !v)}
              disabled={!canLock}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium shadow-md border ${
                !canLock
                  ? "bg-white/70 text-gray-400 border-gray-200 cursor-not-allowed"
                  : locked
                    ? "bg-amber-500 text-white border-amber-600 hover:bg-amber-600"
                    : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
              }`}
              title={
                !canLock
                  ? "Load a network and pick a location first"
                  : locked
                    ? "Unlock map (Esc)"
                    : "Lock map to drag / scale / rotate the network"
              }
            >
              {locked ? (
                <>
                  <Lock className="h-4 w-4" /> Locked
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4" /> Unlocked
                </>
              )}
            </button>
          </div>

          {locked && (
            <div className="absolute bottom-3 left-3 z-10 px-3 py-2 rounded-md text-xs bg-black/70 text-white max-w-xs">
              Drag the shape to move · corners to rotate · edges to scale. Press
              Esc to unlock.
            </div>
          )}
        </div>
      </div>
    );
  },
);
