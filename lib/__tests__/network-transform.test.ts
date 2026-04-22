import { describe, expect, it } from "vitest";
import type { NetworkData } from "../types";
import {
  applyTransform,
  bboxCenter,
  computeBbox,
  DEFAULT_TRANSFORM,
  METERS_PER_DEGREE,
  metersToDegrees,
  rotateNetwork,
  scaleNetwork,
  shiftToLatLngWithBaseline,
  translateNetwork,
} from "../network-transform";

function makeNetwork(): NetworkData {
  return {
    coordinates: {
      A: [0, 0],
      B: [10, 0],
      C: [0, 20],
    },
    vertices: {
      P1: [
        [2, 1],
        [4, 1],
      ],
    },
    inp: "INP_CONTENT",
    name: "net.inp",
  };
}

function closeTo(
  actual: [number, number],
  expected: [number, number],
  eps = 1e-9,
) {
  expect(actual[0]).toBeCloseTo(expected[0], 9);
  expect(actual[1]).toBeCloseTo(expected[1], 9);
  // Use eps in at least one assertion so strict eps is honored for callers.
  expect(Math.abs(actual[0] - expected[0])).toBeLessThanOrEqual(eps + 1e-9);
  expect(Math.abs(actual[1] - expected[1])).toBeLessThanOrEqual(eps + 1e-9);
}

describe("computeBbox / bboxCenter", () => {
  it("returns the extent across coordinates and vertices", () => {
    const nd = makeNetwork();
    expect(computeBbox(nd)).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 20 });
    expect(bboxCenter(computeBbox(nd))).toEqual([5, 10]);
  });

  it("handles empty networks", () => {
    const nd: NetworkData = {
      coordinates: {},
      vertices: {},
      inp: "",
      name: "",
    };
    expect(computeBbox(nd)).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
  });
});

describe("translateNetwork", () => {
  it("adds dx/dy to every coordinate and vertex", () => {
    const nd = makeNetwork();
    const out = translateNetwork(nd, 5, -3);
    expect(out.coordinates.A).toEqual([5, -3]);
    expect(out.coordinates.B).toEqual([15, -3]);
    expect(out.coordinates.C).toEqual([5, 17]);
    expect(out.vertices.P1).toEqual([
      [7, -2],
      [9, -2],
    ]);
  });

  it("does not mutate the input and passes inp/name through", () => {
    const nd = makeNetwork();
    const snapshot = JSON.parse(JSON.stringify(nd));
    const out = translateNetwork(nd, 1, 2);
    expect(nd).toEqual(snapshot);
    expect(out.inp).toBe(nd.inp);
    expect(out.name).toBe(nd.name);
  });
});

describe("scaleNetwork", () => {
  it("with scale=2 doubles distance from the origin and leaves origin invariant", () => {
    const nd = makeNetwork();
    const out = scaleNetwork(nd, 2, [0, 0]);
    expect(out.coordinates.A).toEqual([0, 0]);
    expect(out.coordinates.B).toEqual([20, 0]);
    expect(out.coordinates.C).toEqual([0, 40]);
    expect(out.vertices.P1).toEqual([
      [4, 2],
      [8, 2],
    ]);
  });

  it("with scale=1 is identity", () => {
    const nd = makeNetwork();
    const out = scaleNetwork(nd, 1, [5, 10]);
    expect(out.coordinates).toEqual(nd.coordinates);
    expect(out.vertices).toEqual(nd.vertices);
  });

  it("scales around a non-origin pivot", () => {
    const nd: NetworkData = {
      coordinates: { A: [10, 10] },
      vertices: {},
      inp: "",
      name: "",
    };
    const out = scaleNetwork(nd, 3, [5, 5]);
    expect(out.coordinates.A).toEqual([20, 20]);
  });
});

describe("rotateNetwork", () => {
  it("90° around origin maps (1,0) → (0,1)", () => {
    const nd: NetworkData = {
      coordinates: { A: [1, 0] },
      vertices: { P: [[1, 0]] },
      inp: "",
      name: "",
    };
    const out = rotateNetwork(nd, 90, [0, 0]);
    closeTo(out.coordinates.A, [0, 1]);
    closeTo(out.vertices.P[0], [0, 1]);
  });

  it("360° is identity", () => {
    const nd = makeNetwork();
    const out = rotateNetwork(nd, 360, [5, 10]);
    closeTo(out.coordinates.A, nd.coordinates.A);
    closeTo(out.coordinates.B, nd.coordinates.B);
    closeTo(out.coordinates.C, nd.coordinates.C);
  });

  it("0° is identity", () => {
    const nd = makeNetwork();
    const out = rotateNetwork(nd, 0, [5, 10]);
    closeTo(out.coordinates.A, nd.coordinates.A);
    closeTo(out.coordinates.B, nd.coordinates.B);
  });

  it("rotates around a non-origin pivot", () => {
    const nd: NetworkData = {
      coordinates: { A: [6, 5] },
      vertices: {},
      inp: "",
      name: "",
    };
    const out = rotateNetwork(nd, 90, [5, 5]);
    closeTo(out.coordinates.A, [5, 6]);
  });
});

describe("metersToDegrees", () => {
  it("at the equator, 1° longitude = METERS_PER_DEGREE meters", () => {
    const { dxDeg, dyDeg } = metersToDegrees(
      METERS_PER_DEGREE,
      METERS_PER_DEGREE,
      0,
    );
    expect(dxDeg).toBeCloseTo(1, 9);
    expect(dyDeg).toBeCloseTo(1, 9);
  });

  it("at 60° latitude, longitude delta roughly doubles for the same dx meters", () => {
    const equator = metersToDegrees(METERS_PER_DEGREE, 0, 0);
    const lat60 = metersToDegrees(METERS_PER_DEGREE, 0, 60);
    expect(lat60.dxDeg / equator.dxDeg).toBeCloseTo(2, 3);
  });
});

describe("applyTransform", () => {
  it("defaults are identity", () => {
    const nd = makeNetwork();
    const out = applyTransform(nd, DEFAULT_TRANSFORM, {
      origin: [5, 10],
      isLatLng: false,
      centerLat: 0,
    });
    expect(out.coordinates).toEqual(nd.coordinates);
    expect(out.vertices).toEqual(nd.vertices);
  });

  it("applies S then R then T, matching a hand-composed pipeline", () => {
    const nd = makeNetwork();
    const params = {
      scale: 2,
      offsetX: 100,
      offsetY: -50,
      rotationDeg: 90,
    };
    const origin: [number, number] = [5, 10];

    const hi = applyTransform(nd, params, {
      origin,
      isLatLng: false,
      centerLat: 0,
    });
    const byHand = translateNetwork(
      rotateNetwork(
        scaleNetwork(nd, params.scale, origin),
        params.rotationDeg,
        origin,
      ),
      params.offsetX,
      params.offsetY,
    );

    expect(hi.coordinates.A[0]).toBeCloseTo(byHand.coordinates.A[0], 9);
    expect(hi.coordinates.A[1]).toBeCloseTo(byHand.coordinates.A[1], 9);
    expect(hi.coordinates.B[0]).toBeCloseTo(byHand.coordinates.B[0], 9);
    expect(hi.coordinates.B[1]).toBeCloseTo(byHand.coordinates.B[1], 9);
    expect(hi.vertices.P1[0][0]).toBeCloseTo(byHand.vertices.P1[0][0], 9);
    expect(hi.vertices.P1[0][1]).toBeCloseTo(byHand.vertices.P1[0][1], 9);
  });

  it("in lat/lng mode, dx=METERS_PER_DEGREE at centerLat=0 shifts ~1° east", () => {
    const nd: NetworkData = {
      coordinates: { A: [10, 20] },
      vertices: {},
      inp: "",
      name: "",
    };
    const out = applyTransform(
      nd,
      {
        scale: 1,
        offsetX: METERS_PER_DEGREE,
        offsetY: METERS_PER_DEGREE,
        rotationDeg: 0,
      },
      { origin: [10, 20], isLatLng: true, centerLat: 0 },
    );
    expect(out.coordinates.A[0]).toBeCloseTo(11, 6);
    expect(out.coordinates.A[1]).toBeCloseTo(21, 6);
  });
});

describe("shiftToLatLngWithBaseline", () => {
  it("applies a fixed baseline shift to Points and LineStrings", () => {
    const fc = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [111320, 222640] },
          properties: { type: "Node", id: "A" },
        },
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [0, 0],
              [111320, 0],
            ],
          },
          properties: { type: "Link", id: "L1" },
        },
      ],
    } as const;
    const out = shiftToLatLngWithBaseline(
      fc as unknown as Parameters<typeof shiftToLatLngWithBaseline>[0],
      0,
      0,
    );
    const pt = out.features[0].geometry as unknown as {
      coordinates: [number, number];
    };
    const ls = out.features[1].geometry as unknown as {
      coordinates: [number, number][];
    };
    expect(pt.coordinates[0]).toBeCloseTo(1, 9);
    expect(pt.coordinates[1]).toBeCloseTo(2, 9);
    expect(ls.coordinates[1][0]).toBeCloseTo(1, 9);
  });
});
