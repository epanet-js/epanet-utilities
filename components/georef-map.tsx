"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Lock,
  Map as MapIcon,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  Satellite,
  Tag,
  Unlock,
} from "lucide-react";
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

type Basemap = "satellite" | "light";

const BASEMAP_STYLES: Record<Basemap, string> = {
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  light: "mapbox://styles/mapbox/light-v11",
};

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
  /** Target points for each ground control point — rendered as orange pins. */
  gcpsGeoJSON?: FeatureCollection | null;
  /** When true, next map click fires onMapClick and the cursor is a crosshair. */
  waitingForMapClick?: boolean;
  onMapClick?: (latLng: LatLng) => void;
  /** When true, clicks that hit a network node fire onNodePick. Runs until a
   *  node is hit (clicks on empty ground are ignored). */
  waitingForNodePick?: boolean;
  onNodePick?: (nodeId: string) => void;
}

const TARGET_NUDGE_PX = 12;

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
      gcpsGeoJSON,
      waitingForMapClick,
      onMapClick,
      waitingForNodePick,
      onNodePick,
    },
    ref,
  ) {
    const mapContainer = useRef<HTMLDivElement | null>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [locked, setLocked] = useState(false);
    const [basemap, setBasemap] = useState<Basemap>("satellite");
    const [showLabels, setShowLabels] = useState(true);
    // Bumped on every map 'move' so the SVG re-projects handles.
    const [moveTick, setMoveTick] = useState(0);
    // Bumped every time a new style finishes loading (setStyle wipes sources).
    const [styleTick, setStyleTick] = useState(0);

    const paramsRef = useRef(params);
    const anchorRef = useRef(anchor);
    const onParamsChangeRef = useRef(onParamsChange);
    const bboxCornersRef = useRef(bboxCorners);
    const onMapClickRef = useRef(onMapClick);
    const onNodePickRef = useRef(onNodePick);
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
      bboxCornersRef.current = bboxCorners;
    }, [bboxCorners]);
    useEffect(() => {
      onMapClickRef.current = onMapClick;
    }, [onMapClick]);
    useEffect(() => {
      onNodePickRef.current = onNodePick;
    }, [onNodePick]);

    // Init Mapbox once.
    useEffect(() => {
      if (!mapContainer.current || map.current) return;
      try {
        mapboxgl.accessToken = MAPBOX_TOKEN;
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: BASEMAP_STYLES.satellite,
          projection: "mercator",
          center: [0, 20],
          zoom: 1.5,
        });
        map.current.on("load", () => {
          setMapLoaded(true);
          setStyleTick((t) => t + 1);
        });
        map.current.on("style.load", () => setStyleTick((t) => t + 1));
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

    // Switch basemap style. setStyle wipes user-added sources/layers; the
    // network layer effect below depends on `styleTick` so it re-adds them
    // once `style.load` fires.
    useEffect(() => {
      if (!map.current || !mapLoaded) return;
      map.current.setStyle(BASEMAP_STYLES[basemap]);
    }, [basemap, mapLoaded]);

    // Toggle label visibility. Re-applies on style swaps.
    useEffect(() => {
      if (!map.current || !mapLoaded) return;
      const m = map.current;
      const layers = m.getStyle()?.layers ?? [];
      const visibility = showLabels ? "visible" : "none";
      for (const layer of layers) {
        if (layer.type === "symbol") {
          m.setLayoutProperty(layer.id, "visibility", visibility);
        }
      }
    }, [showLabels, mapLoaded, styleTick]);

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

    // Maintain the network source/layers. Depends on styleTick so we re-add
    // after a basemap switch wipes the style's sources.
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
    }, [networkGeoJSON, mapLoaded, styleTick]);

    // Maintain the GCP marker layer.
    useEffect(() => {
      if (!map.current || !mapLoaded) return;
      const m = map.current;
      const existing = m.getSource("gcps") as
        | mapboxgl.GeoJSONSource
        | undefined;

      if (!gcpsGeoJSON || gcpsGeoJSON.features.length === 0) {
        if (m.getLayer("gcp-labels")) m.removeLayer("gcp-labels");
        if (m.getLayer("gcp-points")) m.removeLayer("gcp-points");
        if (existing) m.removeSource("gcps");
        return;
      }

      if (existing) {
        existing.setData(gcpsGeoJSON);
        return;
      }

      m.addSource("gcps", { type: "geojson", data: gcpsGeoJSON });
      m.addLayer({
        id: "gcp-points",
        type: "circle",
        source: "gcps",
        paint: {
          "circle-radius": 8,
          "circle-color": "#f97316",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
      m.addLayer({
        id: "gcp-labels",
        type: "symbol",
        source: "gcps",
        layout: {
          "text-field": ["get", "label"],
          "text-size": 11,
          "text-offset": [0, 1.2],
          "text-anchor": "top",
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": "#9a3412",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      });
    }, [gcpsGeoJSON, mapLoaded, styleTick]);

    // One-shot map click listener when waiting to pick a GCP target.
    useEffect(() => {
      if (!waitingForMapClick || !map.current || !mapLoaded) return;
      const m = map.current;
      const canvas = m.getCanvas();
      const prevCursor = canvas.style.cursor;
      canvas.style.cursor = "crosshair";
      const handler = (ev: mapboxgl.MapMouseEvent) => {
        onMapClickRef.current?.({ lng: ev.lngLat.lng, lat: ev.lngLat.lat });
      };
      m.once("click", handler);
      return () => {
        m.off("click", handler);
        canvas.style.cursor = prevCursor;
      };
    }, [waitingForMapClick, mapLoaded]);

    // Persistent listener while the user is picking a GCP node from the map.
    // Uses a box around the click point so tiny circles are still clickable.
    useEffect(() => {
      if (!waitingForNodePick || !map.current || !mapLoaded) return;
      const m = map.current;
      const canvas = m.getCanvas();
      const prevCursor = canvas.style.cursor;
      canvas.style.cursor = "crosshair";

      const click = (ev: mapboxgl.MapMouseEvent) => {
        if (!m.getLayer("network-points")) return;
        const p = ev.point;
        const bbox: [[number, number], [number, number]] = [
          [p.x - 10, p.y - 10],
          [p.x + 10, p.y + 10],
        ];
        const features = m.queryRenderedFeatures(bbox, {
          layers: ["network-points"],
        });
        const id = features[0]?.properties?.id;
        if (typeof id === "string") {
          onNodePickRef.current?.(id);
        }
      };
      const enter = () => {
        canvas.style.cursor = "pointer";
      };
      const leave = () => {
        canvas.style.cursor = "crosshair";
      };

      m.on("click", click);
      m.on("mouseenter", "network-points", enter);
      m.on("mouseleave", "network-points", leave);
      return () => {
        m.off("click", click);
        m.off("mouseenter", "network-points", enter);
        m.off("mouseleave", "network-points", leave);
        canvas.style.cursor = prevCursor;
      };
    }, [waitingForNodePick, mapLoaded]);

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

    // --- Adaptive nudge actions -------------------------------------------
    // Step sizes are driven by the current map view so they shrink as the
    // user zooms in. Translate = N pixels of real-world meters at the anchor
    // latitude; scale / rotate = whatever change moves the farthest bbox
    // corner by N pixels on screen.
    const computeSteps = (shift: boolean) => {
      const m = map.current;
      const a = anchorRef.current;
      if (!m || !a) return null;
      const mul = shift ? 10 : 1;
      const targetPx = TARGET_NUDGE_PX * mul;

      const p0 = m.project([a.lng, a.lat]);
      const p1 = m.unproject([p0.x + 1, p0.y]);
      const cosLat = Math.cos((a.lat * Math.PI) / 180) || 1e-9;
      const metersPerPx = Math.abs(
        (p1.lng - a.lng) * METERS_PER_DEGREE * cosLat,
      );

      let radiusPx = 60;
      const corners = bboxCornersRef.current;
      if (corners && corners.length === 4) {
        const pts = corners.map(([lng, lat]) => m.project([lng, lat]));
        const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
        const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
        radiusPx = Math.max(
          ...pts.map((p) => Math.hypot(p.x - cx, p.y - cy)),
        );
      }
      radiusPx = Math.max(radiusPx, 30);

      return {
        translateMeters: targetPx * metersPerPx,
        scaleFactor: 1 + targetPx / radiusPx,
        rotateDeg: ((targetPx / radiusPx) * 180) / Math.PI,
      };
    };

    const nudgeTranslate = (dx: number, dy: number, shift: boolean) => {
      const s = computeSteps(shift);
      if (!s) return;
      const p = paramsRef.current;
      onParamsChangeRef.current({
        ...p,
        offsetX: p.offsetX + dx * s.translateMeters,
        offsetY: p.offsetY + dy * s.translateMeters,
      });
    };

    // Scale / rotate pivot from the current map viewport center so the point
    // under the user's eye stays locked on-screen while the network spreads
    // outward. `applyTransform` always pivots on the anchor, so we compensate
    // by rebaking (offsetX, offsetY) via the affine-composition identity:
    //   T' = U ∘ T   where  U is "scale/rotate around V"
    // works out to: new offset (in degrees) = f * old_offset + (f-1)*(origin-V)
    // for scale, and R(α) * old_offset + (R(α)-I)*(origin-V) for rotate.
    const nudgeScale = (dir: 1 | -1, shift: boolean) => {
      const s = computeSteps(shift);
      const m = map.current;
      const a = anchorRef.current;
      if (!s || !m || !a) return;
      const p = paramsRef.current;
      const rawFactor = dir > 0 ? s.scaleFactor : 1 / s.scaleFactor;
      const newScale = Math.min(Math.max(p.scale * rawFactor, 0.001), 1000);
      const f = newScale / p.scale;
      if (f === 1) return;

      const v = m.getCenter();
      const cosLat = Math.cos((a.lat * Math.PI) / 180) || 1e-9;
      const doLng = a.lng - v.lng;
      const doLat = a.lat - v.lat;
      const txDeg = p.offsetX / (METERS_PER_DEGREE * cosLat);
      const tyDeg = p.offsetY / METERS_PER_DEGREE;
      const txNewDeg = f * txDeg + (f - 1) * doLng;
      const tyNewDeg = f * tyDeg + (f - 1) * doLat;

      onParamsChangeRef.current({
        ...p,
        scale: newScale,
        offsetX: txNewDeg * METERS_PER_DEGREE * cosLat,
        offsetY: tyNewDeg * METERS_PER_DEGREE,
      });
    };

    const nudgeRotate = (dir: 1 | -1, shift: boolean) => {
      const s = computeSteps(shift);
      const m = map.current;
      const a = anchorRef.current;
      if (!s || !m || !a) return;
      const p = paramsRef.current;
      const deltaDeg = dir * s.rotateDeg;
      if (deltaDeg === 0) return;

      let r = p.rotationDeg + deltaDeg;
      while (r > 180) r -= 360;
      while (r < -180) r += 360;

      const v = m.getCenter();
      const cosLat = Math.cos((a.lat * Math.PI) / 180) || 1e-9;
      const alpha = (deltaDeg * Math.PI) / 180;
      const ca = Math.cos(alpha);
      const sa = Math.sin(alpha);
      const doLng = a.lng - v.lng;
      const doLat = a.lat - v.lat;
      const txDeg = p.offsetX / (METERS_PER_DEGREE * cosLat);
      const tyDeg = p.offsetY / METERS_PER_DEGREE;
      const txRot = ca * txDeg - sa * tyDeg;
      const tyRot = sa * txDeg + ca * tyDeg;
      const dxRot = ca * doLng - sa * doLat;
      const dyRot = sa * doLng + ca * doLat;
      const txNewDeg = txRot + (dxRot - doLng);
      const tyNewDeg = tyRot + (dyRot - doLat);

      onParamsChangeRef.current({
        ...p,
        rotationDeg: r,
        offsetX: txNewDeg * METERS_PER_DEGREE * cosLat,
        offsetY: tyNewDeg * METERS_PER_DEGREE,
      });
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

        let handled = true;
        switch (ev.key) {
          case "ArrowLeft":
            nudgeTranslate(-1, 0, ev.shiftKey);
            break;
          case "ArrowRight":
            nudgeTranslate(1, 0, ev.shiftKey);
            break;
          case "ArrowUp":
            nudgeTranslate(0, 1, ev.shiftKey);
            break;
          case "ArrowDown":
            nudgeTranslate(0, -1, ev.shiftKey);
            break;
          case "+":
          case "=":
            nudgeScale(1, ev.shiftKey);
            break;
          case "-":
          case "_":
            nudgeScale(-1, ev.shiftKey);
            break;
          case "[":
            nudgeRotate(-1, ev.shiftKey);
            break;
          case "]":
            nudgeRotate(1, ev.shiftKey);
            break;
          case "r":
          case "R":
            onParamsChangeRef.current({ ...DEFAULT_TRANSFORM });
            break;
          case "Escape":
            setLocked(false);
            break;
          default:
            handled = false;
        }
        if (handled) ev.preventDefault();
      };

      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
      // nudge* closures capture refs (paramsRef etc.), so this effect can
      // stay keyed only on `locked`.
      // eslint-disable-next-line react-hooks/exhaustive-deps
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
                  style={{
                    pointerEvents:
                      waitingForMapClick || waitingForNodePick ? "none" : "all",
                    cursor: "move",
                  }}
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
                    style={{
                      pointerEvents:
                      waitingForMapClick || waitingForNodePick ? "none" : "all",
                      cursor: "nwse-resize",
                    }}
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
                    style={{
                      pointerEvents:
                      waitingForMapClick || waitingForNodePick ? "none" : "all",
                      cursor: "grab",
                    }}
                    onPointerDown={handlePointerDown("corner")}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                  />
                ))}
              </>
            )}
          </svg>

          {/* Top-right controls */}
          <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
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

            <div className="flex rounded-md shadow-md border border-gray-300 overflow-hidden bg-white">
              <button
                onClick={() => setBasemap("satellite")}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium ${
                  basemap === "satellite"
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
                title="Satellite basemap"
              >
                <Satellite className="h-4 w-4" /> Satellite
              </button>
              <button
                onClick={() => setBasemap("light")}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-l border-gray-300 ${
                  basemap === "light"
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
                title="Light basemap"
              >
                <MapIcon className="h-4 w-4" /> Light
              </button>
            </div>

            <button
              onClick={() => setShowLabels((v) => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium shadow-md border ${
                showLabels
                  ? "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                  : "bg-gray-900 text-white border-gray-900 hover:bg-gray-800"
              }`}
              title={showLabels ? "Hide map labels" : "Show map labels"}
            >
              <Tag className="h-4 w-4" />
              {showLabels ? "Labels on" : "Labels off"}
            </button>
          </div>

          {/* Floating toolbar */}
          {anchor && bboxCorners && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-2 py-1.5 rounded-full shadow-lg border border-gray-200 bg-white">
              <ToolbarGroup label="Move">
                <ToolbarButton
                  title="Move left (Shift ×10)"
                  onClick={(shift) => nudgeTranslate(-1, 0, shift)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  title="Move down (Shift ×10)"
                  onClick={(shift) => nudgeTranslate(0, -1, shift)}
                >
                  <ArrowDown className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  title="Move up (Shift ×10)"
                  onClick={(shift) => nudgeTranslate(0, 1, shift)}
                >
                  <ArrowUp className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  title="Move right (Shift ×10)"
                  onClick={(shift) => nudgeTranslate(1, 0, shift)}
                >
                  <ArrowRight className="h-4 w-4" />
                </ToolbarButton>
              </ToolbarGroup>

              <div className="w-px h-6 bg-gray-200 mx-1" />

              <ToolbarGroup label="Scale">
                <ToolbarButton
                  title="Scale down (Shift ×10)"
                  onClick={(shift) => nudgeScale(-1, shift)}
                >
                  <Minus className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  title="Scale up (Shift ×10)"
                  onClick={(shift) => nudgeScale(1, shift)}
                >
                  <Plus className="h-4 w-4" />
                </ToolbarButton>
              </ToolbarGroup>

              <div className="w-px h-6 bg-gray-200 mx-1" />

              <ToolbarGroup label="Rotate">
                <ToolbarButton
                  title="Rotate counter-clockwise (Shift ×10)"
                  onClick={(shift) => nudgeRotate(-1, shift)}
                >
                  <RotateCcw className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  title="Rotate clockwise (Shift ×10)"
                  onClick={(shift) => nudgeRotate(1, shift)}
                >
                  <RotateCw className="h-4 w-4" />
                </ToolbarButton>
              </ToolbarGroup>
            </div>
          )}
        </div>
      </div>
    );
  },
);

function ToolbarGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-0.5"
      role="group"
      aria-label={label}
    >
      {children}
    </div>
  );
}

function ToolbarButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: (shift: boolean) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => onClick(e.shiftKey)}
      className="flex items-center justify-center w-9 h-9 rounded-full text-gray-700 hover:bg-gray-100 active:bg-gray-200"
    >
      {children}
    </button>
  );
}
