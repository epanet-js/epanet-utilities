import type { NetworkData } from "./types";
import {
  METERS_PER_DEGREE,
  metersToDegrees,
  type TransformParams,
} from "./network-transform";

export interface LatLng {
  lng: number;
  lat: number;
}

/**
 * Shift a NetworkData so that its native center maps to `anchor` in lat/lng
 * space. For already-lat/lng networks this is a pure translation. For
 * projected networks, native deltas are scaled by `metersPerUnit` (1 for SI,
 * 0.3048 for US customary / feet) and then converted to degrees using a local
 * tangent-plane approximation around the anchor.
 *
 * Returns network data whose coordinates are in degrees (lng, lat).
 */
export function placeNetworkAtLatLng(
  nd: NetworkData,
  anchor: LatLng,
  isLatLng: boolean,
  nativeCenter: [number, number],
  metersPerUnit: number = 1,
): NetworkData {
  const [cx, cy] = nativeCenter;
  const cosLat = Math.cos((anchor.lat * Math.PI) / 180);
  const safeCos = Math.abs(cosLat) < 1e-9 ? 1e-9 : cosLat;

  const shift = ([x, y]: [number, number]): [number, number] => {
    if (isLatLng) {
      return [anchor.lng + (x - cx), anchor.lat + (y - cy)];
    }
    return [
      anchor.lng + ((x - cx) * metersPerUnit) / (METERS_PER_DEGREE * safeCos),
      anchor.lat + ((y - cy) * metersPerUnit) / METERS_PER_DEGREE,
    ];
  };

  const coordinates: Record<string, [number, number]> = {};
  for (const [id, c] of Object.entries(nd.coordinates)) {
    coordinates[id] = shift(c);
  }
  const vertices: Record<string, [number, number][]> = {};
  for (const [id, points] of Object.entries(nd.vertices)) {
    vertices[id] = points.map(shift);
  }
  return { coordinates, vertices, inp: nd.inp, name: nd.name };
}

/**
 * Apply scale/rotate/translate to a single lat/lng point, matching the math
 * in `applyTransform` for isLatLng=true. Used to compute bbox corner
 * positions after a transform without running a full network pass.
 */
export function transformLatLngPoint(
  point: [number, number],
  params: TransformParams,
  origin: [number, number],
  centerLat: number,
): [number, number] {
  const { scale, rotationDeg, offsetX, offsetY } = params;
  const [ox, oy] = origin;

  let x = ox + (point[0] - ox) * scale;
  let y = oy + (point[1] - oy) * scale;

  const theta = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const dx = x - ox;
  const dy = y - oy;
  x = ox + dx * cos - dy * sin;
  y = oy + dx * sin + dy * cos;

  const { dxDeg, dyDeg } = metersToDegrees(offsetX, offsetY, centerLat);
  return [x + dxDeg, y + dyDeg];
}
