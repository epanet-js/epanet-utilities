import type { NetworkData } from "./types";

export interface TransformParams {
  scale: number;
  offsetX: number;
  offsetY: number;
  rotationDeg: number;
}

export const DEFAULT_TRANSFORM: TransformParams = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  rotationDeg: 0,
};

export interface Bbox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const METERS_PER_DEGREE = 111320;

export function computeBbox(nd: NetworkData): Bbox {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  const update = ([x, y]: [number, number]) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };

  for (const coord of Object.values(nd.coordinates)) update(coord);
  for (const points of Object.values(nd.vertices)) {
    for (const coord of points) update(coord);
  }

  if (!isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  return { minX, minY, maxX, maxY };
}

export function bboxCenter(b: Bbox): [number, number] {
  return [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2];
}

function mapNetwork(
  nd: NetworkData,
  fn: (c: [number, number]) => [number, number],
): NetworkData {
  const coordinates: Record<string, [number, number]> = {};
  for (const [id, c] of Object.entries(nd.coordinates)) {
    coordinates[id] = fn(c);
  }
  const vertices: Record<string, [number, number][]> = {};
  for (const [id, points] of Object.entries(nd.vertices)) {
    vertices[id] = points.map(fn);
  }
  return { coordinates, vertices, inp: nd.inp, name: nd.name };
}

export function scaleNetwork(
  nd: NetworkData,
  scale: number,
  origin: [number, number],
): NetworkData {
  const [ox, oy] = origin;
  return mapNetwork(nd, ([x, y]) => [
    ox + (x - ox) * scale,
    oy + (y - oy) * scale,
  ]);
}

export function translateNetwork(
  nd: NetworkData,
  dx: number,
  dy: number,
): NetworkData {
  return mapNetwork(nd, ([x, y]) => [x + dx, y + dy]);
}

export function rotateNetwork(
  nd: NetworkData,
  thetaDeg: number,
  origin: [number, number],
): NetworkData {
  const theta = (thetaDeg * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const [ox, oy] = origin;
  return mapNetwork(nd, ([x, y]) => {
    const dx = x - ox;
    const dy = y - oy;
    return [ox + dx * cos - dy * sin, oy + dx * sin + dy * cos];
  });
}

export function metersToDegrees(
  dxMeters: number,
  dyMeters: number,
  centerLat: number,
): { dxDeg: number; dyDeg: number } {
  const cosLat = Math.cos((centerLat * Math.PI) / 180);
  // Guard against division by zero near the poles.
  const safeCos = Math.abs(cosLat) < 1e-9 ? 1e-9 : cosLat;
  return {
    dxDeg: dxMeters / (METERS_PER_DEGREE * safeCos),
    dyDeg: dyMeters / METERS_PER_DEGREE,
  };
}

export function applyTransform(
  nd: NetworkData,
  params: TransformParams,
  opts: { origin: [number, number]; isLatLng: boolean; centerLat: number },
): NetworkData {
  const { scale, offsetX, offsetY, rotationDeg } = params;
  const { origin, isLatLng, centerLat } = opts;

  let result = scaleNetwork(nd, scale, origin);
  result = rotateNetwork(result, rotationDeg, origin);

  let dx = offsetX;
  let dy = offsetY;
  if (isLatLng) {
    const converted = metersToDegrees(offsetX, offsetY, centerLat);
    dx = converted.dxDeg;
    dy = converted.dyDeg;
  }
  result = translateNetwork(result, dx, dy);

  return result;
}
