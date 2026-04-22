import type { NetworkData } from "./types";
import {
  METERS_PER_DEGREE,
  type TransformParams,
} from "./network-transform";
import type { LatLng } from "./network-placement";

export interface GroundControlPoint {
  nodeId: string;
  target: LatLng;
}

/**
 * Solve TransformParams such that `applyTransform(placedNd, params, { origin,
 * isLatLng: true })` maps each GCP's node to its target lat/lng.
 *
 * - 1 GCP: translation only (scale + rotation kept from `currentParams`).
 * - 2+ GCPs: full similarity solve using the first two valid points.
 *
 * Math lives in lat/lng degree space (matching `applyTransform`'s rotation
 * space) so T(P_i) = Q_i exactly on the map.
 */
export function solveTransformFromGcps(
  gcps: GroundControlPoint[],
  placedNd: NetworkData,
  anchor: LatLng,
  currentParams: TransformParams,
): TransformParams | null {
  const origin: [number, number] = [anchor.lng, anchor.lat];
  const cosLat = Math.cos((anchor.lat * Math.PI) / 180) || 1e-9;

  const points: Array<{ P: [number, number]; Q: [number, number] }> = [];
  for (const gcp of gcps) {
    const P = placedNd.coordinates[gcp.nodeId];
    if (!P) continue;
    points.push({ P, Q: [gcp.target.lng, gcp.target.lat] });
  }
  if (points.length === 0) return null;

  const [ox, oy] = origin;
  const toMeters = (tDegX: number, tDegY: number) => ({
    offsetX: tDegX * METERS_PER_DEGREE * cosLat,
    offsetY: tDegY * METERS_PER_DEGREE,
  });

  if (points.length === 1) {
    // Translation-only fix.
    const { P, Q } = points[0];
    const theta = (currentParams.rotationDeg * Math.PI) / 180;
    const ca = Math.cos(theta);
    const sa = Math.sin(theta);
    const s = currentParams.scale;
    const ax = P[0] - ox;
    const ay = P[1] - oy;
    const rx = ca * ax - sa * ay;
    const ry = sa * ax + ca * ay;
    const tDegX = Q[0] - ox - s * rx;
    const tDegY = Q[1] - oy - s * ry;
    return {
      scale: s,
      rotationDeg: currentParams.rotationDeg,
      ...toMeters(tDegX, tDegY),
    };
  }

  const { P: P1, Q: Q1 } = points[0];
  const { P: P2, Q: Q2 } = points[1];

  const dPx = P2[0] - P1[0];
  const dPy = P2[1] - P1[1];
  const dQx = Q2[0] - Q1[0];
  const dQy = Q2[1] - Q1[1];

  const magP = Math.hypot(dPx, dPy);
  const magQ = Math.hypot(dQx, dQy);
  if (magP < 1e-12) return null;

  const s = magQ / magP;
  const theta = Math.atan2(dQy, dQx) - Math.atan2(dPy, dPx);
  const ca = Math.cos(theta);
  const sa = Math.sin(theta);

  // T_deg = (Q1 - origin) - R(theta)·s·(P1 - origin)
  const ax = P1[0] - ox;
  const ay = P1[1] - oy;
  const rx = ca * ax - sa * ay;
  const ry = sa * ax + ca * ay;
  const tDegX = Q1[0] - ox - s * rx;
  const tDegY = Q1[1] - oy - s * ry;

  let rotationDeg = (theta * 180) / Math.PI;
  while (rotationDeg > 180) rotationDeg -= 360;
  while (rotationDeg < -180) rotationDeg += 360;

  return {
    scale: s,
    rotationDeg,
    ...toMeters(tDegX, tDegY),
  };
}
