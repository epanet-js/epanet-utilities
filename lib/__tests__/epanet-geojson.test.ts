import { describe, expect, it } from "vitest";
import type { FeatureCollection } from "geojson";
import { applyNetworkDataToGeoJson } from "../epanet-geojson";
import type { NetworkData } from "../types";

function makeOriginal(): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id: 0,
        geometry: { type: "Point", coordinates: [0, 0] },
        properties: { type: "Node", category: "Junction", id: "A" },
      },
      {
        type: "Feature",
        id: 1,
        geometry: { type: "Point", coordinates: [10, 0] },
        properties: { type: "Node", category: "Junction", id: "B" },
      },
      {
        type: "Feature",
        id: 2,
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [5, 5],
            [10, 0],
          ],
        },
        properties: {
          type: "Link",
          category: "Pipe",
          id: "P1",
          usNodeId: "A",
          dsNodeId: "B",
        },
      },
    ],
  };
}

describe("applyNetworkDataToGeoJson", () => {
  const updatedNd: NetworkData = {
    coordinates: {
      A: [1, 1],
      B: [11, 1],
    },
    vertices: {
      P1: [
        [6, 6],
        [8, 8],
      ],
    },
    inp: "",
    name: "",
  };

  it("preserves feature count and properties", () => {
    const out = applyNetworkDataToGeoJson(makeOriginal(), updatedNd);
    expect(out.features).toHaveLength(3);
    expect(out.features[0].properties).toMatchObject({ id: "A" });
    expect(out.features[2].properties).toMatchObject({
      id: "P1",
      usNodeId: "A",
      dsNodeId: "B",
    });
  });

  it("replaces node coordinates", () => {
    const out = applyNetworkDataToGeoJson(makeOriginal(), updatedNd);
    const a = out.features[0].geometry as unknown as { coordinates: [number, number] };
    const b = out.features[1].geometry as unknown as { coordinates: [number, number] };
    expect(a.coordinates).toEqual([1, 1]);
    expect(b.coordinates).toEqual([11, 1]);
  });

  it("rebuilds link coords as us + vertices + ds", () => {
    const out = applyNetworkDataToGeoJson(makeOriginal(), updatedNd);
    const link = out.features[2].geometry as unknown as {
      coordinates: [number, number][];
    };
    expect(link.coordinates).toEqual([
      [1, 1],
      [6, 6],
      [8, 8],
      [11, 1],
    ]);
  });

  it("handles links with no vertices", () => {
    const nd: NetworkData = {
      coordinates: { A: [1, 1], B: [11, 1] },
      vertices: {},
      inp: "",
      name: "",
    };
    const out = applyNetworkDataToGeoJson(makeOriginal(), nd);
    const link = out.features[2].geometry as unknown as {
      coordinates: [number, number][];
    };
    expect(link.coordinates).toEqual([
      [1, 1],
      [11, 1],
    ]);
  });

  it("does not mutate the input", () => {
    const original = makeOriginal();
    const snapshot = JSON.parse(JSON.stringify(original));
    applyNetworkDataToGeoJson(original, updatedNd);
    expect(original).toEqual(snapshot);
  });
});
