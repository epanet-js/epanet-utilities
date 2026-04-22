export interface GeocodeResult {
  id: string;
  name: string;
  center: [number, number];
  bbox?: [number, number, number, number];
}

interface MapboxFeature {
  id: string;
  place_name: string;
  text: string;
  center: [number, number];
  bbox?: [number, number, number, number];
}

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export async function geocode(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (!trimmed || !TOKEN) return [];

  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json` +
    `?access_token=${TOKEN}&limit=5&types=place,locality,neighborhood,address,postcode,region,district`;

  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Geocoding failed: ${res.status}`);
  }
  const data = (await res.json()) as { features?: MapboxFeature[] };
  return (data.features ?? []).map((f) => ({
    id: f.id,
    name: f.place_name ?? f.text,
    center: f.center,
    bbox: f.bbox,
  }));
}
