import * as React from "react";
import type { Map as MapboxMap } from "mapbox-gl";

const { useEffect, useRef } = React;

export function useMapResizeObserver(
  mapRef: React.RefObject<MapboxMap | null>,
  mapContainerRef: React.RefObject<HTMLDivElement | null>
) {
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || !mapRef.current) return;

    const debounce = (callback: () => void, delay: number) => {
      return () => {
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(callback, delay);
      };
    };

    const resizeMap: ResizeObserverCallback = debounce(() => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    }, 10); // Debounce delay in milliseconds

    const resizeObserver = new ResizeObserver(resizeMap);
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
      resizeObserver.disconnect();
    };
  }, [mapRef, mapContainerRef]);
}
